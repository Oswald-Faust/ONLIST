import { useLanguage } from '../../context/LanguageContext';
import { Text, Alert, TextInput } from '../../i18n/LocalizedReactNative';
import { getCurrentLocale } from '../../i18n/runtime';
import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Modal, FlatList, Switch, Image, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { CATEGORY_OPTIONS } from '../../constants/categories';
import { eventsAPI, lieuxAPI, uploadAPI } from '../../services/api';
import { openBoostCheckout } from '../../services/subscriptions';
import { EXTERNAL_PURCHASES_ENABLED } from '../../constants/platformPolicy';
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

function parseDurationMinutes(startDate, startTime, endDate, endTime) {
  if (!startDate || !startTime || !endDate || !endTime) return null;
  const start = new Date(`${startDate}T${startTime}:00`);
  const end = new Date(`${endDate}T${endTime}:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  return Math.round((end.getTime() - start.getTime()) / 60000);
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
              <TouchableOpacity onPress={() => onRemove(i, v)}>
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
  useLanguage();
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
  const [boostInfoVisible, setBoostInfoVisible] = useState(false);
  const [postCreateBoostModal, setPostCreateBoostModal] = useState({ visible: false, eventId: null, mode: 'create' });
  const [lastCreatedEventId, setLastCreatedEventId] = useState(null);

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
    endDate: parseDate(source?.endDate) || parseDate(source?.date) || '',
    startTime: source?.startTime || parseTime(source?.date) || '',
    endTime: source?.endTime || '',
    requiredArrivalTime: source?.requiredArrivalTime || '',
    applicationCutoffOffsetHours: String(source?.applicationCutoffOffsetHours || '2'),
    images: source?.images || [],
    category: source?.category || '',
    moment: source?.moment || 'evening',
    description: source?.description || '',
    offerItems: source?.offerItems || [],
    otherOffer: source?.otherOffer || '',
    deliverables: (source?.deliverables || []).map((item) => item === 'google_review_plus_one_screen' ? 'tripadvisor_review' : item),
    otherDeliverable: source?.otherDeliverable || '',
    accountsToMention: source?.accountsToMention?.length ? source.accountsToMention : (user?.instagram ? [`@${String(user.instagram).replace(/^@/, '')}`] : []),
    maxParticipants: String(source?.maxParticipants || '10'),
    plusOneMode: source?.plusOneMode || 'solo',
    isAdultsOnly: Boolean(source?.isAdultsOnly || (source?.ageRequirement && Number(source.ageRequirement) >= 18)),
    dresscode: source?.dresscode || '',
    boostDurationDays: String(source?.boostDurationDays || BOOST_OPTIONS[0]?.days || '1'),
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
          : field === 'endDate'
            ? form.endDate
              ? new Date(`${form.endDate}T12:00:00`)
              : form.date
                ? new Date(`${form.date}T12:00:00`)
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
      if (pickerConfig.field === 'date') {
        const nextDate = formatDateValue(selectedDate);
        setForm((prev) => ({ ...prev, date: nextDate, endDate: !prev.endDate || prev.endDate < nextDate ? nextDate : prev.endDate }));
      }
      if (pickerConfig.field === 'endDate') upd('endDate', formatDateValue(selectedDate));
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
    if (pickerConfig.field === 'date') {
      const nextDate = formatDateValue(pickerConfig.value);
      setForm((prev) => ({ ...prev, date: nextDate, endDate: !prev.endDate || prev.endDate < nextDate ? nextDate : prev.endDate }));
    }
    if (pickerConfig.field === 'endDate') upd('endDate', formatDateValue(pickerConfig.value));
    setPickerConfig(null);
  };

  useEffect(() => {
    lieuxAPI.mine().then(d => setLieux(d.lieux || [])).catch(() => {});
  }, []);

  // ─── Image picking ──────────────────────────────────────────────────────────────────────────
  const uploadPickedAssets = async (assets) => {
    const uploaded = [];
    for (const asset of assets) {
      const data = await uploadAPI.image(asset.uri, {
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      });
      uploaded.push(data.url);
    }
    return uploaded;
  };

  const replaceCoverImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission refusée', "Accès à la galerie requis."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (result.canceled) return;
    setUploadingImg(true);
    try {
      const [newCoverUrl] = await uploadPickedAssets(result.assets.slice(0, 1));
      if (newCoverUrl) {
        setForm((prev) => ({ ...prev, images: [newCoverUrl, ...prev.images.slice(1)] }));
      }
    } catch (err) {
      Alert.alert('Erreur upload', err.message);
    } finally {
      setUploadingImg(false);
    }
  };

  const addEventImages = async () => {
    const availableSlots = Math.max(0, 6 - form.images.length);
    if (availableSlots === 0) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission refusée', "Accès à la galerie requis."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: availableSlots,
    });
    if (result.canceled) return;
    setUploadingImg(true);
    try {
      const uploaded = await uploadPickedAssets(result.assets.slice(0, availableSlots));
      setForm((prev) => ({ ...prev, images: [...prev.images, ...uploaded].slice(0, 6) }));
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

  const addCustomOfferItem = (value) => {
    const normalized = value.trim();
    if (!normalized || form.offerItems.includes(normalized)) return;
    upd('offerItems', [...form.offerItems, normalized]);
  };

  const addCustomDeliverableItem = (value) => {
    const normalized = value.trim();
    if (!normalized || form.deliverables.includes(normalized)) return;
    upd('deliverables', [...form.deliverables, normalized]);
  };

  const toggleDeliverableItem = (value, minPlan) => {
    if (!isPlanAllowedForOption(businessPlan.key, minPlan)) return;
    const has = form.deliverables.includes(value);
    const nextDeliverables = has
      ? form.deliverables.filter((item) => item !== value)
      : [...form.deliverables, value];
    upd('deliverables', nextDeliverables);
  };

  // ─── Validation ───────────────────────────────────────────────────────────────────────────────
  const validateStep = () => {
    if (step === 1) {
      if (!form.title.trim()) { Alert.alert('Titre requis'); return false; }
      if (!form.date.trim()) { Alert.alert('Date requise'); return false; }
      if (!form.endDate.trim()) { Alert.alert('Date de fin requise'); return false; }
      if (!form.city.trim()) { Alert.alert('Ville requise'); return false; }
      if (!form.startTime.trim()) { Alert.alert('Heure de début requise'); return false; }
      if (!form.endTime.trim()) { Alert.alert('Heure de fin requise'); return false; }
      if (!parseDurationMinutes(form.date, form.startTime, form.endDate, form.endTime)) { Alert.alert('Fin d’événement invalide', "La date et l'heure de fin doivent être après le début de l'événement."); return false; }
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
  const openPostCreateBoostModal = () => {
    if (!lastCreatedEventId) {
      closeSuccessModal();
      return;
    }
    setSuccessModal({ visible: false, mode: 'create' });
    setPostCreateBoostModal({ visible: true, eventId: lastCreatedEventId, mode: 'create' });
  };
  const closePostCreateBoostModal = () => {
    setPostCreateBoostModal({ visible: false, eventId: null, mode: 'create' });
    navigation.goBack();
  };

  const handleBoostPayment = async () => {
    if (!postCreateBoostModal.eventId || !(Number(form.boostDurationDays) > 0)) return;
    try {
      await openBoostCheckout(postCreateBoostModal.eventId, Number(form.boostDurationDays));
      closePostCreateBoostModal();
    } catch (err) {
      Alert.alert('Paiement indisponible', err.message);
    }
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
      endDate: form.endDate && form.endTime ? new Date(`${form.endDate}T${form.endTime}:00`).toISOString() : undefined,
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
      isSponsored: Boolean(source?.isSponsored),
      boostDurationDays: source?.boostDurationDays || undefined,
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
      const endDateObj = new Date(`${form.endDate}T${form.endTime}:00`);
      if (isNaN(endDateObj.getTime()) || endDateObj <= dateObj) throw new Error("La fin de l'événement doit être après son début");
      const payload = {
        title: form.title.trim(),
        lieu: form.lieuId || undefined,
        venue: form.lieuId ? form.lieuName : form.venueCustom,
        address: form.lieuId ? (lieux.find((item) => item._id === form.lieuId)?.address || '') : form.address.trim(),
        city: form.city.trim(),
        date: dateObj.toISOString(),
        endDate: endDateObj.toISOString(),
        startTime: form.startTime,
        endTime: form.endTime,
        requiredArrivalTime: form.requiredArrivalTime || undefined,
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
        boostDurationDays: source?.isSponsored ? Number(source?.boostDurationDays) : undefined,
        isSponsored: Boolean(source?.isSponsored),
        isActive: form.isActive,
        status: 'published',
      };
      const response = isEdit
        ? await eventsAPI.update(toEdit._id, payload)
        : await eventsAPI.create(payload);
      const savedEventId = response?.event?._id || toEdit?._id;
      setLastCreatedEventId(isEdit ? null : (savedEventId || null));
      setSuccessModal({ visible: true, mode: isEdit ? 'edit' : 'create' });
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Render Steps ────────────────────────────────────────────────────────────────────────────
  const renderStep = () => {
    const durationMinutes = parseDurationMinutes(form.date, form.startTime, form.endDate, form.endTime);
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
                <InputBlock label="Date de fin" required>
                  <PickerField
                    value={form.endDate}
                    placeholder="Sélectionner une date"
                    icon="calendar-outline"
                    onPress={() => openPicker('endDate')}
                  />
                </InputBlock>
              </View>
              <View style={{ width: SPACING.md }} />
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
            </View>

            <InputBlock label="Durée calculée automatiquement">
              <View style={s.readOnlyField}>
                <Text style={s.readOnlyFieldText}>{formatDuration(durationMinutes) || 'À définir'}</Text>
              </View>
            </InputBlock>

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <InputBlock label="Heure d’arrivée requise pour l’influenceur">
                  <PickerField
                    value={form.requiredArrivalTime}
                    placeholder="Ex: 18:30"
                    icon="walk-outline"
                    onPress={() => openPicker('requiredArrivalTime')}
                  />
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
            <TouchableOpacity style={s.coverPicker} onPress={replaceCoverImage} disabled={uploadingImg}>
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
              <TagInput
                values={form.offerItems.filter((item) => !offerTags.includes(item))}
                onAdd={addCustomOfferItem}
                onRemove={(_index, value) => {
                  upd('offerItems', form.offerItems.filter((item) => item !== value));
                }}
                placeholder="Ajouter un autre avantage..."
              />
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
              <TagInput
                values={form.deliverables.filter((item) => !DELIVERABLE_OPTIONS.some((option) => option.key === item))}
                onAdd={addCustomDeliverableItem}
                onRemove={(_index, value) => {
                  upd('deliverables', form.deliverables.filter((item) => item !== value));
                }}
                placeholder="Ajouter un autre livrable..."
              />
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

            <InputBlock label="Dress code">
              <StyledInput value={form.dresscode} onChangeText={v => upd('dresscode', v)} placeholder="Smart casual, tenue de soirée..." />
            </InputBlock>

            <View style={s.toggleRow}>
              <View style={s.toggleInfo}>
                <Ionicons name="warning-outline" size={20} color={COLORS.primary} />
                <View style={s.toggleCopy}>
                  <Text style={s.toggleTitle}>+18 requis</Text>
                  <Text style={s.toggleSub}>Activez si l’événement est réservé aux majeurs</Text>
                </View>
              </View>
              <View style={s.toggleSwitchWrap}>
                <Switch value={form.isAdultsOnly} onValueChange={v => upd('isAdultsOnly', v)} trackColor={{ false: COLORS.bgCard2, true: 'rgba(201,169,97,0.4)' }} thumbColor={form.isAdultsOnly ? COLORS.primary : COLORS.textMuted} />
              </View>
            </View>

            <View style={s.toggleRow}>
              <View style={s.toggleInfo}>
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
                <View style={s.toggleCopy}>
                  <Text style={s.toggleTitle}>Publié</Text>
                  <Text style={s.toggleSub}>Visible par les influenceurs</Text>
                </View>
              </View>
              <View style={s.toggleSwitchWrap}>
                <Switch value={form.isActive} onValueChange={v => upd('isActive', v)} trackColor={{ false: COLORS.bgCard2, true: 'rgba(16,217,160,0.4)' }} thumbColor={form.isActive ? COLORS.success : COLORS.textMuted} />
              </View>
            </View>

            {/* Boost payant (Stripe) : retiré du binaire iOS — guideline App Store 3.1.1. */}
            {EXTERNAL_PURCHASES_ENABLED && (
              <TouchableOpacity style={s.boostPreviewCard} onPress={() => setBoostInfoVisible(true)} activeOpacity={0.9}>
                <View style={s.boostPreviewIcon}>
                  <Ionicons name="star-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={s.boostPreviewCopy}>
                  <Text style={s.boostPreviewTitle}>Boost premium après publication</Text>
                  <Text style={s.boostPreviewText}>Vous pourrez choisir un boost et voir les tarifs juste après la création de l’événement.</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
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
                locale={getCurrentLocale()}
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
          locale={getCurrentLocale()}
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

            {EXTERNAL_PURCHASES_ENABLED && successModal.mode === 'create' && lastCreatedEventId ? (
              <View style={s.successActions}>
                <TouchableOpacity activeOpacity={0.88} onPress={openPostCreateBoostModal} style={s.successGhostBtn}>
                  <Ionicons name="flash-outline" size={16} color={COLORS.primary} />
                  <Text style={s.successGhostBtnText}>Booster l'événement</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.9} onPress={closeSuccessModal} style={s.successBtnWrap}>
                  <LinearGradient
                    colors={COLORS.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.successBtn}
                  >
                    <Text style={s.successBtnText}>Parfait, continuer</Text>
                    <Ionicons name="arrow-forward" size={16} color="#0A0A0F" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
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
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={EXTERNAL_PURCHASES_ENABLED && boostInfoVisible} transparent animationType="slide" onRequestClose={() => setBoostInfoVisible(false)}>
        <View style={s.topSheetOverlay}>
          <TouchableOpacity style={s.topSheetBackdrop} activeOpacity={1} onPress={() => setBoostInfoVisible(false)} />
          <View style={[s.topSheet, { paddingBottom: insets.bottom + SPACING.xl }]}>
            <View style={s.topSheetHandle} />
            <View style={s.topSheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.topSheetTitle}>Comment fonctionne un boost ?</Text>
                <Text style={s.topSheetText}>
                  Le boost met votre événement en avant dans l’app avec un badge premium. Les tarifs sont fixes et le paiement ne sera proposé qu’après la création de l’événement.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBoostInfoVisible(false)} style={s.topSheetClose}>
                <Ionicons name="close" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <View style={s.topSheetPriceGrid}>
              {BOOST_OPTIONS.map((option) => (
                <View key={`info-${option.days}`} style={s.topSheetPriceCard}>
                  <Text style={s.topSheetPriceDays}>{option.days} jour{option.days > 1 ? 's' : ''}</Text>
                  <Text style={s.topSheetPriceValue}>{option.price}€</Text>
                </View>
              ))}
            </View>
            <View style={s.topSheetSteps}>
              {[
                '1. Vous créez et publiez votre événement normalement.',
                '2. ONLIST vous propose ensuite les durées et tarifs du boost.',
                '3. Si vous confirmez, vous êtes redirigé vers Stripe pour payer.',
              ].map((item) => (
                <View key={item} style={s.topSheetStep}>
                  <Ionicons name="sparkles-outline" size={16} color={COLORS.primary} />
                  <Text style={s.topSheetStepText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={EXTERNAL_PURCHASES_ENABLED && postCreateBoostModal.visible} transparent animationType="slide" onRequestClose={closePostCreateBoostModal}>
        <View style={s.topSheetOverlay}>
          <TouchableOpacity style={s.topSheetBackdrop} activeOpacity={1} onPress={closePostCreateBoostModal} />
          <View style={[s.topSheet, { paddingBottom: insets.bottom + SPACING.xl }]}>
            <View style={s.topSheetHandle} />
            <View style={s.topSheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.topSheetTitle}>Booster cet événement ?</Text>
                <Text style={s.topSheetText}>
                  Votre événement vient d’être créé. Choisissez maintenant une durée de boost pour augmenter sa visibilité auprès des influenceurs.
                </Text>
              </View>
              <TouchableOpacity onPress={closePostCreateBoostModal} style={s.topSheetClose}>
                <Ionicons name="close" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <View style={s.topSheetPriceGrid}>
              {BOOST_OPTIONS.map((option) => {
                const active = String(option.days) === String(form.boostDurationDays);
                return (
                  <TouchableOpacity
                    key={`post-${option.days}`}
                    style={[s.topSheetPriceCard, active && s.topSheetPriceCardActive]}
                    onPress={() => upd('boostDurationDays', String(option.days))}
                    activeOpacity={0.88}
                  >
                    <Text style={[s.topSheetPriceDays, active && s.topSheetPriceDaysActive]}>{option.days} jour{option.days > 1 ? 's' : ''}</Text>
                    <Text style={[s.topSheetPriceValue, active && s.topSheetPriceValueActive]}>{option.price}€</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={s.postBoostActions}>
              <TouchableOpacity style={s.postBoostLaterBtn} onPress={closePostCreateBoostModal} activeOpacity={0.88}>
                <Text style={s.postBoostLaterText}>Plus tard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.postBoostPayBtnWrap} onPress={handleBoostPayment} activeOpacity={0.9}>
                <LinearGradient colors={COLORS.gradient} style={s.postBoostPayBtn}>
                  <Text style={s.postBoostPayText}>Payer le boost</Text>
                  <Ionicons name="arrow-forward" size={16} color="#0A0A0F" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
  toggleInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, paddingRight: SPACING.sm },
  toggleCopy: { flex: 1, minWidth: 0 },
  toggleTitle: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.semiBold },
  toggleSub: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  toggleSwitchWrap: { marginLeft: SPACING.sm },
  boostPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(201,169,97,0.06)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.22)',
    padding: SPACING.md,
  },
  boostPreviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,169,97,0.12)',
  },
  boostPreviewCopy: { flex: 1, minWidth: 0 },
  boostPreviewTitle: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold, marginBottom: 4 },
  boostPreviewText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular, lineHeight: 18 },
  boostCard: {
    backgroundColor: 'rgba(201,169,97,0.06)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.22)',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  boostHeader: { gap: SPACING.sm },
  boostHeaderCopy: { gap: 6 },
  boostTitle: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  boostText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, lineHeight: 20 },
  boostInfoBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.24)',
    backgroundColor: 'rgba(201,169,97,0.08)',
  },
  boostInfoBtnText: { color: COLORS.primary, fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },
  boostOptionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  boostOptionCard: {
    width: '47%',
    minHeight: 108,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    padding: SPACING.md,
    justifyContent: 'space-between',
  },
  boostOptionCardActive: {
    borderColor: 'rgba(201,169,97,0.42)',
    backgroundColor: 'rgba(201,169,97,0.14)',
  },
  boostOptionDays: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  boostOptionDaysActive: { color: COLORS.primary },
  boostOptionPrice: { color: COLORS.textPrimary, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  boostOptionPriceActive: { color: COLORS.primary },
  boostOptionMeta: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  boostOptionMetaActive: { color: COLORS.textSecondary },
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
  topSheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  topSheetBackdrop: { flex: 1 },
  topSheet: {
    backgroundColor: '#131318',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.16)',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  topSheetHandle: {
    alignSelf: 'center',
    width: 54,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: SPACING.md,
  },
  topSheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, marginTop: SPACING.xs },
  topSheetClose: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: COLORS.border,
  },
  topSheetTitle: { color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: FONTS.bold, marginBottom: 8, lineHeight: 24 },
  topSheetText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, lineHeight: 21 },
  topSheetPriceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: SPACING.lg },
  topSheetPriceCard: {
    width: '47%',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: SPACING.md,
    gap: 6,
  },
  topSheetPriceCardActive: {
    borderColor: 'rgba(201,169,97,0.42)',
    backgroundColor: 'rgba(201,169,97,0.14)',
  },
  topSheetPriceDays: { color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  topSheetPriceDaysActive: { color: COLORS.primary },
  topSheetPriceValue: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  topSheetPriceValueActive: { color: COLORS.primary },
  topSheetSteps: { gap: 12, marginTop: SPACING.lg },
  topSheetStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  topSheetStepText: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, lineHeight: 20 },
  postBoostActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xl },
  postBoostLaterBtn: {
    paddingHorizontal: 18,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBoostLaterText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  postBoostPayBtnWrap: { flex: 1, borderRadius: RADIUS.full, overflow: 'hidden' },
  postBoostPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  postBoostPayText: { color: '#0A0A0F', fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold },
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
  successActions: {
    gap: 12,
  },
  successGhostBtn: {
    minHeight: 52,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.28)',
    backgroundColor: 'rgba(201,169,97,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: SPACING.lg,
  },
  successGhostBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.semiBold,
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
