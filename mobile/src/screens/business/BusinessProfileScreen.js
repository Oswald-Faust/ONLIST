import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Alert, ScrollView, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { eventsAPI, lieuxAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const CATEGORY_LABELS = {
  restaurant: 'Restaurant', bar: 'Bar', club: 'Club', spa: 'Spa',
  sport: 'Sport', wellness: 'Wellness', premium: 'Premium', other: 'Autre',
};

export default function BusinessProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState({ events: 0, lieux: 0, applications: 0, avgScore: 0, totalReviews: 0 });

  useFocusEffect(useCallback(() => {
    Promise.all([eventsAPI.myEvents(), lieuxAPI.mine()])
      .then(([evData, lieuData]) => {
        const lieux = lieuData.lieux || [];
        const ratedLieux = lieux.filter((lieu) => (lieu.reviewsCount || 0) > 0);
        const avgScore = ratedLieux.length
          ? ratedLieux.reduce((sum, lieu) => sum + (lieu.score || 0), 0) / ratedLieux.length
          : 0;
        setStats({
          events: evData.events?.length || 0,
          lieux: lieux.length || 0,
          applications: (evData.events || []).reduce((acc, e) => acc + (e.acceptedCount || 0), 0),
          avgScore: Math.round(avgScore * 10) / 10,
          totalReviews: lieux.reduce((sum, lieu) => sum + (lieu.reviewsCount || 0), 0),
        });
      })
      .catch(() => {});
  }, []));

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnecter", style: "destructive", onPress: () => logout() },
    ]);
  };

  const initials = (user?.businessName || user?.name || "?").slice(0, 2).toUpperCase();
  const catLabel = CATEGORY_LABELS[user?.businessType] || user?.businessType || "";

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={["#0A0A0F", "#0E0D0B"]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 100 }]}>

          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTitle}>Profil</Text>
          </View>

          {/* Profile card */}
          <View style={s.profileCard}>
            <LinearGradient colors={["rgba(201,169,97,0.15)", "rgba(201,169,97,0.03)"]} style={StyleSheet.absoluteFill} />
            <View style={s.avatarWrap}>
              {user?.photos && user.photos.length > 0 ? (
                <Image source={{ uri: user.photos[0] }} style={s.avatarImg} />
              ) : (
                <LinearGradient colors={COLORS.gradient} style={s.avatarGrad}>
                  <Text style={s.avatarText}>{initials}</Text>
                </LinearGradient>
              )}
            </View>
            <Text style={s.businessName}>{user?.businessName || user?.name || "—"}</Text>
            {catLabel ? (
              <View style={s.catBadge}>
                <Text style={s.catBadgeText}>{catLabel}</Text>
              </View>
            ) : null}
            {user?.businessCity ? (
              <View style={s.locationRow}>
                <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
                <Text style={s.locationText}>{user.businessCity}</Text>
              </View>
            ) : null}
            {user?.email ? (
              <View style={s.locationRow}>
                <Ionicons name="mail-outline" size={13} color={COLORS.textMuted} />
                <Text style={s.locationText}>{user.email}</Text>
              </View>
            ) : null}
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statValue}>{stats.events}</Text>
              <Text style={s.statLabel}>Événements</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statValue}>{stats.lieux}</Text>
              <Text style={s.statLabel}>Lieux</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statValue}>{stats.applications}</Text>
              <Text style={s.statLabel}>Acceptés</Text>
            </View>
          </View>

          <View style={s.scoreCard}>
            <View style={s.scoreLeft}>
              <Text style={s.scoreValue}>{stats.avgScore > 0 ? stats.avgScore.toFixed(1) : '—'}</Text>
              <Text style={s.scoreUnit}>/10</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.scoreTitle}>Score établissement</Text>
              <Text style={s.scoreSubtitle}>
                {stats.totalReviews > 0
                  ? `${stats.totalReviews} avis influenceur${stats.totalReviews > 1 ? 's' : ''} sur vos lieux`
                  : 'Pas encore de note sur vos lieux'}
              </Text>
            </View>
          </View>

          {/* Menu */}
          <View style={s.menuCard}>
            {[
              { icon: "create-outline", label: "Modifier mon profil", onPress: () => navigation.navigate("BusinessEditProfile") },
              { icon: "settings-outline", label: "Paramètres", onPress: () => navigation.navigate("BusinessSettings") },
              { icon: "business-outline", label: "Mes lieux", onPress: () => navigation.navigate("Lieux") },
              { icon: "calendar-outline", label: "Mes événements", onPress: () => navigation.navigate("Events") },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={[s.menuRow, i > 0 && { borderTopWidth: 1, borderTopColor: COLORS.border }]} onPress={item.onPress}>
                <View style={s.menuRowLeft}>
                  <View style={s.menuIcon}>
                    <Ionicons name={item.icon} size={18} color={COLORS.primary} />
                  </View>
                  <Text style={s.menuLabel}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#F87171" />
            <Text style={s.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  header: { paddingTop: SPACING.sm, paddingBottom: SPACING.lg },
  headerTitle: { color: COLORS.white, fontSize: FONTS.sizes.xl, fontFamily: FONTS.bold },

  profileCard: {
    borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border,
    alignItems: "center", padding: SPACING.xl, marginBottom: SPACING.md,
    overflow: "hidden", gap: 8,
  },
  avatarWrap: { width: 80, height: 80, borderRadius: 40, overflow: "hidden", marginBottom: 4 },
  avatarImg: { width: "100%", height: "100%" },
  avatarGrad: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#0A0A0F", fontSize: FONTS.sizes.xl, fontFamily: FONTS.bold },
  businessName: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold, textAlign: "center" },
  catBadge: {
    backgroundColor: "rgba(201,169,97,0.1)", borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 4,
  },
  catBadgeText: { color: COLORS.primary, fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  locationText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular },

  statsRow: {
    flexDirection: "row", backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md, padding: SPACING.md,
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { color: COLORS.white, fontSize: FONTS.sizes.xl, fontFamily: FONTS.bold },
  statLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  statDivider: { width: 1, backgroundColor: COLORS.border },

  scoreCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.md,
  },
  scoreLeft: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  scoreValue: { color: COLORS.primary, fontSize: FONTS.sizes.xxl, fontFamily: FONTS.bold },
  scoreUnit: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, paddingBottom: 4 },
  scoreTitle: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold, marginBottom: 4 },
  scoreSubtitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },

  menuCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md, overflow: "hidden",
  },
  menuRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: SPACING.md },
  menuRowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(201,169,97,0.08)",
    borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center",
  },
  menuLabel: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.medium },

  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "rgba(248,113,113,0.08)", borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: "rgba(248,113,113,0.2)", padding: SPACING.md,
  },
  logoutText: { color: "#F87171", fontSize: FONTS.sizes.base, fontFamily: FONTS.semiBold },
});
