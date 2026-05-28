import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Image, Alert, StatusBar, Platform, ActivityIndicator, Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import KeyboardDismissScrollView from '../../components/KeyboardDismissScrollView';
import { useAuth } from '../../context/AuthContext';
import { authAPI, usersAPI } from '../../services/api';

const BASE_URL = Platform.select({
  android: 'http://10.0.2.2:4000/api',
  ios: 'http://localhost:4000/api',
  default: 'http://localhost:4000/api',
});

// ─── Upload d'une image vers /api/upload ─────────────────────────────────────
async function uploadImage(uri) {
  const token = await AsyncStorage.getItem('token');
  const filename = uri.split('/').pop() || `photo_${Date.now()}.jpg`;
  const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', { uri, name: filename, type: mimeType });

  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Erreur lors de l'upload");
  }
  const data = await res.json();
  return data.url;
}

// ─── Utilitaires date ────────────────────────────────────────────────────────
const formatDateDisplay = (date) => {
  const d = `${date.getDate()}`.padStart(2, '0');
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const y = `${date.getFullYear()}`;
  return `${d}/${m}/${y}`;
};

const parseDateStr = (str) => {
  if (!str) return null;
  const [d, mo, y] = str.split('/').map(Number);
  if (!d || !mo || !y) return null;
  const date = new Date(y, mo - 1, d);
  return isNaN(date.getTime()) ? null : date;
};

const maxBirthDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
};

// ─── Champ de formulaire ─────────────────────────────────────────────────────
function Field({ label, value, onChangeText, placeholder, multiline, prefix, keyboardType, editable = true }) {
  return (
    <View style={F.wrap}>
      <Text style={F.label}>{label}</Text>
      <View style={[F.inputWrap, multiline && F.inputWrapMulti, !editable && F.inputWrapReadonly]}>
        {prefix ? <Text style={F.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[F.input, multiline && F.inputMulti]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          autoCapitalize={multiline ? 'sentences' : 'none'}
          keyboardType={keyboardType || 'default'}
          editable={editable}
        />
        {!editable && (
          <Ionicons name="lock-closed-outline" size={14} color={COLORS.textMuted} />
        )}
      </View>
    </View>
  );
}

const F = StyleSheet.create({
  wrap: { marginBottom: SPACING.md },
  label: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 50,
  },
  inputWrapMulti: { height: 90, alignItems: 'flex-start', paddingTop: 12 },
  inputWrapReadonly: { backgroundColor: 'rgba(255,255,255,0.02)', opacity: 0.6 },
  prefix: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.regular,
    marginRight: 2,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.regular,
    paddingVertical: 0,
  },
  inputMulti: { textAlignVertical: 'top', paddingTop: 0 },
});

// ─── Sélecteur de genre ──────────────────────────────────────────────────────
const GENDER_OPTIONS = [
  { val: 'female',     label: 'Femme',      icon: 'woman-outline' },
  { val: 'male',       label: 'Homme',      icon: 'man-outline' },
  { val: 'non-binary', label: 'Non-binaire', icon: 'person-outline' },
];

