import { useLanguage } from '../../context/LanguageContext';
import { getCurrentLocale } from '../../i18n/runtime';
import { Text, Alert } from '../../i18n/LocalizedReactNative';
import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, StatusBar, RefreshControl, Image, Modal
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { CATEGORY_LABELS } from '../../constants/categories';
import { BOOST_OPTIONS } from '../../constants/businessEventOptions';
import { eventsAPI } from '../../services/api';
import { openBoostCheckout } from '../../services/subscriptions';
import { isUpcomingEvent } from '../../utils/events';

const MOMENT_LABELS = { morning: 'Matin', afternoon: 'Après-midi', evening: 'Soir', night: 'Nuit' };
const EVENT_FILTERS = [
  { key: 'active', label: 'Actifs' },
  { key: 'upcoming', label: 'À venir' },
  { key: 'past', label: 'Passés' },
];

const isActiveEvent = (event) => event.status !== 'draft' && event.isActive !== false;

function EventCard({ event, navigation, onBoost }) {
  const isDraft = event.status === 'draft';
  const isActive = event.isActive;
  const statusLabel = isDraft ? 'Brouillon' : (isActive ? 'Publié' : 'En pause');
  const statusColor = isDraft ? COLORS.warning : (isActive ? COLORS.success : COLORS.textMuted);
  const statusBg = isDraft
    ? 'rgba(245,158,11,0.15)'
    : (isActive ? 'rgba(16,217,160,0.15)' : 'rgba(255,255,255,0.08)');
  const date = event.date ? new Date(event.date) : null;
  const dateStr = date
    ? date.toLocaleDateString(getCurrentLocale(), { day: '2-digit', month: 'short', year: 'numeric' })
    : null;
  const isPast = !isUpcomingEvent(event);
  const boosted = !!(event.isBoosted && event.boostExpiresAt && new Date(event.boostExpiresAt) > new Date());

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => isDraft
        ? navigation.navigate('CreateEvent', { eventToEdit: event })
        : navigation.navigate('BusinessEventDetail', { eventId: event._id })}
    >
      {/* Image header */}
      <View style={styles.cardImage}>
        {event.images && event.images.length > 0 ? (
          <Image source={{ uri: event.images[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={['rgba(201,169,97,0.18)', 'rgba(201,169,97,0.04)']}
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(10,10,15,0.9)']}
          style={styles.cardOverlay}
        />

        {/* Badge statut */}
        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>

        {event.isSponsored && (
          <View style={styles.premiumBadge}>
            <Ionicons name="arrow-up" size={10} color="#0A0A0F" />
            <Text style={styles.premiumText}>Boosté</Text>
          </View>
        )}
      </View>

      {/* Corps */}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>

        <View style={styles.infoGrid}>
          {event.venue ? (
            <View style={styles.infoRow}>
              <Ionicons name="business-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.infoText} numberOfLines={1}>{event.venue}</Text>
            </View>
          ) : null}
          {dateStr ? (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.infoText}>{dateStr}</Text>
            </View>
          ) : null}
          {event.city ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.infoText}>{event.city}</Text>
            </View>
          ) : null}
          {event.maxParticipants ? (
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.infoText}>{event.acceptedCount || 0}/{event.maxParticipants} influenceurs</Text>
            </View>
          ) : null}
        </View>

        {/* Tags */}
        <View style={styles.tagsRow}>
          {event.category ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{CATEGORY_LABELS[event.category] || event.category}</Text>
            </View>
          ) : null}
          {event.moment ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{MOMENT_LABELS[event.moment] || event.moment}</Text>
            </View>
          ) : null}
        </View>

        {/* Boutons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionPrimary}
            onPress={() => navigation.navigate('BusinessEventDetail', { eventId: event._id })}
          >
            <Text style={styles.actionPrimaryText}>Voir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionSecondary}
            onPress={() => navigation.navigate('CreateEvent', { eventToEdit: event })}
          >
            <Ionicons name="pencil-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.actionSecondaryText}>Modifier</Text>
          </TouchableOpacity>
          {isPast ? null : boosted ? (
            <View style={[styles.actionSecondary, styles.actionBoosted]}>
              <Ionicons name="flash" size={14} color={COLORS.primary} />
              <Text style={[styles.actionSecondaryText, { color: COLORS.primary }]}>Boosté</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.actionSecondary}
              onPress={() => onBoost(event)}
            >
              <Ionicons name="flash-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.actionSecondaryText}>Booster</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function EvenementsScreen({ navigation }) {
  useLanguage();
  const [events, setEvents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('active');
  const [boostSheet, setBoostSheet] = useState({ visible: false, eventId: null, eventTitle: '' });
  const [selectedBoostDays, setSelectedBoostDays] = useState(String(BOOST_OPTIONS[0]?.days || 1));
  const insets = useSafeAreaInsets();

  const openBoostSheet = (event) => {
    setSelectedBoostDays(String(event?.boostDurationDays || BOOST_OPTIONS[0]?.days || 1));
    setBoostSheet({
      visible: true,
      eventId: event?._id || null,
      eventTitle: event?.title || '',
    });
  };

  const closeBoostSheet = () => {
    setBoostSheet({ visible: false, eventId: null, eventTitle: '' });
  };

  const handleBoostPayment = async () => {
    if (!boostSheet.eventId) return;
    const eventId = boostSheet.eventId;
    try {
      const { sessionId } = await openBoostCheckout(eventId, Number(selectedBoostDays));
      closeBoostSheet();
      // Le navigateur Stripe vient de se fermer : on confirme l'activation du boost
      // directement via Stripe (sans dépendre du webhook).
      await confirmBoostActivation(eventId, sessionId);
    } catch (err) {
      Alert.alert('Paiement indisponible', err.message);
    }
  };

  // Vérifie la session Stripe et active le boost. On relance quelques fois car
  // le statut de paiement peut être finalisé avec un léger décalage.
  const confirmBoostActivation = async (eventId, sessionId) => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const data = await eventsAPI.boostConfirm(eventId, sessionId);
        if (data?.activated && data.event) {
          setEvents((prev) => prev.map((e) => (e._id === eventId ? { ...e, ...data.event } : e)));
          Alert.alert('Boost activé 🎉', 'Votre événement est désormais mis en avant (Sponsorisé).');
          return;
        }
      } catch (err) {
        // On ignore et on relance : le paiement n'est peut-être pas encore finalisé.
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    // Pas encore confirmé : on recharge quand même la liste.
    await load();
    Alert.alert(
      'Paiement reçu',
      "L'activation du boost peut prendre un instant. Tirez vers le bas pour rafraîchir si besoin."
    );
  };

  const load = async () => {
    try {
      // "Mes événements" couvre tous les lieux gérés par le compte. Le lieu
      // actif sert à la navigation et à la création, pas à masquer la liste.
      const data = await eventsAPI.myEvents();
      const list = data.events || [];
      setEvents(list);
      reconcilePendingBoosts(list);
    } catch (err) {
      console.log('Erreur chargement events:', err.message);
    }
  };

  // Réconcilie les boosts payés mais non encore activés (ex. webhook Stripe absent) :
  // pour chaque événement à venir ayant une session de paiement mais non boosté,
  // on tente une confirmation directe auprès de Stripe.
  const reconcilePendingBoosts = async (list) => {
    const pending = (list || []).filter(
      (e) => !e.isBoosted && e.boostCheckoutSessionId && isUpcomingEvent(e)
    );
    for (const ev of pending) {
      try {
        const data = await eventsAPI.boostConfirm(ev._id, ev.boostCheckoutSessionId);
        if (data?.activated && data.event) {
          setEvents((prev) => prev.map((x) => (x._id === ev._id ? { ...x, ...data.event } : x)));
        }
      } catch (err) {
        // Silencieux : la session n'est probablement pas (encore) payée.
      }
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const eventMatchesFilter = (event) => {
    const isUpcoming = isUpcomingEvent(event);
    const isPast = !isUpcoming;

    if (activeFilter === 'active') return isActiveEvent(event);
    if (activeFilter === 'upcoming') return isUpcoming;
    if (activeFilter === 'past') return isPast;
    return true;
  };

  const filteredEvents = events.filter(eventMatchesFilter);
  const counts = {
    active: events.filter(isActiveEvent).length,
    upcoming: events.filter((event) => {
      return isUpcomingEvent(event);
    }).length,
    past: events.filter((event) => {
      return !isUpcomingEvent(event);
    }).length,
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#0A0A0F', '#0E0D0B']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Mes événements</Text>
            <Text style={styles.headerSub}>{filteredEvents.length} événement{filteredEvents.length !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('CreateEvent')}
          >
            <LinearGradient colors={COLORS.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtnGrad}>
              <Ionicons name="add" size={18} color="#0A0A0F" />
              <Text style={styles.addBtnText}>Créer</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.filtersWrap}>
          {EVENT_FILTERS.map((filter) => {
            const active = activeFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter.key)}
                activeOpacity={0.85}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {filter.label} ({counts[filter.key] || 0})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          data={filteredEvents}
          keyExtractor={item => item._id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="calendar-outline" size={36} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>Aucun événement</Text>
              <Text style={styles.emptySub}>
                {activeFilter === 'past'
                  ? 'Aucun événement passé pour le moment.'
                  : activeFilter === 'upcoming'
                    ? 'Aucun événement à venir pour le moment.'
                    : 'Aucun événement actif pour le moment.'}
              </Text>
              {activeFilter !== 'past' ? (
                <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('CreateEvent')}>
                  <LinearGradient colors={COLORS.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.emptyBtnGrad}>
                    <Text style={styles.emptyBtnText}>Créer un événement</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          renderItem={({ item }) => <EventCard event={item} navigation={navigation} onBoost={openBoostSheet} />}
        />

        <Modal visible={boostSheet.visible} transparent animationType="slide" onRequestClose={closeBoostSheet}>
          <View style={styles.sheetOverlay}>
            <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={closeBoostSheet} />
            <View style={[styles.sheetCard, { paddingBottom: insets.bottom + SPACING.xl }]}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View style={styles.sheetHeaderCopy}>
                  <Text style={styles.sheetTitle}>Booster cet événement</Text>
                  <Text style={styles.sheetText}>
                    {boostSheet.eventTitle
                      ? `${boostSheet.eventTitle} peut être mis en avant dès maintenant. Choisissez une durée puis continuez vers Stripe.`
                      : 'Choisissez une durée puis continuez vers Stripe pour activer le boost.'}
                  </Text>
                </View>
                <TouchableOpacity onPress={closeBoostSheet} style={styles.sheetClose}>
                  <Ionicons name="close" size={18} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              <View style={styles.sheetGrid}>
                {BOOST_OPTIONS.map((option) => {
                  const active = String(option.days) === String(selectedBoostDays);
                  return (
                    <TouchableOpacity
                      key={`boost-${option.days}`}
                      style={[styles.sheetOption, active && styles.sheetOptionActive]}
                      onPress={() => setSelectedBoostDays(String(option.days))}
                      activeOpacity={0.88}
                    >
                      <Text style={[styles.sheetOptionDays, active && styles.sheetOptionDaysActive]}>
                        {option.days} jour{option.days > 1 ? 's' : ''}
                      </Text>
                      <Text style={[styles.sheetOptionPrice, active && styles.sheetOptionPriceActive]}>
                        {option.price}€
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.sheetActions}>
                <TouchableOpacity style={styles.sheetLaterBtn} onPress={closeBoostSheet} activeOpacity={0.88}>
                  <Text style={styles.sheetLaterText}>Plus tard</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetPayBtnWrap} onPress={handleBoostPayment} activeOpacity={0.9}>
                  <LinearGradient colors={COLORS.gradient} style={styles.sheetPayBtn}>
                    <Text style={styles.sheetPayText}>Payer le boost</Text>
                    <Ionicons name="arrow-forward" size={16} color="#0A0A0F" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.md,
  },
  headerTitle: { color: COLORS.white, fontSize: FONTS.sizes.xl, fontFamily: FONTS.bold },
  headerSub: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, marginTop: 2 },
  addBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  addBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  addBtnText: { color: '#0A0A0F', fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold },

  filtersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: 'rgba(201,169,97,0.14)',
    borderColor: 'rgba(201,169,97,0.34)',
  },
  filterChipText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium },
  filterChipTextActive: { color: COLORS.primary, fontFamily: FONTS.semiBold },

  list: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, gap: SPACING.md },

  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  cardImage: { height: 160, position: 'relative', backgroundColor: COLORS.bgCard2 },
  cardOverlay: { ...StyleSheet.absoluteFillObject },

  statusBadge: {
    position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },

  premiumBadge: {
    position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 4,
  },
  premiumText: { color: '#0A0A0F', fontSize: FONTS.sizes.xs, fontFamily: FONTS.bold },

  cardBody: { padding: SPACING.md },
  cardTitle: { color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: FONTS.bold, marginBottom: SPACING.sm, lineHeight: 24 },

  infoGrid: { gap: 6, marginBottom: SPACING.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, flex: 1 },

  tagsRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md, flexWrap: 'wrap' },
  tag: {
    backgroundColor: 'rgba(201,169,97,0.08)', borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, paddingVertical: 4,
  },
  tagText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontFamily: FONTS.medium },

  actions: { flexDirection: 'row', gap: 8 },
  actionPrimary: {
    flex: 1, backgroundColor: 'rgba(201,169,97,0.12)', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(201,169,97,0.3)', paddingVertical: 10, alignItems: 'center',
  },
  actionPrimaryText: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  actionSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.bgCard2, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.border, paddingVertical: 10, paddingHorizontal: 12,
  },
  actionSecondaryText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium },
  actionBoosted: { backgroundColor: 'rgba(201,169,97,0.1)', borderColor: 'rgba(201,169,97,0.4)' },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: SPACING.xl },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(201,169,97,0.08)',
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg,
  },
  emptyTitle: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold, marginBottom: SPACING.sm },
  emptySub: { color: COLORS.textSecondary, fontSize: FONTS.sizes.base, fontFamily: FONTS.regular, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  emptyBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  emptyBtnGrad: { paddingHorizontal: 28, paddingVertical: 14 },
  emptyBtnText: { color: '#0A0A0F', fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetBackdrop: { flex: 1 },
  sheetCard: {
    backgroundColor: '#131318',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.16)',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.lg,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 54,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  sheetHeaderCopy: { flex: 1 },
  sheetTitle: { color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: FONTS.bold, marginBottom: 8, lineHeight: 24 },
  sheetText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, lineHeight: 21 },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sheetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sheetOption: {
    width: '47%',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: SPACING.md,
    gap: 6,
  },
  sheetOptionActive: {
    borderColor: 'rgba(201,169,97,0.42)',
    backgroundColor: 'rgba(201,169,97,0.14)',
  },
  sheetOptionDays: { color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  sheetOptionDaysActive: { color: COLORS.primary },
  sheetOptionPrice: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  sheetOptionPriceActive: { color: COLORS.primary },
  sheetActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  sheetLaterBtn: {
    paddingHorizontal: 18,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetLaterText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  sheetPayBtnWrap: { flex: 1, borderRadius: RADIUS.full, overflow: 'hidden' },
  sheetPayBtn: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  sheetPayText: { color: '#0A0A0F', fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold },
});
