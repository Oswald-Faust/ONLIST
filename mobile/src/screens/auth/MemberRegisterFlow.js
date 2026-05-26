import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, StatusBar, Alert, Image,
  Dimensions, Modal, FlatList, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  SlideInRight, SlideInLeft, SlideOutLeft, SlideOutRight,
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { PHONE_CODES } from '../../constants/phoneCodes';
import { useAuth } from '../../context/AuthContext';
import { metaAPI } from '../../services/api';

const { width } = Dimensions.get('window');

// ─── Config des étapes ─────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 'firstName',
    context: 'Bienvenue sur ONLIST ✦',
    question: 'Comment tu\nt\'appelles ?',
    type: 'text',
    field: 'firstName',
    placeholder: 'Ton prénom',
    autoCapitalize: 'words',
    keyboardType: 'default',
  },
  {
    id: 'lastName',
    context: null, // calculé dynamiquement
    question: 'Et ton nom\nde famille ?',
    type: 'text',
    field: 'lastName',
    placeholder: 'Nom de famille',
    autoCapitalize: 'words',
    keyboardType: 'default',
  },
  {
    id: 'email',
    context: 'Pour créer ton compte ONLIST',
    question: 'Ton adresse\nemail ?',
    type: 'text',
    field: 'email',
    placeholder: 'ton@email.com',
    autoCapitalize: 'none',
    keyboardType: 'email-address',
  },
  {
    id: 'phone',
    context: 'Pour être contacté facilement',
    question: 'Ton numéro de\ntéléphone ?',
    type: 'phone',
  },
  {
    id: 'dateOfBirth',
    context: 'Tu dois avoir au moins 18 ans',
    question: 'Ta date de\nnaissance ?',
    type: 'date',
    field: 'dateOfBirth',
    placeholder: 'JJ / MM / AAAA',
  },
  {
    id: 'gender',
    context: 'Pour personnaliser ton expérience',
    question: 'Tu t\'identifies\ncomme ?',
    type: 'gender',
    field: 'gender',
  },
  {
    id: 'location',
    context: 'Nos services sont disponibles partout',
    question: 'Tu habites\noù ?',
    type: 'location',
  },
  {
    id: 'socials',
    context: 'Plus tu as de reach, mieux c\'est',
    question: 'Tes réseaux\nsociaux ?',
    type: 'socials',
  },
  {
    id: 'photos',
    context: 'Fais bonne première impression',
    question: 'Tes meilleures\nphotos !',
    type: 'photos',
  },
  {
    id: 'password',
    context: 'Presque là !',
    question: 'Sécurise ton\ncompte',
    type: 'password',
  },
];

// ─── Utilitaires ───────────────────────────────────────────────────────────────

const formatDateValue = (date) => {
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = `${date.getFullYear()}`;
  return `${day}/${month}/${year}`;
};

const parseDateValue = (value) => {
  const [day, month, year] = value.split('/').map(Number);
  if (!day || !month || !year) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getMaximumBirthDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date;
};

