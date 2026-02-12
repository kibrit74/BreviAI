# BreviAI GCP Deployment Script (PowerShell Fixed)
# Usage: .\deploy-gcp.ps1

$INSTANCE_NAME = "breviai-whatsapp"
$ZONE = "us-west1-b"

Write-Host "Starting BreviAI Deployment..." -ForegroundColor Green

# 1. Check gcloud
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "Error: gcloud CLI not found. Please install Google Cloud SDK."
    exit 1
}

# 2. Remote Command (Single line to avoid parsing issues)
# We use simple string concatenation to separate commands with ; or &&
$REMOTE_CMD = "
if [ ! -d '/opt/breviai' ]; then 
    echo 'Error: /opt/breviai not found.'; 
    exit 1; 
fi; 
cd /opt/breviai; 
echo 'Pulling code...'; 
git checkout main; 
git pull origin main; 
echo 'Building Docker...'; 
cd backend; 
docker build -t whatsapp-service -f Dockerfile.whatsapp .; 
echo 'Restarting container...'; 
docker stop whatsapp-service || true; 
docker rm whatsapp-service || true; 
echo 'Starting service...'; 
docker run -d --name whatsapp-service --restart unless-stopped -p 3001:3001 -v /opt/breviai/.wwebjs_auth:/usr/src/app/.wwebjs_auth -e WA_AUTH_KEY=breviai-secret-password whatsapp-service; 
echo 'Deployment Complete!';
"

# Remove newlines to make it a clean single-line command for SSH
$REMOTE_CMD_CLEAN = $REMOTE_CMD -replace "`r`n", " " -replace "`n", " "

Write-Host "Connecting to VM ($INSTANCE_NAME)..." -ForegroundColor Cyan

# Execute
gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command $REMOTE_CMD_CLEAN

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nDeployment successfully triggered!" -ForegroundColor Green
    Write-Host "Check status at: http://<EXTERNAL_IP>:3001/status"
}
else {
    Write-Error "`nDeployment failed."
}
