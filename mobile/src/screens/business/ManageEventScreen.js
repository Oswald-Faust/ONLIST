import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Image, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { applicationsAPI } from '../../services/api';

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: COLORS.warning, bg: 'rgba(245,158,11,0.12)' },
  accepted: { label: 'Accepté', color: COLORS.success, bg: 'rgba(16,217,160,0.12)' },
  rejected: { label: 'Refusé', color: COLORS.error, bg: 'rgba(239,68,68,0.12)' },
};

function CandidateCard({ item, onAccept, onReject }) {
  const user = item.user;
  const status = STATUS_CONFIG[item.status];
  const [acting, setActing] = useState(false);

  const handle = async (action) => {
    setActing(true);
    try { await action(); }
    catch (err) { Alert.alert('Erreur', err.message); }
    finally { setActing(false); }
  };

  const formatFollowers = (n) => {
    if (!n) return '0';
    if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n/1000).toFixed(0)}k`;
    return n.toString();
  };

  return (
    <View style={styles.card}>
      {/* Avatar */}
      <View style={styles.cardTop}>
        <View style={styles.candidateInfo}>
          <View style={styles.candidateAvatar}>
            {user?.photos?.[0]
              ? <Image source={{ uri: user.photos[0] }} style={styles.avatarImg} />
              : (
                <LinearGradient colors={COLORS.gradient} style={styles.avatarGrad}>
                  <Text style={styles.avatarText}>{user?.name?.[0] || '?'}</Text>
                </LinearGradient>
              )
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.candidateName}>{user?.name || 'Inconnu'}</Text>
            <View style={styles.socialRow}>
              {user?.instagram && <Text style={styles.socialHandle}>@{user.instagram.replace('@','')}</Text>}
              {user?.tiktok && <Text style={styles.socialHandle}> • {user.tiktok.replace('@','')}</Text>}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={14} color={COLORS.textMuted} />
            <Text style={styles.statText}>{formatFollowers(user?.followersCount)}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="star" size={14} color={COLORS.gold} />
            <Text style={styles.statText}>{user?.score ? `${user.score}/10` : 'Nouveau'}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.statText}>{user?.city || '—'}</Text>
          </View>
        </View>

        {/* Bio */}
        {user?.bio && (
          <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text>
        )}

        {/* Message candidature */}
        {item.message && (
          <View style={styles.messageBox}>
            <Ionicons name="chatbubble-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.messageText} numberOfLines={2}>{item.message}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {item.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => handle(onReject)}
            disabled={acting}
          >
            <Ionicons name="close" size={18} color={COLORS.error} />
            <Text style={[styles.actionBtnText, { color: COLORS.error }]}>Refuser</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={() => handle(onAccept)}
            disabled={acting}
          >
            {acting
              ? <ActivityIndicator size="small" color={COLORS.white} />
              : <>
                  <Ionicons name="checkmark" size={18} color={COLORS.white} />
                  <Text style={styles.actionBtnText}>Accepter</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function ManageEventScreen({ route, navigation }) {
  const event = route.params?.event;
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('pending');

  const fetchApps = useCallback(async () => {
    try {
      const data = await applicationsAPI.eventApplications(event._id);
      setApplications(data.applications || []);
    } catch (err) {
      console.log('Manage error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [event._id]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const respond = async (appId, status) => {
    await applicationsAPI.respond(appId, status);
    setApplications(prev => prev.map(a => a._id === appId ? { ...a, status } : a));
  };

  const filtered = applications.filter(a => a.status === tab);
  const counts = {
    pending: applications.filter(a => a.status === 'pending').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: SPACING.sm }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{event?.title}</Text>
            <Text style={styles.headerSub}>{applications.length} candidature{applications.length > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {[
            { id: 'pending', label: `En attente (${counts.pending})` },
            { id: 'accepted', label: `Acceptés (${counts.accepted})` },
            { id: 'rejected', label: `Refusés (${counts.rejected})` },
          ].map(t => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[styles.tab, tab === t.id && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
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
          data={filtered}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <CandidateCard
              item={item}
              onAccept={() => respond(item._id, 'accepted')}
              onReject={() => respond(item._id, 'rejected')}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchApps(); }} tintColor={COLORS.primaryLight} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Aucune candidature {tab === 'pending' ? 'en attente' : tab === 'accepted' ? 'acceptée' : 'refusée'}</Text>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: { color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: 'Poppins_700Bold' },
  headerSub: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_400Regular' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.sm },
  tab: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryLight },
  tabText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_500Medium' },
  tabTextActive: { color: COLORS.white },
  list: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: { padding: SPACING.md },
  candidateInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, marginBottom: SPACING.sm },
  candidateAvatar: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarGrad: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: 'Poppins_700Bold' },
  candidateName: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_700Bold' },
  socialRow: { flexDirection: 'row', marginTop: 2 },
  socialHandle: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_400Regular' },
  statusBadge: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  statusText: { fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_600SemiBold' },
  statsRow: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.sm },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_400Regular' },
  bio: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, lineHeight: 20, marginBottom: SPACING.sm, fontFamily: 'Poppins_400Regular' },
  messageBox: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.bgCard2,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
  },
  messageText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, flex: 1, lineHeight: 18, fontFamily: 'Poppins_400Regular' },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: 12,
  },
  rejectBtn: { borderRightWidth: 1, borderColor: COLORS.border },
  acceptBtn: { backgroundColor: 'rgba(16,217,160,0.1)' },
  actionBtnText: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_600SemiBold' },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.sm },
  emptyText: { color: COLORS.textMuted, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_400Regular' },
});
