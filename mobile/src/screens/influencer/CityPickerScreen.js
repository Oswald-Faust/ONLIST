import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Modal, ActivityIndicator, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { metaAPI } from '../../services/api';

const { height: SCREEN_H } = Dimensions.get('window');
const REGION_FILTERS = ['Tous', 'Europe', 'Afrique', 'Monde'];

// ─── Villes populaires ─────────────────────────────────────────────────────────

const POPULAR = [
  { city: 'Paris', country: 'France', flag: '🇫🇷', region: 'Paris' },
  { city: 'Cannes', country: 'France', flag: '🇫🇷', region: 'Europe' },
  { city: 'Nice', country: 'France', flag: '🇫🇷', region: 'Europe' },
  { city: 'Saint-Tropez', country: 'France', flag: '🇫🇷', region: 'Europe' },
  { city: 'Monaco', country: 'Monaco', flag: '🇲🇨', region: 'Europe' },
  { city: 'Marbella', country: 'Espagne', flag: '🇪🇸', region: 'Europe' },
  { city: 'Ibiza', country: 'Espagne', flag: '🇪🇸', region: 'Europe' },
  { city: 'Barcelone', country: 'Espagne', flag: '🇪🇸', region: 'Europe' },
  { city: 'Madrid', country: 'Espagne', flag: '🇪🇸', region: 'Europe' },
  { city: 'Londres', country: 'Royaume-Uni', flag: '🇬🇧', region: 'Europe' },
  { city: 'Abidjan', country: "Côte d'Ivoire", flag: '🇨🇮', region: 'Afrique' },
  { city: 'Kinshasa', country: 'République démocratique du Congo', flag: '🇨🇩', region: 'Afrique' },
  { city: 'Dakar', country: 'Sénégal', flag: '🇸🇳', region: 'Afrique' },
  { city: 'Lagos', country: 'Nigeria', flag: '🇳🇬', region: 'Afrique' },
  { city: 'Nairobi', country: 'Kenya', flag: '🇰🇪', region: 'Afrique' },
  { city: 'Casablanca', country: 'Maroc', flag: '🇲🇦', region: 'Afrique' },
  { city: 'Marrakech', country: 'Maroc', flag: '🇲🇦', region: 'Afrique' },
  { city: 'Tanger', country: 'Maroc', flag: '🇲🇦', region: 'Afrique' },
  { city: 'Accra', country: 'Ghana', flag: '🇬🇭', region: 'Afrique' },
  { city: 'Bruxelles', country: 'Belgique', flag: '🇧🇪', region: 'Europe' },
  { city: 'Genève', country: 'Suisse', flag: '🇨🇭', region: 'Europe' },
  { city: 'Amsterdam', country: 'Pays-Bas', flag: '🇳🇱', region: 'Europe' },
  { city: 'Milan', country: 'Italie', flag: '🇮🇹', region: 'Europe' },
  { city: 'Rome', country: 'Italie', flag: '🇮🇹', region: 'Europe' },
  { city: 'Mykonos', country: 'Grèce', flag: '🇬🇷', region: 'Europe' },
  { city: 'Douala', country: 'Cameroun', flag: '🇨🇲', region: 'Afrique' },
  { city: 'Montréal', country: 'Canada', flag: '🇨🇦', region: 'Monde' },
  { city: 'Tunis', country: 'Tunisie', flag: '🇹🇳', region: 'Afrique' },
  { city: 'Maurice', country: 'Île Maurice', flag: '🇲🇺', region: 'Afrique' },
  { city: 'Miami', country: 'États-Unis', flag: '🇺🇸', region: 'Monde' },
  { city: 'New York', country: 'États-Unis', flag: '🇺🇸', region: 'Monde' },
  { city: 'Los Angeles', country: 'États-Unis', flag: '🇺🇸', region: 'Monde' },
  { city: 'Sao Paulo', country: 'Brésil', flag: '🇧🇷', region: 'Monde' },
  { city: 'Tokyo', country: 'Japon', flag: '🇯🇵', region: 'Monde' },
  { city: 'Singapour', country: 'Singapour', flag: '🇸🇬', region: 'Monde' },
  { city: 'Dubai', country: 'Émirats arabes unis', flag: '🇦🇪', region: 'Monde' },
];

const SECTION_META = {
  Paris: { title: 'Paris', accent: COLORS.primary, subtitle: 'Priorité créateurs et événements phares' },
  Europe: { title: 'Europe', accent: 'rgba(123, 182, 255, 0.95)', subtitle: 'Villes européennes par pays' },
  Afrique: { title: 'Afrique', accent: '#10D9A0', subtitle: 'Villes africaines par pays' },
  Monde: { title: 'Monde', accent: 'rgba(255,255,255,0.78)', subtitle: 'Autres villes internationales' },
};

// ─── Item ville ────────────────────────────────────────────────────────────────

