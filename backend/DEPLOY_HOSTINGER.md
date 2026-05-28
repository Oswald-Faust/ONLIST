# Deploy backend ONLIST sur Hostinger VPS

## 1. Pré-requis DNS

- Le sous-domaine `api.onlist.club` doit pointer vers `72.60.212.208`.

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
- `ALLOWED_ORIGINS=https://admin.onlist.club,https://api.onlist.club`
- `PORT=4000`
- `NODE_ENV=production`

## 4. Installer et démarrer l'API

```bash
npm ci
pm2 start ecosystem.config.js --env production
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
sudo certbot --nginx -d api.onlist.club
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
curl https://api.onlist.club/health
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

## 10. Séquence conseillée sur le VPS existant

Si le projet est déjà cloné sur le VPS:

```bash
cd ~/apps/onlist
git status
git pull origin main
cd backend
cp .env.example .env # uniquement si .env n'existe pas encore
npm ci
pm2 restart onlist-backend
sudo nginx -t
sudo systemctl reload nginx
curl https://api.onlist.club/health
```
