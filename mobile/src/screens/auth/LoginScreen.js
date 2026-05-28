import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  StatusBar, Alert, Platform,
  TextInput, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { PHONE_CODES } from '../../constants/phoneCodes';
import GradientButton from '../../components/GradientButton';
import InputField from '../../components/InputField';
import KeyboardDismissScrollView from '../../components/KeyboardDismissScrollView';
import { useAuth } from '../../context/AuthContext';

function Divider() {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>ou</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

function PhoneField({ phoneCode, phone, onChangePhoneCode, onChangePhone }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const phoneCodes = PHONE_CODES.filter(Boolean);

  const selected = phoneCodes.find((item) => item.code === phoneCode) || phoneCodes.find((item) => item.country === 'France');
  const filtered = search.trim()
    ? phoneCodes.filter((item) =>
        item.country.toLowerCase().includes(search.toLowerCase()) ||
        item.code.includes(search.replace(/\s/g, ''))
      )
    : phoneCodes;

  return (
    <View style={styles.phoneFieldWrap}>
      <View style={styles.phoneField}>
        <TouchableOpacity
          style={styles.phoneCodeBtn}
          activeOpacity={0.82}
          onPress={() => {
            setSearch('');
            setModalVisible(true);
          }}
        >
          <Text style={styles.phoneFlag}>{selected?.flag}</Text>
          <Text style={styles.phoneCodeTxt}>{selected?.code}</Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={styles.phoneDivider} />

        <TextInput
          style={styles.phoneInput}
          value={phone}
          onChangeText={(value) => onChangePhone(value.replace(/[^0-9 ]/g, ''))}
          placeholder="6 12 34 56 78"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="phone-pad"
        />
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un pays</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchRow}>
              <Ionicons name="search" size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.modalSearchInput}
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
                const active = item.code === phoneCode;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, active && styles.modalItemActive]}
                    onPress={() => {
                      onChangePhoneCode(item.code);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.modalFlag}>{item.flag}</Text>
                    <Text style={[styles.modalItemText, active && styles.modalItemTextActive]}>{item.country}</Text>
                    <Text style={styles.modalCodeText}>{item.code}</Text>
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

export default function LoginScreen({ navigation }) {
  const { login, loginWithApple } = useAuth();
  const [tab, setTab] = useState('email');
  const [email, setEmail] = useState('');
  const [phoneCode, setPhoneCode] = useState('+33');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const handleAppleLogin = async () => {
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      await loginWithApple(credential.identityToken, credential.fullName, credential.email);
    } catch (err) {
      if (err.code !== 'ERR_CANCELED') {
        Alert.alert('Erreur Apple', err.message);
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!password) return Alert.alert('Erreur', 'Veuillez entrer votre mot de passe');
    if (tab === 'email' && !email) return Alert.alert('Erreur', 'Veuillez entrer votre email');
    if (tab === 'mobile' && !phone) return Alert.alert('Erreur', 'Veuillez entrer votre numéro');
    setLoading(true);
    try {
      const creds = tab === 'email' ? { email, password } : { phone: `${phoneCode}${phone.replace(/\s/g, '')}`, password };
      await login(creds);
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.bgPattern}>
        <LinearGradient colors={['#0A0A0F', '#131210', '#0A0A0F']} style={StyleSheet.absoluteFill} />
        <View style={styles.circle1} />
        <View style={styles.circle2} />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardDismissScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>

          {/* Logo principal */}
          <Image
            // eslint-disable-next-line import/no-unresolved
            source={require('../../../assets/onlist/ONLIST Logo_Main Logo B.png')}
            style={styles.mainLogo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Connectez-vous{'\n'}à votre compte</Text>

          {/* Bouton Apple (iOS uniquement) */}
          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
              cornerRadius={14}
              style={styles.appleBtn}
              onPress={handleAppleLogin}
            />
          )}

          {Platform.OS === 'ios' && <Divider />}

          {/* Onglets email / téléphone */}
          <View style={styles.tabRow}>
            {['mobile', 'email'].map(t => (
              <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                <LinearGradient
                  colors={tab === t ? COLORS.gradient : ['transparent', 'transparent']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.tabGradient}>
                  <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                    {t === 'mobile' ? 'Téléphone' : 'Email'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'mobile'
            ? <PhoneField phoneCode={phoneCode} phone={phone} onChangePhoneCode={setPhoneCode} onChangePhone={setPhone} />
            : <InputField placeholder="email@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" icon="mail-outline" />}

          <InputField placeholder="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry icon="lock-closed-outline" />

          <TouchableOpacity style={styles.forgotRow} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <GradientButton title="Se connecter →" onPress={handleLogin} loading={loading} style={styles.btn} />

          <View style={styles.signupRow}>
            <Text style={styles.signupQuestion}>Pas encore de compte ?  </Text>
            <TouchableOpacity onPress={() => navigation.navigate('RegisterInfluencer')}>
              <Text style={styles.signupLink}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </KeyboardDismissScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  bgPattern: { ...StyleSheet.absoluteFillObject },
  circle1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(201,169,97,0.05)', top: -80, right: -80 },
  circle2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(201,169,97,0.03)', bottom: 100, left: -60 },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  backBtn: { marginBottom: SPACING.sm, width: 40 },

  mainLogo: {
    width: '78%',
    height: 96,
    alignSelf: 'center',
    marginBottom: SPACING.xl,
  },

  title: { color: COLORS.white, fontSize: FONTS.sizes.xxl, fontFamily: 'Poppins_700Bold', marginBottom: SPACING.xl, lineHeight: 36 },

  appleBtn: { width: '100%', height: 50, marginBottom: SPACING.sm },

  phoneFieldWrap: { marginBottom: SPACING.md },
  phoneField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    minHeight: 52,
  },
  phoneCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  phoneFlag: { fontSize: 20 },
  phoneCodeTxt: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.base,
    fontFamily: 'Poppins_500Medium',
  },
  phoneDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },
  phoneInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.base,
    fontFamily: 'Poppins_400Regular',
    paddingVertical: 14,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingTop: 12,
    paddingBottom: 28,
  },
  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderLight,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontFamily: 'Poppins_700Bold',
  },
  modalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  modalSearchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.base,
    fontFamily: 'Poppins_400Regular',
    paddingVertical: 14,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201,169,97,0.08)',
  },
  modalItemActive: { backgroundColor: 'rgba(201,169,97,0.06)' },
  modalFlag: { fontSize: 20, marginRight: 10 },
  modalItemText: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.base,
    fontFamily: 'Poppins_400Regular',
  },
  modalItemTextActive: {
    color: COLORS.primaryLight,
    fontFamily: 'Poppins_600SemiBold',
  },
  modalCodeText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontFamily: 'Poppins_500Medium',
  },

  divider: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginVertical: SPACING.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_400Regular' },

  tabRow: { flexDirection: 'row', backgroundColor: COLORS.bgInput, borderRadius: RADIUS.full, padding: 4, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  tab: { flex: 1, borderRadius: RADIUS.full, overflow: 'hidden' },
  tabActive: {},
  tabGradient: { paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.full },
  tabText: { color: COLORS.textMuted, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_500Medium' },
  tabTextActive: { color: COLORS.white, fontFamily: 'Poppins_600SemiBold' },

  forgotRow: { alignItems: 'flex-end', marginTop: -SPACING.sm, marginBottom: SPACING.lg },
  forgotText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_400Regular' },
  btn: { marginBottom: SPACING.xl },
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signupQuestion: { color: COLORS.textSecondary, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_400Regular' },
  signupLink: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_600SemiBold', textDecorationLine: 'underline' },
});
