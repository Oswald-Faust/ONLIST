import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';

const PURPLE = ['#7C3AED', '#5B21B6'];

export default function AccessPassScreen({ route, navigation }) {
  const application = route.params?.application || {};
  const event = application.event || {};
  const code = application.accessCode || '';
  const shortCode = application.accessCodeShort || '';
  const [showCode, setShowCode] = useState(false);

  const eventImage = (event.images && event.images[0]) || null;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={PURPLE} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Partage le QR code ci-dessous avec l’organisateur</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.center}>
          <View style={s.ticket}>
            {eventImage ? (
              <Image source={{ uri: eventImage }} style={s.eventImg} />
            ) : (
              <View style={[s.eventImg, { backgroundColor: '#EEE' }]} />
            )}
            <Text style={s.eventTitle} numberOfLines={2}>{event.title || 'Événement'}</Text>

            <View style={s.divider}>
              <View style={[s.notch, { left: -16 }]} />
              <View style={s.dashed} />
              <View style={[s.notch, { right: -16 }]} />
            </View>

            <View style={s.qrWrap}>
              {code ? (
                <QRCode value={code} size={210} backgroundColor="#FFF" color="#0A0A0F" />
              ) : (
                <Text style={{ color: '#999' }}>Pass indisponible</Text>
              )}
            </View>

            {showCode && shortCode ? (
              <View style={s.codeBox}>
                <Text style={s.codeLabel}>Code manuel</Text>
                <Text style={s.codeValue}>{shortCode}</Text>
              </View>
            ) : null}
          </View>

          <View style={s.helpRow}>
            <Text style={s.helpText}>Problème pour scanner le QR code ?</Text>
            <TouchableOpacity onPress={() => (shortCode ? setShowCode(true) : Alert.alert('Code indisponible'))}>
              <Text style={s.helpLink}>Obtenir le code</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#5B21B6' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: { flex: 1, color: '#FFF', fontSize: FONTS.sizes.base, fontFamily: FONTS.semiBold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg },
  ticket: {
    width: '100%', backgroundColor: '#FFF', borderRadius: 28, padding: SPACING.lg, alignItems: 'center',
  },
  eventImg: { width: 90, height: 90, borderRadius: 45, marginTop: 8 },
  eventTitle: { color: '#0A0A0F', fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold, textAlign: 'center', marginTop: SPACING.md },
  divider: { width: '100%', height: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: SPACING.lg },
  notch: { position: 'absolute', width: 32, height: 32, borderRadius: 16, backgroundColor: '#5B21B6' },
  dashed: { flex: 1, borderBottomWidth: 2, borderColor: '#E5E0EC', borderStyle: 'dashed' },
  qrWrap: { padding: SPACING.md, alignItems: 'center', justifyContent: 'center' },
  codeBox: { marginTop: SPACING.md, alignItems: 'center' },
  codeLabel: { color: '#999', fontSize: FONTS.sizes.xs, fontFamily: FONTS.regular },
  codeValue: { color: '#0A0A0F', fontSize: FONTS.sizes.xl, fontFamily: FONTS.bold, letterSpacing: 3, marginTop: 4 },
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACING.xl },
  helpText: { color: 'rgba(255,255,255,0.8)', fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular },
  helpLink: { color: '#FFF', fontSize: FONTS.sizes.sm, fontFamily: FONTS.bold, textDecorationLine: 'underline' },
});
