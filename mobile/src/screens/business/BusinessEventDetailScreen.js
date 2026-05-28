import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList,
  StatusBar, Alert, Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { eventsAPI, applicationsAPI } from '../../services/api';

const MOMENT_LABELS = { morning: 'Matin', afternoon: 'Apres-midi', evening: 'Soir', night: 'Nuit' };
const CATEGORY_LABELS = {
  restaurant: 'Restaurant', bar: 'Bar', club: 'Club', spa: 'Spa',
  sport: 'Sport', wellness: 'Wellness', premium: 'Premium', other: 'Autre',
};

// --- Tabs ---
function TabBar({ activeTab, onPress, counts }) {
  const tabs = [
    { id: 'details',       label: 'Détails' },
    { id: 'inscriptions',  label: `Inscriptions (${counts.pending})` },
    { id: 'attestations',  label: `Présences (${counts.accepted})` },
  ];
  return (
    <View style={s.tabBar}>
      {tabs.map(t => (
        <TouchableOpacity
          key={t.id}
          style={[s.tabItem, activeTab === t.id && s.tabItemActive]}
          onPress={() => onPress(t.id)}
        >
          <Text style={[s.tabText, activeTab === t.id && s.tabTextActive]}>{t.label}</Text>
          {activeTab === t.id && <View style={s.tabUnderline} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// --- Details Tab ---
function DetailsTab({ event }) {
  const date = event.date ? new Date(event.date) : null;
  const dateStr = date ? date.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—';
  const timeStr = date ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 100 }}>
      {/* Stats */}
      <View style={s.statsGrid}>
        <View style={s.statCard}>
          <Text style={s.statValue}>{event.acceptedCount || 0}</Text>
          <Text style={s.statLabel}>Acceptés</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>{event.maxParticipants || '—'}</Text>
          <Text style={s.statLabel}>Places max</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statValue, { color: event.isActive ? COLORS.success : COLORS.warning }]}>{event.isActive ? 'Publié' : 'Brouillon'}</Text>
          <Text style={s.statLabel}>Statut</Text>
        </View>
      </View>

      {/* Infos */}
      <View style={s.infoCard}>
        {[
          { icon: 'calendar-outline', label: 'Date', value: `${dateStr}${timeStr ? ` à ${timeStr}` : ''}` },
          { icon: 'business-outline', label: 'Lieu', value: event.venue || '—' },
          { icon: 'location-outline', label: 'Ville', value: event.city || '—' },
          { icon: 'pricetag-outline', label: 'Catégorie', value: CATEGORY_LABELS[event.category] || '—' },
          { icon: 'time-outline', label: 'Moment', value: MOMENT_LABELS[event.moment] || '—' },
          event.dresscode ? { icon: 'shirt-outline', label: 'Dress code', value: event.dresscode } : null,
          event.ageRequirement ? { icon: 'person-outline', label: 'Âge minimum', value: `${event.ageRequirement} ans` } : null,
        ].filter(Boolean).map((row, i) => (
          <View key={i} style={[s.infoRow, i > 0 && { borderTopWidth: 1, borderTopColor: COLORS.border }]}>
            <View style={s.infoIconWrap}><Ionicons name={row.icon} size={16} color={COLORS.textMuted} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoRowLabel}>{row.label}</Text>
              <Text style={s.infoRowValue}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Description */}
      {event.description ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Description</Text>
          <Text style={s.bodyText}>{event.description}</Text>
        </View>
      ) : null}

      {/* Offre */}
      {event.offer ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Ce que vous offrez</Text>
          <Text style={s.bodyText}>{event.offer}</Text>
        </View>
      ) : null}

      {/* Livrables */}
      {event.deliverables && event.deliverables.length > 0 ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Livrables attendus</Text>
          {event.deliverables.map((d, i) => (
            <View key={i} style={s.bulletRow}>
              <View style={s.bullet} />
              <Text style={s.bodyText}>{d}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

// --- Candidate Card ---
function CandidateCard({ item, onAccept, onReject, showActions, onPressUser }) {
  const user = item.user;
  const [acting, setActing] = useState(false);
  const fmt = (n) => {
    if (!n) return '0';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
    return String(n);
  };
  const handle = async (fn) => {
    setActing(true);
    try { await fn(); } catch (e) { Alert.alert('Erreur', e.message); } finally { setActing(false); }
  };
  return (
    <View style={s.candidateCard}>
      <TouchableOpacity
        style={s.candidateRow}
        onPress={onPressUser}
        activeOpacity={onPressUser ? 0.75 : 1}
      >
        <View style={s.avatar}>
          {user?.photos?.[0]
            ? <Image source={{ uri: user.photos[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            : <LinearGradient colors={COLORS.gradient} style={s.avatarGrad}><Text style={s.avatarLetter}>{(user?.name || '?')[0].toUpperCase()}</Text></LinearGradient>}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={s.candidateNameRow}>
            <Text style={s.candidateName}>{user?.name || 'Inconnu'}</Text>
            {onPressUser && <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            {user?.instagram && <Text style={s.handle}>@{user.instagram.replace('@', '')}</Text>}
            <Text style={s.statSmall}>{fmt(user?.followersCount)} abonnés</Text>
            {user?.score ? <Text style={s.statSmall}>⭐ {user.score.toFixed(1)}/10</Text> : null}
          </View>
        </View>
      </TouchableOpacity>
      {item.message ? (
        <View style={s.messageBox}>
          <Text style={s.messageText} numberOfLines={2}>{item.message}</Text>
        </View>
      ) : null}
      {showActions && item.status === 'pending' && (
        <View style={s.candidateActions}>
          <TouchableOpacity style={s.rejectBtn} onPress={() => handle(onReject)} disabled={acting}>
            <Ionicons name="close" size={16} color={COLORS.error} />
            <Text style={s.rejectBtnText}>Refuser</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.acceptBtn} onPress={() => handle(onAccept)} disabled={acting}>
            {acting ? <ActivityIndicator size="small" color={COLORS.white} /> : <>
              <Ionicons name="checkmark" size={16} color={COLORS.white} />
              <Text style={s.acceptBtnText}>Accepter</Text>
            </>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// --- Inscriptions Tab ---
function InscriptionsTab({ eventId, applications, onUpdate, navigation }) {
  const [subTab, setSubTab] = useState('pending');
  const filtered = applications.filter(a => a.status === subTab);
  const counts = {
    pending: applications.filter(a => a.status === 'pending').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };
  const respond = async (id, status) => {
    await applicationsAPI.respond(id, status);
    onUpdate(id, status);
  };
  const openProfile = (userId) => {
    if (userId) navigation.navigate('BusinessInfluencerProfile', { userId });
  };
  return (
    <View style={{ flex: 1 }}>
      <View style={s.subTabRow}>
        {[
          { id: 'pending',  label: `En attente (${counts.pending})` },
          { id: 'accepted', label: `Acceptés (${counts.accepted})` },
          { id: 'rejected', label: `Refusés (${counts.rejected})` },
        ].map(t => (
          <TouchableOpacity key={t.id} style={[s.subTab, subTab === t.id && s.subTabActive]} onPress={() => setSubTab(t.id)}>
            <Text style={[s.subTabText, subTab === t.id && s.subTabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={i => i._id}
        contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md, paddingBottom: 100 }}
        ListEmptyComponent={<View style={s.emptySmall}><Text style={s.emptySmallText}>Aucune candidature</Text></View>}
        renderItem={({ item }) => (
          <CandidateCard
            item={item}
            showActions={true}
            onAccept={() => respond(item._id, 'accepted')}
            onReject={() => respond(item._id, 'rejected')}
            onPressUser={() => openProfile(item.user?._id)}
          />
        )}
      />
    </View>
  );
}

// --- Attestations Tab ---
function AttestationsTab({ applications, navigation }) {
  const accepted = applications.filter(a => a.status === 'accepted');
  const [present, setPresent] = useState({});
  const togglePresent = (id) => setPresent(p => ({ ...p, [id]: !p[id] }));
  return (
    <FlatList
      data={accepted}
      keyExtractor={i => i._id}
      contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md, paddingBottom: 100 }}
      ListEmptyComponent={<View style={s.emptySmall}><Text style={s.emptySmallText}>Aucun influenceur accepté</Text></View>}
      renderItem={({ item }) => {
        const user = item.user;
        const isPresent = present[item._id];
        return (
          <View style={s.attCard}>
            <TouchableOpacity
              style={s.candidateRow}
              onPress={() => user?._id && navigation.navigate('BusinessInfluencerProfile', { userId: user._id })}
              activeOpacity={0.75}
            >
              <View style={s.avatar}>
                {user?.photos?.[0]
                  ? <Image source={{ uri: user.photos[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  : <LinearGradient colors={COLORS.gradient} style={s.avatarGrad}><Text style={s.avatarLetter}>{(user?.name || '?')[0].toUpperCase()}</Text></LinearGradient>}
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.candidateNameRow}>
                  <Text style={s.candidateName}>{user?.name || 'Inconnu'}</Text>
                  <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
                </View>
                {user?.instagram && <Text style={s.handle}>@{user.instagram.replace('@', '')}</Text>}
              </View>
              <TouchableOpacity
                style={[s.presenceBtn, isPresent ? s.presenceBtnPresent : s.presenceBtnAbsent]}
                onPress={() => togglePresent(item._id)}
              >
                <Ionicons name={isPresent ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={isPresent ? COLORS.success : COLORS.textMuted} />
                <Text style={[s.presenceBtnText, isPresent && { color: COLORS.success }]}>{isPresent ? 'Présent' : 'Absent'}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        );
      }}
    />
  );
}

// --- Main Screen ---
export default function BusinessEventDetailScreen({ route, navigation }) {
  const { eventId } = route.params;
  const insets = useSafeAreaInsets();
  const [event, setEvent] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const load = useCallback(async () => {
    try {
      const [evData, appsData] = await Promise.all([
        eventsAPI.get(eventId),
        applicationsAPI.eventApplications(eventId),
      ]);
      setEvent(evData.event || evData);
      setApplications(appsData.applications || []);
    } catch (err) {
      console.log('EventDetail error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = () => { setRefreshing(true); load(); };
  const handleUpdateApp = (id, status) => {
    setApplications(prev => prev.map(a => a._id === id ? { ...a, status } : a));
  };

  const counts = {
    pending:  applications.filter(a => a.status === 'pending').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  if (loading) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: COLORS.textMuted }}>Événement introuvable</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#0A0A0F', '#0E0D0B']} style={StyleSheet.absoluteFill} />

      {/* Image header */}
      <View style={s.imageHeader}>
        {event.images && event.images.length > 0
          ? <Image source={{ uri: event.images[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <LinearGradient colors={['rgba(201,169,97,0.2)', 'rgba(201,169,97,0.04)']} style={StyleSheet.absoluteFill} />}
        <LinearGradient colors={['rgba(10,10,15,0.4)', 'rgba(10,10,15,0.95)']} style={StyleSheet.absoluteFill} />

        <SafeAreaView style={s.imageHeaderContent}>
          <View style={s.imageHeaderTop}>
            <TouchableOpacity style={s.backCircle} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={20} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.editCircle}
              onPress={() => navigation.navigate('CreateEvent', { eventToEdit: event })}
            >
              <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <View style={s.imageHeaderBottom}>
            <View style={[s.statusBadge, { backgroundColor: event.isActive ? 'rgba(16,217,160,0.15)' : 'rgba(245,158,11,0.15)' }]}>
              <View style={[s.statusDot, { backgroundColor: event.isActive ? COLORS.success : COLORS.warning }]} />
              <Text style={[s.statusText, { color: event.isActive ? COLORS.success : COLORS.warning }]}>{event.isActive ? 'Publié' : 'Brouillon'}</Text>
            </View>
            <Text style={s.eventTitle} numberOfLines={2}>{event.title}</Text>
            {event.venue || event.city ? (
              <View style={s.locationRow}>
                <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                <Text style={s.locationText}>{[event.venue, event.city].filter(Boolean).join(' — ')}</Text>
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </View>

      {/* Tab bar */}
      <TabBar activeTab={activeTab} onPress={setActiveTab} counts={counts} />

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'details' && <DetailsTab event={event} />}
        {activeTab === 'inscriptions' && (
          <InscriptionsTab
            eventId={eventId}
            applications={applications}
            onUpdate={handleUpdateApp}
            navigation={navigation}
          />
        )}
        {activeTab === 'attestations' && (
          <AttestationsTab applications={applications} navigation={navigation} />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  imageHeader: { height: 260, position: 'relative' },
  imageHeaderContent: { flex: 1, justifyContent: 'space-between' },
  imageHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  backCircle: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(10,10,15,0.6)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  editCircle: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(201,169,97,0.12)',
    borderWidth: 1, borderColor: 'rgba(201,169,97,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  imageHeaderBottom: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, gap: 6 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },
  eventTitle: { color: COLORS.white, fontSize: FONTS.sizes.xl, fontFamily: FONTS.bold, lineHeight: 30 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular },

  tabBar: {
    flexDirection: 'row', backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 14, position: 'relative' },
  tabItemActive: {},
  tabText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium },
  tabTextActive: { color: COLORS.primary, fontFamily: FONTS.semiBold },
  tabUnderline: { position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, backgroundColor: COLORS.primary, borderRadius: 1 },

  statsGrid: { flexDirection: 'row', gap: SPACING.sm, marginVertical: SPACING.lg },
  statCard: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.border, alignItems: 'center', paddingVertical: SPACING.md, gap: 4,
  },
  statValue: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  statLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },

  infoCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: SPACING.md },
  infoIconWrap: { width: 28, alignItems: 'center', paddingTop: 2 },
  infoRowLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  infoRowValue: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium, marginTop: 2 },

  section: { marginBottom: SPACING.lg },
  sectionTitle: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm },
  bodyText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.base, fontFamily: FONTS.regular, lineHeight: 22 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  bullet: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.primary, marginTop: 8 },

  subTabRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, gap: 8 },
  subTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  subTabActive: { backgroundColor: 'rgba(201,169,97,0.1)', borderColor: 'rgba(201,169,97,0.4)' },
  subTabText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.medium },
  subTabTextActive: { color: COLORS.primary },

  candidateCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  candidateRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md },
  avatar: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', backgroundColor: COLORS.bgCard2 },
  avatarGrad: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: FONTS.bold },
  candidateNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  candidateName: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.semiBold },
  handle: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  statSmall: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  messageBox: { backgroundColor: COLORS.bgCard2, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  messageText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, fontStyle: 'italic' },
  candidateActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRightWidth: 1, borderRightColor: COLORS.border },
  rejectBtnText: { color: COLORS.error, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: 'rgba(16,217,160,0.08)' },
  acceptBtnText: { color: COLORS.success, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },

  attCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  presenceBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1 },
  presenceBtnPresent: { backgroundColor: 'rgba(16,217,160,0.08)', borderColor: 'rgba(16,217,160,0.3)' },
  presenceBtnAbsent: { backgroundColor: COLORS.bgCard2, borderColor: COLORS.border },
  presenceBtnText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },

  emptySmall: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptySmallText: { color: COLORS.textMuted, fontSize: FONTS.sizes.base, fontFamily: FONTS.regular },
});
