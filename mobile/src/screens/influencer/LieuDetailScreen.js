import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Dimensions, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../../constants/categories';
import { lieuxAPI } from '../../services/api';

const { width: SCREEN_W } = Dimensions.get('window');

export default function LieuDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { lieuId, lieu: lieuParam } = route.params || {};

  const [lieu, setLieu] = useState(lieuParam || null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(!lieuParam);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const id = lieuId || lieuParam?._id;
      if (!id) return;
      try {
        const [detail, reviewsData] = await Promise.all([
          lieuxAPI.get(id),
          lieuxAPI.reviews(id).catch(() => ({ reviews: [] })),
        ]);
        if (!active) return;
        if (detail?.lieu) setLieu(detail.lieu);
        setReviews(reviewsData?.reviews || []);
      } catch (err) {
        // On garde le lieu passé en paramètre comme fallback
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [lieuId]);

  if (loading && !lieu) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!lieu) {
    return (
      <View style={[s.container, s.center]}>
        <Text style={s.emptyTxt}>Lieu introuvable.</Text>
      </View>
    );
  }

  const categoryLabel = CATEGORY_LABELS[lieu.category] || lieu.category;
  const categoryIcon = CATEGORY_ICONS[lieu.category] || 'star';
  const banner = lieu.bannerPhoto || lieu.logo || lieu.photos?.[0];
  const fullAddress = [lieu.address, lieu.postalCode, lieu.city].filter(Boolean).join(', ');
  const scoreLabel = lieu.score > 0 ? lieu.score.toFixed(1) : 'Nouveau';

  const openMaps = () => {
    if (!fullAddress) return;
    const q = encodeURIComponent(fullAddress);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`).catch(() => {});
  };

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xl }} showsVerticalScrollIndicator={false}>
        {/* ── Bannière ── */}
        <View style={s.bannerWrap}>
          {banner ? (
            <Image source={{ uri: banner }} style={s.banner} />
          ) : (
            <View style={[s.banner, s.bannerPlaceholder]}>
              <Ionicons name={categoryIcon} size={48} color={COLORS.primary} />
            </View>
          )}
          <LinearGradient
            colors={['rgba(10,10,15,0.5)', 'transparent', 'rgba(10,10,15,0.95)']}
            style={StyleSheet.absoluteFill}
          />
          <TouchableOpacity
            style={[s.backBtn, { top: insets.top + SPACING.sm }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.white} />
          </TouchableOpacity>

          <View style={s.bannerInfo}>
            <View style={s.categoryChip}>
              <Ionicons name={categoryIcon} size={13} color={COLORS.primary} />
              <Text style={s.categoryChipTxt}>{categoryLabel}</Text>
            </View>
            <Text style={s.lieuName}>{lieu.name}</Text>
          </View>
        </View>

        <View style={s.body}>
          {/* ── Score ── */}
          <View style={s.scoreCard}>
            <View style={s.scoreBadge}>
              <Ionicons name="star" size={18} color={COLORS.primary} />
              <Text style={s.scoreValue}>{scoreLabel}</Text>
            </View>
            <Text style={s.scoreMeta}>{lieu.reviewsCount || 0} avis influenceurs</Text>
          </View>

          {lieu.reviewsCount > 0 && lieu.scoreDetails && (
            <View style={s.detailScores}>
              <ScoreRow label="Ambiance" value={lieu.scoreDetails.ambience} />
              <ScoreRow label="Service" value={lieu.scoreDetails.service} />
              <ScoreRow label="Rapport qualité" value={lieu.scoreDetails.value} />
            </View>
          )}

          {/* ── Adresse ── */}
          {fullAddress ? (
            <TouchableOpacity style={s.infoCard} onPress={openMaps} activeOpacity={0.8}>
              <View style={s.infoIcon}>
                <Ionicons name="location-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>Adresse</Text>
                <Text style={s.infoValue}>{fullAddress}</Text>
              </View>
              <Ionicons name="navigate-outline" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}

          {lieu.capacity > 0 && (
            <View style={s.infoCard}>
              <View style={s.infoIcon}>
                <Ionicons name="people-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>Capacité</Text>
                <Text style={s.infoValue}>{lieu.capacity} personnes</Text>
              </View>
            </View>
          )}

          {/* ── Description ── */}
          {lieu.description ? (
            <View style={s.section}>
              <Text style={s.sectionTitle}>À propos</Text>
              <Text style={s.description}>{lieu.description}</Text>
            </View>
          ) : null}

          {/* ── Galerie ── */}
          {lieu.photos?.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Galerie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm }}>
                {lieu.photos.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={s.galleryImg} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Avis ── */}
          {reviews.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Avis des influenceurs</Text>
              <View style={{ gap: SPACING.sm }}>
                {reviews.map((r, i) => (
                  <View key={r._id || i} style={s.reviewCard}>
                    <View style={s.reviewHead}>
                      <Text style={s.reviewName}>{r.influencer?.name || 'Influenceur'}</Text>
                      <View style={s.reviewScore}>
                        <Ionicons name="star" size={12} color={COLORS.primary} />
                        <Text style={s.reviewScoreTxt}>
                          {(r.globalScore || 0).toFixed(1)}
                        </Text>
                      </View>
                    </View>
                    {r.comment ? <Text style={s.reviewComment}>{r.comment}</Text> : null}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ScoreRow({ label, value }) {
  const v = value || 0;
  return (
    <View style={s.scoreRow}>
      <Text style={s.scoreRowLabel}>{label}</Text>
      <View style={s.scoreBar}>
        <View style={[s.scoreBarFill, { width: `${Math.min(100, (v / 10) * 100)}%` }]} />
      </View>
      <Text style={s.scoreRowValue}>{v.toFixed(1)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  emptyTxt: { color: COLORS.textSecondary, fontFamily: FONTS.regular },

  bannerWrap: { width: SCREEN_W, height: SCREEN_W * 0.78 },
  banner: { width: '100%', height: '100%' },
  bannerPlaceholder: { backgroundColor: COLORS.bgCard2, justifyContent: 'center', alignItems: 'center' },
  backBtn: {
    position: 'absolute', left: SPACING.md,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center',
  },
  bannerInfo: { position: 'absolute', left: SPACING.lg, right: SPACING.lg, bottom: SPACING.lg },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.full, marginBottom: SPACING.sm,
  },
  categoryChipTxt: { color: COLORS.primary, fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.xs },
  lieuName: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: FONTS.sizes.xxl },

  body: { padding: SPACING.lg, gap: SPACING.md },

  scoreCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  scoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreValue: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: FONTS.sizes.lg },
  scoreMeta: { color: COLORS.textSecondary, fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm },

  detailScores: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  scoreRowLabel: { color: COLORS.textSecondary, fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm, width: 110 },
  scoreBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.bgCard2, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.primary },
  scoreRowValue: { color: COLORS.textPrimary, fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.sm, width: 30, textAlign: 'right' },

  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  infoIcon: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.bgCard2,
    justifyContent: 'center', alignItems: 'center',
  },
  infoLabel: { color: COLORS.textMuted, fontFamily: FONTS.medium, fontSize: FONTS.sizes.xs },
  infoValue: { color: COLORS.textPrimary, fontFamily: FONTS.medium, fontSize: FONTS.sizes.base },

  section: { gap: SPACING.sm },
  sectionTitle: { color: COLORS.white, fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.md },
  description: { color: COLORS.textSecondary, fontFamily: FONTS.regular, fontSize: FONTS.sizes.base, lineHeight: 22 },

  galleryImg: { width: 140, height: 180, borderRadius: RADIUS.md, backgroundColor: COLORS.bgCard2 },

  reviewCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, gap: 6,
  },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewName: { color: COLORS.textPrimary, fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.sm },
  reviewScore: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewScoreTxt: { color: COLORS.primary, fontFamily: FONTS.semiBold, fontSize: FONTS.sizes.xs },
  reviewComment: { color: COLORS.textSecondary, fontFamily: FONTS.regular, fontSize: FONTS.sizes.sm, lineHeight: 20 },
});
