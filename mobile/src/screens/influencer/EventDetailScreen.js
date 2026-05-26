import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  StatusBar, Alert, Share, ActivityIndicator, Dimensions, Animated,
  Modal, Linking, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { eventsAPI, applicationsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const { width: W, height: H } = Dimensions.get('window');
const HERO_H = Math.min(H * 0.58, 500);
const PLACEHOLDER = 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80';

// ─── Helper : durée entre deux heures ─────────────────────────────────────────

function getTimeDiff(start, end) {
  if (!start || !end) return null;
  try {
    const parse = (t) => {
      const pm = /pm/i.test(t);
      const [h, m] = t.replace(/[ap]m/i, '').trim().split(':').map(Number);
      return (pm && h !== 12 ? h + 12 : (!pm && h === 12 ? 0 : h)) * 60 + (m || 0);
    };
    let diff = parse(end) - parse(start);
    if (diff <= 0) diff += 24 * 60;
    const hrs = Math.floor(diff / 60);
    const min = diff % 60;
    return min > 0 ? `${hrs}h${min}` : `${hrs} hrs`;
  } catch { return null; }
}

// ─── Ouvrir Maps (Apple Maps sur iOS, Google Maps fallback) ──────────────────

function openMaps(address) {
  const encoded = encodeURIComponent(address);
  const iosUrl = `maps://?q=${encoded}`;
  const googleUrl = `https://maps.google.com/maps?q=${encoded}`;
  if (Platform.OS === 'ios') {
    Linking.canOpenURL(iosUrl)
      .then(ok => Linking.openURL(ok ? iosUrl : googleUrl))
      .catch(() => Linking.openURL(googleUrl));
  } else {
    Linking.openURL(googleUrl);
  }
}

// ─── Ouvrir un compte social (Instagram par défaut) ───────────────────────────

function openSocialAccount(account) {
  const handle = account.startsWith('@') ? account.slice(1) : account;
  const appUrl = `instagram://user?username=${handle}`;
  const webUrl = `https://www.instagram.com/${handle}/`;
  Linking.canOpenURL(appUrl)
    .then(ok => Linking.openURL(ok ? appUrl : webUrl))
    .catch(() => Linking.openURL(webUrl));
}

// ─── Section collapsible ──────────────────────────────────────────────────────

function CollapsibleSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const rot = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = () => {
    Animated.timing(rot, { toValue: open ? 0 : 1, duration: 200, useNativeDriver: true }).start();
    setOpen(v => !v);
  };

  const rotation = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={S.collapsible}>
      <TouchableOpacity onPress={toggle} style={S.collapsibleHeader} activeOpacity={0.7}>
        <Text style={S.collapsibleTitle}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons name="chevron-up" size={18} color="#555" />
        </Animated.View>
      </TouchableOpacity>
      {open && <View style={S.collapsibleBody}>{children}</View>}
    </View>
  );
}

// ─── Ligne d'info avec icône ronde ─────────────────────────────────────────────

