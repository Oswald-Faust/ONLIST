import { Platform } from 'react-native';

// ─── Conformité App Store — Guideline 3.1.1 (In-App Purchase) ─────────────────
//
// Apple a rejeté la soumission iOS au motif que le parcours d'inscription
// établissement donnait accès à un mécanisme d'achat externe (abonnement
// encaissé via Stripe Checkout, hors IAP).
//
// Réponse retenue : l'abonnement business est vendu en achat in-app sur iOS
// (via RevenueCat / StoreKit). L'inscription établissement et le paywall
// redeviennent donc disponibles sur iOS — c'est le mécanisme de paiement qui
// change, pas le parcours.
//
// Répartition par plateforme :
//   • iOS      → achat in-app (StoreKit via RevenueCat), commission Apple
//   • Android  → Stripe Checkout + Customer Portal
//   • Web      → Stripe Checkout + Customer Portal
//
// IMPORTANT : ces drapeaux dépendent uniquement de la plateforme de build. Ils
// ne doivent JAMAIS être pilotés par un flag serveur qu'on réactiverait après
// validation d'Apple — ce serait une dissimulation passible de la révocation du
// compte développeur.

export const IS_IOS = Platform.OS === 'ios';

// L'abonnement business est-il vendu via StoreKit sur cette plateforme ?
export const USE_IN_APP_PURCHASES = IS_IOS;

// Appels à l'action menant à un paiement hors store : Stripe Checkout,
// Customer Portal, historique de facturation Stripe. Interdits sur iOS.
export const EXTERNAL_PURCHASES_ENABLED = !IS_IOS;

// Inscription d'un compte établissement depuis l'app.
// De nouveau autorisée sur iOS puisque l'abonnement y passe par l'IAP.
export const BUSINESS_SIGNUP_ENABLED = true;

// Écran d'abonnement (tarifs, choix du pack) : disponible partout, seul le
// moyen de paiement diffère selon la plateforme.
export const SUBSCRIPTION_UI_ENABLED = true;

// Boost d'événement : encore encaissé via Stripe uniquement, donc absent d'iOS
// tant qu'un produit consommable StoreKit n'a pas été créé.
export const BOOST_PURCHASE_ENABLED = !IS_IOS;
