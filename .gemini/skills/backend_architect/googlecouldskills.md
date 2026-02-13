📄 Skill: Deploy Docker Project to Google Cloud VM
Amaç

Docker container içeren bir projeyi Google Cloud Compute Engine üzerinde çalışan bir Linux VM’e deploy etmek ve servisi internetten erişilebilir hale getirmek.

Ön Koşullar

Google Cloud hesabı

gcloud CLI kurulu

Docker image hazır (Dockerfile mevcut)

Proje GitHub’da veya lokal

1️⃣ Google Cloud CLI Kurulumu ve Login
gcloud init


Login yapılır ve proje seçilir.

Mevcut projeleri görmek için:

gcloud projects list


Proje seçmek için:

gcloud config set project PROJECT_ID

2️⃣ Compute Engine API Aktif Etme
gcloud services enable compute.googleapis.com

3️⃣ VM Instance Oluşturma

Ubuntu tabanlı küçük bir makine oluşturuyoruz:

gcloud compute instances create docker-vm \
  --zone=europe-west1-b \
  --machine-type=e2-micro \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=http-server,https-server


Firewall açmak için:

gcloud compute firewall-rules create allow-http \
  --allow tcp:80 \
  --target-tags=http-server


Eğer uygulama 3000 portunda çalışıyorsa:

gcloud compute firewall-rules create allow-3000 \
  --allow tcp:3000 \
  --target-tags=http-server

4️⃣ VM’e SSH ile Bağlanma
gcloud compute ssh docker-vm --zone=europe-west1-b

5️⃣ VM İçinde Docker Kurulumu
sudo apt update
sudo apt install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker


Yetki vermek için:

sudo usermod -aG docker $USER


Oturumu kapatıp tekrar bağlanmak gerekir.

6️⃣ Projeyi Sunucuya Alma

Eğer GitHub’daysa:

git clone https://github.com/username/project.git
cd project


Eğer image Docker Hub’daysa:

docker pull username/image:latest

7️⃣ Docker Image Build

Dockerfile varsa:

docker build -t myapp .

8️⃣ Container Çalıştırma

Örnek 3000 portu için:

docker run -d -p 3000:3000 --name myapp-container myapp


Eğer 80 portunda çalışacaksa:

docker run -d -p 80:3000 --name myapp-container myapp

9️⃣ Public IP Öğrenme
gcloud compute instances list


External IP adresi tarayıcıya yazılır:

http://EXTERNAL_IP:3000

10️⃣ Otomatik Restart İçin
docker run -d \
  --restart=always \
  -p 3000:3000 \
  --name myapp-container \
  myapp

Alternatif Profesyonel Yol (Önerilen)

Docker image’i Google Artifact Registry’ye push edip oradan çekmek.

API aç:

gcloud services enable artifactregistry.googleapis.com


Repository oluştur:

gcloud artifacts repositories create my-repo \
  --repository-format=docker \
  --location=europe-west1


Docker auth:

gcloud auth configure-docker europe-west1-docker.pkg.dev


Tag ve push:

docker tag myapp europe-west1-docker.pkg.dev/PROJECT_ID/my-repo/myapp:latest
docker push europe-west1-docker.pkg.dev/PROJECT_ID/my-repo/myapp:latest


VM içinde:

docker pull europe-west1-docker.pkg.dev/PROJECT_ID/my-repo/myapp:latest

Kritik Kontrol Noktaları

Firewall açık mı?

Uygulama 0.0.0.0 dinliyor mu?

Docker container çalışıyor mu?

Kontrol:

docker ps


Log görmek için:

docker logs myapp-container

Stratejik Not

Küçük projelerde Compute Engine + Docker yeterlidir.
Daha profesyonel sistemde Cloud Run kullanılır çünkü:

VM yönetmezsin

Auto scaling gelir

SSL otomatik olur

Ama öğrenme açısından VM + Docker süreci daha öğreticidir.

İstersen bu skill dosyasını Cloud Run versiyonu için de yazabilirim.
O mimari daha modern ve production-friendly.

---

### 🚀 Alternatif 2: Ultra Hızlı & Hafif Deployment (PM2 ile VM Üzerinde)

Eğer Docker build süreleri çok uzun sürüyorsa veya "e2-micro" sunucularda RAM sorunu yaşıyorsanız, Node.js uygulamasını doğrudan sunucu üzerinde PM2 ile çalıştırmak çok daha performanslıdır.

#### Avantajları:
- **Build Süresi Yok:** Sadece `git pull` ve `npm install` ile güncellenir.
- **Daha Az RAM:** Docker katmanları olmadığı için daha az bellek tüketir.
- **Hızlı Restart:** Saniyeler içinde güncellenir.

#### Kurulum:

1. **Hazırlık Scripti (`setup-pm2.sh`):**
   Bu script Swap alanı ekler, Node.js ve Chrome kurar.

```bash
#!/bin/bash
# 2GB Swap Ekle (RAM yetersizliğine çözüm)
if [ ! -f /swapfile ]; then
    sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
fi

# Node.js 18 ve Chrome Kur
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs google-chrome-stable

# PM2 Kur
sudo npm install -g pm2

# Bağımlılıkları Yükle (RAM Belleği Temizleyerek)
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_SKIP_DOWNLOAD=true
export CHROME_PATH=/usr/bin/google-chrome-stable

sync && sudo sysctl -w vm.drop_caches=3
npm install --no-audit --no-fund --loglevel=error

# Uygulamayı Başlat
pm2 start scripts/breviai-hub.js --name whatsapp-service --max-memory-restart 500M
pm2 save
pm2 startup
```

2. **Güncelleme (Deployment):**
   Sadece kodları çekip servisi yeniden başlatmak yeterlidir.

```bash
git pull origin main
npm install # Sadece yeni paket varsa
pm2 restart whatsapp-service
```