function InfoRow({ icon, label, value, iconColor = '#c084fc' }) {
  if (!value) return null;
  return (
    <View style={S.infoRow}>
      <View style={S.infoCircle}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={S.infoLabel}>{label}</Text>
        <Text style={S.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Check item (coche verte) ─────────────────────────────────────────────────

function CheckItem({ text, showInfo = false }) {
  return (
    <View style={S.checkItem}>
      <Ionicons name="checkmark" size={16} color="#22c55e" style={{ marginTop: 2, flexShrink: 0 }} />
      <Text style={S.checkText}>{text}</Text>
      {showInfo && (
        <Ionicons name="information-circle-outline" size={16} color="#3a3848" style={{ flexShrink: 0 }} />
      )}
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function EventDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const eventParam = route.params?.event;

  const [event, setEvent] = useState(eventParam);
  const [loading, setLoading] = useState(!eventParam);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (eventParam?._id) {
      loadEvent(eventParam._id);
      checkIfApplied(eventParam._id);
    }
  }, [eventParam?._id]);

  const loadEvent = async (id) => {
    try {
      const data = await eventsAPI.get(id);
      setEvent(data.event);
    } catch (err) {
      console.log('EventDetail error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkIfApplied = async (id) => {
    try {
      const data = await applicationsAPI.myApplications();
      const hasApplied = data.applications?.some(a => a.event?._id === id);
      if (hasApplied) setApplied(true);
    } catch (err) {
      console.log('checkIfApplied error:', err.message);
    }
  };

  const handleApply = async () => {
    if (applied) return;
    setApplying(true);
    try {
      await applicationsAPI.apply({ eventId: event._id });
      setApplied(true);
      Alert.alert('Demande envoyée !', "L'établissement examinera votre profil.");
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setApplying(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Découvrez "${event?.title}" sur ONLIST !` });
    } catch {}
  };

  if (loading || !event) {
    return (
      <View style={[S.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <ActivityIndicator color={COLORS.primaryLight} size="large" />
      </View>
    );
  }

  const imgUri = event.images?.[0] || PLACEHOLDER;

  const dateObj = event.date ? new Date(event.date) : null;
  const dateFormatted = dateObj
    ? `${dateObj.getDate()} ${dateObj.toLocaleDateString('en-GB', { month: 'short' })}, ${dateObj.getFullYear()}`
    : null;

  const timeDiff = getTimeDiff(event.startTime, event.endTime);
  const timeStr = (event.startTime || event.endTime)
    ? [event.startTime, event.endTime].filter(Boolean).join(' • ') + (timeDiff ? ` • ${timeDiff}` : '')
    : null;

  const organizer = event.creator;
  const organizerName = organizer?.businessName || organizer?.name || 'ONLIST';
  const fullAddress = [event.address || event.venue, event.city, event.country].filter(Boolean).join(', ');

  const headerOpacity = scrollY.interpolate({
    inputRange: [HERO_H - 120, HERO_H - 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header flottant (apparaît au scroll) ── */}
      <Animated.View style={[S.floatingHeader, { top: insets.top, opacity: headerOpacity }]}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={['rgba(10,10,15,0.85)', 'rgba(10,10,15,0.7)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={S.floatingHeaderContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={S.navBtn}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={S.floatingTitle} numberOfLines={1}>{event.title}</Text>
          <TouchableOpacity onPress={handleShare} style={S.navBtn}>
            <Ionicons name="share-outline" size={19} color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        {/* ══════ HERO ══════ */}
        <View style={{ height: HERO_H }}>
          <Image source={{ uri: imgUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />

          {/* Dégradé bas */}
          <LinearGradient
            colors={['transparent', 'rgba(5,5,10,0.5)', 'rgba(5,5,10,0.98)']}
            locations={[0.3, 0.62, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* Dégradé haut (lisibilité boutons nav) */}
          <LinearGradient
            colors={['rgba(0,0,0,0.42)', 'transparent']}
            style={[StyleSheet.absoluteFill, { height: 120 }]}
          />

          {/* Boutons nav */}
          <View style={[S.navRow, { top: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={S.navBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={S.navBtn}>
              <Ionicons name="share-outline" size={19} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Badges + titre + cœur en bas du hero */}
          <View style={[S.heroBottom, { bottom: SPACING.lg }]}>
            {/* Badges */}
            <View style={S.badgesRow}>
              {event.isFull && (
                <View style={S.badgeFull}>
                  <Text style={S.badgeFullTxt}>EVENT IS FULL</Text>
                </View>
              )}
              {event.isLive && (
                <View style={S.badgeLive}>
                  <View style={S.livePulse} />
                  <Text style={S.badgeLiveTxt}>LIVE</Text>
                </View>
              )}
              {event.category && (
                <View style={S.badgeCat}>
                  <Text style={S.badgeCatTxt}>{event.category.toUpperCase()}</Text>
                </View>
              )}
            </View>

            {/* Titre + bouton cœur */}
            <View style={S.titleRow}>
              <Text style={S.heroTitle}>{event.title}</Text>
              <TouchableOpacity onPress={() => setLiked(v => !v)} style={S.heartBtn}>
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={20}
                  color={liked ? '#FF6B8A' : '#fff'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ══════ CONTENU ══════ */}
        <View style={S.content}>

          {/* ── Carte Guests Required (border gradient or) ── */}
          {event.guestsRequired > 0 && (
            <LinearGradient
              colors={['#C9A961', 'rgba(201,169,97,0.25)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={S.guestsBorder}
            >
              <View style={S.guestsInner}>
                <View style={S.guestsTop}>
                  <Ionicons name="people" size={18} color={COLORS.primaryLight} />
                  <Text style={S.guestsTitleTxt}>
                    +{event.guestsRequired} Guests Required
                  </Text>
                </View>
                <Text style={S.guestsDesc}>
                  {'It\'s required to bring '}
                  <Text style={{ color: '#fff', fontFamily: FONTS.semiBold }}>
                    {event.guestsRequired} participant{event.guestsRequired > 1 ? 's' : ''}
                  </Text>
                  {'. Ensure their attendance and submit their reviews in the "To Deliver" section along with your own deliverables.'}
                </Text>
              </View>
            </LinearGradient>
          )}

          {/* ── Organisateur ── */}
          {organizer && (
            <View style={S.organizerRow}>
              <View style={S.organizerAvatar}>
                {organizer.businessLogo ? (
                  <Image
                    source={{ uri: organizer.businessLogo }}
                    style={{ width: 52, height: 52, borderRadius: 26 }}
                  />
                ) : (
                  <Text style={S.organizerInitial}>{organizerName[0]}</Text>
                )}
              </View>
              <View>
                <Text style={S.organizerBy}>Par</Text>
                <Text style={S.organizerName}>{organizerName}</Text>
              </View>
            </View>
          )}

          {/* ── Info rows (icône ronde) ── */}
          <View style={S.infoBlock}>
            {dateFormatted && (
              <InfoRow
                icon="calendar-outline"
                label="Date"
                value={dateFormatted}
                iconColor={COLORS.primaryLight}
              />
            )}
            {timeStr && (
              <InfoRow
                icon="time-outline"
                label="Horaires"
                value={timeStr}
                iconColor={COLORS.primary}
              />
            )}
            {event.dresscode && (
              <InfoRow
                icon="shirt-outline"
                label="Tenue"
                value={event.dresscode}
                iconColor={COLORS.primaryLight}
              />
            )}
            {(event.address || event.venue || event.city) && (
              <InfoRow
                icon="location-outline"
                label="Lieu"
                value={[event.address || event.venue, event.city].filter(Boolean).join(', ')}
                iconColor={COLORS.primary}
              />
            )}
          </View>

          {/* ── Description ── */}
          {event.description && (
            <CollapsibleSection title="Description">
              <Text style={S.bodyText}>{event.description}</Text>
            </CollapsibleSection>
          )}

          {/* ── Règles ── */}
          {event.rules && (
            <CollapsibleSection title="Règles*">
              <View style={{ gap: SPACING.md }}>
                {event.rules.split('\n').filter(Boolean).map((rule, i) => (
                  <CheckItem key={i} text={rule} />
                ))}
              </View>
            </CollapsibleSection>
          )}

          {/* ── Livrables ── */}
          {event.deliverables?.length > 0 && (
            <CollapsibleSection title="Livrables">
              <View style={{ gap: SPACING.md }}>
                {event.deliverables.map((d, i) => (
                  <CheckItem key={i} text={d} showInfo />
                ))}
              </View>
            </CollapsibleSection>
          )}

          {/* ── Offre proposée ── */}
          {event.offerItems?.length > 0 && (
            <CollapsibleSection title="Offre proposée">
              {/* Pills catégories */}
              <View style={S.offerPills}>
                {event.offerItems.map((item, i) => (
                  <View key={i} style={S.offerPill}>
                    <Text style={S.offerPillTxt}>{item}</Text>
                  </View>
                ))}
              </View>
            </CollapsibleSection>
          )}

          {/* ── Comptes à mentionner ── */}
          {event.accountsToMention?.length > 0 && (
            <View style={S.mentionBlock}>
              <Text style={S.mentionLabel}>Comptes à mentionner</Text>
              <View style={S.mentionChips}>
                {event.accountsToMention.map((acc, i) => (
                  <TouchableOpacity
                    key={i}
                    style={S.mentionChip}
                    activeOpacity={0.7}
                    onPress={() => openSocialAccount(acc)}
                  >
                    <Ionicons name="logo-instagram" size={15} color={COLORS.primaryLight} />
                    <Text style={S.mentionTxt}>
                      {acc.startsWith('@') ? acc : `@${acc}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Localisation ── */}
          {fullAddress !== '' && (
            <CollapsibleSection title="Localisation">
              {/* Map placeholder cliquable → ouvre Maps */}
              <TouchableOpacity
                style={S.mapContainer}
                activeOpacity={0.85}
                onPress={() => openMaps(fullAddress)}
              >
                <LinearGradient
                  colors={['#1c1a28', '#15131e']}
                  style={StyleSheet.absoluteFill}
                />
                {/* Lignes de grille (rues) */}
                {[0.25, 0.5, 0.75].map((p) => (
                  <View key={`h${p}`} style={[S.mapLine, { top: `${p * 100}%`, width: '100%' }]} />
                ))}
                {[0.2, 0.4, 0.6, 0.8].map((p) => (
                  <View key={`v${p}`} style={[S.mapLine, { left: `${p * 100}%`, height: '100%', width: 1 }]} />
                ))}
                {/* Pin central */}
                <View style={S.mapPinWrap}>
                  <View style={S.mapPinCircle}>
                    <Ionicons name="location" size={22} color="#fff" />
                  </View>
                </View>
                {/* Label "Ouvrir dans Maps" */}
                <View style={S.mapOpenLabel}>
                  <Ionicons name="map-outline" size={13} color="#aaa" />
                  <Text style={S.mapOpenLabelTxt}>Ouvrir dans Maps</Text>
                </View>
              </TouchableOpacity>
              {/* Adresse + bouton externe */}
              <View style={S.mapFooter}>
                <Text style={S.mapAddressTxt} numberOfLines={2}>{fullAddress}</Text>
                <TouchableOpacity
                  style={S.mapExtBtn}
                  activeOpacity={0.7}
                  onPress={() => openMaps(fullAddress)}
                >
                  <Ionicons name="open-outline" size={15} color={COLORS.primaryLight} />
                </TouchableOpacity>
              </View>
            </CollapsibleSection>
          )}

          {/* ── More Details ── */}
          <CollapsibleSection title="Plus de détails" defaultOpen={false}>
            <View style={{ gap: SPACING.lg }}>
              <InfoRow
                icon="calendar-outline"
                label="Âge"
                value={event.ageRequirement > 0 ? `${event.ageRequirement}+` : 'Tous âges'}
                iconColor={COLORS.primaryLight}
              />
              {event.repeats && event.repeats !== 'none' && (
                <InfoRow
                  icon="refresh-outline"
                  label="Fréquence"
                  value={event.repeats}
                  iconColor={COLORS.primaryLight}
                />
              )}
              {event.minFollowers > 0 && (
                <InfoRow
                  icon="trending-up-outline"
                  label="Min. followers"
                  value={
                    event.minFollowers >= 1000
                      ? `${(event.minFollowers / 1000).toFixed(0)}K+`
                      : `${event.minFollowers}+`
                  }
                  iconColor={COLORS.primaryLight}
                />
              )}
              {event.genderRequirement && event.genderRequirement !== 'any' && (
                <InfoRow
                  icon="people-outline"
                  label="Genre"
                  value={event.genderRequirement}
                  iconColor={COLORS.primaryLight}
                />
              )}
            </View>
          </CollapsibleSection>

        </View>
      </Animated.ScrollView>

      {/* ── Bouton Apply fixe ── */}
      {user?.type === 'influencer' && (
        <View style={[S.applyBar, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={['rgba(10,10,15,0.6)', 'rgba(10,10,15,0.9)']}
            style={StyleSheet.absoluteFill}
          />
          <TouchableOpacity
            onPress={() => setShowPopup(true)}
            disabled={applying || applied || event.isFull}
            activeOpacity={0.85}
            style={{ zIndex: 1 }}
          >
            {applied ? (
              <View style={S.applyApplied}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                <Text style={[S.applyTxt, { color: COLORS.success }]}>Demande envoyée</Text>
              </View>
            ) : event.isFull ? (
              <View style={S.applyDisabled}>
                <Text style={S.applyDisabledTxt}>Événement complet</Text>
              </View>
            ) : (
              <LinearGradient
                colors={COLORS.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={S.applyBtn}
              >
                {applying ? (
                  <ActivityIndicator color={COLORS.bg} size="small" />
                ) : (
                  <>
                    <Text style={S.applyTxt}>Participer</Text>
                    <Ionicons name="arrow-forward" size={18} color={COLORS.bg} />
                  </>
                )}
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── Modal Pop Up de participation ── */}
      <Modal
        visible={showPopup}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPopup(false)}
      >
        <TouchableOpacity
          style={S.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPopup(false)}
        >
          <TouchableOpacity
            style={S.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Grab handle */}
            <View style={S.modalHandle} />

            <Text style={S.modalTitle}>
              Montrer votre intérêt augmente vos chances d'invitation de 80%
            </Text>
            <Text style={S.modalSubtitle}>
              Ce n'est pas encore une invitation
            </Text>

            <View style={S.stepsContainer}>
              {/* Step 1 */}
              <View style={S.stepRow}>
                <View style={S.stepCircle}>
                  <Text style={S.stepCircleTxt}>1</Text>
                </View>
                <Text style={S.stepText}>
                  Il s'agit d'un événement très demandé ; l'établissement va examiner votre profil
                </Text>
              </View>

              {/* Step 2 */}
              <View style={S.stepRow}>
                <View style={S.stepCircle}>
                  <Text style={S.stepCircleTxt}>2</Text>
                </View>
                <Text style={S.stepText}>
                  Si votre profil est sélectionné, votre invitation apparaîtra sous "Mes événements"
                </Text>
              </View>

              {/* Step 3 */}
              <View style={S.stepRow}>
                <View style={S.stepCircle}>
                  <Text style={S.stepCircleTxt}>3</Text>
                </View>
                <Text style={S.stepText}>
                  N'oubliez pas d'accepter et de confirmer votre invitation !
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={S.modalBtn}
              activeOpacity={0.85}
              onPress={async () => {
                setShowPopup(false);
                await handleApply();
              }}
            >
              <Text style={S.modalBtnTxt}>J'ai compris</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05050a' },

  // ── Nav ──────────────────────────────────────────
  navRow: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  // ── Hero bas ──────────────────────────────────────
  heroBottom: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  // Badge "EVENT IS FULL" — saumon solide
  badgeFull: {
    backgroundColor: '#e8594a',
    borderRadius: RADIUS.full,
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  badgeFullTxt: {
    color: '#fff',
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.bold,
    letterSpacing: 0.8,
  },
  // Badge "LIVE" — vert succès
  badgeLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,217,160,0.18)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(16,217,160,0.35)',
  },
  livePulse: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10D9A0',
  },
  badgeLiveTxt: {
    color: '#10D9A0',
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.bold,
    letterSpacing: 0.8,
  },
  // Badge catégorie — fond sombre
  badgeCat: {
    backgroundColor: 'rgba(20,18,28,0.9)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeCatTxt: {
    color: '#e5e7eb',
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.7,
  },
  // Titre + cœur
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  heroTitle: {
    flex: 1,
    color: '#fff',
    fontSize: FONTS.sizes.xxl + 2,
    fontFamily: FONTS.extraBold,
    lineHeight: 38,
  },
  heartBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(201,169,97,0.55)',
    backgroundColor: 'rgba(201,169,97,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    flexShrink: 0,
  },

  // ── Floating header ────────────────────────────────
  floatingHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    height: 56,
    overflow: 'hidden',
  },
  floatingHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    height: 56,
  },
  floatingTitle: {
    flex: 1,
    color: '#fff',
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.semiBold,
  },

  // ── Content ───────────────────────────────────────
  content: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },

  // ── Guests Required ────────────────────────────────
  guestsBorder: {
    padding: 1,
    borderRadius: 20,
  },
  guestsInner: {
    backgroundColor: '#18161f',
    borderRadius: 19,
    padding: 18,
    gap: 12,
  },
  guestsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guestsTitleTxt: {
    color: '#fff',
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.semiBold,
  },
  guestsDesc: {
    color: '#999',
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    lineHeight: 22,
  },

  // ── Organisateur ──────────────────────────────────
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  organizerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  organizerInitial: {
    color: COLORS.primaryLight,
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.bold,
  },
  organizerBy: {
    color: '#555',
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    marginBottom: 2,
  },
  organizerName: {
    color: '#fff',
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.semiBold,
  },

  // ── Info rows ─────────────────────────────────────
  infoBlock: {
    gap: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  infoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1c1a28',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoLabel: {
    color: '#555',
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    marginBottom: 3,
  },
  infoValue: {
    color: '#fff',
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.medium,
  },

  // ── Collapsible sections ──────────────────────────
  collapsible: {
    backgroundColor: '#18161f',
    borderRadius: 18,
    overflow: 'hidden',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 16,
  },
  collapsibleTitle: {
    color: '#fff',
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.semiBold,
  },
  collapsibleBody: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  bodyText: {
    color: '#999',
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    lineHeight: 24,
  },

  // ── Check items ───────────────────────────────────
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  checkText: {
    color: '#aaa',
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    flex: 1,
    lineHeight: 22,
  },

  // ── Offer pills ───────────────────────────────────
  offerPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  offerPill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  offerPillTxt: {
    color: '#fff',
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
  },

  // ── Comptes à mentionner ──────────────────────────
  mentionBlock: {
    gap: SPACING.sm,
  },
  mentionLabel: {
    color: '#fff',
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.semiBold,
  },
  mentionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  mentionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(201,169,97,0.07)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.18)',
  },
  mentionTxt: {
    color: '#ccc',
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
  },

  // ── Location / Map ────────────────────────────────
  mapContainer: {
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.05)',
    height: 1,
  },
  mapPinWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPinCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  mapOpenLabel: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mapOpenLabelTxt: {
    color: '#aaa',
    fontSize: 11,
    fontFamily: FONTS.medium,
  },
  mapFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  mapAddressTxt: {
    color: '#fff',
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    flex: 1,
    lineHeight: 22,
  },
  mapExtBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1e1c2a',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // ── Apply bar ─────────────────────────────────────
  applyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  applyBtn: {
    height: 56,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  applyTxt: {
    color: COLORS.bg,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.semiBold,
  },
  applyApplied: {
    height: 56,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(16,217,160,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,217,160,0.25)',
  },
  applyDisabled: {
    height: 56,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  applyDisabledTxt: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.medium,
  },

  // ── Modal Styles ───────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    alignItems: 'center',
  },
  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#000000',
    fontSize: 22,
    fontFamily: FONTS.bold,
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#8E8E93',
    fontSize: 15,
    fontFamily: FONTS.medium,
    textAlign: 'center',
    marginBottom: 28,
  },
  stepsContainer: {
    width: '100%',
    gap: 20,
    marginBottom: 32,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 8,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#D946EF', // pink-purple
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleTxt: {
    color: '#000000',
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
  stepText: {
    flex: 1,
    color: '#333333',
    fontSize: 14,
    fontFamily: FONTS.medium,
    lineHeight: 20,
  },
  modalBtn: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    backgroundColor: '#4F46E5', // Indigo royal
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnTxt: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
});
