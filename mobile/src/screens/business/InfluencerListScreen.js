import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Image, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { usersAPI, eventsAPI, applicationsAPI } from '../../services/api';

function InfluencerCard({ influencer, myEvents, onInvite }) {
  const [inviting, setInviting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const formatFollowers = (n) => {
    if (!n) return '0';
    if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n/1000).toFixed(0)}k`;
    return n.toString();
  };

  const handleInvite = async (eventId) => {
    setInviting(true);
    setShowDropdown(false);
    try {
      await onInvite(influencer._id, eventId);
      Alert.alert('✓ Invitation envoyée !', `${influencer.name} a été invité à votre événement.`);
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setInviting(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.avatarContainer}>
          {influencer.photos?.[0]
            ? <Image source={{ uri: influencer.photos[0] }} style={styles.avatar} />
            : (
              <LinearGradient colors={COLORS.gradient} style={styles.avatarGrad}>
                <Text style={styles.avatarText}>{influencer.name[0]}</Text>
              </LinearGradient>
            )
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{influencer.name}</Text>
          <View style={styles.socials}>
            {influencer.instagram && <Text style={styles.handle}>@{influencer.instagram.replace('@','')}</Text>}
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={12} color={COLORS.textMuted} />
              <Text style={styles.statText}>{formatFollowers(influencer.followersCount)}</Text>
            </View>
            {influencer.score > 0 && (
              <View style={styles.statItem}>
                <Ionicons name="star" size={12} color={COLORS.gold} />
                <Text style={styles.statText}>{influencer.score}/10</Text>
              </View>
            )}
            {influencer.city && (
              <View style={styles.statItem}>
                <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                <Text style={styles.statText}>{influencer.city}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Invite button */}
        <TouchableOpacity
          style={styles.inviteBtn}
          onPress={() => setShowDropdown(!showDropdown)}
          disabled={inviting || myEvents.length === 0}
        >
          {inviting
            ? <ActivityIndicator size="small" color={COLORS.white} />
            : <Ionicons name="mail" size={18} color={COLORS.white} />
          }
        </TouchableOpacity>
      </View>

      {/* Dropdown événements */}
      {showDropdown && myEvents.length > 0 && (
        <View style={styles.dropdown}>
          <Text style={styles.dropdownTitle}>Inviter pour :</Text>
          {myEvents.map(ev => (
            <TouchableOpacity key={ev._id} style={styles.dropdownItem} onPress={() => handleInvite(ev._id)}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.primaryLight} />
              <Text style={styles.dropdownItemText} numberOfLines={1}>{ev.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {myEvents.length === 0 && showDropdown && (
        <View style={styles.dropdown}>
          <Text style={styles.noEventsText}>Aucun événement actif. Créez-en un d'abord.</Text>
        </View>
      )}
    </View>
  );
}

export default function InfluencerListScreen({ navigation }) {
  const [influencers, setInfluencers] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [usersData, eventsData] = await Promise.all([
          usersAPI.list({ limit: 50 }),
          eventsAPI.myEvents(),
        ]);
        setInfluencers(usersData.users || []);
        setMyEvents(eventsData.events || []);
      } catch (err) {
        console.log('InfluencerList error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleInvite = async (userId, eventId) => {
    await applicationsAPI.invite({ userId, eventId });
  };

  const filtered = search
    ? influencers.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.city?.toLowerCase().includes(search.toLowerCase()))
    : influencers;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Influenceurs</Text>
          <Text style={styles.headerCount}>{influencers.length}</Text>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par nom, ville..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primaryLight} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <InfluencerCard influencer={item} myEvents={myEvents} onInvite={handleInvite} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Aucun influenceur disponible</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  safe: { backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: { flex: 1, color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: 'Poppins_700Bold' },
  headerCount: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_400Regular' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.lg,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.sizes.base, paddingVertical: 12, fontFamily: 'Poppins_400Regular' },
  list: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardContent: { flexDirection: 'row', alignItems: 'flex-start', padding: SPACING.md, gap: SPACING.md },
  avatarContainer: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  avatarGrad: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.white, fontSize: FONTS.sizes.md, fontFamily: 'Poppins_700Bold' },
  name: { color: COLORS.white, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_700Bold', marginBottom: 2 },
  socials: { marginBottom: 4 },
  handle: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_400Regular' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontFamily: 'Poppins_400Regular' },
  inviteBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  dropdown: {
    borderTopWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    gap: 4,
  },
  dropdownTitle: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, marginBottom: 4, fontFamily: 'Poppins_600SemiBold' },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard2,
    marginBottom: 4,
  },
  dropdownItemText: { color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, flex: 1, fontFamily: 'Poppins_400Regular' },
  noEventsText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, padding: SPACING.sm, fontFamily: 'Poppins_400Regular' },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.sm },
  emptyText: { color: COLORS.textMuted, fontSize: FONTS.sizes.base, fontFamily: 'Poppins_400Regular' },
});
