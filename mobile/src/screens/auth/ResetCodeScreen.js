import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  StatusBar, TextInput, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import GradientButton from '../../components/GradientButton';
import KeyboardDismissScrollView from '../../components/KeyboardDismissScrollView';
import { authAPI } from '../../services/api';

const CODE_LENGTH = 5;

export default function ResetCodeScreen({ navigation, route }) {
  const { identifier, maskedEmail } = route.params;
  const [code, setCode] = useState(['', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef([]);

  // Compte à rebours pour le renvoi
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const focusNext = (index) => {
    if (index < CODE_LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const focusPrev = (index) => {
    if (index > 0) inputs.current[index - 1]?.focus();
  };

  const handleChange = (text, index) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = cleaned;
    setCode(newCode);
    if (cleaned) focusNext(index);
  };

  const handleKeyPress = ({ nativeEvent }, index) => {
    if (nativeEvent.key === 'Backspace' && !code[index]) {
      focusPrev(index);
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < CODE_LENGTH) {
      return Alert.alert('Erreur', 'Veuillez entrer les 5 chiffres du code');
    }

    setLoading(true);
    try {
      const res = await authAPI.verifyResetCode({ ...identifier, code: fullCode });
      navigation.navigate('NewPassword', { resetToken: res.resetToken });
    } catch (err) {
      Alert.alert('Code invalide', err.message);
      setCode(['', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await authAPI.forgotPassword(identifier);
      setCountdown(60);
      setCode(['', '', '', '', '']);
      inputs.current[0]?.focus();
      Alert.alert('Code renvoyé', 'Un nouveau code a été envoyé à votre email');
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#0A0A0F', '#131210', '#0A0A0F']} style={StyleSheet.absoluteFill} />
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardDismissScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <Image
            source={require('../../../assets/onlist/ONLIST Logo_Favicon A.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Vérifiez{'\n'}votre email</Text>
          <Text style={styles.subtitle}>
            Nous avons envoyé un code à 5 chiffres à{' '}
            <Text style={styles.emailHighlight}>{maskedEmail}</Text>
          </Text>

          {/* Cases du code */}
          <View style={styles.codeRow}>
            {code.map((digit, index) => (
              <View
                key={index}
                style={[
                  styles.codeBox,
                  digit ? styles.codeBoxFilled : null,
                ]}
              >
                <TextInput
                  ref={(ref) => { inputs.current[index] = ref; }}
                  style={styles.codeInput}
                  value={digit}
                  onChangeText={(text) => handleChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={2}
                  textAlign="center"
                  selectionColor={COLORS.gold}
                  caretHidden
                />
              </View>
            ))}
          </View>

          <GradientButton
            title="Vérifier le code →"
            onPress={handleVerify}
            loading={loading}
            style={styles.btn}
          />

          {/* Renvoi du code */}
          <View style={styles.resendRow}>
            {countdown > 0 ? (
              <Text style={styles.resendWait}>
                Renvoyer le code dans{' '}
                <Text style={styles.resendCountdown}>{countdown}s</Text>
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={resendLoading}>
                <Text style={styles.resendLink}>
                  {resendLoading ? 'Envoi...' : 'Renvoyer le code'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardDismissScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  circle1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(201,169,97,0.05)', top: -80, right: -80 },
  circle2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(201,169,97,0.03)', bottom: 100, left: -60 },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  backBtn: { marginBottom: SPACING.sm, width: 40 },
  headerLogo: { width: 52, height: 52, alignSelf: 'center', marginBottom: SPACING.xl },
  title: { color: COLORS.white, fontSize: FONTS.sizes.xxl, fontFamily: 'Poppins_700Bold', marginBottom: SPACING.md, lineHeight: 36 },
  subtitle: { color: COLORS.textSecondary, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_400Regular', lineHeight: 22, marginBottom: SPACING.xl },
  emailHighlight: { color: COLORS.gold, fontFamily: 'Poppins_600SemiBold' },

  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: SPACING.xl,
  },
  codeBox: {
    flex: 1,
    height: 64,
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFilled: {
    borderColor: 'rgba(201,169,97,0.6)',
    backgroundColor: 'rgba(201,169,97,0.06)',
  },
  codeInput: {
    width: '100%',
    height: '100%',
    color: COLORS.white,
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  btn: { marginBottom: SPACING.lg },
  resendRow: { alignItems: 'center' },
  resendWait: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_400Regular' },
  resendCountdown: { color: COLORS.textSecondary, fontFamily: 'Poppins_600SemiBold' },
  resendLink: { color: COLORS.gold, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_600SemiBold' },
});
