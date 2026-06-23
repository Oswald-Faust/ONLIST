import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { getDeliverableLabel } from '../../constants/businessEventOptions';
import { applicationsAPI, deliverablesAPI } from '../../services/api';

function ScorePill({ value, muted = false }) {
  return (
    <View style={[s.scorePill, muted && s.scorePillMuted]}>
      <Text style={[s.scorePillValue, muted && s.scorePillValueMuted]}>
        {typeof value === 'number' ? value.toFixed(1) : '—'}
      </Text>
      <Text style={s.scorePillUnit}>/10</Text>
    </View>
  );
}

function ReviewCard({ title, review, emptyText, scoreLabels }) {
  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <Text style={s.cardTitle}>{title}</Text>
        <ScorePill value={review?.globalScore} muted={!review} />
      </View>
      {!review ? (
        <Text style={s.emptyText}>{emptyText}</Text>
      ) : (
        <>
          <View style={s.chipsRow}>
            {scoreLabels.map(({ key, label }) => (
              <View key={key} style={s.scoreChip}>
                <Text style={s.scoreChipLabel}>{label}</Text>
                <Text style={s.scoreChipValue}>{review?.scores?.[key] ?? '—'}</Text>
              </View>
            ))}
          </View>
          {review.comment ? <Text style={s.reviewComment}>{review.comment}</Text> : <Text style={s.emptyText}>Aucun commentaire ajouté.</Text>}
        </>
      )}
    </View>
  );
}

export default function BusinessApplicationAssetsScreen({ route, navigation }) {
  const initialApplication = route.params?.application || {};
  const initialSubmissions = route.params?.submissions || [];
  const [application, setApplication] = useState(initialApplication);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [loading, setLoading] = useState(true);
  const user = application.user || {};
  const eventId = application.event?._id || application.event;
  const applicationId = application._id;

  const load = useCallback(async () => {
    if (!eventId || !applicationId) {
      setLoading(false);
      return;
    }
    try {
      const [appsData, deliverablesData] = await Promise.all([
        applicationsAPI.eventApplications(eventId),
        deliverablesAPI.mine(),
      ]);
      const freshApplication = (appsData.applications || []).find((item) => item._id === applicationId);
      if (freshApplication) setApplication(freshApplication);
      const nextSubmissions = (deliverablesData.submissions || []).filter(
        (item) => String(item.application?._id || item.application) === String(applicationId)
      );
      setSubmissions(nextSubmissions);
    } finally {
      setLoading(false);
    }
  }, [applicationId, eventId]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Livrables</Text>
          <View style={s.backBtnGhost} />
        </View>

        {loading ? (
          <View style={s.loaderWrap}>
            <ActivityIndicator size="large" color={COLORS.primaryLight} />
          </View>
        ) : (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.hero}>
            <Text style={s.heroName}>{user.name || 'Influenceur'}</Text>
            {user.instagram ? <Text style={s.heroHandle}>@{user.instagram.replace('@', '')}</Text> : null}
            <Text style={s.heroMeta}>
              {submissions.length} livrable(s) reçu(s)
            </Text>
          </View>

          <ReviewCard
            title="Note reçue de l’influenceur"
            review={application.influencerReview}
            emptyText="Cet influenceur n’a pas encore noté l’établissement."
            scoreLabels={[
              { key: 'ambience', label: 'Ambiance' },
              { key: 'service', label: 'Service' },
              { key: 'value', label: 'Valeur' },
            ]}
          />

          <ReviewCard
            title="Note envoyée par l’établissement"
            review={application.businessReview}
            emptyText="Vous n’avez pas encore noté cet influenceur."
            scoreLabels={[
              { key: 'punctuality', label: 'Ponctualité' },
              { key: 'style', label: 'Style' },
              { key: 'attitude', label: 'Attitude' },
              { key: 'content', label: 'Contenu' },
            ]}
          />

          <View style={s.card}>
            <View style={s.cardHead}>
              <Text style={s.cardTitle}>Livrables envoyés</Text>
              <Text style={s.cardCount}>{submissions.length}</Text>
            </View>
            {submissions.length === 0 ? (
              <Text style={s.emptyText}>Aucun livrable disponible pour le moment.</Text>
            ) : submissions.map((submission) => (
              <View key={submission._id} style={s.deliverableCard}>
                <View style={s.deliverableHead}>
                  <Text style={s.deliverableTitle}>{getDeliverableLabel(submission.deliverableType)}</Text>
                  <Text style={s.deliverableCount}>{(submission.assetUrls || []).length} fichier(s)</Text>
                </View>
                {submission.note ? <Text style={s.deliverableNote}>{submission.note}</Text> : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.assetsRow}>
                  {(submission.assetUrls || []).filter(Boolean).map((uri, index) => (
                    <Image key={`${uri}-${index}`} source={{ uri }} style={s.assetThumb} />
                  ))}
                </ScrollView>
              </View>
            ))}
          </View>
        </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1 },
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
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backBtnGhost: { width: 42, height: 42 },
  headerTitle: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  hero: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  heroName: { color: COLORS.white, fontSize: FONTS.sizes.xl, fontFamily: FONTS.bold },
  heroHandle: { color: COLORS.primaryLight, fontSize: FONTS.sizes.base, fontFamily: FONTS.medium },
  heroMeta: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, marginTop: 4 },
  card: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md },
  cardTitle: { flex: 1, color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  cardCount: { color: COLORS.primaryLight, fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  emptyText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, lineHeight: 20 },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(16,217,160,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(16,217,160,0.18)',
  },
  scorePillMuted: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: COLORS.border,
  },
  scorePillValue: { color: COLORS.success, fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  scorePillValueMuted: { color: COLORS.textMuted },
  scorePillUnit: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, paddingBottom: 2 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scoreChip: {
    minWidth: '30%',
    borderRadius: RADIUS.lg,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  scoreChipLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.medium, textTransform: 'uppercase' },
  scoreChipValue: { color: COLORS.textPrimary, fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  reviewComment: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, lineHeight: 20 },
  deliverableCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  deliverableHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md },
  deliverableTitle: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold },
  deliverableCount: { color: COLORS.primaryLight, fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },
  deliverableNote: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, lineHeight: 20 },
  assetsRow: { gap: 8 },
  assetThumb: { width: 96, height: 96, borderRadius: 16, backgroundColor: COLORS.bgInput },
});
