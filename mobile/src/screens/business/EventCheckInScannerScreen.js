import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { applicationsAPI } from '../../services/api';

export default function EventCheckInScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success'|'already'|'error', message, guest }

  const handleScanned = async ({ data }) => {
    if (!scanning || loading) return;
    setScanning(false);
    setLoading(true);
    try {
      const res = await applicationsAPI.checkin(data);
      setResult({ type: 'success', guest: res.guest, message: 'Entrée validée' });
    } catch (err) {
      // 409 = déjà check-in (le message back l'indique)
      const msg = err.message || 'Pass invalide';
      const already = /déjà/i.test(msg);
      setResult({ type: already ? 'already' : 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const scanNext = () => {
    setResult(null);
    setScanning(true);
  };

  if (!permission) {
    return <View style={s.container}><ActivityIndicator color={COLORS.primary} style={{ flex: 1 }} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={[s.container, s.center]}>
        <Ionicons name="camera-outline" size={48} color={COLORS.textMuted} />
        <Text style={s.permTitle}>Accès caméra requis</Text>
        <Text style={s.permText}>Autorise la caméra pour scanner les QR codes d’accès des participants.</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>Autoriser la caméra</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.cancelText}>Retour</Text></TouchableOpacity>
      </View>
    );
  }

  const resultColor = result?.type === 'success' ? COLORS.success : result?.type === 'already' ? COLORS.warning : COLORS.error;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      {scanning ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleScanned}
        />
      ) : null}

      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Scanner un Access Pass</Text>
          <View style={{ width: 40 }} />
        </View>

        {scanning && !result ? (
          <View style={s.scanArea}>
            <View style={s.frame} />
            <Text style={s.hint}>Aligne le QR code du participant dans le cadre</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={s.resultWrap}>
            <ActivityIndicator color="#FFF" size="large" />
          </View>
        ) : result ? (
          <View style={s.resultWrap}>
            <View style={[s.resultCard, { borderColor: resultColor }]}>
              <Ionicons
                name={result.type === 'success' ? 'checkmark-circle' : result.type === 'already' ? 'alert-circle' : 'close-circle'}
                size={56}
                color={resultColor}
              />
              {result.guest ? (
                <View style={s.guestRow}>
                  {result.guest.photo ? (
                    <Image source={{ uri: result.guest.photo }} style={s.guestImg} />
                  ) : (
                    <View style={[s.guestImg, { backgroundColor: COLORS.bgCard2 }]} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.guestName}>{result.guest.name || 'Participant'}</Text>
                    {result.guest.instagram ? <Text style={s.guestSub}>@{String(result.guest.instagram).replace(/^@/, '')}</Text> : null}
                    {result.guest.plusOneRequired || result.guest.guestsRequired > 0 ? (
                      <Text style={s.guestPlus}>
                        {result.guest.guestsRequired > 0 ? `+${result.guest.guestsRequired} invité(s) attendu(s)` : '+1 attendu'}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
              <Text style={[s.resultMsg, { color: resultColor }]}>{result.message}</Text>
            </View>

            <TouchableOpacity style={s.nextBtn} onPress={scanNext} activeOpacity={0.9}>
              <Ionicons name="scan" size={18} color="#0A0A0F" />
              <Text style={s.nextBtnText}>Scanner le suivant</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.md },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.md,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  headerTitle: { color: '#FFF', fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  scanArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.lg },
  frame: { width: 240, height: 240, borderRadius: 24, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)' },
  hint: { color: 'rgba(255,255,255,0.9)', fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold, textAlign: 'center', paddingHorizontal: SPACING.xl },
  resultWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, backgroundColor: 'rgba(0,0,0,0.85)' },
  resultCard: {
    alignSelf: 'stretch', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, borderWidth: 2,
    padding: SPACING.xl, alignItems: 'center', gap: SPACING.md,
  },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, alignSelf: 'stretch' },
  guestImg: { width: 52, height: 52, borderRadius: 26 },
  guestName: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  guestSub: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, marginTop: 2 },
  guestPlus: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold, marginTop: 4 },
  resultMsg: { fontSize: FONTS.sizes.base, fontFamily: FONTS.bold, textAlign: 'center' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    alignSelf: 'stretch', height: 56, borderRadius: RADIUS.full, backgroundColor: COLORS.primary, marginTop: SPACING.lg,
  },
  nextBtnText: { color: '#0A0A0F', fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  permTitle: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  permText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, textAlign: 'center' },
  permBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: RADIUS.full },
  permBtnText: { color: '#0A0A0F', fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  cancelText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginTop: SPACING.sm },
});
