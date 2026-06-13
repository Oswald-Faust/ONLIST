import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Alert, TextInput, Modal, FlatList, Switch, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { CATEGORY_OPTIONS } from '../../constants/categories';
import { eventsAPI, lieuxAPI, uploadAPI } from '../../services/api';
import LocationAutocompleteFields from '../../components/LocationAutocompleteFields';
import { useAuth } from '../../context/AuthContext';
import { getBusinessPlan } from '../../constants/businessPlans';
import {
  APPLICATION_CUTOFF_OPTIONS,
  BOOST_OPTIONS,
  DELIVERABLE_OPTIONS,
  OFFER_TAGS_BY_CATEGORY,
} from '../../constants/businessEventOptions';

const TOTAL_STEPS = 5;
const STEP_LABELS = ['Lieu', 'Médias', 'Description', 'Contenu', 'Paramètres'];

const CATEGORIES = CATEGORY_OPTIONS;

const MOMENTS = [
  { value: 'morning',   label: 'Matin' },
  { value: 'afternoon', label: 'Après-midi' },
  { value: 'evening',   label: 'Soir' },
  { value: 'night',     label: 'Nuit' },
];

// ─── Stepper ──────────────────────────────────────────────────────────────────────────────
function Stepper({ currentStep }) {
  return (
    <View style={st.wrap}>
      {[1, 2, 3, 4, 5].map((step, i) => {
        const done = step < currentStep;
        const active = step === currentStep;
        return (
          <React.Fragment key={step}>
            <View style={st.stepCol}>
              <View style={[st.circle, done && st.circleDone, active && st.circleActive]}>
                {done
                  ? <Ionicons name="checkmark" size={12} color="#0A0A0F" />
                  : <Text style={[st.num, active && st.numActive]}>{step}</Text>}
              </View>
              <Text style={[st.lbl, active && st.lblActive]} numberOfLines={1}>{STEP_LABELS[i]}</Text>
            </View>
            {i < 4 && <View style={[st.line, done && st.lineDone]} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}
const st = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginBottom: SPACING.xl, paddingHorizontal: SPACING.sm },
  stepCol: { alignItems: 'center', gap: 4, width: 58 },
  circle: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgCard2, borderWidth: 1.5, borderColor: COLORS.border,
  },
  circleActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(201,169,97,0.12)' },
  circleDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  num: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },
  numActive: { color: COLORS.primary },
  lbl: { color: COLORS.textMuted, fontSize: 10, fontFamily: FONTS.medium, textAlign: 'center' },
  lblActive: { color: COLORS.primary },
  line: { flex: 1, height: 1.5, backgroundColor: COLORS.border, marginTop: 13 },
  lineDone: { backgroundColor: COLORS.primary },
});

// ─── InputBlock ───────────────────────────────────────────────────────────────────────────
function InputBlock({ label, required, hint, children }) {
  return (
    <View style={s.inputBlock}>
      <Text style={s.inputLabel}>{label}{required && <Text style={{ color: COLORS.primary }}> *</Text>}</Text>
      {children}
      {hint ? <Text style={s.inputHint}>{hint}</Text> : null}
    </View>
  );
}

function StyledInput({ value, onChangeText, placeholder, multiline, keyboardType, numberOfLines }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textMuted}
      multiline={multiline}
      keyboardType={keyboardType || 'default'}
      numberOfLines={numberOfLines || 1}
      style={[s.textInput, multiline && { height: (numberOfLines || 3) * 22 + 24, textAlignVertical: 'top' }]}
    />
  );
}

function formatDateValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTimeValue(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function parseDurationMinutes(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  return end - start;
}

function formatDuration(minutes) {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours}h${String(mins).padStart(2, '0')}`;
  if (hours) return `${hours}h`;
  return `${mins} min`;
}

const PLAN_ORDER = ['starter', 'pro', 'group'];

function isPlanAllowedForOption(planKey, minPlan) {
  return PLAN_ORDER.indexOf(planKey) >= PLAN_ORDER.indexOf(minPlan);
}

function PickerField({ label, value, placeholder, icon, onPress }) {
  return (
    <TouchableOpacity style={s.pickerField} onPress={onPress} activeOpacity={0.85}>
      <View style={s.pickerFieldLeft}>
        {icon ? <Ionicons name={icon} size={16} color={COLORS.textMuted} /> : null}
        <Text style={[s.pickerFieldText, !value && s.pickerFieldPlaceholder]}>{value || placeholder}</Text>
      </View>
      <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

// ─── Tag input ──────────────────────────────────────────────────────────────────────────────
function TagInput({ values, onAdd, onRemove, placeholder }) {
  const [text, setText] = useState('');
  return (
    <View>
      <View style={s.tagInputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder || 'Ajouter...'}
          placeholderTextColor={COLORS.textMuted}
          style={[s.textInput, { flex: 1 }]}
          onSubmitEditing={() => {
            if (text.trim()) { onAdd(text.trim()); setText(''); }
          }}
          returnKeyType="done"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={s.tagAddBtn}
          onPress={() => { if (text.trim()) { onAdd(text.trim()); setText(''); } }}
        >
          <Ionicons name="add" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      {values.length > 0 && (
        <View style={s.tagsWrap}>
          {values.map((v, i) => (
            <View key={i} style={s.tagChip}>
              <Text style={s.tagChipText}>{v}</Text>
              <TouchableOpacity onPress={() => onRemove(i)}>
                <Ionicons name="close" size={12} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────────────────
export default function CreateEventScreen({ route, navigation }) {
  const { user } = useAuth();
  const businessPlan = getBusinessPlan(user?.subscriptionPlan);
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [lieux, setLieux] = useState([]);
  const [lieuModalVisible, setLieuModalVisible] = useState(false);
  const [pickerConfig, setPickerConfig] = useState(null);
  const [successModal, setSuccessModal] = useState({ visible: false, mode: 'create' });

  const toEdit = route.params?.eventToEdit;
  const toDup = route.params?.eventToDuplicate;
  const lieuPreselected = route.params?.lieuPreselected;
  const source = toEdit || toDup;
  const isEdit = !!toEdit;

  const parseDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const parseTime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const [form, setForm] = useState({
    title: source?.title || '',
    lieuId: lieuPreselected?._id || null,
    lieuName: lieuPreselected?.name || '',
    venueCustom: source?.venue || '',
    address: source?.address || '',
    postalCode: '',
    city: lieuPreselected?.city || source?.city || '',
    date: parseDate(source?.date) || '',
    startTime: source?.startTime || parseTime(source?.date) || '',
    endTime: source?.endTime || '',
    requiredArrivalTime: source?.requiredArrivalTime || '',
    minimumPresenceDuration: source?.minimumPresenceDuration || '',
    applicationCutoffOffsetHours: String(source?.applicationCutoffOffsetHours || '2'),
    images: source?.images || [],
    category: source?.category || '',
    moment: source?.moment || 'evening',
    description: source?.description || '',
    offerItems: source?.offerItems || [],
    otherOffer: source?.otherOffer || '',
    deliverables: source?.deliverables || [],
    otherDeliverable: source?.otherDeliverable || '',
    accountsToMention: source?.accountsToMention?.length ? source.accountsToMention : (user?.instagram ? [`@${String(user.instagram).replace(/^@/, '')}`] : []),
    maxParticipants: String(source?.maxParticipants || '10'),
    plusOneMode: source?.plusOneMode || 'solo',
    isAdultsOnly: Boolean(source?.isAdultsOnly || (source?.ageRequirement && Number(source.ageRequirement) >= 18)),
    dresscode: source?.dresscode || '',
    boostDurationDays: String(source?.boostDurationDays || '0'),
    isSponsored: source?.isSponsored || false,
    isActive: source?.isActive !== undefined ? source.isActive : true,
  });

  const upd = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const openPicker = (field) => {
    const initial =
      field === 'time'
        ? form.startTime
          ? new Date(`2025-01-01T${form.startTime}:00`)
          : new Date()
        : field === 'endTime'
          ? form.endTime
            ? new Date(`2025-01-01T${form.endTime}:00`)
            : new Date()
          : field === 'requiredArrivalTime'
            ? form.requiredArrivalTime
              ? new Date(`2025-01-01T${form.requiredArrivalTime}:00`)
              : new Date()
          : form.date
            ? new Date(`${form.date}T12:00:00`)
            : new Date();

    setPickerConfig({
      field,
      mode: ['time', 'endTime', 'requiredArrivalTime'].includes(field) ? 'time' : 'date',
      value: initial,
    });
  };

  const handlePickerChange = (_, selectedDate) => {
    if (!pickerConfig) return;
    if (Platform.OS === 'android') {
      if (!selectedDate) {
        setPickerConfig(null);
        return;
      }
      if (pickerConfig.field === 'time') upd('startTime', formatTimeValue(selectedDate));
      if (pickerConfig.field === 'endTime') upd('endTime', formatTimeValue(selectedDate));
      if (pickerConfig.field === 'requiredArrivalTime') upd('requiredArrivalTime', formatTimeValue(selectedDate));
      if (pickerConfig.field === 'date') upd('date', formatDateValue(selectedDate));
      setPickerConfig(null);
      return;
    }

    if (selectedDate) {
      setPickerConfig((prev) => ({ ...prev, value: selectedDate }));
    }
  };

  const confirmIosPicker = () => {
    if (!pickerConfig) return;
    if (pickerConfig.field === 'time') upd('startTime', formatTimeValue(pickerConfig.value));
    if (pickerConfig.field === 'endTime') upd('endTime', formatTimeValue(pickerConfig.value));
    if (pickerConfig.field === 'requiredArrivalTime') upd('requiredArrivalTime', formatTimeValue(pickerConfig.value));
    if (pickerConfig.field === 'date') upd('date', formatDateValue(pickerConfig.value));
    setPickerConfig(null);
  };

  useEffect(() => {
    lieuxAPI.mine().then(d => setLieux(d.lieux || [])).catch(() => {});
  }, []);

  // ─── Image picking ──────────────────────────────────────────────────────────────────────────
  const addEventImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission refusée', "Accès à la galerie requis."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, 6 - form.images.length),
    });
    if (result.canceled) return;
    setUploadingImg(true);
    try {
      const uploaded = [];
      for (const asset of result.assets) {
        const data = await uploadAPI.image(asset.uri, {
          mimeType: asset.mimeType,
          fileName: asset.fileName,
        });
        uploaded.push(data.url);
      }
      upd('images', [...form.images, ...uploaded].slice(0, 6));
    } catch (err) {
      Alert.alert('Erreur upload', err.message);
    } finally {
      setUploadingImg(false);
    }
  };

  const removeImage = (index) => {
    upd('images', form.images.filter((_, i) => i !== index));
  };

  const toggleOfferItem = (value) => {
    const has = form.offerItems.includes(value);
    upd('offerItems', has ? form.offerItems.filter((item) => item !== value) : [...form.offerItems, value]);
  };

  const toggleDeliverableItem = (value, minPlan) => {
    if (!isPlanAllowedForOption(businessPlan.key, minPlan)) return;
    const has = form.deliverables.includes(value);
    let nextDeliverables = has
      ? form.deliverables.filter((item) => item !== value)
      : [...form.deliverables, value];
    if (form.plusOneMode === 'required' && !nextDeliverables.includes('google_review_plus_one_screen')) {
      nextDeliverables = [...nextDeliverables, 'google_review_plus_one_screen'];
    }
    upd('deliverables', nextDeliverables);
  };

  useEffect(() => {
    if (form.plusOneMode === 'required' && !form.deliverables.includes('google_review_plus_one_screen')) {
      upd('deliverables', [...form.deliverables, 'google_review_plus_one_screen']);
    }
    if (form.plusOneMode === 'solo' && form.deliverables.includes('google_review_plus_one_screen')) {
      upd('deliverables', form.deliverables.filter((item) => item !== 'google_review_plus_one_screen'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.plusOneMode]);

  // ─── Validation ───────────────────────────────────────────────────────────────────────────────
  const validateStep = () => {
    if (step === 1) {
      if (!form.title.trim()) { Alert.alert('Titre requis'); return false; }
      if (!form.date.trim()) { Alert.alert('Date requise'); return false; }
      if (!form.city.trim()) { Alert.alert('Ville requise'); return false; }
      if (!form.startTime.trim()) { Alert.alert('Heure de début requise'); return false; }
      if (!form.endTime.trim()) { Alert.alert('Heure de fin requise'); return false; }
      if (!parseDurationMinutes(form.startTime, form.endTime)) { Alert.alert('Heure de fin invalide', "L'heure de fin doit être après l'heure de début."); return false; }
      if (!form.lieuId && !form.venueCustom.trim()) { Alert.alert('Nom du lieu requis'); return false; }
    }
    if (step === 3) {
      if (!form.category) { Alert.alert('Catégorie requise'); return false; }
      if (!form.description.trim()) { Alert.alert('Description requise'); return false; }
    }
    return true;
  };

  const goNext = () => { if (validateStep()) setStep(s => s + 1); };
  const goPrev = () => setStep(s => s - 1);
  const closeSuccessModal = () => {
    setSuccessModal({ visible: false, mode: 'create' });
    navigation.goBack();
  };

  // ─── Brouillon ─────────────────────────────────────────────────────────────────────────────────
  const isDraftSource = source?.status === 'draft';
  // On propose le brouillon à la création OU à la reprise d'un brouillon (jamais sur un event publié)
  const canSaveDraft = !isEdit || isDraftSource;

  const hasContent = () => Boolean(
    form.title?.trim() || form.description?.trim() || form.city?.trim() ||
    form.date || (form.images && form.images.length) || form.lieuId || form.venueCustom?.trim()
  );

  const buildDraftPayload = () => {
    let dateISO;
    if (form.date) {
      const dObj = new Date(`${form.date}T${form.startTime || '20:00'}:00`);
      if (!isNaN(dObj.getTime())) dateISO = dObj.toISOString();
    }
    return {
      status: 'draft',
      isActive: false,
      title: form.title?.trim() || '',
      lieu: form.lieuId || undefined,
      venue: form.lieuId ? form.lieuName : form.venueCustom,
      address: form.lieuId ? (lieux.find((item) => item._id === form.lieuId)?.address || '') : (form.address?.trim() || ''),
      city: form.city?.trim() || '',
      date: dateISO,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      category: form.category || undefined,
      moment: form.moment,
      description: form.description?.trim() || '',
      images: form.images,
      offerItems: form.offerItems,
      otherOffer: form.otherOffer?.trim() || '',
      deliverables: form.deliverables,
      otherDeliverable: form.otherDeliverable?.trim() || '',
      accountsToMention: form.accountsToMention,
      maxParticipants: parseInt(form.maxParticipants) || undefined,
      plusOneMode: form.plusOneMode,
      isAdultsOnly: form.isAdultsOnly,
      dresscode: form.dresscode?.trim() || '',
      isSponsored: form.isSponsored,
    };
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const payload = buildDraftPayload();
      if (isEdit) {
        await eventsAPI.update(toEdit._id, payload);
      } else {
        await eventsAPI.create(payload);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExit = () => {
    if (!canSaveDraft || !hasContent()) {
      navigation.goBack();
      return;
    }
    Alert.alert(
      'Enregistrer en brouillon ?',
      'Garde cet événement en brouillon pour le terminer plus tard. Il ne sera pas visible par les influenceurs.',
      [
        { text: 'Quitter sans enregistrer', style: 'destructive', onPress: () => navigation.goBack() },
        { text: 'Annuler', style: 'cancel' },
        { text: 'Enregistrer en brouillon', onPress: handleSaveDraft },
      ]
    );
  };

  // ─── Submit ────────────────────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSaving(true);
    try {
      const dateObj = new Date(`${form.date}T${form.startTime || '20:00'}:00`);
      if (isNaN(dateObj.getTime())) throw new Error('Format de date invalide (YYYY-MM-DD)');
      const payload = {
        title: form.title.trim(),
        lieu: form.lieuId || undefined,
        venue: form.lieuId ? form.lieuName : form.venueCustom,
        address: form.lieuId ? (lieux.find((item) => item._id === form.lieuId)?.address || '') : form.address.trim(),
        city: form.city.trim(),
        date: dateObj.toISOString(),
        startTime: form.startTime,
        endTime: form.endTime,
        requiredArrivalTime: form.requiredArrivalTime || undefined,
        minimumPresenceDuration: form.minimumPresenceDuration ? Number(form.minimumPresenceDuration) : undefined,
        applicationCutoffOffsetHours: Number(form.applicationCutoffOffsetHours) || 1,
        images: form.images,
        category: form.category,
        moment: form.moment,
        description: form.description.trim(),
        offerItems: form.offerItems,
        otherOffer: form.otherOffer.trim(),
        deliverables: form.otherDeliverable.trim()
          ? [...form.deliverables, form.otherDeliverable.trim()]
          : form.deliverables,
        otherDeliverable: form.otherDeliverable.trim(),
        accountsToMention: form.accountsToMention,
        maxParticipants: businessPlan.maxCreatorsPerEvent
          ? Math.min(parseInt(form.maxParticipants) || businessPlan.maxCreatorsPerEvent, businessPlan.maxCreatorsPerEvent)
          : (parseInt(form.maxParticipants) || 10),
        plusOneMode: form.plusOneMode,
        isAdultsOnly: form.isAdultsOnly,
        dresscode: form.dresscode.trim(),
        boostDurationDays: form.isSponsored && Number(form.boostDurationDays)
          ? Number(form.boostDurationDays)
          : undefined,
        isSponsored: form.isSponsored,
        isActive: form.isActive,
        status: 'published',
      };
      if (isEdit) {
        await eventsAPI.update(toEdit._id, payload);
        setSuccessModal({ visible: true, mode: 'edit' });
      } else {
        await eventsAPI.create(payload);
        setSuccessModal({ visible: true, mode: 'create' });
      }
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Render Steps ────────────────────────────────────────────────────────────────────────────
  const renderStep = () => {
    const durationMinutes = parseDurationMinutes(form.startTime, form.endTime);
    const offerTags = OFFER_TAGS_BY_CATEGORY[form.category || lieuPreselected?.category || user?.businessType || 'other'] || OFFER_TAGS_BY_CATEGORY.other;
    switch (step) {
      // ── Step 1 ────────────────────────────────────────────────────────────────────────────────
      case 1:
        return (
          <View style={s.stepContent}>
            <InputBlock label="Titre de l'événement" required>
              <StyledInput value={form.title} onChangeText={v => upd('title', v)} placeholder="Jazz Night Under the Stars" />
            </InputBlock>

            <InputBlock label="Lieu">
              <View style={s.lieuModeActions}>
                <TouchableOpacity style={s.lieuPickBtn} onPress={() => setLieuModalVisible(true)}>
                  <Ionicons name="business-outline" size={16} color={COLORS.textMuted} />
                  <Text style={s.lieuPickBtnText}>Choisir un lieu enregistré</Text>
                  <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
                </TouchableOpacity>
                {!form.lieuId ? (
                  <View style={s.lieuFreeBadge}>
                    <Ionicons name="sparkles-outline" size={14} color={COLORS.primary} />
                    <Text style={s.lieuFreeBadgeText}>Lieu libre autorisé</Text>
                  </View>
                ) : null}
              </View>

              {lieux.length === 0 ? (
                <View style={s.emptyLieuxNotice}>
                  <View style={s.emptyLieuxNoticeIcon}>
                    <Ionicons name="storefront-outline" size={16} color={COLORS.primary} />
                  </View>
                  <View style={s.emptyLieuxNoticeBody}>
                    <Text style={s.emptyLieuxNoticeTitle}>Aucun lieu enregistré pour le moment</Text>
                    <Text style={s.emptyLieuxNoticeText}>
                      Crée d'abord un lieu pour le réutiliser facilement dans tes prochains événements.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={s.emptyLieuxNoticeBtn}
                    onPress={() => navigation.navigate('CreateLieu')}
                    activeOpacity={0.85}
                  >
                    <Text style={s.emptyLieuxNoticeBtnText}>Créer un lieu</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {form.lieuId ? (
                <View style={s.lieuSelected}>
                  <View style={s.lieuSelectedInfo}>
                    <Ionicons name="business" size={16} color={COLORS.primary} />
                    <Text style={s.lieuSelectedName}>{form.lieuName}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { upd('lieuId', null); upd('lieuName', ''); upd('address', ''); }} style={s.lieuClear}>
                    <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </InputBlock>

            {!form.lieuId && (
              <InputBlock label="Nom du lieu" required>
                <StyledInput value={form.venueCustom} onChangeText={v => upd('venueCustom', v)} placeholder="Sky Lounge Paris" />
              </InputBlock>
            )}

            {!form.lieuId ? (
              <LocationAutocompleteFields
                address={form.address}
                city={form.city}
                postalCode={form.postalCode}
                onChangeAddress={(v) => upd('address', v)}
                onChangeCity={(v) => upd('city', v)}
                onChangePostalCode={(v) => upd('postalCode', v)}
                addressLabel="Adresse du lieu"
              />
            ) : (
              <InputBlock label="Ville" required>
                <StyledInput value={form.city} onChangeText={v => upd('city', v)} placeholder="Paris" />
              </InputBlock>
            )}

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <InputBlock label="Date" required>
                  <PickerField
                    value={form.date}
                    placeholder="Sélectionner une date"
                    icon="calendar-outline"
                    onPress={() => openPicker('date')}
                  />
                </InputBlock>
              </View>
              <View style={{ width: SPACING.md }} />
              <View style={{ flex: 1 }}>
                <InputBlock label="Heure de début" required>
                  <PickerField
                    value={form.startTime}
                    placeholder="Sélectionner l'heure"
                    icon="time-outline"
                    onPress={() => openPicker('time')}
                  />
                </InputBlock>
              </View>
            </View>

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <InputBlock label="Heure de fin" required>
                  <PickerField
                    value={form.endTime}
                    placeholder="Sélectionner l'heure"
                    icon="time-outline"
                    onPress={() => openPicker('endTime')}
                  />
                </InputBlock>
              </View>
              <View style={{ width: SPACING.md }} />
              <View style={{ flex: 1 }}>
                <InputBlock label="Durée">
                  <View style={s.readOnlyField}>
                    <Text style={s.readOnlyFieldText}>{formatDuration(durationMinutes) || 'À définir'}</Text>
                  </View>
                </InputBlock>
              </View>
            </View>

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <InputBlock label="Heure d’arrivée requise">
                  <PickerField
                    value={form.requiredArrivalTime}
                    placeholder="Ex: 18:30"
                    icon="walk-outline"
                    onPress={() => openPicker('requiredArrivalTime')}
                  />
                </InputBlock>
              </View>
              <View style={{ width: SPACING.md }} />
              <View style={{ flex: 1 }}>
                <InputBlock label="Présence min. (min)">
                  <StyledInput value={form.minimumPresenceDuration} onChangeText={(v) => upd('minimumPresenceDuration', v.replace(/[^0-9]/g, ''))} placeholder="120" keyboardType="numeric" />
                </InputBlock>
              </View>
            </View>

            <InputBlock label="Heure limite de candidature">
              <View style={s.optionRowWrap}>
                {APPLICATION_CUTOFF_OPTIONS.map((hours) => {
                  const active = String(hours) === String(form.applicationCutoffOffsetHours);
                  return (
                    <TouchableOpacity key={hours} style={[s.optionChip, active && s.optionChipActive]} onPress={() => upd('applicationCutoffOffsetHours', String(hours))}>
                      <Text style={[s.optionChipText, active && s.optionChipTextActive]}>{hours}h avant</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </InputBlock>
          </View>
        );

      // ── Step 2 ────────────────────────────────────────────────────────────────────────────────
      case 2:
        return (
          <View style={s.stepContent}>
            <Text style={s.stepSectionTitle}>Photo de couverture</Text>
            <TouchableOpacity style={s.coverPicker} onPress={addEventImages} disabled={uploadingImg}>
              {form.images[0] ? (
                <>
                  <Image source={{ uri: form.images[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <LinearGradient colors={['transparent', 'rgba(10,10,15,0.7)']} style={StyleSheet.absoluteFill} />
                  <View style={s.coverChange}>
                    <Ionicons name="camera" size={18} color={COLORS.white} />
                    <Text style={s.coverChangeText}>Changer</Text>
                  </View>
                </>
              ) : uploadingImg ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <>
                  <View style={s.coverPlaceholderIcon}>
                    <Ionicons name="image-outline" size={32} color={COLORS.primary} />
                  </View>
                  <Text style={s.coverPlaceholderText}>Ajouter une photo de couverture</Text>
                  <Text style={s.coverPlaceholderSub}>Recommandé : 1200×800px</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={[s.stepSectionTitle, { marginTop: SPACING.lg }]}>Photos supplémentaires</Text>
            <View style={s.extraImagesRow}>
              {form.images.slice(1).map((uri, index) => (
                <View key={`${uri}-${index}`} style={s.extraImageSlot}>
                  <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <TouchableOpacity style={s.removeImgBtn} onPress={() => removeImage(index + 1)}>
                    <Ionicons name="close-circle" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))}
              {form.images.length < 6 ? (
                <TouchableOpacity style={s.extraImageSlot} onPress={addEventImages} disabled={uploadingImg}>
                  <Ionicons name="add" size={24} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={s.inputHint}>Ajoute plusieurs visuels d’un coup pour présenter le lieu et l’ambiance de l’événement.</Text>
          </View>
        );

      // ── Step 3 ────────────────────────────────────────────────────────────────────────────────
      case 3:
        return (
          <View style={s.stepContent}>
            <InputBlock label="Catégorie" required>
              <View style={s.catGrid}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[s.catChip, form.category === cat.value && s.catChipActive]}
                    onPress={() => upd('category', cat.value)}
                  >
                    <Ionicons name={cat.icon} size={14} color={form.category === cat.value ? COLORS.primary : COLORS.textMuted} />
                    <Text style={[s.catChipText, form.category === cat.value && s.catChipTextActive]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </InputBlock>

            <InputBlock label="Moment">
              <View style={s.momentRow}>
                {MOMENTS.map(m => (
                  <TouchableOpacity
                    key={m.value}
                    style={[s.momentChip, form.moment === m.value && s.momentChipActive]}
                    onPress={() => upd('moment', m.value)}
                  >
                    <Text style={[s.momentChipText, form.moment === m.value && s.momentChipTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </InputBlock>

            <InputBlock label="Description" required>
              <StyledInput value={form.description} onChangeText={v => upd('description', v)} placeholder="Décrivez l'ambiance et l'expérience proposée..." multiline numberOfLines={5} />
            </InputBlock>
          </View>
        );

      // ── Step 4 ────────────────────────────────────────────────────────────────────────────────
      case 4:
        return (
          <View style={s.stepContent}>
            <InputBlock label="Ce que vous offrez">
              <View style={s.tagsWrap}>
                {offerTags.map((tag) => {
                  const active = form.offerItems.includes(tag);
                  return (
                    <TouchableOpacity key={tag} style={[s.tagChip, active && s.tagChipActive]} onPress={() => toggleOfferItem(tag)}>
                      <Text style={[s.tagChipText, active && s.tagChipTextActive]}>{tag}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <StyledInput value={form.otherOffer} onChangeText={v => upd('otherOffer', v)} placeholder="Autre avantage à préciser..." />
            </InputBlock>

            <InputBlock label="Livrables attendus" hint="Les options non incluses dans votre pack restent visibles mais verrouillées.">
              <View style={s.tagsWrap}>
                {DELIVERABLE_OPTIONS.map((option) => {
                  const active = form.deliverables.includes(option.key);
                  const allowed = isPlanAllowedForOption(businessPlan.key, option.minPlan);
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[s.tagChip, active && s.tagChipActive, !allowed && s.lockedChip]}
                      onPress={() => toggleDeliverableItem(option.key, option.minPlan)}
                      disabled={!allowed}
                    >
                      {!allowed ? <Ionicons name="lock-closed" size={12} color={COLORS.textMuted} /> : null}
                      <Text style={[s.tagChipText, active && s.tagChipTextActive, !allowed && s.lockedChipText]}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={s.planHint}>Disponible à partir du pack correspondant. Upgrade pour déverrouiller les livrables premium.</Text>
              <StyledInput value={form.otherDeliverable} onChangeText={v => upd('otherDeliverable', v)} placeholder="Autre livrable spécifique..." />
            </InputBlock>

            <InputBlock label="Comptes à mentionner">
              <TagInput
                values={form.accountsToMention}
                onAdd={v => upd('accountsToMention', [...form.accountsToMention, v])}
                onRemove={i => upd('accountsToMention', form.accountsToMention.filter((_, idx) => idx !== i))}
                placeholder="@votre_compte..."
              />
            </InputBlock>
          </View>
        );

      // ── Step 5 ────────────────────────────────────────────────────────────────────────────────
      case 5:
        return (
          <View style={s.stepContent}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <InputBlock label="Nb de places max">
                  <StyledInput value={form.maxParticipants} onChangeText={v => upd('maxParticipants', v)} placeholder="10" keyboardType="numeric" />
                </InputBlock>
              </View>
              <View style={{ width: SPACING.md }} />
              <View style={{ flex: 1 }}>
                <InputBlock label="Mode invité">
                  <View style={s.optionRowWrap}>
                    {[
                      { key: 'solo', label: 'Solo' },
                      { key: 'required', label: '+1 Required' },
                    ].map((option) => {
                      const active = form.plusOneMode === option.key;
                      return (
                        <TouchableOpacity key={option.key} style={[s.optionChip, active && s.optionChipActive]} onPress={() => upd('plusOneMode', option.key)}>
                          <Text style={[s.optionChipText, active && s.optionChipTextActive]}>{option.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </InputBlock>
              </View>
            </View>

            <Text style={s.planHint}>
              {businessPlan.maxCreatorsPerEvent
                ? `Votre pack ${businessPlan.name} limite cet événement à ${businessPlan.maxCreatorsPerEvent} créateurs maximum.`
                : `Votre pack ${businessPlan.name} autorise un nombre illimité de créateurs par événement.`}
            </Text>

            {form.plusOneMode === 'required' ? (
              <View style={s.inlineInfoCard}>
                <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
                <Text style={s.inlineInfoText}>Le livrable “Avis Google + screen du +1” sera ajouté automatiquement.</Text>
              </View>
            ) : null}

            <InputBlock label="Dress code">
              <StyledInput value={form.dresscode} onChangeText={v => upd('dresscode', v)} placeholder="Smart casual, tenue de soirée..." />
            </InputBlock>

            <View style={s.toggleRow}>
              <View style={s.toggleInfo}>
                <Ionicons name="warning-outline" size={20} color={COLORS.primary} />
                <View>
                  <Text style={s.toggleTitle}>+18 requis</Text>
                  <Text style={s.toggleSub}>Activez si l’événement est réservé aux majeurs</Text>
                </View>
              </View>
              <Switch value={form.isAdultsOnly} onValueChange={v => upd('isAdultsOnly', v)} trackColor={{ false: COLORS.bgCard2, true: 'rgba(201,169,97,0.4)' }} thumbColor={form.isAdultsOnly ? COLORS.primary : COLORS.textMuted} />
            </View>

            <View style={s.toggleRow}>
              <View style={s.toggleInfo}>
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
                <View>
                  <Text style={s.toggleTitle}>Publié</Text>
                  <Text style={s.toggleSub}>Visible par les influenceurs</Text>
                </View>
              </View>
              <Switch value={form.isActive} onValueChange={v => upd('isActive', v)} trackColor={{ false: COLORS.bgCard2, true: 'rgba(16,217,160,0.4)' }} thumbColor={form.isActive ? COLORS.success : COLORS.textMuted} />
            </View>

            <View style={s.toggleRow}>
              <View style={s.toggleInfo}>
                <Ionicons name="star-outline" size={20} color={COLORS.primary} />
                <View>
                  <Text style={s.toggleTitle}>BOOST Premium</Text>
                  <Text style={s.toggleSub}>Met en avant ton événement (option payante)</Text>
                </View>
              </View>
              <Switch value={form.isSponsored} onValueChange={v => upd('isSponsored', v)} trackColor={{ false: COLORS.bgCard2, true: 'rgba(201,169,97,0.4)' }} thumbColor={form.isSponsored ? COLORS.primary : COLORS.textMuted} />
            </View>

            {form.isSponsored ? (
              <InputBlock label="Durée du boost">
                <View style={s.optionRowWrap}>
                  {BOOST_OPTIONS.map((option) => {
                    const active = String(option.days) === String(form.boostDurationDays);
                    return (
                      <TouchableOpacity key={option.days} style={[s.optionChip, active && s.optionChipActive]} onPress={() => upd('boostDurationDays', String(option.days))}>
                        <Text style={[s.optionChipText, active && s.optionChipTextActive]}>{option.days}j · {option.price}€</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </InputBlock>
            ) : null}
          </View>
        );

      default: return null;
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#0A0A0F', '#0E0D0B']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => step > 1 ? goPrev() : handleExit()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{isEdit ? (isDraftSource ? 'Brouillon' : 'Modifier') : 'Créer'} un événement</Text>
          {canSaveDraft ? (
            <TouchableOpacity onPress={handleSaveDraft} disabled={saving} style={s.draftBtn}>
              <Text style={s.draftBtnText}>Brouillon</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <Stepper currentStep={step} />
            {renderStep()}
            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Footer */}
          <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
            {step > 1 && (
              <TouchableOpacity style={s.prevBtn} onPress={goPrev}>
                <Ionicons name="chevron-back" size={18} color={COLORS.textSecondary} />
                <Text style={s.prevBtnText}>Précédent</Text>
              </TouchableOpacity>
            )}
            {step < TOTAL_STEPS ? (
              <TouchableOpacity style={[s.nextBtn, step === 1 && { flex: 1 }]} onPress={goNext}>
                <LinearGradient colors={COLORS.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.nextBtnGrad}>
                  <Text style={s.nextBtnText}>Suivant</Text>
                  <Ionicons name="chevron-forward" size={18} color="#0A0A0F" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.nextBtn} onPress={handleSubmit} disabled={saving}>
                <LinearGradient colors={COLORS.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.nextBtnGrad}>
                  {saving
                    ? <ActivityIndicator size="small" color="#0A0A0F" />
                    : <Text style={s.nextBtnText}>{isEdit ? 'Enregistrer' : "Créer l'événement"}</Text>}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Lieu Modal */}
      <Modal visible={lieuModalVisible} transparent animationType="slide" onRequestClose={() => setLieuModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Choisir un lieu</Text>
              <TouchableOpacity onPress={() => setLieuModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={lieux}
              keyExtractor={item => item._id}
              contentContainerStyle={{ padding: SPACING.md, gap: SPACING.sm }}
              ListEmptyComponent={
                <View style={s.modalEmptyWrap}>
                  <Ionicons name="business-outline" size={28} color={COLORS.primary} />
                  <Text style={s.modalEmptyTitle}>Aucun lieu enregistré</Text>
                  <Text style={s.modalEmptyText}>
                    Crée un lieu avant de préparer tes prochains événements plus rapidement.
                  </Text>
                  <TouchableOpacity
                    style={s.modalEmptyBtn}
                    activeOpacity={0.85}
                    onPress={() => {
                      setLieuModalVisible(false);
                      navigation.navigate('CreateLieu');
                    }}
                  >
                    <Text style={s.modalEmptyBtnText}>Créer un lieu</Text>
                  </TouchableOpacity>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.lieuItem, form.lieuId === item._id && s.lieuItemActive]}
                  onPress={() => {
                    upd('lieuId', item._id);
                    upd('lieuName', item.name);
                    upd('address', item.address || '');
                    if (item.city) upd('city', item.city);
                    setLieuModalVisible(false);
                  }}
                >
                  <View>
                    <Text style={s.lieuItemName}>{item.name}</Text>
                    {item.city && <Text style={s.lieuItemCity}>{item.city}</Text>}
                  </View>
                  {form.lieuId === item._id && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {pickerConfig && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" onRequestClose={() => setPickerConfig(null)}>
          <View style={s.modalOverlay}>
            <View style={s.pickerSheet}>
              <View style={s.pickerSheetHeader}>
                <TouchableOpacity onPress={() => setPickerConfig(null)}>
                  <Text style={s.pickerSheetCancel}>Annuler</Text>
                </TouchableOpacity>
                <Text style={s.pickerSheetTitle}>
                  {['time', 'endTime', 'requiredArrivalTime'].includes(pickerConfig.field) ? "Sélectionner l'heure" : 'Sélectionner une date'}
                </Text>
                <TouchableOpacity onPress={confirmIosPicker}>
                  <Text style={s.pickerSheetConfirm}>Valider</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerConfig.value}
                mode={pickerConfig.mode}
                display={pickerConfig.mode === 'time' ? 'spinner' : 'inline'}
                themeVariant="dark"
                onChange={handlePickerChange}
              />
            </View>
          </View>
        </Modal>
      )}

      {pickerConfig && Platform.OS === 'android' && (
        <DateTimePicker
          value={pickerConfig.value}
          mode={pickerConfig.mode}
          display="default"
          onChange={handlePickerChange}
        />
      )}

      <Modal
        visible={successModal.visible}
        transparent
        animationType="fade"
        onRequestClose={closeSuccessModal}
      >
        <View style={s.successOverlay}>
          <View style={s.successCard}>
            <LinearGradient
              colors={['rgba(201,169,97,0.24)', 'rgba(201,169,97,0.04)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.successGlow}
            />

            <View style={s.successBadge}>
              <LinearGradient
                colors={COLORS.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.successBadgeGrad}
              >
                <Ionicons name="sparkles" size={24} color="#0A0A0F" />
              </LinearGradient>
            </View>

            <Text style={s.successTitle}>
              {successModal.mode === 'edit' ? 'Événement mis à jour' : 'Événement publié'}
            </Text>
            <Text style={s.successText}>
              {successModal.mode === 'edit'
                ? "Les dernières modifications sont en ligne. Votre événement reste visible et prêt à recevoir de nouvelles candidatures."
                : "Votre événement est maintenant disponible dans l'application. Il n'attend plus que les influenceurs pour candidater."}
            </Text>

            <View style={s.successFacts}>
              <View style={s.successFact}>
                <Ionicons name="radio-outline" size={16} color={COLORS.primary} />
                <Text style={s.successFactText}>
                  {form.isActive ? 'Visible immédiatement dans le feed influenceur' : 'Créé en brouillon, à publier quand vous le souhaitez'}
                </Text>
              </View>
              <View style={s.successFact}>
                <Ionicons name="people-outline" size={16} color={COLORS.primary} />
                <Text style={s.successFactText}>Les profils intéressés pourront candidater dès maintenant</Text>
              </View>
            </View>

            <TouchableOpacity activeOpacity={0.9} onPress={closeSuccessModal} style={s.successBtnWrap}>
              <LinearGradient
                colors={COLORS.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.successBtn}
              >
                <Text style={s.successBtnText}>
                  {successModal.mode === 'edit' ? "Retour à l'événement" : 'Parfait, continuer'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#0A0A0F" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
  },
  headerTitle: { color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: FONTS.bold },
  draftBtn: {
    paddingHorizontal: 12, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
  },
  draftBtnText: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },

  stepContent: { gap: SPACING.md },
  stepSectionTitle: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm },

  inputBlock: { gap: 8 },
  inputLabel: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  inputHint: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  textInput: {
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 12, color: COLORS.white,
    fontSize: FONTS.sizes.base, fontFamily: FONTS.regular,
  },
  pickerField: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 14,
  },
  pickerFieldLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  pickerFieldText: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.regular, flex: 1 },
  pickerFieldPlaceholder: { color: COLORS.textMuted },
  row: { flexDirection: 'row', alignItems: 'flex-start' },

  tagInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  tagAddBtn: {
    width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(201,169,97,0.1)', borderWidth: 1, borderColor: COLORS.border,
  },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(201,169,97,0.08)', borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, paddingVertical: 5,
  },
  tagChipActive: { backgroundColor: 'rgba(201,169,97,0.14)', borderColor: 'rgba(201,169,97,0.38)' },
  tagChipText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontFamily: FONTS.medium },
  tagChipTextActive: { color: COLORS.primary },
  lockedChip: { opacity: 0.52 },
  lockedChipText: { color: COLORS.textMuted },
  readOnlyField: {
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  readOnlyFieldText: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.medium },
  optionRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionChipActive: { backgroundColor: 'rgba(201,169,97,0.12)', borderColor: 'rgba(201,169,97,0.4)' },
  optionChipText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium },
  optionChipTextActive: { color: COLORS.primary },

  lieuPickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 13,
  },
  lieuModeActions: { gap: 10 },
  lieuFreeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(201,169,97,0.08)', borderWidth: 1, borderColor: 'rgba(201,169,97,0.22)',
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 6,
  },
  lieuFreeBadgeText: { color: COLORS.primary, fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },
  lieuPickBtnText: { flex: 1, color: COLORS.textMuted, fontSize: FONTS.sizes.base, fontFamily: FONTS.regular },
  lieuSelected: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(201,169,97,0.08)', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(201,169,97,0.25)', paddingHorizontal: SPACING.md, paddingVertical: 12,
  },
  lieuSelectedInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lieuSelectedName: { color: COLORS.primary, fontSize: FONTS.sizes.base, fontFamily: FONTS.semiBold },
  lieuClear: { padding: 4 },
  emptyLieuxNotice: {
    backgroundColor: 'rgba(201,169,97,0.08)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.2)',
    padding: SPACING.md,
    gap: 10,
  },
  emptyLieuxNoticeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,169,97,0.12)',
  },
  emptyLieuxNoticeBody: { gap: 4 },
  emptyLieuxNoticeTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semiBold,
  },
  emptyLieuxNoticeText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    lineHeight: 18,
  },
  emptyLieuxNoticeBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(201,169,97,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.24)',
  },
  emptyLieuxNoticeBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.semiBold,
  },

  coverPicker: {
    height: 200, borderRadius: RADIUS.lg, borderWidth: 2, borderColor: COLORS.border,
    borderStyle: 'dashed', backgroundColor: COLORS.bgCard2,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 8,
  },
  coverPlaceholderIcon: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(201,169,97,0.08)',
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  coverPlaceholderText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.base, fontFamily: FONTS.medium },
  coverPlaceholderSub: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  coverChange: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 6 },
  coverChangeText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },

  extraImagesRow: { flexDirection: 'row', gap: SPACING.sm },
  extraImageSlot: {
    flex: 1, aspectRatio: 1, borderRadius: RADIUS.md, backgroundColor: COLORS.bgCard2,
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  removeImgBtn: { position: 'absolute', top: 4, right: 4 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  catChipActive: { borderColor: 'rgba(201,169,97,0.5)', backgroundColor: 'rgba(201,169,97,0.08)' },
  catChipText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium },
  catChipTextActive: { color: COLORS.primary },

  momentRow: { flexDirection: 'row', gap: 8 },
  momentChip: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCard, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  momentChipActive: { backgroundColor: 'rgba(201,169,97,0.1)', borderColor: 'rgba(201,169,97,0.4)' },
  momentChipText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium },
  momentChipTextActive: { color: COLORS.primary },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleTitle: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.semiBold },
  toggleSub: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  inlineInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(201,169,97,0.08)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.2)',
    padding: SPACING.md,
  },
  inlineInfoText: { flex: 1, color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, lineHeight: 20 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md,
    backgroundColor: 'rgba(10,10,15,0.95)',
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  prevBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  prevBtnText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  nextBtn: { flex: 1, borderRadius: RADIUS.full, overflow: 'hidden' },
  nextBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  nextBtnText: { color: '#0A0A0F', fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  planHint: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    lineHeight: 18,
    marginTop: -4,
    marginBottom: SPACING.md,
  },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: FONTS.bold },
  pickerSheet: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, overflow: 'hidden' },
  pickerSheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  pickerSheetTitle: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.semiBold },
  pickerSheetCancel: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium },
  pickerSheetConfirm: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  modalEmptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  modalEmpty: { color: COLORS.textMuted, textAlign: 'center', fontSize: FONTS.sizes.base, fontFamily: FONTS.regular, paddingVertical: SPACING.xl },
  modalEmptyTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.semiBold,
    textAlign: 'center',
  },
  modalEmptyText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalEmptyBtn: {
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 11,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(201,169,97,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.24)',
  },
  modalEmptyBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semiBold,
  },
  lieuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard2, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md,
  },
  lieuItemActive: { borderColor: 'rgba(201,169,97,0.4)', backgroundColor: 'rgba(201,169,97,0.06)' },
  lieuItemName: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.semiBold },
  lieuItemCity: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, marginTop: 2 },

  successOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    backgroundColor: 'rgba(4,4,7,0.78)',
  },
  successCard: {
    backgroundColor: '#121218',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.18)',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    overflow: 'hidden',
  },
  successGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  successBadge: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  successBadgeGrad: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: COLORS.white,
    fontSize: 26,
    lineHeight: 30,
    fontFamily: FONTS.bold,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  successText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.base,
    lineHeight: 24,
    fontFamily: FONTS.regular,
    textAlign: 'center',
  },
  successFacts: {
    gap: 12,
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  successFact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  successFactText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    lineHeight: 20,
    fontFamily: FONTS.medium,
  },
  successBtnWrap: {
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  successBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  successBtnText: {
    color: '#0A0A0F',
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.bold,
  },
});
