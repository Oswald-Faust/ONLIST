import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import GradientButton from '../../components/GradientButton';
import InputField from '../../components/InputField';
import { eventsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = [
  { id: 'restaurant', label: 'Restaurant', icon: 'restaurant' },
  { id: 'bar', label: 'Bar', icon: 'wine' },
  { id: 'club', label: 'Club', icon: 'musical-notes' },
  { id: 'spa', label: 'Spa', icon: 'flower' },
  { id: 'sport', label: 'Sport', icon: 'fitness' },
  { id: 'wellness', label: 'Bien-être', icon: 'heart' },
  { id: 'premium', label: 'Premium', icon: 'diamond' },
  { id: 'other', label: 'Autre', icon: 'ellipsis-horizontal' },
];

const MOMENTS = [
  { id: 'morning', label: 'Matin' },
  { id: 'afternoon', label: 'Après-midi' },
  { id: 'evening', label: 'Soir' },
  { id: 'night', label: 'Nuit' },
];

export default function CreateEventScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    venue: '',
    city: user?.businessCity || user?.city || '',
    category: '',
    moment: 'evening',
    date: '',
    maxParticipants: '10',
    offer: '',
    requirements: '',
    isSponsored: false,
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleCreate = async () => {
    if (!form.title) return Alert.alert('Erreur', 'Titre requis');
    if (!form.description) return Alert.alert('Erreur', 'Description requise');
    if (!form.category) return Alert.alert('Erreur', 'Catégorie requise');
    if (!form.city) return Alert.alert('Erreur', 'Ville requise');
    if (!form.date) return Alert.alert('Erreur', 'Date requise (format: YYYY-MM-DD HH:MM)');

    setLoading(true);
    try {
      const dateObj = new Date(form.date);
      if (isNaN(dateObj.getTime())) throw new Error('Format de date invalide. Utilisez: YYYY-MM-DD HH:MM');

      await eventsAPI.create({
        title: form.title,
        description: form.description,
        venue: form.venue,
        city: form.city,
        category: form.category,
        moment: form.moment,
        date: dateObj.toISOString(),
        maxParticipants: parseInt(form.maxParticipants) || 10,
        offer: form.offer,
        requirements: form.requirements,
        isSponsored: form.isSponsored,
      });

      Alert.alert('✓ Événement créé !', 'Votre événement est maintenant visible par les influenceurs.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['rgba(123,47,190,0.1)', 'transparent']} style={StyleSheet.absoluteFill} />

      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Créer un événement</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Informations de base */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations générales</Text>
          <InputField label="Titre de l'événement" placeholder="Jazz Night Under the Stars" value={form.title} onChangeText={v => update('title', v)} icon="create-outline" autoCapitalize="words" />
          <InputField label="Description" placeholder="Décrivez l'ambiance, ce que vous proposez..." value={form.description} onChangeText={v => update('description', v)} multiline numberOfLines={4} />
        </View>

        {/* Catégorie */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Catégorie</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => update('category', cat.id)}
                style={[styles.catCard, form.category === cat.id && styles.catCardActive]}
              >
                {form.category === cat.id ? (
                  <LinearGradient colors={COLORS.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.catCardGrad}>
                    <Ionicons name={cat.icon} size={18} color={COLORS.white} />
                    <Text style={[styles.catCardText, { color: COLORS.white }]}>{cat.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.catCardInner}>
                    <Ionicons name={cat.icon} size={18} color={COLORS.textSecondary} />
                    <Text style={styles.catCardText}>{cat.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Moment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Moment</Text>
          <View style={styles.momentRow}>
            {MOMENTS.map(m => (
              <TouchableOpacity
                key={m.id}
                onPress={() => update('moment', m.id)}
                style={[styles.momentChip, form.moment === m.id && styles.momentChipActive]}
              >
                <Text style={[styles.momentText, form.moment === m.id && styles.momentTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Lieu & Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lieu & Date</Text>
          <InputField label="Nom du lieu (optionnel)" placeholder="Sky Lounge Paris" value={form.venue} onChangeText={v => update('venue', v)} icon="storefront-outline" />
          <InputField label="Ville" placeholder="Paris" value={form.city} onChangeText={v => update('city', v)} icon="map-outline" />
          <InputField label="Date et heure" placeholder="2025-12-31 21:00" value={form.date} onChangeText={v => update('date', v)} icon="calendar-outline" />
          <InputField label="Nombre de places max" placeholder="10" value={form.maxParticipants} onChangeText={v => update('maxParticipants', v)} keyboardType="numeric" icon="people-outline" />
        </View>

        {/* Offre & Exigences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Offre & Critères</Text>
          <InputField label="Ce que vous offrez" placeholder="Dîner gastronomique pour 2, accès VIP..." value={form.offer} onChangeText={v => update('offer', v)} multiline numberOfLines={2} />
          <InputField label="Profil recherché" placeholder="Minimum 10k followers, contenu lifestyle..." value={form.requirements} onChangeText={v => update('requirements', v)} multiline numberOfLines={2} />
        </View>

        {/* Sponsorisé */}
        <View style={styles.sponsoredRow}>
          <View style={styles.sponsoredInfo}>
            <Ionicons name="diamond" size={18} color={COLORS.gold} />
            <View>
              <Text style={styles.sponsoredTitle}>Événement Premium</Text>
              <Text style={styles.sponsoredSub}>Mise en avant dans le feed</Text>
            </View>
          </View>
          <Switch
            value={form.isSponsored}
            onValueChange={v => update('isSponsored', v)}
            trackColor={{ false: COLORS.bgCard2, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>

        <GradientButton title="Publier l'événement" onPress={handleCreate} loading={loading} style={styles.btn} />
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  safeTop: { backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: { color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: 'Poppins_700Bold' },
  scroll: { paddingHorizontal: SPACING.lg },
  section: { marginBottom: SPACING.lg },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: 'Poppins_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  catCard: { width: '47%', borderRadius: RADIUS.md, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  catCardActive: { borderColor: COLORS.primaryLight },
  catCardGrad: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md },
  catCardInner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.bgCard },
  catCardText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_500Medium' },
  momentRow: { flexDirection: 'row', gap: SPACING.sm },
  momentChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  momentChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryLight },
  momentText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_500Medium' },
  momentTextActive: { color: COLORS.white },
  sponsoredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(240,165,0,0.2)',
  },
  sponsoredInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  sponsoredTitle: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_600SemiBold' },
  sponsoredSub: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_400Regular' },
  btn: { marginBottom: SPACING.md },
});
