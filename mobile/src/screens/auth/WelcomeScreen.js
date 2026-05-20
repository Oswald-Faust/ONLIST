import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions, FlatList,
  TouchableOpacity, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import GradientButton from '../../components/GradientButton';

const { width, height } = Dimensions.get('window');
const AUTO_SCROLL_INTERVAL = 6000;

// ─── Vidéos ───────────────────────────────────────────────────────────────────
// OPTION A — Vidéos locales (recommandé en production, bundle l'app) :
//   1. Télécharge 3 vidéos .mp4 sur mixkit.co ou pexels.com/videos
//      (cherche : "nightclub party", "influencer event", "luxury club")
//   2. Place-les dans mobile/assets/videos/
//   3. Remplace les { uri: '...' } par : require('../../../assets/videos/slide1.mp4')
//
// OPTION B — Vidéos distantes (CDN, no bundle) :
//   Remplace les uri par l'URL directe de ta vidéo hébergée

// Vidéos Mixkit — licence gratuite — streaming direct (aucun bundle)
// Pour utiliser des vidéos locales : remplace { uri } par require('../../../assets/videos/slideX.mp4')
const SLIDES = [
  {
    id: '1',
    tag: 'Deviens Influenceur !',
    title: 'Participe aux meilleurs évènements d\'influence !',
    video: { uri: 'https://assets.mixkit.co/videos/14116/14116-720.mp4' },
  },
  {
    id: '2',
    tag: 'Développe ton Business',
    title: 'Connecte-toi aux meilleurs influenceurs et modèles',
    video: { uri: 'https://assets.mixkit.co/videos/49141/49141-720.mp4' },
  },
  {
    id: '3',
    tag: 'Vis l\'expérience',
    title: 'Touche une audience\nlocale plus large',
    video: { uri: 'https://assets.mixkit.co/videos/4344/4344-1080.mp4' },
  },
];

// ─── Composant slide vidéo ─────────────────────────────────────────────────────
function VideoSlide({ item, isActive }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.playAsync().catch(() => null);
    } else {
      videoRef.current.pauseAsync().catch(() => null);
    }
  }, [isActive]);

  return (
    <View style={styles.slide}>
      <Video
        ref={videoRef}
        source={item.video}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay={isActive}
        isLooping
        isMuted
        useNativeControls={false}
      />
      {/* Dégradé : transparent en haut, sombre en bas pour lisibilité du texte */}
      <LinearGradient
        colors={[
          'rgba(10,10,15,0.05)',
          'rgba(10,10,15,0.35)',
          'rgba(10,10,15,0.80)',
          'rgba(10,10,15,0.97)',
        ]}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

// ─── Écran principal ───────────────────────────────────────────────────────────
export default function WelcomeScreen({ navigation }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef(null);
  const timerRef = useRef(null);

  const startTimer = useCallback((fromIndex) => {
    clearInterval(timerRef.current);
    let current = fromIndex;
    timerRef.current = setInterval(() => {
      current = (current + 1) % SLIDES.length;
      flatRef.current?.scrollToIndex({ index: current, animated: true });
      setActiveIndex(current);
    }, AUTO_SCROLL_INTERVAL);
  }, []);

  useEffect(() => {
    startTimer(0);
    return () => clearInterval(timerRef.current);
  }, [startTimer]);

  const onScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== activeIndex) {
      setActiveIndex(idx);
      startTimer(idx);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Slides vidéo */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(i) => i.id}
        renderItem={({ item, index }) => (
          <VideoSlide item={item} isActive={index === activeIndex} />
        )}
        // Précharge seulement la slide précédente/suivante
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
      />

      {/* Texte fixe par-dessus */}
      <View style={styles.overlay} pointerEvents="none">
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.textContainer}>
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>{SLIDES[activeIndex].tag}</Text>
            </View>
            <Text style={styles.title}>{SLIDES[activeIndex].title}</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* Pagination */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>

      {/* Boutons bas */}
      <SafeAreaView edges={['bottom']} style={styles.bottomSafe}>
        <View style={styles.bottom}>
          <GradientButton
            variant="dark"
            title="S'inscrire en tant qu'Établissement"
            onPress={() => navigation.navigate('RegisterBusiness')}
            style={styles.btnFull}
          />
          <GradientButton
            title="S'inscrire en tant que Membre"
            onPress={() => navigation.navigate('RegisterInfluencer')}
            style={styles.btnFull}
          />
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginRow}>
            <Text style={styles.loginQuestion}>Déjà un compte ?  </Text>
            <Text style={styles.loginLink}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Slides
  slide: { width, height, position: 'relative' },
  overlay: { ...StyleSheet.absoluteFillObject },

  // Texte de slide
  textContainer: {
    position: 'absolute',
    top: 70,
    left: SPACING.lg,
    right: SPACING.lg,
  },
  tagPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(201,169,97,0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.4)',
  },
  tagText: {
    color: COLORS.primaryLight,
    fontSize: FONTS.sizes.sm,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.4,
  },
  title: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xxxl,
    fontFamily: 'Poppins_700Bold',
    lineHeight: 46,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  // Pagination
  dots: {
    position: 'absolute',
    top: 100,
    right: SPACING.lg,
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 20,
  },

  // Bas de page
  bottomSafe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottom: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  btnFull: { width: '100%' },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  loginQuestion: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.base,
    fontFamily: 'Poppins_400Regular',
  },
  loginLink: {
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontFamily: 'Poppins_600SemiBold',
    textDecorationLine: 'underline',
  },
});
