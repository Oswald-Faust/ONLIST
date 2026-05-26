import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, StatusBar, Alert, Dimensions, Platform,
  TextInput, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { PHONE_CODES } from '../../constants/phoneCodes';
import GradientButton from '../../components/GradientButton';
import InputField from '../../components/InputField';
import { useAuth } from '../../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

// ⚠️ Remplace par tes vrais Client IDs Google Cloud Console
const GOOGLE_CLIENT_ID_EXPO = 'YOUR_EXPO_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_IOS   = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_LOGO_URI = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.233 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.002 13 24 13c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.143 35.091 26.715 36 24 36c-5.212 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.793 2.244-2.231 4.166-4.085 5.571.001-.001 6.19 5.238 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
</svg>
`)}`;

const { height } = Dimensions.get('window');

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
  const { login, loginWithGoogle, loginWithApple } = useAuth();
  const [tab, setTab] = useState('email');
  const [email, setEmail] = useState('');
  const [phoneCode, setPhoneCode] = useState('+33');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const [request, response, promptGoogleAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID_EXPO,
    iosClientId: GOOGLE_CLIENT_ID_IOS,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleToken(response.authentication?.accessToken);
    } else if (response?.type === 'error') {
      setGoogleLoading(false);
      Alert.alert('Erreur', 'Connexion Google annulée');
    }
  }, [response]);

  const handleGoogleToken = async (accessToken) => {
    if (!accessToken) { setGoogleLoading(false); return; }
    try {
      await loginWithGoogle(accessToken);
    } catch (err) {
      Alert.alert('Erreur Google', err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    await promptGoogleAsync();
  };

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
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoIcon}>⬡</Text>
            </View>
            <Text style={styles.logoText}>ONLIST</Text>
          </View>

          <Text style={styles.title}>Connectez-vous{'\n'}à votre compte</Text>

          {/* === Boutons OAuth === */}
          <TouchableOpacity
            style={[styles.oauthBtn, (googleLoading || !request) && styles.oauthBtnDisabled]}
            onPress={handleGoogleLogin}
            disabled={googleLoading || !request}
            activeOpacity={0.88}
          >
            <View style={styles.oauthInner}>
              <View style={styles.oauthIconWrap}>
                {googleLoading ? (
                  <Ionicons name="reload-outline" size={18} color={COLORS.white} />
                ) : (
                  <Image source={{ uri: GOOGLE_LOGO_URI }} style={styles.googleLogo} />
                )}
              </View>

              <Text style={styles.oauthText}>Continuer avec Google</Text>
              <View style={styles.oauthSpacer} />
            </View>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
              cornerRadius={14}
              style={styles.appleBtn}
              onPress={handleAppleLogin}
            />
          )}

          <Divider />

          {/* === Onglets email / téléphone === */}
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

          <TouchableOpacity style={styles.forgotRow}>
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <GradientButton title="Se connecter →" onPress={handleLogin} loading={loading} style={styles.btn} />

          <View style={styles.signupRow}>
            <Text style={styles.signupQuestion}>Pas encore de compte ?  </Text>
            <TouchableOpacity onPress={() => navigation.navigate('RegisterInfluencer')}>
              <Text style={styles.signupLink}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  backBtn: { marginBottom: SPACING.lg, width: 40 },
  logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: SPACING.xl, gap: SPACING.sm },
  logoBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.bgCard2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  logoIcon: { fontSize: 20, color: COLORS.gold, fontFamily: 'Poppins_400Regular' },
  logoText: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_700Bold', letterSpacing: 3 },
  title: { color: COLORS.white, fontSize: FONTS.sizes.xxl, fontFamily: 'Poppins_700Bold', marginBottom: SPACING.xl, lineHeight: 36 },

  // OAuth buttons
  oauthBtn: {
    height: 50,
    borderRadius: 14,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  oauthBtnDisabled: {
    opacity: 0.65,
  },
  oauthInner: {
    height: '100%',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  oauthIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLogo: {
    width: 18,
    height: 18,
  },
  oauthText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: FONTS.sizes.base,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },
  oauthSpacer: { width: 32 },
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
  phoneFlag: {
    fontSize: 20,
  },
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
  modalItemActive: {
    backgroundColor: 'rgba(201,169,97,0.06)',
  },
  modalFlag: {
    fontSize: 20,
    marginRight: 10,
  },
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

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginVertical: SPACING.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_400Regular' },

  // Tabs
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
