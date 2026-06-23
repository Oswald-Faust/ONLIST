#!/usr/bin/env bash
# Déploiement ONLIST sur le VPS — idempotent, gère les pièges récurrents :
#   - backend/.env et backend/node_modules sont suivis par git → conflits de pull
#   - fichiers non-suivis qui entrent en conflit avec un commit entrant
# Usage :   bash deploy.sh           (backend seul)
#           FRONT=1 bash deploy.sh   (backend + build frontend admin)
set -uo pipefail

APP_DIR="${APP_DIR:-/home/devonlist/apps/onlist}"
ENV_BACKUP="${ENV_BACKUP:-/home/devonlist/onlist-env-PROD-backup.bak}"
UNTRACKED_BACKUP="/home/devonlist/onlist-untracked-backup"

cd "$APP_DIR" || { echo "❌ $APP_DIR introuvable"; exit 1; }

echo "==> 1. Sauvegarde du .env de prod"
cp backend/.env "$ENV_BACKUP" && echo "   .env sauvegardé dans $ENV_BACKUP"

echo "==> 2. Récupération des refs distantes"
git fetch origin main || { echo "❌ fetch échoué"; exit 1; }

echo "==> 3. Mise à jour forcée sur origin/main (reset --hard, contourne les conflits)"
# reset --hard ignore les fichiers non-suivis et écrase les modifs locales des fichiers
# suivis (.env et node_modules suivis sont restaurés/régénérés juste après).
git reset --hard origin/main || { echo "❌ reset échoué"; exit 1; }

echo "==> 4. Restauration du .env de prod"
cp "$ENV_BACKUP" backend/.env && echo "   .env de prod restauré"

echo "==> 5. Installation des dépendances backend"
( cd backend && npm install --no-audit --no-fund >/dev/null 2>&1 ) && echo "   npm install backend OK"

echo "==> 6. Redémarrage du backend"
pm2 restart onlist-backend --update-env >/dev/null 2>&1 && echo "   onlist-backend redémarré"

if [ "${FRONT:-0}" = "1" ]; then
  echo "==> 7. Build + redémarrage du frontend admin"
  ( cd frontend && npm install --no-audit --no-fund >/dev/null 2>&1 && npm run build ) \
    && pm2 restart onlist-admin --update-env >/dev/null 2>&1 \
    && echo "   onlist-admin rebuild + redémarré"
fi

echo "==> ✅ Déploiement terminé — HEAD: $(git rev-parse --short HEAD)"
pm2 list | grep -E "onlist-backend|onlist-admin" || true
