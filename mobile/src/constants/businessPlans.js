export const BUSINESS_PLAN_KEYS = {
  STARTER: 'starter',
  PRO: 'pro',
  GROUP: 'group',
};

export const BUSINESS_PLANS = {
  [BUSINESS_PLAN_KEYS.STARTER]: {
    key: BUSINESS_PLAN_KEYS.STARTER,
    tier: '🥉',
    name: 'APP STARTER',
    priceMonthly: 149,
    maxLieux: 1,
    maxActiveEventsPerDay: 1,
    maxCreatorsPerEvent: 5,
    maxFollowersAccess: 20000,
    maxStoriesPerCreator: 3,
    allowFeedPost: false,
    allowShortVideo: false,
    canDirectInvite: false,
    creatorStatsLevel: 'none',
    hasPremiumBadge: false,
  },
  [BUSINESS_PLAN_KEYS.PRO]: {
    key: BUSINESS_PLAN_KEYS.PRO,
    tier: '🥈',
    name: 'APP PRO',
    priceMonthly: 249,
    maxLieux: 3,
    maxActiveEventsPerDay: 3,
    maxCreatorsPerEvent: 15,
    maxFollowersAccess: 50000,
    maxStoriesPerCreator: 5,
    allowFeedPost: true,
    allowShortVideo: false,
    canDirectInvite: true,
    creatorStatsLevel: 'basic',
    hasPremiumBadge: false,
  },
  [BUSINESS_PLAN_KEYS.GROUP]: {
    key: BUSINESS_PLAN_KEYS.GROUP,
    tier: '🥇',
    name: 'APP GROUP',
    priceMonthly: 499,
    maxLieux: null,
    maxActiveEventsPerDay: null,
    maxCreatorsPerEvent: null,
    maxFollowersAccess: null,
    maxStoriesPerCreator: 7,
    allowFeedPost: true,
    allowShortVideo: true,
    canDirectInvite: true,
    creatorStatsLevel: 'full',
    hasPremiumBadge: true,
  },
};

export function getBusinessPlan(planKey) {
  return BUSINESS_PLANS[planKey] || BUSINESS_PLANS[BUSINESS_PLAN_KEYS.STARTER];
}
