import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  StatusBar, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import EventCard from '../../components/EventCard';
import { eventsAPI } from '../../services/api';

const CATEGORIES = [
  { id: '', label: 'Tout', icon: 'apps' },
  { id: 'restaurant', label: 'Restaurant', icon: 'restaurant' },
  { id: 'bar', label: 'Bar', icon: 'wine' },
  { id: 'club', label: 'Club', icon: 'musical-notes' },
  { id: 'spa', label: 'Spa', icon: 'flower' },
  { id: 'sport', label: 'Sport', icon: 'fitness' },
  { id: 'wellness', label: 'Bien-être', icon: 'heart' },
  { id: 'premium', label: 'Premium', icon: 'diamond' },
];

const MOMENTS = [
  { id: '', label: 'Tout' },
  { id: 'morning', label: 'Matin' },
  { id: 'afternoon', label: 'Après-midi' },
  { id: 'evening', label: 'Soir' },
  { id: 'night', label: 'Nuit' },
];

const CITIES = ['', 'Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Nice', 'Toulouse', 'Abidjan', 'Dakar'];

export default function ExploreScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [moment, setMoment] = useState('');
  const [city, setCity] = useState('');

  const fetchEvents = useCallback(async (reset = true) => {
    try {
      const p = reset ? 1 : page + 1;
      const params = { page: p, limit: 10 };
      if (category) params.category = category;
      if (moment) params.moment = moment;
      if (city) params.city = city;

      const data = await eventsAPI.list(params);
      const newEvents = data.events || [];
      setTotal(data.total || 0);
      if (reset) {
        setEvents(newEvents);
        setPage(1);
      } else {
        setEvents(prev => [...prev, ...newEvents]);
        setPage(p);
      }
    } catch (err) {
      console.log('Explore error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [category, moment, city, page]);

  useEffect(() => {
    setLoading(true);
    fetchEvents(true);
  }, [category, moment, city]);

  const onRefresh = () => { setRefreshing(true); fetchEvents(true); };
  const loadMore = () => {
    if (!loadingMore && events.length < total) {
      setLoadingMore(true);
      fetchEvents(false);
    }
  };

  const displayedEvents = search
    ? events.filter(e => e.title?.toLowerCase().includes(search.toLowerCase()) || e.venue?.toLowerCase().includes(search.toLowerCase()))
    : events;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SafeAreaView edges={['top']} style={styles.safeTop}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Événements à venir</Text>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="options" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un événement..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtres - ville */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow} contentContainerStyle={{ paddingHorizontal: SPACING.lg }}>
          {CITIES.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => setCity(c)}
              style={[styles.filterChip, city === c && styles.filterChipActive]}
            >
              {city === c && c && <Ionicons name="location" size={12} color={COLORS.white} style={{ marginRight: 4 }} />}
              <Text style={[styles.filterChipText, city === c && styles.filterChipTextActive]}>
                {c || 'Toutes villes'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Filtres - moment */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow} contentContainerStyle={{ paddingHorizontal: SPACING.lg }}>
          {MOMENTS.map(m => (
            <TouchableOpacity
              key={m.id}
              onPress={() => setMoment(m.id)}
              style={[styles.filterChip, styles.filterChipSmall, moment === m.id && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, moment === m.id && styles.filterChipTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* Catégories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow} contentContainerStyle={{ paddingHorizontal: SPACING.lg }}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => setCategory(cat.id)}
            style={[styles.catChip, category === cat.id && styles.catChipActive]}
          >
            {category === cat.id ? (
              <LinearGradient colors={COLORS.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.catChipGradient}>
                <Ionicons name={cat.icon} size={14} color={COLORS.white} />
                <Text style={[styles.catChipText, styles.catChipTextActive]}>{cat.label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.catChipInner}>
                <Ionicons name={cat.icon} size={14} color={COLORS.textSecondary} />
                <Text style={styles.catChipText}>{cat.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Résultats */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {loading ? 'Chargement...' : `${displayedEvents.length} événements trouvés`}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primaryLight} size="large" />
        </View>
      ) : (
        <FlatList
          data={displayedEvents}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onPress={() => navigation.navigate('EventDetail', { event: item })}
              style={styles.eventCard}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryLight} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.primaryLight} style={{ marginVertical: SPACING.lg }} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Aucun événement trouvé</Text>
              <Text style={styles.emptySubText}>Essayez de modifier vos filtres</Text>
            </View>
          }
        />
      )}

      {/* Footer avec nb total */}
      {!loading && events.length > 0 && events.length < total && (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
          <Text style={styles.loadMoreText}>{events.length} chargés sur {total} — Voir plus</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  safeTop: { backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontFamily: 'Poppins_700Bold' },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: { marginRight: SPACING.sm },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.sizes.base, paddingVertical: 12, fontFamily: 'Poppins_400Regular' },
  filtersRow: { marginBottom: SPACING.xs },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipSmall: { paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryLight },
  filterChipText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_500Medium' },
  filterChipTextActive: { color: COLORS.white },
  catRow: { marginBottom: SPACING.sm },
  catChip: { marginRight: SPACING.sm, borderRadius: RADIUS.md, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  catChipActive: { borderColor: COLORS.primaryLight },
  catChipGradient: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.md, paddingVertical: 8 },
  catChipInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.md, paddingVertical: 8, backgroundColor: COLORS.bgCard },
  catChipText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_500Medium' },
  catChipTextActive: { color: COLORS.white },
  resultsHeader: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  resultsText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_400Regular' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: 120 },
  eventCard: { marginBottom: SPACING.md },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.sm },
  emptyText: { color: COLORS.textPrimary, fontSize: FONTS.sizes.md, fontFamily: 'Poppins_600SemiBold' },
  emptySubText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_400Regular' },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  loadMoreText: { color: COLORS.primaryLight, fontSize: FONTS.sizes.sm, fontFamily: 'Poppins_400Regular' },
});
