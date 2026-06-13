import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Image, ScrollView, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { applicationsAPI } from '../../services/api';

const PURPLE = ['#7C3AED', '#5B21B6'];

function formatRange(event) {
  if (!event?.date) return '';
  const start = new Date(event.date);
  const fmt = (d) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = (t) => (t ? ` ${t}` : '');
  let str = `${fmt(start)}${time(event.startTime)}`;
  if (event.endTime) str += ` - ${event.endTime}`;
  return str;
}

export default function AttendanceConfirmedScreen({ route, navigation }) {
  const initial = route.params?.application || {};
  const [application, setApplication] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const event = application.event || {};

  useEffect(() => {
    // Auto-confirmation si la candidature est acceptée mais pas encore confirmée
    const autoConfirm = async () => {
      if (application.status === 'accepted' && !application.confirmed && application._id) {
        try {
          setConfirming(true);
          const data = await applicationsAPI.confirm(application._id);
          if (data?.application) setApplication((prev) => ({ ...prev, ...data.application }));
        } catch (_) {
          // silencieux : l'écran reste utilisable même si la confirmation a déjà eu lieu
        } finally {
          setConfirming(false);
        }
      }
    };
    autoConfirm();
  }, []);

  const addToCalendar = () => {
    if (!event?.date) return;
    const start = new Date(event.date);
    const end = event.endTime ? new Date(start.getTime() + 3 * 60 * 60 * 1000) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const toGCal = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title || 'Événement ONLIST')}&dates=${toGCal(start)}/${toGCal(end)}&location=${encodeURIComponent(event.city || '')}`;
    Linking.openURL(url).catch(() => {});
  };

  const eventImage = (event.images && event.images[0]) || null;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={PURPLE} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.checkCircle}>
            {confirming ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Ionicons name="checkmark" size={44} color="#FFF" />
            )}
          </View>

          <Text style={s.title}>Votre présence{'\n'}a été confirmée</Text>

          <View style={s.eventRow}>
            {eventImage ? <Image source={{ uri: eventImage }} style={s.eventImg} /> : <View style={[s.eventImg, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />}
            <View style={{ flex: 1 }}>
              <Text style={s.eventTitle} numberOfLines={2}>{event.title || 'Événement'}</Text>
              <Text style={s.eventDate}>{formatRange(event)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={s.accessBtn}
            onPress={() => navigation.navigate('AccessPass', { application })}
            activeOpacity={0.9}
          >
            <Ionicons name="qr-code-outline" size={20} color="#5B21B6" />
            <Text style={s.accessBtnText}>Access Pass</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.calBtn} onPress={addToCalendar} activeOpacity={0.85}>
            <Ionicons name="calendar-outline" size={18} color="#FFF" />
            <Text style={s.calBtnText}>Ajouter au calendrier</Text>
          </TouchableOpacity>

          {(event.guestsRequired > 0 || event.plusOneMode === 'plus_one_required') ? (
            <View style={s.guestBox}>
              <View style={s.guestHead}>
                <Ionicons name="people" size={18} color="#EC4899" />
                <Text style={s.guestTitle}>
                  {event.guestsRequired > 0 ? `+${event.guestsRequired} invité(s) requis` : '+1 requis'}
                </Text>
              </View>
              <Text style={s.guestText}>
                Tu dois venir accompagné{event.guestsRequired > 1 ? `(e) de ${event.guestsRequired} participants` : '(e)'}. Assure leur présence et soumets leurs avis dans « À livrer ».
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity style={s.okBtn} onPress={() => navigation.goBack()} activeOpacity={0.9}>
            <Text style={s.okBtnText}>Okay</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#5B21B6' },
  scroll: { padding: SPACING.lg, paddingTop: SPACING.xxl, alignItems: 'center' },
  checkCircle: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.success,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg,
  },
  title: { color: '#FFF', fontSize: 30, fontFamily: FONTS.bold, textAlign: 'center', marginBottom: SPACING.xl },
  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md, alignSelf: 'stretch',
    marginBottom: SPACING.xl,
  },
  eventImg: { width: 56, height: 56, borderRadius: 28 },
  eventTitle: { color: '#FFF', fontSize: FONTS.sizes.lg, fontFamily: FONTS.bold },
  eventDate: { color: 'rgba(255,255,255,0.85)', fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, marginTop: 4 },
  accessBtn: {
    alignSelf: 'stretch', height: 56, borderRadius: RADIUS.lg, backgroundColor: '#FFF',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: SPACING.md,
  },
  accessBtnText: { color: '#5B21B6', fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  calBtn: {
    alignSelf: 'stretch', height: 56, borderRadius: RADIUS.lg, backgroundColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  calBtnText: { color: '#FFF', fontSize: FONTS.sizes.base, fontFamily: FONTS.semiBold },
  guestBox: {
    alignSelf: 'stretch', marginTop: SPACING.xl, borderRadius: RADIUS.lg, padding: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(236,72,153,0.4)',
  },
  guestHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  guestTitle: { color: '#FFF', fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
  guestText: { color: 'rgba(255,255,255,0.85)', fontSize: FONTS.sizes.sm, fontFamily: FONTS.regular, lineHeight: 20 },
  footer: { padding: SPACING.lg },
  okBtn: { height: 56, borderRadius: RADIUS.full, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
  okBtnText: { color: '#5B21B6', fontSize: FONTS.sizes.base, fontFamily: FONTS.bold },
});
