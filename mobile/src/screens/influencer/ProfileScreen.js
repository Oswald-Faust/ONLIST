import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Image, Alert, Share, Dimensions, Modal, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { applicationsAPI, usersAPI } from '../../services/api';

const { width: W, height: SCREEN_H } = Dimensions.get('window');
const PHOTO_H = Math.round(SCREEN_H * 0.66);
const PLACEHOLDER = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800';

const buildMoreItems = ({ navigation, logout, share, close }) => [
  {
    icon: 'settings-outline',
    label: 'Paramètres',
    onPress: () => { close(); navigation.navigate('Settings'); },
  },
  { icon: 'help-circle-outline', label: 'Aide', onPress: close },
  {
    icon: 'chatbubble-ellipses-outline',
    label: 'Partager votre avis',
    onPress: () => { close(); share(); },
  },
  { icon: 'information-circle-outline', label: "À propos d'ONLIST", onPress: close },
  {
    icon: 'log-out-outline',
    label: 'Déconnexion',
    isRed: true,
    onPress: () => { close(); logout(); },
  },
];

// ─── Dimensions pour l'arc de score ──────────────────────────────────────────
const SCORE_DIMS = [
  { key: 'punctuality', label: 'Ponctualité', icon: 'time-outline',   color: '#818CF8' },
  { key: 'style',       label: 'Présentation', icon: 'shirt-outline',  color: '#C084FC' },
  { key: 'attitude',    label: 'Jovialité',   icon: 'happy-outline',  color: '#F472B6' },
  { key: 'content',     label: 'Contenu',     icon: 'camera-outline', color: '#34D399' },
];

function ScoreMiniBar({ value }) {
  const pct = Math.min(Math.max((value || 0) / 10, 0), 1);
  return (
    <View style={HS.barTrack}>
      <LinearGradient
        colors={['#C084FC', '#D4AF77']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[HS.barFill, { width: `${pct * 100}%` }]}
      />
    </View>
  );
}

