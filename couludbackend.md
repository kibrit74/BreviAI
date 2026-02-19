# Cloud Backend Komutlari

## A) Cloud Shell hazirlik
```bash
gcloud config set project studio-2304560728-89d4c
gcloud config set compute/zone us-west1-b
gcloud config get-value project
```

## B) VM'ye baglan (onerilen yontem)
```bash
gcloud compute ssh breviai-whatsapp --zone=us-west1-b
```

## C) VM icinde container kontrol
```bash
docker ps --filter "name=whatsapp-service"
docker logs --tail=120 whatsapp-service
```

## D) VM icinde deploy (guncel kodu cek + container yeniden kur)
```bash
cd /opt/breviai
git checkout main
git pull origin main

cd /opt/breviai/backend
docker build -t whatsapp-service -f Dockerfile.whatsapp .
docker stop whatsapp-service || true
docker rm whatsapp-service || true
docker run -d --name whatsapp-service --restart unless-stopped -p 3001:3001 -v /opt/breviai/.wwebjs_auth:/usr/src/app/.wwebjs_auth -e WA_AUTH_KEY=breviai-secret-password whatsapp-service
```

## E) VM icinde deploy dogrulama
```bash
docker ps --filter "name=whatsapp-service"
docker logs --tail=120 whatsapp-service
docker exec whatsapp-service sh -c "grep -n 'REQUIRE_SESSION_ID' /usr/src/app/scripts/services/whatsapp.js"
```

## F) Disaridan API testi (sessionId zorunlu)
```bash
curl -H "x-auth-key: breviai-secret-password" -H "x-session-id: device_test_1" http://<SUNUCU_IP>:3001/whatsapp/status
curl -H "x-auth-key: breviai-secret-password" http://<SUNUCU_IP>:3001/whatsapp/sessions
```

## G) Her telefon icin ayri QR
```text
http://<SUNUCU_IP>:3001/whatsapp/qr?key=breviai-secret-password&sessionId=device_A
http://<SUNUCU_IP>:3001/whatsapp/qr?key=breviai-secret-password&sessionId=device_B
```

## G2) Uretim akisi (userId mapping + signed token)
```bash
# 1) Kullanici icin baglanti baslat (key gerekli)
curl -X POST "http://<SUNUCU_IP>:3001/whatsapp/connect/start" \
  -H "Content-Type: application/json" \
  -H "x-auth-key: breviai-secret-password" \
  -d '{"userId":"user_123"}'

# Donen connectUrl'i kullaniciya actir:
# http://<SUNUCU_IP>:3001/whatsapp/qr?token=...

# 2) Durum sorgula (token ile key gereksiz)
curl "http://<SUNUCU_IP>:3001/whatsapp/connect/status?token=<TOKEN>"
```

## H) Sorun Giderme (repo yok / .wwebjs_auth build hatasi)

### H1) /opt/breviai git repo degilse yeniden clone et
```bash
if [ ! -d /opt/breviai/.git ]; then sudo rm -rf /opt/breviai && sudo git clone https://github.com/kibrit74/BreviAI.git /opt/breviai; fi
cd /opt/breviai
git checkout main
git pull origin main
```

### H2) .wwebjs_auth build context hatasini temizle
```bash
cd /opt/breviai/backend
[ -L .wwebjs_auth ] && rm .wwebjs_auth
mkdir -p .wwebjs_auth
touch .dockerignore
grep -qxF '.wwebjs_auth' .dockerignore || echo '.wwebjs_auth' >> .dockerignore
```

### H3) Docker ile yeniden deploy et
```bash
cd /opt/breviai/backend
docker build -t whatsapp-service -f Dockerfile.whatsapp .
docker stop whatsapp-service || true
docker rm whatsapp-service || true
docker run -d --name whatsapp-service --restart unless-stopped -p 3001:3001 -v /opt/breviai/.wwebjs_auth:/usr/src/app/.wwebjs_auth -e WA_AUTH_KEY=breviai-secret-password whatsapp-service
```

### H4) Canliya yeni kod gecmis mi kontrol et
```bash
docker ps --filter "name=whatsapp-service"
docker logs --tail=120 whatsapp-service
docker exec whatsapp-service sh -c "grep -n 'REQUIRE_SESSION_ID' /usr/src/app/scripts/services/whatsapp.js"
```

Not:
- Son `grep` komutu satir dondururse yeni multi-session kodu container'a gecmistir.

## I) CWD bozulduysa (No such file or directory) tek parca kurtarma
```bash
cd ~

sudo mkdir -p /opt
sudo rm -rf /opt/breviai
sudo git clone https://github.com/kibrit74/BreviAI.git /opt/breviai

sudo chown -R $USER:$USER /opt/breviai
cd /opt/breviai
git checkout main
git pull origin main

cd /opt/breviai/backend
[ -L .wwebjs_auth ] && rm .wwebjs_auth
mkdir -p .wwebjs_auth
touch .dockerignore
grep -qxF '.wwebjs_auth' .dockerignore || echo '.wwebjs_auth' >> .dockerignore

docker build -t whatsapp-service -f Dockerfile.whatsapp .
docker stop whatsapp-service || true
docker rm whatsapp-service || true
docker run -d --name whatsapp-service --restart unless-stopped -p 3001:3001 -v /opt/breviai/.wwebjs_auth:/usr/src/app/.wwebjs_auth -e WA_AUTH_KEY=breviai-secret-password whatsapp-service

docker ps --filter "name=whatsapp-service"
docker logs --tail=120 whatsapp-service
docker exec whatsapp-service sh -c "grep -n 'REQUIRE_SESSION_ID' /usr/src/app/scripts/services/whatsapp.js"
```
