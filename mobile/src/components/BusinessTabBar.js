import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../constants/theme';

const TABS = [
  { name: 'Dashboard',  label: 'Accueil', icon: 'home',      iconOutline: 'home-outline' },
  { name: 'Lieux',      label: 'Lieux',   icon: 'business',  iconOutline: 'business-outline' },
  { name: 'Events',     label: 'Events',  icon: 'calendar',  iconOutline: 'calendar-outline' },
  { name: 'BizProfile', label: 'Profil',  icon: 'person',    iconOutline: 'person-outline' },
];

function TabItem({ tab, isFocused, onPress, onLongPress }) {
  const scale  = useRef(new Animated.Value(1)).current;
  const pillOp = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: isFocused ? 1.06 : 1, friction: 7, tension: 130, useNativeDriver: true }),
      Animated.timing(pillOp, { toValue: isFocused ? 1 : 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [isFocused]);

  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.75} style={styles.tabItem}>
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        <Animated.View style={[styles.activePill, { opacity: pillOp }]}>
          <LinearGradient
            colors={['rgba(201,169,97,0.28)', 'rgba(201,169,97,0.10)']}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.02)']}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={styles.pillHighlight}
          />
        </Animated.View>

        <Ionicons
          name={isFocused ? tab.icon : tab.iconOutline}
          size={21}
          color={isFocused ? COLORS.primaryLight : COLORS.textMuted}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: isFocused ? COLORS.primaryLight : COLORS.textMuted },
          ]}
          numberOfLines={1}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function BusinessTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 8) + 8 }]}>
      <BlurView intensity={75} tint="dark" style={styles.blur}>
        <LinearGradient
          colors={['rgba(16,14,12,0.68)', 'rgba(11,10,9,0.82)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.topEdge} />
        <LinearGradient
          colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0.02)', 'transparent']}
          locations={[0, 0.4, 1]}
          style={styles.surfaceHighlight}
        />
        <LinearGradient
          colors={['rgba(201,169,97,0.04)', 'transparent', 'rgba(201,169,97,0.02)']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.tabsRow}>
          {state.routes.map((route, index) => {
            const tab = TABS.find(t => t.name === route.name);
            if (!tab) return null;
            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
            };
            const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });
            return (
              <TabItem key={route.key} tab={tab} isFocused={isFocused} onPress={onPress} onLongPress={onLongPress} />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', left: 18, right: 18, borderRadius: 30, overflow: 'hidden',
    shadowColor: '#C9A961', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 20, elevation: 18,
  },
  blur: { borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  topEdge: { position: 'absolute', top: 0, left: 18, right: 18, height: 1, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 1 },
  surfaceHighlight: { position: 'absolute', top: 0, left: 0, right: 0, height: 26, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  tabsRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 6 },
  tabItem: { flex: 1, alignItems: 'center' },
  tabInner: {
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 22, gap: 4, minWidth: 72, position: 'relative', overflow: 'hidden',
  },
  activePill: {
    ...StyleSheet.absoluteFillObject, borderRadius: 22, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(201,169,97,0.32)',
  },
  pillHighlight: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%', borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  tabLabel: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold, letterSpacing: 0.2 },
});
