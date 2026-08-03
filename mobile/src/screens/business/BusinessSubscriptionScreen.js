import { Alert, Text } from '../../i18n/LocalizedReactNative';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Linking, Modal, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { BUSINESS_PLAN_KEYS, BUSINESS_PLANS, getBusinessPlan } from '../../constants/businessPlans';
import {
  openSubscriptionCheckout,
  openSubscriptionPortal,
} from '../../services/subscriptions';
import {
  areInAppPurchasesAvailable,
  getBusinessOfferings,
  purchaseBusinessPlan,
  restoreBusinessPurchases,
} from '../../services/purchases';
import { USE_IN_APP_PURCHASES } from '../../constants/platformPolicy';
import { useAuth } from '../../context/AuthContext';
import { subscriptionsAPI } from '../../services/api';

const PLAN_FEATURES = {
  [BUSINESS_PLAN_KEYS.STARTER]: [
    '1 établissement',
    '1 événement actif par jour',
    '5 créateurs par événement',
    'Jusqu’à 3 stories + 1 avis Google',
    'Accès créateurs jusqu’à 20k followers',
    'Invitation directe indisponible',
  ],
  [BUSINESS_PLAN_KEYS.PRO]: [
    '3 établissements',
    '3 événements actifs par jour',
    '15 créateurs par événement',
    'Jusqu’à 5 stories + post feed',
    'Accès créateurs jusqu’à 50k followers',
    'Invitation directe + stats de base',
  ],
  [BUSINESS_PLAN_KEYS.GROUP]: [
    'Établissements illimités',
    'Créateurs illimités par événement',
    'Jusqu’à 6-7 stories + reel ou TikTok',
    'Tous les profils sans limite de followers',
    'Badge Partenaire Premium',
    'Statistiques complètes + account manager',
  ],
};

const TERMS_URL = 'https://onlist.club/conditions-utilisation.html';
const PRIVACY_URL = 'https://onlist.club/politique-confidentialite.html';

// Sur iOS, la gestion et la résiliation d'un abonnement se font dans les
// réglages du compte Apple — Apple refuse tout autre canal de gestion.
const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

