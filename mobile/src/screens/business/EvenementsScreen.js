import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Alert, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { eventsAPI } from '../../services/api';

const MOMENT_LABELS = { morning: 'Matin', afternoon: 'Après-midi', evening: 'Soir', night: 'Nuit' };
const CATEGORY_LABELS = {
  restaurant: 'Restaurant', bar: 'Bar', club: 'Club', spa: 'Spa',
  sport: 'Sport', wellness: 'Wellness', premium: 'Premium', other: 'Autre',
};

function EventCard({ event, navigation }) {
  const isActive = event.isActive;
  const date = event.date ? new Date(event.date) : null;
  const dateStr = date
    ? date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => navigation.navigate('BusinessEventDetail', { eventId: event._id })}
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
        <View style={[styles.statusBadge, { backgroundColor: isActive ? 'rgba(16,217,160,0.15)' : 'rgba(245,158,11,0.15)' }]}>
          <View style={[styles.statusDot, { backgroundColor: isActive ? COLORS.success : COLORS.warning }]} />
          <Text style={[styles.statusText, { color: isActive ? COLORS.success : COLORS.warning }]}>
            {isActive ? 'Publié' : 'Brouillon'}
          </Text>
        </View>

        {event.isSponsored && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={10} color="#0A0A0F" />
            <Text style={styles.premiumText}>Premium</Text>
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
          <TouchableOpacity
            style={styles.actionSecondary}
            onPress={() => navigation.navigate('CreateEvent', { eventToDuplicate: event })}
          >
            <Ionicons name="copy-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.actionSecondaryText}>Dupliquer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function EvenementsScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const load = async () => {
    try {
      const data = await eventsAPI.myEvents();
      setEvents(data.events || []);
    } catch (err) {
      console.log('Erreur chargement events:', err.message);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
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
            <Text style={styles.headerSub}>{events.length} événement{events.length !== 1 ? 's' : ''}</Text>
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

        <FlatList
          data={events}
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
              <Text style={styles.emptySub}>Créez votre premier événement pour commencer à recevoir des candidatures.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('CreateEvent')}>
                <LinearGradient colors={COLORS.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.emptyBtnGrad}>
                  <Text style={styles.emptyBtnText}>Créer un événement</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => <EventCard event={item} navigation={navigation} />}
        />
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
});
