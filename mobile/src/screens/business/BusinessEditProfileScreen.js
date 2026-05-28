import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Alert,
  StatusBar, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { uploadAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import InputField from '../../components/InputField';
import KeyboardDismissScrollView from '../../components/KeyboardDismissScrollView';
import LocationAutocompleteFields from '../../components/LocationAutocompleteFields';

export default function BusinessEditProfileScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState(user?.photos || []);
  const [form, setForm] = useState({
    name: user?.name || '',
    businessName: user?.businessName || '',
    businessType: user?.businessType || '',
    businessCity: user?.businessCity || '',
    businessAddress: user?.businessAddress || '',
    businessPostalCode: user?.businessPostalCode || '',
    businessDescription: user?.businessDescription || '',
  });

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const pickPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à la galerie pour ajouter des photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: Math.max(1, 6 - photos.length),
    });
    if (result.canceled) return;

    setUploading(true);
    try {
      const uploaded = [];
      for (const asset of result.assets) {
        const data = await uploadAPI.image(asset.uri);
        uploaded.push(data.url);
      }
      setPhotos((prev) => [...prev, ...uploaded].slice(0, 6));
    } catch (err) {
      Alert.alert('Erreur upload', err.message || "Impossible d'ajouter les photos.");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => setPhotos((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!form.businessName.trim()) return Alert.alert('Erreur', "Le nom de l'établissement est requis.");
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        businessName: form.businessName.trim(),
        businessCity: form.businessCity.trim(),
        businessAddress: form.businessAddress.trim(),
        businessDescription: form.businessDescription.trim(),
        photos,
        businessLogo: photos[0] || user?.businessLogo || '',
      };
      const data = await usersAPI.updateMe(payload);
      await updateUser(data.user);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#0A0A0F', '#0E0D0B']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity style={s.headerBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Modifier le profil</Text>
          <TouchableOpacity style={[s.headerBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="checkmark" size={22} color={COLORS.primary} />}
          </TouchableOpacity>
        </View>

        <KeyboardDismissScrollView contentContainerStyle={s.content}>
          <View style={s.card}>
            <Text style={s.sectionTitle}>Photos</Text>
            <View style={s.photosGrid}>
              {photos.map((uri, i) => (
                <View key={`${uri}-${i}`} style={s.photoThumb}>
                  <Image source={{ uri }} style={s.photoImg} resizeMode="cover" />
                  <TouchableOpacity style={s.removeBtn} onPress={() => removePhoto(i)}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 6 && (
                <TouchableOpacity style={s.addPhotoBtn} onPress={pickPhotos} disabled={uploading}>
                  {uploading ? <ActivityIndicator color={COLORS.primary} /> : <>
                    <Ionicons name="images-outline" size={22} color={COLORS.primary} />
                    <Text style={s.addPhotoText}>Ajouter</Text>
                  </>}
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.sectionTitle}>Établissement</Text>
            <InputField label="Nom du responsable" value={form.name} onChangeText={(v) => update('name', v)} placeholder="Votre nom" icon="person-outline" />
            <InputField label="Nom de l'établissement" value={form.businessName} onChangeText={(v) => update('businessName', v)} placeholder="Le Bar Elite" icon="business-outline" />
            <InputField label="Type d'établissement" value={form.businessType} onChangeText={(v) => update('businessType', v)} placeholder="restaurant, bar, club..." icon="pricetag-outline" />
            <LocationAutocompleteFields
              address={form.businessAddress}
              city={form.businessCity}
              postalCode={form.businessPostalCode}
              onChangeAddress={(v) => update('businessAddress', v)}
              onChangeCity={(v) => update('businessCity', v)}
              onChangePostalCode={(v) => update('businessPostalCode', v)}
            />
            <InputField label="Description" value={form.businessDescription} onChangeText={(v) => update('businessDescription', v)} placeholder="Décrivez votre lieu, l'ambiance, la clientèle..." multiline numberOfLines={4} />
          </View>
        </KeyboardDismissScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.md,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1,
    borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.md,
  },
  sectionTitle: { color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: FONTS.bold, marginBottom: SPACING.md },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoThumb: { width: 96, height: 96, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)',
  },
  addPhotoBtn: {
    width: 96, height: 96, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard2, alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  addPhotoText: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
});
