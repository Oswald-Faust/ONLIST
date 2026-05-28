import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Alert, TextInput, Modal, FlatList, Image, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { lieuxAPI, uploadAPI } from '../../services/api';
import LocationAutocompleteFields from '../../components/LocationAutocompleteFields';

const TOTAL_STEPS = 3;

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

// ─── Stepper ──────────────────────────────────────────────────────────────────
function Stepper({ currentStep }) {
  const labels = ['Informations', 'Localisation', 'Description'];
  return (
    <View style={st.wrap}>
      {[1, 2, 3].map((step, i) => {
        const done = step < currentStep;
        const active = step === currentStep;
        return (
          <React.Fragment key={step}>
            <View style={st.stepCol}>
              <View style={[st.circle, done && st.circleDone, active && st.circleActive]}>
                {done
                  ? <Ionicons name="checkmark" size={14} color="#0A0A0F" />
                  : <Text style={[st.num, active && st.numActive]}>{step}</Text>}
              </View>
              <Text style={[st.label, active && st.labelActive]}>{labels[i]}</Text>
            </View>
            {i < 2 && (
              <View style={[st.line, done && st.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginBottom: SPACING.xl, paddingHorizontal: SPACING.md },
  stepCol: { alignItems: 'center', gap: 6, width: 72 },
  circle: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgCard2, borderWidth: 1.5, borderColor: COLORS.border,
  },
  circleActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(201,169,97,0.12)' },
  circleDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  num: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  numActive: { color: COLORS.primary },
  label: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.medium, textAlign: 'center' },
  labelActive: { color: COLORS.primary },
  line: { flex: 1, height: 1.5, backgroundColor: COLORS.border, marginTop: 16 },
  lineDone: { backgroundColor: COLORS.primary },
});

// ─── Champ de saisie ──────────────────────────────────────────────────────────
function Field({ label, required, icon, ...props }) {
  return (
    <View style={fd.wrap}>
      <Text style={fd.label}>{label}{required && <Text style={fd.req}> *</Text>}</Text>
      <View style={fd.row}>
        {icon && <Ionicons name={icon} size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />}
        <TextInput style={fd.input} placeholderTextColor={COLORS.textMuted} {...props} />
      </View>
    </View>
  );
}

const fd = StyleSheet.create({
  wrap: { marginBottom: SPACING.md },
  label: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium, marginBottom: 8 },
  req: { color: COLORS.primary },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, minHeight: 52,
  },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.sizes.base, fontFamily: FONTS.regular },
});

// ─── Sélecteur de catégorie ───────────────────────────────────────────────────
function CategorySelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = CATEGORIES.find(c => c.value === value);

  return (
    <View style={{ marginBottom: SPACING.md }}>
      <Text style={fd.label}>Catégorie<Text style={fd.req}> *</Text></Text>
      <TouchableOpacity
        style={[fd.row, { justifyContent: 'space-between' }]}
        onPress={() => setOpen(true)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {selected
            ? <><Ionicons name={selected.icon} size={16} color={COLORS.primary} /><Text style={{ color: COLORS.textPrimary, fontFamily: FONTS.medium, fontSize: FONTS.sizes.base }}>{selected.label}</Text></>
            : <Text style={{ color: COLORS.textMuted, fontFamily: FONTS.regular, fontSize: FONTS.sizes.base }}>Sélectionner une catégorie</Text>
          }
        </View>
        <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: COLORS.border, paddingBottom: 32 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 12, marginBottom: 20 }} />
            <Text style={{ color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold, textAlign: 'center', marginBottom: SPACING.md }}>Catégorie</Text>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.value}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: cat.value === value ? 'rgba(201,169,97,0.06)' : 'transparent' }}
                onPress={() => { onChange(cat.value); setOpen(false); }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: cat.value === value ? 'rgba(201,169,97,0.15)' : COLORS.bgCard2, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={cat.icon} size={18} color={cat.value === value ? COLORS.primary : COLORS.textMuted} />
                </View>
                <Text style={{ flex: 1, color: cat.value === value ? COLORS.primary : COLORS.textPrimary, fontFamily: cat.value === value ? FONTS.semiBold : FONTS.regular, fontSize: FONTS.sizes.base }}>{cat.label}</Text>
                {cat.value === value && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────
export default function CreateLieuScreen({ navigation, route }) {
  const lieuToEdit = route.params?.lieu;
  const isEdit = !!lieuToEdit;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Données
  const [name, setName] = useState(lieuToEdit?.name || '');
  const [category, setCategory] = useState(lieuToEdit?.category || '');
  const [capacity, setCapacity] = useState(lieuToEdit?.capacity ? String(lieuToEdit.capacity) : '');
  const [address, setAddress] = useState(lieuToEdit?.address || '');
  const [city, setCity] = useState(lieuToEdit?.city || '');
  const [postalCode, setPostalCode] = useState(lieuToEdit?.postalCode || '');
  const [description, setDescription] = useState(lieuToEdit?.description || '');
  const [photos, setPhotos] = useState(lieuToEdit?.photos || []);

  const stepTitles = ['Informations & photos', 'Localisation', 'Description'];

  const validateStep = () => {
    if (step === 1) {
      if (!name.trim()) { Alert.alert('Erreur', 'Le nom du lieu est requis'); return false; }
      if (!category) { Alert.alert('Erreur', 'La catégorie est requise'); return false; }
    }
    if (step === 2) {
      if (!address.trim()) { Alert.alert('Erreur', "L'adresse est requise"); return false; }
      if (!city.trim()) { Alert.alert('Erreur', 'La ville est requise'); return false; }
    }
    return true;
  };

  const next = () => { if (validateStep()) setStep(s => s + 1); };
  const prev = () => setStep(s => s - 1);

  const pickPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à la galerie pour ajouter des photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: Math.max(1, 6 - photos.length),
    });
    if (result.canceled) return;

    setUploading(true);
    try {
      const uploaded = [];
      for (const asset of result.assets) {
        const data = await uploadAPI.image(asset.uri);
        uploaded.push(data.url);
      }
      setPhotos((prev) => [...prev, ...uploaded].slice(0, 6));
    } catch (err) {
      Alert.alert('Erreur upload', err.message || "Impossible d'ajouter les photos.");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    setLoading(true);
    try {
      const payload = {
        name: name.trim(), category,
        capacity: capacity ? parseInt(capacity, 10) : 0,
        address: address.trim(), city: city.trim(), postalCode: postalCode.trim(),
        description: description.trim(),
        photos,
      };
      if (isEdit) {
        await lieuxAPI.update(lieuToEdit._id, payload);
      } else {
        await lieuxAPI.create(payload);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#0A0A0F', '#0E0D0B']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step === 1 ? navigation.goBack() : prev()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={styles.headerTitle}>{isEdit ? 'Modifier le lieu' : 'Créer un lieu'}</Text>
            <Text style={styles.headerSub}>Étape {step} sur {TOTAL_STEPS} — {stepTitles[step - 1]}</Text>
          </View>
        </View>

        <Stepper currentStep={step} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            {step === 1 && (
              <>
                <Text style={styles.sectionTitle}>Photos du lieu</Text>
                <TouchableOpacity style={styles.coverUpload} onPress={pickPhotos} disabled={uploading}>
                  {photos[0] ? (
                    <>
                      <Image source={{ uri: photos[0] }} style={styles.coverUploadImage} resizeMode="cover" />
                      <LinearGradient
                        colors={['transparent', 'rgba(10,10,15,0.78)']}
                        style={StyleSheet.absoluteFill}
                      />
                      <View style={styles.coverUploadBadge}>
                        <Ionicons name="images-outline" size={16} color={COLORS.white} />
                        <Text style={styles.coverUploadBadgeText}>
                          {uploading ? 'Upload...' : 'Photo principale'}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.coverUploadEmpty}>
                      {uploading ? (
                        <ActivityIndicator color={COLORS.primary} />
                      ) : (
                        <>
                          <View style={styles.coverUploadIcon}>
                            <Ionicons name="camera-outline" size={28} color={COLORS.primary} />
                          </View>
                          <Text style={styles.coverUploadTitle}>Ajoute les photos du lieu dès le départ</Text>
                          <Text style={styles.coverUploadSubtitle}>Choisis une belle photo principale puis complète la galerie.</Text>
                        </>
                      )}
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.photosHeaderRow}>
                  <Text style={styles.photosHeaderTitle}>Galerie</Text>
                  <Text style={styles.photosHeaderMeta}>{photos.length}/6 photos</Text>
                </View>
                <View style={styles.photoRail}>
                  {photos.slice(1).map((uri, index) => (
                    <View key={`${uri}-${index + 1}`} style={styles.photoRailThumb}>
                      <Image source={{ uri }} style={styles.photoImg} resizeMode="cover" />
                      <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(index + 1)}>
                        <Ionicons name="close" size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {photos.length < 6 && (
                    <TouchableOpacity style={styles.photoRailAdd} onPress={pickPhotos} disabled={uploading}>
                      <Ionicons name="add" size={22} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.photoHint}>La première image sera utilisée comme visuel principal du lieu.</Text>

                <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Informations générales</Text>
                <Field label="Nom du lieu" required placeholder="Ex: Camus Resto" value={name} onChangeText={setName} />
                <CategorySelector value={category} onChange={setCategory} />
                <Field
                  label="Capacité maximale" icon="people-outline"
                  placeholder="4"
                  value={capacity}
                  onChangeText={v => setCapacity(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                />
              </>
            )}

            {step === 2 && (
              <>
                <Text style={styles.sectionTitle}>Localisation</Text>
                <LocationAutocompleteFields
                  address={address}
                  city={city}
                  postalCode={postalCode}
                  onChangeAddress={setAddress}
                  onChangeCity={setCity}
                  onChangePostalCode={setPostalCode}
                />
              </>
            )}

            {step === 3 && (
              <>
                <Text style={styles.sectionTitle}>Description</Text>
                <View style={styles.textAreaWrap}>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Décrivez votre lieu, son ambiance, ses particularités..."
                    placeholderTextColor={COLORS.textMuted}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                  />
                </View>
              </>
            )}
          </View>
        </ScrollView>

        {/* Boutons navigation */}
        <View style={styles.footer}>
          {step > 1 && (
            <TouchableOpacity style={styles.prevBtn} onPress={prev}>
              <Ionicons name="chevron-back" size={16} color={COLORS.textSecondary} />
              <Text style={styles.prevBtnText}>Précédent</Text>
            </TouchableOpacity>
          )}
          {step < TOTAL_STEPS ? (
            <TouchableOpacity style={[styles.nextBtn, step === 1 && { flex: 1 }]} onPress={next}>
              <LinearGradient colors={COLORS.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtnGrad}>
                <Text style={styles.nextBtnText}>Suivant</Text>
                <Ionicons name="chevron-forward" size={16} color="#0A0A0F" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.nextBtn, { flex: 1 }]} onPress={submit} disabled={loading}>
              <LinearGradient colors={COLORS.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtnGrad}>
                <Text style={styles.nextBtnText}>{loading ? 'Enregistrement...' : isEdit ? 'Sauvegarder' : 'Créer le lieu'}</Text>
                {!loading && <Ionicons name="chevron-forward" size={16} color="#0A0A0F" />}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.lg,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgCard2,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: FONTS.bold },
  headerSub: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, marginTop: 2 },

  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: FONTS.bold,
    marginBottom: SPACING.lg,
  },

  textAreaWrap: {
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
    minHeight: 160,
  },
  textArea: {
    color: COLORS.textPrimary, fontSize: FONTS.sizes.base,
    fontFamily: FONTS.regular, flex: 1, lineHeight: 22,
  },
  coverUpload: {
    height: 210,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard2,
    marginBottom: SPACING.md,
  },
  coverUploadImage: { width: '100%', height: '100%' },
  coverUploadEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    gap: 10,
  },
  coverUploadIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,169,97,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.2)',
  },
  coverUploadTitle: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.bold, textAlign: 'center' },
  coverUploadSubtitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, textAlign: 'center', lineHeight: 20 },
  coverUploadBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  coverUploadBadgeText: { color: COLORS.white, fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },
  photosHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  photosHeaderTitle: { color: COLORS.white, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  photosHeaderMeta: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  photoRail: { flexDirection: 'row', gap: 10, marginBottom: SPACING.sm },
  photoRailThumb: { width: 82, height: 82, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  photoRailAdd: {
    width: 82, height: 82, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard2, alignItems: 'center', justifyContent: 'center',
  },
  photoImg: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)',
  },
  photoHint: {
    color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular,
    marginTop: 2,
  },

  footer: {
    flexDirection: 'row', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  prevBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.bgCard2, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 14, paddingHorizontal: 20,
  },
  prevBtnText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.base, fontFamily: FONTS.medium },
  nextBtn: { borderRadius: RADIUS.md, overflow: 'hidden' },
  nextBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, paddingHorizontal: 24,
  },
  nextBtnText: { color: '#0A0A0F', fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
});
