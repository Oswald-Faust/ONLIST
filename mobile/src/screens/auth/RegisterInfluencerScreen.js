import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar,
  Modal, FlatList, TextInput, Platform, Image, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import GradientButton from '../../components/GradientButton';
import InputField from '../../components/InputField';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

// ─── Liste de villes ──────────────────────────────────────────────────────────
const ALL_CITIES = [
  'Paris', 'Lyon', 'Marseille', 'Nice', 'Toulouse', 'Bordeaux', 'Nantes',
  'Strasbourg', 'Montpellier', 'Lille', 'Rennes', 'Grenoble', 'Toulon',
  'Dijon', 'Angers', 'Brest', 'Metz', 'Tours', 'Rouen', 'Caen',
  'Cannes', 'Biarritz', 'Saint-Tropez', 'Monaco', 'Aix-en-Provence',
  // DOM-TOM
  'Fort-de-France', 'Pointe-à-Pitre', 'Saint-Denis de La Réunion',
  // Afrique
  'Abidjan', 'Dakar', 'Douala', 'Yaoundé', 'Kinshasa', 'Brazzaville',
  'Libreville', 'Cotonou', 'Lomé', 'Bamako', 'Conakry',
  'Tunis', 'Alger', 'Casablanca', 'Marrakech', 'Rabat',
  'Antananarivo', 'Port-Louis',
  // Europe
  'Bruxelles', 'Genève', 'Lausanne', 'Montréal', 'Québec',
].sort();

const COUNTRIES = [
  'France', 'Côte d\'Ivoire', 'Sénégal', 'Cameroun', 'Congo',
  'Maroc', 'Algérie', 'Tunisie', 'Belgique', 'Suisse', 'Canada',
  'Gabon', 'Mali', 'Guinée', 'Bénin', 'Togo', 'Burkina Faso',
  'Madagascar', 'Maurice', 'Djibouti', 'Monaco',
].sort();

const STEPS = [
  { num: 1, title: 'Tes\ninfos personnelles', sub: 'Commençons par faire connaissance' },
  { num: 2, title: 'Ta\nlocalisation', sub: 'Où vis-tu ?' },
  { num: 3, title: 'Tes réseaux\nsociaux & photos', sub: 'Montre qui tu es' },
  { num: 4, title: 'Ton mot\nde passe', sub: 'Sécurise ton compte' },
];

