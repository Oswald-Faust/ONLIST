import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, StatusBar, Alert,
  Dimensions, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  SlideInRight, SlideInLeft, SlideOutLeft, SlideOutRight,
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { PHONE_CODES } from '../../constants/phoneCodes';
import KeyboardDismissScrollView from '../../components/KeyboardDismissScrollView';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

// ─── Types d'établissement ─────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  { id: 'restaurant', label: 'Restaurant', icon: 'restaurant' },
  { id: 'bar',        label: 'Bar',        icon: 'wine' },
  { id: 'club',       label: 'Club',       icon: 'musical-notes' },
  { id: 'spa',        label: 'Spa',        icon: 'flower' },
  { id: 'sport',      label: 'Sport',      icon: 'fitness' },
  { id: 'wellness',   label: 'Bien-être',  icon: 'heart' },
  { id: 'hotel',      label: 'Hôtel',      icon: 'bed' },
  { id: 'cafe',       label: 'Café',       icon: 'cafe' },
  { id: 'beauty',     label: 'Beauté',     icon: 'color-palette' },
  { id: 'shop',       label: 'Boutique',   icon: 'cart' },
  { id: 'premium',    label: 'Lieu Premium', icon: 'diamond' },
  { id: 'other',      label: 'Autre',      icon: 'ellipsis-horizontal' },
];

// ─── Config des étapes ─────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 'businessName',
    context: 'Faites-vous connaître',
    question: 'Nom de votre\nétablissement ?',
    type: 'text',
    field: 'businessName',
    placeholder: 'Le nom de votre établissement',
    autoCapitalize: 'words',
    keyboardType: 'default',
  },
  {
    id: 'businessType',
    context: 'Aidez-nous à vous classer',
    question: 'Type\nd\'établissement ?',
    type: 'businessType',
    field: 'businessType',
  },
  {
    id: 'businessCity',
    context: 'Pour cibler les bons influenceurs',
    question: 'Votre adresse ?',
    type: 'businessAddress',
  },
  {
    id: 'managerName',
    context: 'Le responsable du compte',
    question: 'Votre nom\ncomplet ?',
    type: 'text',
    field: 'name',
    placeholder: 'Prénom et nom',
    autoCapitalize: 'words',
    keyboardType: 'default',
  },
  {
    id: 'contact',
    context: 'Pour vous contacter',
    question: 'Vos\ncoordonnées ?',
    type: 'contact',
  },
  {
    id: 'businessDescription',
    context: 'Facultatif mais recommandé',
    question: 'Décrivez votre\nétablissement',
    type: 'multiline',
    field: 'businessDescription',
    placeholder: 'Ambiance, offre, ce qui vous distingue...',
  },
  {
    id: 'password',
    context: 'Dernière étape !',
    question: 'Créez votre\nmot de passe',
    type: 'password',
  },
];

// ─── Composant Texte ───────────────────────────────────────────────────────────

function StepText({ config, value, onChange, multiline }) {
  return (
    <View style={step.inputWrap}>
      <TextInput
        style={[step.bigInput, multiline && step.multilineInput]}
        value={value}
        onChangeText={onChange}
        placeholder={config.placeholder}
        placeholderTextColor={COLORS.textMuted}
        autoCapitalize={config.autoCapitalize || 'none'}
        keyboardType={config.keyboardType || 'default'}
        autoFocus
        selectionColor={COLORS.primary}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
      />
      {!multiline && <View style={step.inputLine} />}
    </View>
  );
}

// ─── Composant Type d'établissement ───────────────────────────────────────────

