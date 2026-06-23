import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Image, FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { eventsAPI, lieuxAPI } from '../../services/api';

function EventRow({ item, navigation }) {
  const date = item?.date ? new Date(item.date) : null;
  const dateLabel = date
    ? date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Date à définir';

  return (
    <TouchableOpacity
      style={s.eventCard}
      activeOpacity={0.88}
      onPress={() => navigation.navigate('BusinessEventDetail', { eventId: item._id })}
    >
      <View style={s.eventThumb}>
        {item?.images?.[0] ? (
          <Image source={{ uri: item.images[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient colors={['rgba(201,169,97,0.18)', 'rgba(201,169,97,0.04)']} style={StyleSheet.absoluteFill} />
        )}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.eventTitle} numberOfLines={1}>{item.title || 'Événement'}</Text>
        <Text style={s.eventMeta}>{dateLabel}</Text>
        <Text style={s.eventMeta}>{item.acceptedCount || 0}/{item.maxParticipants || 0} influenceurs</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

export default function BusinessLieuDetailScreen({ route, navigation }) {
  const lieuId = route.params?.lieuId;
  const initialLieu = route.params?.lieu || null;
  const [lieu, setLieu] = useState(initialLieu);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [lieuData, eventsData] = await Promise.all([
        lieuxAPI.get(lieuId),
        eventsAPI.myEvents(lieuId),
      ]);
      setLieu(lieuData?.lieu || null);
      setEvents(eventsData?.events || []);
    } finally {
      setLoading(false);
    }
  }, [lieuId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <View style={[s.container, s.center]}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  }

  if (!lieu) {
    return <View style={[s.container, s.center]}><Text style={s.emptyText}>Lieu introuvable</Text></View>;
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#0A0A0F', '#0E0D0B']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity style={s.editBtn} onPress={() => navigation.navigate('CreateLieu', { lieu })}>
            <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={events}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.content}
          ListHeaderComponent={(
            <View>
              <View style={s.hero}>
                {lieu?.photos?.[0] ? (
                  <Image source={{ uri: lieu.photos[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <LinearGradient colors={['rgba(201,169,97,0.18)', 'rgba(201,169,97,0.04)']} style={StyleSheet.absoluteFill} />
                )}
                <LinearGradient colors={['transparent', 'rgba(10,10,15,0.92)']} style={StyleSheet.absoluteFill} />
                <View style={s.heroBody}>
                  <Text style={s.heroTitle}>{lieu.name}</Text>
                  <Text style={s.heroSub}>{[lieu.address, lieu.city].filter(Boolean).join(', ')}</Text>
                </View>
              </View>

              <View style={s.summaryCard}>
                <Text style={s.summaryTitle}>Événements créés ici</Text>
                <Text style={s.summaryMeta}>{events.length} événement{events.length !== 1 ? 's' : ''}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<View style={s.emptyWrap}><Text style={s.emptyText}>Aucun événement créé pour ce lieu</Text></View>}
          renderItem={({ item }) => <EventRow item={item} navigation={navigation} />}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
  },
  editBtn: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(201,169,97,0.12)', borderWidth: 1, borderColor: COLORS.borderLight,
  },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: 120, gap: SPACING.md },
  hero: { height: 220, borderRadius: RADIUS.xl, overflow: 'hidden', position: 'relative', marginBottom: SPACING.md },
  heroBody: { flex: 1, justifyContent: 'flex-end', padding: SPACING.lg },
  heroTitle: { color: COLORS.white, fontSize: FONTS.sizes.xxl, fontFamily: FONTS.bold },
  heroSub: { color: COLORS.textSecondary, fontSize: FONTS.sizes.base, fontFamily: FONTS.medium, marginTop: 4 },
  summaryCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, marginBottom: SPACING.md,
  },
  summaryTitle: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  summaryMeta: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, marginTop: 4 },
  eventCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md,
  },
  eventThumb: { width: 64, height: 64, borderRadius: 18, overflow: 'hidden', backgroundColor: COLORS.bgCard2 },
  eventTitle: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  eventMeta: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular },
  emptyWrap: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyText: { color: COLORS.textMuted, fontSize: FONTS.sizes.base, fontFamily: FONTS.regular },
});
