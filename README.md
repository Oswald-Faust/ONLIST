# ONLIST

## Déploiement

### Mobile Expo

- Le mobile lit `EXPO_PUBLIC_API_URL` pour cibler l'API en build.
- La config EAS de base est dans [mobile/eas.json](/Users/oswaldfaust/Code/ONLIST/mobile/eas.json).
- Les profils `development`, `preview` et `production` pointent déjà vers `https://api.onlist.club/api`.

Commandes de base:

```bash
cd mobile
npx eas login
npx eas build -p ios --profile preview
npx eas build -p android --profile preview
npx eas build -p ios --profile production
npx eas submit -p ios --profile production
```

Pré-requis iOS:

- Compte Apple Developer actif.
- Accès App Store Connect.
- Credentials iOS configurés via Expo/EAS.

### Backend VPS

- Le domaine API cible est `api.onlist.club`.
- La procédure Hostinger est documentée dans [backend/DEPLOY_HOSTINGER.md](/Users/oswaldfaust/Code/ONLIST/backend/DEPLOY_HOSTINGER.md).
- Le vhost Nginx prêt à copier est [backend/deploy/nginx-onlist-api.conf](/Users/oswaldfaust/Code/ONLIST/backend/deploy/nginx-onlist-api.conf).
