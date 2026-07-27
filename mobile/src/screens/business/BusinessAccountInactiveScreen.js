import { Alert, Text } from '../../i18n/LocalizedReactNative';
import React from 'react';
import {
  ScrollView, StatusBar, StyleSheet, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

// Écran affiché sur iOS quand un compte établissement n'a pas d'accès actif.
// Il remplace le paywall (BusinessSubscriptionScreen) qui, lui, affiche des
// tarifs et ouvre Stripe Checkout — interdit par la guideline App Store 3.1.1.
// Aucun prix, aucun lien de paiement, aucune mention d'un site où souscrire :
// uniquement un contact support, ce qui reste conforme.
export default function BusinessAccountInactiveScreen() {
  const { user, logout } = useAuth();

  const handleContact = () => {
    Alert.alert(
      'Contacter ONLIST',
      'Notre équipe vous répond à hello@onlist.club. Précisez le nom de votre établissement pour un traitement plus rapide.',
      [{ text: 'OK' }]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Se déconnecter',
      'Voulez-vous vraiment vous déconnecter de ce compte établissement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#0A0A0F', '#0E0D0B']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.iconWrap}>
            <Ionicons name="time-outline" size={34} color={COLORS.primaryLight} />
          </View>

          <Text style={s.eyebrow}>COMPTE ÉTABLISSEMENT</Text>
          <Text style={s.title}>Votre accès n’est pas encore actif</Text>

          <Text style={s.body}>
            {user?.businessName
              ? `Le compte « ${user.businessName} » est bien enregistré, mais son accès n’est pas activé pour le moment.`
              : 'Votre compte est bien enregistré, mais son accès n’est pas activé pour le moment.'}
          </Text>
          <Text style={s.body}>
            Notre équipe reste disponible pour finaliser la mise en place et répondre à vos questions.
          </Text>

          <TouchableOpacity style={s.primaryBtn} onPress={handleContact} activeOpacity={0.9}>
            <Ionicons name="mail-outline" size={18} color="#0A0A0F" />
            <Text style={s.primaryBtnText}>Contacter l’équipe</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.ghostBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={s.ghostBtnText}>Se déconnecter</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,169,97,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.35)',
    marginBottom: SPACING.md,
  },
  eyebrow: {
    color: COLORS.primaryLight,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.bold,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  title: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xxl,
    fontFamily: FONTS.bold,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  body: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: 15,
    marginTop: SPACING.lg,
  },
  primaryBtnText: {
    color: '#0A0A0F',
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.bold,
  },
  ghostBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  ghostBtnText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
    textDecorationLine: 'underline',
  },
});