function StepBusinessType({ value, onChange }) {
  return (
    <View style={step.typeGrid}>
      {BUSINESS_TYPES.map(t => {
        const active = value === t.id;
        return (
          <TouchableOpacity
            key={t.id}
            style={[step.typeCard, active && step.typeCardActive]}
            onPress={() => onChange(t.id)}
            activeOpacity={0.75}
          >
            {active && (
              <LinearGradient
                colors={['rgba(201,169,97,0.2)', 'rgba(201,169,97,0.06)']}
                style={StyleSheet.absoluteFill}
              />
            )}
            <Ionicons
              name={t.icon}
              size={28}
              color={active ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[step.typeLabel, active && step.typeLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Composant Adresse ────────────────────────────────────────────────────────

function StepAddress({ form, update }) {
  const [cityResults, setCityResults] = useState([]);
  const [addressResults, setAddressResults] = useState([]);
  const [searchingCity, setSearchingCity] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);

  const ignoreNextCitySearch = React.useRef(false);
  const ignoreNextAddressSearch = React.useRef(false);

  // Recherche de ville
  useEffect(() => {
    if (ignoreNextCitySearch.current) {
      ignoreNextCitySearch.current = false;
      return;
    }
    if (form.businessCity.length < 3) {
      setCityResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearchingCity(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.businessCity)}&featuretype=city&limit=5`, {headers: {'User-Agent': 'OnListApp/1.0'}});
        const data = await res.json();
        setCityResults(data);
      } catch (e) {
        console.log(e);
      } finally {
        setSearchingCity(false);
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [form.businessCity]);

  // Recherche d'adresse
  useEffect(() => {
    if (ignoreNextAddressSearch.current) {
      ignoreNextAddressSearch.current = false;
      return;
    }
    if (form.businessAddress.length < 4) {
      setAddressResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearchingAddress(true);
      try {
        const cityContext = form.businessCity ? `, ${form.businessCity}` : '';
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.businessAddress + cityContext)}&addressdetails=1&limit=5`, {headers: {'User-Agent': 'OnListApp/1.0'}});
        const data = await res.json();
        setAddressResults(data);
      } catch (e) {
        console.log(e);
      } finally {
        setSearchingAddress(false);
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [form.businessAddress, form.businessCity]);

  return (
    <View style={step.fieldGroup}>
      <View style={step.fieldRow}>
        <Ionicons name="map-outline" size={18} color={COLORS.textMuted} style={step.fieldIcon} />
        <TextInput
          style={step.fieldInput}
          value={form.businessCity}
          onChangeText={v => update('businessCity', v)}
          placeholder="Ville"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="words"
          selectionColor={COLORS.primary}
          autoFocus
        />
        {searchingCity && <ActivityIndicator size="small" color={COLORS.primary} />}
      </View>
      {cityResults.length > 0 && (
        <View style={step.suggestionsContainer}>
          {cityResults.map((item, i) => (
            <TouchableOpacity 
              key={item.place_id || i} 
              style={step.suggestionItem}
              onPress={() => {
                const name = item.name || item.display_name.split(',')[0];
                ignoreNextCitySearch.current = true;
                update('businessCity', name);
                setCityResults([]);
              }}
            >
              <Ionicons name="location" size={14} color={COLORS.textMuted} />
              <Text style={step.suggestionText} numberOfLines={1}>{item.display_name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={step.fieldDivider} />

      <View style={step.fieldRow}>
        <Ionicons name="location-outline" size={18} color={COLORS.textMuted} style={step.fieldIcon} />
        <TextInput
          style={step.fieldInput}
          value={form.businessAddress}
          onChangeText={v => update('businessAddress', v)}
          placeholder="Adresse"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="words"
          selectionColor={COLORS.primary}
        />
        {searchingAddress && <ActivityIndicator size="small" color={COLORS.primary} />}
      </View>
      {addressResults.length > 0 && (
        <View style={step.suggestionsContainer}>
          {addressResults.map((item, i) => (
            <TouchableOpacity 
              key={item.place_id || i} 
              style={step.suggestionItem}
              onPress={() => {
                const address = item.address || {};
                const road = address.road || address.pedestrian || address.street;
                const houseNumber = address.house_number || '';
                const baseName = road ? ((houseNumber ? `${houseNumber} ` : '') + road) : (item.name || item.display_name.split(',')[0]);
                
                ignoreNextAddressSearch.current = true;
                update('businessAddress', baseName);
                
                if (!form.businessCity && (address.city || address.town || address.village)) {
                   ignoreNextCitySearch.current = true;
                   update('businessCity', address.city || address.town || address.village);
                }

                setAddressResults([]);
              }}
            >
              <Ionicons name="location" size={14} color={COLORS.textMuted} />
              <Text style={step.suggestionText} numberOfLines={2}>{item.display_name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Composant Contact ────────────────────────────────────────────────────────

function StepContact({ form, update }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const phoneCodes = PHONE_CODES.filter(Boolean);

  const selected = phoneCodes.find((item) => item.code === form.phoneCode) || phoneCodes.find((item) => item.country === 'France');
  const filtered = search.trim()
    ? phoneCodes.filter((item) =>
        item.country.toLowerCase().includes(search.toLowerCase()) ||
        item.code.includes(search.replace(/\s/g, ''))
      )
    : phoneCodes;

  return (
    <View style={step.fieldGroup}>
      <View style={step.fieldRow}>
        <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} style={step.fieldIcon} />
        <TextInput
          style={step.fieldInput}
          value={form.email}
          onChangeText={v => update('email', v)}
          placeholder="Email professionnel"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          selectionColor={COLORS.primary}
          autoFocus
        />
      </View>
      <View style={step.fieldDivider} />
      <View style={[step.fieldRow, { paddingHorizontal: 0 }]}>
        <TouchableOpacity
          style={step.phoneCodeBtn}
          activeOpacity={0.82}
          onPress={() => {
            setSearch('');
            setModalVisible(true);
          }}
        >
          <Text style={step.phoneFlag}>{selected?.flag}</Text>
          <Text style={step.phoneCodeTxt}>{selected?.code}</Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={step.phoneDivider} />

        <TextInput
          style={step.fieldInput}
          value={form.phone}
          onChangeText={v => update('phone', v.replace(/[^0-9 ]/g, ''))}
          placeholder="Téléphone"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="phone-pad"
          selectionColor={COLORS.primary}
        />
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={step.modalOverlay}>
          <View style={step.modalSheet}>
            <View style={step.modalHandle} />
            <View style={step.modalHeader}>
              <Text style={step.modalTitle}>Choisir un pays</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <View style={step.modalSearchRow}>
              <Ionicons name="search" size={16} color={COLORS.textMuted} />
              <TextInput
                style={step.modalSearchInput}
                placeholder="Pays ou indicatif..."
                placeholderTextColor={COLORS.textMuted}
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => `${item.code}-${item.country}`}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 420 }}
              renderItem={({ item }) => {
                const active = item.code === form.phoneCode;
                return (
                  <TouchableOpacity
                    style={[step.modalItem, active && step.modalItemActive]}
                    onPress={() => {
                      update('phoneCode', item.code);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={step.modalFlag}>{item.flag}</Text>
                    <Text style={[step.modalItemText, active && step.modalItemTextActive]}>{item.country}</Text>
                    <Text style={step.modalCodeText}>{item.code}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Composant Mot de passe ────────────────────────────────────────────────────

function StepPassword({ form, update }) {
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const match = form.password && form.confirmPassword && form.password === form.confirmPassword;
  const noMatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  return (
    <View style={step.fieldGroup}>
      <View style={step.fieldRow}>
        <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} style={step.fieldIcon} />
        <TextInput
          style={step.fieldInput}
          value={form.password}
          onChangeText={v => update('password', v)}
          placeholder="Mot de passe (8 car. min.)"
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={!showPwd}
          selectionColor={COLORS.primary}
          autoFocus
        />
        <TouchableOpacity onPress={() => setShowPwd(v => !v)} style={step.eyeBtn}>
          <Ionicons name={showPwd ? 'eye-off' : 'eye'} size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
      <View style={step.fieldDivider} />
      <View style={step.fieldRow}>
        <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.textMuted} style={step.fieldIcon} />
        <TextInput
          style={step.fieldInput}
          value={form.confirmPassword}
          onChangeText={v => update('confirmPassword', v)}
          placeholder="Confirmer le mot de passe"
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={!showConfirm}
          selectionColor={COLORS.primary}
        />
        <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={step.eyeBtn}>
          <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
      {noMatch && (
        <Text style={step.pwdError}>Les mots de passe ne correspondent pas</Text>
      )}
      {match && (
        <Text style={step.pwdOk}>Parfait !</Text>
      )}
    </View>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function BusinessRegisterFlow({ navigation }) {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState('forward');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    businessName: '', businessType: '', businessAddress: '',
    businessCity: '', businessDescription: '', phoneCode: '+33',
  });

  const update = useCallback((key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
  }, []);

  // Progression animée
  const progressValue = useSharedValue(1 / STEPS.length);
  useEffect(() => {
    progressValue.value = withTiming((currentStep + 1) / STEPS.length, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [currentStep]);

  const progressStyle = useAnimatedStyle(() => ({
    width: progressValue.value * (width - SPACING.lg * 2 - 60),
  }));

  // ── Validation ──────────────────────────────────────────────────────────────

  const canContinue = useCallback(() => {
    const s = STEPS[currentStep];
    switch (s.id) {
      case 'businessName':        return form.businessName.trim().length >= 2;
      case 'businessType':        return !!form.businessType;
      case 'businessCity':        return !!form.businessCity.trim();
      case 'managerName':         return form.name.trim().length >= 2;
      case 'contact':             return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && form.phone.trim().length >= 8;
      case 'businessDescription': return true; // optionnel
      case 'password':
        return form.password.length >= 8 && form.password === form.confirmPassword;
      default: return true;
    }
  }, [currentStep, form]);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goNext = () => {
    if (!canContinue() && STEPS[currentStep].id !== 'businessDescription') return;
    if (currentStep < STEPS.length - 1) {
      setDirection('forward');
      setCurrentStep(s => s + 1);
    } else {
      handleSubmit();
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setDirection('backward');
      setCurrentStep(s => s - 1);
    } else {
      navigation.goBack();
    }
  };

  // ── Soumission ──────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email || undefined,
        phone: `${form.phoneCode}${form.phone.replace(/\s/g, '')}`,
        password: form.password,
        type: 'business',
        businessName: form.businessName,
        businessType: form.businessType,
        businessAddress: form.businessAddress,
        businessCity: form.businessCity,
        businessDescription: form.businessDescription,
      });
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Rendu du contenu ────────────────────────────────────────────────────────

  const renderContent = () => {
    const s = STEPS[currentStep];
    switch (s.type) {
      case 'text':
        return (
          <StepText
            config={s}
            value={form[s.field]}
            onChange={v => update(s.field, v)}
          />
        );
      case 'multiline':
        return (
          <StepText
            config={s}
            value={form[s.field]}
            onChange={v => update(s.field, v)}
            multiline
          />
        );
      case 'businessType':
        return (
          <StepBusinessType
            value={form.businessType}
            onChange={v => update('businessType', v)}
          />
        );
      case 'businessAddress':
        return <StepAddress form={form} update={update} />;
      case 'contact':
        return <StepContact form={form} update={update} />;
      case 'password':
        return <StepPassword form={form} update={update} />;
      default:
        return null;
    }
  };

  const active = canContinue() || STEPS[currentStep].id === 'businessDescription';
  const isLast = currentStep === STEPS.length - 1;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
        <Text style={styles.stepNum}>{currentStep + 1}/{STEPS.length}</Text>
      </View>

      {/* Contenu animé */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View
          key={currentStep}
          entering={
            direction === 'forward'
              ? SlideInRight.duration(300)
              : SlideInLeft.duration(300)
          }
          exiting={
            direction === 'forward'
              ? SlideOutLeft.duration(300)
              : SlideOutRight.duration(300)
          }
          style={{ flex: 1 }}
        >
          <KeyboardDismissScrollView
            contentContainerStyle={styles.stepWrapper}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.contextLabel}>{STEPS[currentStep].context}</Text>
            <Text style={styles.question}>{STEPS[currentStep].question}</Text>
            {renderContent()}
          </KeyboardDismissScrollView>
        </Animated.View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            onPress={goNext}
            activeOpacity={active ? 0.85 : 1}
            style={styles.continueOuter}
          >
            {active ? (
              <LinearGradient
                colors={COLORS.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.continueBtn}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.bg} size="small" />
                ) : (
                  <>
                    <Text style={styles.continueTxt}>
                      {isLast ? 'Envoyer ma demande' : 'Continuer'}
                    </Text>
                    <Ionicons
                      name={isLast ? 'checkmark' : 'arrow-forward'}
                      size={20}
                      color={COLORS.bg}
                    />
                  </>
                )}
              </LinearGradient>
            ) : (
              <View style={styles.continueBtnDisabled}>
                <Text style={styles.continueTxtDisabled}>Continuer</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.loginRow}
          >
            <Text style={styles.loginQ}>Déjà un compte ? </Text>
            <Text style={styles.loginLink}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles principaux ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: COLORS.bgCard2,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  stepNum: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
    minWidth: 30,
    textAlign: 'right',
  },
  stepWrapper: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: 40,
  },
  contextLabel: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.3,
    marginBottom: SPACING.sm,
  },
  question: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xxl + 2,
    fontFamily: FONTS.bold,
    lineHeight: 42,
    marginBottom: SPACING.xl,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  continueOuter: {},
  continueBtn: {
    height: 58,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  continueBtnDisabled: {
    height: 58,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  continueTxt: {
    color: COLORS.bg,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.semiBold,
  },
  continueTxtDisabled: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.medium,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  loginQ: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
  },
  loginLink: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semiBold,
    textDecorationLine: 'underline',
  },
});

// ─── Styles des steps ──────────────────────────────────────────────────────────

const step = StyleSheet.create({
  // ── Texte ──
  inputWrap: { marginTop: SPACING.sm },
  bigInput: {
    fontSize: FONTS.sizes.xl + 2,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    paddingBottom: SPACING.sm,
    letterSpacing: 0.2,
  },
  multilineInput: {
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.regular,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    textAlignVertical: 'top',
    height: 120,
  },
  inputLine: {
    height: 1.5,
    backgroundColor: COLORS.border,
    marginTop: 4,
  },

  // ── Type d'établissement ──
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  typeCard: {
    width: (width - SPACING.lg * 2 - SPACING.md) / 2,
    height: 96,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  typeCardActive: { borderColor: COLORS.primary },
  typeLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    textAlign: 'center',
  },
  typeLabelActive: { color: COLORS.primary },

  // ── Groupes de champs ──
  fieldGroup: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  fieldIcon: { width: 20 },
  fieldInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.regular,
    paddingVertical: SPACING.md,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: SPACING.md + 20 + SPACING.sm,
  },
  suggestionsContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  suggestionText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    flex: 1,
  },
  eyeBtn: { padding: SPACING.xs },
  pwdError: {
    color: COLORS.error,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    padding: SPACING.sm,
  },
  pwdOk: {
    color: COLORS.success,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.medium,
    padding: SPACING.sm,
  },
  phoneCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.sm,
  },
  phoneFlag: { fontSize: 18 },
  phoneCodeTxt: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.medium },
  phoneDivider: { width: 1, height: 20, backgroundColor: COLORS.border, marginRight: SPACING.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.lg, paddingTop: 12, paddingBottom: 28 },
  modalHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center', marginBottom: SPACING.md },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  modalTitle: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  modalSearchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  modalSearchInput: { flex: 1, color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.regular, paddingVertical: 14 },
  modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(201,169,97,0.08)' },
  modalItemActive: { backgroundColor: 'rgba(201,169,97,0.06)' },
  modalFlag: { fontSize: 20, marginRight: 10 },
  modalItemText: { flex: 1, color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: FONTS.regular },
  modalItemTextActive: { color: COLORS.primary, fontFamily: FONTS.semiBold },
  modalCodeText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium },
});
