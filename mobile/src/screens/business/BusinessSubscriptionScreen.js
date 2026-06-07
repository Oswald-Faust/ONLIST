import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { BUSINESS_PLAN_KEYS, BUSINESS_PLANS, getBusinessPlan } from '../../constants/businessPlans';
import {
  getRevenueCatCustomerInfo,
  getSubscriptionOfferings,
  initializeRevenueCat,
  isRevenueCatConfigured,
  purchaseBusinessPlan,
  restoreBusinessPurchases,
} from '../../services/subscriptions';
import { useAuth } from '../../context/AuthContext';
import { subscriptionsAPI } from '../../services/api';

const PLAN_FEATURES = {
  [BUSINESS_PLAN_KEYS.STARTER]: [
    '1 établissement',
    '3 événements simultanés maximum',
    '5 créateurs par événement',
    'Accès créateurs jusqu’à 20k followers',
    'Invitation directe indisponible',
  ],
  [BUSINESS_PLAN_KEYS.PRO]: [
    '3 établissements',
    'Événements illimités',
    '15 créateurs par événement',
    'Accès créateurs jusqu’à 50k followers',
    'Invitation directe + stats de base',
  ],
  [BUSINESS_PLAN_KEYS.GROUP]: [
    'Établissements illimités',
    'Créateurs illimités par événement',
    'Tous les profils sans limite de followers',
    'Badge Partenaire Premium',
    'Statistiques complètes + account manager',
  ],
};

function PlanCard({ plan, isCurrent, onPress, disabled, priceLabel, loading }) {
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
      <Text style={s.planPrice}>{priceLabel || `${plan.priceMonthly}€/mois`}</Text>
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

export default function BusinessSubscriptionScreen({ navigation, route }) {
  const { user, updateUser, logout } = useAuth();
  const mandatory = Boolean(route?.params?.mandatory);
  const currentPlan = getBusinessPlan(user?.subscriptionPlan);
  const hasActiveSubscription = user?.subscriptionStatus === 'active';
  const activePlanKey = hasActiveSubscription ? currentPlan.key : null;
  const [offerings, setOfferings] = useState([]);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [purchasingPlan, setPurchasingPlan] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!isRevenueCatConfigured()) {
        if (mounted) setLoadingOfferings(false);
        return;
      }

      try {
        await initializeRevenueCat(user?._id);
        const nextOfferings = await getSubscriptionOfferings();
        if (mounted) setOfferings(nextOfferings);
      } catch (error) {
        if (mounted) {
          Alert.alert('RevenueCat', error.message);
        }
      } finally {
        if (mounted) setLoadingOfferings(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [user?._id]);

  const offeringsByPlan = useMemo(
    () => Object.fromEntries(offerings.map((item) => [item.planKey, item])),
    [offerings]
  );

  const handleChoosePlan = async (planKey) => {
    if (planKey === activePlanKey) return;

    if (!isRevenueCatConfigured()) {
      Alert.alert(
        'Facturation bientôt active',
        'RevenueCat n’est pas encore configuré sur cette build. Les packs sont prêts, mais il faut encore brancher les clés et les produits Apple/Google.'
      );
      return;
    }

    try {
      setPurchasingPlan(planKey);
      await purchaseBusinessPlan(planKey);
      const customerInfo = await getRevenueCatCustomerInfo();
      const activeEntitlements = Object.keys(customerInfo?.entitlements?.active || {});
      const syncData = await subscriptionsAPI.syncStatus();
      await updateUser(syncData?.user || {
        subscriptionPlan: planKey,
        subscriptionStatus: activeEntitlements.length > 0 ? 'active' : user?.subscriptionStatus,
      });
      Alert.alert(
        'Achat terminé',
        `Le pack ${BUSINESS_PLANS[planKey].name} est actif sur cette app.`
      );
    } catch (error) {
      Alert.alert('Paiement indisponible', error.message);
    } finally {
      setPurchasingPlan('');
    }
  };

  const handleRestore = async () => {
    try {
      const customerInfo = await restoreBusinessPurchases();
      const syncData = await subscriptionsAPI.syncStatus();
      if (syncData?.user) {
        await updateUser(syncData.user);
      }
      const activeEntitlements = Object.keys(customerInfo?.entitlements?.active || {});
      if (activeEntitlements.length > 0) {
        Alert.alert('Restauration terminée', 'Vos achats ont bien été restaurés.');
      } else {
        Alert.alert('Aucun achat trouvé', 'Aucun abonnement actif n’a été restauré pour ce compte.');
      }
    } catch (error) {
      Alert.alert('Restauration indisponible', error.message);
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

          {loadingOfferings && isRevenueCatConfigured() ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color={COLORS.primary} size="small" />
              <Text style={s.loadingText}>Chargement des offres RevenueCat...</Text>
            </View>
          ) : null}

          {Object.values(BUSINESS_PLANS).map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              isCurrent={plan.key === activePlanKey}
              onPress={handleChoosePlan}
              disabled={loadingOfferings || purchasingPlan.length > 0}
              loading={purchasingPlan === plan.key}
              priceLabel={offeringsByPlan[plan.key]?.priceString || `${plan.priceMonthly}€/mois`}
            />
          ))}

          <TouchableOpacity style={s.secondaryBtn} onPress={handleRestore}>
            <Ionicons name="refresh-outline" size={18} color={COLORS.white} />
            <Text style={s.secondaryBtnText}>Restaurer mes achats</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.contactBtn} onPress={handleContact}>
            <Text style={s.contactBtnText}>{mandatory ? 'Besoin d’aide pour activer votre accès ?' : 'Contacter ONLIST pour l’activation'}</Text>
          </TouchableOpacity>

          {mandatory ? (
            <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#F87171" />
              <Text style={s.logoutBtnText}>Se déconnecter</Text>
            </TouchableOpacity>
          ) : null}


        </ScrollView>
      </SafeAreaView>
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
  contactBtn: { alignItems: 'center', paddingVertical: SPACING.md },
  contactBtnText: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
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
});
