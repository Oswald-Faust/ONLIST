import { Text, Alert, TextInput } from '../../i18n/LocalizedReactNative';
import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Modal, ActivityIndicator, Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { TERMS_OF_USE_TEXT, PRIVACY_POLICY_TEXT } from '../../constants/legalContent';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { usersAPI } from '../../services/api';

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
  const { user, logout, updateUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  // ── Modal mot de passe ──
  const [pwdVisible,    setPwdVisible]    = useState(false);
  const [currentPwd,    setCurrentPwd]    = useState('');
  const [newPwd,        setNewPwd]        = useState('');
  const [confirmPwd,    setConfirmPwd]    = useState('');
  const [showCurrent,   setShowCurrent]   = useState(false);
  const [showNew,       setShowNew]       = useState(false);
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [pwdSaving,     setPwdSaving]     = useState(false);

  // ── Modal legal ──
  const [legalVisible, setLegalVisible] = useState(false);
  const [legalType, setLegalType] = useState('privacy');

  const handleLanguageChange = (nextLanguage) => {
    setLanguage(nextLanguage);
    updateUser({ preferredLanguage: nextLanguage }).catch(() => null);
    usersAPI.updateMe({ preferredLanguage: nextLanguage })
      .then((data) => updateUser(data.user || { preferredLanguage: nextLanguage }))
      .catch(() => null);
  };

  const resetPwdForm = () => {
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    setShowCurrent(false); setShowNew(false); setShowConfirm(false);
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      Alert.alert(t('settings.requiredTitle'), t('settings.requiredMessage'));
      return;
    }
    if (newPwd.length < 8) {
      Alert.alert(t('settings.shortPasswordTitle'), t('settings.shortPasswordMessage'));
      return;
    }
    if (newPwd !== confirmPwd) {
      Alert.alert(t('common.error'), t('settings.passwordMismatch'));
      return;
    }
    setPwdSaving(true);
    try {
      await usersAPI.changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      setPwdVisible(false);
      resetPwdForm();
      Alert.alert(t('common.success'), t('settings.passwordChanged'));
    } catch (e) {
      Alert.alert(t('common.error'), e.message || t('settings.passwordChangeFailed'));
    } finally {
      setPwdSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteTitle'),
      t('settings.deleteWarning'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.delete'),
          style: 'destructive',
          onPress: () => {
            // Double confirmation
            Alert.alert(
              t('settings.finalConfirmation'),
              t('settings.deleteConfirmation', { name: user?.name || t('settings.thisUser') }),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('settings.confirmDelete'),
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await usersAPI.deleteAccount();
                      await logout();
                    } catch (e) {
                      Alert.alert(t('common.error'), e.message || t('settings.deleteFailed'));
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
        <Text style={S.headerTitle}>{t('settings.title')}</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={S.contentPad}
      >
        <Text style={S.sectionLabel}>{t('settings.languageSection')}</Text>
        <View style={S.card}>
          <LanguageItem
            label={t('common.french')}
            code="FR"
            selected={language === 'fr'}
            onPress={() => handleLanguageChange('fr')}
          />
          <View style={S.divider} />
          <LanguageItem
            label={t('common.english')}
            code="EN"
            selected={language === 'en'}
            onPress={() => handleLanguageChange('en')}
          />
        </View>
        <Text style={S.languageHint}>{t('settings.languageHint')}</Text>

        {/* ── Mon compte ── */}
        <Text style={S.sectionLabel}>{t('settings.accountSection')}</Text>
        <View style={S.card}>
          <SettingItem
            icon="lock-closed-outline"
            label={t('settings.changePassword')}
            onPress={() => { resetPwdForm(); setPwdVisible(true); }}
          />
          <View style={S.divider} />
          <SettingItem
            icon="document-outline"
            label={t('settings.terms')}
            onPress={() => { setLegalType('terms'); setLegalVisible(true); }}
          />
          <View style={S.divider} />
          <SettingItem
            icon="document-text-outline"
            label={t('settings.privacy')}
            onPress={() => { setLegalType('privacy'); setLegalVisible(true); }}
          />
          <View style={S.divider} />
          <SettingItem
            icon="trash-outline"
            label={t('settings.deleteAccount')}
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
            <Text style={S.sheetTitle}>{t('settings.changePassword')}</Text>

            <PwdField
              label={t('settings.currentPassword')}
              value={currentPwd}
              onChangeText={setCurrentPwd}
              show={showCurrent}
              onToggle={() => setShowCurrent(v => !v)}
            />
            <PwdField
              label={t('settings.newPassword')}
              value={newPwd}
              onChangeText={setNewPwd}
              show={showNew}
              onToggle={() => setShowNew(v => !v)}
            />
            <PwdField
              label={t('settings.confirmPassword')}
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
                  {newPwd.length < 6
                    ? t('settings.strengthShort')
                    : newPwd.length < 10
                      ? t('settings.strengthFair')
                      : t('settings.strengthStrong')}
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
                : <Text style={S.sheetBtnTxt}>{t('settings.changePassword')}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={S.sheetBtnCancel}
              onPress={() => { setPwdVisible(false); resetPwdForm(); }}
            >
              <Text style={S.sheetBtnCancelTxt}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ════ Modal : Légal ════ */}
      <Modal
        visible={legalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLegalVisible(false)}
      >
        <View style={[S.modalOverlay, { justifyContent: 'flex-end' }]}>
          <View style={[S.privacySheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            <View style={S.sheetHandle} />
            <View style={S.privacyHeader}>
              <Text style={S.sheetTitle}>
                {legalType === 'terms' ? t('settings.terms') : t('settings.privacy')}
              </Text>
              <TouchableOpacity onPress={() => setLegalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '80%' }}>
              <Text style={S.privacyText}>
                {legalType === 'terms' ? TERMS_OF_USE_TEXT : PRIVACY_POLICY_TEXT}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function LanguageItem({ label, code, selected, onPress }) {
  return (
    <TouchableOpacity style={S.item} onPress={onPress} activeOpacity={0.7}>
      <View style={[S.languageCode, selected && S.languageCodeSelected]}>
        <Text style={[S.languageCodeText, selected && S.languageCodeTextSelected]}>{code}</Text>
      </View>
      <Text style={S.itemLabel}>{label}</Text>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={selected ? COLORS.primary : COLORS.textMuted}
      />
    </TouchableOpacity>
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
  languageCode: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  languageCodeSelected: { backgroundColor: 'rgba(201,169,97,0.14)' },
  languageCodeText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.bold },
  languageCodeTextSelected: { color: COLORS.primaryLight },
  languageHint: {
    color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular,
    lineHeight: 18, marginTop: -10, marginBottom: SPACING.lg, paddingHorizontal: 4,
  },

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
