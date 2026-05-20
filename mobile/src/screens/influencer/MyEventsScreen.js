import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Image, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { applicationsAPI } from '../../services/api';

const TABS = [
  { id: '', label: 'Tout', count: 0 },
  { id: 'pending', label: 'En attente', count: 0 },
  { id: 'accepted', label: 'Acceptées', count: 0 },
  { id: 'rejected', label: 'Refusées', count: 0 },
];

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: COLORS.warning, icon: 'hourglass', bg: 'rgba(245,158,11,0.12)' },
  accepted: { label: 'Accepté ✓', color: COLORS.success, icon: 'checkmark-circle', bg: 'rgba(16,217,160,0.12)' },
  rejected: { label: 'Refusé', color: COLORS.error, icon: 'close-circle', bg: 'rgba(239,68,68,0.12)' },
};

const PLACEHOLDER = 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400';

function ApplicationCard({ item, onPress }) {
  const event = item.event;
  const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
  const img = event?.images?.[0] || PLACEHOLDER;
  const date = event?.date ? new Date(event.date) : null;
  const dateStr = date?.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  const isInvitation = item.isInvitation;

  return (
    <TouchableOpacity onPress={onPress} style={styles.appCard} activeOpacity={0.9}>
      <Image source={{ uri: img }} style={styles.appImg} />
      <View style={styles.appContent}>
        <View style={styles.appHeader}>
          {isInvitation && (
            <View style={styles.inviteBadge}>
              <Ionicons name="mail" size={10} color={COLORS.primaryLight} />
              <Text style={styles.inviteText}>Invitation</Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.appTitle} numberOfLines={1}>{event?.title || 'Événement'}</Text>
        <View style={styles.appMeta}>
          <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.appMetaText} numberOfLines={1}>{event?.venue || event?.city || '—'}</Text>
        </View>
        {dateStr && (
          <View style={styles.appMeta}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.appMetaText}>{dateStr}</Text>
          </View>
        )}
        <Text style={styles.appliedAt}>
          Postulé le {new Date(item.appliedAt).toLocaleDateString('fr-FR')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MyEventsScreen({ navigation }) {
  const [tab, setTab] = useState('');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [counts, setCounts] = useState({ pending: 0, accepted: 0, rejected: 0 });

  const fetchApplications = useCallback(async () => {
    try {
      const params = tab ? { status: tab } : {};
      const data = await applicationsAPI.myApplications(params);
      setApplications(data.applications || []);

      if (!tab) {
        const all = data.applications || [];
        setCounts({
          pending: all.filter(a => a.status === 'pending').length,
          accepted: all.filter(a => a.status === 'accepted').length,
          rejected: all.filter(a => a.status === 'rejected').length,
        });
      }
    } catch (err) {
      console.log('MyEvents error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => { setLoading(true); fetchApplications(); }, [tab]);

  const onRefresh = () => { setRefreshing(true); fetchApplications(); };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mes Événements</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{applications.length}</Text>
          </View>
        </View>

        {/* Stats rapides */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: COLORS.warning }]}>{counts.pending}</Text>
            <Text style={styles.statLabel}>En attente</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: COLORS.success }]}>{counts.accepted}</Text>
            <Text style={styles.statLabel}>Acceptées</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: COLORS.error }]}>{counts.rejected}</Text>
            <Text style={styles.statLabel}>Refusées</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {[
            { id: '', label: 'Tout' },
            { id: 'pending', label: 'En attente' },
            { id: 'accepted', label: 'Acceptées' },
            { id: 'rejected', label: 'Refusées' },
          ].map(t => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[styles.tabItem, tab === t.id && styles.tabItemActive]}
            >
              <Text style={[styles.tabLabel, tab === t.id && styles.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primaryLight} size="large" />
        </View>
      ) : (
        <FlatList
          data={applications}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <ApplicationCard
              item={item}
              onPress={() => navigation.navigate('EventDetail', { event: item.event })}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryLight} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={56} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Aucune candidature</Text>
              <Text style={styles.emptyText}>Explorez les événements et postulez !</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Explore')} style={styles.exploreBtn}>
                <LinearGradient colors={COLORS.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.exploreBtnGrad}>
                  <Text style={styles.exploreBtnText}>Explorer les événements</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  safe: { backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: 'Poppins_700Bold' },
  headerBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  headerBadgeText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_700Bold' },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statCard: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: FONTS.sizes.xl, fontFamily: 'Poppins_800ExtraBold' },
  statLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 2, fontFamily: 'Poppins_400Regular' },
  statDivider: { width: 1, height: 36, backgroundColor: COLORS.border },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  tabItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabItemActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryLight },
  tabLabel: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_500Medium' },
  tabLabelActive: { color: COLORS.white },

  list: { paddingHorizontal: SPACING.lg, paddingBottom: 120 },
  appCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  appImg: { width: 90, height: 110 },
  appContent: { flex: 1, padding: SPACING.sm },
  appHeader: { flexDirection: 'row', gap: SPACING.xs, marginBottom: 4, flexWrap: 'wrap' },
  inviteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(168,85,247,0.15)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
  },
  inviteText: { color: COLORS.primaryLight, fontSize: 10, fontFamily: 'Poppins_600SemiBold' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusText: { fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_600SemiBold' },
  appTitle: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_700Bold', marginBottom: 4 },
  appMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  appMetaText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, flex: 1, fontFamily: 'Poppins_400Regular' },
  appliedAt: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginTop: 4, fontFamily: 'Poppins_400Regular' },

  empty: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.md },
  emptyTitle: { color: COLORS.textPrimary, fontSize: FONTS.sizes.lg, fontFamily: 'Poppins_700Bold' },
  emptyText: { color: COLORS.textMuted, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_400Regular' },
  exploreBtn: { borderRadius: RADIUS.full, overflow: 'hidden', marginTop: SPACING.sm },
  exploreBtnGrad: { paddingHorizontal: SPACING.xl, paddingVertical: 12, borderRadius: RADIUS.full },
  exploreBtnText: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_600SemiBold' },
});
