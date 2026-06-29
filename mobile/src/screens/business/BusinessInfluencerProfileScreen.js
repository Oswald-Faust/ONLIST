import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, StatusBar, Dimensions, Linking, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { usersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getBusinessPlan } from '../../constants/businessPlans';

const W = Dimensions.get('window').width;
const HEADER_H = 300;

function formatFollowers(n) {
  if (!n) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return `${n}`;
}

function getSocialUrl(platform, account) {
  const value = String(account || '').trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;

  const handle = value.replace(/^@/, '').replace(/^\/+|\/+$/g, '');
  if (!handle) return null;

  if (platform === 'instagram') return `https://www.instagram.com/${encodeURIComponent(handle)}/`;
  if (platform === 'tiktok') return `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
  if (platform === 'youtube') return `https://www.youtube.com/@${encodeURIComponent(handle)}`;
  return null;
}

async function openSocialProfile(platform, account) {
  const url = getSocialUrl(platform, account);
  if (!url) return;

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Lien indisponible', "Impossible d’ouvrir ce profil pour le moment.");
  }
}

// ─── Barre de score ────────────────────────────────────────────────────────────
function ScoreBar({ label, value }) {
  const pct = Math.min(100, Math.max(0, ((value || 0) / 10) * 100));
  return (
    <View style={s.scoreBarRow}>
      <Text style={s.scoreBarLabel}>{label}</Text>
      <View style={s.scoreBarBg}>
        <LinearGradient
          colors={COLORS.gradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[s.scoreBarFill, { width: `${pct}%` }]}
        />
      </View>
      <Text style={s.scoreBarValue}>{value ? value.toFixed(1) : '—'}</Text>
    </View>
  );
}

function MiniStatCard({ label, value, tone = 'default' }) {
  return (
    <View style={[s.miniStatCard, tone === 'accent' && s.miniStatCardAccent]}>
      <Text style={[s.miniStatValue, tone === 'accent' && s.miniStatValueAccent]}>{value}</Text>
      <Text style={s.miniStatLabel}>{label}</Text>
    </View>
  );
}

