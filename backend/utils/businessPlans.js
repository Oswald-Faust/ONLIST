const SystemSettings = require('../models/SystemSettings');

const BUSINESS_PLAN_KEYS = {
  STARTER: 'starter',
  PRO: 'pro',
  GROUP: 'group',
};

const BUSINESS_PLANS = {
  [BUSINESS_PLAN_KEYS.STARTER]: {
    key: BUSINESS_PLAN_KEYS.STARTER,
    name: 'APP STARTER',
    priceMonthly: 149,
    maxLieux: 1,
    maxActiveEventsPerDay: 1,
    maxCreatorsPerEvent: 5,
    maxFollowersAccess: 20000,
    maxStoriesPerCreator: 3,
    canDirectInvite: false,
    creatorStatsLevel: 'none',
    hasPremiumBadge: false,
    allowFeedPost: false,
    allowShortVideo: false,
  },
  [BUSINESS_PLAN_KEYS.PRO]: {
    key: BUSINESS_PLAN_KEYS.PRO,
    name: 'APP PRO',
    priceMonthly: 249,
    maxLieux: 3,
    maxActiveEventsPerDay: 3,
    maxCreatorsPerEvent: 15,
    maxFollowersAccess: 50000,
    maxStoriesPerCreator: 5,
    canDirectInvite: true,
    creatorStatsLevel: 'basic',
    hasPremiumBadge: false,
    allowFeedPost: true,
    allowShortVideo: false,
  },
  [BUSINESS_PLAN_KEYS.GROUP]: {
    key: BUSINESS_PLAN_KEYS.GROUP,
    name: 'APP GROUP',
    priceMonthly: 499,
    maxLieux: null,
    maxActiveEventsPerDay: null,
    maxCreatorsPerEvent: null,
    maxFollowersAccess: null,
    maxStoriesPerCreator: 7,
    canDirectInvite: true,
    creatorStatsLevel: 'full',
    hasPremiumBadge: true,
    allowFeedPost: true,
    allowShortVideo: true,
  },
};

async function getSystemSettings() {
  let settings = await SystemSettings.findOne({ key: 'global' });
  if (!settings) {
    settings = await SystemSettings.create({ key: 'global' });
  }
  return settings;
}

function getBusinessPlanKey(user) {
  if (!user) return BUSINESS_PLAN_KEYS.STARTER;
  if (user.type === 'admin') return BUSINESS_PLAN_KEYS.GROUP;
  return BUSINESS_PLANS[user.subscriptionPlan] ? user.subscriptionPlan : BUSINESS_PLAN_KEYS.STARTER;
}

function getBusinessPlan(user) {
  return BUSINESS_PLANS[getBusinessPlanKey(user)];
}

async function canBusinessAccessPaidFeatures(user) {
  if (!user || user.type === 'admin') return true;
  if (['active', 'trialing'].includes(user.subscriptionStatus)) return true;

  if (user.subscriptionStatus === 'grace' && user.isFoundingPartner) {
    const settings = await getSystemSettings();
    return settings.subscriptionBillingEnabled === false;
  }

  return false;
}

function isInfluencerVisibleToBusiness(influencer, businessUser) {
  const plan = getBusinessPlan(businessUser);
  if (!plan.maxFollowersAccess) return true;
  return (influencer.followersCount || 0) <= plan.maxFollowersAccess;
}

function sanitizeInfluencerForBusiness(influencer, businessUser) {
  const plan = getBusinessPlan(businessUser);
  const raw = typeof influencer.toObject === 'function' ? influencer.toObject() : { ...influencer };

  if (plan.creatorStatsLevel === 'none') {
    delete raw.score;
    delete raw.reviewsCount;
    delete raw.scoreDetails;
    delete raw.city;
  }

  raw.locked = !isInfluencerVisibleToBusiness(influencer, businessUser);

  return raw;
}

module.exports = {
  BUSINESS_PLAN_KEYS,
  BUSINESS_PLANS,
  canBusinessAccessPaidFeatures,
  getBusinessPlan,
  getBusinessPlanKey,
  getSystemSettings,
  isInfluencerVisibleToBusiness,
  sanitizeInfluencerForBusiness,
};
