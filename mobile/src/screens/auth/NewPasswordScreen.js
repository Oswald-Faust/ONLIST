import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import GradientButton from '../../components/GradientButton';
import InputField from '../../components/InputField';
import KeyboardDismissScrollView from '../../components/KeyboardDismissScrollView';
import { authAPI } from '../../services/api';

export default function NewPasswordScreen({ navigation, route }) {
  const { resetToken } = route.params;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!password) return Alert.alert('Erreur', 'Veuillez entrer un mot de passe');
    if (password.length < 6) return Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
    if (password !== confirm) return Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');

    setLoading(true);
    try {
      await authAPI.resetPassword({ resetToken, newPassword: password });
      Alert.alert(
        'Succès',
        'Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.',
        [
          {
            text: 'Se connecter',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
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

          <Text style={styles.title}>Nouveau{'\n'}mot de passe</Text>
          <Text style={styles.subtitle}>
            Choisissez un mot de passe sécurisé d'au moins 6 caractères.
          </Text>

          <View style={styles.iconRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed" size={28} color={COLORS.gold} />
            </View>
          </View>

          <InputField
            placeholder="Nouveau mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            icon="lock-closed-outline"
          />

          <InputField
            placeholder="Confirmer le mot de passe"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            icon="shield-checkmark-outline"
          />

          {/* Indicateur de force du mot de passe */}
          {password.length > 0 && (
            <View style={styles.strengthRow}>
              {[1, 2, 3].map((level) => {
                const strength = password.length >= 12 ? 3 : password.length >= 8 ? 2 : 1;
                const color = strength >= level
                  ? (strength === 3 ? '#4CAF50' : strength === 2 ? '#FF9800' : '#F44336')
                  : COLORS.border;
                return <View key={level} style={[styles.strengthBar, { backgroundColor: color }]} />;
              })}
              <Text style={styles.strengthLabel}>
                {password.length >= 12 ? 'Fort' : password.length >= 8 ? 'Moyen' : 'Faible'}
              </Text>
            </View>
          )}

          <GradientButton
            title="Réinitialiser le mot de passe →"
            onPress={handleReset}
            loading={loading}
            style={styles.btn}
          />
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
  subtitle: { color: COLORS.textSecondary, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_400Regular', lineHeight: 22, marginBottom: SPACING.lg },
  iconRow: { alignItems: 'center', marginBottom: SPACING.xl },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(201,169,97,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.lg,
    marginTop: -SPACING.sm,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontFamily: 'Poppins_500Medium',
    marginLeft: 4,
    minWidth: 36,
  },
  btn: { marginTop: SPACING.md },
});