const normalizeCountries = (countries = []) => countries
  .map((item) => {
    const name = item?.translations?.fra?.common || item?.name?.common;
    const code = item?.cca2;
    if (!name || !code) return null;

    return {
      code,
      name,
      nationality: item?.demonyms?.fra?.m || item?.demonyms?.eng?.m || name,
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

const fetchCountriesFallback = async () => {
  const response = await fetch('https://restcountries.com/v3.1/all?fields=name,translations,cca2,demonyms');
  if (!response.ok) throw new Error('Impossible de récupérer les pays');
  const payload = await response.json();
  return normalizeCountries(payload);
};

const fetchCitiesFallback = async ({ query, countryCode, count = 20 }) => {
  const params = new URLSearchParams({
    name: query.trim(),
    count: String(count),
    language: 'fr',
    format: 'json',
  });

  if (countryCode) params.set('countryCode', countryCode);

  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
  if (!response.ok) throw new Error('Impossible de récupérer les villes');

  const payload = await response.json();
  const results = Array.isArray(payload.results) ? payload.results : [];

  return results.map((item) => ({
    id: item.id,
    label: [item.name, item.admin1, item.country].filter(Boolean).join(', '),
    name: item.name,
    country: item.country,
    countryCode: item.country_code,
  }));
};

const POPULAR_CITY_OPTIONS = [
  { id: 'paris-fr', label: 'Paris, Île-de-France, France', name: 'Paris', country: 'France', countryCode: 'FR' },
  { id: 'lyon-fr', label: 'Lyon, Auvergne-Rhône-Alpes, France', name: 'Lyon', country: 'France', countryCode: 'FR' },
  { id: 'marseille-fr', label: 'Marseille, Provence-Alpes-Côte d’Azur, France', name: 'Marseille', country: 'France', countryCode: 'FR' },
  { id: 'nice-fr', label: 'Nice, Provence-Alpes-Côte d’Azur, France', name: 'Nice', country: 'France', countryCode: 'FR' },
  { id: 'bordeaux-fr', label: 'Bordeaux, Nouvelle-Aquitaine, France', name: 'Bordeaux', country: 'France', countryCode: 'FR' },
  { id: 'bruxelles-be', label: 'Bruxelles, Belgique', name: 'Bruxelles', country: 'Belgique', countryCode: 'BE' },
  { id: 'geneve-ch', label: 'Genève, Suisse', name: 'Genève', country: 'Suisse', countryCode: 'CH' },
  { id: 'montreal-ca', label: 'Montréal, Québec, Canada', name: 'Montréal', country: 'Canada', countryCode: 'CA' },
  { id: 'casablanca-ma', label: 'Casablanca, Maroc', name: 'Casablanca', country: 'Maroc', countryCode: 'MA' },
  { id: 'marrakech-ma', label: 'Marrakech, Maroc', name: 'Marrakech', country: 'Maroc', countryCode: 'MA' },
  { id: 'dakar-sn', label: 'Dakar, Sénégal', name: 'Dakar', country: 'Sénégal', countryCode: 'SN' },
  { id: 'abidjan-ci', label: 'Abidjan, Côte d’Ivoire', name: 'Abidjan', country: "Côte d’Ivoire", countryCode: 'CI' },
  { id: 'lome-tg', label: 'Lomé, Togo', name: 'Lomé', country: 'Togo', countryCode: 'TG' },
];

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// ─── PickerModal ───────────────────────────────────────────────────────────────

function PickerModal({ visible, onClose, items, selected, onSelect, title }) {
  const [search, setSearch] = useState('');
  const filtered = items.filter(i => i.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <View style={modal.header}>
            <Text style={modal.title}>{title}</Text>
            <TouchableOpacity onPress={() => { onClose(); setSearch(''); }}>
              <Ionicons name="close" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <View style={modal.searchRow}>
            <Ionicons name="search" size={16} color={COLORS.textMuted} />
            <TextInput
              style={modal.searchInput}
              placeholder="Rechercher..."
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={i => i}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[modal.item, item === selected && modal.itemSelected]}
                onPress={() => { onSelect(item); setSearch(''); onClose(); }}
              >
                <Text style={[modal.itemText, item === selected && modal.itemTextActive]}>
                  {item}
                </Text>
                {item === selected && (
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            )}
            style={{ maxHeight: 340 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
}

function AsyncPickerModal({
  visible,
  onClose,
  items,
  selected,
  onSelect,
  title,
  search,
  onSearch,
  loading,
  emptyMessage,
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.handle} />
          <View style={modal.header}>
            <Text style={modal.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <View style={modal.searchRow}>
            <Ionicons name="search" size={16} color={COLORS.textMuted} />
            <TextInput
              style={modal.searchInput}
              placeholder="Rechercher..."
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={onSearch}
              autoFocus
            />
          </View>
          {loading ? (
            <View style={modal.loadingWrap}>
              <ActivityIndicator color={COLORS.primary} size="small" />
            </View>
          ) : items.length === 0 ? (
            <View style={modal.emptyWrap}>
              <Text style={modal.emptyText}>{emptyMessage}</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => `${item.id || item.label}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[modal.item, item.label === selected && modal.itemSelected]}
                  onPress={() => { onSelect(item); onClose(); }}
                >
                  <Text style={[modal.itemText, item.label === selected && modal.itemTextActive]}>
                    {item.label}
                  </Text>
                  {item.label === selected && (
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 340 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Étape Texte / Email / Date ────────────────────────────────────────────────

function StepText({ config, value, onChange, onPress, editable = true }) {
  return (
    <View style={step.inputWrap}>
      {editable ? (
        <TextInput
          style={step.bigInput}
          value={value}
          onChangeText={onChange}
          placeholder={config.placeholder}
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize={config.autoCapitalize || 'none'}
          keyboardType={config.keyboardType || 'default'}
          autoFocus
          selectionColor={COLORS.primary}
          secureTextEntry={false}
        />
      ) : (
        <TouchableOpacity style={step.dateTrigger} activeOpacity={0.75} onPress={onPress}>
          <View style={step.dateTriggerInner}>
            <Text style={[step.bigInput, !value && step.datePlaceholder]}>
              {value || config.placeholder}
            </Text>
            <Ionicons name="calendar-outline" size={22} color={value ? COLORS.primary : COLORS.textMuted} />
          </View>
        </TouchableOpacity>
      )}
      <View style={step.inputLine} />
    </View>
  );
}

// ─── Étape Genre ───────────────────────────────────────────────────────────────

function StepGender({ value, onChange }) {
  const OPTIONS = [
    { val: 'female', label: 'Femme', icon: 'woman' },
    { val: 'male', label: 'Homme', icon: 'man' },
    { val: 'non-binary', label: 'Non-binaire', icon: 'person' },
  ];
  return (
    <View style={step.optionList}>
      {OPTIONS.map(opt => {
        const active = value === opt.val;
        return (
          <TouchableOpacity
            key={opt.val}
            style={[step.optionCard, active && step.optionCardActive]}
            onPress={() => onChange(opt.val)}
            activeOpacity={0.75}
          >
            {active && (
              <LinearGradient
                colors={['rgba(201,169,97,0.18)', 'rgba(201,169,97,0.06)']}
                style={StyleSheet.absoluteFill}
              />
            )}
            <Ionicons
              name={opt.icon}
              size={22}
              color={active ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[step.optionLabel, active && step.optionLabelActive]}>
              {opt.label}
            </Text>
            <View style={[step.radio, active && step.radioActive]}>
              {active && <View style={step.radioDot} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Étape Téléphone ───────────────────────────────────────────────────────────

function StepPhone({ form, update }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const phoneCodes = PHONE_CODES.filter(Boolean);

  const selected = phoneCodes.find(p => p.code === form.phoneCode && p.country === (
    phoneCodes.find(x => x.code === form.phoneCode)?.country
  )) || phoneCodes.find(p => p.code === form.phoneCode) || phoneCodes.find(p => p.country === 'France');

  const filtered = search.trim()
    ? phoneCodes.filter(p =>
        p.country.toLowerCase().includes(search.toLowerCase()) ||
        p.code.includes(search.replace(/\s/g, ''))
      )
    : phoneCodes;

  return (
    <View style={step.phoneWrap}>
      <View style={step.phoneRow}>
        {/* Sélecteur indicatif */}
        <TouchableOpacity
          style={step.phoneCodeBtn}
          onPress={() => { setSearch(''); setModalVisible(true); }}
          activeOpacity={0.8}
        >
          <Text style={step.phoneFlag}>{selected?.flag}</Text>
          <Text style={step.phoneCodeTxt}>{selected?.code}</Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} style={{ marginBottom: SPACING.sm }} />
        </TouchableOpacity>

        <View style={step.phoneSep} />

        {/* Saisie numéro */}
        <TextInput
          style={[step.bigInput, { flex: 1 }]}
          value={form.phone}
          onChangeText={v => update('phone', v.replace(/[^0-9 \-]/g, ''))}
          placeholder="6 12 34 56 78"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="phone-pad"
          autoFocus
          selectionColor={COLORS.primary}
        />
      </View>
      <View style={step.inputLine} />

      {/* Modal sélection indicatif */}
      <Modal visible={modalVisible} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={modal.overlay}>
          <View style={[modal.sheet, { maxHeight: '85%' }]}>
            <View style={modal.handle} />
            <View style={modal.header}>
              <Text style={modal.title}>Indicatif téléphonique</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); setSearch(''); }}>
                <Ionicons name="close" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <View style={modal.searchRow}>
              <Ionicons name="search" size={16} color={COLORS.textMuted} />
              <TextInput
                style={modal.searchInput}
                placeholder="Pays ou +indicatif..."
                placeholderTextColor={COLORS.textMuted}
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={item => `${item.code}-${item.country}`}
              renderItem={({ item }) => {
                const isActive = form.phoneCode === item.code && selected?.country === item.country;
                return (
                  <TouchableOpacity
                    style={[modal.item, isActive && modal.itemSelected]}
                    onPress={() => {
                      update('phoneCode', item.code);
                      setModalVisible(false);
                      setSearch('');
                    }}
                  >
                    <Text style={{ fontSize: 20, marginRight: 10 }}>{item.flag}</Text>
                    <Text style={[modal.itemText, { flex: 1 }, isActive && modal.itemTextActive]}>
                      {item.country}
                    </Text>
                    <Text style={{ color: COLORS.textMuted, fontFamily: FONTS.medium, fontSize: FONTS.sizes.sm }}>
                      {item.code}
                    </Text>
                    {isActive && <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} style={{ marginLeft: 6 }} />}
                  </TouchableOpacity>
                );
              }}
              style={{ maxHeight: 400 }}
              showsVerticalScrollIndicator={false}
              initialNumToRender={30}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Étape Localisation ────────────────────────────────────────────────────────

function StepLocation({ form, update }) {
  const [cityModal, setCityModal] = useState(false);
  const [countryModal, setCountryModal] = useState(false);
  const [nationalityModal, setNationalityModal] = useState(false);
  const [countryOptions, setCountryOptions] = useState([]);
  const [nationalityOptions, setNationalityOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [countryLoading, setCountryLoading] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const [countryError, setCountryError] = useState('');
  const [cityError, setCityError] = useState('');
  const [citySearch, setCitySearch] = useState('');

  const getSelectedCountry = useCallback(
    () => countryOptions.find((item) => item.label === form.country),
    [countryOptions, form.country]
  );

  const getStarterCities = useCallback((searchValue = '') => {
    const selectedCountry = getSelectedCountry();
    const normalizedSearch = searchValue.trim().toLowerCase();

    let starters = selectedCountry?.code
      ? POPULAR_CITY_OPTIONS.filter((item) => item.countryCode === selectedCountry.code)
      : POPULAR_CITY_OPTIONS;

    if (starters.length === 0) {
      starters = POPULAR_CITY_OPTIONS;
    }

    if (normalizedSearch) {
      starters = starters.filter((item) =>
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.country.toLowerCase().includes(normalizedSearch)
      );
    }

    return starters;
  }, [getSelectedCountry]);

  useEffect(() => {
    let active = true;

    const loadCountries = async () => {
      setCountryLoading(true);
      setCountryError('');
      try {
        let countries = [];
        try {
          const data = await metaAPI.countries();
          countries = data.countries || [];
        } catch {
          countries = await fetchCountriesFallback();
        }
        if (!active) return;

        setCountryOptions(countries.map((item) => ({
          id: item.code,
          label: item.name,
          code: item.code,
        })));
        setNationalityOptions(countries.map((item) => ({
          id: `${item.code}-nationality`,
          label: item.nationality,
          code: item.code,
          countryName: item.name,
        })));
      } catch {
        if (!active) return;
        setCountryOptions([]);
        setNationalityOptions([]);
        setCountryError('Impossible de charger les pays pour le moment');
      } finally {
        if (active) setCountryLoading(false);
      }
    };

    loadCountries();
    return () => { active = false; };
  }, []);

  const searchCities = useRef(debounce(async (query, countryCode) => {
    if (query.trim().length < 2) {
      setCityOptions(getStarterCities(query));
      setCityLoading(false);
      setCityError('');
      return;
    }

    try {
      setCityError('');
      let cities = [];
      try {
        const data = await metaAPI.cities({ q: query, countryCode, count: 20 });
        cities = data.cities || [];
      } catch {
        cities = await fetchCitiesFallback({ query, countryCode, count: 20 });
      }
      setCityOptions(cities.map((item) => ({
        id: item.id,
        label: item.label,
        name: item.name,
        country: item.country,
        countryCode: item.countryCode,
      })));
    } catch {
      setCityOptions(getStarterCities(query));
      setCityError('Impossible de charger les villes pour le moment');
    } finally {
      setCityLoading(false);
    }
  }, 300)).current;

  const handleCitySearch = (value) => {
    setCitySearch(value);
    const selectedCountry = getSelectedCountry();

    if (value.trim().length < 2) {
      setCityLoading(false);
      setCityError('');
      setCityOptions(getStarterCities(value));
      return;
    }

    setCityLoading(true);
    searchCities(value, selectedCountry?.code || '');
  };

  const closeCityModal = () => {
    setCityModal(false);
    setCitySearch('');
    setCityOptions([]);
    setCityLoading(false);
  };

  return (
    <View style={step.optionList}>
      <TouchableOpacity
        style={[step.selectRow, form.nationality && step.selectRowFilled]}
        onPress={() => setNationalityModal(true)}
      >
        <View style={step.selectLeft}>
          <View style={[step.selectIconWrap, form.nationality && step.selectIconWrapFilled]}>
            <Ionicons name="flag-outline" size={18} color={form.nationality ? COLORS.primary : COLORS.textMuted} />
          </View>
          <View style={step.selectTextWrap}>
            <Text style={step.selectMeta}>Identité</Text>
            <Text style={[step.selectLabel, !form.nationality && step.selectPlaceholder]}>
              {form.nationality || 'Nationalité'}
            </Text>
          </View>
        </View>
        <View style={step.selectArrowWrap}>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[step.selectRow, form.country && step.selectRowFilled]}
        onPress={() => setCountryModal(true)}
      >
        <View style={step.selectLeft}>
          <View style={[step.selectIconWrap, form.country && step.selectIconWrapFilled]}>
            <Ionicons name="earth-outline" size={18} color={form.country ? COLORS.primary : COLORS.textMuted} />
          </View>
          <View style={step.selectTextWrap}>
            <Text style={step.selectMeta}>Résidence</Text>
            <Text style={[step.selectLabel, !form.country && step.selectPlaceholder]}>
              {form.country || 'Pays de résidence'}
            </Text>
          </View>
        </View>
        <View style={step.selectArrowWrap}>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[step.selectRow, form.city && step.selectRowFilled]}
        onPress={() => {
          setCitySearch('');
          setCityError('');
          setCityLoading(false);
          setCityOptions(getStarterCities());
          setCityModal(true);
        }}
      >
        <View style={step.selectLeft}>
          <View style={[step.selectIconWrap, form.city && step.selectIconWrapFilled]}>
            <Ionicons name="location-outline" size={18} color={form.city ? COLORS.primary : COLORS.textMuted} />
          </View>
          <View style={step.selectTextWrap}>
            <Text style={step.selectMeta}>Ville</Text>
            <Text style={[step.selectLabel, !form.city && step.selectPlaceholder]}>
              {form.city || 'Ta ville *'}
            </Text>
          </View>
        </View>
        <View style={step.selectArrowWrap}>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </View>
      </TouchableOpacity>

      <AsyncPickerModal
        visible={nationalityModal}
        onClose={() => setNationalityModal(false)}
        items={nationalityOptions.map((item) => ({
          id: item.id,
          label: item.label,
        }))}
        selected={form.nationality}
        onSelect={(item) => {
          update('nationality', item.label);
        }}
        title="Ta nationalité"
        search=""
        onSearch={() => { }}
        loading={countryLoading}
        emptyMessage={countryError || 'Aucune nationalité disponible'}
      />
      <AsyncPickerModal
        visible={countryModal}
        onClose={() => setCountryModal(false)}
        items={countryOptions.map((item) => ({
          id: item.id,
          label: item.label,
        }))}
        selected={form.country}
        onSelect={(item) => {
          update('country', item.label);
          if (form.city) update('city', '');
        }}
        title="Pays de résidence"
        search=""
        onSearch={() => { }}
        loading={countryLoading}
        emptyMessage={countryError || 'Aucun pays disponible'}
      />
      <AsyncPickerModal
        visible={cityModal}
        onClose={closeCityModal}
        items={cityOptions}
        selected={form.city}
        onSelect={(item) => {
          update('city', item.name);
          if (!form.country || form.country !== item.country) {
            update('country', item.country);
          }
        }}
        title="Ta ville"
        search={citySearch}
        onSearch={handleCitySearch}
        loading={cityLoading}
        emptyMessage={cityError || (citySearch.trim().length < 2
          ? 'Choisis une suggestion ou tape au moins 2 lettres'
          : 'Aucune ville trouvée')}
      />
    </View>
  );
}

// ─── Étape Réseaux sociaux ─────────────────────────────────────────────────────

function StepSocials({ form, update }) {
  return (
    <View style={step.socialWrap}>
      <View style={step.socialField}>
        <View style={step.socialIcon}>
          <Ionicons name="logo-instagram" size={20} color={COLORS.textSecondary} />
        </View>
        <TextInput
          style={step.socialInput}
          value={form.instagram}
          onChangeText={v => update('instagram', v)}
          placeholder="@instagram"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          selectionColor={COLORS.primary}
          autoFocus
        />
      </View>
      <View style={step.socialDivider} />

      <View style={step.socialField}>
        <View style={step.socialIcon}>
          <Ionicons name="logo-tiktok" size={20} color={COLORS.textSecondary} />
        </View>
        <TextInput
          style={step.socialInput}
          value={form.tiktok}
          onChangeText={v => update('tiktok', v)}
          placeholder="@tiktok"
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          selectionColor={COLORS.primary}
        />
      </View>
      <View style={step.socialDivider} />

      <View style={step.socialField}>
        <View style={step.socialIcon}>
          <Ionicons name="people-outline" size={20} color={COLORS.textSecondary} />
        </View>
        <TextInput
          style={step.socialInput}
          value={form.followersCount}
          onChangeText={v => update('followersCount', v)}
          placeholder="Nombre total de followers"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          selectionColor={COLORS.primary}
        />
      </View>
    </View>
  );
}

// ─── Étape Photos ──────────────────────────────────────────────────────────────

function StepPhotos({ photos, onAdd, onRemove }) {
  const empty = photos.length === 0;

  return (
    <View style={step.photoGrid}>
      {photos.map((uri, i) => (
        <View key={i} style={step.photoCell}>
          <Image source={{ uri }} style={step.photoImg} />
          <TouchableOpacity style={step.photoDelete} onPress={() => onRemove(i)}>
            <Ionicons name="close" size={14} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      ))}
      {photos.length < 6 && (
        <TouchableOpacity style={[step.photoAdd, empty && step.photoAddHero]} onPress={onAdd}>
          <Ionicons name="add" size={28} color={COLORS.primary} />
          <Text style={step.photoAddText}>{empty ? 'Ajouter tes premières photos' : 'Ajouter'}</Text>
          {empty && (
            <Text style={step.photoAddHint}>
              Utilise toute la largeur pour importer plusieurs visuels et mieux présenter ton profil.
            </Text>
          )}
        </TouchableOpacity>
      )}
      {photos.length > 0 && (
        <Text style={step.photoCount}>
          <Text style={{ color: COLORS.primary, fontFamily: FONTS.semiBold }}>
            {photos.length}
          </Text>
          {' '}photo{photos.length > 1 ? 's' : ''} ajoutée{photos.length > 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );
}

// ─── Étape Mot de passe ────────────────────────────────────────────────────────

function StepPassword({ form, update }) {
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const match = form.password && form.confirmPassword && form.password === form.confirmPassword;
  const noMatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  return (
    <View style={step.pwdWrap}>
      <View style={step.pwdField}>
        <TextInput
          style={step.pwdInput}
          value={form.password}
          onChangeText={v => update('password', v)}
          placeholder="Mot de passe (8 car. min.)"
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={!showPwd}
          selectionColor={COLORS.primary}
          autoFocus
        />
        <TouchableOpacity onPress={() => setShowPwd(v => !v)} style={step.pwdEye}>
          <Ionicons name={showPwd ? 'eye-off' : 'eye'} size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
      <View style={step.pwdDivider} />

      <View style={step.pwdField}>
        <TextInput
          style={step.pwdInput}
          value={form.confirmPassword}
          onChangeText={v => update('confirmPassword', v)}
          placeholder="Confirmer le mot de passe"
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={!showConfirm}
          selectionColor={COLORS.primary}
        />
        <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={step.pwdEye}>
          <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
      <View style={step.pwdDivider} />

      {noMatch && (
        <Text style={step.pwdError}>Les mots de passe ne correspondent pas</Text>
      )}
      {match && (
        <Text style={step.pwdOk}>
          <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
          {' '}Parfait !
        </Text>
      )}

      <TouchableOpacity
        style={step.termsRow}
        onPress={() => update('acceptTerms', !form.acceptTerms)}
      >
        <View style={[step.checkbox, form.acceptTerms && step.checkboxActive]}>
          {form.acceptTerms && <Ionicons name="checkmark" size={13} color={COLORS.bg} />}
        </View>
        <Text style={step.termsText}>
          J'accepte les{' '}
          <Text style={step.termsLink}>conditions d'utilisation</Text>
          {' '}et la{' '}
          <Text style={step.termsLink}>politique de confidentialité</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function MemberRegisterFlow({ navigation }) {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState('forward');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [draftBirthDate, setDraftBirthDate] = useState(getMaximumBirthDate());

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    phoneCode: '+33', phone: '',
    dateOfBirth: '',
    gender: '', nationality: '', country: 'France', city: '',
    instagram: '', tiktok: '', followersCount: '',
    photos: [], password: '', confirmPassword: '', acceptTerms: false,
  });

  const update = useCallback((key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
  }, []);

  const selectedBirthDate = parseDateValue(form.dateOfBirth) || getMaximumBirthDate();

  // Barre de progression animée
  const progressValue = useSharedValue(1 / STEPS.length);
  useEffect(() => {
    progressValue.value = withTiming((currentStep + 1) / STEPS.length, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [currentStep]);

  const progressStyle = useAnimatedStyle(() => ({
    width: progressValue.value * (width - SPACING.lg * 2 - 60),
  }));

  // ── Validation ──────────────────────────────────────────────────────────────

  const canContinue = useCallback(() => {
    const s = STEPS[currentStep];
    switch (s.id) {
      case 'firstName': return form.firstName.trim().length >= 2;
      case 'lastName': return form.lastName.trim().length >= 2;
      case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
      case 'phone': return form.phone.replace(/[\s\-]/g, '').length >= 6;
      case 'dateOfBirth': return form.dateOfBirth.length === 10;
      case 'gender': return !!form.gender;
      case 'location': return !!form.city;
      case 'socials': return (!!form.instagram || !!form.tiktok) && !!form.followersCount;
      case 'photos': return form.photos.length > 0;
      case 'password':
        return form.password.length >= 8
          && form.password === form.confirmPassword
          && form.acceptTerms;
      default: return true;
    }
  }, [currentStep, form]);

  // ── Navigation entre étapes ─────────────────────────────────────────────────

  const goNext = () => {
    if (!canContinue()) return;
    if (currentStep < STEPS.length - 1) {
      setDirection('forward');
      setCurrentStep(s => s + 1);
    } else {
      handleSubmit();
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setDirection('backward');
      setCurrentStep(s => s - 1);
    } else {
      navigation.goBack();
    }
  };

  // ── Photos ──────────────────────────────────────────────────────────────────

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'L\'accès à la galerie est nécessaire.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 6 - form.photos.length,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      update('photos', [...form.photos, ...uris].slice(0, 6));
    }
  };

  const removePhoto = (idx) => {
    update('photos', form.photos.filter((_, i) => i !== idx));
  };

  // ── Soumission ──────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await register({
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: form.email.trim(),
        password: form.password,
        type: 'influencer',
        phone: form.phone.trim() ? `${form.phoneCode}${form.phone.replace(/\s/g, '')}` : undefined,
        instagram: form.instagram,
        tiktok: form.tiktok,
        followersCount: parseInt(form.followersCount) || 0,
        city: form.city,
        country: form.country,
        bio: '',
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        nationality: form.nationality,
      });
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Contexte dynamique ──────────────────────────────────────────────────────

  const getContext = () => {
    const s = STEPS[currentStep];
    if (s.id === 'lastName') return `Ravi de te rencontrer, ${form.firstName} !`;
    return s.context;
  };

  // ── Rendu du contenu par type ───────────────────────────────────────────────

  const renderContent = () => {
    const s = STEPS[currentStep];
    switch (s.type) {
      case 'text':
        return (
          <StepText
            config={s}
            value={form[s.field]}
            onChange={v => update(s.field, v)}
          />
        );
      case 'date':
        return (
          <StepText
            config={s}
            value={form[s.field]}
            onChange={() => { }}
            onPress={() => {
              setDraftBirthDate(selectedBirthDate);
              setShowDatePicker(true);
            }}
            editable={false}
          />
        );
      case 'phone':
        return <StepPhone form={form} update={update} />;
      case 'gender':
        return <StepGender value={form.gender} onChange={v => update('gender', v)} />;
      case 'location':
        return <StepLocation form={form} update={update} />;
      case 'socials':
        return <StepSocials form={form} update={update} />;
      case 'photos':
        return (
          <StepPhotos
            photos={form.photos}
            onAdd={pickPhoto}
            onRemove={removePhoto}
          />
        );
      case 'password':
        return <StepPassword form={form} update={update} />;
      default:
        return null;
    }
  };

  const active = canContinue() && !showDatePicker;
  const isLast = currentStep === STEPS.length - 1;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Header avec barre de progression ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>

        <Text style={styles.stepNum}>{currentStep + 1}/{STEPS.length}</Text>
      </View>

      {/* ── Contenu animé ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Animated.View
          key={currentStep}
          entering={
            direction === 'forward'
              ? SlideInRight.duration(300)
              : SlideInLeft.duration(300)
          }
          exiting={
            direction === 'forward'
              ? SlideOutLeft.duration(300)
              : SlideOutRight.duration(300)
          }
          style={styles.stepWrapper}
        >
          <Text style={styles.contextLabel}>{getContext()}</Text>
          <Text style={styles.question}>{STEPS[currentStep].question}</Text>
          {renderContent()}
        </Animated.View>

        {showDatePicker && Platform.OS === 'ios' && (
          <View style={styles.iosDateSheetWrap}>
            <View style={styles.iosDateSheet}>
              <View style={styles.iosDateHeader}>
                <Text style={styles.iosDateTitle}>Date de naissance</Text>
                <TouchableOpacity onPress={() => {
                  update('dateOfBirth', formatDateValue(draftBirthDate));
                  setShowDatePicker(false);
                }}>
                  <Text style={styles.iosDateDone}>Valider</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={draftBirthDate}
                mode="date"
                display="spinner"
                themeVariant="dark"
                maximumDate={getMaximumBirthDate()}
                onChange={(_, date) => {
                  if (date) setDraftBirthDate(date);
                }}
              />
            </View>
          </View>
        )}

        {/* ── Bouton Continuer ── */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            onPress={goNext}
            activeOpacity={active ? 0.85 : 1}
            style={styles.continueOuter}
          >
            {active ? (
              <LinearGradient
                colors={COLORS.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.continueBtn}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.bg} size="small" />
                ) : (
                  <>
                    <Text style={styles.continueTxt}>
                      {isLast ? 'Créer mon compte' : 'Continuer'}
                    </Text>
                    {!loading && (
                      <Ionicons
                        name={isLast ? 'checkmark' : 'arrow-forward'}
                        size={20}
                        color={COLORS.bg}
                      />
                    )}
                  </>
                )}
              </LinearGradient>
            ) : (
              <View style={styles.continueBtnDisabled}>
                <Text style={styles.continueTxtDisabled}>
                  {isLast ? 'Créer mon compte' : 'Continuer'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginRow}>
            <Text style={styles.loginQ}>Déjà un compte ? </Text>
            <Text style={styles.loginLink}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedBirthDate}
          mode="date"
          display="default"
          maximumDate={getMaximumBirthDate()}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (event.type === 'set' && date) {
              update('dateOfBirth', formatDateValue(date));
            }
          }}
        />
      )}
    </View>
  );
}

// ─── Styles principaux ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: COLORS.bgCard2,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  stepNum: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
    minWidth: 30,
    textAlign: 'right',
  },

  stepWrapper: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  contextLabel: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.3,
    marginBottom: SPACING.sm,
  },
  question: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xxl + 2,
    fontFamily: FONTS.bold,
    lineHeight: 42,
    marginBottom: SPACING.xl,
  },

  footer: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  continueOuter: {},
  continueBtn: {
    height: 58,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  continueBtnDisabled: {
    height: 58,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  continueTxt: {
    color: COLORS.bg,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.semiBold,
  },
  continueTxtDisabled: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.medium,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  loginQ: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
  },
  loginLink: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semiBold,
    textDecorationLine: 'underline',
  },
  iosDateSheetWrap: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  iosDateSheet: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  iosDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  iosDateTitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
  },
  iosDateDone: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semiBold,
  },
});

// ─── Styles des steps ──────────────────────────────────────────────────────────

const step = StyleSheet.create({
  // ── Texte / Date ──
  inputWrap: { marginTop: SPACING.sm },
  bigInput: {
    fontSize: FONTS.sizes.xl + 2,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    paddingBottom: SPACING.sm,
    letterSpacing: 0.2,
  },
  inputLine: {
    height: 1.5,
    backgroundColor: COLORS.border,
    marginTop: 4,
  },
  dateTrigger: {
    paddingBottom: SPACING.sm,
  },
  dateTriggerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  datePlaceholder: {
    color: COLORS.textMuted,
  },

  // ── Téléphone ──
  phoneWrap: { marginTop: SPACING.sm },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  phoneCodeBtn: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingBottom: SPACING.sm,
  },
  phoneFlag: { fontSize: 26, lineHeight: 34 },
  phoneCodeTxt: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xl + 2,
    fontFamily: FONTS.bold,
    letterSpacing: 0.2,
  },
  phoneSep: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.sm + 2,
  },

  // ── Genre ──
  optionList: { gap: SPACING.sm },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    gap: SPACING.md,
    overflow: 'hidden',
  },
  optionCardActive: {
    borderColor: COLORS.primary,
  },
  optionLabel: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.medium,
  },
  optionLabelActive: {
    color: COLORS.white,
    fontFamily: FONTS.semiBold,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(201,169,97,0.12)' },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },

  // ── Localisation ──
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    minHeight: 78,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 4,
  },
  selectRowFilled: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(201,169,97,0.05)',
  },
  selectLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  selectIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.bgCard2,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectIconWrapFilled: {
    backgroundColor: 'rgba(201,169,97,0.12)',
    borderColor: 'rgba(201,169,97,0.24)',
  },
  selectTextWrap: {
    flex: 1,
    gap: 3,
  },
  selectMeta: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.medium,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  selectLabel: {
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.semiBold,
  },
  selectPlaceholder: { color: COLORS.textMuted, fontFamily: FONTS.regular },
  selectArrowWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.md,
  },

  // ── Réseaux sociaux ──
  socialWrap: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  socialField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  socialIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgCard2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.regular,
    paddingVertical: SPACING.sm,
  },
  socialDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: SPACING.md + 36 + SPACING.sm,
  },

  // ── Photos ──
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  photoCell: {
    width: (width - SPACING.lg * 2 - SPACING.sm) / 2,
    aspectRatio: 0.96,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  photoImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoDelete: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAdd: {
    width: (width - SPACING.lg * 2 - SPACING.sm) / 2,
    aspectRatio: 0.96,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(201,169,97,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
  },
  photoAddHero: {
    width: '100%',
    aspectRatio: 2.2,
  },
  photoAddText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semiBold,
    textAlign: 'center',
  },
  photoAddHint: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '80%',
  },
  photoCount: {
    width: '100%',
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    marginTop: 4,
  },

  // ── Mot de passe ──
  pwdWrap: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  pwdField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  pwdInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.regular,
    paddingVertical: SPACING.md,
  },
  pwdEye: { padding: SPACING.xs },
  pwdDivider: { height: 1, backgroundColor: COLORS.border },
  pwdError: {
    color: COLORS.error,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    padding: SPACING.sm,
  },
  pwdOk: {
    color: COLORS.success,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.medium,
    padding: SPACING.sm,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.md,
    paddingTop: SPACING.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  termsText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    lineHeight: 20,
  },
  termsLink: { color: COLORS.primary, fontFamily: FONTS.medium },
});

// ─── Styles modal ──────────────────────────────────────────────────────────────

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingBottom: 40,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.semiBold,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.base,
    paddingVertical: 10,
    fontFamily: FONTS.regular,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  itemSelected: { backgroundColor: 'rgba(201,169,97,0.08)' },
  itemText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.regular,
  },
  itemTextActive: { color: COLORS.primary, fontFamily: FONTS.semiBold },
});
