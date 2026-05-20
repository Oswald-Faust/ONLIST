import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

export default function InputField({
  label, value, onChangeText, placeholder, secureTextEntry,
  keyboardType, autoCapitalize, icon, multiline, numberOfLines, style,
}) {
  const [focused, setFocused] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrap, focused && styles.inputFocused]}>
        {icon && <Ionicons name={icon} size={18} color={focused ? COLORS.primaryLight : COLORS.textMuted} style={styles.icon} />}
        <TextInput
          style={[styles.input, multiline && styles.multiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={secureTextEntry && !showPwd}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'none'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={styles.eyeBtn}>
            <Ionicons name={showPwd ? 'eye-off' : 'eye'} size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginBottom: 6,
    fontFamily: 'Poppins_500Medium',
    letterSpacing: 0.3,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(201,169,97,0.06)',
  },
  icon: { marginRight: 10 },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.base,
    fontFamily: 'Poppins_400Regular',
    paddingVertical: 14,
  },
  multiline: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  eyeBtn: { padding: 4 },
});
