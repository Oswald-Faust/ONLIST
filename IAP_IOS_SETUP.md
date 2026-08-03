# Achats in-app iOS (RevenueCat) — mise en route

L'abonnement business est vendu **via StoreKit sur iOS** (exigence Apple,
guideline 3.1.1) et **via Stripe sur Android et le web**. La répartition est
pilotée par [`mobile/src/constants/platformPolicy.js`](mobile/src/constants/platformPolicy.js).

Le code est en place. Ce document liste ce qui reste à configurer **hors du
dépôt** — sans ces étapes, le paywall iOS affichera « Indisponible » sur chaque
pack, car StoreKit ne renverra aucun produit.

---

## 1. App Store Connect

### Contrats (bloquant)

Dans **Business → Agreements** :

- Signer le **Paid Applications Agreement**
- Renseigner les **coordonnées bancaires** et les **informations fiscales**

Tant que ce contrat n'est pas actif, les produits restent invisibles pour
StoreKit et l'app renverra une liste d'offres vide, y compris en sandbox.

### Small Business Program

À demander dans **Business → Small Business Program** : la commission passe de
30 % à **15 %** sous 1 M$ de revenus annuels. La demande est à faire une fois,
et prend effet le mois suivant.

### Créer les abonnements

**Monetization → Subscriptions** → créer un groupe (ex. `ONLIST Business`),
puis les trois abonnements auto-renouvelables :

| Pack | Product ID | Durée |
|---|---|---|
| Starter | `onlist_business_starter_monthly` | 1 mois |
| Pro | `onlist_business_pro_monthly` | 1 mois |
| Group | `onlist_business_group_monthly` | 1 mois |

Ces identifiants doivent correspondre **exactement** à ceux de `eas.json` et de
`backend/.env` — ils y sont déjà renseignés.

Les trois packs doivent être dans **le même groupe d'abonnement** : c'est ce qui
permet à un établissement de passer de Starter à Pro sans double facturation,
Apple gérant le prorata automatiquement.

Pour chaque abonnement, renseigner : nom affiché, description, **prix**, et une
**capture d'écran du paywall** (obligatoire pour la revue).

> ⚠️ Les prix App Store sont **TTC**. Un pack facturé 149 € HT via Stripe
> rapporte ≈ 105 € net en IAP (TVA 20 % + commission 15 %). Vérifier la grille
> tarifaire avant de publier.

---

## 2. RevenueCat

1. **Projet** → ajouter l'app iOS avec le bundle ID `club.onlist.app`
2. **App Store Connect API key** : la fournir à RevenueCat (validation serveur
   des reçus et réception des notifications Apple)
3. **Entitlement** : créer `business_access`, y rattacher les trois produits
4. **Offering** : créer une offering **marquée « current »** contenant les trois
   packages. Le code lit `offerings.current.availablePackages` — sans offering
   courante, aucun prix ne s'affiche.
5. **Webhook** : Integrations → Webhooks
   - URL : `https://api.onlist.club/api/subscriptions/revenuecat-webhook`
   - Authorization header : une valeur secrète, à recopier dans
     `REVENUECAT_WEBHOOK_AUTH`

---

## 3. Variables d'environnement

### Mobile — déjà dans `eas.json` (3 profils)

```
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY   clé publique SDK iOS (appl_…)
EXPO_PUBLIC_RC_STARTER_PRODUCT_ID
EXPO_PUBLIC_RC_PRO_PRODUCT_ID
EXPO_PUBLIC_RC_GROUP_PRODUCT_ID
EXPO_PUBLIC_RC_ENTITLEMENT_ID        business_access
```

### Backend — à compléter sur le VPS

Les deux premières sont **vides** dans `backend/.env` et doivent être remplies :

```
REVENUECAT_SECRET_API_KEY=sk_…     clé secrète RevenueCat (jamais côté app)
REVENUECAT_WEBHOOK_AUTH=…          même valeur que l'en-tête du webhook
REVENUECAT_BUSINESS_ENTITLEMENT_ID=business_access
REVENUECAT_STARTER_PRODUCT_ID=onlist_business_starter_monthly
REVENUECAT_PRO_PRODUCT_ID=onlist_business_pro_monthly
REVENUECAT_GROUP_PRODUCT_ID=onlist_business_group_monthly
```

Puis `pm2 restart all`.

---

## 4. Tester

Les achats in-app **ne fonctionnent pas dans Expo Go** : il faut un build de
développement ou TestFlight.

```bash
cd mobile && eas build --profile development --platform ios
```

Créer un **compte Sandbox** (App Store Connect → Users and Access → Sandbox
Testers), puis le renseigner sur l'appareil dans *Réglages → App Store →
Compte Sandbox*.

À vérifier :

- [ ] Les trois packs affichent un prix réel (et non « Indisponible »)
- [ ] L'achat débloque le dashboard établissement
- [ ] `subscriptionStatus` passe à `active` en base
- [ ] Le webhook est reçu (logs RevenueCat → Webhooks)
- [ ] « Restaurer mes achats » retrouve l'abonnement après réinstallation
- [ ] « Gérer mon abonnement » ouvre les réglages Apple

---

## 5. Checklist avant resoumission

Ce qu'Apple vérifie sur un paywall d'abonnement (guideline 3.1.2) — tout est
implémenté dans [`BusinessSubscriptionScreen.js`](mobile/src/screens/business/BusinessSubscriptionScreen.js),
à contrôler visuellement avant l'envoi :

- [x] Nom de l'abonnement et durée visibles
- [x] Prix issu de StoreKit, jamais codé en dur
- [x] Mention du renouvellement automatique et des modalités d'annulation
- [x] Liens vers les conditions d'utilisation et la politique de confidentialité
- [x] Bouton **Restaurer mes achats**
- [x] Gestion de l'abonnement renvoyée vers les réglages Apple
- [ ] Mêmes mentions reprises dans la description App Store
- [ ] Compte de démo **business** fourni à App Review, avec un accès permettant
      d'atteindre le paywall
- [ ] Les trois produits sont au statut « Ready to Submit » et **joints à la
      version** soumise (sinon la revue échoue sur des produits introuvables)

> Le boost d'événement reste hors iOS (`BOOST_PURCHASE_ENABLED`) : il est encore
> encaissé via Stripe. Le rendre disponible sur iOS demandera des produits
> consommables StoreKit.
