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
    maxActiveEvents: 3,
    maxCreatorsPerEvent: 5,
    maxFollowersAccess: 20000,
    canDirectInvite: false,
    creatorStatsLevel: 'none',
    hasPremiumBadge: false,
  },
  [BUSINESS_PLAN_KEYS.PRO]: {
    key: BUSINESS_PLAN_KEYS.PRO,
    name: 'APP PRO',
    priceMonthly: 249,
    maxLieux: 3,
    maxActiveEvents: null,
    maxCreatorsPerEvent: 15,
    maxFollowersAccess: 50000,
    canDirectInvite: true,
    creatorStatsLevel: 'basic',
    hasPremiumBadge: false,
  },
  [BUSINESS_PLAN_KEYS.GROUP]: {
    key: BUSINESS_PLAN_KEYS.GROUP,
    name: 'APP GROUP',
    priceMonthly: 499,
    maxLieux: null,
    maxActiveEvents: null,
    maxCreatorsPerEvent: null,
    maxFollowersAccess: null,
    canDirectInvite: true,
    creatorStatsLevel: 'full',
    hasPremiumBadge: true,
  },
};

function getBusinessPlanKey(user) {
  if (!user) return BUSINESS_PLAN_KEYS.STARTER;
  if (user.type === 'admin') return BUSINESS_PLAN_KEYS.GROUP;
  return BUSINESS_PLANS[user.subscriptionPlan] ? user.subscriptionPlan : BUSINESS_PLAN_KEYS.STARTER;
}

function getBusinessPlan(user) {
  return BUSINESS_PLANS[getBusinessPlanKey(user)];
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
  } else if (plan.creatorStatsLevel === 'basic') {
    delete raw.scoreDetails;
    delete raw.reviewsCount;
  }

  return raw;
}

module.exports = {
  BUSINESS_PLAN_KEYS,
  BUSINESS_PLANS,
  getBusinessPlan,
  getBusinessPlanKey,
  isInfluencerVisibleToBusiness,
  sanitizeInfluencerForBusiness,
};