function GenderSelector({ value, onChange }) {
  return (
    <View style={GS.wrap}>
      <Text style={F.label}>Genre</Text>
      <View style={GS.row}>
        {GENDER_OPTIONS.map(opt => {
          const active = value === opt.val;
          return (
            <TouchableOpacity
              key={opt.val}
              style={[GS.btn, active && GS.btnActive]}
              onPress={() => onChange(active ? '' : opt.val)}
              activeOpacity={0.8}
            >
              <Ionicons name={opt.icon} size={16} color={active ? COLORS.primary : COLORS.textMuted} />
              <Text style={[GS.btnTxt, active && GS.btnTxtActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const GS = StyleSheet.create({
  wrap: { marginBottom: SPACING.md },
  row: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  btnActive: { backgroundColor: 'rgba(201,169,97,0.1)', borderColor: COLORS.primary },
  btnTxt: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium },
  btnTxtActive: { color: COLORS.primary, fontFamily: FONTS.semiBold },
});

// ─── Sélecteur de date ───────────────────────────────────────────────────────
function DateField({ label, value, onChange }) {
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState(parseDateStr(value) || maxBirthDate());

  return (
    <View style={{ marginBottom: SPACING.md }}>
      <Text style={F.label}>{label}</Text>
      <TouchableOpacity
        style={[F.inputWrap, { justifyContent: 'space-between' }]}
        onPress={() => setShow(true)}
        activeOpacity={0.8}
      >
        <Text style={value ? { color: COLORS.textPrimary, fontFamily: FONTS.regular, fontSize: FONTS.sizes.base } : { color: COLORS.textMuted, fontFamily: FONTS.regular, fontSize: FONTS.sizes.base }}>
          {value || 'JJ/MM/AAAA'}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={value ? COLORS.primaryLight : COLORS.textMuted} />
      </TouchableOpacity>

      {/* iOS — picker en sheet */}
      {show && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide">
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
            <View style={DS.sheet}>
              <View style={DS.sheetHeader}>
                <Text style={DS.sheetTitle}>Date de naissance</Text>
                <TouchableOpacity onPress={() => { onChange(formatDateDisplay(draft)); setShow(false); }}>
                  <Text style={DS.sheetDone}>Valider</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                themeVariant="dark"
                maximumDate={maxBirthDate()}
                onChange={(_, d) => { if (d) setDraft(d); }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android — picker natif */}
      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={draft}
          mode="date"
          display="default"
          maximumDate={maxBirthDate()}
          onChange={(e, d) => {
            setShow(false);
            if (e.type === 'set' && d) onChange(formatDateDisplay(d));
          }}
        />
      )}
    </View>
  );
}

const DS = StyleSheet.create({
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden', paddingBottom: 30,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md,
  },
  sheetTitle: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium },
  sheetDone: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
});

// ─── Écran principal ─────────────────────────────────────────────────────────
export default function EditProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();

  const [name,         setName]         = useState(user?.name         || '');
  const [bio,          setBio]          = useState(user?.bio          || '');
  const [instagram,    setInstagram]    = useState((user?.instagram   || '').replace('@', ''));
  const [tiktok,       setTiktok]       = useState((user?.tiktok      || '').replace('@', ''));
  const [followersCount, setFollowers]  = useState(user?.followersCount ? String(user.followersCount) : '');
  const [city,         setCity]         = useState(user?.city         || '');
  const [country,      setCountry]      = useState(user?.country      || '');
  const [nationality,  setNationality]  = useState(user?.nationality  || '');
  const [gender,       setGender]       = useState(user?.gender       || '');
  const [dateOfBirth,  setDateOfBirth]  = useState(user?.dateOfBirth  || '');
  const [photos,       setPhotos]       = useState(user?.photos       || []);

  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);

  // ── Sélection + upload de photos ──
  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "Autorisez l'accès à votre galerie pour ajouter des photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;

    setUploading(true);
    try {
      const uploaded = await Promise.all(result.assets.map(a => uploadImage(a.uri)));
      setPhotos(prev => [...prev, ...uploaded]);
    } catch (e) {
      Alert.alert('Erreur upload', e.message || "Impossible d'uploader les photos.");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = idx => {
    Alert.alert('Supprimer la photo', 'Voulez-vous supprimer cette photo ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => setPhotos(prev => prev.filter((_, i) => i !== idx)),
      },
    ]);
  };

  // ── Sauvegarde ──
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Champ requis', 'Le nom complet est requis.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name:           name.trim(),
        bio:            bio.trim(),
        instagram:      instagram.trim() ? `@${instagram.trim().replace('@', '')}` : '',
        tiktok:         tiktok.trim()    ? `@${tiktok.trim().replace('@', '')}`    : '',
        followersCount: parseInt(followersCount) || 0,
        city:           city.trim(),
        country:        country.trim(),
        nationality:    nationality.trim(),
        gender,
        dateOfBirth,
        photos,
      };
      await usersAPI.updateMe(payload);
      const me = await authAPI.me();
      await updateUser(me.user || payload);
      Alert.alert('Profil mis à jour', 'Vos modifications ont bien été enregistrées.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erreur', e.message || 'Impossible de sauvegarder le profil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <View style={[S.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={S.headerCircleBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={S.headerTitle}>Modifier le profil</Text>
        <TouchableOpacity
          style={[S.headerCircleBtn, S.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color={COLORS.bg} />
            : <Text style={S.saveBtnTxt}>Enregistrer</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardDismissScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={S.contentPad}
      >
        {/* ── Photos ── */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Photos</Text>
          <Text style={S.cardSubtitle}>La première photo sera ta photo principale de profil.</Text>
          <View style={S.photosGrid}>
            {photos.map((uri, i) => (
              <TouchableOpacity key={`${uri}-${i}`} style={S.photoThumb} activeOpacity={0.85}>
                <Image source={{ uri }} style={S.photoThumbImg} resizeMode="cover" />
                {i === 0 && (
                  <View style={S.mainBadge}>
                    <Text style={S.mainBadgeTxt}>Principale</Text>
                  </View>
                )}
                <TouchableOpacity style={S.removeBtn} onPress={() => removePhoto(i)}>
                  <View style={S.removeBtnInner}>
                    <Ionicons name="close" size={11} color="#fff" />
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={S.addPhotoBtn} onPress={pickPhotos} disabled={uploading} activeOpacity={0.75}>
              {uploading
                ? <ActivityIndicator color={COLORS.primaryLight} />
                : <>
                    <Ionicons name="add" size={28} color={COLORS.primaryLight} />
                    <Text style={S.addPhotoTxt}>Ajouter</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Informations personnelles ── */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Informations personnelles</Text>

          <Field
            label="Nom complet"
            value={name}
            onChangeText={setName}
            placeholder="Votre nom"
          />
          <Field
            label="Adresse e-mail"
            value={user?.email || ''}
            placeholder="—"
            editable={false}
          />
          <Field
            label="Numéro de téléphone"
            value={user?.phone || ''}
            placeholder="—"
            editable={false}
          />
          <Field
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Décrivez-vous en quelques mots..."
            multiline
          />

          <DateField
            label="Date de naissance"
            value={dateOfBirth}
            onChange={setDateOfBirth}
          />

          <GenderSelector value={gender} onChange={setGender} />

          <Field
            label="Nationalité"
            value={nationality}
            onChangeText={setNationality}
            placeholder="Française"
          />
          <Field
            label="Pays de résidence"
            value={country}
            onChangeText={setCountry}
            placeholder="France"
          />
          <Field
            label="Ville"
            value={city}
            onChangeText={setCity}
            placeholder="Paris"
          />
        </View>

        {/* ── Réseaux sociaux ── */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Réseaux sociaux</Text>
          <Field
            label="Instagram"
            value={instagram}
            onChangeText={setInstagram}
            placeholder="votre_pseudo"
            prefix="@"
          />
          <Field
            label="TikTok"
            value={tiktok}
            onChangeText={setTiktok}
            placeholder="votre_pseudo"
            prefix="@"
          />
          <Field
            label="Nombre total de followers"
            value={followersCount}
            onChangeText={setFollowers}
            placeholder="Ex : 12000"
            keyboardType="numeric"
          />
        </View>
      </KeyboardDismissScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerCircleBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.bold,
  },
  saveBtn: {
    width: 'auto', paddingHorizontal: 16,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    minWidth: 42,
  },
  saveBtnTxt: {
    color: COLORS.bg,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.bold,
  },

  contentPad: { padding: SPACING.lg, paddingBottom: 80 },

  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.bold,
    marginBottom: 4,
  },
  cardSubtitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    marginBottom: SPACING.md,
  },

  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoThumb: { width: 90, height: 90, borderRadius: 12, overflow: 'visible' },
  photoThumbImg: { width: 90, height: 90, borderRadius: 12 },
  mainBadge: {
    position: 'absolute', bottom: 5, left: 5,
    backgroundColor: 'rgba(201,169,97,0.9)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  mainBadgeTxt: { color: '#fff', fontSize: 9, fontFamily: FONTS.bold },
  removeBtn: { position: 'absolute', top: -6, right: -6, zIndex: 10 },
  removeBtnInner: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#FF3B30',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.bg,
  },
  addPhotoBtn: {
    width: 90, height: 90, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  addPhotoTxt: {
    color: COLORS.primaryLight,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.medium,
  },
});