// ─── Composant SelectModal ─────────────────────────────────────────────────────
function SelectModal({ visible, onClose, items, selected, onSelect, title }) {
  const [search, setSearch] = useState('');
  const filtered = items.filter(i => i.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{title}</Text>
            <TouchableOpacity onPress={() => { onClose(); setSearch(''); }}>
              <Ionicons name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <View style={modalStyles.searchRow}>
            <Ionicons name="search" size={16} color={COLORS.textMuted} />
            <TextInput
              style={modalStyles.searchInput}
              placeholder="Rechercher..."
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={i => i}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[modalStyles.item, item === selected && modalStyles.itemSelected]}
                onPress={() => { onSelect(item); setSearch(''); onClose(); }}
              >
                <Text style={[modalStyles.itemText, item === selected && modalStyles.itemTextSelected]}>
                  {item}
                </Text>
                {item === selected && <Ionicons name="checkmark-circle" size={18} color={COLORS.primaryLight} />}
              </TouchableOpacity>
            )}
            style={{ flexGrow: 0, maxHeight: 320 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Composant PhotoGrid ───────────────────────────────────────────────────────
function PhotoGrid({ photos, onAdd, onRemove }) {
  return (
    <View>
      <View style={photoStyles.grid}>
        {photos.map((uri, i) => (
          <View key={i} style={photoStyles.cell}>
            <Image source={{ uri }} style={photoStyles.img} />
            <TouchableOpacity style={photoStyles.deleteBtn} onPress={() => onRemove(i)}>
              <Ionicons name="trash" size={14} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < 6 && (
          <TouchableOpacity style={photoStyles.addCell} onPress={onAdd}>
            <View style={photoStyles.addDashed}>
              <Ionicons name="add" size={24} color={COLORS.primaryLight} />
              <Text style={photoStyles.addText}>Ajouter</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
      {photos.length > 0 && (
        <Text style={photoStyles.countText}>
          <Text style={{ color: COLORS.gold, fontFamily: FONTS.semiBold }}>{photos.length} photo{photos.length > 1 ? 's' : ''}</Text>
          {' '}uploadée{photos.length > 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function RegisterInfluencerScreen({ navigation }) {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Modals
  const [cityModal, setCityModal] = useState(false);
  const [countryModal, setCountryModal] = useState(false);
  const [nationalityModal, setNationalityModal] = useState(false);

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    dateOfBirth: '', gender: '',
    nationality: '', country: 'France', city: '',
    instagram: '', tiktok: '', followersCount: '',
    photos: [],
    password: '', confirmPassword: '',
    bio: '',
    acceptTerms: false,
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // ── Validation par étape ──────────────────────────────────────────────────
  const validate = () => {
    if (step === 1) {
      if (!form.firstName.trim()) return Alert.alert('Erreur', 'Prénom requis');
      if (!form.lastName.trim()) return Alert.alert('Erreur', 'Nom requis');
      if (!form.email.trim()) return Alert.alert('Erreur', 'Email requis');
      if (!form.dateOfBirth) return Alert.alert('Erreur', 'Date de naissance requise');
      if (!form.gender) return Alert.alert('Erreur', 'Genre requis');
      return true;
    }
    if (step === 2) {
      if (!form.city) return Alert.alert('Erreur', 'Ville requise');
      return true;
    }
    if (step === 3) {
      if (!form.instagram && !form.tiktok) return Alert.alert('Erreur', 'Au moins un réseau social requis');
      if (!form.followersCount) return Alert.alert('Erreur', 'Nombre de followers requis');
      if (form.photos.length === 0) return Alert.alert('Erreur', 'Au moins une photo requise');
      return true;
    }
    if (step === 4) {
      if (!form.password || form.password.length < 8) return Alert.alert('Erreur', 'Mot de passe de 8 caractères minimum');
      if (form.password !== form.confirmPassword) return Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      if (!form.acceptTerms) return Alert.alert('Erreur', 'Veuillez accepter les conditions d\'utilisation');
      return true;
    }
    return true;
  };

  const nextStep = () => {
    if (!validate()) return;
    if (step < 4) { setStep(step + 1); return; }
    handleSubmit();
  };

  // ── Upload photos ─────────────────────────────────────────────────────────
  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'L\'accès à la galerie est nécessaire pour ajouter des photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 6 - form.photos.length,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      update('photos', [...form.photos, ...uris].slice(0, 6));
    }
  };

  const removePhoto = (idx) => {
    update('photos', form.photos.filter((_, i) => i !== idx));
  };

  // ── Soumission ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    try {
      await register({
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: form.email.trim(),
        password: form.password,
        type: 'influencer',
        instagram: form.instagram,
        tiktok: form.tiktok,
        followersCount: parseInt(form.followersCount) || 0,
        city: form.city,
        country: form.country,
        bio: form.bio,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        nationality: form.nationality,
      });
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentStep = STEPS[step - 1];
  const progress = (step / 4) * width;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header fixe */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>S'inscrire en tant que Membre</Text>
          <Text style={styles.stepCounter}>{step}/4</Text>
        </View>
        {/* Barre de progression — dans le header, bien visible */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: progress }]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Titre de l'étape */}
        <Text style={styles.stepTitle}>{currentStep.title}</Text>
        <Text style={styles.stepSub}>{currentStep.sub}</Text>

        {/* ── ÉTAPE 1 : Infos personnelles ── */}
        {step === 1 && (
          <View style={styles.stepContent}>
            {/* Carte infos */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Renseigne tes informations ci-dessous *</Text>
              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Prénom"
                    placeholder="Faust"
                    value={form.firstName}
                    onChangeText={v => update('firstName', v)}
                    autoCapitalize="words"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Nom"
                    placeholder="Oswald"
                    value={form.lastName}
                    onChangeText={v => update('lastName', v)}
                    autoCapitalize="words"
                  />
                </View>
              </View>
              <InputField
                label="Email"
                placeholder="ton@email.com"
                value={form.email}
                onChangeText={v => update('email', v)}
                keyboardType="email-address"
                icon="mail-outline"
              />
            </View>

            {/* Carte date de naissance */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>
                Ta date de naissance est requise pour confirmer que tu as 18 ans *
              </Text>
              <InputField
                placeholder="JJ/MM/AAAA"
                value={form.dateOfBirth}
                onChangeText={v => update('dateOfBirth', v)}
                keyboardType="numbers-and-punctuation"
                icon="calendar-outline"
              />
            </View>

            {/* Carte genre */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>
                Ton genre est requis pour te suggérer des événements adaptés à ton profil *
              </Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[styles.genderCard, form.gender === 'female' && styles.genderCardActive]}
                  onPress={() => update('gender', 'female')}
                >
                  {form.gender === 'female' ? (
                    <LinearGradient
                      colors={COLORS.gradient}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={styles.genderGradient}
                    >
                      <Text style={styles.genderEmoji}>👩</Text>
                      <Text style={[styles.genderLabel, { color: COLORS.white }]}>Femme</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.genderInner}>
                      <Text style={styles.genderEmoji}>👩</Text>
                      <Text style={styles.genderLabel}>Femme</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderCard, form.gender === 'male' && styles.genderCardActive]}
                  onPress={() => update('gender', 'male')}
                >
                  {form.gender === 'male' ? (
                    <LinearGradient
                      colors={COLORS.gradient}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={styles.genderGradient}
                    >
                      <Text style={styles.genderEmoji}>👨</Text>
                      <Text style={[styles.genderLabel, { color: COLORS.white }]}>Homme</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.genderInner}>
                      <Text style={styles.genderEmoji}>👨</Text>
                      <Text style={styles.genderLabel}>Homme</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── ÉTAPE 2 : Localisation ── */}
        {step === 2 && (
          <View style={styles.stepContent}>
            {/* Nationalité */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Ta nationalité *</Text>
              <Text style={styles.cardNote}>
                Ces informations personnelles seront traitées avec la plus grande confidentialité et utilisées uniquement pour matcher les profils.
              </Text>
              <TouchableOpacity style={styles.selectRow} onPress={() => setNationalityModal(true)}>
                <Text style={[styles.selectValue, !form.nationality && styles.selectPlaceholder]}>
                  {form.nationality || 'Sélectionner ta nationalité'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Pays de service */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Où tu veux accéder à nos services ? *</Text>
              <TouchableOpacity style={styles.selectRow} onPress={() => setCountryModal(true)}>
                <Text style={[styles.selectValue, !form.country && styles.selectPlaceholder]}>
                  {form.country || 'Sélectionner un pays'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Ville */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Ville *</Text>
              <TouchableOpacity style={styles.selectRow} onPress={() => setCityModal(true)}>
                <Text style={[styles.selectValue, !form.city && styles.selectPlaceholder]}>
                  {form.city || 'Sélectionner ta ville'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Bio (optionnel) */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Parle un peu de toi (optionnel)</Text>
              <InputField
                placeholder="Ex: Créatrice de contenu lifestyle..."
                value={form.bio}
                onChangeText={v => update('bio', v)}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        )}

        {/* ── ÉTAPE 3 : Réseaux sociaux + Photos ── */}
        {step === 3 && (
          <View style={styles.stepContent}>
            {/* Instagram */}
            <View style={styles.card}>
              <View style={styles.socialLabelRow}>
                <Ionicons name="logo-instagram" size={20} color={COLORS.white} />
                <Text style={styles.cardLabel}>Instagram</Text>
              </View>
              <InputField
                placeholder="@ ton compte"
                value={form.instagram}
                onChangeText={v => update('instagram', v)}
                autoCapitalize="none"
              />
            </View>

            {/* TikTok */}
            <View style={styles.card}>
              <View style={styles.socialLabelRow}>
                <Ionicons name="logo-tiktok" size={20} color={COLORS.white} />
                <Text style={styles.cardLabel}>TikTok</Text>
              </View>
              <InputField
                placeholder="@ ton compte"
                value={form.tiktok}
                onChangeText={v => update('tiktok', v)}
                autoCapitalize="none"
              />
            </View>

            {/* Followers */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Nombre de followers total *</Text>
              <InputField
                placeholder="ex: 15000"
                value={form.followersCount}
                onChangeText={v => update('followersCount', v)}
                keyboardType="numeric"
                icon="people-outline"
              />
            </View>

            {/* Photos */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>
                Fais bonne impression avec tes photos, charge tes meilleurs clichés ! *
              </Text>
              <PhotoGrid photos={form.photos} onAdd={pickPhoto} onRemove={removePhoto} />
            </View>
          </View>
        )}

        {/* ── ÉTAPE 4 : Mot de passe ── */}
        {step === 4 && (
          <View style={styles.stepContent}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Crée un mot de passe sécurisé *</Text>
              <Text style={styles.cardNote}>Minimum 8 caractères</Text>
              <InputField
                label="Mot de passe"
                placeholder="••••••••••"
                value={form.password}
                onChangeText={v => update('password', v)}
                secureTextEntry
                icon="lock-closed-outline"
              />
              <InputField
                label="Confirmer"
                placeholder="••••••••••"
                value={form.confirmPassword}
                onChangeText={v => update('confirmPassword', v)}
                secureTextEntry
                icon="shield-checkmark-outline"
              />
            </View>

            {/* Résumé */}
            <View style={styles.summaryCard}>
              <LinearGradient colors={['rgba(201,169,97,0.15)', 'rgba(201,169,97,0.03)']} style={styles.summaryGrad}>
                <Text style={styles.summaryTitle}>Récapitulatif</Text>
                <SummaryRow icon="person" label={`${form.firstName} ${form.lastName}`} />
                <SummaryRow icon="mail" label={form.email} />
                <SummaryRow icon="location" label={`${form.city}, ${form.country}`} />
                {form.instagram && <SummaryRow icon="logo-instagram" label={`@${form.instagram.replace('@','')}`} />}
                {form.tiktok && <SummaryRow icon="logo-tiktok" label={`@${form.tiktok.replace('@','')}`} />}
                <SummaryRow icon="people" label={`${parseInt(form.followersCount || 0).toLocaleString()} followers`} />
                <SummaryRow icon="images" label={`${form.photos.length} photo${form.photos.length > 1 ? 's' : ''}`} />
              </LinearGradient>
            </View>

            {/* CGU */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => update('acceptTerms', !form.acceptTerms)}
            >
              <View style={[styles.checkbox, form.acceptTerms && styles.checkboxActive]}>
                {form.acceptTerms && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
              </View>
              <Text style={styles.termsText}>
                J'accepte les <Text style={styles.termsLink}>conditions d'utilisation</Text> et la{' '}
                <Text style={styles.termsLink}>politique de confidentialité</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bouton suivant / soumettre */}
        <GradientButton
          title={step < 4 ? 'Suivant' : 'Créer mon compte'}
          onPress={nextStep}
          loading={loading}
          style={styles.nextBtn}
        />

        {step > 1 && (
          <TouchableOpacity style={styles.backLink} onPress={() => setStep(step - 1)}>
            <Text style={styles.backLinkText}>← Retour</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginRow}>
          <Text style={styles.loginQ}>Déjà un compte ?  </Text>
          <Text style={styles.loginLink}>Se connecter</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      <SelectModal visible={cityModal} onClose={() => setCityModal(false)} items={ALL_CITIES} selected={form.city} onSelect={v => update('city', v)} title="Choisis ta ville" />
      <SelectModal visible={countryModal} onClose={() => setCountryModal(false)} items={COUNTRIES} selected={form.country} onSelect={v => update('country', v)} title="Pays de service" />
      <SelectModal visible={nationalityModal} onClose={() => setNationalityModal(false)} items={COUNTRIES} selected={form.nationality} onSelect={v => update('nationality', v)} title="Nationalité" />
    </View>
  );
}

function SummaryRow({ icon, label }) {
  return (
    <View style={styles.summaryRow}>
      <Ionicons name={icon} size={14} color={COLORS.primaryLight} />
      <Text style={styles.summaryValue} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(201,169,97,0.1)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: 'rgba(201,169,97,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  headerTitle: {
    flex: 1,
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontFamily: 'Poppins_500Medium',
  },
  stepCounter: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontFamily: 'Poppins_500Medium',
  },
  scroll: { padding: SPACING.lg, paddingBottom: 60 },
  stepTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xxl,
    fontFamily: 'Poppins_700Bold',
    marginBottom: SPACING.xs,
    lineHeight: 40,
  },
  stepSub: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.base,
    fontFamily: 'Poppins_400Regular',
    marginBottom: SPACING.xl,
  },
  stepContent: { gap: SPACING.md },

  // Cards
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 2,
  },
  cardLabel: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontFamily: 'Poppins_500Medium',
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  cardNote: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontFamily: 'Poppins_400Regular',
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  rowFields: { flexDirection: 'row', gap: SPACING.sm },

  // Genre
  genderRow: { flexDirection: 'row', gap: SPACING.md },
  genderCard: {
    flex: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 100,
  },
  genderCardActive: { borderColor: COLORS.primaryLight },
  genderGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    gap: 6,
  },
  genderInner: {
    flex: 1,
    backgroundColor: COLORS.bgCard2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    gap: 6,
  },
  genderEmoji: { fontSize: 32, fontFamily: 'Poppins_400Regular' },
  genderLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.base,
    fontFamily: 'Poppins_600SemiBold',
  },

  // Select
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectValue: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.base,
    fontFamily: 'Poppins_400Regular',
  },
  selectPlaceholder: { color: COLORS.textMuted },

  // Social label
  socialLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },

  // Résumé
  summaryCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.25)',
  },
  summaryGrad: { padding: SPACING.md },
  summaryTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 6,
  },
  summaryValue: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },

  // CGU
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryLight },
  termsText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
  },
  termsLink: { color: COLORS.primaryLight, fontFamily: 'Poppins_500Medium' },

  // Navigation
  nextBtn: { marginTop: SPACING.xl, marginBottom: SPACING.sm },
  backLink: { alignItems: 'center', marginBottom: SPACING.sm, paddingVertical: SPACING.sm },
  backLinkText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.base,
    fontFamily: 'Poppins_400Regular',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  loginQ: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: 'Poppins_400Regular',
  },
  loginLink: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontFamily: 'Poppins_600SemiBold',
    textDecorationLine: 'underline',
  },
});

// ─── Modal styles ──────────────────────────────────────────────────────────────
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontFamily: 'Poppins_600SemiBold',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.base,
    paddingVertical: 10,
    fontFamily: 'Poppins_400Regular',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  itemSelected: { backgroundColor: 'rgba(201,169,97,0.08)' },
  itemText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.base,
    fontFamily: 'Poppins_400Regular',
  },
  itemTextSelected: { color: COLORS.primaryLight, fontFamily: 'Poppins_600SemiBold' },
});

// ─── Photo grid styles ─────────────────────────────────────────────────────────
const photoStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  cell: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
  },
  img: { width: '100%', height: '100%', resizeMode: 'cover' },
  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCell: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  addDashed: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(201,169,97,0.04)',
  },
  addText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontFamily: 'Poppins_500Medium',
  },
  countText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: 'Poppins_400Regular',
    marginTop: SPACING.sm,
  },
});
