import { Platform } from 'react-native';

// ─── Conformité App Store — Guideline 3.1.1 (In-App Purchase) ─────────────────
//
// Apple a rejeté la soumission iOS au motif que le parcours d'inscription
// établissement constitue un accès à un mécanisme d'achat externe (l'abonnement
// business est encaissé via Stripe Checkout, hors IAP).
//
// Sur iOS, on retire donc du binaire :
//   • l'inscription établissement (BusinessRegisterFlow / BusinessHowItWorks) ;
//   • l'écran d'abonnement, ses tarifs et le Checkout Stripe ;
//   • le Customer Portal Stripe et l'écran de facturation ;
//   • l'achat de boost d'événement (également payé via Stripe).
//
// Ce qui reste autorisé sur iOS : la connexion d'un compte établissement
// existant et l'usage complet de ses fonctionnalités. C'est explicitement prévu
// par la guideline 3.1.3(b) — services multiplateformes : un abonnement souscrit
// ailleurs peut être utilisé dans l'app tant qu'aucun appel à l'action ne
// renvoie vers le mécanisme d'achat externe.
//
// IMPORTANT : ces drapeaux dépendent uniquement de la plateforme de build. Ils
// ne doivent JAMAIS être pilotés par un flag serveur qu'on réactiverait après
// validation d'Apple — ce serait une dissimulation passible de la révocation du
// compte développeur.

export const IS_IOS = Platform.OS === 'ios';

// Inscription d'un compte établissement depuis l'app.
// Sur iOS : renvoyer les établissements vers https://onlist.club/inscription-etablissement.html
export const BUSINESS_SIGNUP_ENABLED = !IS_IOS;

// Tout appel à l'action menant à un paiement hors IAP (Stripe Checkout,
// Customer Portal, tarifs affichés, boost payant).
export const EXTERNAL_PURCHASES_ENABLED = !IS_IOS;
