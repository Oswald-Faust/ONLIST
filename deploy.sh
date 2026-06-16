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

echo "==> 2. Annulation des modifs locales qui bloquent le pull (régénérées ensuite)"
git checkout -- backend/node_modules 2>/dev/null || true
git checkout -- backend/.env 2>/dev/null || true

echo "==> 3. Récupération des refs distantes"
git fetch origin main

echo "==> 4. Mise de côté des fichiers non-suivis qui entrent en conflit"
git ls-tree -r origin/main --name-only | sort > /tmp/onlist_incoming.txt
git ls-files --others --exclude-standard | sort > /tmp/onlist_untracked.txt
comm -12 /tmp/onlist_untracked.txt /tmp/onlist_incoming.txt > /tmp/onlist_conflicts.txt
CONFLICTS=$(wc -l < /tmp/onlist_conflicts.txt | tr -d ' ')
if [ "$CONFLICTS" != "0" ]; then
  echo "   $CONFLICTS fichier(s) non-suivi(s) déplacé(s) dans $UNTRACKED_BACKUP"
  while IFS= read -r f; do
    mkdir -p "$UNTRACKED_BACKUP/$(dirname "$f")"
    mv "$f" "$UNTRACKED_BACKUP/$f"
  done < /tmp/onlist_conflicts.txt
fi

echo "==> 5. git pull"
git pull origin main || { echo "❌ pull échoué"; exit 1; }

echo "==> 6. Restauration du .env de prod"
cp "$ENV_BACKUP" backend/.env && echo "   .env de prod restauré"

echo "==> 7. Installation des dépendances backend"
( cd backend && npm install --no-audit --no-fund >/dev/null 2>&1 ) && echo "   npm install backend OK"

echo "==> 8. Redémarrage du backend"
pm2 restart onlist-backend --update-env >/dev/null 2>&1 && echo "   onlist-backend redémarré"

if [ "${FRONT:-0}" = "1" ]; then
  echo "==> 9. Build + redémarrage du frontend admin"
  ( cd frontend && npm install --no-audit --no-fund >/dev/null 2>&1 && npm run build ) \
    && pm2 restart onlist-admin --update-env >/dev/null 2>&1 \
    && echo "   onlist-admin rebuild + redémarré"
fi

echo "==> ✅ Déploiement terminé — HEAD: $(git rev-parse --short HEAD)"
pm2 list | grep -E "onlist-backend|onlist-admin" || true
