import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Image, ScrollView, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { applicationsAPI } from '../../services/api';
import { getDeliverableLabel } from '../../constants/businessEventOptions';

function formatRange(event) {
  if (!event?.date) return '';
  const start = new Date(event.date);
  const fmt = (d) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = (t) => (t ? ` ${t}` : '');
  let str = `${fmt(start)}${time(event.startTime)}`;
  if (event.endTime) str += ` - ${event.endTime}`;
  return str;
}

function DetailSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={s.sectionCard}>
      <TouchableOpacity style={s.sectionHeader} onPress={() => setOpen((prev) => !prev)} activeOpacity={0.85}>
        <Text style={s.sectionTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textPrimary} />
      </TouchableOpacity>
      {open ? <View style={s.sectionBody}>{children}</View> : null}
    </View>
  );
}

export default function AttendanceConfirmedScreen({ route, navigation }) {
  const initial = route.params?.application || {};
  const [application, setApplication] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [mapCoords, setMapCoords] = useState(null);
  const event = application.event || {};
  const eventImage = (event.images && event.images[0]) || null;
  const fullAddress = useMemo(
    () => [event.address || event.venue, event.city, event.country].filter(Boolean).join(', '),
    [event.address, event.city, event.country, event.venue]
  );
  const mapPreviewUrl = mapCoords
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${mapCoords.lat},${mapCoords.lon}&zoom=15&size=800x360&markers=${mapCoords.lat},${mapCoords.lon},red-pushpin`
    : null;

  useEffect(() => {
    // Auto-confirmation si la candidature est acceptée mais pas encore confirmée
    const autoConfirm = async () => {
      if (application.status === 'accepted' && !application.confirmed && application._id) {
        try {
          setConfirming(true);
          const data = await applicationsAPI.confirm(application._id);
          if (data?.application) setApplication((prev) => ({ ...prev, ...data.application }));
        } catch (_) {
          // silencieux : l'écran reste utilisable même si la confirmation a déjà eu lieu
        } finally {
          setConfirming(false);
        }
      }
    };
    autoConfirm();
  }, []);

  useEffect(() => {
    if (!fullAddress) {
      setMapCoords(null);
      return;
    }

    let cancelled = false;

    const geocodeAddress = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`,
          { headers: { 'User-Agent': 'OnListApp/1.0' } }
        );
        const data = await res.json();
        const first = data?.[0];
        if (!cancelled && first?.lat && first?.lon) {
          setMapCoords({ lat: first.lat, lon: first.lon });
        }
      } catch (_) {
        if (!cancelled) setMapCoords(null);
      }
    };

    geocodeAddress();

    return () => {
      cancelled = true;
    };
  }, [fullAddress]);

  const addToCalendar = () => {
    if (!event?.date) return;
    const start = new Date(event.date);
    const end = event.endTime ? new Date(start.getTime() + 3 * 60 * 60 * 1000) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const toGCal = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title || 'Événement ONLIST')}&dates=${toGCal(start)}/${toGCal(end)}&location=${encodeURIComponent(event.city || '')}`;
    Linking.openURL(url).catch(() => {});
  };

  const openMaps = () => {
    if (!fullAddress) return;
    const encoded = encodeURIComponent(fullAddress);
    Linking.openURL(`https://maps.google.com/maps?q=${encoded}`).catch(() => {});
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('InfluencerTabs', { screen: 'MyEvents' });
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#0A0A0F', '#09090D']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <View style={s.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['#171511', '#1F1A12', '#11100C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.heroCard}
          >
            <View style={s.heroPattern} />

            <View style={s.checkCircle}>
              {confirming ? (
                <ActivityIndicator color={COLORS.bg} />
              ) : (
                <Ionicons name="checkmark" size={36} color={COLORS.bg} />
              )}
            </View>

            <Text style={s.title}>Présence confirmée</Text>
            <Text style={s.subtitle}>Votre accès à l'événement est validé.</Text>

            <View style={s.eventRow}>
              {eventImage ? <Image source={{ uri: eventImage }} style={s.eventImg} /> : <View style={[s.eventImg, s.eventImgFallback]} />}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.eventTitle} numberOfLines={2}>{event.title || 'Événement'}</Text>
                <Text style={s.eventDate}>{formatRange(event)}</Text>
                {event.dresscode ? <Text style={s.eventMeta}>Tenue: {event.dresscode}</Text> : null}
              </View>
            </View>

            <TouchableOpacity
              style={s.accessBtn}
              onPress={() => navigation.navigate('AccessPass', { application })}
              activeOpacity={0.9}
            >
              <Ionicons name="qr-code-outline" size={20} color={COLORS.primaryLight} />
              <Text style={s.accessBtnText}>Voir l'Access Pass</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.calBtn} onPress={addToCalendar} activeOpacity={0.85}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.textPrimary} />
              <Text style={s.calBtnText}>Ajouter au calendrier</Text>
            </TouchableOpacity>
          </LinearGradient>

          {event.description ? (
            <DetailSection title="Description" defaultOpen>
              <Text style={s.sectionText}>{event.description}</Text>
            </DetailSection>
          ) : null}

          {(event.rules || event.guestsRequired > 0 || event.plusOneMode === 'plus_one_required') ? (
            <DetailSection title="Règles">
              <View style={s.ruleList}>
                {event.rules
                  ? event.rules.split('\n').filter(Boolean).map((rule, index) => (
                    <View key={`${rule}-${index}`} style={s.ruleRow}>
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.primaryLight} />
                      <Text style={s.ruleText}>{rule}</Text>
                    </View>
                  ))
                  : null}
                {(event.guestsRequired > 0 || event.plusOneMode === 'plus_one_required') ? (
                  <View style={s.ruleRow}>
                    <Ionicons name="people" size={18} color={COLORS.primaryLight} />
                    <Text style={s.ruleText}>
                      {event.guestsRequired > 0
                        ? `Vous devez venir avec ${event.guestsRequired} invité${event.guestsRequired > 1 ? 's' : ''} et gérer leurs avis dans "À livrer".`
                        : 'Vous devez venir accompagné(e) et gérer les avis associés dans "À livrer".'}
                    </Text>
                  </View>
                ) : null}
                {event.deliverables?.length ? (
                  <View style={s.deliverablesBox}>
                    <Text style={s.deliverablesTitle}>Livrables attendus</Text>
                    {event.deliverables.map((item, index) => (
                      <Text key={`${item}-${index}`} style={s.deliverableItem}>• {getDeliverableLabel(item)}</Text>
                    ))}
                  </View>
                ) : null}
              </View>
            </DetailSection>
          ) : null}

          {fullAddress ? (
            <DetailSection title="Localisation">
              <TouchableOpacity style={s.mapCard} onPress={openMaps} activeOpacity={0.9}>
                {mapPreviewUrl ? (
                  <Image source={{ uri: mapPreviewUrl }} style={s.mapPreview} resizeMode="cover" />
                ) : (
                  <View style={s.mapFallback}>
                    <Ionicons name="map-outline" size={28} color={COLORS.primaryLight} />
                    <Text style={s.mapFallbackText}>Carte en cours de chargement</Text>
                  </View>
                )}
                <LinearGradient
                  colors={['transparent', 'rgba(10,10,15,0.18)', 'rgba(10,10,15,0.88)']}
                  style={s.mapOverlay}
                />
                <View style={s.mapBadge}>
                  <Ionicons name="navigate-outline" size={14} color={COLORS.bg} />
                  <Text style={s.mapBadgeText}>Ouvrir dans Maps</Text>
                </View>
              </TouchableOpacity>
              <View style={s.locationCard}>
                <View style={s.locationRow}>
                  <Ionicons name="location-outline" size={18} color={COLORS.primaryLight} />
                  <Text style={s.sectionText}>{fullAddress}</Text>
                </View>
                {event.offer ? <Text style={s.locationSub}>Offre: {event.offer}</Text> : null}
              </View>
            </DetailSection>
          ) : null}
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity style={s.okBtn} onPress={handleBack} activeOpacity={0.9}>
            <LinearGradient
              colors={COLORS.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.okBtnGrad}
            >
              <Text style={s.okBtnText}>C&apos;est compris</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerSpacer: { width: 42, height: 42 },
  scroll: { padding: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: 28, gap: SPACING.lg },
  heroCard: {
    borderRadius: 34,
    padding: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    boxShadow: '0 18px 40px rgba(0,0,0,0.28)',
  },
  heroPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
    backgroundColor: 'rgba(201,169,97,0.08)',
  },
  checkCircle: {
    width: 74, height: 74, borderRadius: 37, backgroundColor: '#B8F07A',
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md, alignSelf: 'center',
    boxShadow: '0 12px 30px rgba(10,10,15,0.28)',
  },
  title: { color: COLORS.textPrimary, fontSize: 32, fontFamily: FONTS.extraBold, textAlign: 'center' },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.medium,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: SPACING.xl,
  },
  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md, alignSelf: 'stretch',
    padding: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(201,169,97,0.08)',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  eventImg: { width: 68, height: 68, borderRadius: 22 },
  eventImgFallback: { backgroundColor: 'rgba(201,169,97,0.14)' },
  eventTitle: { color: COLORS.textPrimary, fontSize: FONTS.sizes.xl, fontFamily: FONTS.bold },
  eventDate: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium, marginTop: 2 },
  eventMeta: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.medium },
  accessBtn: {
    alignSelf: 'stretch', height: 58, borderRadius: 22, backgroundColor: COLORS.bg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  accessBtnText: { color: COLORS.primaryLight, fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  calBtn: {
    alignSelf: 'stretch', height: 58, borderRadius: 22, backgroundColor: COLORS.bgCard2,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calBtnText: { color: COLORS.textPrimary, fontSize: FONTS.sizes.base, fontFamily: FONTS.semiBold },
  sectionCard: {
    backgroundColor: '#15131A',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
    boxShadow: '0 16px 36px rgba(0,0,0,0.2)',
  },
  sectionHeader: {
    minHeight: 82,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontFamily: FONTS.semiBold,
  },
  sectionBody: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  sectionText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    lineHeight: 22,
  },
  ruleList: { gap: 14 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ruleText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    lineHeight: 21,
  },
  deliverablesBox: {
    marginTop: 4,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(201,169,97,0.08)',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  deliverablesTitle: {
    color: COLORS.primaryLight,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semiBold,
  },
  deliverableItem: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
  },
  locationCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(201,169,97,0.06)',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  locationSub: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
  },
  mapCard: {
    height: 180,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: COLORS.bgCard2,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    position: 'relative',
  },
  mapPreview: {
    width: '100%',
    height: '100%',
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(201,169,97,0.08)',
  },
  mapFallbackText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  mapBadge: {
    position: 'absolute',
    right: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
  },
  mapBadgeText: {
    color: COLORS.bg,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.semiBold,
  },
  footer: { padding: SPACING.lg },
  okBtn: { height: 58, borderRadius: RADIUS.full, overflow: 'hidden' },
  okBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  okBtnText: { color: COLORS.bg, fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
});
