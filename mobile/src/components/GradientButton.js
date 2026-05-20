import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

export default function GradientButton({ title, onPress, loading, style, textStyle, variant = 'primary', disabled }) {
  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={loading || disabled}
        style={[styles.outlineBtn, style]}
        activeOpacity={0.8}
      >
        {loading
          ? <ActivityIndicator color={COLORS.white} size="small" />
          : <Text style={[styles.outlineText, textStyle]}>{title}</Text>
        }
      </TouchableOpacity>
    );
  }

  if (variant === 'dark') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={loading || disabled}
        style={[styles.darkBtn, style]}
        activeOpacity={0.8}
      >
        {loading
          ? <ActivityIndicator color={COLORS.white} size="small" />
          : <Text style={[styles.darkText, textStyle]}>{title}</Text>
        }
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} disabled={loading || disabled} activeOpacity={0.85} style={style}>
      <LinearGradient
        colors={COLORS.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading
          ? <ActivityIndicator color={COLORS.white} size="small" />
          : <Text style={[styles.text, textStyle]}>{title}</Text>
        }
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: {
    height: 56,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  text: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.3,
  },
  outlineBtn: {
    height: 56,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  outlineText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontFamily: 'Poppins_500Medium',
  },
  darkBtn: {
    height: 56,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    backgroundColor: 'rgba(18,17,15,0.9)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  darkText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontFamily: 'Poppins_500Medium',
  },
});
