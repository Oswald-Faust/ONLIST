import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  SlideInRight, SlideOutLeft,
} from 'react-native-reanimated';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';

// ─── Slides "Comment ça marche" ────────────────────────────────────────────────

const SLIDES = [
  {
    id: '1',
    num: '01',
    icon: 'calendar-outline',
    iconSolid: 'calendar',
    title: 'Créez votre\névénement',
    description:
      'Décrivez votre établissement, définissez votre cible et publiez vos événements en quelques minutes depuis votre dashboard.',
    tag: 'Prise en main immédiate',
    tagIcon: 'flash-outline',
  },
  {
    id: '2',
    num: '02',
    icon: 'people-outline',
    iconSolid: 'people',
    title: 'Choisissez vos\ninfluenceurs',
    description:
      'Parcourez des profils vérifiés et sélectionnez les influenceurs qui correspondent à votre image de marque et à votre audience cible.',
    tag: 'Profils vérifiés & engagés',
    tagIcon: 'shield-checkmark-outline',
  },
  {
    id: '3',
    num: '03',
    icon: 'trending-up-outline',
    iconSolid: 'trending-up',
    title: 'Mesurez votre\nimpact',
    description:
      'Suivez les performances de vos événements, la portée organique et l\'engagement de votre audience en temps réel.',
    tag: 'Analytics détaillés',
    tagIcon: 'stats-chart-outline',
  },
];

// ─── Composant principal ───────────────────────────────────────────────────────

export default function BusinessHowItWorks({ navigation }) {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);

  const goTo = (idx) => {
    setCurrent(idx);
  };

  const goNext = () => {
    if (current < SLIDES.length - 1) {
      goTo(current + 1);
    } else {
      navigation.navigate('RegisterBusiness');
    }
  };

  const goBack = () => {
    if (current > 0) {
      goTo(current - 1);
    } else {
      navigation.goBack();
    }
  };

  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ── Fond décoratif ── */}
      <LinearGradient
        colors={['rgba(201,169,97,0.06)', 'transparent']}
        style={styles.bgGlow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.topOverlay}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </SafeAreaView>

      <SafeAreaView edges={['top']} style={styles.topSafe}>
        {/* ── Contenu animé ── */}
        <Animated.View
          key={current}
          entering={SlideInRight.duration(300)}
          exiting={SlideOutLeft.duration(300)}
          style={styles.content}
        >
          {/* Numéro */}
          <Text style={styles.slideNum}>{slide.num}</Text>

          {/* Icône centrale */}
          <View style={styles.iconWrap}>
            <LinearGradient
              colors={['rgba(201,169,97,0.2)', 'rgba(201,169,97,0.05)']}
              style={styles.iconGrad}
            >
              <Ionicons name={slide.iconSolid} size={48} color={COLORS.primary} />
            </LinearGradient>
          </View>

          {/* Titre */}
          <Text style={styles.title}>{slide.title}</Text>

          {/* Description */}
          <Text style={styles.description}>{slide.description}</Text>

          {/* Tag */}
          <View style={styles.tag}>
            <Ionicons name={slide.tagIcon} size={14} color={COLORS.primary} />
            <Text style={styles.tagText}>{slide.tag}</Text>
          </View>
        </Animated.View>
      </SafeAreaView>

      {/* ── Footer ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.dot, i === current && styles.dotActive]}
              onPress={() => goTo(i)}
            />
          ))}
        </View>

        {/* Bouton */}
        <TouchableOpacity onPress={goNext} activeOpacity={0.85} style={styles.btnOuter}>
          <LinearGradient
            colors={COLORS.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btn}
          >
            <Text style={styles.btnTxt}>
              {isLast ? 'Créer mon compte' : 'Suivant'}
            </Text>
            <Ionicons
              name={isLast ? 'arrow-forward-circle' : 'arrow-forward'}
              size={20}
              color={COLORS.bg}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topSafe: { flex: 1 },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: SPACING.lg,
  },

  bgGlow: {
    ...StyleSheet.absoluteFillObject,
    height: '52%',
  },

  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl + 4,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,17,16,0.84)',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.xs,
  },
  slideNum: {
    color: COLORS.border,
    fontSize: 80,
    fontFamily: FONTS.extraBold,
    lineHeight: 80,
    letterSpacing: -2,
    marginBottom: 0,
  },
  iconWrap: {
    marginBottom: SPACING.xl,
    alignSelf: 'flex-start',
  },
  iconGrad: {
    width: 90,
    height: 90,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xxl + 2,
    fontFamily: FONTS.bold,
    lineHeight: 42,
    marginBottom: SPACING.lg,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.regular,
    lineHeight: 26,
    marginBottom: SPACING.xl,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(201,169,97,0.08)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
  },

  footer: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.bgCard2,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  btnOuter: {},
  btn: {
    height: 58,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  btnTxt: {
    color: COLORS.bg,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.semiBold,
  },
});
