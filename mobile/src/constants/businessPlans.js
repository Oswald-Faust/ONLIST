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
    maxActiveEvents: 3,
    maxCreatorsPerEvent: 5,
    maxFollowersAccess: 20000,
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
    maxActiveEvents: null,
    maxCreatorsPerEvent: 15,
    maxFollowersAccess: 50000,
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
    maxActiveEvents: null,
    maxCreatorsPerEvent: null,
    maxFollowersAccess: null,
    canDirectInvite: true,
    creatorStatsLevel: 'full',
    hasPremiumBadge: true,
  },
};

export function getBusinessPlan(planKey) {
  return BUSINESS_PLANS[planKey] || BUSINESS_PLANS[BUSINESS_PLAN_KEYS.STARTER];
}
