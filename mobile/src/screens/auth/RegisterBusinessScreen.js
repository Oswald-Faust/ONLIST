import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import GradientButton from '../../components/GradientButton';
import InputField from '../../components/InputField';
import { useAuth } from '../../context/AuthContext';

const BUSINESS_TYPES = [
  { id: 'restaurant', label: 'Restaurant', icon: 'restaurant' },
  { id: 'bar', label: 'Bar', icon: 'wine' },
  { id: 'club', label: 'Club', icon: 'musical-notes' },
  { id: 'spa', label: 'Spa', icon: 'flower' },
  { id: 'sport', label: 'Sport', icon: 'fitness' },
  { id: 'wellness', label: 'Bien-être', icon: 'heart' },
  { id: 'premium', label: 'Lieu Premium', icon: 'diamond' },
  { id: 'other', label: 'Autre', icon: 'ellipsis-horizontal' },
];

export default function RegisterBusinessScreen({ navigation }) {
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    businessName: '', businessType: '', businessAddress: '', businessCity: '', businessDescription: '',
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleRegister = async () => {
    if (!form.name) return Alert.alert('Erreur', 'Nom du responsable requis');
    if (!form.email && !form.phone) return Alert.alert('Erreur', 'Email ou téléphone requis');
    if (!form.password) return Alert.alert('Erreur', 'Mot de passe requis');
    if (form.password !== form.confirmPassword) return Alert.alert('Erreur', 'Mots de passe non identiques');
    if (!form.businessName) return Alert.alert('Erreur', 'Nom de l\'établissement requis');
    if (!form.businessType) return Alert.alert('Erreur', 'Type d\'établissement requis');

    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#0A0A0F', '#131210', '#0A0A0F']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.typeBadge}>
            <Ionicons name="business" size={16} color={COLORS.gold} />
            <Text style={styles.typeText}>Inscription Établissement</Text>
          </View>

          <Text style={styles.title}>Inscrivez votre{'\n'}établissement</Text>
          <Text style={styles.subtitle}>Votre compte sera vérifié avant activation</Text>

          <Text style={styles.sectionTitle}>Informations du responsable</Text>
          <InputField label="Nom complet" placeholder="Jean Dupont" value={form.name} onChangeText={v => update('name', v)} icon="person-outline" autoCapitalize="words" />
          <InputField label="Email professionnel" placeholder="contact@bar.com" value={form.email} onChangeText={v => update('email', v)} keyboardType="email-address" icon="mail-outline" />
          <InputField label="Téléphone" placeholder="+33 6 00 00 00 00" value={form.phone} onChangeText={v => update('phone', v)} keyboardType="phone-pad" icon="call-outline" />
          <InputField label="Mot de passe" placeholder="••••••••" value={form.password} onChangeText={v => update('password', v)} secureTextEntry icon="lock-closed-outline" />
          <InputField label="Confirmer" placeholder="••••••••" value={form.confirmPassword} onChangeText={v => update('confirmPassword', v)} secureTextEntry icon="shield-outline" />

          <Text style={styles.sectionTitle}>Informations établissement</Text>
          <InputField label="Nom de l'établissement" placeholder="Le Bar Élite" value={form.businessName} onChangeText={v => update('businessName', v)} icon="storefront-outline" autoCapitalize="words" />

          <Text style={styles.label}>Type d'établissement</Text>
          <View style={styles.typeGrid}>
            {BUSINESS_TYPES.map(t => (
              <TouchableOpacity
                key={t.id}
                onPress={() => update('businessType', t.id)}
                style={[styles.typeCard, form.businessType === t.id && styles.typeCardActive]}
              >
                {form.businessType === t.id ? (
                  <LinearGradient colors={COLORS.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.typeCardGradient}>
                    <Ionicons name={t.icon} size={20} color={COLORS.white} />
                    <Text style={[styles.typeCardText, styles.typeCardTextActive]}>{t.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.typeCardInner}>
                    <Ionicons name={t.icon} size={20} color={COLORS.textSecondary} />
                    <Text style={styles.typeCardText}>{t.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <InputField label="Adresse" placeholder="12 rue de la Paix" value={form.businessAddress} onChangeText={v => update('businessAddress', v)} icon="location-outline" />
          <InputField label="Ville" placeholder="Paris" value={form.businessCity} onChangeText={v => update('businessCity', v)} icon="map-outline" />
          <InputField label="Description" placeholder="Décrivez votre établissement..." value={form.businessDescription} onChangeText={v => update('businessDescription', v)} multiline numberOfLines={3} />

          <GradientButton title="Envoyer ma demande" onPress={handleRegister} loading={loading} style={styles.btn} />

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginRow}>
            <Text style={styles.loginQ}>Déjà un compte ?  </Text>
            <Text style={styles.loginLink}>Se connecter</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  backBtn: { marginBottom: SPACING.lg, width: 40 },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(201,169,97,0.12)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.25)',
  },
  typeText: { color: COLORS.gold, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_500Medium' },
  title: { color: COLORS.white, fontSize: FONTS.sizes.xxl, fontFamily: 'Poppins_700Bold', marginBottom: SPACING.xs, lineHeight: 36 },
  subtitle: { color: COLORS.textSecondary, fontSize: FONTS.sizes.base, marginBottom: SPACING.xl, fontFamily: 'Poppins_400Regular' },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  label: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_500Medium', marginBottom: SPACING.sm },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  typeCard: {
    width: '47%',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeCardActive: { borderColor: COLORS.primaryLight },
  typeCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  typeCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.bgCard,
  },
  typeCardText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_500Medium' },
  typeCardTextActive: { color: COLORS.white },
  btn: { marginTop: SPACING.sm, marginBottom: SPACING.lg },
  loginRow: { flexDirection: 'row', justifyContent: 'center', paddingVertical: SPACING.sm },
  loginQ: { color: COLORS.textSecondary, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_400Regular' },
  loginLink: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_600SemiBold', textDecorationLine: 'underline' },
});
