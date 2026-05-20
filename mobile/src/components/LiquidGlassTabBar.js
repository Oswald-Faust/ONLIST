import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../constants/theme';

const { width } = Dimensions.get('window');

const TABS = [
  { name: 'Home',     label: 'Accueil',  icon: 'home',     iconOutline: 'home-outline' },
  { name: 'Explore',  label: 'Explorer', icon: 'compass',  iconOutline: 'compass-outline' },
  { name: 'MyEvents', label: 'Events',   icon: 'calendar', iconOutline: 'calendar-outline' },
  { name: 'Profile',  label: 'Profil',   icon: 'person',   iconOutline: 'person-outline' },
];

// ─── Onglet individuel ─────────────────────────────────────────────────────────

function TabItem({ tab, isFocused, onPress, onLongPress }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const pillOp  = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const labelOp = useRef(new Animated.Value(isFocused ? 1 : 0.82)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: isFocused ? 1.06 : 1,
        friction: 7,
        tension: 130,
        useNativeDriver: true,
      }),
      Animated.timing(pillOp, {
        toValue: isFocused ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(labelOp, {
        toValue: isFocused ? 1 : 0.82,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused]);

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>

        {/* ── Pill active (liquid glass bronze) ── */}
        <Animated.View style={[styles.activePill, { opacity: pillOp }]}>
          {/* Base bronze teinté */}
          <LinearGradient
            colors={['rgba(201,169,97,0.28)', 'rgba(201,169,97,0.10)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Reflet supérieur (dome effect) */}
          <LinearGradient
            colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.pillHighlight}
          />
          {/* Éclat latéral gauche */}
          <LinearGradient
            colors={['rgba(255,255,255,0.10)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.pillSideGlow}
          />
        </Animated.View>

        {/* ── Icône ── */}
        <Ionicons
          name={isFocused ? tab.icon : tab.iconOutline}
          size={21}
          color={isFocused ? COLORS.primaryLight : COLORS.textMuted}
        />

        {/* ── Label (apparaît quand actif) ── */}
        <Animated.Text
          style={[
            styles.tabLabel,
            {
              opacity: labelOp,
              color: isFocused ? COLORS.primaryLight : COLORS.textSecondary,
              maxHeight: 18,
            },
          ]}
          numberOfLines={1}
        >
          {tab.label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Barre principale ──────────────────────────────────────────────────────────

export default function LiquidGlassTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 8) + 8 }]}>
      {/* ── Blur de base ── */}
      <BlurView intensity={75} tint="dark" style={styles.blur}>

        {/* ── Fond chaud semi-transparent (supprime le cast bleu) ── */}
        <LinearGradient
          colors={['rgba(16,14,12,0.68)', 'rgba(11,10,9,0.82)']}
          style={StyleSheet.absoluteFill}
        />

        {/* ── Bordure supérieure (filet de lumière en bord de verre) ── */}
        <View style={styles.topEdge} />

        {/* ── Reflet interne large (highlight de surface) ── */}
        <LinearGradient
          colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0.02)', 'transparent']}
          locations={[0, 0.4, 1]}
          style={styles.surfaceHighlight}
        />

        {/* ── Shimmer bronze subtil (teinte liquid glass) ── */}
        <LinearGradient
          colors={['rgba(201,169,97,0.04)', 'transparent', 'rgba(201,169,97,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* ── Onglets ── */}
        <View style={styles.tabsRow}>
          {state.routes.map((route, index) => {
            const tab = TABS.find(t => t.name === route.name);
            if (!tab) return null;
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({ type: 'tabLongPress', target: route.key });
            };

            return (
              <TabItem
                key={route.key}
                tab={tab}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 18,
    right: 18,
    borderRadius: 30,
    overflow: 'hidden',
    // Glow bronze ambré
    shadowColor: '#C9A961',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 18,
  },

  blur: {
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    // Bord brillant façon verre (blanc + bronze)
    borderColor: 'rgba(255,255,255,0.13)',
  },

  // Filet de lumière en haut (bord de verre)
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 1,
  },

  // Reflet de surface (haute luminance en haut)
  surfaceHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 26,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },

  // Row des onglets
  tabsRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },

  // Onglet conteneur
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },

  // Contenu interne de l'onglet
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 22,
    gap: 4,
    minWidth: 72,
    position: 'relative',
    overflow: 'hidden',
  },

  // Pill active — liquid glass
  activePill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.32)',
  },

  // Dome highlight (haut de la pill)
  pillHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },

  // Éclat latéral gauche
  pillSideGlow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '40%',
  },

  tabLabel: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.2,
  },
});
