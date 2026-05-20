import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { eventsAPI, applicationsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function EventItem({ event, onPress, onManage }) {
  const date = event.date ? new Date(event.date) : null;
  const dateStr = date?.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

  return (
    <TouchableOpacity onPress={onPress} style={styles.eventItem} activeOpacity={0.9}>
      <View style={styles.eventItemLeft}>
        <View style={styles.dateBox}>
          <Text style={styles.dateBoxDay}>{date?.getDate() || '?'}</Text>
          <Text style={styles.dateBoxMonth}>{date?.toLocaleDateString('fr-FR', { month: 'short' }) || '—'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.eventItemTitle} numberOfLines={1}>{event.title}</Text>
          <Text style={styles.eventItemSub}>{event.city} • {event.category}</Text>
          <View style={styles.eventItemStats}>
            <View style={styles.miniStat}>
              <Ionicons name="people" size={12} color={COLORS.textMuted} />
              <Text style={styles.miniStatText}>{event.acceptedCount || 0}/{event.maxParticipants || '∞'}</Text>
            </View>
          </View>
        </View>
      </View>
      <TouchableOpacity onPress={() => onManage(event)} style={styles.manageBtn}>
        <Text style={styles.manageBtnText}>Gérer</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function BusinessHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const data = await eventsAPI.myEvents();
      const myEvents = data.events || [];
      setEvents(myEvents);

      // Compter les candidatures en attente
      let total = 0;
      await Promise.all(
        myEvents.slice(0, 5).map(async (e) => {
          try {
            const appData = await applicationsAPI.eventApplications(e._id);
            total += (appData.applications || []).filter(a => a.status === 'pending').length;
          } catch {}
        })
      );
      setPendingCount(total);
    } catch (err) {
      console.log('Business home error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
      >
        {/* Header */}
        <LinearGradient colors={['rgba(240,165,0,0.12)', 'transparent']} style={styles.headerGrad}>
          <SafeAreaView edges={['top']}>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerSub}>Tableau de bord</Text>
                <Text style={styles.headerTitle}>{user?.businessName || user?.name}</Text>
              </View>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                <Ionicons name="log-out-outline" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Type badge */}
            <View style={styles.typeBadge}>
              <Ionicons name="storefront" size={12} color={COLORS.gold} />
              <Text style={styles.typeText}>{user?.businessType || 'Établissement'}</Text>
              <Text style={styles.typeDivider}>•</Text>
              <Text style={styles.typeText}>{user?.businessCity || user?.city || 'France'}</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.content}>
          {/* Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <LinearGradient colors={['rgba(123,47,190,0.2)', 'rgba(123,47,190,0.05)']} style={styles.statGradient}>
                <Text style={styles.statNum}>{events.length}</Text>
                <Text style={styles.statLabel}>Événements</Text>
                <Ionicons name="calendar" size={24} color={COLORS.primaryLight} style={styles.statIcon} />
              </LinearGradient>
            </View>
            <View style={styles.statCard}>
              <LinearGradient colors={['rgba(240,165,0,0.2)', 'rgba(240,165,0,0.05)']} style={styles.statGradient}>
                <Text style={[styles.statNum, { color: COLORS.warning }]}>{pendingCount}</Text>
                <Text style={styles.statLabel}>En attente</Text>
                <Ionicons name="hourglass" size={24} color={COLORS.warning} style={styles.statIcon} />
              </LinearGradient>
            </View>
          </View>

          {/* Actions rapides */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.qaBtn}
              onPress={() => navigation.navigate('CreateEvent')}
            >
              <LinearGradient colors={COLORS.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.qaBtnGrad}>
                <Ionicons name="add-circle" size={22} color={COLORS.white} />
                <Text style={styles.qaBtnText}>Créer un événement</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.qaBtn, styles.qaBtnOutline]}
              onPress={() => navigation.navigate('InfluencerList')}
            >
              <Ionicons name="people" size={22} color={COLORS.primaryLight} />
              <Text style={[styles.qaBtnText, { color: COLORS.primaryLight }]}>Influenceurs</Text>
            </TouchableOpacity>
          </View>

          {/* Mes événements */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mes événements</Text>
            {loading ? (
              <ActivityIndicator color={COLORS.primaryLight} style={{ marginTop: SPACING.xl }} />
            ) : events.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Aucun événement créé</Text>
                <TouchableOpacity onPress={() => navigation.navigate('CreateEvent')}>
                  <Text style={styles.emptyLink}>Créer votre premier événement →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              events.map(e => (
                <EventItem
                  key={e._id}
                  event={e}
                  onPress={() => navigation.navigate('ManageEvent', { event: e })}
                  onManage={(ev) => navigation.navigate('ManageEvent', { event: ev })}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  headerGrad: { paddingBottom: SPACING.md },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  headerSub: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_400Regular' },
  headerTitle: { color: COLORS.white, fontSize: FONTS.sizes.xl, fontFamily: 'Poppins_800ExtraBold' },
  logoutBtn: { padding: 8, marginTop: 4 },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  typeText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, textTransform: 'capitalize', fontFamily: 'Poppins_400Regular' },
  typeDivider: { color: COLORS.textMuted },

  content: { padding: SPACING.lg },
  statsGrid: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  statCard: { flex: 1, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  statGradient: { padding: SPACING.md, position: 'relative', minHeight: 90 },
  statNum: { color: COLORS.white, fontSize: FONTS.sizes.xxl, fontFamily: 'Poppins_800ExtraBold' },
  statLabel: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_400Regular' },
  statIcon: { position: 'absolute', bottom: SPACING.sm, right: SPACING.sm, opacity: 0.5 },

  quickActions: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xl },
  qaBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qaBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 12,
    paddingHorizontal: SPACING.sm,
  },
  qaBtnOutline: {
    backgroundColor: COLORS.bgCard,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 12,
    paddingHorizontal: SPACING.sm,
  },
  qaBtnText: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_600SemiBold' },

  section: { marginBottom: SPACING.xl },
  sectionTitle: { color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: 'Poppins_700Bold', marginBottom: SPACING.md },

  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eventItemLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  dateBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateBoxDay: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_800ExtraBold', lineHeight: 20 },
  dateBoxMonth: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, textTransform: 'uppercase', fontFamily: 'Poppins_400Regular' },
  eventItemTitle: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_600SemiBold' },
  eventItemSub: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, textTransform: 'capitalize', fontFamily: 'Poppins_400Regular' },
  eventItemStats: { flexDirection: 'row', gap: SPACING.md, marginTop: 2 },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  miniStatText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_400Regular' },
  manageBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  manageBtnText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_600SemiBold' },

  empty: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm },
  emptyText: { color: COLORS.textMuted, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_400Regular' },
  emptyLink: { color: COLORS.primaryLight, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_500Medium' },
});
