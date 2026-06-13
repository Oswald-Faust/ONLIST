import { BUSINESS_PLAN_KEYS } from './businessPlans';

export const OFFER_TAGS_BY_CATEGORY = {
  restaurant: ['Dîner', 'Déjeuner', 'Brunch', 'Cocktail offert', 'Menu dégustation', 'Table premium'],
  bar: ['Cocktails offerts', 'Bouteille', 'Happy hour VIP', 'Table réservée', 'Tapas'],
  club: ['Entrée offerte', 'Table VIP', 'Bouteille', 'Accès backstage', 'Carré privé'],
  spa: ['Soin offert', 'Massage', 'Accès spa', 'Brunch bien-être'],
  sport: ['Séance offerte', 'Coaching privé', 'Accès premium', 'Pack récupération'],
  wellness: ['Atelier offert', 'Soin bien-être', 'Accès premium'],
  hotel: ['Nuitée', 'Petit-déjeuner', 'Accès rooftop', 'Surclassement'],
  cafe: ['Boisson offerte', 'Brunch', 'Pâtisserie', 'Menu découverte'],
  beauty: ['Prestation offerte', 'Diagnostic beauté', 'Pack mise en beauté'],
  shop: ['Bon d’achat', 'Sélection offerte', 'Private shopping'],
  premium: ['Expérience sur-mesure', 'Invitation privée', 'Conciergerie'],
  other: ['Accès offert', 'Avantage partenaire'],
};

export const DELIVERABLE_OPTIONS = [
  { key: 'instagram_story_1', label: '1 story Instagram', minPlan: BUSINESS_PLAN_KEYS.STARTER },
  { key: 'instagram_story_3', label: 'Jusqu’à 3 stories', minPlan: BUSINESS_PLAN_KEYS.STARTER },
  { key: 'instagram_story_5', label: 'Jusqu’à 5 stories', minPlan: BUSINESS_PLAN_KEYS.PRO },
  { key: 'instagram_story_7', label: '6-7 stories', minPlan: BUSINESS_PLAN_KEYS.GROUP },
  { key: 'google_review', label: 'Avis Google', minPlan: BUSINESS_PLAN_KEYS.STARTER },
  { key: 'feed_post', label: 'Post feed Instagram', minPlan: BUSINESS_PLAN_KEYS.PRO },
  { key: 'reel_or_tiktok', label: 'Reel ou TikTok', minPlan: BUSINESS_PLAN_KEYS.GROUP },
  { key: 'google_review_plus_one_screen', label: 'Avis Google + screen du +1', minPlan: BUSINESS_PLAN_KEYS.STARTER },
];

export const APPLICATION_CUTOFF_OPTIONS = [1, 2, 3, 4];

export const BOOST_OPTIONS = [
  { days: 1, price: 19 },
  { days: 3, price: 49 },
  { days: 7, price: 99 },
  { days: 14, price: 179 },
];
