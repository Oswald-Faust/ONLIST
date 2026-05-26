import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, Modal, TextInput, ActivityIndicator, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../services/api';

// ─── Texte de la politique de confidentialité ─────────────────────────────────
const PRIVACY_TEXT = `Politique de Confidentialité — ONLIST

Dernière mise à jour : Janvier 2025

1. Collecte des données
ONLIST collecte les informations que vous nous fournissez directement lors de la création de votre compte : nom, adresse e-mail, numéro de téléphone, date de naissance, photos de profil, comptes de réseaux sociaux.

2. Utilisation des données
Vos données sont utilisées pour :
- Gérer votre compte et votre profil
- Vous mettre en relation avec des établissements partenaires
- Vous envoyer des notifications relatives aux événements
- Améliorer nos services

3. Partage des données
Vos informations de profil (nom, photos, réseaux sociaux, statistiques) sont visibles par les établissements partenaires dans le cadre des événements auxquels vous postulez. Nous ne vendons jamais vos données à des tiers.

4. Conservation des données
Vos données sont conservées tant que votre compte est actif. Vous pouvez demander la suppression de vos données à tout moment via les paramètres de l'application.

5. Sécurité
Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour protéger vos données contre tout accès non autorisé.

6. Vos droits
Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données. Contactez-nous à : privacy@onlist.app

7. Contact
ONLIST SAS — contact@onlist.app`;