function CityItem({ item, selected, onSelect }) {
  const active = selected === item.city;
  const disabled = !item.hasEvent;
  return (
    <TouchableOpacity
      style={[styles.cityRow, active && styles.cityRowActive, disabled && styles.cityRowDisabled]}
      onPress={() => {
        if (!disabled) onSelect(item.city);
      }}
      activeOpacity={disabled ? 1 : 0.7}
      disabled={disabled}
    >
      {active && (
        <LinearGradient
          colors={['rgba(201,169,97,0.15)', 'rgba(201,169,97,0.04)']}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Text style={styles.cityFlag}>{item.flag || '📍'}</Text>
      <View style={styles.cityInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.cityName, active && styles.cityNameActive, disabled && styles.cityNameDisabled]}>{item.city}</Text>
          <View style={item.hasEvent ? styles.eventBadge : styles.eventBadgeDisabled}>
            <Text style={item.hasEvent ? styles.eventBadgeTxt : styles.eventBadgeTxtDisabled}>
              {item.hasEvent ? 'events' : 'Bientôt disponible'}
            </Text>
          </View>
        </View>
        {item.country ? <Text style={styles.cityCountry}>{item.country}</Text> : null}
      </View>
      <View style={[styles.radio, active && styles.radioActive, disabled && styles.radioDisabled]}>
        {active && <View style={styles.radioDot} />}
      </View>
    </TouchableOpacity>
  );
}

// ─── Bottom Sheet ──────────────────────────────────────────────────────────────

export default function CityPickerSheet({
  visible,
  onClose,
  selectedCity: selectedCityProp,
  onSelectCity,
  onResetCity,
}) {
  const { user, updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);
  const [eventCities, setEventCities] = useState([]);
  const [regionFilter, setRegionFilter] = useState('Tous');
  const [collapsedSections, setCollapsedSections] = useState({
    Paris: false,
    Europe: false,
    Afrique: false,
    Monde: false,
  });

  // Charger les villes qui ont des événements actifs
  useEffect(() => {
    if (visible) {
      setSelected((selectedCityProp ?? user?.selectedCity) || '');
      setRegionFilter('Tous');
      setCollapsedSections({
        Paris: false,
        Europe: false,
        Afrique: false,
        Monde: false,
      });
      metaAPI.eventCities()
        .then(data => {
          if (data?.cities?.length) {
            setEventCities(data.cities);
          }
        })
        .catch(() => {});
    }
  }, [visible, selectedCityProp, user?.selectedCity]);

  // Construire la liste combinée : villes avec events en premier, puis POPULAR
  const allCities = useMemo(() => {
    const eventSet = new Set(eventCities.map(c => c.toLowerCase()));
    // Villes avec events qui existent dans POPULAR
    const withEvents = POPULAR.filter(c => eventSet.has(c.city.toLowerCase()));
    // Villes avec events qui ne sont pas dans POPULAR
    const onlyInEvents = eventCities
      .filter(c => !POPULAR.some(p => p.city.toLowerCase() === c.toLowerCase()))
      .map(c => ({ city: c, country: '', flag: '📍', hasEvent: true, region: 'Monde' }));
    // Reste de POPULAR
    const others = POPULAR.filter(c => !eventSet.has(c.city.toLowerCase()));
    return [
      ...withEvents.map(c => ({ ...c, hasEvent: true })),
      ...onlyInEvents,
      ...others.map(c => ({ ...c, hasEvent: !!c.hasEvent })),
    ];
  }, [eventCities]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return allCities.filter(c => {
      const matchesQuery = !normalizedQuery
        || c.city.toLowerCase().includes(normalizedQuery)
        || c.country.toLowerCase().includes(normalizedQuery);
      const matchesRegion = regionFilter === 'Tous'
        || c.region === regionFilter
        || (regionFilter === 'Europe' && c.region === 'Paris');
      return matchesQuery && matchesRegion;
    });
  }, [query, allCities, regionFilter]);

  const listData = useMemo(() => {
    const sections = [
      { key: 'Paris', items: filtered.filter(c => c.region === 'Paris') },
      { key: 'Europe', items: filtered.filter(c => c.region === 'Europe') },
      { key: 'Afrique', items: filtered.filter(c => c.region === 'Afrique') },
      { key: 'Monde', items: filtered.filter(c => c.region === 'Monde') },
    ];

    return sections.flatMap(section => {
      if (!section.items.length) return [];
      const isCollapsed = collapsedSections[section.key];
      return [
        {
          type: 'section',
          key: `section-${section.key}`,
          section: section.key,
          count: section.items.length,
          collapsed: isCollapsed,
        },
        ...(!isCollapsed || query.trim()
          ? section.items.map(item => ({ type: 'city', key: `city-${item.city}`, item }))
          : []),
      ];
    });
  }, [collapsedSections, filtered, query]);

  const handleConfirm = async () => {
    if (!selected || saving) return;

    if (onSelectCity) {
      onSelectCity(selected);
      setQuery('');
      setSelected('');
      onClose();
      return;
    }

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
    setRegionFilter('Tous');
    setSelected((selectedCityProp ?? user?.selectedCity) || '');
    onClose();
  };

  const handleResetCity = async () => {
    if (onResetCity) {
      onResetCity();
      setQuery('');
      setSelected('');
      onClose();
      return;
    }

    if (saving) return;
    setSaving(true);
    try {
      await updateUser({ selectedCity: '' });
      setQuery('');
      setSelected('');
      onClose();
    } catch {
      setSaving(false);
    }
  };

  const toggleSection = (sectionKey) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
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

          <FlatList
            horizontal
            data={REGION_FILTERS}
            keyExtractor={item => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            style={styles.filterList}
            renderItem={({ item }) => {
              const active = item === regionFilter;
              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setRegionFilter(item)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipTxt, active && styles.filterChipTxtActive]}>{item}</Text>
                </TouchableOpacity>
              );
            }}
          />

          {/* Label liste */}
          {!query && (
            <Text style={styles.listLabel}>
              {eventCities.length > 0 ? `${eventCities.length} ville${eventCities.length > 1 ? 's' : ''} avec events` : 'Sélection par zone'}
            </Text>
          )}

          {/* Liste — hauteur contrainte */}
          <FlatList
            data={listData}
            keyExtractor={item => item.key}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              if (item.type === 'section') {
                const meta = SECTION_META[item.section];
                return (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => toggleSection(item.section)}
                    style={[styles.sectionHeaderRow, item.section === 'Afrique' && styles.sectionHeaderAfrica]}
                  >
                    <View style={[styles.sectionAccent, { backgroundColor: meta.accent }]} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.sectionTitleRow}>
                        <Text style={styles.sectionTitle}>{meta.title}</Text>
                        <View style={styles.sectionCountPill}>
                          <Text style={styles.sectionCountText}>{item.count}</Text>
                        </View>
                      </View>
                      <Text style={[styles.sectionSubtitle, item.section === 'Afrique' && styles.sectionSubtitleAfrica]}>
                        {meta.subtitle}
                      </Text>
                    </View>
                    <Ionicons
                      name={item.collapsed && !query.trim() ? 'chevron-forward' : 'chevron-down'}
                      size={18}
                      color={item.section === 'Afrique' ? '#10D9A0' : COLORS.textMuted}
                    />
                  </TouchableOpacity>
                );
              }

              return <CityItem item={item.item} selected={selected} onSelect={setSelected} />;
            }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            style={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>
                  {query ? `Aucune ville pour "${query}"` : 'Aucune ville pour ce filtre'}
                </Text>
              </View>
            }
          />

          {/* Bouton confirmer */}
          <View style={styles.footer}>
            {!!(selectedCityProp ?? user?.selectedCity) && (
              <TouchableOpacity onPress={handleResetCity} activeOpacity={0.8} style={styles.resetBtn}>
                <Text style={styles.resetBtnTxt}>Voir toutes les villes</Text>
              </TouchableOpacity>
            )}
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
    zIndex: 0,
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
    zIndex: 2,
    elevation: 8,
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
  filterList: { maxHeight: 42 },
  filterRow: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  filterChip: {
    height: 34,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCard2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: 'rgba(201,169,97,0.14)',
    borderColor: 'rgba(201,169,97,0.4)',
  },
  filterChipTxt: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
  },
  filterChipTxtActive: {
    color: COLORS.white,
    fontFamily: FONTS.semiBold,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    marginBottom: 4,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  sectionHeaderAfrica: {
    backgroundColor: 'rgba(16,217,160,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16,217,160,0.14)',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  sectionAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: RADIUS.full,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semiBold,
    marginBottom: 2,
  },
  sectionSubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: FONTS.regular,
  },
  sectionCountPill: {
    minWidth: 24,
    height: 20,
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sectionCountText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontFamily: FONTS.semiBold,
  },
  sectionSubtitleAfrica: {
    color: 'rgba(16,217,160,0.85)',
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
  cityRowDisabled: { opacity: 0.52 },
  cityFlag: { fontSize: 22 },
  cityInfo: { flex: 1 },
  cityName: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.medium,
    marginBottom: 1,
  },
  cityNameActive: { color: COLORS.white, fontFamily: FONTS.semiBold },
  cityNameDisabled: { color: COLORS.textMuted },
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
  radioDisabled: { borderColor: 'rgba(255,255,255,0.08)' },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.primary },

  emptyWrap: { paddingVertical: SPACING.lg, alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: FONTS.sizes.base, fontFamily: FONTS.regular },

  // Badge "events"
  eventBadge: {
    backgroundColor: 'rgba(16,217,160,0.12)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(16,217,160,0.25)',
  },
  eventBadgeTxt: {
    color: '#10D9A0',
    fontSize: 9,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.3,
  },
  eventBadgeDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  eventBadgeTxtDisabled: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.2,
  },

  // Footer
  footer: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  resetBtn: {
    height: 46,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    zIndex: 3,
  },
  resetBtnTxt: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semiBold,
  },
  confirmBtn: {
    height: 54,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    zIndex: 3,
  },
  confirmBtnDisabled: {
    height: 54,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 3,
  },
  confirmTxt: { color: COLORS.bg, fontSize: FONTS.sizes.base, fontFamily: FONTS.semiBold },
  confirmTxtDisabled: { color: COLORS.textMuted, fontSize: FONTS.sizes.base, fontFamily: FONTS.medium },
});
