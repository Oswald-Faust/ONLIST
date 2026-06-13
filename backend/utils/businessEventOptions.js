const OFFER_TAGS_BY_CATEGORY = {
  restaurant: ['Dîner offert', 'Déjeuner offert', 'Menu découverte', 'Consommations offertes', 'Table privée', 'Accès événement'],
  bar: ['Consommations offertes', 'Accès VIP', 'Table réservée', 'Bouteille offerte', 'Entrée gratuite'],
  club: ['Entrée gratuite', 'Table VIP', 'Bouteille offerte', 'Accès backstage'],
  spa: ['Soin offert', 'Accès espace détente', 'Massage offert', 'Journée découverte'],
  wellness: ['Soin offert', 'Accès espace détente', 'Massage offert', 'Journée découverte'],
  sport: ['Séance offerte', 'Abonnement découverte', 'Cours privé', 'Accès premium'],
  default: ['Avantage offert', 'Accès événement'],
};

const DELIVERABLE_OPTIONS = [
  { key: 'story_1', label: '1 story Instagram', minPlan: 'starter' },
  { key: 'story_2', label: '2 stories Instagram', minPlan: 'starter' },
  { key: 'story_3', label: '3 stories Instagram', minPlan: 'starter' },
  { key: 'story_4', label: '4 stories Instagram', minPlan: 'pro' },
  { key: 'story_5', label: '5 stories Instagram', minPlan: 'pro' },
  { key: 'story_6', label: '6 stories Instagram', minPlan: 'group' },
  { key: 'story_7', label: '7 stories Instagram', minPlan: 'group' },
  { key: 'feed_post', label: 'Post Feed Instagram', minPlan: 'pro' },
  { key: 'reel_or_tiktok', label: 'Reel ou TikTok', minPlan: 'group' },
  { key: 'google_review', label: 'Avis Google + screen', minPlan: 'starter' },
  { key: 'plus_one_google_review', label: 'Avis Google du +1 + screen', minPlan: 'starter' },
];

const APPLICATION_CUTOFF_OPTIONS = [1, 2, 3, 4];
const BOOST_OPTIONS = [
  { days: 1, price: 19 },
  { days: 3, price: 49 },
  { days: 7, price: 99 },
  { days: 14, price: 179 },
];

module.exports = {
  APPLICATION_CUTOFF_OPTIONS,
  BOOST_OPTIONS,
  DELIVERABLE_OPTIONS,
  OFFER_TAGS_BY_CATEGORY,
};