function PlanCard({ plan, isCurrent, onPress, disabled, priceLabel, loading }) {
  const monthlyPriceLabel = priceLabel || `${plan.priceMonthly}€/mois`;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress(plan.key)}
      disabled={disabled}
      style={[s.planCard, isCurrent && s.planCardCurrent]}
    >
      <View style={s.planRow}>
        <Text style={s.planTier}>{plan.tier}</Text>
        {isCurrent ? (
          <View style={s.currentBadge}>
            <Text style={s.currentBadgeText}>Actuel</Text>
          </View>
        ) : null}
      </View>
      <Text style={s.planName}>{plan.name}</Text>
      <Text style={s.planPrice}>{monthlyPriceLabel}</Text>
      <View style={s.subscriptionInfo}>
        <Text style={s.subscriptionInfoText}>Abonnement mensuel auto-renouvelable</Text>
        <Text style={s.subscriptionInfoText}>Durée : 1 mois</Text>
        <Text style={s.subscriptionInfoText}>Prix : {monthlyPriceLabel}</Text>
      </View>
      <View style={s.features}>
        {PLAN_FEATURES[plan.key].map((feature) => (
          <View key={feature} style={s.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
            <Text style={s.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
      {!isCurrent ? (
        <View style={s.planAction}>
          {loading ? (
            <ActivityIndicator size="small" color="#0A0A0F" />
          ) : (
            <Text style={s.planActionText}>Choisir ce pack</Text>
          )}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function SubscriptionSuccessModal({ visible, planKey, priceLabel, onContinue }) {
  const plan = planKey ? BUSINESS_PLANS[planKey] : null;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      pop.setValue(0);
      Animated.spring(pop, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!plan) return null;

  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinue}>
      <View style={s.successOverlay}>
        <LinearGradient colors={['#15140F', '#0A0A0F']} style={s.successCard}>
          <Animated.View style={[s.successBadge, { transform: [{ scale }] }]}>
            <Ionicons name="checkmark" size={52} color="#0A0A0F" />
          </Animated.View>

          <Text style={s.successEmoji}>🎉</Text>
          <Text style={s.successTitle}>Paiement réussi !</Text>
          <Text style={s.successText}>
            Félicitations, ton abonnement est désormais actif.
          </Text>

          <View style={s.successPlanPill}>
            <Ionicons name="star" size={14} color={COLORS.primary} />
            <Text style={s.successPlanName}>{plan.name}</Text>
            <Text style={s.successPlanPrice}>{priceLabel || `${plan.priceMonthly}€/mois`}</Text>
          </View>

          <View style={s.successFeatures}>
            {(PLAN_FEATURES[plan.key] || []).slice(0, 4).map((feature) => (
              <View key={feature} style={s.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                <Text style={s.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.successBtn} onPress={onContinue} activeOpacity={0.9}>
            <Text style={s.successBtnText}>Accéder à mon dashboard</Text>
            <Ionicons name="arrow-forward" size={18} color="#0A0A0F" />
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
}

export default function BusinessSubscriptionScreen({ navigation, route }) {
  const { user, updateUser, logout } = useAuth();
  const mandatory = Boolean(route?.params?.mandatory);
  const currentPlan = getBusinessPlan(user?.subscriptionPlan);
  const hasActiveSubscription = ['active', 'trialing', 'grace'].includes(user?.subscriptionStatus);
  const activePlanKey = hasActiveSubscription ? currentPlan.key : null;
  const [purchasingPlan, setPurchasingPlan] = useState('');
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [successPlanKey, setSuccessPlanKey] = useState(null);
  // iOS : prix réels renvoyés par StoreKit, indexés par clé de pack.
  const [offerings, setOfferings] = useState({});
  const [loadingOfferings, setLoadingOfferings] = useState(USE_IN_APP_PURCHASES);
  const [restoring, setRestoring] = useState(false);

  // Apple exige que le paywall affiche le prix renvoyé par StoreKit (devise et
  // montant locaux), jamais un tarif codé en dur dans l'app.
  useEffect(() => {
    if (!areInAppPurchasesAvailable()) {
      setLoadingOfferings(false);
      return;
    }
    let cancelled = false;
    getBusinessOfferings()
      .then((result) => { if (!cancelled) setOfferings(result); })
      .catch(() => { if (!cancelled) setOfferings({}); })
      .finally(() => { if (!cancelled) setLoadingOfferings(false); });
    return () => { cancelled = true; };
  }, []);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Interroge le backend jusqu'à ce que l'abonnement soit actif (le webhook Stripe
  // peut prendre quelques secondes après le retour du paiement).
  const pollUntilActive = async (attempts = 8, delayMs = 1500) => {
    for (let i = 0; i < attempts; i += 1) {
      const status = await subscriptionsAPI.status().catch(() => null);
      if (status && ['active', 'trialing'].includes(status.subscriptionStatus)) {
        return status;
      }
      if (i < attempts - 1) await sleep(delayMs);
    }
    return null;
  };

  const handleChoosePlan = async (planKey) => {
    if (planKey === activePlanKey) return;

    try {
      setPurchasingPlan(planKey);

      // iOS : achat StoreKit. Ailleurs : Stripe Checkout dans le navigateur.
      if (USE_IN_APP_PURCHASES) {
        const offering = offerings[planKey];
        if (!offering) {
          Alert.alert(
            'Pack indisponible',
            "Ce pack n'est pas proposé à l'achat pour le moment. Réessayez dans quelques instants."
          );
          return;
        }
        const result = await purchaseBusinessPlan(offering);
        if (result.cancelled) return;
        if (result.active) {
          setSuccessPlanKey(planKey);
        } else {
          // L'achat est passé mais l'entitlement n'est pas encore propagé.
          const status = await pollUntilActive();
          if (status) setSuccessPlanKey(planKey);
          else {
            Alert.alert(
              'Achat en cours de validation',
              'Votre achat a été enregistré. L’accès s’activera dans quelques instants.'
            );
          }
        }
        return;
      }

      await openSubscriptionCheckout(planKey);
      // Au retour du navigateur, on attend la confirmation du webhook.
      const status = await pollUntilActive();
      if (status) {
        // On affiche la célébration AVANT de débloquer la navigation.
        setSuccessPlanKey(planKey);
      } else {
        Alert.alert(
          'Paiement en cours de validation',
          'Si tu viens de payer, ton accès s’activera dans quelques secondes. Reviens sur cet écran pour réessayer.'
        );
      }
    } catch (error) {
      Alert.alert('Paiement indisponible', error.message);
    } finally {
      setPurchasingPlan('');
    }
  };

  // Obligatoire pour Apple : un utilisateur qui réinstalle l'app ou change
  // d'appareil doit pouvoir retrouver son abonnement sans repayer.
  const handleRestorePurchases = async () => {
    try {
      setRestoring(true);
      const { active } = await restoreBusinessPurchases();
      if (active) {
        const status = await subscriptionsAPI.status().catch(() => null);
        if (status) {
          await updateUser({
            subscriptionPlan: status.subscriptionPlan,
            subscriptionStatus: status.subscriptionStatus,
          });
        }
        Alert.alert('Achats restaurés', 'Votre abonnement a bien été retrouvé.');
      } else {
        Alert.alert(
          'Aucun achat à restaurer',
          "Aucun abonnement actif n'est associé à cet identifiant Apple."
        );
      }
    } catch (error) {
      Alert.alert('Restauration impossible', error.message);
    } finally {
      setRestoring(false);
    }
  };

  // Validé depuis l'écran de félicitations : on met à jour le user, ce qui
  // débloque automatiquement le dashboard établissement via la navigation.
  const handleSuccessContinue = async () => {
    const planKey = successPlanKey;
    setSuccessPlanKey(null);
    if (planKey) {
      await updateUser({ subscriptionPlan: planKey, subscriptionStatus: 'active' });
    }
  };

  const handleManageSubscription = async () => {
    // iOS : Apple impose que la gestion et la résiliation passent par les
    // réglages du compte Apple. Le Customer Portal Stripe y est interdit.
    if (USE_IN_APP_PURCHASES) {
      await openLegalUrl(APPLE_SUBSCRIPTIONS_URL);
      return;
    }

    try {
      setManagingSubscription(true);
      await openSubscriptionPortal();
      const status = await subscriptionsAPI.status().catch(() => null);
      if (status) {
        await updateUser({
          subscriptionPlan: status.subscriptionPlan,
          subscriptionStatus: status.subscriptionStatus,
        });
      }
    } catch (error) {
      Alert.alert('Gestion indisponible', error.message);
    } finally {
      setManagingSubscription(false);
    }
  };

  const handleContact = async () => {
    const url = 'mailto:contact@onlist.club?subject=Abonnement%20ONLIST%20Business';
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return;
    }
    Alert.alert('Contact ONLIST', 'Écris à contact@onlist.club pour finaliser ton abonnement.');
  };

  const openLegalUrl = async (url) => {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) await Linking.openURL(url);
  };

  const handleLogout = () => {
    Alert.alert(
      'Se déconnecter',
      'Voulez-vous vraiment vous déconnecter de ce compte établissement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#0A0A0F', '#0E0D0B']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.header}>
          {mandatory ? <View style={{ width: 42 }} /> : (
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Ionicons name="chevron-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
          )}
          <Text style={s.headerTitle}>Abonnement</Text>
          <View style={{ width: 42 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.heroCard}>
            <Text style={s.heroEyebrow}>
              {mandatory ? 'COMPTE VALIDÉ' : hasActiveSubscription ? 'PACK BUSINESS ACTUEL' : 'AUCUN ABONNEMENT ACTIF'}
            </Text>
            <Text style={s.heroTitle}>
              {mandatory ? 'Active ton abonnement pour continuer' : hasActiveSubscription ? currentPlan.name : 'Choisis ton pack business'}
            </Text>
            <Text style={s.heroText}>
              {mandatory
                ? 'Ton établissement est validé. Choisis maintenant un forfait pour débloquer le dashboard établissement et commencer à publier tes événements.'
                : hasActiveSubscription && currentPlan.hasPremiumBadge
                  ? 'Partenaire Premium actif'
                  : hasActiveSubscription
                    ? 'Fonctionnalités business selon votre abonnement'
                    : 'Ton accès établissement reste bloqué tant qu’aucun abonnement n’est actif.'}
            </Text>
          </View>

          {loadingOfferings ? (
            <View style={s.offeringsLoader}>
              <ActivityIndicator color={COLORS.primaryLight} />
              <Text style={s.offeringsLoaderText}>Chargement des tarifs…</Text>
            </View>
          ) : (
            Object.values(BUSINESS_PLANS).map((plan) => {
              // Sur iOS le prix vient de StoreKit (devise et montant locaux) ;
              // ailleurs, du tarif Stripe défini dans l'app.
              const offering = offerings[plan.key];
              const priceLabel = USE_IN_APP_PURCHASES
                ? (offering ? `${offering.priceString}/mois` : 'Indisponible')
                : `${plan.priceMonthly}€/mois`;
              return (
                <PlanCard
                  key={plan.key}
                  plan={plan}
                  isCurrent={plan.key === activePlanKey}
                  onPress={handleChoosePlan}
                  disabled={
                    purchasingPlan.length > 0 ||
                    managingSubscription ||
                    (USE_IN_APP_PURCHASES && !offering)
                  }
                  loading={purchasingPlan === plan.key}
                  priceLabel={priceLabel}
                />
              );
            })
          )}

          {hasActiveSubscription ? (
            <TouchableOpacity style={s.secondaryBtn} onPress={handleManageSubscription} disabled={managingSubscription}>
              {managingSubscription ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="settings-outline" size={18} color={COLORS.white} />
                  <Text style={s.secondaryBtnText}>Gérer mon abonnement</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          {/* Restauration des achats : exigée par Apple sur tout paywall IAP. */}
          {USE_IN_APP_PURCHASES ? (
            <TouchableOpacity
              style={s.restoreBtn}
              onPress={handleRestorePurchases}
              disabled={restoring}
              activeOpacity={0.85}
            >
              {restoring ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={17} color={COLORS.white} />
                  <Text style={s.restoreBtnText}>Restaurer mes achats</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={s.contactBtn} onPress={handleContact}>
            <Text style={s.contactBtnText}>{mandatory ? 'Besoin d’aide pour activer votre accès ?' : 'Contacter ONLIST pour l’activation'}</Text>
          </TouchableOpacity>

          <View style={s.legalNotice}>
            {/* Mentions imposées par la guideline 3.1.2 pour un abonnement
                auto-renouvelable : durée, reconduction, modalités d'annulation. */}
            <Text style={s.legalNoticeText}>
              {USE_IN_APP_PURCHASES
                ? 'Abonnement mensuel reconduit automatiquement. Le paiement est débité sur votre compte Apple à la confirmation de l’achat. Le renouvellement est facturé dans les 24 heures précédant la fin de la période en cours, sauf désactivation au moins 24 heures avant. Vous pouvez gérer ou résilier votre abonnement à tout moment dans les réglages de votre compte Apple.'
                : 'Les abonnements ONLIST Business sont facturés mensuellement et renouvelés automatiquement jusqu’à résiliation.'}
            </Text>
            <View style={s.legalLinks}>
              <TouchableOpacity onPress={() => openLegalUrl(TERMS_URL)} activeOpacity={0.8}>
                <Text style={s.legalLinkText}>Conditions d’utilisation</Text>
              </TouchableOpacity>
              <Text style={s.legalSeparator}>•</Text>
              <TouchableOpacity onPress={() => openLegalUrl(PRIVACY_URL)} activeOpacity={0.8}>
                <Text style={s.legalLinkText}>Politique de confidentialité</Text>
              </TouchableOpacity>
            </View>
          </View>

          {mandatory ? (
            <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#F87171" />
              <Text style={s.logoutBtnText}>Se déconnecter</Text>
            </TouchableOpacity>
          ) : null}


        </ScrollView>
      </SafeAreaView>

      <SubscriptionSuccessModal
        visible={Boolean(successPlanKey)}
        planKey={successPlanKey}
        priceLabel={
          USE_IN_APP_PURCHASES && successPlanKey && offerings[successPlanKey]
            ? `${offerings[successPlanKey].priceString}/mois`
            : null
        }
        onContinue={handleSuccessContinue}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  heroCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  heroEyebrow: { color: COLORS.primary, fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold, marginBottom: 8 },
  heroTitle: { color: COLORS.white, fontSize: FONTS.sizes.xl, fontFamily: FONTS.bold, marginBottom: 4 },
  heroText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular },
  planCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  planCardCurrent: { borderColor: COLORS.primary },
  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  planTier: { fontSize: 24 },
  currentBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(201,169,97,0.14)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  currentBadgeText: { color: COLORS.primary, fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },
  planName: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold, marginBottom: 4 },
  planPrice: { color: COLORS.primary, fontSize: FONTS.sizes.base, fontFamily: FONTS.semiBold, marginBottom: SPACING.md },
  subscriptionInfo: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    padding: SPACING.sm,
    gap: 4,
    marginBottom: SPACING.md,
  },
  subscriptionInfoText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, lineHeight: 18 },
  features: { gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, flex: 1 },
  planAction: {
    marginTop: SPACING.md,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planActionText: { color: '#0A0A0F', fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold },
  secondaryBtn: {
    height: 54,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: SPACING.sm,
  },
  secondaryBtnText: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.semiBold },
  restoreBtn: {
    height: 50,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    marginTop: SPACING.sm,
  },
  restoreBtnText: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  offeringsLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xxl,
  },
  offeringsLoaderText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular },
  contactBtn: { alignItems: 'center', paddingVertical: SPACING.md },
  contactBtnText: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  legalNotice: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.035)',
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  legalNoticeText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, lineHeight: 18, textAlign: 'center' },
  legalLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  legalLinkText: { color: COLORS.primary, fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },
  legalSeparator: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  logoutBtnText: { color: '#F87171', fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  helperText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, lineHeight: 18 },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.md,
  },
  loadingText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular },

  // --- Écran de félicitations ---
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  successCard: {
    width: '100%',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  successBadge: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  successEmoji: { fontSize: 30, marginTop: SPACING.md },
  successTitle: { color: COLORS.white, fontSize: FONTS.sizes.xl, fontFamily: FONTS.bold, marginTop: 6 },
  successText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: SPACING.sm,
  },
  successPlanPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(201,169,97,0.14)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: SPACING.md,
  },
  successPlanName: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold },
  successPlanPrice: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  successFeatures: { gap: 10, alignSelf: 'stretch', marginTop: SPACING.lg, marginBottom: SPACING.sm },
  successBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    marginTop: SPACING.md,
  },
  successBtnText: { color: '#0A0A0F', fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
});
