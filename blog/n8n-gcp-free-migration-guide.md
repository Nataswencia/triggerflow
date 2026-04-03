# Как перенести n8n на бесплатный сервер Google Cloud (пошаговый гайд)

€72/мес за n8n Cloud - это €864 в год. За эти деньги можно получить ровно то же самое бесплатно. Навсегда.

Вот полная инструкция, проверенная на практике.

## Что получите в итоге

- n8n на своём домене (https://n8n.вашдомен.com)
- SSL сертификат (автообновление)
- Без лимита на executions (было 10,000/мес)
- Автобэкапы каждую ночь
- Стоимость: €0/мес

## Требования

- Google аккаунт (для GCP)
- Банковская карта (для верификации, списаний не будет)
- Домен (или бесплатный через DuckDNS)
- 1-2 часа времени

---

## Шаг 1. Создать аккаунт GCP

Заходите на https://cloud.google.com/free

Нажмите "Get started for free". Google даст $300 кредитов на 90 дней + бессрочный Free Tier.

Карта нужна только для верификации - деньги не спишут.

## Шаг 2. Создать виртуальную машину

Откройте https://console.cloud.google.com/compute/instances

Нажмите "Create instance" и заполните:

- **Name:** n8n-server
- **Region:** us-west1 (Oregon) - это бесплатный регион
- **Zone:** us-west1-b
- **Machine type:** E2 → e2-micro (Free Tier)

### Настройка диска

Нажмите "OS and storage" → "Change":
- **OS:** Ubuntu
- **Version:** Ubuntu 22.04 LTS Minimal (x86/64)
- **Size:** 30 GB
- **Disk type:** Standard persistent disk (не SSD)

### Настройка сети

Нажмите "Networking":
- Поставьте галочки **Allow HTTP traffic** и **Allow HTTPS traffic**

Нажмите **Create**. Подождите 1-2 минуты.

## Шаг 3. Зарезервировать статический IP

Без этого IP будет меняться при каждом перезапуске VM.

Откройте https://console.cloud.google.com/networking/addresses

Нажмите "Reserve external" → заполните:
- **Name:** n8n-static-ip
- **Region:** us-west1
- **Attached to:** n8n-server

Нажмите **Reserve**. Запомните полученный IP.

## Шаг 4. Открыть порт 5678

Откройте https://console.cloud.google.com/net-security/firewall-manager/firewall-policies

Нажмите "Create Firewall Rule":
- **Name:** allow-n8n
- **Direction:** Ingress
- **Targets:** All instances in the network
- **Source IP ranges:** 0.0.0.0/0
- **Protocols and ports:** TCP → 5678

## Шаг 5. Установить Docker и n8n

Нажмите **SSH** рядом с вашей VM в списке instances. Откроется терминал в браузере.

Скопируйте и вставьте одну команду:

```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose && sudo systemctl enable docker && sudo systemctl start docker && sudo mkdir -p /opt/n8n && sudo chown -R 1000:1000 /opt/n8n && sudo docker run -d --restart unless-stopped --name n8n -p 5678:5678 -e N8N_SECURE_COOKIE=false -v /opt/n8n:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

Подождите 2-3 минуты. Проверьте в браузере: `http://ВАШ_IP:5678`

Должна появиться страница настройки n8n. Создайте аккаунт администратора.

## Шаг 6. Настроить домен (DNS)

Зайдите в панель управления вашим доменом (Cloudflare, Namecheap и т.д.).

Добавьте A-запись:
- **Type:** A
- **Name:** n8n (получится n8n.вашдомен.com)
- **Value:** ваш статический IP
- **Proxy:** выключить (DNS only)

## Шаг 7. Настроить SSL (HTTPS)

В SSH-терминале выполните:

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

Создайте конфигурацию Nginx:

```bash
sudo bash -c 'cat > /etc/nginx/sites-available/n8n << EOF
server {
    listen 80;
    server_name n8n.вашдомен.com;

    location / {
        proxy_pass http://localhost:5678;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF'
```

Активируйте и получите сертификат:

```bash
sudo ln -s /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d n8n.вашдомен.com --non-interactive --agree-tos -m ваш@email.com
```

## Шаг 8. Перезапустить n8n с правильными настройками

```bash
sudo docker stop n8n && sudo docker rm n8n && sudo docker run -d --restart unless-stopped --name n8n -p 5678:5678 -e N8N_SECURE_COOKIE=true -e WEBHOOK_URL=https://n8n.вашдомен.com/ -e GENERIC_TIMEZONE=Europe/Paris -e TZ=Europe/Paris -v /opt/n8n:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

Откройте https://n8n.вашдомен.com - должно работать с замочком.

## Шаг 9. Настроить автобэкапы

```bash
sudo bash -c 'cat > /opt/backup-n8n.sh << "EOF"
#!/bin/bash
BACKUP_DIR=/opt/n8n-backups
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M)
tar -czf $BACKUP_DIR/n8n-backup-$DATE.tar.gz -C /opt n8n
ls -t $BACKUP_DIR/n8n-backup-*.tar.gz | tail -n +8 | xargs -r rm
EOF
chmod +x /opt/backup-n8n.sh'
sudo apt-get install -y cron
sudo bash -c '(crontab -l 2>/dev/null; echo "0 3 * * * /opt/backup-n8n.sh") | crontab -'
```

Бэкап каждую ночь в 3:00, хранит последние 7 копий.

## Шаг 10. Отключить лишние сервисы (чтобы не платить)

```bash
sudo systemctl stop google-cloud-ops-agent && sudo systemctl disable google-cloud-ops-agent
```

В GCP Console удалите snapshot-ы если есть:
https://console.cloud.google.com/compute/snapshots

---

## Миграция воркфлоу со старого n8n

Если переезжаете с n8n Cloud:

1. **Экспорт** - через API скачайте все воркфлоу
2. **Импорт** - через API загрузите на новый инстанс (убрать поля id, createdAt, updatedAt, active, tags)
3. **Credentials** - пересоздать вручную (они не экспортируются)
4. **Credential ID ремаппинг** - обновить ссылки на credentials в каждом воркфлоу
5. **Активация** - включить воркфлоу

Вот скелет Python-скрипта для экспорта/импорта:

```python
import urllib.request, json