// ─── Composant item de paramètre ─────────────────────────────────────────────
function SettingItem({ icon, label, onPress, destructive, chevron = true }) {
  return (
    <TouchableOpacity style={S.item} onPress={onPress} activeOpacity={0.7}>
      <View style={[S.itemIcon, destructive && S.itemIconRed]}>
        <Ionicons name={icon} size={20} color={destructive ? COLORS.error : COLORS.textSecondary} />
      </View>
      <Text style={[S.itemLabel, destructive && { color: COLORS.error }]}>{label}</Text>
      {chevron && (
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      )}
    </TouchableOpacity>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────
export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  // ── Modal mot de passe ──
  const [pwdVisible,    setPwdVisible]    = useState(false);
  const [currentPwd,    setCurrentPwd]    = useState('');
  const [newPwd,        setNewPwd]        = useState('');
  const [confirmPwd,    setConfirmPwd]    = useState('');
  const [showCurrent,   setShowCurrent]   = useState(false);
  const [showNew,       setShowNew]       = useState(false);
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [pwdSaving,     setPwdSaving]     = useState(false);

  // ── Modal privacy ──
  const [privacyVisible, setPrivacyVisible] = useState(false);

  const resetPwdForm = () => {
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    setShowCurrent(false); setShowNew(false); setShowConfirm(false);
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs.');
      return;
    }
    if (newPwd.length < 8) {
      Alert.alert('Mot de passe trop court', 'Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPwd !== confirmPwd) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    setPwdSaving(true);
    try {
      await usersAPI.changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      setPwdVisible(false);
      resetPwdForm();
      Alert.alert('Succès', 'Votre mot de passe a été modifié avec succès.');
    } catch (e) {
      Alert.alert('Erreur', e.message || 'Impossible de modifier le mot de passe.');
    } finally {
      setPwdSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est irréversible. Toutes vos données seront définitivement supprimées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            // Double confirmation
            Alert.alert(
              'Confirmation finale',
              `Êtes-vous certain de vouloir supprimer le compte de ${user?.name || 'cet utilisateur'} ? Cette action ne peut pas être annulée.`,
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Oui, supprimer',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await usersAPI.deleteAccount();
                      await logout();
                    } catch (e) {
                      Alert.alert('Erreur', e.message || 'Impossible de supprimer le compte.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <View style={[S.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={S.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={S.headerTitle}>Paramètres</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={S.contentPad}
      >
        {/* ── Mon compte ── */}
        <Text style={S.sectionLabel}>MON COMPTE</Text>
        <View style={S.card}>
          <SettingItem
            icon="lock-closed-outline"
            label="Modifier le mot de passe"
            onPress={() => { resetPwdForm(); setPwdVisible(true); }}
          />
          <View style={S.divider} />
          <SettingItem
            icon="document-text-outline"
            label="Politique de confidentialité"
            onPress={() => setPrivacyVisible(true)}
          />
          <View style={S.divider} />
          <SettingItem
            icon="trash-outline"
            label="Supprimer mon compte"
            onPress={handleDeleteAccount}
            destructive
          />
        </View>

        {/* ── Version ── */}
        <Text style={S.version}>ONLIST 2025 · Version 1.0.0</Text>
      </ScrollView>

      {/* ════ Modal : Modifier le mot de passe ════ */}
      <Modal
        visible={pwdVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setPwdVisible(false); resetPwdForm(); }}
      >
        <View style={S.modalOverlay}>
          <View style={[S.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
            <View style={S.sheetHandle} />
            <Text style={S.sheetTitle}>Modifier le mot de passe</Text>

            <PwdField
              label="Mot de passe actuel"
              value={currentPwd}
              onChangeText={setCurrentPwd}
              show={showCurrent}
              onToggle={() => setShowCurrent(v => !v)}
            />
            <PwdField
              label="Nouveau mot de passe"
              value={newPwd}
              onChangeText={setNewPwd}
              show={showNew}
              onToggle={() => setShowNew(v => !v)}
            />
            <PwdField
              label="Confirmer le nouveau mot de passe"
              value={confirmPwd}
              onChangeText={setConfirmPwd}
              show={showConfirm}
              onToggle={() => setShowConfirm(v => !v)}
              isLast
            />

            {/* Indicateur de force */}
            {newPwd.length > 0 && (
              <View style={S.pwdStrengthRow}>
                {[1, 2, 3, 4].map(i => (
                  <View
                    key={i}
                    style={[
                      S.pwdStrengthBar,
                      {
                        backgroundColor:
                          newPwd.length >= i * 3
                            ? (newPwd.length >= 12 ? COLORS.success : COLORS.primary)
                            : COLORS.border,
                      },
                    ]}
                  />
                ))}
                <Text style={S.pwdStrengthTxt}>
                  {newPwd.length < 6 ? 'Trop court' : newPwd.length < 10 ? 'Correct' : 'Fort'}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[S.sheetBtn, pwdSaving && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={pwdSaving}
            >
              {pwdSaving
                ? <ActivityIndicator color={COLORS.bg} size="small" />
                : <Text style={S.sheetBtnTxt}>Modifier le mot de passe</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={S.sheetBtnCancel}
              onPress={() => { setPwdVisible(false); resetPwdForm(); }}
            >
              <Text style={S.sheetBtnCancelTxt}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ════ Modal : Politique de confidentialité ════ */}
      <Modal
        visible={privacyVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPrivacyVisible(false)}
      >
        <View style={[S.modalOverlay, { justifyContent: 'flex-end' }]}>
          <View style={[S.privacySheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            <View style={S.sheetHandle} />
            <View style={S.privacyHeader}>
              <Text style={S.sheetTitle}>Politique de confidentialité</Text>
              <TouchableOpacity onPress={() => setPrivacyVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '80%' }}>
              <Text style={S.privacyText}>{PRIVACY_TEXT}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Champ mot de passe ───────────────────────────────────────────────────────
function PwdField({ label, value, onChangeText, show, onToggle, isLast }) {
  return (
    <View style={[P.wrap, !isLast && P.wrapBorder]}>
      <Text style={P.label}>{label}</Text>
      <View style={P.row}>
        <TextInput
          style={P.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          selectionColor={COLORS.primary}
        />
        <TouchableOpacity onPress={onToggle} style={P.eye}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const P = StyleSheet.create({
  wrap: { paddingVertical: 14 },
  wrapBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  label: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.medium, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.sizes.base, fontFamily: FONTS.regular },
  eye: { padding: 4 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    color: COLORS.textPrimary, fontSize: FONTS.sizes.base, fontFamily: FONTS.bold,
  },

  contentPad: { padding: SPACING.lg, paddingBottom: 60 },

  sectionLabel: {
    color: COLORS.textMuted, fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.semiBold, letterSpacing: 0.8,
    textTransform: 'uppercase', marginBottom: 10, marginLeft: 4,
  },

  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden', marginBottom: SPACING.lg,
  },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 56 },

  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: 16, gap: 14,
  },
  itemIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  itemIconRed: { backgroundColor: 'rgba(255,59,48,0.1)' },
  itemLabel: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.sizes.base, fontFamily: FONTS.medium },

  version: {
    color: COLORS.textMuted, fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular, textAlign: 'center', marginTop: 8,
  },

  // ── Modals ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },

  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    borderWidth: 1, borderColor: COLORS.border,
    paddingTop: 12, paddingHorizontal: SPACING.lg,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: {
    color: COLORS.textPrimary, fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.bold, marginBottom: SPACING.md,
  },

  // Indicateur de force
  pwdStrengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 4 },
  pwdStrengthBar: { flex: 1, height: 4, borderRadius: 2 },
  pwdStrengthTxt: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.medium, minWidth: 50 },

  sheetBtn: {
    height: 52, borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginTop: SPACING.md,
  },
  sheetBtnTxt: { color: COLORS.bg, fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },

  sheetBtnCancel: {
    height: 52, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
  },
  sheetBtnCancelTxt: { color: COLORS.textMuted, fontSize: FONTS.sizes.base, fontFamily: FONTS.medium },

  // Privacy
  privacySheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    borderWidth: 1, borderColor: COLORS.border,
    paddingTop: 12, paddingHorizontal: SPACING.lg,
    maxHeight: '90%',
  },
  privacyHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: SPACING.md,
  },
  privacyText: {
    color: COLORS.textSecondary, fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular, lineHeight: 22,
    paddingBottom: SPACING.xl,
  },
});
