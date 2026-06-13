const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');
const {
  getStripe,
  getPlanForPriceId,
  mapStripeStatusToInternal,
} = require('./stripe');

// Extrait le Price ID du premier item d'une subscription Stripe
function getPriceIdFromSubscription(subscription) {
  return subscription?.items?.data?.[0]?.price?.id || '';
}

// Retrouve l'utilisateur ONLIST lié à une subscription/customer Stripe
async function resolveUserFromStripe({ userId, stripeCustomerId, stripeSubscriptionId }) {
  if (userId && /^[a-f\d]{24}$/i.test(String(userId))) {
    const byId = await User.findById(userId);
    if (byId) return byId;
  }
  if (stripeSubscriptionId) {
    const bySub = await User.findOne({ stripeSubscriptionId });
    if (bySub) return bySub;
  }
  if (stripeCustomerId) {
    const byCustomer = await User.findOne({ stripeCustomerId });
    if (byCustomer) return byCustomer;
  }
  return null;
}

// Applique l'état d'une subscription Stripe à l'utilisateur ONLIST et persiste
async function applyStripeSubscriptionToUser(user, subscription, options = {}) {
  if (!user || !subscription) {
    throw new Error('Utilisateur ou subscription Stripe manquant');
  }

  const priceId = getPriceIdFromSubscription(subscription);
  const planFromPrice = getPlanForPriceId(priceId);
  const planFromMeta = subscription.metadata?.plan;
  const nextPlan = planFromPrice || planFromMeta || user.subscriptionPlan || 'starter';

  let nextStatus = mapStripeStatusToInternal(subscription.status);

  // Une subscription annulée mais encore dans sa période payée reste active jusqu'à la fin
  if (subscription.cancel_at_period_end && nextStatus === 'active') {
    nextStatus = 'active';
  }

  // Logique founding partner / période de grâce (reprise du comportement existant)
  const settings = await SystemSettings.findOne({ key: 'global' }).lean();
  const billingDisabled = settings?.subscriptionBillingEnabled === false;
  if (user.isFoundingPartner && billingDisabled && nextStatus !== 'active') {
    nextStatus = 'grace';
  }

  const expiresAt = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : undefined;

  user.subscriptionPlan = ['active', 'trialing', 'grace'].includes(nextStatus) ? nextPlan : (nextStatus === 'past_due' ? nextPlan : 'starter');
  user.subscriptionStatus = nextStatus;
  user.stripeCustomerId = (typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id) || user.stripeCustomerId;
  user.stripeSubscriptionId = subscription.id || user.stripeSubscriptionId;
  user.subscriptionProductId = priceId || user.subscriptionProductId;
  user.subscriptionStore = 'stripe';
  user.subscriptionExpiresAt = expiresAt;
  user.subscriptionUpdatedAt = new Date();

  user.subscriptionHistory = Array.isArray(user.subscriptionHistory) ? user.subscriptionHistory : [];
  user.subscriptionHistory.unshift({
    action: options.action || 'stripe_sync',
    source: 'stripe',
    plan: user.subscriptionPlan,
    status: user.subscriptionStatus,
    productId: priceId,
    store: 'stripe',
    expiresAt,
    note: options.note || 'Synchronisation Stripe',
    createdAt: new Date(),
  });
  user.subscriptionHistory = user.subscriptionHistory.slice(0, 50);

  await user.save();
  return user;
}

// Met le user en statut inactif/annulé suite à une suppression de subscription
async function markStripeSubscriptionEnded(user, subscription, options = {}) {
  if (!user) return null;

  let nextStatus = 'cancelled';
  const settings = await SystemSettings.findOne({ key: 'global' }).lean();
  const billingDisabled = settings?.subscriptionBillingEnabled === false;
  if (user.isFoundingPartner && billingDisabled) {
    nextStatus = 'grace';
  }

  user.subscriptionStatus = nextStatus;
  if (nextStatus !== 'grace') {
    user.subscriptionPlan = 'starter';
  }
  user.stripeSubscriptionId = '';
  user.subscriptionStore = 'stripe';
  user.subscriptionUpdatedAt = new Date();
  user.subscriptionHistory = Array.isArray(user.subscriptionHistory) ? user.subscriptionHistory : [];
  user.subscriptionHistory.unshift({
    action: 'stripe_subscription_deleted',
    source: 'stripe',
    plan: user.subscriptionPlan,
    status: user.subscriptionStatus,
    productId: subscription?.items?.data?.[0]?.price?.id || '',
    store: 'stripe',
    note: options.note || 'Abonnement Stripe terminé',
    createdAt: new Date(),
  });
  user.subscriptionHistory = user.subscriptionHistory.slice(0, 50);
  await user.save();
  return user;
}

// Récupère (ou crée) le customer Stripe pour un utilisateur ONLIST
async function getOrCreateStripeCustomer(user) {
  const stripe = getStripe();
  if (user.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(user.stripeCustomerId);
      if (existing && !existing.deleted) return existing.id;
    } catch (_) {
      // customer introuvable -> on en recrée un
    }
  }

  const customer = await stripe.customers.create({
    email: user.email || undefined,
    name: user.businessName || user.name || undefined,
    metadata: { userId: String(user._id) },
  });

  user.stripeCustomerId = customer.id;
  await user.save();
  return customer.id;
}

module.exports = {
  getPriceIdFromSubscription,
  resolveUserFromStripe,
  applyStripeSubscriptionToUser,
  markStripeSubscriptionEnded,
  getOrCreateStripeCustomer,
};
