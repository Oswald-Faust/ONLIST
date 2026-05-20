import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import GradientButton from '../../components/GradientButton';
import { useAuth } from '../../context/AuthContext';

const RECENT_EVENTS = [
  { id: '1', title: 'Skybar Exclusive', sub: 'Rooftop Lounge', img: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=200' },
  { id: '2', title: 'Le Club', sub: 'La Table Ronde', img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200' },
];

function ScoreStar({ score }) {
  const filled = Math.round(score / 2);
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Ionicons key={i} name={i <= filled ? 'star' : 'star-outline'} size={14} color={COLORS.gold} />
      ))}
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: logout },
    ]);
  };

  const formatFollowers = (n) => {
    if (!n) return '0';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
    return n.toString();
  };

  const coverImg = user?.photos?.[1] || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800';
  const avatarImg = user?.photos?.[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Cover */}
        <View style={styles.coverContainer}>
          <Image source={{ uri: coverImg }} style={styles.cover} />
          <LinearGradient colors={['transparent', COLORS.bg]} style={styles.coverGradient} />

          {/* Nav */}
          <SafeAreaView edges={['top']} style={styles.coverNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.navRight}>
              <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('EditProfile')}>
                <Ionicons name="create-outline" size={22} color={COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn}>
                <Ionicons name="settings-outline" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          {/* Avatar + infos */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {avatarImg
                ? <Image source={{ uri: avatarImg }} style={styles.avatar} />
                : (
                  <LinearGradient colors={COLORS.gradient} style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>{user?.name?.[0] || 'U'}</Text>
                  </LinearGradient>
                )
              }
              <View style={styles.onlineDot} />
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'Mon Profil'}</Text>
              <Text style={styles.profileType}>influenceur</Text>
              <View style={styles.socialRow}>
                {user?.instagram && (
                  <View style={styles.socialChip}>
                    <Ionicons name="logo-instagram" size={12} color={COLORS.white} />
                    <Text style={styles.socialChipText}>@{user.instagram.replace('@', '')}</Text>
                  </View>
                )}
                {user?.tiktok && (
                  <View style={styles.socialChip}>
                    <Ionicons name="logo-tiktok" size={12} color={COLORS.white} />
                    <Text style={styles.socialChipText}>@{user.tiktok.replace('@', '')}</Text>
                  </View>
                )}
                <View style={styles.vipBadge}>
                  <Text style={styles.vipText}>VIP</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <View style={styles.statIconBg}>
                <Ionicons name="flash" size={16} color={COLORS.primaryLight} />
              </View>
              <Text style={styles.statLabel}>Plasma</Text>
              <Text style={styles.statValue}>{user?.plasma || 24}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconBg}>
                <Ionicons name="people" size={16} color={COLORS.gold} />
              </View>
              <Text style={styles.statLabel}>Followers</Text>
              <Text style={styles.statValue}>{formatFollowers(user?.followersCount)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconBg}>
                <Ionicons name="star" size={16} color={COLORS.gold} />
              </View>
              <Text style={styles.statLabel}>Score</Text>
              <Text style={styles.statValue}>{user?.score?.toFixed(1) || '—'}/10</Text>
            </View>
          </View>

          {/* Score détaillé */}
          {user?.score > 0 && (
            <View style={styles.scoreCard}>
              <LinearGradient colors={['rgba(240,165,0,0.1)', 'rgba(240,165,0,0.02)']} style={styles.scoreGradient}>
                <View style={styles.scoreHeader}>
                  <Text style={styles.scoreTitle}>Ma note globale</Text>
                  <Text style={styles.scoreNumber}>{user.score}/10</Text>
                </View>
                <ScoreStar score={user.score} />
                <Text style={styles.scoreReviews}>{user.reviewsCount || 0} avis d'établissements</Text>
              </LinearGradient>
            </View>
          )}

          {/* Bio */}
          {user?.bio && (
            <View style={styles.bioSection}>
              <Text style={styles.sectionTitle}>À propos</Text>
              <Text style={styles.bioText}>{user.bio}</Text>
            </View>
          )}

          {/* Ville */}
          {user?.city && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={COLORS.primaryLight} />
              <Text style={styles.locationText}>{user.city}, {user.country || 'France'}</Text>
            </View>
          )}

          {/* Followers range */}
          {user?.followersCount && (
            <View style={styles.followersRange}>
              <Ionicons name="trending-up" size={14} color={COLORS.success} />
              <Text style={styles.followersRangeText}>
                {user.followersCount >= 100000 ? '100k+' : user.followersCount >= 10000 ? '10K - 50K' : '1K - 10K'}
              </Text>
            </View>
          )}

          {/* Activité récente */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Activité Récente</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyEvents')}>
                <Text style={styles.seeAll}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {RECENT_EVENTS.map(e => (
                <View key={e.id} style={styles.recentCard}>
                  <Image source={{ uri: e.img }} style={styles.recentImg} />
                  <LinearGradient colors={['transparent', 'rgba(8,8,16,0.9)']} style={StyleSheet.absoluteFill} />
                  <View style={styles.recentContent}>
                    <Text style={styles.recentTitle} numberOfLines={1}>{e.title}</Text>
                    <Text style={styles.recentSub} numberOfLines={1}>{e.sub}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('EditProfile')}>
              <View style={styles.actionLeft}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(123,47,190,0.15)' }]}>
                  <Ionicons name="person" size={18} color={COLORS.primaryLight} />
                </View>
                <Text style={styles.actionText}>Modifier mon profil</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRow}>
              <View style={styles.actionLeft}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(240,165,0,0.15)' }]}>
                  <Ionicons name="share-social" size={18} color={COLORS.gold} />
                </View>
                <Text style={styles.actionText}>Partager mon profil</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRow}>
              <View style={styles.actionLeft}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(16,217,160,0.15)' }]}>
                  <Ionicons name="help-circle" size={18} color={COLORS.success} />
                </View>
                <Text style={styles.actionText}>Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionRow, styles.actionRowLast]} onPress={handleLogout}>
              <View style={styles.actionLeft}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                  <Ionicons name="log-out" size={18} color={COLORS.error} />
                </View>
                <Text style={[styles.actionText, { color: COLORS.error }]}>Déconnexion</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  coverContainer: { height: 220, position: 'relative' },
  cover: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  coverNav: {
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
    backgroundColor: 'rgba(8,8,16,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  navRight: { flexDirection: 'row', gap: SPACING.sm },
  content: { padding: SPACING.lg },

  profileHeader: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg, marginTop: -30 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: COLORS.bg },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: COLORS.bg },
  avatarInitial: { color: COLORS.white, fontSize: FONTS.sizes.xl, fontFamily: 'Poppins_700Bold' },
  onlineDot: { position: 'absolute', bottom: 4, right: 4, width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.success, borderWidth: 2, borderColor: COLORS.bg },

  profileInfo: { flex: 1, justifyContent: 'flex-end', paddingBottom: 4 },
  profileName: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: 'Poppins_700Bold' },
  profileType: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: 6, fontFamily: 'Poppins_400Regular' },
  socialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  socialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.bgCard2,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  socialChipText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_400Regular' },
  vipBadge: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  vipText: { color: '#000', fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_800ExtraBold' },

  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statIconBg: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.bgCard2, alignItems: 'center', justifyContent: 'center' },
  statLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_400Regular' },
  statValue: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_700Bold' },
  statDivider: { width: 1, height: 40, backgroundColor: COLORS.border },

  scoreCard: { borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: SPACING.lg },
  scoreGradient: {
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(240,165,0,0.2)',
    borderRadius: RADIUS.md,
  },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  scoreTitle: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_600SemiBold' },
  scoreNumber: { color: COLORS.gold, fontSize: FONTS.sizes.md, fontFamily: 'Poppins_800ExtraBold' },
  scoreReviews: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 4, fontFamily: 'Poppins_400Regular' },

  bioSection: { marginBottom: SPACING.md },
  sectionTitle: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_700Bold', marginBottom: SPACING.sm },
  bioText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.base, lineHeight: 22, fontFamily: 'Poppins_400Regular' },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm },
  locationText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_400Regular' },

  followersRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.lg,
  },
  followersRangeText: { color: COLORS.success, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_600SemiBold' },

  section: { marginBottom: SPACING.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  seeAll: { color: COLORS.primaryLight, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_400Regular' },

  recentCard: {
    width: 140,
    height: 90,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginRight: SPACING.sm,
  },
  recentImg: { width: '100%', height: '100%' },
  recentContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.sm },
  recentTitle: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_600SemiBold' },
  recentSub: { color: COLORS.textSecondary, fontSize: 10, fontFamily: 'Poppins_400Regular' },

  actions: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  actionRowLast: { borderBottomWidth: 0 },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  actionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: COLORS.textPrimary, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_500Medium' },
});
