import { useLanguage } from '../../context/LanguageContext';
import { getCurrentLocale } from '../../i18n/runtime';
import { Text, Alert, TextInput } from '../../i18n/LocalizedReactNative';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView, FlatList, StatusBar, Image, ActivityIndicator, RefreshControl, Modal
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { CATEGORY_LABELS } from '../../constants/categories';
import { eventsAPI, applicationsAPI, deliverablesAPI, usersAPI } from '../../services/api';
import { getDeliverableLabel } from '../../constants/businessEventOptions';
import MiniAreaChart from '../../components/MiniAreaChart';
import { useAuth } from '../../context/AuthContext';
import { getBusinessPlan } from '../../constants/businessPlans';
import { SUBSCRIPTION_UI_ENABLED } from '../../constants/platformPolicy';

const MOMENT_LABELS = { morning: 'Matin', afternoon: 'Apres-midi', evening: 'Soir', night: 'Nuit' };

const isEventBoosted = (event) => Boolean(event?.isSponsored || event?.isBoosted);

const boostStatusLabel = (event) => {
  if (!event?.boostExpiresAt) return 'Votre événement est mis en avant auprès des influenceurs.';
  const exp = new Date(event.boostExpiresAt);
  const days = Math.max(0, Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const dateStr = exp.toLocaleDateString(getCurrentLocale(), { day: '2-digit', month: 'long', year: 'numeric' });
  const remaining = days > 0 ? ` · ${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}` : '';
  return `Mis en avant jusqu'au ${dateStr}${remaining}`;
};

// --- Tabs ---
function TabBar({ activeTab, onPress, counts }) {
  const tabs = [
    { id: 'details',       label: 'Détails',      icon: 'information-circle-outline', count: null },
    { id: 'inscriptions',  label: 'Inscriptions', icon: 'people-outline',             count: counts.pending },
    { id: 'inviter',       label: 'Inviter',      icon: 'person-add-outline',         count: counts.invited },
    { id: 'attestations',  label: 'Présences',    icon: 'checkmark-done-outline',     count: counts.checkedIn },
    { id: 'stats',         label: 'Stats',        icon: 'stats-chart-outline',        count: null },
  ];
  return (
    <View style={s.tabBar}>
      {tabs.map((t) => {
        const active = activeTab === t.id;
        const color = active ? COLORS.primary : COLORS.textMuted;
        return (
          <TouchableOpacity key={t.id} style={s.tabItem} onPress={() => onPress(t.id)} activeOpacity={0.7}>
            <View>
              <Ionicons name={t.icon} size={21} color={color} />
              {t.count > 0 ? (
                <View style={s.tabDot}>
                  <Text style={s.tabDotText}>{t.count > 9 ? '9+' : t.count}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[s.tabText, active && s.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {t.label}
            </Text>
            <View style={[s.tabUnderline, active && s.tabUnderlineActive]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// --- Details Tab ---
const capitalize = (str) => (str && typeof str === 'string' ? str.charAt(0).toUpperCase() + str.slice(1) : str);

function DetailsTab({ event }) {
  const date = event.date ? new Date(event.date) : null;
  const dateStr = date ? capitalize(date.toLocaleDateString(getCurrentLocale(), { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })) : '—';
  const timeStr = date ? date.toLocaleTimeString(getCurrentLocale(), { hour: '2-digit', minute: '2-digit' }) : '';

  const accepted = event.acceptedCount || 0;
  const maxP = event.maxParticipants || 0;
  const fillRatio = maxP > 0 ? Math.min(1, accepted / maxP) : 0;
  const fillPct = Math.round(fillRatio * 100);

  const primaryRows = [
    { icon: 'calendar-outline', label: 'Date', value: timeStr ? `${dateStr} · ${timeStr}` : dateStr },
    { icon: 'business-outline', label: 'Lieu', value: event.venue || '—' },
    { icon: 'location-outline', label: 'Ville', value: event.city || '—' },
  ];
  const attributes = [
    { icon: 'pricetag-outline', label: 'Catégorie', value: CATEGORY_LABELS[event.category] || '—' },
    { icon: 'moon-outline', label: 'Moment', value: MOMENT_LABELS[event.moment] || '—' },
    event.dresscode ? { icon: 'shirt-outline', label: 'Dress code', value: event.dresscode } : null,
    event.ageRequirement ? { icon: 'person-outline', label: 'Âge minimum', value: `${event.ageRequirement} ans` } : null,
  ].filter(Boolean);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: 100 }}>
      {/* Boost actif */}
      {isEventBoosted(event) ? (
        <View style={s.boostCard}>
          <View style={s.boostCardIcon}>
            <Ionicons name="flash" size={18} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.boostCardTitle}>Boost actif</Text>
            <Text style={s.boostCardText}>{boostStatusLabel(event)}</Text>
          </View>
        </View>
      ) : null}

      {/* Remplissage */}
      <View style={s.fillCard}>
        <View style={s.fillHead}>
          <View style={{ flex: 1 }}>
            <Text style={s.fillNumber}>
              {accepted}
              <Text style={s.fillNumberMuted}>{` / ${maxP || '—'}`}</Text>
            </Text>
            <Text style={s.fillLabel}>Influenceurs acceptés</Text>
          </View>
          <View style={s.fillPctBadge}>
            <Text style={s.fillPctText}>{fillPct}%</Text>
          </View>
        </View>
        <View style={s.fillTrack}>
          <View style={[s.fillBar, { width: `${Math.max(2, fillPct)}%` }]} />
        </View>
      </View>

      {/* Infos principales */}
      <View style={s.infoCard}>
        {primaryRows.map((row, i) => (
          <View key={i} style={[s.infoRow, i > 0 && { borderTopWidth: 1, borderTopColor: COLORS.border }]}>
            <View style={s.infoIconWrap}><Ionicons name={row.icon} size={18} color={COLORS.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoRowLabel}>{row.label}</Text>
              <Text style={s.infoRowValue}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Attributs */}
      {attributes.length ? (
        <View style={s.chipGrid}>
          {attributes.map((c, i) => (
            <View key={i} style={s.chipTile}>
              <Ionicons name={c.icon} size={15} color={COLORS.textMuted} />
              <Text style={s.chipLabel} numberOfLines={1}>{c.label}</Text>
              <Text style={s.chipValue} numberOfLines={1}>{c.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

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
              <Text style={s.bodyText}>{getDeliverableLabel(d)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

// --- Candidate Card ---
function CandidateCard({ item, onAccept, onReject, onReopen, showActions, onPressUser }) {
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
      {showActions && item.status === 'accepted' && (
        <View style={s.candidateActions}>
          <TouchableOpacity style={s.reopenBtn} onPress={() => handle(onReopen)} disabled={acting}>
            {acting ? <ActivityIndicator size="small" color={COLORS.warning} /> : <>
              <Ionicons name="refresh-outline" size={16} color={COLORS.warning} />
              <Text style={s.reopenBtnText}>Relancer la candidature</Text>
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
            onReopen={() => respond(item._id, 'pending')}
            onPressUser={() => openProfile(item.user?._id)}
          />
        )}
      />
    </View>
  );
}

const formatFollowers = (n) => {
  if (!n) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(n);
};

function InviteInfluencerCard({ influencer, onSelect, disabled, locked }) {
  return (
    <TouchableOpacity
      style={[s.inviteCard, locked && s.inviteCardLocked]}
      onPress={() => onSelect(influencer)}
      activeOpacity={0.82}
    >
      <View style={s.candidateRow}>
        <View style={[s.avatar, locked && s.avatarLocked]}>
          {influencer?.photos?.[0]
            ? <Image source={{ uri: influencer.photos[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            : <LinearGradient colors={COLORS.gradient} style={s.avatarGrad}><Text style={s.avatarLetter}>{(influencer?.name || '?')[0].toUpperCase()}</Text></LinearGradient>}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[s.candidateName, locked && s.textLocked]}>{influencer?.name || 'Inconnu'}</Text>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            {influencer?.instagram && <Text style={[s.handle, locked && s.textLocked]}>@{influencer.instagram.replace('@', '')}</Text>}
            <Text style={[s.statSmall, locked && s.textLocked]}>{formatFollowers(influencer?.followersCount)} abonnés</Text>
            {influencer?.score ? <Text style={[s.statSmall, locked && s.textLocked]}>⭐ {influencer.score.toFixed(1)}/10</Text> : null}
            {influencer?.city ? <Text style={[s.statSmall, locked && s.textLocked]}>{influencer.city}</Text> : null}
          </View>
        </View>
        {locked ? (
          <View style={s.lockedPill}>
            <Ionicons name="lock-closed" size={12} color={COLORS.textMuted} />
            <Text style={s.lockedPillText}>Pack Group</Text>
          </View>
        ) : disabled ? (
          <View style={s.linkedPill}>
            <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
            <Text style={s.linkedPillText}>Déjà lié</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// Feuille d'action : Consulter le profil / Inviter (au lieu d'inviter directement).
function InfluencerActionSheet({ influencer, alreadyLinked, locked, onClose, onViewProfile, onInvite, onUpgrade }) {
  const [inviting, setInviting] = useState(false);
  const visible = !!influencer;

  const handleInvite = async () => {
    if (inviting) return;
    setInviting(true);
    try {
      await onInvite(influencer._id);
    } finally {
      setInviting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.sheetBackdropWrap}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.sheetProfile}>
            <View style={s.sheetAvatar}>
              {influencer?.photos?.[0]
                ? <Image source={{ uri: influencer.photos[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                : <LinearGradient colors={COLORS.gradient} style={s.avatarGrad}><Text style={s.sheetAvatarLetter}>{(influencer?.name || '?')[0].toUpperCase()}</Text></LinearGradient>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetName} numberOfLines={1}>{influencer?.name || 'Influenceur'}</Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 3 }}>
                {influencer?.instagram && <Text style={s.handle}>@{influencer.instagram.replace('@', '')}</Text>}
                <Text style={s.statSmall}>{formatFollowers(influencer?.followersCount)} abonnés</Text>
                {influencer?.city ? <Text style={s.statSmall}>{influencer.city}</Text> : null}
              </View>
            </View>
          </View>

          <TouchableOpacity style={s.sheetActionGhost} onPress={onViewProfile} activeOpacity={0.85}>
            <Ionicons name="person-outline" size={18} color={COLORS.primary} />
            <Text style={s.sheetActionGhostText}>Consulter le profil</Text>
          </TouchableOpacity>

          {locked ? (
            <View style={s.upsellBox}>
              <Ionicons name="lock-closed" size={16} color={COLORS.primary} />
              {/* Sur iOS, on informe de la limite sans proposer de changer de pack payant. */}
              <Text style={s.upsellBoxText}>
                {SUBSCRIPTION_UI_ENABLED
                  ? "Cet influenceur dépasse la limite d'abonnés de votre pack Pro (50k). Passez au pack Group pour l'inviter."
                  : "Cet influenceur dépasse la limite d'abonnés de votre pack actuel. Il peut néanmoins candidater à vos événements."}
              </Text>
              {SUBSCRIPTION_UI_ENABLED && (
                <TouchableOpacity style={s.sheetActionPrimary} onPress={onUpgrade} activeOpacity={0.9}>
                  <Ionicons name="arrow-up-circle-outline" size={18} color="#0A0A0F" />
                  <Text style={s.sheetActionPrimaryText}>Passer au pack Group</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : alreadyLinked ? (
            <View style={[s.sheetActionPrimary, s.sheetActionPrimaryDisabled]}>
              <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.textMuted} />
              <Text style={[s.sheetActionPrimaryText, { color: COLORS.textMuted }]}>Déjà lié à l'événement</Text>
            </View>
          ) : (
            <TouchableOpacity style={s.sheetActionPrimary} onPress={handleInvite} activeOpacity={0.9} disabled={inviting}>
              {inviting ? (
                <ActivityIndicator size="small" color="#0A0A0F" />
              ) : (
                <>
                  <Ionicons name="mail-outline" size={18} color="#0A0A0F" />
                  <Text style={s.sheetActionPrimaryText}>Inviter l'influenceur</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

function InviteTab({ eventId, applications, onInvited, navigation }) {
  const { user } = useAuth();
  const plan = getBusinessPlan(user?.subscriptionPlan);
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const linkedIds = new Set(applications.map((item) => String(item.user?._id || item.user || '')));
  const selectedLinked = selected ? linkedIds.has(String(selected._id)) : false;
  const selectedLocked = Boolean(selected?.locked);

  const loadInfluencers = useCallback(async () => {
    if (!plan.canDirectInvite) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await usersAPI.list({ limit: 100, includeLocked: 1 });
      setInfluencers(data.users || []);
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [plan.canDirectInvite]);

  useEffect(() => { loadInfluencers(); }, [loadInfluencers]);

  const handleRefresh = () => {
    if (!plan.canDirectInvite) return;
    setRefreshing(true);
    loadInfluencers();
  };

  const handleInvite = async (userId) => {
    try {
      await applicationsAPI.invite({ userId, eventId });
      const invitedUser = influencers.find((item) => String(item._id) === String(userId));
      onInvited?.(invitedUser);
      setSelected(null);
      Alert.alert('Invitation envoyée', `${invitedUser?.name || 'Cet influenceur'} a été ajouté dans En attente.`);
    } catch (err) {
      Alert.alert('Erreur', err.message);
    }
  };

  const handleViewProfile = () => {
    const userId = selected?._id;
    setSelected(null);
    if (userId) navigation.navigate('BusinessInfluencerProfile', { userId });
  };

  const goToSubscription = () => {
    setSelected(null);
    navigation.navigate('BusinessSubscription');
  };

  const filtered = influencers.filter((item) => {
    const haystack = `${item?.name || ''} ${item?.city || ''} ${item?.instagram || ''}`.toLowerCase();
    return !search.trim() || haystack.includes(search.trim().toLowerCase());
  });

  if (!plan.canDirectInvite) {
    return (
      <View style={s.inviteLockedWrap}>
        <View style={s.inviteLockedIcon}>
          <Ionicons name="lock-closed" size={28} color={COLORS.primary} />
        </View>
        <Text style={s.inviteLockedTitle}>Invitations non disponibles</Text>
        {/* Sur iOS, aucun appel à l'action vers un changement de pack payant (guideline 3.1.1). */}
        <Text style={s.inviteLockedText}>
          {SUBSCRIPTION_UI_ENABLED
            ? `Le pack ${plan.name} ne permet pas d'inviter directement des influenceurs. Passez au pack Pro (jusqu'à 50k abonnés) ou Group (illimité) pour débloquer cette fonctionnalité.`
            : `Le pack ${plan.name} ne permet pas d'inviter directement des influenceurs. Les créateurs peuvent toujours candidater à vos événements.`}
        </Text>
        {SUBSCRIPTION_UI_ENABLED && (
          <TouchableOpacity style={s.inviteLockedBtn} onPress={goToSubscription} activeOpacity={0.9}>
            <Ionicons name="arrow-up-circle-outline" size={18} color="#0A0A0F" />
            <Text style={s.inviteLockedBtnText}>Passer au pack Pro</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={s.statsCenter}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={s.inviteIntro}>
        <Text style={s.inviteIntroTitle}>Inviter des influenceurs</Text>
        <Text style={s.inviteIntroText}>
          Recherchez un profil et envoyez-lui une invitation pour cet événement. Une invitation reçue apparaît ensuite dans En attente.
        </Text>
        {plan.maxFollowersAccess ? (
          <Text style={s.inviteIntroHint}>
            Votre pack {plan.name} permet d'inviter les influenceurs jusqu'à {formatFollowers(plan.maxFollowersAccess)} abonnés.
          </Text>
        ) : null}
      </View>

      <View style={s.inviteSearchWrap}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Nom, ville ou Instagram..."
          placeholderTextColor={COLORS.textMuted}
          style={s.inviteSearchInput}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: SPACING.md, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={<View style={s.emptySmall}><Text style={s.emptySmallText}>Aucun influenceur trouvé</Text></View>}
        renderItem={({ item }) => (
          <InviteInfluencerCard
            influencer={item}
            disabled={linkedIds.has(String(item._id))}
            locked={Boolean(item.locked)}
            onSelect={setSelected}
          />
        )}
      />

      <InfluencerActionSheet
        influencer={selected}
        alreadyLinked={selectedLinked}
        locked={selectedLocked}
        onClose={() => setSelected(null)}
        onViewProfile={handleViewProfile}
        onInvite={handleInvite}
        onUpgrade={goToSubscription}
      />
    </View>
  );
}

// --- Attestations Tab ---
function AccessPassModal({ visible, application, onClose }) {
  const code = application?.accessCode || '';
  const shortCode = application?.accessCodeShort || '';
  const name = application?.user?.name || 'Influenceur';
  const handle = application?.user?.instagram ? `@${application.user.instagram.replace('@', '')}` : '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <View style={s.modalHead}>
            <View>
              <Text style={s.modalTitle}>Access Pass</Text>
              <Text style={s.modalSubtitle}>{name}{handle ? ` · ${handle}` : ''}</Text>
            </View>
            <TouchableOpacity style={s.modalClose} onPress={onClose}>
              <Ionicons name="close" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <View style={s.modalQrWrap}>
            {code ? (
              <QRCode value={code} size={190} backgroundColor="#FFF" color="#0A0A0F" />
            ) : (
              <Text style={s.modalQrEmpty}>QR indisponible</Text>
            )}
          </View>

          {shortCode ? (
            <View style={s.manualCodeBox}>
              <Text style={s.manualCodeLabel}>Code manuel</Text>
              <Text style={s.manualCodeValue}>{shortCode}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function RatingChip({ label, value, onPress }) {
  return (
    <View style={s.ratingRow}>
      <Text style={s.ratingLabel}>{label}</Text>
      <View style={s.ratingValues}>
        {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => {
          const active = value === score;
          return (
            <TouchableOpacity
              key={`${label}-${score}`}
              style={[s.ratingChip, active && s.ratingChipActive]}
              onPress={() => onPress(score)}
              activeOpacity={0.85}
            >
              <Text style={[s.ratingChipText, active && s.ratingChipTextActive]}>{score}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ReviewModal({ visible, application, onClose, onSubmit }) {
  const [scores, setScores] = useState({
    punctuality: 8,
    style: 8,
    attitude: 8,
    content: 8,
  });
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setScores({ punctuality: 8, style: 8, attitude: 8, content: 8 });
    setComment('');
  }, [visible]);

  const save = async () => {
    try {
      setSaving(true);
      await onSubmit({ scores, comment: comment.trim() });
      onClose();
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <View style={s.modalHead}>
            <View>
              <Text style={s.modalTitle}>Noter l’influenceur</Text>
              <Text style={s.modalSubtitle}>{application?.user?.name || 'Participant'}</Text>
            </View>
            <TouchableOpacity style={s.modalClose} onPress={onClose}>
              <Ionicons name="close" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.md, paddingTop: SPACING.md }}>
            <RatingChip label="Ponctualité" value={scores.punctuality} onPress={(value) => setScores((prev) => ({ ...prev, punctuality: value }))} />
            <RatingChip label="Style" value={scores.style} onPress={(value) => setScores((prev) => ({ ...prev, style: value }))} />
            <RatingChip label="Attitude" value={scores.attitude} onPress={(value) => setScores((prev) => ({ ...prev, attitude: value }))} />
            <RatingChip label="Contenu" value={scores.content} onPress={(value) => setScores((prev) => ({ ...prev, content: value }))} />

            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Commentaire"
              placeholderTextColor={COLORS.textMuted}
              style={s.reviewInput}
              multiline
            />

            <TouchableOpacity style={[s.reviewSaveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#0A0A0F" /> : <Text style={s.reviewSaveBtnText}>Envoyer la note</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ManualCodeModal({ visible, application, onClose, onSubmit }) {
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const name = application?.user?.name || 'Influenceur';
  const shortCode = application?.accessCodeShort || '';

  useEffect(() => {
    if (!visible) setCode('');
  }, [visible]);

  const handleSubmit = async () => {
    try {
      setSaving(true);
      await onSubmit(code.trim().toUpperCase());
      setCode('');
      onClose();
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <View style={s.modalHead}>
            <View>
              <Text style={s.modalTitle}>Code manuel individuel</Text>
              <Text style={s.modalSubtitle}>{name}</Text>
            </View>
            <TouchableOpacity style={s.modalClose} onPress={onClose}>
              <Ionicons name="close" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <View style={s.manualHintBox}>
            <Text style={s.manualHintText}>
              Ce code est propre à cet influenceur uniquement. Il remplace le scan de son QR code.
            </Text>
            {shortCode ? (
              <Text style={s.manualHintCode}>Code attendu: {shortCode}</Text>
            ) : null}
          </View>

          <TextInput
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="Code manuel"
            placeholderTextColor={COLORS.textMuted}
            style={s.reviewInput}
          />

          <TouchableOpacity
            style={[s.reviewSaveBtn, (!code.trim() || saving) && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={!code.trim() || saving}
          >
            {saving ? <ActivityIndicator color="#0A0A0F" /> : <Text style={s.reviewSaveBtnText}>Valider le code</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function AttestationsTab({ applications, navigation, eventId, onCheckIn, submissionsByApplication }) {
  const accepted = applications.filter(a => a.status === 'accepted');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [reviewingApplication, setReviewingApplication] = useState(null);
  const [manualCodeApplication, setManualCodeApplication] = useState(null);

  const submitReview = async (applicationId, payload) => {
    await applicationsAPI.review(applicationId, payload);
    Alert.alert('Note envoyée', "L'évaluation de l'influenceur a bien été enregistrée.");
  };

  const submitManualCode = async (applicationId, code) => {
    const res = await applicationsAPI.checkin(code);
    onCheckIn?.(applicationId, res?.checkedInAt || new Date().toISOString());
    setManualCodeApplication(null);
    Alert.alert('Entrée validée', `${res?.guest?.name || 'Le participant'} est désormais marqué présent.`);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.scanCtaWrap}>
        <View style={s.scanCtaRow}>
          <TouchableOpacity
            style={[s.scanCta, { flex: 1 }]}
            onPress={() => navigation.navigate('EventCheckInScanner', { eventId })}
            activeOpacity={0.9}
          >
            <View style={s.scanCtaIcon}>
              <Ionicons name="scan-outline" size={20} color="#0A0A0F" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.scanCtaTitle}>Scanner un ticket</Text>
              <Text style={s.scanCtaText}>Vérifie le QR code du ticket influenceur et confirme sa présence.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#0A0A0F" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={accepted}
        keyExtractor={i => i._id}
        contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: SPACING.md, paddingBottom: 100 }}
        ListEmptyComponent={<View style={s.emptySmall}><Text style={s.emptySmallText}>Aucun influenceur accepté pour cet événement</Text></View>}
        renderItem={({ item }) => {
          const user = item.user;
          const isCheckedIn = !!item.checkedIn;
          const hasInfluencerReview = !!item.reviewStatus?.byInfluencer;
          const hasBusinessReview = !!item.reviewStatus?.byBusiness;
          const deliverables = submissionsByApplication[item._id] || [];
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
                  <Text style={s.attMeta}>
                    {isCheckedIn
                      ? `Scanné${item.checkedInAt ? ` · ${new Date(item.checkedInAt).toLocaleTimeString(getCurrentLocale(), { hour: '2-digit', minute: '2-digit' })}` : ''}`
                      : 'En attente de scan'}
                  </Text>
                  {deliverables.length > 0 ? <Text style={s.attDeliverableMeta}>{deliverables.length} livrable(s) reçu(s)</Text> : null}
                </View>
                <View style={[s.presenceBtn, isCheckedIn ? s.presenceBtnPresent : s.presenceBtnAbsent]}>
                  <Ionicons
                    name={!isCheckedIn ? 'time-outline' : hasInfluencerReview ? 'star' : 'checkmark-circle'}
                    size={18}
                    color={!isCheckedIn ? COLORS.warning : hasInfluencerReview ? COLORS.primary : COLORS.success}
                  />
                  <Text style={[s.presenceBtnText, { color: !isCheckedIn ? COLORS.warning : hasInfluencerReview ? COLORS.primary : COLORS.success }]}>
                    {!isCheckedIn ? 'À scanner' : hasInfluencerReview ? 'Avis reçu' : 'Présent'}
                  </Text>
                </View>
              </TouchableOpacity>

              {!isCheckedIn ? (
                <View style={s.attActions}>
                  <TouchableOpacity
                    style={s.attActionBtn}
                    onPress={() => navigation.navigate('EventCheckInScanner', { eventId })}
                  >
                    <Ionicons name="scan-outline" size={15} color={COLORS.primary} />
                    <Text style={s.attActionText}>Scanner</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.attActionBtn}
                    onPress={() => setSelectedApplication(item)}
                  >
                    <Ionicons name="qr-code-outline" size={15} color={COLORS.primary} />
                    <Text style={s.attActionText}>QR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.attActionBtn}
                    onPress={() => user?._id && navigation.navigate('BusinessInfluencerProfile', { userId: user._id })}
                  >
                    <Ionicons name="person-outline" size={15} color={COLORS.primary} />
                    <Text style={s.attActionText}>Profil</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.attActionBtn}
                    onPress={() => setManualCodeApplication(item)}
                  >
                    <Ionicons name="key-outline" size={15} color={COLORS.primary} />
                    <Text style={s.attActionText}>Code.</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={s.attActions}>
                  {deliverables.length > 0 ? (
                    <TouchableOpacity
                      style={s.attActionBtn}
                      onPress={() => navigation.navigate('BusinessApplicationAssets', {
                        application: item,
                        submissions: deliverables,
                      })}
                    >
                      <Ionicons name="images-outline" size={15} color={COLORS.primary} />
                      <Text style={s.attActionText}>Livrables</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={s.attActionBtn}
                    onPress={() => setReviewingApplication(item)}
                  >
                    <Ionicons name={hasBusinessReview ? 'checkmark-circle-outline' : 'star-outline'} size={15} color={COLORS.primary} />
                    <Text style={s.attActionText}>{hasBusinessReview ? 'Notée' : 'Noter'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.attActionBtn}
                    onPress={() => user?._id && navigation.navigate('BusinessInfluencerProfile', { userId: user._id })}
                  >
                    <Ionicons name="person-outline" size={15} color={COLORS.primary} />
                    <Text style={s.attActionText}>Profil</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />

      <AccessPassModal
        visible={!!selectedApplication}
        application={selectedApplication}
        onClose={() => setSelectedApplication(null)}
      />
      <ReviewModal
        visible={!!reviewingApplication}
        application={reviewingApplication}
        onClose={() => setReviewingApplication(null)}
        onSubmit={(payload) => submitReview(reviewingApplication._id, payload)}
      />
      <ManualCodeModal
        visible={!!manualCodeApplication}
        application={manualCodeApplication}
        onClose={() => setManualCodeApplication(null)}
        onSubmit={(code) => submitManualCode(manualCodeApplication?._id, code)}
      />
    </View>
  );
}

// --- Stats Tab ---
const formatCompact = (n) => {
  const value = Number(n) || 0;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
};

const formatDayLabel = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(getCurrentLocale(), { day: '2-digit', month: 'short' });
};

// Message contextuel affiché en encart selon l'état de l'événement.
const buildInsight = (stats) => {
  const { views, applications, attendance } = stats;
  if (attendance.accepted > 0 && attendance.attendanceRate < 70) {
    return { tone: 'warning', text: `Taux de présence à ${attendance.attendanceRate} %. Relancez les influenceurs acceptés la veille de l'événement.` };
  }
  if (views.total > 0 && applications.total === 0) {
    return { tone: 'warning', text: `${views.total} vue${views.total > 1 ? 's' : ''} mais aucune candidature. Améliorez votre offre ou boostez l'événement pour convertir.` };
  }
  if (applications.pending > 0) {
    return { tone: 'info', text: `${applications.pending} candidature${applications.pending > 1 ? 's' : ''} en attente de réponse.` };
  }
  return { tone: 'success', text: 'Bonne dynamique : continuez à publier régulièrement pour garder la visibilité.' };
};

function KpiCard({ icon, label, value, sub, accent }) {
  return (
    <View style={[s.kpiCard, accent && s.kpiCardAccent]}>
      <View style={s.kpiHead}>
        <Ionicons name={icon} size={14} color={accent ? COLORS.primary : COLORS.textMuted} />
        <Text style={[s.kpiLabel, accent && { color: COLORS.primary }]} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={s.kpiValue}>{value}</Text>
      {sub ? <Text style={s.kpiSub} numberOfLines={1}>{sub}</Text> : null}
    </View>
  );
}

function FunnelBar({ label, value, ratio, color }) {
  return (
    <View style={s.funnelRow}>
      <View style={s.funnelTrack}>
        <View style={[s.funnelFill, { width: `${Math.max(4, Math.round(ratio * 100))}%`, backgroundColor: color }]} />
      </View>
      <Text style={s.funnelLabel} numberOfLines={1}>{label} · {value}</Text>
    </View>
  );
}

function StatsTab({ eventId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      setError(null);
      const data = await eventsAPI.stats(eventId);
      setStats(data);
    } catch (err) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (loading) {
    return (
      <View style={s.statsCenter}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.statsCenter}>
        <Text style={s.statsEmptyText}>{error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={loadStats}>
          <Text style={s.retryBtnText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!stats) return null;

  const { views, applications, attendance, reach, reviews, funnel, boost } = stats;
  const hasAnyData = views.total > 0 || applications.total > 0;
  const showBoost = boost && (boost.isActive || boost.count > 0);
  const insight = buildInsight(stats);
  const funnelMax = Math.max(1, ...funnel.map((f) => f.value));
  const series = views.series || [];
  const axisLabels = series.length
    ? [series[0], series[Math.floor(series.length / 2)], series[series.length - 1]]
    : [];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* KPIs — défilent bord à bord, sans rognage */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg }}
      >
        <KpiCard icon="eye-outline" label="Vues" value={formatCompact(views.total)} sub={`${views.avgDurationSec}s en moy.`} accent />
        <KpiCard icon="people-outline" label="Spectateurs" value={formatCompact(views.uniqueViewers)} sub="uniques" />
        <KpiCard icon="documents-outline" label="Candidatures" value={formatCompact(applications.total)} sub={`${applications.pending} en attente`} />
        <KpiCard icon="checkmark-done-outline" label="Acceptation" value={`${applications.acceptanceRate}%`} sub={`${applications.accepted} acceptés`} />
        <KpiCard icon="walk-outline" label="Présents" value={`${attendance.checkedIn}/${attendance.accepted}`} sub={`${attendance.attendanceRate}%`} />
        <KpiCard icon="megaphone-outline" label="Reach" value={formatCompact(reach.totalFollowers)} sub="abonnés cumulés" />
        <KpiCard icon="star-outline" label="Note" value={reviews.avgScore > 0 ? `${reviews.avgScore}/10` : '—'} sub={`${reviews.count} avis`} />
      </ScrollView>

      {/* Boost — mesure */}
      {showBoost ? (
        <View style={[s.statsBody, { marginBottom: SPACING.lg }]}>
          <View style={[s.boostStatCard, boost.isActive && s.boostStatCardActive]}>
            <View style={s.boostStatHead}>
              <View style={s.boostStatIcon}>
                <Ionicons name="flash" size={16} color={boost.isActive ? COLORS.primary : COLORS.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.boostStatTitle}>{boost.isActive ? 'Boost actif' : 'Boost inactif'}</Text>
                <Text style={s.boostStatSub}>
                  {boost.isActive
                    ? `${boost.daysRemaining} jour${boost.daysRemaining > 1 ? 's' : ''} restant${boost.daysRemaining > 1 ? 's' : ''}`
                    : 'Aucun boost en cours'}
                </Text>
              </View>
              {boost.isActive ? (
                <View style={s.boostStatPill}><Text style={s.boostStatPillText}>EN COURS</Text></View>
              ) : null}
            </View>
            <View style={s.boostStatMetrics}>
              <View style={s.boostStatMetric}>
                <Text style={s.boostStatMetricValue}>{boost.count}</Text>
                <Text style={s.boostStatMetricLabel}>boost{boost.count > 1 ? 's' : ''} activé{boost.count > 1 ? 's' : ''}</Text>
              </View>
              <View style={s.boostStatDivider} />
              <View style={s.boostStatMetric}>
                <Text style={s.boostStatMetricValue}>{boost.totalSpent.toFixed(0)} €</Text>
                <Text style={s.boostStatMetricLabel}>total investi</Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      {!hasAnyData ? (
        <View style={s.statsEmpty}>
          <Ionicons name="bar-chart-outline" size={32} color={COLORS.textMuted} />
          <Text style={s.statsEmptyTitle}>Pas encore de données</Text>
          <Text style={s.statsEmptyText}>Les statistiques apparaîtront dès que des influenceurs consulteront votre événement.</Text>
        </View>
      ) : (
        <View style={s.statsBody}>
          {/* Courbe des vues */}
          <View style={s.statsSection}>
            <Text style={s.statsSectionTitle}>Total des vues</Text>
            <MiniAreaChart data={series} />
            {axisLabels.length ? (
              <View style={s.axisRow}>
                {axisLabels.map((pt, i) => (
                  <Text key={i} style={s.axisLabel}>{formatDayLabel(pt.date)}</Text>
                ))}
              </View>
            ) : null}
          </View>

          {/* Insight */}
          <View style={[s.insightCard, insight.tone === 'success' ? s.insightSuccess : insight.tone === 'info' ? s.insightInfo : s.insightWarning]}>
            <Ionicons
              name={insight.tone === 'success' ? 'checkmark-circle' : insight.tone === 'info' ? 'information-circle' : 'warning'}
              size={18}
              color={insight.tone === 'success' ? COLORS.success : insight.tone === 'info' ? COLORS.primary : COLORS.warning}
            />
            <Text style={s.insightText}>{insight.text}</Text>
          </View>

          {/* Entonnoir */}
          <View style={s.statsSection}>
            <Text style={s.statsSectionTitle}>Entonnoir de conversion</Text>
            <View style={{ gap: SPACING.sm }}>
              <FunnelBar label="Vues" value={funnel[0].value} ratio={funnel[0].value / funnelMax} color={COLORS.primary} />
              <FunnelBar label="Candidatures" value={funnel[1].value} ratio={funnel[1].value / funnelMax} color={COLORS.primaryLight} />
              <FunnelBar label="Acceptés" value={funnel[2].value} ratio={funnel[2].value / funnelMax} color="rgba(201,169,97,0.6)" />
              <FunnelBar label="Présents" value={funnel[3].value} ratio={funnel[3].value / funnelMax} color={COLORS.success} />
            </View>
          </View>

          {/* Répartition + audience */}
          <View style={s.statsSection}>
            <Text style={s.statsSectionTitle}>Répartition des candidatures</Text>
            <View style={s.breakdownCard}>
              {[
                { label: 'En attente', value: applications.pending },
                { label: 'Acceptés', value: applications.accepted },
                { label: 'Refusés', value: applications.rejected },
                { label: 'Reach moyen / influenceur', value: `${formatCompact(reach.avgFollowers)} abonnés` },
                { label: 'Note moyenne reçue', value: reviews.avgScore > 0 ? `${reviews.avgScore} / 10` : '—' },
              ].map((row, i) => (
                <View key={i} style={[s.breakdownRow, i > 0 && { borderTopWidth: 1, borderTopColor: COLORS.border }]}>
                  <Text style={s.breakdownLabel}>{row.label}</Text>
                  <Text style={s.breakdownValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// --- Main Screen ---
export default function BusinessEventDetailScreen({ route, navigation }) {
  useLanguage();
  const { eventId } = route.params;
  const insets = useSafeAreaInsets();
  const [event, setEvent] = useState(null);
  const [applications, setApplications] = useState([]);
  const [deliverableSubmissions, setDeliverableSubmissions] = useState([]);
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
      const deliverablesData = await deliverablesAPI.mine().catch(() => ({ submissions: [] }));
      setDeliverableSubmissions((deliverablesData.submissions || []).filter((item) => String(item.event?._id || item.event) === String(eventId)));
    } catch (err) {
      console.log('EventDetail error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  // Recharge à chaque focus : reflète un boost activé depuis la liste sans rester sur des données périmées.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRefresh = () => { setRefreshing(true); load(); };
  const handleUpdateApp = (id, status) => {
    setApplications(prev => prev.map(a => a._id === id ? { ...a, status } : a));
  };
  const handleCheckInApp = (id, checkedInAt) => {
    setApplications(prev => prev.map(a => (
      a._id === id
        ? { ...a, checkedIn: true, checkedInAt: checkedInAt || new Date().toISOString(), confirmed: true }
        : a
    )));
  };
  const handleInvitedInfluencer = (influencer) => {
    if (!influencer?._id) return;
    setApplications((prev) => [
      {
        _id: `invite-${influencer._id}-${Date.now()}`,
        user: influencer,
        event: eventId,
        isInvitation: true,
        status: 'pending',
        appliedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const counts = {
    pending:  applications.filter(a => a.status === 'pending').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    checkedIn: applications.filter(a => a.status === 'accepted' && a.checkedIn).length,
    invited: applications.filter(a => a.status === 'pending' && a.isInvitation).length,
  };
  const submissionsByApplication = deliverableSubmissions.reduce((acc, submission) => {
    const key = String(submission.application?._id || submission.application || '');
    if (!key) return acc;
    acc[key] = [...(acc[key] || []), submission];
    return acc;
  }, {});

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
        {/* Dégradé bas : laisse l'image visible en haut, lisibilité du titre en bas */}
        <LinearGradient
          colors={['transparent', 'rgba(10,10,15,0.55)', 'rgba(10,10,15,0.97)']}
          locations={[0.25, 0.62, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Dégradé haut : lisibilité des boutons nav */}
        <LinearGradient
          colors={['rgba(0,0,0,0.45)', 'transparent']}
          style={[StyleSheet.absoluteFill, { height: 110 }]}
        />

        <SafeAreaView style={s.imageHeaderContent}>
          <View style={s.imageHeaderTop}>
            <TouchableOpacity style={s.backCircle} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={20} color={COLORS.white} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={s.editCircle}
                onPress={() => navigation.navigate('EventCheckInScanner', { eventId: event._id })}
              >
                <Ionicons name="qr-code-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.editCircle}
                onPress={() => navigation.navigate('CreateEvent', { eventToEdit: event })}
              >
                <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={s.imageHeaderBottom}>
            <View style={s.badgeRow}>
              <View style={[s.statusBadge, { backgroundColor: event.isActive ? 'rgba(16,217,160,0.15)' : 'rgba(245,158,11,0.15)' }]}>
                <View style={[s.statusDot, { backgroundColor: event.isActive ? COLORS.success : COLORS.warning }]} />
                <Text style={[s.statusText, { color: event.isActive ? COLORS.success : COLORS.warning }]}>{event.isActive ? 'Publié' : 'Brouillon'}</Text>
              </View>
              {isEventBoosted(event) ? (
                <View style={s.boostBadge}>
                  <Ionicons name="flash" size={11} color="#0A0A0F" />
                  <Text style={s.boostBadgeText}>Boosté</Text>
                </View>
              ) : null}
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
        {activeTab === 'inviter' && (
          <InviteTab
            eventId={eventId}
            applications={applications}
            onInvited={handleInvitedInfluencer}
            navigation={navigation}
          />
        )}
        {activeTab === 'attestations' && (
          <AttestationsTab applications={applications} navigation={navigation} eventId={eventId} onCheckIn={handleCheckInApp} submissionsByApplication={submissionsByApplication} />
        )}
        {activeTab === 'stats' && <StatsTab eventId={eventId} />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  imageHeader: { height: 300, position: 'relative' },
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
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  boostBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  boostBadgeText: { color: '#0A0A0F', fontSize: FONTS.sizes.xs, fontFamily: FONTS.bold },
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
  tabItem: { flex: 1, alignItems: 'center', paddingTop: 10, paddingBottom: 12, gap: 5, position: 'relative' },
  tabText: { color: COLORS.textMuted, fontSize: 11, fontFamily: FONTS.medium },
  tabTextActive: { color: COLORS.primary, fontFamily: FONTS.semiBold },
  tabDot: {
    position: 'absolute', top: -6, right: -10, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary,
    borderWidth: 1.5, borderColor: COLORS.bgCard,
  },
  tabDotText: { color: '#0A0A0F', fontSize: 9, fontFamily: FONTS.bold },
  tabUnderline: { position: 'absolute', bottom: 0, left: '22%', right: '22%', height: 2, borderRadius: 1, backgroundColor: 'transparent' },
  tabUnderlineActive: { backgroundColor: COLORS.primary },

  inviteIntro: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: 6,
  },
  inviteIntroTitle: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  inviteIntroText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, lineHeight: 20 },
  inviteIntroHint: { color: COLORS.primary, fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold, marginTop: 2 },
  inviteSearchWrap: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  inviteSearchInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    padding: 0,
  },
  inviteCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  inviteCardLocked: {
    opacity: 0.5,
  },
  avatarLocked: { opacity: 0.6 },
  textLocked: { color: COLORS.textMuted },
  lockedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border,
  },
  lockedPillText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },

  inviteLockedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  inviteLockedIcon: {
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(201,169,97,0.12)', borderWidth: 1, borderColor: 'rgba(201,169,97,0.3)',
    marginBottom: SPACING.sm,
  },
  inviteLockedTitle: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold, textAlign: 'center' },
  inviteLockedText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, lineHeight: 20, textAlign: 'center' },
  inviteLockedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, minWidth: 220, borderRadius: RADIUS.full, backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg, marginTop: SPACING.sm,
  },
  inviteLockedBtnText: { color: '#0A0A0F', fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },

  upsellBox: {
    gap: SPACING.md,
    backgroundColor: 'rgba(201,169,97,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.3)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  upsellBoxText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, lineHeight: 20 },
  inviteActionBtn: {
    minWidth: 92,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
  },
  inviteActionBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inviteActionBtnText: { color: '#0A0A0F', fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold },
  inviteActionBtnTextDisabled: { color: COLORS.textMuted },

  linkedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(16,217,160,0.08)', borderWidth: 1, borderColor: 'rgba(16,217,160,0.3)',
  },
  linkedPillText: { color: COLORS.success, fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },

  // Feuille d'action influenceur
  sheetBackdropWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: COLORS.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: COLORS.borderLight, paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm, paddingBottom: SPACING.xxl, gap: SPACING.md,
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: SPACING.sm },
  sheetProfile: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm },
  sheetAvatar: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', backgroundColor: COLORS.bgCard2 },
  sheetAvatarLetter: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  sheetName: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  sheetActionGhost: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52,
    borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard2, borderWidth: 1, borderColor: COLORS.border,
  },
  sheetActionGhostText: { color: COLORS.primary, fontSize: FONTS.sizes.base, fontFamily: FONTS.semiBold },
  sheetActionPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52,
    borderRadius: RADIUS.full, backgroundColor: COLORS.primary,
  },
  sheetActionPrimaryDisabled: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: COLORS.border },
  sheetActionPrimaryText: { color: '#0A0A0F', fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },

  boostCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.lg,
    backgroundColor: 'rgba(201,169,97,0.1)', borderWidth: 1, borderColor: 'rgba(201,169,97,0.35)',
    borderRadius: RADIUS.md, padding: SPACING.md,
  },
  boostCardIcon: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(201,169,97,0.15)',
  },
  boostCardTitle: { color: COLORS.primary, fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  boostCardText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, marginTop: 2 },

  statsGrid: { flexDirection: 'row', gap: SPACING.sm, marginVertical: SPACING.lg },
  statCard: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.border, alignItems: 'center', paddingVertical: SPACING.md, gap: 4,
  },
  statValue: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  statLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },

  // Carte de remplissage (Détails)
  fillCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.lg, marginBottom: SPACING.md, gap: SPACING.md,
  },
  fillHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md },
  fillNumber: { color: COLORS.white, fontSize: 28, fontFamily: FONTS.bold },
  fillNumberMuted: { color: COLORS.textMuted, fontSize: FONTS.sizes.lg, fontFamily: FONTS.semiBold },
  fillLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, marginTop: 2 },
  fillPctBadge: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(201,169,97,0.12)', borderWidth: 1, borderColor: 'rgba(201,169,97,0.35)',
  },
  fillPctText: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold },
  fillTrack: { height: 8, borderRadius: 4, backgroundColor: COLORS.bgCard2, overflow: 'hidden' },
  fillBar: { height: '100%', borderRadius: 4, backgroundColor: COLORS.primary },

  infoCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(201,169,97,0.1)',
  },
  infoRowLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  infoRowValue: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.semiBold, marginTop: 2 },

  // Grille d'attributs (Détails)
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  chipTile: {
    width: '48%', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, gap: 6,
  },
  chipLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  chipValue: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },

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
  attDeliverableMeta: { color: COLORS.primaryLight, fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold, marginTop: 3 },
  messageBox: { backgroundColor: COLORS.bgCard2, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  messageText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, fontStyle: 'italic' },
  candidateActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRightWidth: 1, borderRightColor: COLORS.border },
  rejectBtnText: { color: COLORS.error, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: 'rgba(16,217,160,0.08)' },
  acceptBtnText: { color: COLORS.success, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  reopenBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: 'rgba(245,158,11,0.08)',
  },
  reopenBtnText: { color: COLORS.warning, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },

  attCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  scanCtaWrap: { padding: SPACING.lg, paddingBottom: SPACING.md },
  scanCtaRow: { flexDirection: 'row', gap: SPACING.sm },
  scanCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
  },
  scanCtaIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanCtaTitle: { color: '#0A0A0F', fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  scanCtaText: { color: 'rgba(10,10,15,0.78)', fontSize: FONTS.sizes.xs, fontFamily: FONTS.medium, marginTop: 2 },
  presenceBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1 },
  presenceBtnPresent: { backgroundColor: 'rgba(16,217,160,0.08)', borderColor: 'rgba(16,217,160,0.3)' },
  presenceBtnAbsent: { backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.24)' },
  presenceBtnText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },
  attMeta: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, marginTop: 3 },
  attActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  attActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  attActionText: { color: COLORS.primary, fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },
  ratingRow: { gap: 8 },
  ratingLabel: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  ratingValues: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ratingChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCard2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratingChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  ratingChipText: { color: COLORS.textPrimary, fontSize: FONTS.sizes.xs, fontFamily: FONTS.bold },
  ratingChipTextActive: { color: '#0A0A0F' },

  emptySmall: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptySmallText: { color: COLORS.textMuted, fontSize: FONTS.sizes.base, fontFamily: FONTS.regular },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.lg,
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  modalTitle: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  modalSubtitle: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, marginTop: 2 },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCard2,
  },
  modalQrWrap: {
    marginTop: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: '#FFF',
    borderRadius: RADIUS.lg,
  },
  modalQrEmpty: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium },
  manualCodeBox: { marginTop: SPACING.md, alignItems: 'center' },
  manualCodeLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  manualCodeValue: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold, letterSpacing: 2, marginTop: 4 },
  manualHintBox: {
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgCard2,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  manualHintText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, lineHeight: 20 },
  manualHintCode: { color: COLORS.primaryLight, fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold },
  reviewInput: {
    minHeight: 96,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgCard2,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 14,
    textAlignVertical: 'top',
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
  },
  reviewSaveBtn: {
    height: 52,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  reviewSaveBtnText: { color: '#0A0A0F', fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  deliverableItem: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  deliverableHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md },
  deliverableType: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold },
  deliverableMeta: { color: COLORS.primaryLight, fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },
  deliverableNote: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, lineHeight: 20 },
  deliverableThumb: { width: 78, height: 78, borderRadius: 14, backgroundColor: COLORS.bgInput },

  // --- Stats ---
  statsCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, padding: SPACING.xl },
  statsEmpty: { alignItems: 'center', gap: 8, paddingVertical: SPACING.xxl, paddingHorizontal: SPACING.lg },
  statsEmptyTitle: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.semiBold, marginTop: 6 },
  statsEmptyText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, textAlign: 'center', lineHeight: 20 },
  retryBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: RADIUS.full, backgroundColor: 'rgba(201,169,97,0.12)', borderWidth: 1, borderColor: 'rgba(201,169,97,0.4)' },
  retryBtnText: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },

  kpiCard: {
    minWidth: 130, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.border, paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, gap: 6,
  },
  kpiCardAccent: { borderColor: 'rgba(201,169,97,0.45)', backgroundColor: 'rgba(201,169,97,0.06)' },
  kpiHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  kpiLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.medium },
  kpiValue: { color: COLORS.white, fontSize: FONTS.sizes.xl, fontFamily: FONTS.bold },
  kpiSub: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },

  statsBody: { paddingHorizontal: SPACING.lg },

  // Carte de mesure du boost (Stats)
  boostStatCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, gap: SPACING.md,
  },
  boostStatCardActive: { borderColor: 'rgba(201,169,97,0.4)', backgroundColor: 'rgba(201,169,97,0.06)' },
  boostStatHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  boostStatIcon: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(201,169,97,0.12)',
  },
  boostStatTitle: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  boostStatSub: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, marginTop: 2 },
  boostStatPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full, backgroundColor: COLORS.primary },
  boostStatPillText: { color: '#0A0A0F', fontSize: 9, fontFamily: FONTS.bold, letterSpacing: 0.5 },
  boostStatMetrics: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard2, borderRadius: RADIUS.md, paddingVertical: SPACING.md },
  boostStatMetric: { flex: 1, alignItems: 'center', gap: 2 },
  boostStatMetricValue: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  boostStatMetricLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  boostStatDivider: { width: 1, height: 28, backgroundColor: COLORS.border },

  statsSection: { marginBottom: SPACING.lg },
  statsSectionTitle: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axisLabel: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },

  insightCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.lg, borderWidth: 1,
  },
  insightWarning: { backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.24)' },
  insightInfo: { backgroundColor: 'rgba(201,169,97,0.08)', borderColor: 'rgba(201,169,97,0.3)' },
  insightSuccess: { backgroundColor: 'rgba(16,217,160,0.08)', borderColor: 'rgba(16,217,160,0.3)' },
  insightText: { flex: 1, color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, lineHeight: 20 },

  funnelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  funnelTrack: { flex: 1, height: 28, borderRadius: 6, backgroundColor: COLORS.bgCard2, overflow: 'hidden' },
  funnelFill: { height: '100%', borderRadius: 6 },
  funnelLabel: { width: 130, color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontFamily: FONTS.medium },

  breakdownCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  breakdownLabel: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular },
  breakdownValue: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
});