function HealthScoreSection({ scoreData, reviewsCount }) {
  const score = scoreData?.score || 0;
  const details = scoreData?.scoreDetails || {};
  const hasScore = score > 0;

  return (
    <View style={HS.wrap}>
      {/* En-tête */}
      <View style={S.sectionHead}>
        <Text style={S.sectionTitle}>Health Score</Text>
        {reviewsCount > 0 && (
          <Text style={S.seeAll}>{reviewsCount} avis</Text>
        )}
      </View>

      {/* Cercle central + sous-scores */}
      <View style={HS.card}>
        {/* Score global */}
        <View style={HS.circleRow}>
          <View style={HS.circleShell}>
            <LinearGradient
              colors={hasScore ? ['rgba(212,175,119,0.35)', 'rgba(192,132,252,0.2)'] : ['rgba(42,42,58,0.95)', 'rgba(30,30,46,0.92)']}
              style={HS.circleGlow}
            />
            <LinearGradient
              colors={hasScore ? ['#C084FC', '#D4AF77'] : ['#2a2a3a', '#1e1e2e']}
              style={HS.circle}
            >
              <Text style={HS.circleNum}>{hasScore ? score.toFixed(1) : '—'}</Text>
              <Text style={HS.circleSub}>/10</Text>
            </LinearGradient>
          </View>
          <View style={HS.circleRight}>
            <Text style={HS.eyebrow}>Profil créateur</Text>
            <Text style={HS.overallLabel}>Score global</Text>
            <Text style={HS.overallSub}>
              {hasScore
                ? score >= 8 ? 'Excellent niveau, profil très rassurant pour les établissements.' : score >= 6 ? 'Bon niveau, la fiabilité générale est solide.' : 'Base correcte, encore quelques points à renforcer.'
                : 'Participez à des événements\npour obtenir vos premières notes'}
            </Text>
            <View style={HS.overallMetaRow}>
              <View style={HS.overallMetaPill}>
                <Ionicons name="sparkles-outline" size={13} color={COLORS.primaryLight} />
                <Text style={HS.overallMetaText}>
                  {reviewsCount > 0 ? `${reviewsCount} retour${reviewsCount > 1 ? 's' : ''}` : 'Pas encore noté'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Séparateur */}
        <View style={HS.divider} />

        {/* Sous-dimensions */}
        <View style={HS.dimsGrid}>
          {SCORE_DIMS.map(dim => {
            const val = details[dim.key] || 0;
            return (
              <View key={dim.key} style={HS.dimCard}>
                <View style={HS.dimTopRow}>
                  <View style={[HS.dimIconWrap, { backgroundColor: `${dim.color}18` }]}>
                    <Ionicons name={dim.icon} size={16} color={dim.color} />
                  </View>
                  <Text style={[HS.dimScore, { color: dim.color }]}>
                    {val > 0 ? val.toFixed(1) : '—'}
                  </Text>
                </View>
                <Text style={HS.dimLabel}>{dim.label}</Text>
                <ScoreMiniBar value={val} />
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ─── Styles Health Score ──────────────────────────────────────────────────────
const HS = StyleSheet.create({
  wrap: { marginBottom: SPACING.lg },

  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },

  // Cercle + texte
  circleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  circleShell: {
    position: 'relative',
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleGlow: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    opacity: 0.55,
  },
  circle: {
    width: 82, height: 82, borderRadius: 41,
    alignItems: 'center', justifyContent: 'center',
    gap: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  circleNum: {
    color: '#fff',
    fontSize: 28,
    fontFamily: FONTS.extraBold,
    lineHeight: 32,
  },
  circleSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.medium,
  },
  circleRight: { flex: 1, gap: 6, paddingTop: 6 },
  eyebrow: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  overallLabel: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontFamily: FONTS.bold,
  },
  overallSub: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    lineHeight: 20,
  },
  overallMetaRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  overallMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: 'rgba(201,169,97,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  overallMetaText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.medium,
  },

  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.md },

  // Grille dimensions
  dimsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dimCard: {
    width: (W - SPACING.lg * 2 - SPACING.md * 2 - 12) / 2,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimTopRow: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dimIconWrap: {
    width: 34, height: 34, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  dimScore: {
    fontSize: 22,
    fontFamily: FONTS.extraBold,
    textAlign: 'center',
  },
  dimLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
    textAlign: 'center',
  },

  // Mini barre
  barTrack: {
    height: 5, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    width: '100%',
  },
  barFill: {
    height: 5, borderRadius: 999,
  },
});

// ─── Écran principal ──────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const [photoIdx,    setPhotoIdx]    = useState(0);
  const [moreVisible, setMoreVisible] = useState(false);
  const [recentApps,  setRecentApps]  = useState([]);
  const [scoreData,   setScoreData]   = useState(null);

  const photos      = user?.photos?.length > 0 ? user.photos : [PLACEHOLDER];
  const totalPhotos = photos.length;

  useEffect(() => {
    applicationsAPI.myApplications({})
      .then(data => {
        const accepted = (data.applications || []).filter(a => a.status === 'accepted');
        setRecentApps(accepted.slice(0, 12));
      })
      .catch(() => {});

    usersAPI.myScore()
      .then(data => setScoreData(data))
      .catch(() => {});
  }, []);

  const formatFollowers = n => {
    if (!n) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    return `${n}`;
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Découvrez le profil de ${user?.name || 'cet influenceur'} sur ONLIST !` });
    } catch {}
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: logout },
    ]);
  };

  const openInstagram = () => {
    const handle = user?.instagram?.replace('@', '');
    if (!handle) return;
    Linking.canOpenURL(`instagram://user?username=${handle}`)
      .then(ok => Linking.openURL(ok
        ? `instagram://user?username=${handle}`
        : `https://www.instagram.com/${handle}/`))
      .catch(() => Linking.openURL(`https://www.instagram.com/${handle}/`));
  };

  const openTikTok = () => {
    const handle = user?.tiktok?.replace('@', '');
    if (!handle) return;
    Linking.openURL(`https://www.tiktok.com/@${handle}`).catch(() => {});
  };

  const moreItems = buildMoreItems({
    navigation,
    logout: handleLogout,
    share:  handleShare,
    close:  () => setMoreVisible(false),
  });

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Scroll principal vertical ── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* ══════ SECTION PHOTO PLEIN ÉCRAN ══════ */}
        <View style={{ height: PHOTO_H, overflow: 'hidden' }}>
          {/* Carrousel horizontal — swipe natif */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={StyleSheet.absoluteFill}
            onMomentumScrollEnd={e =>
              setPhotoIdx(Math.round(e.nativeEvent.contentOffset.x / W))
            }
            scrollEventThrottle={16}
          >
            {photos.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={{ width: W, height: PHOTO_H }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {/* Dégradé haut */}
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'transparent']}
            style={[StyleSheet.absoluteFill, { height: 160, zIndex: 5 }]}
            pointerEvents="none"
          />
          {/* Dégradé bas */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.97)']}
            locations={[0.38, 0.72, 1]}
            style={[StyleSheet.absoluteFill, { zIndex: 5 }]}
            pointerEvents="none"
          />

          {/* ── Nav top : boutons droite uniquement ── */}
          <View style={[S.navRow, { top: insets.top + 10, zIndex: 10 }]}>
            <View style={{ flex: 1 }} />
            <View style={S.navRight}>
              <TouchableOpacity
                style={S.navCircleBtn}
                onPress={() => navigation.navigate('EditProfile')}
              >
                <Ionicons name="create-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={S.navCircleBtn}
                onPress={() => setMoreVisible(true)}
              >
                <Ionicons name="menu-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Barre de progression (uniquement si > 1 photo) ── */}
          {totalPhotos > 1 && (
            <View style={[S.progressRow, { zIndex: 10 }]}>
              {photos.map((_, i) => (
                <View
                  key={i}
                  style={[S.progressDash, i === photoIdx && S.progressDashActive]}
                />
              ))}
            </View>
          )}

          {/* ── Bas de photo : avatar + compteur + socials ── */}
          <View style={[S.photoBottom, { zIndex: 10 }]}>
            <View style={S.thumbWrap}>
              <Image source={{ uri: photos[0] }} style={S.thumbImg} />
            </View>

            <View style={S.photoBottomRight}>
              {totalPhotos > 1 && (
                <Text style={S.photoCountTxt}>{photoIdx + 1}/{totalPhotos} photos</Text>
              )}
              <View style={S.socialIconsRow}>
                {user?.instagram ? (
                  <TouchableOpacity style={S.socialIconBtn} onPress={openInstagram} activeOpacity={0.82}>
                    <Ionicons name="logo-instagram" size={22} color="#fff" />
                  </TouchableOpacity>
                ) : null}
                {user?.tiktok ? (
                  <TouchableOpacity style={S.socialIconBtn} onPress={openTikTok} activeOpacity={0.82}>
                    <Ionicons name="logo-tiktok" size={22} color="#fff" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* ══════ IDENTITÉ ══════ */}
        <View style={S.identitySection}>
          <Text style={S.nameText}>{user?.name || 'Mon Profil'}</Text>
          <Text style={S.typeText}>Influenceur</Text>
        </View>

        {/* ══════ CONTENU (tout en un seul scroll) ══════ */}
        <View style={S.contentArea}>

          {/* Stats */}
          <View style={S.statsRow}>
            <View style={S.statItem}>
              <Text style={S.statValue}>{formatFollowers(user?.followersCount)}</Text>
              <Text style={S.statLabel}>Followers</Text>
            </View>
            <View style={S.statDivider} />
            <View style={S.statItem}>
              <Text style={S.statValue}>{user?.eventsCount ?? recentApps.length}</Text>
              <Text style={S.statLabel}>Événements</Text>
            </View>
            <View style={S.statDivider} />
            <View style={S.statItem}>
              <Text style={S.statValue}>{user?.score ? user.score.toFixed(1) : '—'}</Text>
              <Text style={S.statLabel}>Score</Text>
            </View>
          </View>

          {/* ── Health Score ── */}
          <HealthScoreSection scoreData={scoreData} reviewsCount={user?.reviewsCount} />

          {/* Activité récente */}
          <View style={S.section}>
            <View style={S.sectionHead}>
              <Text style={S.sectionTitle}>Activité Récente</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyEvents')}>
                <Text style={S.seeAll}>Voir tout →</Text>
              </TouchableOpacity>
            </View>

            {recentApps.length === 0 ? (
              <View style={S.emptyRecent}>
                <Ionicons name="calendar-outline" size={32} color={COLORS.textMuted} />
                <Text style={S.emptyRecentTxt}>Aucun événement confirmé pour l'instant</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -SPACING.lg }}
                contentContainerStyle={{ paddingHorizontal: SPACING.lg }}
              >
                {recentApps.map(app => (
                  <TouchableOpacity
                    key={app._id}
                    style={S.recentCard}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('EventDetail', { event: app.event })}
                  >
                    <Image
                      source={{ uri: app.event?.images?.[0] || PLACEHOLDER }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.88)']}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={S.recentCardContent}>
                      <View style={S.confirmedBadge}>
                        <Ionicons name="checkmark-circle" size={10} color={COLORS.success} />
                        <Text style={S.confirmedBadgeTxt}>Confirmé</Text>
                      </View>
                      <Text style={S.recentCardTitle} numberOfLines={1}>
                        {app.event?.title || 'Événement'}
                      </Text>
                      <Text style={S.recentCardSub} numberOfLines={1}>
                        {app.event?.venue || app.event?.city || ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Bio */}
          {user?.bio ? (
            <View style={S.bioCard}>
              <Text style={S.bioTitle}>À propos</Text>
              <Text style={S.bioText}>{user.bio}</Text>
            </View>
          ) : null}

          {/* Localisation */}
          {(user?.city || user?.country) ? (
            <View style={S.locationRow}>
              <Ionicons name="location" size={15} color={COLORS.primaryLight} />
              <Text style={S.locationTxt}>
                {[user.city, user.country].filter(Boolean).join(', ')}
              </Text>
            </View>
          ) : null}

          {/* Réseaux sociaux */}
          {(user?.instagram || user?.tiktok) ? (
            <View style={S.socialRow}>
              {user?.instagram ? (
                <TouchableOpacity style={S.socialChip} onPress={openInstagram} activeOpacity={0.8}>
                  <Ionicons name="logo-instagram" size={15} color={COLORS.primaryLight} />
                  <Text style={S.socialChipTxt}>@{user.instagram.replace('@', '')}</Text>
                </TouchableOpacity>
              ) : null}
              {user?.tiktok ? (
                <TouchableOpacity style={S.socialChip} onPress={openTikTok} activeOpacity={0.8}>
                  <Ionicons name="logo-tiktok" size={15} color={COLORS.primaryLight} />
                  <Text style={S.socialChipTxt}>@{user.tiktok.replace('@', '')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {/* Score */}
          {user?.score > 0 ? (
            <View style={S.scoreCard}>
              <View style={S.scoreLeft}>
                <Text style={S.scoreNum}>{user.score.toFixed(1)}</Text>
                <Text style={S.scoreSub}>/10</Text>
              </View>
              <View>
                <Text style={S.scoreTitleTxt}>Note globale</Text>
                <View style={S.starsRow}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <Ionicons
                      key={i}
                      name={i <= Math.round(user.score / 2) ? 'star' : 'star-outline'}
                      size={13}
                      color={COLORS.gold}
                    />
                  ))}
                </View>
                <Text style={S.scoreReviews}>{user.reviewsCount || 0} avis</Text>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* ══════ BOTTOM SHEET "PLUS" ══════ */}
      <Modal
        visible={moreVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMoreVisible(false)}
      >
        <TouchableOpacity
          style={S.modalOverlay}
          activeOpacity={1}
          onPress={() => setMoreVisible(false)}
        >
          <TouchableOpacity
            style={[S.moreSheet, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
          >
            <View style={S.moreHandle} />
            <Text style={S.moreTitle}>Plus</Text>

            {moreItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[S.moreItem, i === moreItems.length - 1 && { borderBottomWidth: 0 }]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon}
                  size={24}
                  color={item.isRed ? COLORS.error : '#1C1C2E'}
                />
                <Text style={[S.moreItemTxt, item.isRed && { color: COLORS.error }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={S.moreFooter}>ONLIST 2025 | Version 1.0.0</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  // ── Nav ──
  navRow: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  navRight: { flexDirection: 'row', gap: 10 },
  navCircleBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },

  // ── Progress ──
  progressRow: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    gap: 5,
    bottom: 98,
  },
  progressDash: {
    flex: 1, height: 3, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  progressDashActive: { backgroundColor: '#fff' },

  // ── Bas de photo ──
  photoBottom: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    bottom: 22,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  thumbWrap: {
    width: 72, height: 72, borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.28)',
  },
  thumbImg: { width: '100%', height: '100%' },
  photoBottomRight: { alignItems: 'flex-end', gap: 10 },
  photoCountTxt: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
  },
  socialIconsRow: { flexDirection: 'row', gap: 8 },
  socialIconBtn: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
  },

  // ── Identité ──
  identitySection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 18,
    paddingBottom: 8,
    backgroundColor: COLORS.bg,
  },
  nameText: {
    color: '#fff',
    fontSize: FONTS.sizes.xxl,
    fontFamily: FONTS.extraBold,
    lineHeight: 38,
  },
  typeText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.regular,
    marginBottom: 4,
  },

  // ── Contenu ──
  contentArea: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: 110,
  },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  statItem:    { flex: 1, alignItems: 'center', gap: 3 },
  statValue:   { color: COLORS.textPrimary, fontSize: FONTS.sizes.lg, fontFamily: FONTS.extraBold },
  statLabel:   { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  statDivider: { width: 1, height: 36, backgroundColor: COLORS.border },

  section:      { marginBottom: SPACING.lg },
  sectionHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { color: COLORS.textPrimary, fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  seeAll:       { color: COLORS.primaryLight, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular },

  emptyRecent: {
    alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  emptyRecentTxt: {
    color: COLORS.textMuted, fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular, textAlign: 'center',
  },

  recentCard: {
    width: 152, height: 114,
    borderRadius: 16, overflow: 'hidden',
    marginRight: SPACING.sm,
  },
  recentCardContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10, gap: 2 },
  confirmedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16,217,160,0.18)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 6, paddingVertical: 2, marginBottom: 2,
  },
  confirmedBadgeTxt: { color: COLORS.success, fontSize: 9, fontFamily: FONTS.semiBold },
  recentCardTitle:   { color: '#fff', fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },
  recentCardSub:     { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontFamily: FONTS.regular },

  bioCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
    gap: 8, marginBottom: SPACING.md,
  },
  bioTitle: { color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  bioText:  { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, lineHeight: 22 },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.md },
  locationTxt: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular },

  socialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md },
  socialChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(201,169,97,0.08)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(201,169,97,0.22)',
  },
  socialChipTxt: { color: COLORS.primaryLight, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium },

  scoreCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: 'rgba(201,169,97,0.07)',
    borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: 'rgba(201,169,97,0.2)',
    marginBottom: SPACING.md,
  },
  scoreLeft:     { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  scoreNum:      { color: COLORS.gold, fontSize: FONTS.sizes.xl, fontFamily: FONTS.extraBold },
  scoreSub:      { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, paddingBottom: 3 },
  scoreTitleTxt: { color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold, marginBottom: 4 },
  starsRow:      { flexDirection: 'row', gap: 2, marginBottom: 4 },
  scoreReviews:  { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },

  // ── Bottom sheet "Plus" ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  moreSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingTop: 12, paddingHorizontal: SPACING.lg,
  },
  moreHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E5EA',
    alignSelf: 'center', marginBottom: 20,
  },
  moreTitle: {
    color: '#1C1C2E', fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.bold, textAlign: 'center', marginBottom: 8,
  },
  moreItem: {
    flexDirection: 'row', alignItems: 'center', gap: 18,
    paddingVertical: 17,
    borderBottomWidth: 0.5, borderBottomColor: '#F2F2F7',
  },
  moreItemTxt: {
    color: '#1C1C2E', fontSize: FONTS.sizes.base,
    fontFamily: FONTS.semiBold, flex: 1,
  },
  moreFooter: {
    color: '#C7C7CC', fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular, textAlign: 'center',
    marginTop: 20, marginBottom: 4,
  },
});
