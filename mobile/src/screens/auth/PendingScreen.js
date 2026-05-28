import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, Animated, TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';

const POLL_INTERVAL_MS = 15000; // vérification toutes les 15 secondes

// ─── Animation de pulsation pour le nœud actif ────────────────────────────────
function PulsingDot() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.4, duration: 900, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.5, duration: 900, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={tl.nodeWrap}>
      <Animated.View style={[tl.nodePulse, { transform: [{ scale }], opacity }]} />
      <View style={tl.nodeActive} />
    </View>
  );
}

// ─── Écran principal ───────────────────────────────────────────────────────────
export default function PendingScreen() {
  const { user, logout, updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  const firstName = user?.name?.split(' ')[0] ?? 'toi';

  // Polling : vérifie le statut toutes les 15s et met à jour le contexte si changement
  useEffect(() => {
    const check = async () => {
      try {
        const data = await authAPI.me();
        if (data?.user?.status && data.user.status !== user?.status) {
          await updateUser(data.user);
        }
      } catch {
        // Ignore les erreurs réseau silencieusement
      }
    };

    check(); // vérification immédiate au montage
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Fond avec halo doré discret en haut */}
      <View style={[styles.halo, { top: -(insets.top + 60) }]} />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.inner, { paddingTop: SPACING.md }]}>

          {/* ── Badge statut ── */}
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>En attente de validation</Text>
          </View>

          {/* ── Titre ── */}
          <Text style={styles.title}>
            Ta demande est{'\n'}bien reçue,{' '}
            <Text style={styles.titleAccent}>{firstName}</Text>
            {' '}✦
          </Text>

          <Text style={styles.subtitle}>
            Notre équipe examine ton profil. Tu recevras une notification dès que ton compte est activé.
          </Text>

          {/* ── Timeline ── */}
          <View style={tl.wrap}>

            {/* Étape 1 — terminée */}
            <View style={tl.row}>
              <View style={tl.left}>
                <View style={[tl.node, tl.nodeDone]}>
                  <Ionicons name="checkmark" size={14} color={COLORS.bg} />
                </View>
                <View style={[tl.line, tl.lineDone]} />
              </View>
              <View style={tl.textWrap}>
                <Text style={tl.stepLabel}>Inscription complète</Text>
                <Text style={tl.stepSub}>Compte créé avec succès</Text>
              </View>
            </View>

            {/* Étape 2 — en cours */}
            <View style={tl.row}>
              <View style={tl.left}>
                <PulsingDot />
                <View style={[tl.line, tl.linePending]} />
              </View>
              <View style={tl.textWrap}>
                <Text style={[tl.stepLabel, tl.stepLabelActive]}>Vérification du profil</Text>
                <Text style={tl.stepSub}>24 — 48h en général</Text>
              </View>
            </View>

            {/* Étape 3 — en attente */}
            <View style={[tl.row, { marginBottom: 0 }]}>
              <View style={tl.left}>
                <View style={tl.nodeLocked}>
                  <Ionicons name="lock-closed" size={12} color={COLORS.textMuted} />
                </View>
              </View>
              <View style={tl.textWrap}>
                <Text style={tl.stepLabelMuted}>Accès à l'application</Text>
                <Text style={tl.stepSub}>Bientôt disponible</Text>
              </View>
            </View>
          </View>

          {/* ── Card info ── */}
          <View style={styles.infoCard}>
            <LinearGradient
              colors={['rgba(201,169,97,0.10)', 'rgba(201,169,97,0.03)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.infoGrad}
            >
              <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
              <Text style={styles.infoText}>
                Un email de confirmation te sera envoyé à{' '}
                <Text style={styles.infoEmail}>{user?.email}</Text>
              </Text>
            </LinearGradient>
          </View>

        </View>

        {/* ── Bouton déconnexion ── */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.75}>
            <Ionicons name="log-out-outline" size={18} color="#F87171" />
            <Text style={styles.logoutTxt}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles principaux ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  halo: {
    position: 'absolute',
    alignSelf: 'center',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(201,169,97,0.07)',
  },

  inner: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(201,169,97,0.1)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.2)',
    marginBottom: SPACING.xl,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semiBold,
  },

  // Titre
  title: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xxl + 2,
    fontFamily: FONTS.bold,
    lineHeight: 42,
    marginBottom: SPACING.md,
  },
  titleAccent: {
    color: COLORS.primary,
  },

  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.regular,
    lineHeight: 24,
    marginBottom: SPACING.xxl,
  },

  // Card info
  infoCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.xl,
  },
  infoGrad: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  infoText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    lineHeight: 20,
  },
  infoEmail: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
  },

  // Footer
  footer: {
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.25)',
  },
  logoutTxt: {
    color: '#F87171',
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.medium,
  },
});

// ─── Styles timeline ───────────────────────────────────────────────────────────
const tl = StyleSheet.create({
  wrap: { gap: 0 },

  row: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: 0,
  },

  left: {
    alignItems: 'center',
    width: 28,
  },

  // Nœud terminé
  node: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDone: {
    backgroundColor: COLORS.success,
  },

  // Nœud actif avec pulsation
  nodeWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodePulse: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(201,169,97,0.25)',
  },
  nodeActive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
  },

  // Nœud verrouillé
  nodeLocked: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Lignes de connexion
  line: {
    width: 2,
    flex: 1,
    minHeight: 28,
    borderRadius: 1,
    marginVertical: 4,
  },
  lineDone: { backgroundColor: COLORS.success },
  linePending: {
    backgroundColor: 'rgba(201,169,97,0.2)',
  },

  // Texte
  textWrap: {
    flex: 1,
    paddingBottom: SPACING.lg,
  },
  stepLabel: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.medium,
    marginBottom: 3,
  },
  stepLabelActive: {
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
  },
  stepLabelMuted: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.medium,
    marginBottom: 3,
  },
  stepSub: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
  },
});
