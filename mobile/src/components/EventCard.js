import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '../constants/theme';

const CATEGORY_ICONS = {
  restaurant: 'restaurant',
  bar: 'wine',
  club: 'musical-notes',
  spa: 'flower',
  sport: 'fitness',
  wellness: 'heart',
  premium: 'diamond',
  other: 'star',
};

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600',
  'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=600',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600',
  'https://images.unsplash.com/photo-1519671282429-b44b4845bb10?w=600',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600',
];

export default function EventCard({ event, onPress, style }) {
  const imgUri = event.images?.[0] || PLACEHOLDER_IMAGES[Math.floor(Math.random() * PLACEHOLDER_IMAGES.length)];
  const date = event.date ? new Date(event.date) : null;
  const dateStr = date
    ? date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    : '';
  const timeStr = date
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';
  const iconName = CATEGORY_ICONS[event.category] || 'star';

  return (
    <TouchableOpacity onPress={onPress} style={[styles.card, SHADOW.card, style]} activeOpacity={0.92}>
      <Image source={{ uri: imgUri }} style={styles.image} />
      <LinearGradient
        colors={['transparent', 'rgba(8,8,16,0.92)']}
        style={styles.overlay}
      />

      {event.isSponsored && (
        <View style={styles.sponsoredBadge}>
          <Text style={styles.sponsoredText}>Premium</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.categoryRow}>
          <View style={styles.categoryBadge}>
            <Ionicons name={iconName} size={11} color={COLORS.gold} />
            <Text style={styles.categoryText}>{event.category || 'event'}</Text>
          </View>
          {dateStr && (
            <View style={styles.dateBadge}>
              <Ionicons name="calendar-outline" size={10} color={COLORS.textSecondary} />
              <Text style={styles.dateText}>{dateStr}</Text>
            </View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

        <View style={styles.footer}>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.location} numberOfLines={1}>
              {event.venue || event.city}
            </Text>
          </View>
          {timeStr && (
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
              <Text style={styles.timeText}>{timeStr}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function EventCardSmall({ event, onPress }) {
  const imgUri = event.images?.[0] || PLACEHOLDER_IMAGES[0];
  const date = event.date ? new Date(event.date) : null;
  const dateStr = date ? date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '';

  return (
    <TouchableOpacity onPress={onPress} style={styles.smallCard} activeOpacity={0.9}>
      <Image source={{ uri: imgUri }} style={styles.smallImage} />
      <LinearGradient colors={['transparent', 'rgba(8,8,16,0.95)']} style={styles.smallOverlay} />
      <View style={styles.smallContent}>
        <Text style={styles.smallTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.smallSub}>{dateStr} • {event.city}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.bgCard,
    marginBottom: SPACING.md,
  },
  image: { width: '100%', height: 220 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    top: '30%',
  },
  sponsoredBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sponsoredText: { color: '#000', fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_700Bold' },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(240,165,0,0.15)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(240,165,0,0.3)',
  },
  categoryText: { color: COLORS.gold, fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_600SemiBold', textTransform: 'capitalize' },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dateText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_400Regular' },
  title: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 8,
    lineHeight: 26,
  },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  location: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_400Regular', flex: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_400Regular' },

  // Small card
  smallCard: {
    width: 180,
    height: 120,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginRight: SPACING.sm,
  },
  smallImage: { width: '100%', height: '100%' },
  smallOverlay: { ...StyleSheet.absoluteFillObject, top: '40%' },
  smallContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.sm,
  },
  smallTitle: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_600SemiBold', marginBottom: 2 },
  smallSub: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_400Regular' },
});
