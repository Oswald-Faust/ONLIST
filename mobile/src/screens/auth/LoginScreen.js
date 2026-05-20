import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, StatusBar, Alert, Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
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

export default function LoginScreen({ navigation }) {
  const { login, loginWithGoogle, loginWithApple } = useAuth();
  const [tab, setTab] = useState('email');
  const [email, setEmail] = useState('');
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
      const creds = tab === 'email' ? { email, password } : { phone, password };
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
                  <Ionicons name="reload-outline" size={18} color="#202124" />
                ) : (
                  <Image source={{ uri: GOOGLE_LOGO_URI }} style={styles.googleLogo} />
                )}
              </View>

              <Text style={styles.oauthText}>Continuer avec Google</Text>

              <View style={styles.oauthArrow}>
                <Ionicons name="arrow-forward" size={16} color="#5f6368" />
              </View>
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
            ? <InputField placeholder="00 000 0000" value={phone} onChangeText={setPhone} keyboardType="phone-pad" icon="call-outline" />
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
    borderRadius: 16,
    marginBottom: SPACING.sm,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
  oauthBtnDisabled: {
    opacity: 0.65,
  },
  oauthInner: {
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  oauthIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(60,64,67,0.08)',
  },
  googleLogo: {
    width: 18,
    height: 18,
  },
  oauthText: {
    flex: 1,
    color: '#1F1F1F',
    fontSize: FONTS.sizes.base,
    fontFamily: 'Poppins_600SemiBold',
  },
  oauthArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: 'rgba(60,64,67,0.08)',
  },
  appleBtn: { width: '100%', height: 50, marginBottom: SPACING.sm },

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
