import { Alert, Text, TextInput } from '../../i18n/LocalizedReactNative';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Image, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { getDeliverableLabel } from '../../constants/businessEventOptions';
import { deliverablesAPI, uploadAPI } from '../../services/api';

function DeliverableCard({
  label,
  item,
  submission,
  picking,
  saving,
  onPick,
  onRemoveAsset,
  onChangeNote,
  onSubmit,
}) {
  return (
    <View style={S.card}>
      <View style={S.cardHeader}>
        <View>
          <Text style={S.cardTitle}>{label}</Text>
          <Text style={S.cardSubtitle}>
            {submission ? 'Livrable déjà envoyé, modification possible' : 'Preuve requise après le scan du badge'}
          </Text>
        </View>
        <View style={[S.statusBadge, submission ? S.statusBadgeDone : S.statusBadgePending]}>
          <Text style={[S.statusBadgeText, submission ? S.statusBadgeTextDone : S.statusBadgeTextPending]}>
            {submission ? 'Soumis' : 'À faire'}
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.assetRail}>
        {item.assets.map((asset, index) => (
          <View key={`${asset.uri}-${index}`} style={S.assetThumbWrap}>
            <Image source={{ uri: asset.uri }} style={S.assetThumb} />
            <TouchableOpacity
              style={S.assetRemove}
              onPress={() => onRemoveAsset(index)}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={12} color="#FFF" />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={S.addAssetBtn} onPress={onPick} activeOpacity={0.85} disabled={picking}>
          {picking ? (
            <ActivityIndicator color={COLORS.primaryLight} />
          ) : (
            <>
              <Ionicons name="images-outline" size={20} color={COLORS.primaryLight} />
              <Text style={S.addAssetText}>{submission ? 'Modifier' : 'Ajouter'}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {submission ? (
        <View style={S.lockedBox}>
          <View style={S.lockedRow}>
            <Ionicons name="create-outline" size={16} color={COLORS.primaryLight} />
            <Text style={[S.lockedTitle, { color: COLORS.primaryLight }]}>Modification autorisée</Text>
          </View>
          <Text style={S.lockedText}>Vous pouvez remplacer les fichiers ou mettre à jour le commentaire.</Text>
        </View>
      ) : null}

      <TextInput
        value={item.note}
        onChangeText={onChangeNote}
        placeholder="Commentaire ou précisions"
        placeholderTextColor={COLORS.textMuted}
        style={S.input}
        multiline
      />

      <TouchableOpacity
        style={[S.primaryBtn, (saving || item.assets.length === 0) && S.primaryBtnDisabled]}
        onPress={onSubmit}
        activeOpacity={0.9}
        disabled={saving || item.assets.length === 0}
      >
        {saving ? (
          <ActivityIndicator color={COLORS.bg} />
        ) : (
          <Text style={S.primaryBtnText}>{submission ? 'Mettre à jour le livrable' : 'Envoyer le livrable'}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function DeliverablesScreen({ route, navigation }) {
  const application = route.params?.application || {};
  const event = application.event || {};
  const deliverableTypes = useMemo(
    () => (Array.isArray(event.deliverables) ? event.deliverables.filter(Boolean) : []),
    [event.deliverables]
  );

  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [pickingKey, setPickingKey] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [forms, setForms] = useState(() => (
    deliverableTypes.reduce((acc, key) => {
      acc[key] = { assets: [], note: '' };
      return acc;
    }, {})
  ));

  const loadSubmissions = useCallback(async () => {
    try {
      const data = await deliverablesAPI.mine();
      const mine = (data.submissions || []).filter(
        (item) => item.application === application._id || item.application?._id === application._id
      );
      setSubmissions(mine);
      setForms((prev) => {
        const next = { ...prev };
        deliverableTypes.forEach((key) => {
          const submission = mine.find((item) => item.deliverableType === key);
          if (!submission || prev[key]?.assets?.length) return;
          next[key] = {
            assets: (submission.assetUrls || [submission.assetUrl]).filter(Boolean).map((uri) => ({ uri })),
            note: submission.note || '',
          };
        });
        return next;
      });
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  }, [application._id, deliverableTypes]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const pickAssets = async (deliverableType) => {
    try {
      setPickingKey(deliverableType);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission refusée', 'Autorise l’accès à la photothèque pour envoyer tes preuves.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsMultipleSelection: true,
        selectionLimit: 10,
      });

      if (result.canceled) return;
      const assets = (result.assets || []).map((asset) => ({
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      }));

      setForms((prev) => ({
        ...prev,
        [deliverableType]: {
          ...prev[deliverableType],
          assets: [...(prev[deliverableType]?.assets || []), ...assets],
        },
      }));
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setPickingKey('');
    }
  };

  const submitDeliverable = async (deliverableType) => {
    const current = forms[deliverableType];
    if (!current?.assets?.length) {
      Alert.alert('Preuve requise', 'Ajoute au moins une image avant d’envoyer.');
      return;
    }

    try {
      setSavingKey(deliverableType);
      const uploadedUrls = [];
      for (const asset of current.assets) {
        if (/^https?:\/\//i.test(asset.uri)) {
          uploadedUrls.push(asset.uri);
          continue;
        }
        const uploaded = await uploadAPI.image(asset.uri, {
          mimeType: asset.mimeType,
          fileName: asset.fileName,
        });
        uploadedUrls.push(uploaded.url);
      }

      await deliverablesAPI.submit({
        applicationId: application._id,
        deliverableType,
        assetUrls: uploadedUrls,
        note: current.note?.trim() || '',
      });

      Alert.alert('Livrable envoyé', 'La preuve a bien été transmise à l’établissement.');
      await loadSubmissions();
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setSavingKey('');
    }
  };

  if (!application.checkedIn) {
    return (
      <View style={S.root}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <SafeAreaView style={S.safe}>
          <View style={S.header}>
            <TouchableOpacity style={S.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={S.headerTitle}>Livrables</Text>
            <View style={S.backBtn} />
          </View>
          <View style={S.centerState}>
            <Ionicons name="qr-code-outline" size={42} color={COLORS.primaryLight} />
            <Text style={S.emptyTitle}>Scan requis</Text>
            <Text style={S.emptyText}>Le badge doit être scanné à l’entrée avant d’envoyer les preuves.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={S.safe}>
        <View style={S.header}>
          <TouchableOpacity style={S.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={S.headerTitle}>Livrables</Text>
          <View style={S.backBtn} />
        </View>

        {loading ? (
          <View style={S.centerState}>
            <ActivityIndicator size="large" color={COLORS.primaryLight} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={S.content} showsVerticalScrollIndicator={false}>
            <View style={S.hero}>
              <Text style={S.heroEyebrow}>Événement validé</Text>
              <Text style={S.heroTitle}>{event.title || 'Événement'}</Text>
              <Text style={S.heroText}>
                Envoie les captures, photos ou preuves demandées pour valider ta participation.
              </Text>
            </View>

            {deliverableTypes.length === 0 ? (
              <View style={S.card}>
                <Text style={S.cardTitle}>Aucun livrable demandé</Text>
                <Text style={S.cardSubtitle}>Cet événement ne contient pas encore de livrables configurés.</Text>
              </View>
            ) : (
              deliverableTypes.map((deliverableType) => (
                <DeliverableCard
                  key={deliverableType}
                  label={getDeliverableLabel(deliverableType)}
                  item={forms[deliverableType] || { assets: [], note: '' }}
                  submission={submissions.find((item) => item.deliverableType === deliverableType)}
                  picking={pickingKey === deliverableType}
                  saving={savingKey === deliverableType}
                  onPick={() => pickAssets(deliverableType)}
                  onRemoveAsset={(index) => {
                    setForms((prev) => ({
                      ...prev,
                      [deliverableType]: {
                        ...prev[deliverableType],
                        assets: prev[deliverableType].assets.filter((_, i) => i !== index),
                      },
                    }));
                  }}
                  onChangeNote={(value) => {
                    setForms((prev) => ({
                      ...prev,
                      [deliverableType]: { ...prev[deliverableType], note: value },
                    }));
                  }}
                  onSubmit={() => submitDeliverable(deliverableType)}
                />
              ))
            )}

          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.bold,
  },
  content: {
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  hero: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  heroEyebrow: {
    color: COLORS.primaryLight,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.bold,
    marginTop: SPACING.xs,
  },
  heroText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  cardTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.bold,
  },
  cardSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeDone: {
    backgroundColor: 'rgba(16,217,160,0.14)',
  },
  statusBadgePending: {
    backgroundColor: 'rgba(245,158,11,0.14)',
  },
  statusBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.bold,
  },
  statusBadgeTextDone: { color: COLORS.success },
  statusBadgeTextPending: { color: COLORS.warning },
  lockedBox: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    backgroundColor: 'rgba(16,217,160,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16,217,160,0.18)',
    gap: 8,
  },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lockedTitle: { color: COLORS.success, fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold },
  lockedText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, lineHeight: 20 },
  assetRail: {
    gap: SPACING.sm,
    alignItems: 'center',
  },
  assetThumbWrap: {
    position: 'relative',
  },
  assetThumb: {
    width: 88,
    height: 88,
    borderRadius: 18,
    backgroundColor: COLORS.bgInput,
  },
  assetRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,15,0.85)',
  },
  addAssetBtn: {
    width: 88,
    height: 88,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.bgInput,
  },
  addAssetText: {
    color: COLORS.primaryLight,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.semiBold,
  },
  input: {
    minHeight: 92,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    paddingHorizontal: 14,
    paddingVertical: 14,
    textAlignVertical: 'top',
  },
  primaryBtn: {
    height: 52,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: COLORS.bg,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.bold,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.bold,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
});
