import { Platform } from 'react-native';

export const revenueCatConfig = {
  iosApiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '',
  androidApiKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '',
  starterProductId: process.env.EXPO_PUBLIC_RC_STARTER_PRODUCT_ID || '',
  proProductId: process.env.EXPO_PUBLIC_RC_PRO_PRODUCT_ID || '',
  groupProductId: process.env.EXPO_PUBLIC_RC_GROUP_PRODUCT_ID || '',
};

let purchasesModule = null;
let configured = false;

function getPurchasesModule() {
  if (Platform.OS === 'web') return null;
  if (!purchasesModule) {
    purchasesModule = require('react-native-purchases').default;
  }
  return purchasesModule;
}

function getCurrentApiKey() {
  if (Platform.OS === 'ios') return revenueCatConfig.iosApiKey;
  if (Platform.OS === 'android') return revenueCatConfig.androidApiKey;
  return '';
}

export function isRevenueCatConfigured() {
  const currentApiKey = getCurrentApiKey();
  return Boolean(
    currentApiKey &&
    revenueCatConfig.starterProductId &&
    revenueCatConfig.proProductId &&
    revenueCatConfig.groupProductId
  );
}

export async function initializeRevenueCat(appUserId) {
  if (!isRevenueCatConfigured()) {
    return false;
  }

  const Purchases = getPurchasesModule();
  if (!Purchases) return false;

  if (configured) {
    if (appUserId) {
      try {
        await Purchases.logIn(appUserId);
      } catch (_) {
        // ignore repeated logins for now
      }
    }
    return true;
  }

  const logLevel = Purchases.LOG_LEVEL?.DEBUG || 'DEBUG';
  Purchases.setLogLevel(logLevel);
  Purchases.configure({
    apiKey: getCurrentApiKey(),
    appUserID: appUserId || undefined,
  });
  configured = true;
  return true;
}

function inferPlanKeyFromPackage(pkg) {
  const packageIdentifier = pkg?.identifier || '';
  const productIdentifier = pkg?.product?.identifier || pkg?.storeProduct?.identifier || '';
  const combined = `${packageIdentifier} ${productIdentifier}`.toLowerCase();

  if (combined.includes('starter')) return 'starter';
  if (combined.includes('pro')) return 'pro';
  if (combined.includes('group')) return 'group';
  return null;
}

export async function getSubscriptionOfferings() {
  if (!isRevenueCatConfigured()) {
    throw new Error('RevenueCat n’est pas encore configuré sur cette build.');
  }

  const Purchases = getPurchasesModule();
  if (!Purchases) {
    throw new Error('RevenueCat n’est pas disponible sur le web.');
  }

  await initializeRevenueCat();
  const offerings = await Purchases.getOfferings();
  const currentOffering = offerings.current;
  if (!currentOffering) return [];

  return (currentOffering.availablePackages || [])
    .map((pkg) => {
      const planKey = inferPlanKeyFromPackage(pkg);
      if (!planKey) return null;
      const storeProduct = pkg.product || pkg.storeProduct;
      return {
        planKey,
        packageToPurchase: pkg,
        productIdentifier: storeProduct?.identifier || '',
        priceString: storeProduct?.priceString || '',
        title: storeProduct?.title || '',
      };
    })
    .filter(Boolean);
}

export async function purchaseBusinessPlan(planKey) {
  if (!isRevenueCatConfigured()) {
    throw new Error('RevenueCat n’est pas encore configuré sur cette build.');
  }

  const packages = await getSubscriptionOfferings();
  const selected = packages.find((item) => item.planKey === planKey);
  if (!selected?.packageToPurchase) {
    throw new Error(`Le pack ${planKey} n’est pas disponible dans l’offering RevenueCat par défaut.`);
  }

  const Purchases = getPurchasesModule();
  const result = await Purchases.purchasePackage(selected.packageToPurchase);
  return result?.customerInfo || result;
}

export async function restoreBusinessPurchases() {
  if (!isRevenueCatConfigured()) {
    throw new Error('RevenueCat n’est pas encore configuré sur cette build.');
  }

  const Purchases = getPurchasesModule();
  if (!Purchases) {
    throw new Error('RevenueCat n’est pas disponible sur le web.');
  }

  await initializeRevenueCat();
  return Purchases.restorePurchases();
}

export async function getRevenueCatCustomerInfo() {
  if (!isRevenueCatConfigured()) {
    throw new Error('RevenueCat n’est pas encore configuré sur cette build.');
  }

  const Purchases = getPurchasesModule();
  if (!Purchases) {
    throw new Error('RevenueCat n’est pas disponible sur le web.');
  }

  await initializeRevenueCat();
  return Purchases.getCustomerInfo();
}
