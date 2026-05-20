import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Modal, ActivityIndicator, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

const { height: SCREEN_H } = Dimensions.get('window');

// ─── Villes populaires ─────────────────────────────────────────────────────────

const POPULAR = [
  { city: 'Paris', country: 'France', flag: '🇫🇷' },
  { city: 'Lyon', country: 'France', flag: '🇫🇷' },
  { city: 'Marseille', country: 'France', flag: '🇫🇷' },
  { city: 'Nice', country: 'France', flag: '🇫🇷' },
  { city: 'Bordeaux', country: 'France', flag: '🇫🇷' },
  { city: 'Cannes', country: 'France', flag: '🇫🇷' },
  { city: 'Monaco', country: 'Monaco', flag: '🇲🇨' },
  { city: 'Abidjan', country: "Côte d'Ivoire", flag: '🇨🇮' },
  { city: 'Dakar', country: 'Sénégal', flag: '🇸🇳' },
  { city: 'Casablanca', country: 'Maroc', flag: '🇲🇦' },
  { city: 'Marrakech', country: 'Maroc', flag: '🇲🇦' },
  { city: 'Tunis', country: 'Tunisie', flag: '🇹🇳' },
  { city: 'Bruxelles', country: 'Belgique', flag: '🇧🇪' },
  { city: 'Genève', country: 'Suisse', flag: '🇨🇭' },
  { city: 'Montréal', country: 'Canada', flag: '🇨🇦' },
  { city: 'Douala', country: 'Cameroun', flag: '🇨🇲' },
  { city: 'Libreville', country: 'Gabon', flag: '🇬🇦' },
  { city: 'Lomé', country: 'Togo', flag: '🇹🇬' },
  { city: 'Toulouse', country: 'France', flag: '🇫🇷' },
  { city: 'Nantes', country: 'France', flag: '🇫🇷' },
  { city: 'Strasbourg', country: 'France', flag: '🇫🇷' },
  { city: 'Montpellier', country: 'France', flag: '🇫🇷' },
  { city: 'Lille', country: 'France', flag: '🇫🇷' },
  { city: 'Alger', country: 'Algérie', flag: '🇩🇿' },
];

// ─── Item ville ────────────────────────────────────────────────────────────────

function CityItem({ item, selected, onSelect }) {
  const active = selected === item.city;
  return (
    <TouchableOpacity
      style={[styles.cityRow, active && styles.cityRowActive]}
      onPress={() => onSelect(item.city)}
      activeOpacity={0.7}
    >
      {active && (
        <LinearGradient
          colors={['rgba(201,169,97,0.15)', 'rgba(201,169,97,0.04)']}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Text style={styles.cityFlag}>{item.flag}</Text>
      <View style={styles.cityInfo}>
        <Text style={[styles.cityName, active && styles.cityNameActive]}>{item.city}</Text>
        <Text style={styles.cityCountry}>{item.country}</Text>
      </View>
      <View style={[styles.radio, active && styles.radioActive]}>
        {active && <View style={styles.radioDot} />}
      </View>
    </TouchableOpacity>
  );
}

// ─── Bottom Sheet ──────────────────────────────────────────────────────────────

export default function CityPickerSheet({ visible, onClose }) {
  const { updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() =>
    query.trim()
      ? POPULAR.filter(c =>
          c.city.toLowerCase().includes(query.toLowerCase()) ||
          c.country.toLowerCase().includes(query.toLowerCase())
        )
      : POPULAR,
    [query]
  );

  const handleConfirm = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await updateUser({ selectedCity: selected });
      setQuery('');
      setSelected('');
      onClose();
    } catch {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setQuery('');
    setSelected('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Fond sombre cliquable pour fermer */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        {/* Sheet */}
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {/* Poignée */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.contextLabel}>Personnalise ton expérience ✦</Text>
              <Text style={styles.title}>Dans quelle ville{'\n'}tu veux des events ?</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            On t'affichera les événements à proximité. Tu pourras changer ça plus tard.
          </Text>

          {/* Barre de recherche */}
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher une ville..."
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="words"
              selectionColor={COLORS.primary}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Label liste */}
          {!query && (
            <Text style={styles.listLabel}>Villes populaires</Text>
          )}

          {/* Liste — hauteur contrainte */}
          <FlatList
            data={filtered}
            keyExtractor={item => item.city}
            renderItem={({ item }) => (
              <CityItem item={item} selected={selected} onSelect={setSelected} />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            style={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>Aucune ville pour "{query}"</Text>
              </View>
            }
          />

          {/* Bouton confirmer */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleConfirm}
              activeOpacity={selected ? 0.85 : 1}
              disabled={!selected}
            >
              {selected ? (
                <LinearGradient
                  colors={COLORS.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmBtn}
                >
                  {saving ? (
                    <ActivityIndicator color={COLORS.bg} size="small" />
                  ) : (
                    <>
                      <Ionicons name="location" size={17} color={COLORS.bg} />
                      <Text style={styles.confirmTxt}>Voir les events à {selected}</Text>
                    </>
                  )}
                </LinearGradient>
              ) : (
                <View style={styles.confirmBtnDisabled}>
                  <Text style={styles.confirmTxtDisabled}>Choisir une ville</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Overlay + backdrop
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },

  // Sheet
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
    maxHeight: SCREEN_H * 0.88,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },

  // Header
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.bgCard2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
  contextLabel: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.semiBold,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  title: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.bold,
    lineHeight: 30,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    lineHeight: 20,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },

  // Recherche
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.bgCard2,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.regular,
  },

  listLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xs,
  },

  list: { maxHeight: SCREEN_H * 0.35 },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },

  // City row
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: 3,
    gap: SPACING.sm,
    overflow: 'hidden',
  },
  cityRowActive: { borderWidth: 1, borderColor: COLORS.border },
  cityFlag: { fontSize: 22 },
  cityInfo: { flex: 1 },
  cityName: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.medium,
    marginBottom: 1,
  },
  cityNameActive: { color: COLORS.white, fontFamily: FONTS.semiBold },
  cityCountry: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(201,169,97,0.1)' },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.primary },

  emptyWrap: { paddingVertical: SPACING.lg, alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: FONTS.sizes.base, fontFamily: FONTS.regular },

  // Footer
  footer: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  confirmBtn: {
    height: 54,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  confirmBtnDisabled: {
    height: 54,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmTxt: { color: COLORS.bg, fontSize: FONTS.sizes.base, fontFamily: FONTS.semiBold },
  confirmTxtDisabled: { color: COLORS.textMuted, fontSize: FONTS.sizes.base, fontFamily: FONTS.medium },
});
