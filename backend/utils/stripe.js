const Stripe = require('stripe');

let stripeClient = null;

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY manquant');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, { apiVersion: '2024-06-20' });
  }
  return stripeClient;
}

function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// Correspondance plan business <-> Stripe Price ID (configurés dans le dashboard Stripe)
function getPlanPriceMap() {
  return {
    starter: process.env.STRIPE_PRICE_STARTER || '',
    pro: process.env.STRIPE_PRICE_PRO || '',
    group: process.env.STRIPE_PRICE_GROUP || '',
  };
}

function getPriceIdForPlan(planKey) {
  const map = getPlanPriceMap();
  return map[planKey] || '';
}

// Libellé lisible d'un plan business (pour notifications, emails, etc.)
function getPlanLabel(planKey) {
  const labels = {
    starter: 'Starter',
    pro: 'Pro',
    group: 'Groupe',
  };
  return labels[planKey] || (planKey ? String(planKey) : 'Starter');
}

// Reverse: retrouve le plan business à partir d'un Stripe Price ID
function getPlanForPriceId(priceId) {
  if (!priceId) return null;
  const map = getPlanPriceMap();
  const found = Object.entries(map).find(([, id]) => id && id === priceId);
  return found ? found[0] : null;
}

// Formate un montant Stripe (en plus petite unité, ex: centimes) en libellé lisible
function formatStripeAmount(amount, currency) {
  if (amount == null || Number.isNaN(Number(amount))) return '';
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: (currency || 'eur').toUpperCase(),
    }).format(Number(amount) / 100);
  } catch (_) {
    return `${(Number(amount) / 100).toFixed(2)} ${(currency || 'eur').toUpperCase()}`;
  }
}

// Stripe subscription.status -> statut interne ONLIST
function mapStripeStatusToInternal(stripeStatus) {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
      return 'cancelled';
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
    default:
      return 'inactive';
  }
}

function getAppUrls() {
  const base = (process.env.STRIPE_PUBLIC_BASE_URL || process.env.APP_URL || 'https://onlist.club').replace(/\/$/, '');
  return {
    success: process.env.STRIPE_SUCCESS_URL || `${base}/abonnement/merci?session_id={CHECKOUT_SESSION_ID}`,
    cancel: process.env.STRIPE_CANCEL_URL || `${base}/abonnement/annule`,
    portalReturn: process.env.STRIPE_PORTAL_RETURN_URL || `${base}/abonnement`,
  };
}

module.exports = {
  getStripe,
  isStripeConfigured,
  getPlanPriceMap,
  getPriceIdForPlan,
  getPlanLabel,
  formatStripeAmount,
  getPlanForPriceId,
  mapStripeStatusToInternal,
  getAppUrls,
};
