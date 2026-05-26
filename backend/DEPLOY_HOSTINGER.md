# Deploy backend ONLIST sur Hostinger VPS

## 1. Pré-requis DNS

- Pointer `api.onlist.app` vers l'IP du VPS.

## 2. Préparer le VPS

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git ufw
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 3. Récupérer le projet

```bash
mkdir -p ~/apps
cd ~/apps
git clone <URL_DU_REPO> onlist
cd onlist/backend
cp .env.example .env
```

Compléter ensuite `.env` avec les vraies valeurs de production:

- `MONGO_URI`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`
- `PORT=4000`
- `NODE_ENV=production`

## 4. Installer et démarrer l'API

```bash
npm ci
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $USER --hp /home/$USER
```

## 5. Configurer Nginx

```bash
sudo cp deploy/nginx-onlist-api.conf /etc/nginx/sites-available/onlist-api
sudo ln -s /etc/nginx/sites-available/onlist-api /etc/nginx/sites-enabled/onlist-api
sudo nginx -t
sudo systemctl reload nginx
```

## 6. Activer HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.onlist.app
```

## 7. Ouvrir le firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 8. Vérifications

```bash
curl http://127.0.0.1:4000/health
curl https://api.onlist.app/health
pm2 logs onlist-backend
```

## 9. Mise à jour plus tard

```bash
cd ~/apps/onlist
git pull
cd backend
npm ci
pm2 restart onlist-backend
```
