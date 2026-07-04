import { useLanguage } from '../../context/LanguageContext';
import { getCurrentLocale } from '../../i18n/runtime';
import { Text } from '../../i18n/LocalizedReactNative';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Linking, RefreshControl, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { subscriptionsAPI } from '../../services/api';
import { openSubscriptionPortal } from '../../services/subscriptions';

function formatAmount(amount, currency = 'eur') {
  try {
    return new Intl.NumberFormat(getCurrentLocale(), {
      style: 'currency',
      currency: String(currency || 'eur').toUpperCase(),
    }).format(Number(amount || 0) / 100);
  } catch (_) {
    return `${(Number(amount || 0) / 100).toFixed(2)} ${(currency || 'eur').toUpperCase()}`;
  }
}

const STATUS_LABELS = {
  paid: 'Payée',
  open: 'En attente',
  draft: 'Brouillon',
  uncollectible: 'Irrécouvrable',
  void: 'Annulée',
};

export default function BusinessBillingScreen({ navigation }) {
  useLanguage();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);

  const load = useCallback(async () => {
    try {
      const data = await subscriptionsAPI.billingHistory();
      setInvoices(data?.invoices || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openPortal = async () => {
    try {
      setPortalLoading(true);
      await openSubscriptionPortal();
    } finally {
      setPortalLoading(false);
    }
  };

  const openInvoice = async (url) => {
    if (!url) return;
    await Linking.openURL(url);
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#0A0A0F', '#0E0D0B']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Facturation</Text>
          <View style={{ width: 42 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 100 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          <View style={s.heroCard}>
            <Text style={s.heroEyebrow}>PAIEMENTS & FACTURES</Text>
            <Text style={s.heroTitle}>Retrouvez tous vos règlements Stripe</Text>
            <Text style={s.heroText}>
              Cette section centralise vos paiements d’abonnement et de boosts, avec accès direct aux factures PDF et à la gestion Stripe.
            </Text>
            <TouchableOpacity style={s.portalBtn} onPress={openPortal} disabled={portalLoading} activeOpacity={0.9}>
              {portalLoading ? (
                <ActivityIndicator size="small" color="#0A0A0F" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={18} color="#0A0A0F" />
                  <Text style={s.portalBtnText}>Gérer dans Stripe</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={s.loader}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : invoices.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="receipt-outline" size={28} color={COLORS.primary} />
              <Text style={s.emptyTitle}>Aucune facture pour le moment</Text>
              <Text style={s.emptyText}>
                Vos paiements apparaîtront ici après validation par Stripe.
              </Text>
            </View>
          ) : (
            <View style={s.list}>
              {invoices.map((invoice) => {
                const isPaid = invoice.status === 'paid';
                const label = STATUS_LABELS[invoice.status] || invoice.status || '—';
                const firstLine = invoice.lines?.[0]?.description || invoice.description || 'Paiement ONLIST';
                return (
                  <TouchableOpacity
                    key={invoice.id}
                    style={s.invoiceCard}
                    activeOpacity={invoice.hostedInvoiceUrl || invoice.invoicePdf ? 0.88 : 1}
                    onPress={() => openInvoice(invoice.hostedInvoiceUrl || invoice.invoicePdf)}
                  >
                    <View style={s.invoiceHead}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.invoiceTitle} numberOfLines={1}>{firstLine}</Text>
                        <Text style={s.invoiceDate}>
                          {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString(getCurrentLocale(), { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date inconnue'}
                        </Text>
                      </View>
                      <View style={[s.statusBadge, isPaid ? s.statusBadgePaid : s.statusBadgePending]}>
                        <Text style={[s.statusBadgeText, isPaid ? s.statusBadgeTextPaid : s.statusBadgeTextPending]}>{label}</Text>
                      </View>
                    </View>

                    <View style={s.invoiceMeta}>
                      <View>
                        <Text style={s.invoiceAmount}>{formatAmount(invoice.amountPaid || invoice.amountDue, invoice.currency)}</Text>
                        <Text style={s.invoiceRef}>Facture #{invoice.number}</Text>
                      </View>
                      {(invoice.hostedInvoiceUrl || invoice.invoicePdf) ? (
                        <View style={s.invoiceLink}>
                          <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
                          <Text style={s.invoiceLinkText}>Voir</Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
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
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, gap: SPACING.md },
  heroCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  heroEyebrow: { color: COLORS.primary, fontSize: FONTS.sizes.xs, fontFamily: FONTS.bold, letterSpacing: 1.2 },
  heroTitle: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  heroText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, lineHeight: 21 },
  portalBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
  portalBtnText: { color: '#0A0A0F', fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold },
  loader: { paddingVertical: SPACING.xxl, alignItems: 'center' },
  emptyCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyTitle: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  emptyText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, textAlign: 'center', lineHeight: 20 },
  list: { gap: SPACING.md },
  invoiceCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  invoiceHead: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  invoiceTitle: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.semiBold },
  invoiceDate: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, marginTop: 4 },
  statusBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgePaid: { backgroundColor: 'rgba(16,217,160,0.12)' },
  statusBadgePending: { backgroundColor: 'rgba(201,169,97,0.12)' },
  statusBadgeText: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },
  statusBadgeTextPaid: { color: COLORS.success },
  statusBadgeTextPending: { color: COLORS.primary },
  invoiceMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md },
  invoiceAmount: { color: COLORS.primary, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  invoiceRef: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, marginTop: 2 },
  invoiceLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  invoiceLinkText: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
});