OLD_API = 'ваш_старый_api_key'
NEW_API = 'ваш_новый_api_key'
OLD_URL = 'https://старый-n8n.app.n8n.cloud/api/v1'
NEW_URL = 'https://n8n.вашдомен.com/api/v1'

# 1. Получить список воркфлоу
req = urllib.request.Request(
    f'{OLD_URL}/workflows?limit=100',
    headers={'X-N8N-API-KEY': OLD_API}
)
workflows = json.loads(urllib.request.urlopen(req).read())['data']

# 2. Скачать и импортировать каждый
for w in workflows:
    # Скачать
    req = urllib.request.Request(
        f'{OLD_URL}/workflows/{w["id"]}',
        headers={'X-N8N-API-KEY': OLD_API}
    )
    wf = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))

    # Оставить только нужные поля
    clean = {
        'name': wf['name'],
        'nodes': wf['nodes'],
        'connections': wf['connections'],
    }
    if wf.get('staticData'):
        clean['staticData'] = wf['staticData']

    # Импортировать
    payload = json.dumps(clean, ensure_ascii=False).encode('utf-8')
    req = urllib.request.Request(
        f'{NEW_URL}/workflows',
        data=payload,
        headers={
            'X-N8N-API-KEY': NEW_API,
            'Content-Type': 'application/json; charset=utf-8'
        },
        method='POST'
    )
    resp = urllib.request.urlopen(req)
    print(f'OK: {wf["name"]}')
```

---

## Важные моменты

**Free Tier включает бесплатно:**
- 1 VM e2-micro (2 vCPU, 1 GB RAM)
- 30 GB Standard persistent disk
- 1 GB egress трафик/мес
- Только в регионах: Oregon, Iowa, South Carolina

**После окончания Free Trial ($300 кредитов):**
- Нужно активировать полный аккаунт
- Free Tier продолжает работать бесплатно
- Платить будете только если выйдете за лимиты Free Tier

**SSL сертификат:**
- Let's Encrypt, автообновление через certbot
- Обновляется автоматически каждые 60 дней

**Обновление n8n:**
```bash
sudo docker pull docker.n8n.io/n8nio/n8n
sudo docker stop n8n && sudo docker rm n8n
# Запустить заново с теми же параметрами (шаг 8)
```

---

*Источник: https://articles.emp0.com/host-n8n-on-gcp-for-free/*
*Дополнено практическим опытом миграции 93 воркфлоу с n8n Cloud Pro.*
