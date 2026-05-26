import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, RefreshControl,
  StatusBar, ScrollView, Image, ActivityIndicator,
  ImageBackground, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { eventsAPI, notificationsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import CityPickerSheet from './CityPickerScreen';

const { width: W, height: H } = Dimensions.get('window');
const SLIDER_H = Math.min(H * 0.62, 520);

// ─── Filtres ───────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'all',       label: 'Tous',       icon: 'grid-outline' },
  { key: 'club',      label: 'Club',       icon: 'musical-notes-outline' },
  { key: 'restaurant',label: 'Restaurant', icon: 'restaurant-outline' },
  { key: 'bar',       label: 'Bar',        icon: 'wine-outline' },
  { key: 'spa',       label: 'Spa',        icon: 'leaf-outline' },
  { key: 'premium',   label: 'VIP',        icon: 'diamond-outline' },
  { key: 'sport',     label: 'Sport',      icon: 'fitness-outline' },
  { key: 'wellness',  label: 'Bien-être',  icon: 'flower-outline' },
];

// ─── EventCard pleine largeur ──────────────────────────────────────────────────

function EventCard({ event, onPress }) {
  const dateStr = event?.date
    ? new Date(event.date).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <TouchableOpacity style={ec.card} onPress={onPress} activeOpacity={0.88}>
      <View style={ec.imageWrap}>
        {(event?.images?.[0] || event?.coverImage) ? (
          <Image source={{ uri: event.images?.[0] || event.coverImage }} style={ec.image} />
        ) : (
          <LinearGradient
            colors={['rgba(201,169,97,0.1)', 'rgba(10,10,15,0.95)']}
            style={ec.imagePlaceholder}
          >
            <Ionicons name="calendar" size={30} color={COLORS.primary} />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(10,10,15,0.65)']}
          style={ec.imageGrad}
        />
        {event?.type && (
          <View style={ec.badge}>
            <Text style={ec.badgeTxt}>{event.type}</Text>
          </View>
        )}
        <TouchableOpacity style={ec.heartBtn}>
          <Ionicons name="heart-outline" size={15} color={COLORS.white} />
        </TouchableOpacity>
      </View>
      <View style={ec.info}>
        <Text style={ec.title} numberOfLines={1}>{event?.title || 'Événement'}</Text>
        {event?.venue && (
          <Text style={ec.venue} numberOfLines={1}>{event.venue}</Text>
        )}
        <View style={ec.chips}>
          {event?.city && (
            <View style={ec.chip}>
              <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
              <Text style={ec.chipTxt}>{event.city}</Text>
            </View>
          )}
          {dateStr && (
            <View style={ec.chip}>
              <Ionicons name="time-outline" size={11} color={COLORS.textMuted} />
              <Text style={ec.chipTxt}>{dateStr}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Écran principal ───────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const sliderRef = useRef(null);

  const [events, setEvents]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeSlide, setActiveSlide]   = useState(0);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [selectedCity, setSelectedCity] = useState(user?.selectedCity || '');
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const city      = selectedCity;
  const firstName = user?.name?.split(' ')[0] || 'toi';

  useEffect(() => {
    setSelectedCity(user?.selectedCity || '');
  }, [user?.selectedCity]);

  const fetchUnreadNotifications = useCallback(async () => {
    try {
      const data = await notificationsAPI.unreadCount();
      setUnreadNotifications(data?.unreadCount || 0);
    } catch (error) {
      console.log('Notifications badge error:', error.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadNotifications();
    }, [fetchUnreadNotifications])
  );

  // Ouvre le picker si pas de ville
  useEffect(() => { if (!city) setShowCityPicker(true); }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    try {
      const params = { limit: 30 };
      if (city) params.city = city;
      const data = await eventsAPI.list(params);
      setEvents(data.events || []);
    } catch (err) {
      console.log('Events error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [city]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  const onRefresh = () => { setRefreshing(true); fetchEvents(); };

  // ── Données slider ─────────────────────────────────────────────────────────
  const featured     = events.slice(0, 5);
  const currentEvent = featured[activeSlide] ?? featured[0];

  const displayedEvents = activeFilter === 'all'
    ? events
    : events.filter(e => e.category === activeFilter);

  // ── Auto-scroll du slider ──────────────────────────────────────────────────
  useEffect(() => {
    if (featured.length <= 1) return;
    const interval = setInterval(() => {
      const nextSlide = (activeSlide + 1) % featured.length;
      setActiveSlide(nextSlide);
      sliderRef.current?.scrollTo({ x: nextSlide * W, animated: true });
    }, 4000);
    return () => clearInterval(interval);
  }, [activeSlide, featured.length]);

  const onSlideScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    if (idx >= 0 && idx < featured.length && idx !== activeSlide) {
      setActiveSlide(idx);
    }
  };

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : null;
  const fmtTime = (d) => d
    ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null;

  // ── Loader ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primaryLight} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primaryLight}
          />
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      >

        {/* ════════════════════════════════════════════════
            ZONE SLIDER — background image + header + card
        ════════════════════════════════════════════════ */}
        <View style={styles.sliderZone}>

          {/* ── Slides (fond qui scrolle) ── */}
          {featured.length > 0 ? (
            <ScrollView
              ref={sliderRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onSlideScroll}
              scrollEventThrottle={16}
              style={StyleSheet.absoluteFill}
              scrollEnabled={featured.length > 1}
              decelerationRate="fast"
            >
              {featured.map((ev, i) => (
                <TouchableOpacity
                  key={ev._id || i}
                  style={{ width: W, height: SLIDER_H }}
                  activeOpacity={0.95}
                  onPress={() => navigation.navigate('EventDetail', { event: ev })}
                >
                  {(ev.images?.[0] || ev.coverImage) ? (
                    <ImageBackground
                      source={{ uri: ev.images?.[0] || ev.coverImage }}
                      style={StyleSheet.absoluteFill}
                      imageStyle={{ opacity: 0.7 }}
                    />
                  ) : (
                    <LinearGradient
                      colors={['#1E1810', '#110F0C', COLORS.bg]}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  {/* Dégradé de couverture */}
                  <LinearGradient
                    colors={[
                      'rgba(10,10,15,0.28)',
                      'transparent',
                      'rgba(10,10,15,0.7)',
                      COLORS.bg,
                    ]}
                    locations={[0, 0.3, 0.72, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            /* Fond vide si aucun événement */
            <LinearGradient
              colors={['#1E1810', '#110F0C', COLORS.bg]}
              style={StyleSheet.absoluteFill}
            />
          )}

          {/* ── Header flottant ── */}
          <View style={[styles.heroHeader, { paddingTop: insets.top + 10 }]}>
            {/* Avatar */}
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.85}
            >
              {user?.photos?.[0] ? (
                <Image source={{ uri: user.photos[0] }} style={styles.avatarImg} />
              ) : (
                <Ionicons name="person" size={19} color={COLORS.textSecondary} />
              )}
            </TouchableOpacity>

            {/* Greeting */}
            <View style={styles.greetingWrap}>
              <Text style={styles.welcomeBack}>Welcome back</Text>
              <Text style={styles.hiName}>Hi, {firstName}</Text>
            </View>

            {/* Actions droite */}
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.cityBtn}
                onPress={() => setShowCityPicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="location-outline" size={12} color={COLORS.primaryLight} />
                <Text style={styles.cityBtnTxt} numberOfLines={1}>{city || 'Ville'}</Text>
                <Ionicons name="chevron-down" size={11} color={COLORS.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => navigation.navigate('Search')}
              >
                <Ionicons name="search" size={16} color={COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => navigation.navigate('Notifications')}
              >
                <Ionicons name="notifications-outline" size={16} color={COLORS.white} />
                {unreadNotifications > 0 && (
                  <View style={styles.notifDot}>
                    <Text style={styles.notifDotText}>
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Barres de progression ── */}
          {featured.length > 1 && (
            <View style={[styles.progressRow, { top: insets.top + 10 + 72 }]}>
              {featured.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressBar,
                    { opacity: i === activeSlide ? 1 : 0.3 },
                    i === activeSlide && styles.progressBarActive,
                  ]}
                />
              ))}
            </View>
          )}

          {/* ── Card info événement (glassmorphisme) ── */}
          {currentEvent && (
            <TouchableOpacity
              style={styles.eventInfoWrap}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('EventDetail', { event: currentEvent })}
            >
              <BlurView intensity={60} tint="dark" style={styles.eventInfoBlur}>
                {/* Shimmer top highlight */}
                <LinearGradient
                  colors={['rgba(255,255,255,0.12)', 'transparent']}
                  style={styles.infoCardHighlight}
                />

                <View style={styles.eventInfoContent}>
                  <View style={styles.eventInfoHeader}>
                    {/* Date pill */}
                    {currentEvent.date && (
                      <View style={styles.datePill}>
                        <Text style={styles.datePillTxt}>{fmtDate(currentEvent.date)}</Text>
                      </View>
                    )}
                    {/* Arrow CTA */}
                    <View style={styles.arrowBtn}>
                      <Ionicons name="arrow-up-forward" size={15} color={COLORS.white} />
                    </View>
                  </View>

                  <Text style={styles.eventInfoTitle} numberOfLines={1}>
                    {currentEvent.title}
                  </Text>

                  {currentEvent.date && (
                    <View style={styles.eventInfoRow}>
                      <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.5)" />
                      <Text style={styles.eventInfoTxt}>{fmtTime(currentEvent.date)}</Text>
                    </View>
                  )}

                  {(currentEvent.address || currentEvent.venue) && (
                    <View style={styles.eventInfoRow}>
                      <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.5)" />
                      <Text style={styles.eventInfoTxt} numberOfLines={1}>
                        {currentEvent.address || currentEvent.venue}
                      </Text>
                    </View>
                  )}
                </View>
              </BlurView>
            </TouchableOpacity>
          )}
        </View>

        {/* ════════════════════════════════════════════════
            FILTRES PAR TYPE
        ════════════════════════════════════════════════ */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          >
            {FILTERS.map(f => {
              const active = activeFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setActiveFilter(f.key)}
                  activeOpacity={0.75}
                >
                  {active ? (
                    <LinearGradient
                      colors={COLORS.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.filterChipActive}
                    >
                      <Ionicons name={f.icon} size={13} color={COLORS.bg} />
                      <Text style={styles.filterTxtActive}>{f.label}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.filterChip}>
                      <Ionicons name={f.icon} size={13} color={COLORS.textMuted} />
                      <Text style={styles.filterTxt}>{f.label}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ════════════════════════════════════════════════
            LISTE ÉVÉNEMENTS
        ════════════════════════════════════════════════ */}
        <View style={styles.eventsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {city ? `Événements · ${city}` : 'Événements'}
            </Text>
            {displayedEvents.length > 0 && (
              <Text style={styles.countTxt}>{displayedEvents.length} résultats</Text>
            )}
          </View>

          {displayedEvents.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="calendar-outline" size={30} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Aucun événement</Text>
              <Text style={styles.emptyText}>
                {city
                  ? `Pas d'événements à ${city} pour ce filtre.`
                  : 'Choisis une ville pour voir les événements.'}
              </Text>
              {!city && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => setShowCityPicker(true)}
                >
                  <Text style={styles.emptyBtnTxt}>Choisir ma ville</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.listWrap}>
              {displayedEvents.map(e => (
                <EventCard
                  key={e._id}
                  event={e}
                  onPress={() => navigation.navigate('EventDetail', { event: e })}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Bottom Sheet sélection ville ── */}
      <CityPickerSheet
        visible={showCityPicker}
        onClose={() => setShowCityPicker(false)}
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
        onResetCity={() => setSelectedCity('')}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // ── Slider zone ──────────────────────────────────────────────────────────
  sliderZone: {
    height: SLIDER_H,
    backgroundColor: '#0E0C09',
    overflow: 'hidden',
  },

  // Header flottant
  heroHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    zIndex: 10,
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(18,17,14,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  greetingWrap: { flex: 1, paddingLeft: 2 },
  welcomeBack: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
  },
  hiName: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.bold,
    lineHeight: 26,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(18,17,14,0.72)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.22)',
    minWidth: 96,
    maxWidth: 132,
  },
  cityBtnTxt: {
    color: COLORS.white,
    fontSize: 11,
    fontFamily: FONTS.medium,
    flex: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(18,17,14,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: 'rgba(18,17,14,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifDotText: {
    color: COLORS.bg,
    fontSize: 10,
    fontFamily: FONTS.bold,
    lineHeight: 12,
  },

  // Barres de progression
  progressRow: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    gap: 5,
    zIndex: 10,
  },
  progressBar: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  progressBarActive: {
    backgroundColor: COLORS.primaryLight,
  },

  // Card glassmorphisme
  eventInfoWrap: {
    position: 'absolute',
    bottom: SPACING.md,
    left: SPACING.lg,
    right: SPACING.lg,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  eventInfoBlur: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  infoCardHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
  },
  eventInfoContent: { padding: SPACING.md },
  eventInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  datePill: {
    backgroundColor: 'rgba(201,169,97,0.22)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.3)',
  },
  datePillTxt: {
    color: COLORS.primaryLight,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.semiBold,
  },
  arrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfoTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.semiBold,
    marginBottom: 4,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  eventInfoTxt: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    flex: 1,
  },

  // ── Filtres ──────────────────────────────────────────────────────────────
  filterSection: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  filtersContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterTxt: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium },
  filterTxtActive: { color: COLORS.bg, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },

  // ── Événements ───────────────────────────────────────────────────────────
  eventsSection: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: { color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: FONTS.bold },
  countTxt: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  listWrap: { gap: SPACING.md },

  // Empty
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.md },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { color: COLORS.textPrimary, fontSize: FONTS.sizes.md, fontFamily: FONTS.semiBold },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyBtnTxt: { color: COLORS.primary, fontSize: FONTS.sizes.base, fontFamily: FONTS.semiBold },
});

// ─── Styles EventCard ──────────────────────────────────────────────────────────

const ec = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  imageWrap: { height: 190, backgroundColor: COLORS.bgCard2, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageGrad: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 70,
  },
  badge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeTxt: { color: COLORS.bg, fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },
  heartBtn: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(10,10,15,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { padding: SPACING.md, gap: 4 },
  title: { color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: FONTS.semiBold },
  venue: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginTop: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipTxt: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
});
