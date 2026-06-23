import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Alert, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../../constants/categories';
import { lieuxAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function LieuCard({ lieu, onEdit, onDelete, navigation, isActive, onSetActive }) {
  const catColor = CATEGORY_COLORS[lieu.category] || COLORS.primary;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('BusinessLieuDetail', { lieuId: lieu._id, lieu })}
    >
      {/* Image / Gradient header */}
      <View style={styles.cardImage}>
        {lieu.photos && lieu.photos.length > 0 ? (
          <Image source={{ uri: lieu.photos[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={['rgba(201,169,97,0.15)', 'rgba(201,169,97,0.03)']}
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(10,10,15,0.85)']}
          style={styles.cardImageOverlay}
        />
        <View style={[styles.catBadge, { backgroundColor: catColor + '22', borderColor: catColor + '55' }]}>
          <Text style={[styles.catBadgeText, { color: catColor }]}>
            {CATEGORY_LABELS[lieu.category] || lieu.category}
          </Text>
        </View>
        {isActive ? (
          <View style={styles.activeBadge}>
            <Ionicons name="checkmark-circle" size={13} color="#0A0A0F" />
            <Text style={styles.activeBadgeText}>Actif</Text>
          </View>
        ) : null}
      </View>

      {/* Infos */}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{lieu.name}</Text>

        <View style={styles.scoreRow}>
          <View style={styles.scoreBadge}>
            <Ionicons name="star" size={14} color={COLORS.primary} />
            <Text style={styles.scoreText}>{lieu.score > 0 ? lieu.score.toFixed(1) : 'Nouveau'}</Text>
          </View>
          <Text style={styles.scoreMeta}>{lieu.reviewsCount || 0} avis</Text>
        </View>

        <View style={styles.cardMeta}>
          {lieu.address ? (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>{lieu.address}{lieu.city ? `, ${lieu.city}` : ''}</Text>
            </View>
          ) : null}
          {lieu.capacity > 0 ? (
            <View style={styles.metaRow}>
              <Ionicons name="people-outline" size={12} color={COLORS.textMuted} />
              <Text style={styles.metaText}>{lieu.capacity} pers. max</Text>
            </View>
          ) : null}
        </View>

        {/* Bascule établissement actif */}
        {isActive ? (
          <View style={styles.activePill}>
            <Ionicons name="checkmark-circle" size={15} color={COLORS.success} />
            <Text style={styles.activePillText}>Établissement actif</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.setActiveBtn} onPress={() => onSetActive(lieu)}>
            <Ionicons name="swap-horizontal" size={15} color={COLORS.textSecondary} />
            <Text style={styles.setActiveText}>Définir comme actif</Text>
          </TouchableOpacity>
        )}

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('CreateEvent', { lieuPreselected: lieu })}
          >
            <Ionicons name="add-circle-outline" size={14} color={COLORS.primary} />
            <Text style={styles.actionBtnText}>Créer un event</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => onEdit(lieu)}>
            <Ionicons name="pencil-outline" size={14} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtnDanger} onPress={() => onDelete(lieu)}>
            <Ionicons name="trash-outline" size={14} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function LieuxScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const [lieux, setLieux] = useState([]);
  const [activeLieu, setActiveLieu] = useState(user?.activeLieu || null);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const load = async () => {
    try {
      const data = await lieuxAPI.mine();
      setLieux(data.lieux || []);
      if (data.activeLieu !== undefined) setActiveLieu(data.activeLieu);
    } catch (err) {
      console.log('Erreur chargement lieux:', err.message);
    }
  };

  const handleSetActive = async (lieu) => {
    const previous = activeLieu;
    setActiveLieu(lieu._id); // optimiste
    try {
      await lieuxAPI.setActive(lieu._id);
      await updateUser({ activeLieu: lieu._id });
    } catch (err) {
      setActiveLieu(previous);
      Alert.alert('Erreur', err.message);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleDelete = (lieu) => {
    Alert.alert(
      'Supprimer le lieu',
      `Supprimer "${lieu.name}" ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              await lieuxAPI.delete(lieu._id);
              setLieux(prev => prev.filter(l => l._id !== lieu._id));
            } catch (err) {
              Alert.alert('Erreur', err.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#0A0A0F', '#0E0D0B']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Mes lieux</Text>
            <Text style={styles.headerSub}>
              {lieux.length} lieu{lieux.length !== 1 ? 'x' : ''}
              {lieux.length > 1 ? ' · touche « Définir comme actif » pour basculer' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('CreateLieu')}
          >
            <LinearGradient colors={COLORS.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtnGrad}>
              <Ionicons name="add" size={18} color="#0A0A0F" />
              <Text style={styles.addBtnText}>Ajouter</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <FlatList
          data={lieux}
          keyExtractor={item => item._id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="business-outline" size={36} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>Aucun lieu</Text>
              <Text style={styles.emptySub}>Créez votre premier lieu pour commencer à organiser des événements.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('CreateLieu')}>
                <LinearGradient colors={COLORS.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.emptyBtnGrad}>
                  <Text style={styles.emptyBtnText}>Créer un lieu</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <LieuCard
              lieu={item}
              navigation={navigation}
              isActive={String(activeLieu) === String(item._id)}
              onSetActive={handleSetActive}
              onEdit={(l) => navigation.navigate('CreateLieu', { lieu: l })}
              onDelete={handleDelete}
            />
          )}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.md,
  },
  headerTitle: { color: COLORS.white, fontSize: FONTS.sizes.xl, fontFamily: FONTS.bold },
  headerSub: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, marginTop: 2 },
  addBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  addBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  addBtnText: { color: '#0A0A0F', fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold },

  list: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, gap: SPACING.md },

  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  cardImage: { height: 140, position: 'relative', backgroundColor: COLORS.bgCard2 },
  cardImageOverlay: { ...StyleSheet.absoluteFillObject },
  catBadge: {
    position: 'absolute', top: 12, left: 12,
    borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4,
  },
  catBadgeText: { fontSize: FONTS.sizes.xs, fontFamily: FONTS.semiBold },
  activeBadge: {
    position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.success, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  activeBadgeText: { color: '#0A0A0F', fontSize: FONTS.sizes.xs, fontFamily: FONTS.bold },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md,
    backgroundColor: 'rgba(16,217,160,0.1)', borderWidth: 1, borderColor: 'rgba(16,217,160,0.25)',
    borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10,
  },
  activePillText: { color: COLORS.success, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  setActiveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: SPACING.md,
    backgroundColor: COLORS.bgCard2, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10,
  },
  setActiveText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },

  cardBody: { padding: SPACING.md },
  cardName: { color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: FONTS.bold, marginBottom: 8 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  scoreBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(201,169,97,0.12)',
    borderWidth: 1, borderColor: 'rgba(201,169,97,0.24)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5,
  },
  scoreText: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  scoreMeta: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  cardMeta: { gap: 6, marginBottom: SPACING.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, flex: 1 },

  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(201,169,97,0.1)', borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.25)', paddingVertical: 10,
  },
  actionBtnText: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
  actionBtnSecondary: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgCard2, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
  },
  actionBtnDanger: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: SPACING.xl },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(201,169,97,0.08)',
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg,
  },
  emptyTitle: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold, marginBottom: SPACING.sm },
  emptySub: { color: COLORS.textSecondary, fontSize: FONTS.sizes.base, fontFamily: FONTS.regular, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  emptyBtn: { borderRadius: RADIUS.full, overflow: 'hidden' },
  emptyBtnGrad: { paddingHorizontal: 28, paddingVertical: 14 },
  emptyBtnText: { color: '#0A0A0F', fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
});
