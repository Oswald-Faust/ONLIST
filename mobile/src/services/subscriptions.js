import * as WebBrowser from 'expo-web-browser';
import { eventsAPI, subscriptionsAPI } from './api';
import { EXTERNAL_PURCHASES_ENABLED } from '../constants/platformPolicy';

// Migration RevenueCat -> Stripe.
// Le paiement se fait sur des pages hébergées par Stripe (Checkout + Customer Portal),
// ouvertes dans le navigateur in-app.
//
// Sur iOS, ces parcours sont interdits par la guideline App Store 3.1.1 : ils sont
// retirés de l'interface (voir constants/platformPolicy.js). Ce garde-fou est une
// seconde barrière — si un chemin d'appel était oublié, il échoue au lieu d'ouvrir
// une page de paiement externe.
function assertExternalPurchasesAllowed() {
  if (!EXTERNAL_PURCHASES_ENABLED) {
    throw new Error('Paiement indisponible depuis cette application.');
  }
}

// Ouvre Stripe Checkout pour souscrire/changer de plan.
// Retourne { type } d'expo-web-browser ('cancel' | 'dismiss' | 'opened').
export async function openSubscriptionCheckout(plan) {
  assertExternalPurchasesAllowed();
  const { url } = await subscriptionsAPI.checkout(plan);
  if (!url) {
    throw new Error('Impossible de démarrer le paiement Stripe.');
  }
  return WebBrowser.openBrowserAsync(url);
}

// Ouvre le Customer Portal Stripe pour gérer/annuler l'abonnement existant.
export async function openSubscriptionPortal() {
  assertExternalPurchasesAllowed();
  const { url } = await subscriptionsAPI.portal();
  if (!url) {
    throw new Error('Impossible d’ouvrir la gestion de l’abonnement.');
  }
  return WebBrowser.openBrowserAsync(url);
}

export async function openBoostCheckout(eventId, days) {
  assertExternalPurchasesAllowed();
  const { url, sessionId } = await eventsAPI.boostCheckout(eventId, days);
  if (!url) {
    throw new Error('Impossible de démarrer le paiement du boost.');
  }
  const result = await WebBrowser.openBrowserAsync(url);
  return { result, sessionId };
}

// Recharge le statut d'abonnement depuis le backend (après retour du navigateur).
export async function refreshSubscriptionStatus() {
  return subscriptionsAPI.status();
}
