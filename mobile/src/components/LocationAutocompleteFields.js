import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

const NOMINATIM_HEADERS = { 'User-Agent': 'OnListApp/1.0' };

function SuggestionList({ items, onPress }) {
  if (!items.length) return null;
  return (
    <View style={styles.suggestionsContainer}>
      {items.map((item, index) => (
        <TouchableOpacity
          key={item.place_id || `${item.display_name}-${index}`}
          style={styles.suggestionItem}
          onPress={() => onPress(item)}
        >
          <Ionicons name="location" size={14} color={COLORS.textMuted} />
          <Text style={styles.suggestionText} numberOfLines={2}>{item.display_name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Field({ label, icon, value, onChangeText, placeholder, autoCapitalize = 'words', keyboardType, loading }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Ionicons name={icon} size={16} color={COLORS.textMuted} style={styles.icon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          selectionColor={COLORS.primary}
        />
        {loading ? <ActivityIndicator size="small" color={COLORS.primary} /> : null}
      </View>
    </View>
  );
}

export default function LocationAutocompleteFields({
  address,
  city,
  postalCode,
  onChangeAddress,
  onChangeCity,
  onChangePostalCode,
  addressLabel = 'Adresse',
  cityLabel = 'Ville',
  postalCodeLabel = 'Code postal',
}) {
  const [cityResults, setCityResults] = useState([]);
  const [addressResults, setAddressResults] = useState([]);
  const [postalResults, setPostalResults] = useState([]);
  const [searchingCity, setSearchingCity] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [searchingPostal, setSearchingPostal] = useState(false);

  const ignoreCity = useRef(false);
  const ignoreAddress = useRef(false);
  const ignorePostal = useRef(false);

  useEffect(() => {
    if (ignoreCity.current) {
      ignoreCity.current = false;
      return;
    }
    if ((city || '').trim().length < 2) {
      setCityResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearchingCity(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&featuretype=city&addressdetails=1&limit=5`,
          { headers: NOMINATIM_HEADERS }
        );
        setCityResults(await res.json());
      } catch {
        setCityResults([]);
      } finally {
        setSearchingCity(false);
      }
    }, 450);
    return () => clearTimeout(timeout);
  }, [city]);

  useEffect(() => {
    if (ignoreAddress.current) {
      ignoreAddress.current = false;
      return;
    }
    if ((address || '').trim().length < 4) {
      setAddressResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearchingAddress(true);
      try {
        const cityContext = city ? `, ${city}` : '';
        const postalContext = postalCode ? `, ${postalCode}` : '';
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + cityContext + postalContext)}&addressdetails=1&limit=5`,
          { headers: NOMINATIM_HEADERS }
        );
        setAddressResults(await res.json());
      } catch {
        setAddressResults([]);
      } finally {
        setSearchingAddress(false);
      }
    }, 450);
    return () => clearTimeout(timeout);
  }, [address, city, postalCode]);

  useEffect(() => {
    if (ignorePostal.current) {
      ignorePostal.current = false;
      return;
    }
    if ((postalCode || '').trim().length < 2) {
      setPostalResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearchingPostal(true);
      try {
        const query = [postalCode, city].filter(Boolean).join(' ');
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&postalcode=${encodeURIComponent(postalCode)}&city=${encodeURIComponent(city || '')}&country=France&addressdetails=1&limit=5`,
          { headers: NOMINATIM_HEADERS }
        );
        let data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          const fallback = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`,
            { headers: NOMINATIM_HEADERS }
          );
          data = await fallback.json();
        }
        setPostalResults(data);
      } catch {
        setPostalResults([]);
      } finally {
        setSearchingPostal(false);
      }
    }, 450);
    return () => clearTimeout(timeout);
  }, [postalCode, city]);

  const applyAddressSelection = (item) => {
    const details = item.address || {};
    const road = details.road || details.pedestrian || details.street || item.name;
    const houseNumber = details.house_number ? `${details.house_number} ` : '';
    ignoreAddress.current = true;
    onChangeAddress(`${houseNumber}${road}`.trim());
    if (details.city || details.town || details.village) {
      ignoreCity.current = true;
      onChangeCity(details.city || details.town || details.village);
    }
    if (details.postcode) {
      ignorePostal.current = true;
      onChangePostalCode(details.postcode);
    }
    setAddressResults([]);
  };

  const applyCitySelection = (item) => {
    const details = item.address || {};
    ignoreCity.current = true;
    onChangeCity(item.name || details.city || details.town || details.village || item.display_name.split(',')[0]);
    if (details.postcode) {
      ignorePostal.current = true;
      onChangePostalCode(details.postcode);
    }
    setCityResults([]);
  };

  const applyPostalSelection = (item) => {
    const details = item.address || {};
    if (details.postcode) {
      ignorePostal.current = true;
      onChangePostalCode(details.postcode);
    }
    if (details.city || details.town || details.village) {
      ignoreCity.current = true;
      onChangeCity(details.city || details.town || details.village);
    }
    if (!address && (details.road || details.pedestrian || details.street)) {
      ignoreAddress.current = true;
      const road = details.road || details.pedestrian || details.street;
      const houseNumber = details.house_number ? `${details.house_number} ` : '';
      onChangeAddress(`${houseNumber}${road}`.trim());
    }
    setPostalResults([]);
  };

  return (
    <View>
      <Field
        label={cityLabel}
        icon="map-outline"
        value={city}
        onChangeText={onChangeCity}
        placeholder="Paris"
        loading={searchingCity}
      />
      <SuggestionList items={cityResults} onPress={applyCitySelection} />

      <Field
        label={addressLabel}
        icon="location-outline"
        value={address}
        onChangeText={onChangeAddress}
        placeholder="12 rue de la Paix"
        loading={searchingAddress}
      />
      <SuggestionList items={addressResults} onPress={applyAddressSelection} />

      <Field
        label={postalCodeLabel}
        icon="mail-open-outline"
        value={postalCode}
        onChangeText={(value) => onChangePostalCode(value.replace(/[^0-9]/g, ''))}
        placeholder="75001"
        keyboardType="number-pad"
        autoCapitalize="none"
        loading={searchingPostal}
      />
      <SuggestionList items={postalResults} onPress={applyPostalSelection} />
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: SPACING.md },
  label: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    minHeight: 52,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.sizes.base, fontFamily: FONTS.regular },
  suggestionsContainer: {
    marginTop: -SPACING.xs,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggestionText: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, lineHeight: 18 },
});
