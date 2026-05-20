import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  StatusBar, Alert, Share, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../constants/theme';
import GradientButton from '../../components/GradientButton';
import { eventsAPI, applicationsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const { height } = Dimensions.get('window');

const PLACEHOLDER_IMGS = [
  'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80',
  'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&q=80',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
];

export default function EventDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const eventParam = route.params?.event;
  const [event, setEvent] = useState(eventParam);
  const [loading, setLoading] = useState(!eventParam);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (eventParam?._id) loadEvent(eventParam._id);
  }, [eventParam?._id]);

  const loadEvent = async (id) => {
    try {
      const data = await eventsAPI.get(id);
      setEvent(data.event);
    } catch (err) {
      console.log('Event detail error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (applied) return;
    Alert.alert(
      'Postuler à cet événement',
      `Vous souhaitez postuler pour "${event.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Postuler',
          onPress: async () => {
            setApplying(true);
            try {
              await applicationsAPI.apply({ eventId: event._id });
              setApplied(true);
              Alert.alert('🎉 Candidature envoyée !', 'L\'établissement examinera votre profil. Vous serez notifié de leur réponse dans "Mes événements".');
            } catch (err) {
              Alert.alert('Erreur', err.message);
            } finally {
              setApplying(false);
            }
          }
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Découvrez "${event?.title}" sur ONLIST !` });
    } catch {}
  };

  if (loading || !event) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={COLORS.primaryLight} size="large" />
      </View>
    );
  }

  const imgUri = event.images?.[0] || PLACEHOLDER_IMGS[Math.floor(Math.random() * PLACEHOLDER_IMGS.length)];
  const dateObj = event.date ? new Date(event.date) : null;
  const dateFormatted = dateObj?.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const timeFormatted = dateObj?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const cutoff = event.cutoffTime ? new Date(event.cutoffTime) : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: imgUri }} style={styles.hero} />
          <LinearGradient
            colors={['rgba(8,8,16,0.3)', 'transparent', 'rgba(8,8,16,0.9)']}
            style={StyleSheet.absoluteFill}
          />

          {/* Nav buttons */}
          <SafeAreaView edges={['top']} style={styles.navRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.navRight}>
              <TouchableOpacity onPress={handleShare} style={styles.navBtn}>
                <Ionicons name="share-outline" size={22} color={COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn}>
                <Ionicons name="heart-outline" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Badge sponsorisé */}
          {event.isSponsored && (
            <View style={styles.premiumBadge}>
              <Ionicons name="diamond" size={12} color="#000" />
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          )}

          {/* Titre overlay */}
          <View style={styles.heroBottom}>
            <View style={styles.catBadge}>
              <Text style={styles.catText}>{event.category || 'event'}</Text>
            </View>
            <Text style={styles.heroTitle}>{event.title}</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Info cards */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Ionicons name="calendar" size={20} color={COLORS.primaryLight} />
              <View>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{dateFormatted || 'TBD'}</Text>
              </View>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="time" size={20} color={COLORS.gold} />
              <View>
                <Text style={styles.infoLabel}>Heure</Text>
                <Text style={styles.infoValue}>{timeFormatted || 'TBD'}</Text>
              </View>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="location" size={20} color={COLORS.secondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Lieu</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{event.venue || event.city}</Text>
              </View>
            </View>
            {event.maxParticipants && (
              <View style={styles.infoCard}>
                <Ionicons name="people" size={20} color={COLORS.success} />
                <View>
                  <Text style={styles.infoLabel}>Places</Text>
                  <Text style={styles.infoValue}>{event.acceptedCount || 0}/{event.maxParticipants}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Organisateur */}
          {event.creator && (
            <View style={styles.organizerCard}>
              <LinearGradient colors={['rgba(123,47,190,0.15)', 'rgba(233,30,140,0.08)']} style={styles.organizerGradient}>
                <View style={styles.organizerAvatar}>
                  <Text style={styles.organizerAvatarText}>
                    {(event.creator.businessName || event.creator.name || '?')[0]}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.organizerName}>{event.creator.businessName || event.creator.name}</Text>
                  <Text style={styles.organizerType}>{event.creator.businessType || 'Établissement'} • {event.creator.city || event.city}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </LinearGradient>
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>

          {/* Offre */}
          {event.offer && (
            <View style={styles.offerCard}>
              <LinearGradient colors={['rgba(240,165,0,0.15)', 'rgba(240,165,0,0.05)']} style={styles.offerGradient}>
                <Ionicons name="gift" size={22} color={COLORS.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.offerLabel}>Ce que vous obtenez</Text>
                  <Text style={styles.offerText}>{event.offer}</Text>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Exigences */}
          {event.requirements && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profil recherché</Text>
              <Text style={styles.description}>{event.requirements}</Text>
            </View>
          )}

          {/* Deadline candidature */}
          {cutoff && (
            <View style={styles.deadlineCard}>
              <Ionicons name="alert-circle" size={16} color={COLORS.warning} />
              <Text style={styles.deadlineText}>
                Candidature avant le {cutoff.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} à {cutoff.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bouton Postuler fixe */}
      {user?.type === 'influencer' && (
        <View style={styles.bottomBar}>
          <SafeAreaView edges={['bottom']}>
            <GradientButton
              title={applied ? '✓ Candidature envoyée' : 'Postuler →'}
              onPress={handleApply}
              loading={applying}
              variant={applied ? 'outline' : 'primary'}
            />
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  heroContainer: { height: height * 0.45, position: 'relative' },
  hero: { width: '100%', height: '100%', resizeMode: 'cover' },
  navRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(8,8,16,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  navRight: { flexDirection: 'row', gap: SPACING.sm },
  premiumBadge: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 40,
  },
  premiumText: { color: '#000', fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_700Bold' },
  heroBottom: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: SPACING.lg,
    right: SPACING.lg,
  },
  catBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(123,47,190,0.5)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  catText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_600SemiBold', textTransform: 'capitalize' },
  heroTitle: { color: COLORS.white, fontSize: FONTS.sizes.xxl, fontFamily: 'Poppins_800ExtraBold', lineHeight: 34 },

  content: { padding: SPACING.lg },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    width: '47%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_400Regular' },
  infoValue: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_600SemiBold' },

  organizerCard: { borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: SPACING.lg },
  organizerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(123,47,190,0.25)',
    borderRadius: RADIUS.md,
  },
  organizerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerAvatarText: { color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: 'Poppins_700Bold' },
  organizerName: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_600SemiBold' },
  organizerType: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, textTransform: 'capitalize', fontFamily: 'Poppins_400Regular' },

  section: { marginBottom: SPACING.lg },
  sectionTitle: { color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: 'Poppins_700Bold', marginBottom: SPACING.sm },
  description: { color: COLORS.textSecondary, fontSize: FONTS.sizes.base, lineHeight: 24, fontFamily: 'Poppins_400Regular' },

  offerCard: { borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: SPACING.lg },
  offerGradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(240,165,0,0.25)',
    borderRadius: RADIUS.md,
  },
  offerLabel: { color: COLORS.gold, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_600SemiBold', marginBottom: 4 },
  offerText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.base, lineHeight: 22, fontFamily: 'Poppins_400Regular' },

  deadlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
  },
  deadlineText: { color: COLORS.warning, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_500Medium', flex: 1 },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(8,8,16,0.95)',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
});
