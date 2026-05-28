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
import { eventsAPI, lieuxAPI, uploadAPI } from '../../services/api';
import LocationAutocompleteFields from '../../components/LocationAutocompleteFields';

const TOTAL_STEPS = 5;
const STEP_LABELS = ['Lieu', 'Médias', 'Description', 'Contenu', 'Paramètres'];

const CATEGORIES = [
  { value: 'restaurant', label: 'Restaurant', icon: 'restaurant-outline' },
  { value: 'bar',        label: 'Bar',        icon: 'wine-outline' },
  { value: 'club',       label: 'Club',       icon: 'musical-notes-outline' },
  { value: 'spa',        label: 'Spa',        icon: 'leaf-outline' },
  { value: 'sport',      label: 'Sport',      icon: 'fitness-outline' },
  { value: 'wellness',   label: 'Wellness',   icon: 'sparkles-outline' },
  { value: 'premium',    label: 'Premium',    icon: 'star-outline' },
  { value: 'other',      label: 'Autre',      icon: 'ellipsis-horizontal-outline' },
];

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
    time: parseTime(source?.date) || '',
    cutoffDate: parseDate(source?.cutoffTime) || '',
    images: source?.images || [],
    category: source?.category || '',
    moment: source?.moment || 'evening',
    description: source?.description || '',
    offer: source?.offer || '',
    deliverables: source?.deliverables || [],
    requirements: source?.rules || '',
    accountsToMention: source?.accountsToMention || [],
    maxParticipants: String(source?.maxParticipants || '10'),
    ageRequirement: String(source?.ageRequirement || '18'),
    dresscode: source?.dresscode || '',
    isSponsored: source?.isSponsored || false,
    isActive: source?.isActive !== undefined ? source.isActive : true,
  });

  const upd = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const openPicker = (field) => {
    const initial =
      field === 'time'
        ? form.time
          ? new Date(`2025-01-01T${form.time}:00`)
          : new Date()
        : field === 'cutoffDate'
          ? form.cutoffDate
            ? new Date(`${form.cutoffDate}T12:00:00`)
            : new Date()
          : form.date
            ? new Date(`${form.date}T12:00:00`)
            : new Date();

    setPickerConfig({
      field,
      mode: field === 'time' ? 'time' : 'date',
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
      if (pickerConfig.field === 'time') upd('time', formatTimeValue(selectedDate));
      if (pickerConfig.field === 'date') upd('date', formatDateValue(selectedDate));
      if (pickerConfig.field === 'cutoffDate') upd('cutoffDate', formatDateValue(selectedDate));
      setPickerConfig(null);
      return;
    }

    if (selectedDate) {
      setPickerConfig((prev) => ({ ...prev, value: selectedDate }));
    }
  };

  const confirmIosPicker = () => {
    if (!pickerConfig) return;
    if (pickerConfig.field === 'time') upd('time', formatTimeValue(pickerConfig.value));
    if (pickerConfig.field === 'date') upd('date', formatDateValue(pickerConfig.value));
    if (pickerConfig.field === 'cutoffDate') upd('cutoffDate', formatDateValue(pickerConfig.value));
    setPickerConfig(null);
  };

  useEffect(() => {
    lieuxAPI.mine().then(d => setLieux(d.lieux || [])).catch(() => {});
  }, []);

  // ─── Image picking ──────────────────────────────────────────────────────────────────────────
  const pickImage = async (index) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission refusée', "Accès à la galerie requis."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setUploadingImg(true);
    try {
      const data = await uploadAPI.image(uri);
      const newImages = [...form.images];
      if (index !== undefined && index < newImages.length) {
        newImages[index] = data.url;
      } else {
        newImages.push(data.url);
      }
      upd('images', newImages);
    } catch (err) {
      Alert.alert('Erreur upload', err.message);
    } finally {
      setUploadingImg(false);
    }
  };

  const removeImage = (index) => {
    upd('images', form.images.filter((_, i) => i !== index));
  };

  // ─── Validation ───────────────────────────────────────────────────────────────────────────────
  const validateStep = () => {
    if (step === 1) {
      if (!form.title.trim()) { Alert.alert('Titre requis'); return false; }
      if (!form.date.trim()) { Alert.alert('Date requise'); return false; }
      if (!form.city.trim()) { Alert.alert('Ville requise'); return false; }
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

  // ─── Submit ────────────────────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSaving(true);
    try {
      const dateObj = new Date(`${form.date}T${form.time || '20:00'}:00`);
      if (isNaN(dateObj.getTime())) throw new Error('Format de date invalide (YYYY-MM-DD)');
      const payload = {
        title: form.title.trim(),
        lieu: form.lieuId || undefined,
        venue: form.lieuId ? form.lieuName : form.venueCustom,
        address: form.lieuId ? (lieux.find((item) => item._id === form.lieuId)?.address || '') : form.address.trim(),
        city: form.city.trim(),
        date: dateObj.toISOString(),
        cutoffTime: form.cutoffDate ? new Date(`${form.cutoffDate}T23:59:00`).toISOString() : undefined,
        images: form.images,
        category: form.category,
        moment: form.moment,
        description: form.description.trim(),
        offer: form.offer.trim(),
        deliverables: form.deliverables,
        rules: form.requirements.trim(),
        accountsToMention: form.accountsToMention,
        maxParticipants: parseInt(form.maxParticipants) || 10,
        ageRequirement: parseInt(form.ageRequirement) || 18,
        dresscode: form.dresscode.trim(),
        isSponsored: form.isSponsored,
        isActive: form.isActive,
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
                <InputBlock label="Heure">
                  <PickerField
                    value={form.time}
                    placeholder="Sélectionner l'heure"
                    icon="time-outline"
                    onPress={() => openPicker('time')}
                  />
                </InputBlock>
              </View>
            </View>

            <InputBlock label="Date limite de candidature">
              <PickerField
                value={form.cutoffDate}
                placeholder="Sélectionner une date limite"
                icon="calendar-clear-outline"
                onPress={() => openPicker('cutoffDate')}
              />
            </InputBlock>
          </View>
        );

      // ── Step 2 ────────────────────────────────────────────────────────────────────────────────
      case 2:
        return (
          <View style={s.stepContent}>
            <Text style={s.stepSectionTitle}>Photo de couverture</Text>
            <TouchableOpacity style={s.coverPicker} onPress={() => pickImage(0)} disabled={uploadingImg}>
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
              {[1, 2, 3].map(i => (
                <TouchableOpacity key={i} style={s.extraImageSlot} onPress={() => pickImage(i)} disabled={uploadingImg}>
                  {form.images[i] ? (
                    <>
                      <Image source={{ uri: form.images[i] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                      <TouchableOpacity style={s.removeImgBtn} onPress={() => removeImage(i)}>
                        <Ionicons name="close-circle" size={18} color={COLORS.error} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <Ionicons name="add" size={24} color={COLORS.textMuted} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
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
              <StyledInput value={form.offer} onChangeText={v => upd('offer', v)} placeholder="Dîner gastronomique pour 2, accès VIP, table privée..." multiline numberOfLines={3} />
            </InputBlock>

            <InputBlock label="Livrables attendus" hint="Ex: Story Instagram, Reel, Post Feed">
              <TagInput
                values={form.deliverables}
                onAdd={v => upd('deliverables', [...form.deliverables, v])}
                onRemove={i => upd('deliverables', form.deliverables.filter((_, idx) => idx !== i))}
                placeholder="Ajouter un livrable..."
              />
            </InputBlock>

            <InputBlock label="Profil recherché / Exigences">
              <StyledInput value={form.requirements} onChangeText={v => upd('requirements', v)} placeholder="Minimum 10k followers, contenu lifestyle, engagement > 3%..." multiline numberOfLines={3} />
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
                <InputBlock label="Âge minimum">
                  <StyledInput value={form.ageRequirement} onChangeText={v => upd('ageRequirement', v)} placeholder="18" keyboardType="numeric" />
                </InputBlock>
              </View>
            </View>

            <InputBlock label="Dress code">
              <StyledInput value={form.dresscode} onChangeText={v => upd('dresscode', v)} placeholder="Smart casual, tenue de soirée..." />
            </InputBlock>

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
                  <Text style={s.toggleTitle}>Premium</Text>
                  <Text style={s.toggleSub}>Mise en avant dans le feed</Text>
                </View>
              </View>
              <Switch value={form.isSponsored} onValueChange={v => upd('isSponsored', v)} trackColor={{ false: COLORS.bgCard2, true: 'rgba(201,169,97,0.4)' }} thumbColor={form.isSponsored ? COLORS.primary : COLORS.textMuted} />
            </View>
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
          <TouchableOpacity onPress={() => step > 1 ? goPrev() : navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{isEdit ? 'Modifier' : 'Créer'} un événement</Text>
          <View style={{ width: 36 }} />
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
              ListEmptyComponent={<Text style={s.modalEmpty}>Aucun lieu enregistré</Text>}
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
                  {pickerConfig.field === 'time' ? "Sélectionner l'heure" : 'Sélectionner une date'}
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
  tagChipText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontFamily: FONTS.medium },

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
  modalEmpty: { color: COLORS.textMuted, textAlign: 'center', fontSize: FONTS.sizes.base, fontFamily: FONTS.regular, paddingVertical: SPACING.xl },
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
