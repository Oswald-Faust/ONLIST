import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { BUSINESS_PLAN_KEYS } from '../constants/businessPlans';
import { USE_IN_APP_PURCHASES } from '../constants/platformPolicy';
import { subscriptionsAPI } from './api';

// ─── Achats in-app (StoreKit via RevenueCat) ──────────────────────────────────
//
// Utilisé uniquement sur iOS : Apple impose l'IAP pour l'abonnement business
// (guideline 3.1.1). Android et le web restent sur Stripe — voir
// services/subscriptions.js.
//
// L'`appUserID` RevenueCat est l'ObjectId Mongo de l'utilisateur : le backend
// (utils/revenueCat.js → resolveUserFromRevenueCatEvent) retrouve le compte à
// partir de cet identifiant dans les webhooks, sans table de correspondance.

// Nom de variable historique conservé : la clé est déjà définie dans eas.json
// pour les trois profils de build.
const IOS_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ||
  process.env.EXPO_PUBLIC_RC_IOS_KEY ||
  '';

// Doivent correspondre aux identifiants créés dans App Store Connect et aux
// valeurs lues côté serveur (backend/utils/revenueCat.js).
const PRODUCT_IDS = {
  [BUSINESS_PLAN_KEYS.STARTER]:
    process.env.EXPO_PUBLIC_RC_STARTER_PRODUCT_ID || 'onlist_business_starter_monthly',
  [BUSINESS_PLAN_KEYS.PRO]:
    process.env.EXPO_PUBLIC_RC_PRO_PRODUCT_ID || 'onlist_business_pro_monthly',
  [BUSINESS_PLAN_KEYS.GROUP]:
    process.env.EXPO_PUBLIC_RC_GROUP_PRODUCT_ID || 'onlist_business_group_monthly',
};

const ENTITLEMENT_ID = process.env.EXPO_PUBLIC_RC_ENTITLEMENT_ID || 'business_access';

let configuredForUser = null;

export function areInAppPurchasesAvailable() {
  return USE_IN_APP_PURCHASES && Boolean(IOS_API_KEY);
}

/**
 * Initialise le SDK pour un utilisateur donné. Idempotent : un rappel avec le
 * même identifiant ne refait rien, un changement de compte déclenche un logIn.
 */
export async function configurePurchases(userId) {
  if (!areInAppPurchasesAvailable() || !userId) return false;

  const appUserId = String(userId);
  if (configuredForUser === appUserId) return true;

  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);

  const alreadyConfigured = await Purchases.isConfigured();
  if (alreadyConfigured) {
    await Purchases.logIn(appUserId);
  } else {
    Purchases.configure({ apiKey: IOS_API_KEY, appUserID: appUserId });
  }

  configuredForUser = appUserId;
  return true;
}

/** Dissocie le compte au logout, pour ne pas rattacher un achat au mauvais user. */
export async function resetPurchasesUser() {
  if (!areInAppPurchasesAvailable() || !configuredForUser) return;
  try {
    await Purchases.logOut();
  } catch {
    // logOut échoue si l'utilisateur est déjà anonyme — sans conséquence.
  } finally {
    configuredForUser = null;
  }
}

function planKeyForProductId(productId) {
  const entry = Object.entries(PRODUCT_IDS).find(([, id]) => id === productId);
  if (entry) return entry[0];

  // Repli sur le nom du produit si les identifiants ont divergé du code.
  const normalized = String(productId || '').toLowerCase();
  if (normalized.includes('group')) return BUSINESS_PLAN_KEYS.GROUP;
  if (normalized.includes('pro')) return BUSINESS_PLAN_KEYS.PRO;
  return BUSINESS_PLAN_KEYS.STARTER;
}

/**
 * Prix réels facturés par Apple, indexés par clé de pack.
 * Apple exige que le paywall affiche le prix renvoyé par StoreKit (devise et
 * montant locaux), jamais un prix codé en dur.
 *
 * @returns {Promise<Object>} { starter: { priceString, package }, ... }
 */
export async function getBusinessOfferings() {
  if (!areInAppPurchasesAvailable()) return {};

  const offerings = await Purchases.getOfferings();
  const packages = offerings?.current?.availablePackages || [];

  return packages.reduce((acc, pkg) => {
    const productId = pkg?.product?.identifier;
    if (!productId) return acc;
    const planKey = planKeyForProductId(productId);
    acc[planKey] = {
      planKey,
      productId,
      priceString: pkg.product.priceString,
      price: pkg.product.price,
      currencyCode: pkg.product.currencyCode,
      package: pkg,
    };
    return acc;
  }, {});
}

function hasBusinessEntitlement(customerInfo) {
  const active = customerInfo?.entitlements?.active || {};
  return Boolean(active[ENTITLEMENT_ID] || Object.keys(active).length > 0);
}

/**
 * Lance l'achat StoreKit d'un pack.
 * @returns {Promise<{cancelled: boolean, active?: boolean, planKey?: string}>}
 */
export async function purchaseBusinessPlan(offering) {
  if (!offering?.package) {
    throw new Error("Ce pack n'est pas disponible à l'achat pour le moment.");
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(offering.package);
    // On notifie le backend sans attendre le webhook RevenueCat : l'accès est
    // débloqué immédiatement, le webhook servant de filet de rattrapage.
    await syncSubscriptionWithBackend();
    return {
      cancelled: false,
      active: hasBusinessEntitlement(customerInfo),
      planKey: offering.planKey,
    };
  } catch (error) {
    // L'annulation par l'utilisateur n'est pas une erreur à afficher.
    if (error?.userCancelled) return { cancelled: true };
    throw new Error(
      error?.message || "L'achat n'a pas pu être finalisé. Réessayez dans un instant."
    );
  }
}

/**
 * Restauration des achats — obligatoire pour Apple (guideline 3.1.1) : un
 * utilisateur qui réinstalle ou change d'appareil doit pouvoir retrouver son
 * abonnement sans repayer.
 */
export async function restoreBusinessPurchases() {
  if (!areInAppPurchasesAvailable()) {
    return { active: false };
  }

  const customerInfo = await Purchases.restorePurchases();
  const active = hasBusinessEntitlement(customerInfo);
  if (active) await syncSubscriptionWithBackend();
  return { active };
}

/**
 * Demande au backend de réinterroger RevenueCat et de mettre à jour le compte.
 * Retourne l'état d'abonnement à jour, ou null si l'appel échoue.
 */
export async function syncSubscriptionWithBackend() {
  try {
    return await subscriptionsAPI.syncRevenueCat();
  } catch {
    // Le webhook RevenueCat rattrapera la synchronisation côté serveur.
    return null;
  }
}
