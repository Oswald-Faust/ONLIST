import * as WebBrowser from 'expo-web-browser';
import { subscriptionsAPI } from './api';

// Migration RevenueCat -> Stripe.
// Le paiement se fait sur des pages hébergées par Stripe (Checkout + Customer Portal),
// ouvertes dans le navigateur in-app. Conforme aux règles App Store pour le B2B :
// aucun paiement de contenu numérique n'est traité dans l'app elle-même.

// Ouvre Stripe Checkout pour souscrire/changer de plan.
// Retourne { type } d'expo-web-browser ('cancel' | 'dismiss' | 'opened').
export async function openSubscriptionCheckout(plan) {
  const { url } = await subscriptionsAPI.checkout(plan);
  if (!url) {
    throw new Error('Impossible de démarrer le paiement Stripe.');
  }
  return WebBrowser.openBrowserAsync(url);
}

// Ouvre le Customer Portal Stripe pour gérer/annuler l'abonnement existant.
export async function openSubscriptionPortal() {
  const { url } = await subscriptionsAPI.portal();
  if (!url) {
    throw new Error('Impossible d’ouvrir la gestion de l’abonnement.');
  }
  return WebBrowser.openBrowserAsync(url);
}

// Recharge le statut d'abonnement depuis le backend (après retour du navigateur).
export async function refreshSubscriptionStatus() {
  return subscriptionsAPI.status();
}
