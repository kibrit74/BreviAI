# Cloud Backend Deploy Komutlari

## 1) Degisiklikleri Git'e gonder
```powershell
git add backend/scripts/services/whatsapp.js backend/scripts/services/cron-manager.js backend/fetch-qr.js backend/check-cron.js
git commit -m "fix whatsapp multi-session isolation"
git push origin main
```

## 2) GCP deploy scriptini calistir
```powershell
cd backend
.\deploy-gcp.ps1
```

PowerShell policy engellerse:
```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\deploy-gcp.ps1
```

## 3) Container durumunu kontrol et
```powershell
gcloud compute ssh breviai-whatsapp --zone=us-west1-b --command "docker ps --filter name=whatsapp-service"
gcloud compute ssh breviai-whatsapp --zone=us-west1-b --command "docker logs --tail=120 whatsapp-service"
```

## 4) API testi (sessionId zorunlu)
```bash
curl -H "x-auth-key: breviai-secret-password" -H "x-session-id: device_test_1" http://<SUNUCU_IP>:3001/whatsapp/status
curl -H "x-auth-key: breviai-secret-password" http://<SUNUCU_IP>:3001/whatsapp/sessions
```

## 5) Her telefon icin ayri QR
```text
http://<SUNUCU_IP>:3001/whatsapp/qr?key=breviai-secret-password&sessionId=device_A
http://<SUNUCU_IP>:3001/whatsapp/qr?key=breviai-secret-password&sessionId=device_B
```
