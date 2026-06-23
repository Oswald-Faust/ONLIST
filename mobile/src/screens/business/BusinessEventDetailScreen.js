import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList,
  StatusBar, Alert, Image, ActivityIndicator, RefreshControl, Modal, TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { CATEGORY_LABELS } from '../../constants/categories';
import { eventsAPI, applicationsAPI, deliverablesAPI } from '../../services/api';
import { getDeliverableLabel } from '../../constants/businessEventOptions';

const MOMENT_LABELS = { morning: 'Matin', afternoon: 'Apres-midi', evening: 'Soir', night: 'Nuit' };

// --- Tabs ---
function TabBar({ activeTab, onPress, counts }) {
  const tabs = [
    { id: 'details',       label: 'Détails' },
    { id: 'inscriptions',  label: `Inscriptions (${counts.pending})` },
    { id: 'attestations',  label: `Présences (${counts.checkedIn})` },
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
                      ? `Scanné${item.checkedInAt ? ` · ${new Date(item.checkedInAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}`
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

// --- Main Screen ---
export default function BusinessEventDetailScreen({ route, navigation }) {
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

  useEffect(() => { load(); }, [load]);

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

  const counts = {
    pending:  applications.filter(a => a.status === 'pending').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    checkedIn: applications.filter(a => a.status === 'accepted' && a.checkedIn).length,
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
          <AttestationsTab applications={applications} navigation={navigation} eventId={eventId} onCheckIn={handleCheckInApp} submissionsByApplication={submissionsByApplication} />
        )}
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
});
