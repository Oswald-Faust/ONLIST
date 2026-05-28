import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, Dimensions, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { eventsAPI, lieuxAPI, applicationsAPI, notificationsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const W = Dimensions.get('window').width;
const CARD_W = (W - SPACING.lg * 2 - SPACING.md) / 2;

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatFollowers(n) {
  if (!n) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return `${n}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

// ─── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }) {
  return (
    <View style={[s.statCard, { width: CARD_W }]}>
      <View style={[s.statIconWrap, { borderColor: `${color}33` }]}>
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── CandidatureCard ───────────────────────────────────────────────────────────
function CandidatureCard({ app, onAccept, onReject, navigation }) {
  const inf = app.user || {};
  const initials = (inf.name || '?').slice(0, 2).toUpperCase();
  const handle = inf.instagram
    ? `@${inf.instagram}`
    : inf.tiktok
    ? `@${inf.tiktok}`
    : null;
  const eventTitle = app.event?.title || '—';

  return (
    <View style={s.appCard}>
      <TouchableOpacity
        style={s.appAvatar}
        onPress={() => inf._id && navigation?.navigate('BusinessInfluencerProfile', { userId: inf._id })}
        activeOpacity={0.85}
      >
        {inf.photos && inf.photos.length > 0 ? (
          <Image source={{ uri: inf.photos[0] }} style={s.appAvatarImg} />
        ) : (
          <LinearGradient colors={COLORS.gradient} style={s.appAvatarGrad}>
            <Text style={s.appAvatarText}>{initials}</Text>
          </LinearGradient>
        )}
      </TouchableOpacity>

      <View style={s.appInfo}>
        <Text style={s.appName} numberOfLines={1}>{inf.name || 'Influenceur'}</Text>
        {handle ? <Text style={s.appHandle} numberOfLines={1}>{handle}</Text> : null}
        <View style={s.appMeta}>
          <Ionicons name="people-outline" size={11} color={COLORS.textMuted} />
          <Text style={s.appMetaText}>{formatFollowers(inf.followersCount)}</Text>
          <Text style={s.appMetaDot}>·</Text>
          <Text style={s.appMetaEvent} numberOfLines={1}>{eventTitle}</Text>
        </View>
      </View>

      <View style={s.appActions}>
        <TouchableOpacity style={s.rejectBtn} onPress={onReject} activeOpacity={0.8}>
          <Ionicons name="close" size={16} color="#EF4444" />
        </TouchableOpacity>
        <TouchableOpacity style={s.acceptBtn} onPress={onAccept} activeOpacity={0.8}>
          <Ionicons name="checkmark" size={16} color={COLORS.success} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── EventCard ─────────────────────────────────────────────────────────────────
function EventCard({ event, onPress }) {
  const hasImage = event.images && event.images.length > 0;
  return (
    <TouchableOpacity style={s.evCard} onPress={onPress} activeOpacity={0.88}>
      <View style={s.evImageWrap}>
        {hasImage ? (
          <Image
            source={{ uri: event.images[0] }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={['rgba(201,169,97,0.22)', 'rgba(201,169,97,0.06)']}
            style={[StyleSheet.absoluteFill, s.evPlaceholder]}
          >
            <Ionicons name="calendar-outline" size={28} color={COLORS.primary} />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(10,10,15,0.88)']}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={s.evBody}>
        <Text style={s.evTitle} numberOfLines={2}>{event.title}</Text>
        <View style={s.evMeta}>
          <Ionicons name="calendar-outline" size={11} color={COLORS.textMuted} />
          <Text style={s.evMetaText}>{formatDate(event.date)}</Text>
        </View>
        {event.city ? (
          <View style={s.evMeta}>
            <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
            <Text style={s.evMetaText}>{event.city}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function BusinessDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState({ pending: 0, activeEvents: 0, accepted: 0, lieux: 0 });
  const [pendingApps, setPendingApps] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [notifRes, appsRes, evRes, lieuRes] = await Promise.allSettled([
        notificationsAPI.unreadCount(),
        applicationsAPI.businessPending({ limit: 5 }),
        eventsAPI.myEvents(),
        lieuxAPI.mine(),
      ]);

      if (notifRes.status === 'fulfilled') {
        setUnreadCount(notifRes.value?.unreadCount || 0);
      }
      if (appsRes.status === 'fulfilled') {
        setPendingApps(appsRes.value?.applications || []);
        setStats(prev => ({ ...prev, pending: appsRes.value?.totalPending || 0 }));
      }
      if (evRes.status === 'fulfilled') {
        const allEvs = evRes.value?.events || [];
        const now = Date.now();
        // Trier : événements à venir en premier (croissant), puis passés (décroissant)
        const sorted = [...allEvs].sort((a, b) => {
          const aT = a.date ? new Date(a.date).getTime() : 0;
          const bT = b.date ? new Date(b.date).getTime() : 0;
          const aFuture = aT >= now;
          const bFuture = bT >= now;
          if (aFuture && !bFuture) return -1;
          if (!aFuture && bFuture) return 1;
          return aFuture ? aT - bT : bT - aT;
        });
        setUpcomingEvents(sorted.slice(0, 6));
        const totalAccepted = allEvs.reduce((acc, e) => acc + (e.acceptedCount || 0), 0);
        // Le compteur affiche TOUS les événements, pas seulement les futurs
        setStats(prev => ({ ...prev, activeEvents: allEvs.length, accepted: totalAccepted }));
      }
      if (lieuRes.status === 'fulfilled') {
        setStats(prev => ({ ...prev, lieux: lieuRes.value?.lieux?.length || 0 }));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(false); }, [fetchData]));

  const handleRespond = async (appId, status) => {
    try {
      await applicationsAPI.respond(appId, status);
      setPendingApps(prev => prev.filter(a => a._id !== appId));
      setStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1) }));
    } catch {
      // silent
    }
  };

  const firstName = (user?.businessName || user?.name || 'vous').split(/[\s,]+/)[0];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(true); }}
            tintColor={COLORS.primaryLight}
          />
        }
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + SPACING.sm, paddingBottom: insets.bottom + 120 },
        ]}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.greetingText}>{getGreeting()}, {firstName}</Text>
            <Text style={s.greetingSubtitle}>Voici votre tableau de bord</Text>
          </View>
          <TouchableOpacity
            style={s.notifBtn}
            onPress={() => navigation.navigate('BusinessNotifications')}
            activeOpacity={0.85}
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
            {unreadCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Stats grid 2×2 ── */}
        <View style={s.statsGrid}>
          <StatCard icon="time-outline"           label="En attente"  value={stats.pending}      color="#F59E0B" />
          <StatCard icon="calendar-outline"        label="Événements"  value={stats.activeEvents} color={COLORS.primaryLight}  />
          <StatCard icon="checkmark-circle-outline" label="Acceptés"   value={stats.accepted}     color={COLORS.success} />
          <StatCard icon="business-outline"        label="Lieux"       value={stats.lieux}        color="#A78BFA" />
        </View>

        {/* ── Quick Actions ── */}
        <View style={s.actionsRow}>
          <TouchableOpacity
            style={s.actionPrimary}
            onPress={() => navigation.navigate('CreateEvent')}
            activeOpacity={0.88}
          >
            <LinearGradient colors={COLORS.gradient} style={s.actionPrimaryGrad}>
              <Ionicons name="add-circle-outline" size={18} color="#0A0A0F" />
              <Text style={s.actionPrimaryText}>Créer un événement</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.actionSecondary}
            onPress={() => navigation.navigate('CreateLieu')}
            activeOpacity={0.88}
          >
            <Ionicons name="add-outline" size={18} color={COLORS.primaryLight} />
            <Text style={s.actionSecondaryText}>Nouveau lieu</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.loader}><ActivityIndicator color={COLORS.primaryLight} /></View>
        ) : (
          <>
            {/* ── Candidatures en attente ── */}
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Candidatures en attente</Text>
              {stats.pending > 0 && (
                <View style={s.pendingBadge}>
                  <Text style={s.pendingBadgeText}>{stats.pending}</Text>
                </View>
              )}
            </View>

            {pendingApps.length === 0 ? (
              <View style={s.emptyCard}>
                <View style={s.emptyIconWrap}>
                  <Ionicons name="people-outline" size={24} color={COLORS.textMuted} />
                </View>
                <Text style={s.emptyText}>Aucune candidature en attente</Text>
              </View>
            ) : (
              <View style={s.listWrap}>
                {pendingApps.map(app => (
                  <CandidatureCard
                    key={app._id}
                    app={app}
                    onAccept={() => handleRespond(app._id, 'accepted')}
                    onReject={() => handleRespond(app._id, 'rejected')}
                    navigation={navigation}
                  />
                ))}
                {stats.pending > pendingApps.length && (
                  <TouchableOpacity style={s.seeAllBtn} onPress={() => navigation.navigate('Events')}>
                    <Text style={s.seeAllBtnText}>
                      Voir {stats.pending - pendingApps.length} autres candidatures →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ── Événements ── */}
            <View style={[s.sectionRow, { marginTop: SPACING.xl }]}>
              <Text style={s.sectionTitle}>Mes événements</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Events')}>
                <Text style={s.seeAllLink}>Tout voir</Text>
              </TouchableOpacity>
            </View>

            {upcomingEvents.length === 0 ? (
              <View style={s.emptyCard}>
                <View style={s.emptyIconWrap}>
                  <Ionicons name="calendar-outline" size={24} color={COLORS.textMuted} />
                </View>
                <Text style={s.emptyText}>Aucun événement créé</Text>
                <TouchableOpacity
                  style={s.createEventBtn}
                  onPress={() => navigation.navigate('CreateEvent')}
                >
                  <LinearGradient colors={COLORS.gradient} style={s.createEventBtnGrad}>
                    <Text style={s.createEventBtnText}>Créer votre premier événement</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.eventsRow}
              >
                {upcomingEvents.map(ev => (
                  <EventCard
                    key={ev._id}
                    event={ev}
                    onPress={() => navigation.navigate('BusinessEventDetail', { eventId: ev._id })}
                  />
                ))}
              </ScrollView>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: SPACING.lg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: SPACING.xl,
  },
  headerLeft: { flex: 1, gap: 2 },
  greetingText: { color: COLORS.white, fontSize: FONTS.sizes.xl, fontFamily: FONTS.bold },
  greetingSubtitle: {
    color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular,
  },
  notifBtn: {
    width: 48, height: 48, borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -2, right: -2,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2, borderColor: COLORS.bg,
  },
  badgeText: { color: '#fff', fontSize: 9, fontFamily: FONTS.bold },

  // Stats grid
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, gap: 6,
  },
  statIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: FONTS.sizes.xxl, fontFamily: FONTS.bold },
  statLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },

  // Quick Actions
  actionsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xl },
  actionPrimary: { flex: 2, borderRadius: RADIUS.lg, overflow: 'hidden' },
  actionPrimaryGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: 12, gap: 7,
  },
  actionPrimaryText: { color: '#0A0A0F', fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold },
  actionSecondary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard, paddingVertical: 14,
  },
  actionSecondaryText: {
    color: COLORS.primaryLight, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold,
  },

  // Section headers
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.md,
  },
  sectionTitle: { flex: 1, color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: FONTS.bold },
  pendingBadge: {
    backgroundColor: 'rgba(245,158,11,0.14)', borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    paddingHorizontal: 10, paddingVertical: 3,
  },
  pendingBadgeText: { color: '#F59E0B', fontSize: FONTS.sizes.xs, fontFamily: FONTS.bold },
  seeAllLink: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium },

  // Application cards
  listWrap: { gap: SPACING.md, marginBottom: SPACING.sm },
  appCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md,
  },
  appAvatar: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden' },
  appAvatarImg: { width: '100%', height: '100%' },
  appAvatarGrad: {
    width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center',
  },
  appAvatarText: { color: '#0A0A0F', fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  appInfo: { flex: 1, gap: 2 },
  appName: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.semiBold },
  appHandle: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  appMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  appMetaText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  appMetaDot: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
  appMetaEvent: {
    color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, flex: 1,
  },
  appActions: { flexDirection: 'row', gap: 8 },
  rejectBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  acceptBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(16,217,160,0.1)', borderWidth: 1, borderColor: 'rgba(16,217,160,0.28)',
    alignItems: 'center', justifyContent: 'center',
  },

  // See all
  seeAllBtn: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 14, alignItems: 'center',
  },
  seeAllBtnText: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium },

  // Event cards (horizontal)
  eventsRow: { gap: SPACING.md, paddingRight: SPACING.sm },
  evCard: {
    width: 160, borderRadius: RADIUS.xl, overflow: 'hidden',
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
  },
  evImageWrap: { height: 110 },
  evPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  evBody: { padding: 12, gap: 4 },
  evTitle: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  evMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  evMetaText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },

  // Loader & empty
  loader: { height: 120, alignItems: 'center', justifyContent: 'center' },
  emptyCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.xl, paddingHorizontal: SPACING.lg,
    gap: SPACING.sm, marginBottom: SPACING.sm,
  },
  emptyIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular,
  },
  createEventBtn: { marginTop: SPACING.xs, borderRadius: RADIUS.lg, overflow: 'hidden' },
  createEventBtnGrad: { paddingVertical: 12, paddingHorizontal: 20 },
  createEventBtnText: { color: '#0A0A0F', fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold },
});