// ─── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ title, children, style }) {
  return (
    <View style={[s.card, style]}>
      {title ? <Text style={s.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function BusinessInfluencerProfileScreen({ route, navigation }) {
  const { user: businessUser } = useAuth();
  const plan = getBusinessPlan(businessUser?.subscriptionPlan);
  const { userId } = route.params;
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [imgErrors, setImgErrors] = useState({});
  const [myReviews, setMyReviews] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);

  const markError = (key) => setImgErrors(prev => ({ ...prev, [key]: true }));

  useEffect(() => {
    usersAPI.get(userId)
      .then(data => {
        setUser(data.user || data);
        setMyReviews(data.myReviews || []);
        setRecentReviews(data.recentReviews || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[s.container, s.center]}>
        <Text style={{ color: COLORS.textMuted }}>Profil introuvable</Text>
      </View>
    );
  }

  const photos = (user.photos || []).filter(Boolean);
  const avatarUrl = user.avatarUrl || null;      // OAuth (Google/Apple)
  const mainImage = photos[0] || avatarUrl;      // meilleure image disponible
  const score = user.score || 0;
  const sd = user.scoreDetails || {};
  const strongestMetric = [
    { label: 'Ponctualité', value: sd.punctuality || 0 },
    { label: 'Style', value: sd.style || 0 },
    { label: 'Attitude', value: sd.attitude || 0 },
    { label: 'Contenu', value: sd.content || 0 },
  ].sort((a, b) => b.value - a.value)[0];
  const initials = (user.name || '?').slice(0, 2).toUpperCase();
  const handle = user.instagram
    ? `@${user.instagram.replace('@', '')}`
    : user.tiktok
    ? `@${user.tiktok.replace('@', '')}`
    : null;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}>

        {/* ── Photo header ── */}
        <View style={s.photoHeader}>
          {mainImage && !imgErrors['main'] ? (
            <Image
              source={{ uri: photos.length > 0 ? photos[photoIndex] : mainImage }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              onError={() => markError('main')}
            />
          ) : (
            <LinearGradient
              colors={['rgba(201,169,97,0.22)', 'rgba(201,169,97,0.05)', '#0A0A0F']}
              style={StyleSheet.absoluteFill}
            />
          )}
          {/* Gradient overlay — du transparent vers le fond */}
          <LinearGradient
            colors={['rgba(10,10,15,0.25)', 'rgba(10,10,15,0.55)', 'rgba(10,10,15,0.96)']}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Bouton retour */}
          <TouchableOpacity
            style={[s.backBtn, { top: insets.top + 8 }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.white} />
          </TouchableOpacity>

          {/* Badge nombre de photos */}
          {photos.length > 1 && (
            <View style={[s.photoBadge, { top: insets.top + 14 }]}>
              <Ionicons name="images-outline" size={13} color={COLORS.white} />
              <Text style={s.photoBadgeText}>{photoIndex + 1}/{photos.length}</Text>
            </View>
          )}

          {/* Miniatures de photos */}
          {photos.length > 1 && (
            <View style={s.thumbsRow}>
              {photos.map((uri, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setPhotoIndex(i)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri }}
                    style={[s.thumb, i === photoIndex && s.thumbActive]}
                    resizeMode="cover"
                    onError={() => markError(`thumb_${i}`)}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Avatar initiales — uniquement si aucune image disponible ou erreur */}
          {(!mainImage || imgErrors['main']) && (
            <View style={[s.avatarLarge, { top: insets.top + 54 }]}>
              <LinearGradient colors={COLORS.gradient} style={s.avatarLargeGrad}>
                <Text style={s.avatarLargeText}>{initials}</Text>
              </LinearGradient>
            </View>
          )}

          {/* Identité — en bas de l'image */}
          <View style={s.headerBottom}>
            <Text style={s.headerName}>{user.name}</Text>
            {handle && <Text style={s.headerHandle}>{handle}</Text>}
            {user.city && (
              <View style={s.headerLocation}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.6)" />
                <Text style={s.headerLocationText}>{user.city}</Text>
              </View>
            )}
            {!mainImage && (
              <View style={s.noPhotoHint}>
                <Ionicons name="camera-outline" size={12} color="rgba(255,255,255,0.4)" />
                <Text style={s.noPhotoHintText}>Pas encore de photo de profil</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Stats strip ── */}
        <View style={s.statsStrip}>
          <View style={s.statItem}>
            <Text style={s.statValue}>{formatFollowers(user.followersCount)}</Text>
            <Text style={s.statLabel}>Abonnés</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={[s.statValue, typeof user.score === 'number' && score > 0 && { color: COLORS.primary }]}>
              {typeof user.score === 'number' && score > 0 ? score.toFixed(1) : '—'}
            </Text>
            <Text style={s.statLabel}>Score /10</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>{user.reviewsCount || 0}</Text>
            <Text style={s.statLabel}>Avis</Text>
          </View>
        </View>

        {/* ── Réseaux sociaux ── */}
        {(user.instagram || user.tiktok || user.youtube) && (
          <Card title="Réseaux sociaux" style={s.cardMx}>
            {user.instagram && (
              <TouchableOpacity
                style={s.socialRow}
                onPress={() => openSocialProfile('instagram', user.instagram)}
                activeOpacity={0.72}
                accessibilityRole="link"
                accessibilityLabel={`Ouvrir le profil Instagram de ${user.name}`}
              >
                <View style={[s.socialIcon, {
                  backgroundColor: 'rgba(225,48,108,0.1)',
                  borderColor: 'rgba(225,48,108,0.22)',
                }]}>
                  <Ionicons name="logo-instagram" size={16} color="#E1306C" />
                </View>
                <Text style={s.socialHandle}>@{user.instagram.replace('@', '')}</Text>
                <Ionicons name="open-outline" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
            {user.tiktok && (
              <TouchableOpacity
                style={s.socialRow}
                onPress={() => openSocialProfile('tiktok', user.tiktok)}
                activeOpacity={0.72}
                accessibilityRole="link"
                accessibilityLabel={`Ouvrir le profil TikTok de ${user.name}`}
              >
                <View style={[s.socialIcon, {
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderColor: 'rgba(255,255,255,0.14)',
                }]}>
                  <Ionicons name="musical-notes-outline" size={16} color={COLORS.white} />
                </View>
                <Text style={s.socialHandle}>@{user.tiktok.replace('@', '')}</Text>
                <Ionicons name="open-outline" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
            {user.youtube && (
              <TouchableOpacity
                style={s.socialRow}
                onPress={() => openSocialProfile('youtube', user.youtube)}
                activeOpacity={0.72}
                accessibilityRole="link"
                accessibilityLabel={`Ouvrir la chaîne YouTube de ${user.name}`}
              >
                <View style={[s.socialIcon, {
                  backgroundColor: 'rgba(255,70,70,0.1)',
                  borderColor: 'rgba(255,70,70,0.22)',
                }]}>
                  <Ionicons name="logo-youtube" size={16} color="#FF4646" />
                </View>
                <Text style={s.socialHandle}>{user.youtube}</Text>
                <Ionicons name="open-outline" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* ── Bio ── */}
        {user.bio ? (
          <Card title="À propos" style={s.cardMx}>
            <Text style={s.bioText}>{user.bio}</Text>
          </Card>
        ) : null}

        {/* ── Score influenceur ── */}
        {plan.creatorStatsLevel === 'basic' && typeof user.score === 'number' && (
          <Card style={s.cardMx}>
            <View style={s.scoreHeader}>
              <Text style={s.cardTitle}>Statistiques créateur</Text>
              <View style={s.globalScorePill}>
                <Text style={s.globalScoreNum}>{score > 0 ? score.toFixed(1) : '—'}</Text>
                <Text style={s.globalScoreUnit}>/10</Text>
              </View>
            </View>
            <View style={s.miniStatsGrid}>
              <MiniStatCard label="Ponctualité" value={sd.punctuality ? `${sd.punctuality.toFixed(1)}/10` : '—'} />
              <MiniStatCard label="Style" value={sd.style ? `${sd.style.toFixed(1)}/10` : '—'} />
              <MiniStatCard label="Attitude" value={sd.attitude ? `${sd.attitude.toFixed(1)}/10` : '—'} />
              <MiniStatCard label="Contenu" value={sd.content ? `${sd.content.toFixed(1)}/10` : '—'} />
            </View>
            <View style={s.summaryBand}>
              <Ionicons name="sparkles-outline" size={16} color={COLORS.primaryLight} />
              <Text style={s.summaryBandText}>
                {user.reviewsCount > 0
                  ? `Point fort principal: ${strongestMetric.label.toLowerCase()}`
                  : `Pas encore assez d'avis pour dégager une tendance.`}
              </Text>
            </View>
          </Card>
        )}

        {plan.creatorStatsLevel === 'full' && score > 0 && (
          <Card style={s.cardMx}>
            <View style={s.scoreHeader}>
              <Text style={s.cardTitle}>Score influenceur</Text>
              <View style={s.globalScorePill}>
                <Text style={s.globalScoreNum}>{score.toFixed(1)}</Text>
                <Text style={s.globalScoreUnit}>/10</Text>
              </View>
            </View>
            <View style={s.scoreBarsWrap}>
              <ScoreBar label="Ponctualité"  value={sd.punctuality} />
              <ScoreBar label="Présentation" value={sd.style} />
              <ScoreBar label="Attitude"     value={sd.attitude} />
              <ScoreBar label="Contenu"      value={sd.content} />
            </View>
            {user.reviewsCount > 0 && (
              <Text style={s.reviewsNote}>
                Basé sur {user.reviewsCount} avis d'établissements
              </Text>
            )}
          </Card>
        )}

        {myReviews.length > 0 && (
          <Card title="Votre avis sur ce créateur" style={s.cardMx}>
            {myReviews.map((review) => (
              <View key={review._id} style={s.reviewItem}>
                <View style={s.reviewTopRow}>
                  <View style={s.reviewEventMeta}>
                    <Text style={s.reviewEventTitle}>{review.event?.title || 'Événement'}</Text>
                    <Text style={s.reviewEventDate}>
                      {review.event?.date ? new Date(review.event.date).toLocaleDateString('fr-FR') : 'Date indisponible'}
                    </Text>
                  </View>
                  <View style={s.reviewScorePill}>
                    <Text style={s.reviewScoreValue}>{typeof review.globalScore === 'number' ? review.globalScore.toFixed(1) : '—'}</Text>
                    <Text style={s.reviewScoreUnit}>/10</Text>
                  </View>
                </View>
                <View style={s.reviewScoresRow}>
                  <Text style={s.reviewScoreChip}>Ponctualité {review.scores?.punctuality ?? '—'}</Text>
                  <Text style={s.reviewScoreChip}>Style {review.scores?.style ?? '—'}</Text>
                  <Text style={s.reviewScoreChip}>Attitude {review.scores?.attitude ?? '—'}</Text>
                  <Text style={s.reviewScoreChip}>Contenu {review.scores?.content ?? '—'}</Text>
                </View>
                {review.comment ? <Text style={s.reviewComment}>{review.comment}</Text> : null}
              </View>
            ))}
          </Card>
        )}

        {/* ── Infos ── */}
        {(user.gender || user.nationality || user.country) && (
          <Card title="Informations" style={s.cardMx}>
            {[
              user.gender      && { icon: 'person-outline',  label: 'Genre',       value: user.gender === 'male' ? 'Homme' : user.gender === 'female' ? 'Femme' : user.gender },
              user.nationality && { icon: 'flag-outline',    label: 'Nationalité', value: user.nationality },
              user.country     && { icon: 'globe-outline',   label: 'Pays',        value: user.country },
            ].filter(Boolean).map((row, i) => (
              <View key={i} style={[s.infoRow, i > 0 && { borderTopWidth: 1, borderTopColor: COLORS.border }]}>
                <View style={s.infoIconWrap}>
                  <Ionicons name={row.icon} size={15} color={COLORS.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.infoLabel}>{row.label}</Text>
                  <Text style={s.infoValue}>{row.value}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { alignItems: 'center', justifyContent: 'center' },

  // Photo header
  photoHeader: { height: HEADER_H, position: 'relative', justifyContent: 'flex-end' },
  backBtn: {
    position: 'absolute', left: SPACING.lg,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(10,10,15,0.55)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoBadge: {
    position: 'absolute', right: SPACING.lg,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(10,10,15,0.55)',
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  photoBadgeText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontFamily: FONTS.medium },

  thumbsRow: {
    position: 'absolute', bottom: 80, left: SPACING.lg,
    flexDirection: 'row', gap: 8,
  },
  thumb: {
    width: 44, height: 44, borderRadius: 10,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
  },
  thumbActive: { borderColor: COLORS.primaryLight, borderWidth: 2 },

  avatarLarge: {
    position: 'absolute', left: '50%', marginLeft: -44,
    width: 88, height: 88, borderRadius: 44, overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarLargeGrad: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarLargeText: { color: '#0A0A0F', fontSize: FONTS.sizes.xxl, fontFamily: FONTS.bold },

  headerBottom: {
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, gap: 4,
  },
  headerName: { color: COLORS.white, fontSize: FONTS.sizes.xxl, fontFamily: FONTS.bold },
  headerHandle: { color: COLORS.primaryLight, fontSize: FONTS.sizes.base, fontFamily: FONTS.medium },
  headerLocation: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerLocationText: { color: 'rgba(255,255,255,0.55)', fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderTopWidth: 1, borderColor: COLORS.border,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: SPACING.md, gap: 3 },
  statValue: { color: COLORS.white, fontSize: FONTS.sizes.xl, fontFamily: FONTS.bold },
  statLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md },

  // Cards
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.lg, gap: SPACING.md,
  },
  cardMx: { marginHorizontal: SPACING.lg, marginTop: SPACING.md },
  cardTitle: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold, textTransform: 'uppercase', letterSpacing: 0.8 },

  // Social
  socialRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  socialIcon: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  socialHandle: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.sizes.base, fontFamily: FONTS.medium },

  // Bio
  bioText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.base, fontFamily: FONTS.regular, lineHeight: 24 },

  // Score
  scoreHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  globalScorePill: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 2,
    backgroundColor: 'rgba(201,169,97,0.12)',
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  globalScoreNum: { color: COLORS.primary, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  globalScoreUnit: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, paddingBottom: 2 },
  scoreBarsWrap: { gap: SPACING.sm + 4 },
  scoreBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreBarLabel: { width: 90, color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular },
  scoreBarBg: {
    flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  scoreBarFill: { height: '100%', borderRadius: 3 },
  scoreBarValue: { width: 28, textAlign: 'right', color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  reviewsNote: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, textAlign: 'center' },
  miniStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  miniStatCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 6,
  },
  miniStatCardAccent: {
    backgroundColor: 'rgba(201,169,97,0.08)',
    borderColor: 'rgba(201,169,97,0.2)',
  },
  miniStatValue: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  miniStatValueAccent: { color: COLORS.primary },
  miniStatLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.medium, textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryBand: {
    marginTop: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    backgroundColor: 'rgba(201,169,97,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.18)',
  },
  summaryBandText: { flex: 1, color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium, lineHeight: 20 },
  reviewItem: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: SPACING.sm,
  },
  reviewTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.md },
  reviewEventMeta: { flex: 1, gap: 2 },
  reviewEventTitle: { color: COLORS.textPrimary, fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  reviewEventDate: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  reviewScorePill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(201,169,97,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.2)',
  },
  reviewScoreValue: { color: COLORS.primary, fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  reviewScoreUnit: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, paddingBottom: 2 },
  reviewScoresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reviewScoreChip: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.semiBold,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reviewComment: { color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, lineHeight: 20 },
  noPhotoHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  noPhotoHintText: { color: 'rgba(255,255,255,0.4)', fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  thumbError: { backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },

  // Info rows
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  infoIconWrap: { width: 28, alignItems: 'center' },
  infoLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  infoValue: { color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium, marginTop: 1 },
});
