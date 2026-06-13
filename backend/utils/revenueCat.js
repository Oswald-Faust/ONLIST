const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');

const DEFAULT_PRODUCT_IDS = {
  starter: 'onlist_business_starter_monthly',
  pro: 'onlist_business_pro_monthly',
  group: 'onlist_business_group_monthly',
};

function getRevenueCatConfig() {
  return {
    secretApiKey: process.env.REVENUECAT_SECRET_API_KEY || '',
    webhookAuth: process.env.REVENUECAT_WEBHOOK_AUTH || '',
    entitlementId: process.env.REVENUECAT_BUSINESS_ENTITLEMENT_ID || 'business_access',
    productIds: {
      starter: process.env.REVENUECAT_STARTER_PRODUCT_ID || process.env.EXPO_PUBLIC_RC_STARTER_PRODUCT_ID || DEFAULT_PRODUCT_IDS.starter,
      pro: process.env.REVENUECAT_PRO_PRODUCT_ID || process.env.EXPO_PUBLIC_RC_PRO_PRODUCT_ID || DEFAULT_PRODUCT_IDS.pro,
      group: process.env.REVENUECAT_GROUP_PRODUCT_ID || process.env.EXPO_PUBLIC_RC_GROUP_PRODUCT_ID || DEFAULT_PRODUCT_IDS.group,
    },
  };
}

function mapProductIdToPlan(productId) {
  const { productIds } = getRevenueCatConfig();
  if (!productId) return 'starter';
  if (productId === productIds.group) return 'group';
  if (productId === productIds.pro) return 'pro';
  if (productId === productIds.starter) return 'starter';

  const normalized = String(productId).toLowerCase();
  if (normalized.includes('group')) return 'group';
  if (normalized.includes('pro')) return 'pro';
  if (normalized.includes('starter')) return 'starter';
  return 'starter';
}

function mapEventTypeToStatus(type) {
  if (['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE'].includes(type)) return 'active';
  if (type === 'BILLING_ISSUE') return 'past_due';
  if (type === 'EXPIRATION') return 'inactive';
  if (type === 'CANCELLATION') return 'cancelled';
  return 'inactive';
}

function normalizeSubscriberState(subscriber = {}, fallback = {}) {
  const { entitlementId } = getRevenueCatConfig();
  const activeEntitlements = subscriber.entitlements?.active || {};
  const allEntitlements = subscriber.entitlements?.all || {};
  const entitlement =
    activeEntitlements[entitlementId] ||
    Object.values(activeEntitlements)[0] ||
    allEntitlements[entitlementId] ||
    Object.values(allEntitlements)[0] ||
    null;

  const productId =
    entitlement?.product_identifier ||
    fallback.productId ||
    '';

  const isActive = Boolean(
    activeEntitlements[entitlementId] ||
    (!entitlementId && Object.keys(activeEntitlements).length)
  ) || Boolean(entitlement && entitlement.expires_date && new Date(entitlement.expires_date) > new Date());

  return {
    subscriptionPlan: isActive ? mapProductIdToPlan(productId) : 'starter',
    subscriptionStatus: isActive ? 'active' : (fallback.status || 'inactive'),
    revenueCatEntitlement: entitlement?.product_identifier ? entitlementId : (fallback.entitlementId || entitlementId),
    subscriptionProductId: productId || undefined,
    subscriptionStore: entitlement?.store || fallback.store || undefined,
    subscriptionExpiresAt: entitlement?.expires_date ? new Date(entitlement.expires_date) : undefined,
    revenueCatCustomerId: fallback.appUserId || subscriber.original_app_user_id || undefined,
  };
}

async function fetchRevenueCatSubscriber(appUserId) {
  const { secretApiKey } = getRevenueCatConfig();
  if (!secretApiKey) {
    throw new Error('REVENUECAT_SECRET_API_KEY manquant');
  }

  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretApiKey}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`RevenueCat API ${response.status}: ${body}`);
  }

  return response.json();
}

function getCandidateAppUserIdsFromEvent(event = {}) {
  return [
    event.app_user_id,
    event.original_app_user_id,
    ...(Array.isArray(event.aliases) ? event.aliases : []),
  ]
    .filter(Boolean)
    .map((value) => String(value));
}

async function resolveUserFromRevenueCatEvent(event = {}) {
  const candidateIds = getCandidateAppUserIdsFromEvent(event);

  for (const candidate of candidateIds) {
    if (/^[a-f\d]{24}$/i.test(candidate)) {
      const byId = await User.findById(candidate);
      if (byId) return { user: byId, appUserId: candidate };
    }
  }

  for (const candidate of candidateIds) {
    const byCustomerId = await User.findOne({ revenueCatCustomerId: candidate });
    if (byCustomerId) return { user: byCustomerId, appUserId: candidate };
  }

  return { user: null, appUserId: candidateIds[0] || null };
}

async function syncUserSubscriptionFromRevenueCat(user, options = {}) {
  const appUserId = options.appUserId || user?.revenueCatCustomerId || String(user?._id || '');
  if (!user || !appUserId) {
    throw new Error('Utilisateur ou appUserId manquant');
  }

  const subscriberPayload = await fetchRevenueCatSubscriber(appUserId);
  const subscriber = subscriberPayload?.subscriber || {};
  const nextState = normalizeSubscriberState(subscriber, {
    appUserId,
    status: options.status,
    productId: options.productId,
    store: options.store,
    entitlementId: options.entitlementId,
  });

  const settings = await SystemSettings.findOne({ key: 'global' }).lean();
  const billingDisabled = settings?.subscriptionBillingEnabled === false;
  if (user.isFoundingPartner && billingDisabled && nextState.subscriptionStatus !== 'active') {
    nextState.subscriptionStatus = 'grace';
  }

  user.subscriptionHistory = Array.isArray(user.subscriptionHistory) ? user.subscriptionHistory : [];
  user.subscriptionPlan = nextState.subscriptionPlan;
  user.subscriptionStatus = nextState.subscriptionStatus;
  user.revenueCatCustomerId = nextState.revenueCatCustomerId || user.revenueCatCustomerId || appUserId;
  user.revenueCatEntitlement = nextState.revenueCatEntitlement;
  user.subscriptionProductId = nextState.subscriptionProductId;
  user.subscriptionStore = nextState.subscriptionStore;
  user.subscriptionExpiresAt = nextState.subscriptionExpiresAt;
  user.subscriptionUpdatedAt = new Date();
  user.subscriptionHistory.unshift({
    action: 'revenuecat_sync',
    source: 'revenuecat',
    plan: nextState.subscriptionPlan,
    status: nextState.subscriptionStatus,
    productId: nextState.subscriptionProductId,
    store: nextState.subscriptionStore,
    expiresAt: nextState.subscriptionExpiresAt,
    note: options.note || 'Synchronisation RevenueCat',
    createdAt: new Date(),
  });
  user.subscriptionHistory = user.subscriptionHistory.slice(0, 50);
  await user.save();

  return user;
}

function validateRevenueCatWebhookAuth(req) {
  const { webhookAuth } = getRevenueCatConfig();
  if (!webhookAuth) return true;

  const incoming = req.headers.authorization || req.headers['x-revenuecat-auth'] || '';
  return incoming === webhookAuth || incoming === `Bearer ${webhookAuth}`;
}

module.exports = {
  getRevenueCatConfig,
  mapProductIdToPlan,
  mapEventTypeToStatus,
  normalizeSubscriberState,
  fetchRevenueCatSubscriber,
  resolveUserFromRevenueCatEvent,
  syncUserSubscriptionFromRevenueCat,
  validateRevenueCatWebhookAuth,
};
