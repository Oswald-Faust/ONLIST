import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator, RefreshControl,
  Modal, TextInput, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { adminAPI, eventsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Constantes ────────────────────────────────────────────────────────────────

const EVENT_TYPES = ['Club', 'Restaurant', 'Bar', 'Spa', 'VIP', 'Sport', 'Autre'];
const GENDER_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'female', label: 'Femmes' },
  { value: 'male', label: 'Hommes' },
];

// ─── Composant UserRow ─────────────────────────────────────────────────────────

function UserRow({ user, onValidate, onReject }) {
  const [acting, setActing] = useState(false);

  const handle = async (action) => {
    setActing(true);
    try { await action(); }
    catch (err) { Alert.alert('Erreur', err.message); }
    finally { setActing(false); }
  };

  const typeColor = user.type === 'influencer' ? COLORS.primaryLight : COLORS.primary;
  const typeBg = user.type === 'influencer'
    ? 'rgba(201,169,97,0.1)'
    : 'rgba(201,169,97,0.15)';

  return (
    <View style={u.row}>
      <View style={u.info}>
        <View style={u.avatar}>
          <Text style={u.avatarTxt}>{user.name?.[0]?.toUpperCase() || '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={u.nameRow}>
            <Text style={u.name}>{user.name}</Text>
            <View style={[u.typeBadge, { backgroundColor: typeBg }]}>
              <Text style={[u.typeTxt, { color: typeColor }]}>
                {user.type === 'influencer' ? 'Influenceur' : 'Business'}
              </Text>
            </View>
          </View>
          <Text style={u.email}>{user.email || user.phone}</Text>
          {user.type === 'business' && user.businessName && (
            <Text style={u.sub}>{user.businessName} · {user.businessType}</Text>
          )}
          {user.type === 'influencer' && user.instagram && (
            <Text style={u.sub}>@{user.instagram.replace('@', '')} · {user.followersCount?.toLocaleString() || 0} followers</Text>
          )}
        </View>
      </View>

      {user.status === 'pending' && (
        <View style={u.actions}>
          <TouchableOpacity
            style={[u.btn, u.btnReject]}
            onPress={() => handle(onReject)}
            disabled={acting}
          >
            <Ionicons name="close" size={16} color={COLORS.error} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[u.btn, u.btnApprove]}
            onPress={() => handle(onValidate)}
            disabled={acting}
          >
            {acting
              ? <ActivityIndicator size="small" color={COLORS.white} />
              : <Ionicons name="checkmark" size={16} color={COLORS.white} />
            }
          </TouchableOpacity>
        </View>
      )}
      {user.status !== 'pending' && (
        <View style={[
          u.statusPill,
          { backgroundColor: user.status === 'validated' ? 'rgba(16,217,160,0.12)' : 'rgba(239,68,68,0.12)' },
        ]}>
          <Text style={[
            u.statusTxt,
            { color: user.status === 'validated' ? COLORS.success : COLORS.error },
          ]}>
            {user.status === 'validated' ? 'Validé' : 'Refusé'}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Composant EventRow ────────────────────────────────────────────────────────

function EventRow({ event, onDelete }) {
  const dateStr = event?.date
    ? new Date(event.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <View style={ev.row}>
      {event?.coverImage ? (
        <Image source={{ uri: event.coverImage }} style={ev.thumb} />
      ) : (
        <View style={ev.thumbPlaceholder}>
          <Ionicons name="calendar" size={20} color={COLORS.primary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={ev.title} numberOfLines={1}>{event.title}</Text>
        <View style={ev.chips}>
          {event.type && (
            <View style={ev.chip}>
              <Text style={ev.chipTxt}>{event.type}</Text>
            </View>
          )}
          {event.city && (
            <View style={ev.chip}>
              <Ionicons name="location-outline" size={10} color={COLORS.textMuted} />
              <Text style={ev.chipTxt}>{event.city}</Text>
            </View>
          )}
          <Text style={ev.date}>{dateStr}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={ev.delBtn}
        onPress={() => Alert.alert(
          'Supprimer',
          `Supprimer "${event.title}" ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: onDelete },
          ]
        )}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={16} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Modal Création d'événement ────────────────────────────────────────────────

function CreateEventModal({ visible, onClose, onCreated }) {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    type: '',
    description: '',
    tags: '',
    venue: '',
    address: '',
    city: '',
    date: '',
    time: '',
    coverImage: '',
    maxInfluencers: '',
    minFollowers: '',
    genderRequirement: 'all',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const reset = () => setForm({
    title: '', type: '', description: '', tags: '',
    venue: '', address: '', city: '', date: '', time: '',
    coverImage: '', maxInfluencers: '', minFollowers: '', genderRequirement: 'all',
  });

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      Alert.alert('Champ requis', 'Le titre est obligatoire.');
      return;
    }
    if (!form.city.trim()) {
      Alert.alert('Champ requis', 'La ville est obligatoire.');
      return;
    }
    setSaving(true);
    try {
      // Construire la date ISO
      let dateISO = null;
      if (form.date) {
        const parts = form.date.split('/');
        if (parts.length === 3) {
          const [d, m, y] = parts;
          const timeStr = form.time || '20:00';
          dateISO = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${timeStr}:00`).toISOString();
        }
      }

      const payload = {
        title: form.title.trim(),
        type: form.type || undefined,
        description: form.description.trim() || undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        venue: form.venue.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim(),
        date: dateISO || undefined,
        coverImage: form.coverImage.trim() || undefined,
        maxInfluencers: form.maxInfluencers ? parseInt(form.maxInfluencers, 10) : undefined,
        minFollowers: form.minFollowers ? parseInt(form.minFollowers, 10) : undefined,
        genderRequirement: form.genderRequirement !== 'all' ? form.genderRequirement : undefined,
      };

      await adminAPI.createEvent(payload);
      reset();
      onCreated();
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[mo.container, { paddingTop: insets.top || 16 }]}>
        <StatusBar barStyle="light-content" />

        {/* ── Header modal ── */}
        <View style={mo.header}>
          <TouchableOpacity onPress={handleClose} style={mo.closeBtn}>
            <Ionicons name="close" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <Text style={mo.title}>Créer un événement</Text>
          <View style={{ width: 38 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={mo.scroll}
            keyboardShouldPersistTaps="handled"
          >

            {/* ── Section : Informations de base ── */}
            <Text style={mo.sectionLabel}>Informations de base</Text>

            <View style={mo.field}>
              <Text style={mo.label}>Titre <Text style={mo.required}>*</Text></Text>
              <TextInput
                style={mo.input}
                value={form.title}
                onChangeText={v => set('title', v)}
                placeholder="Ex: Soirée VIP Le Palace"
                placeholderTextColor={COLORS.textMuted}
                autoFocus
              />
            </View>

            <View style={mo.field}>
              <Text style={mo.label}>Type d'établissement</Text>
              <View style={mo.typeGrid}>
                {EVENT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[mo.typeChip, form.type === t && mo.typeChipActive]}
                    onPress={() => set('type', form.type === t ? '' : t)}
                    activeOpacity={0.75}
                  >
                    <Text style={[mo.typeChipTxt, form.type === t && mo.typeChipTxtActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── Section : Description ── */}
            <Text style={mo.sectionLabel}>Description</Text>

            <View style={mo.field}>
              <Text style={mo.label}>Description</Text>
              <TextInput
                style={[mo.input, mo.inputMulti]}
                value={form.description}
                onChangeText={v => set('description', v)}
                placeholder="Décris l'événement, le dress code, l'ambiance..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={mo.field}>
              <Text style={mo.label}>Tags <Text style={mo.hint}>(séparés par des virgules)</Text></Text>
              <TextInput
                style={mo.input}
                value={form.tags}
                onChangeText={v => set('tags', v)}
                placeholder="Ex: VIP, Luxe, Open Bar, Dress Code"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
              />
            </View>

            {/* ── Section : Localisation ── */}
            <Text style={mo.sectionLabel}>Localisation</Text>

            <View style={mo.field}>
              <Text style={mo.label}>Nom de l'établissement</Text>
              <TextInput
                style={mo.input}
                value={form.venue}
                onChangeText={v => set('venue', v)}
                placeholder="Ex: Le Palace, Duplex Club..."
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={mo.field}>
              <Text style={mo.label}>Adresse</Text>
              <TextInput
                style={mo.input}
                value={form.address}
                onChangeText={v => set('address', v)}
                placeholder="Ex: 8 Rue du Faubourg Saint-Honoré"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <View style={mo.field}>
              <Text style={mo.label}>Ville <Text style={mo.required}>*</Text></Text>
              <TextInput
                style={mo.input}
                value={form.city}
                onChangeText={v => set('city', v)}
                placeholder="Ex: Paris"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            {/* ── Section : Date & Heure ── */}
            <Text style={mo.sectionLabel}>Date & Heure</Text>

            <View style={mo.row2}>
              <View style={[mo.field, { flex: 1 }]}>
                <Text style={mo.label}>Date</Text>
                <TextInput
                  style={mo.input}
                  value={form.date}
                  onChangeText={v => set('date', v)}
                  placeholder="JJ/MM/AAAA"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
              <View style={[mo.field, { flex: 1 }]}>
                <Text style={mo.label}>Heure</Text>
                <TextInput
                  style={mo.input}
                  value={form.time}
                  onChangeText={v => set('time', v)}
                  placeholder="HH:MM"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
            </View>

            {/* ── Section : Critères influenceurs ── */}
            <Text style={mo.sectionLabel}>Critères influenceurs</Text>

            <View style={mo.row2}>
              <View style={[mo.field, { flex: 1 }]}>
                <Text style={mo.label}>Max influenceurs</Text>
                <TextInput
                  style={mo.input}
                  value={form.maxInfluencers}
                  onChangeText={v => set('maxInfluencers', v.replace(/\D/g, ''))}
                  placeholder="Ex: 10"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[mo.field, { flex: 1 }]}>
                <Text style={mo.label}>Min. followers</Text>
                <TextInput
                  style={mo.input}
                  value={form.minFollowers}
                  onChangeText={v => set('minFollowers', v.replace(/\D/g, ''))}
                  placeholder="Ex: 5000"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={mo.field}>
              <Text style={mo.label}>Genre requis</Text>
              <View style={mo.genderRow}>
                {GENDER_OPTIONS.map(g => (
                  <TouchableOpacity
                    key={g.value}
                    style={[mo.genderChip, form.genderRequirement === g.value && mo.genderChipActive]}
                    onPress={() => set('genderRequirement', g.value)}
                    activeOpacity={0.75}
                  >
                    <Text style={[mo.genderTxt, form.genderRequirement === g.value && mo.genderTxtActive]}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── Section : Médias ── */}
            <Text style={mo.sectionLabel}>Médias</Text>

            <View style={mo.field}>
              <Text style={mo.label}>URL de la photo de couverture</Text>
              <TextInput
                style={mo.input}
                value={form.coverImage}
                onChangeText={v => set('coverImage', v)}
                placeholder="https://..."
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            {/* Prévisualisation image */}
            {form.coverImage.trim().length > 8 && (
              <View style={mo.previewWrap}>
                <Image
                  source={{ uri: form.coverImage.trim() }}
                  style={mo.preview}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Espace pour le bouton fixe */}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* ── Bouton Créer fixe ── */}
          <View style={[mo.footer, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={saving || !form.title.trim() || !form.city.trim()}
              activeOpacity={0.85}
            >
              {(!form.title.trim() || !form.city.trim()) ? (
                <View style={mo.submitDisabled}>
                  <Text style={mo.submitTxtDisabled}>Remplir titre et ville</Text>
                </View>
              ) : (
                <LinearGradient
                  colors={COLORS.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={mo.submit}
                >
                  {saving ? (
                    <ActivityIndicator color={COLORS.bg} size="small" />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={20} color={COLORS.bg} />
                      <Text style={mo.submitTxt}>Créer l'événement</Text>
                    </>
                  )}
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Écran principal ───────────────────────────────────────────────────────────

export default function AdminDashboardScreen() {
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('pending');
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [statsData, pendingData, allData] = await Promise.all([
        adminAPI.stats(),
        adminAPI.users({ status: 'pending' }),
        adminAPI.users({ limit: 50 }),
      ]);
      setStats(statsData);
      setPendingUsers(pendingData.users || []);
      setAllUsers(allData.users?.filter(u => u.type !== 'admin') || []);
    } catch (err) {
      console.log('Admin error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      // Essaie d'abord l'endpoint admin, fallback sur l'endpoint public
      let data;
      try {
        data = await adminAPI.events({ limit: 50 });
      } catch {
        data = await eventsAPI.list({ limit: 50 });
      }
      setEvents(data.events || []);
    } catch (err) {
      console.log('Events fetch error:', err.message);
    }
  }, []);

  useEffect(() => { fetchData(); fetchEvents(); }, [fetchData, fetchEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
    fetchEvents();
  };

  // ── Actions utilisateurs ───────────────────────────────────────────────────
  const updateUserStatus = async (userId, status) => {
    await adminAPI.updateStatus(userId, status);
    setPendingUsers(prev => prev.filter(u => u._id !== userId));
    setAllUsers(prev => prev.map(u => u._id === userId ? { ...u, status } : u));
    setStats(prev => prev ? {
      ...prev,
      pendingUsers: Math.max(0, (prev.pendingUsers || 0) - 1),
    } : prev);
  };

  // ── Suppression événement ──────────────────────────────────────────────────
  const deleteEvent = async (eventId) => {
    try {
      await adminAPI.deleteEvent(eventId);
      setEvents(prev => prev.filter(e => e._id !== eventId));
    } catch (err) {
      Alert.alert('Erreur', err.message);
    }
  };

  // ── Tabs config ───────────────────────────────────────────────────────────
  const TABS = [
    { key: 'pending', label: 'En attente', count: pendingUsers.length },
    { key: 'users', label: 'Utilisateurs', count: allUsers.length },
    { key: 'events', label: 'Événements', count: events.length },
  ];

  const displayedUsers = tab === 'pending'
    ? pendingUsers
    : allUsers.filter(u => u.status !== 'pending');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={['rgba(201,169,97,0.06)', 'transparent']}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <View>
          <Text style={styles.headerSub}>Administration</Text>
          <Text style={styles.headerTitle}>Tableau de bord</Text>
        </View>
        <TouchableOpacity
          onPress={() => Alert.alert('Déconnexion', 'Confirmer ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'OK', onPress: logout },
          ])}
          style={styles.logoutBtn}
        >
          <Ionicons name="log-out-outline" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.content}>

          {/* ── Stats ── */}
          {stats && (
            <View style={styles.statsGrid}>
              {[
                { label: 'Utilisateurs', value: stats.totalUsers, icon: 'people', color: COLORS.primaryLight },
                { label: 'En attente', value: stats.pendingUsers, icon: 'hourglass', color: COLORS.warning },
                { label: 'Influenceurs', value: stats.influencers, icon: 'person', color: COLORS.success },
                { label: 'Businesses', value: stats.businesses, icon: 'storefront', color: COLORS.primary },
                { label: 'Événements', value: stats.totalEvents ?? events.length, icon: 'calendar', color: COLORS.secondary },
                { label: 'Candidatures', value: stats.totalApplications, icon: 'document-text', color: COLORS.primaryLight },
              ].map((s, i) => (
                <View key={i} style={styles.statCard}>
                  <Ionicons name={s.icon} size={20} color={s.color} />
                  <Text style={[styles.statNum, { color: s.color }]}>{s.value ?? 0}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Alerte en attente ── */}
          {(stats?.pendingUsers || 0) > 0 && (
            <View style={styles.alertCard}>
              <Ionicons name="alert-circle" size={18} color={COLORS.warning} />
              <Text style={styles.alertTxt}>
                <Text style={{ fontFamily: FONTS.bold, color: COLORS.warning }}>
                  {stats.pendingUsers}
                </Text>
                {' '}compte{stats.pendingUsers > 1 ? 's' : ''} en attente de validation
              </Text>
            </View>
          )}

          {/* ── Tabs ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
            style={styles.tabsRow}
          >
            {TABS.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, tab === t.key && styles.tabActive]}
                onPress={() => setTab(t.key)}
              >
                <Text style={[styles.tabTxt, tab === t.key && styles.tabTxtActive]}>
                  {t.label}
                  {t.count > 0 && ` (${t.count})`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── Contenu par onglet ── */}
          {loading ? (
            <ActivityIndicator color={COLORS.primaryLight} style={{ marginTop: SPACING.xl }} />
          ) : (
            <>
              {/* Onglet Utilisateurs (pending + all) */}
              {(tab === 'pending' || tab === 'users') && (
                <>
                  {displayedUsers.length === 0 ? (
                    <View style={styles.empty}>
                      <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
                      <Text style={styles.emptyTxt}>
                        {tab === 'pending' ? 'Aucun compte en attente' : 'Aucun utilisateur'}
                      </Text>
                    </View>
                  ) : (
                    displayedUsers.map(user => (
                      <UserRow
                        key={user._id}
                        user={user}
                        onValidate={() => updateUserStatus(user._id, 'validated')}
                        onReject={() => updateUserStatus(user._id, 'rejected')}
                      />
                    ))
                  )}
                </>
              )}

              {/* Onglet Événements */}
              {tab === 'events' && (
                <>
                  {events.length === 0 ? (
                    <View style={styles.empty}>
                      <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
                      <Text style={styles.emptyTxt}>Aucun événement créé</Text>
                      <Text style={styles.emptyHint}>Appuie sur + pour créer le premier</Text>
                    </View>
                  ) : (
                    events.map(e => (
                      <EventRow
                        key={e._id}
                        event={e}
                        onDelete={() => deleteEvent(e._id)}
                      />
                    ))
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* ── FAB Créer événement ── */}
      {tab === 'events' && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 20 }]}
          onPress={() => setShowCreateEvent(true)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={COLORS.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGrad}
          >
            <Ionicons name="add" size={28} color={COLORS.bg} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* ── Modal Création ── */}
      <CreateEventModal
        visible={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        onCreated={() => {
          setShowCreateEvent(false);
          fetchEvents();
          fetchData();
        }}
      />
    </View>
  );
}

// ─── Styles principaux ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerSub: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.bold,
  },
  logoutBtn: { padding: 8, marginTop: 4 },

  content: { paddingHorizontal: SPACING.lg },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    width: '30.5%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  statNum: {
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    textAlign: 'center',
    fontFamily: FONTS.regular,
  },

  // Alert
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  alertTxt: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    flex: 1,
    fontFamily: FONTS.regular,
  },

  // Tabs
  tabsRow: { marginBottom: SPACING.md },
  tabsScroll: { gap: SPACING.sm },
  tab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryLight },
  tabTxt: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
  },
  tabTxtActive: { color: COLORS.bg, fontFamily: FONTS.semiBold },

  // Empty
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.sm },
  emptyTxt: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.medium,
  },
  emptyHint: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    borderRadius: 28,
    overflow: 'hidden',
  },
  fabGrad: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Styles UserRow ────────────────────────────────────────────────────────────

const u = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  info: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(201,169,97,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarTxt: { color: COLORS.primary, fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 },
  name: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  typeBadge: { borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 2 },
  typeTxt: { fontSize: 10, fontFamily: FONTS.semiBold },
  email: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  sub: { color: COLORS.primary, fontSize: FONTS.sizes.xs, marginTop: 2, fontFamily: FONTS.regular },
  actions: { flexDirection: 'row', gap: SPACING.xs },
  btn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  btnReject: { backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)' },
  btnApprove: { backgroundColor: COLORS.success },
  statusPill: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 4 },
  statusTxt: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },
});

// ─── Styles EventRow ───────────────────────────────────────────────────────────

const ev = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard2,
  },
  thumbPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(201,169,97,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.semiBold,
    marginBottom: 5,
  },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(201,169,97,0.08)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  chipTxt: { color: COLORS.primary, fontSize: 10, fontFamily: FONTS.medium },
  date: { color: COLORS.textMuted, fontSize: 10, fontFamily: FONTS.regular },
  delBtn: {
    padding: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)',
  },
});

// ─── Styles Modal ──────────────────────────────────────────────────────────────

const mo = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.bold,
  },

  scroll: { padding: SPACING.lg },

  sectionLabel: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },

  field: { marginBottom: SPACING.md },

  label: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
    marginBottom: 8,
  },
  required: { color: COLORS.primary },
  hint: { color: COLORS.textMuted, fontFamily: FONTS.regular },

  input: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.regular,
  },
  inputMulti: {
    minHeight: 100,
    paddingTop: 13,
  },

  row2: { flexDirection: 'row', gap: SPACING.sm },

  // Type grid
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeChipActive: {
    backgroundColor: 'rgba(201,169,97,0.12)',
    borderColor: COLORS.primary,
  },
  typeChipTxt: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
  },
  typeChipTxtActive: { color: COLORS.primary, fontFamily: FONTS.semiBold },

  // Genre
  genderRow: { flexDirection: 'row', gap: SPACING.sm },
  genderChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  genderChipActive: {
    backgroundColor: 'rgba(201,169,97,0.1)',
    borderColor: COLORS.primary,
  },
  genderTxt: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
  },
  genderTxtActive: { color: COLORS.primary, fontFamily: FONTS.semiBold },

  // Preview image
  previewWrap: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  preview: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.bgCard2,
  },

  // Footer
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  submit: {
    height: 56,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  submitTxt: {
    color: COLORS.bg,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.semiBold,
  },
  submitDisabled: {
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitTxtDisabled: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.medium,
  },
});
