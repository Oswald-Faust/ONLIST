import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  StatusBar, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import EventCard from '../../components/EventCard';
import { eventsAPI, metaAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = [
  { id: '', label: 'Tout', icon: 'grid-outline' },
  { id: 'restaurant', label: 'Restaurant', icon: 'restaurant-outline' },
  { id: 'bar', label: 'Bar', icon: 'wine-outline' },
  { id: 'club', label: 'Club', icon: 'musical-notes-outline' },
  { id: 'spa', label: 'Spa', icon: 'flower-outline' },
  { id: 'sport', label: 'Sport', icon: 'fitness-outline' },
  { id: 'wellness', label: 'Bien-être', icon: 'heart-outline' },
  { id: 'premium', label: 'VIP', icon: 'diamond-outline' },
];

const MOMENTS = [
  { id: '', label: 'Tout moment' },
  { id: 'morning', label: 'Matin' },
  { id: 'afternoon', label: 'Après-midi' },
  { id: 'evening', label: 'Soir' },
  { id: 'night', label: 'Nuit' },
];

const DATE_FILTERS = [
  { id: '', label: 'Toutes dates' },
  { id: 'today', label: 'Aujourd’hui' },
  { id: 'tomorrow', label: 'Demain' },
  { id: 'week', label: 'Cette semaine' },
  { id: 'custom', label: 'Choisir une date' },
];

const toLocalDayKey = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const isSameDay = (left, right) => toLocalDayKey(left) === toLocalDayKey(right);

export default function ExploreScreen({ navigation }) {
  const { user } = useAuth();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [moment, setMoment] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [customDate, setCustomDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Ville : par défaut celle de l'utilisateur, sinon "toutes"
  const [city, setCity] = useState(user?.selectedCity || '');
  const [availableCities, setAvailableCities] = useState([]);

  // Charger les villes qui ont des événements
  useEffect(() => {
    metaAPI.eventCities()
      .then(data => {
        if (data?.cities?.length) {
          setAvailableCities(data.cities);
        }
      })
      .catch(() => {});
  }, []);

  // Sync city avec user.selectedCity si l'utilisateur change de ville
  useEffect(() => {
    if (user?.selectedCity) setCity(user.selectedCity);
  }, [user?.selectedCity]);

  const fetchEvents = useCallback(async (reset = true) => {
    try {
      const p = reset ? 1 : page + 1;
      const params = { page: p, limit: 50 };
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

  const handleSelectCity = (nextCity) => {
    setLoading(true);
    setRefreshing(false);
    setSearch('');
    setCity(nextCity);
  };

  const handleSelectMoment = (nextMoment) => {
    setLoading(true);
    setRefreshing(false);
    setMoment(nextMoment);
  };

  const handleSelectCategory = (nextCategory) => {
    setLoading(true);
    setRefreshing(false);
    setCategory(nextCategory);
  };

  const handleSelectDateFilter = (nextDateFilter) => {
    if (nextDateFilter === 'custom') {
      setShowDatePicker(true);
      return;
    }
    setDateFilter(nextDateFilter);
    if (nextDateFilter !== 'custom') {
      setCustomDate(null);
    }
  };

  const handleResetFilters = () => {
    setLoading(true);
    setRefreshing(false);
    setSearch('');
    setCategory('');
    setMoment('');
    setDateFilter('');
    setCustomDate(null);
    setCity('');
  };

  const onRefresh = () => { setRefreshing(true); fetchEvents(true); };
  const loadMore = () => {
    if (!loadingMore && events.length < total) {
      setLoadingMore(true);
      fetchEvents(false);
    }
  };

  const displayedEvents = events.filter((e) => {
    const matchesSearch = !search
      || e.title?.toLowerCase().includes(search.toLowerCase())
      || e.venue?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (!dateFilter && !customDate) return true;
    if (!e?.date) return false;

    const eventDate = new Date(e.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter === 'today') {
      return isSameDay(eventDate, today);
    }

    if (dateFilter === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return isSameDay(eventDate, tomorrow);
    }

    if (dateFilter === 'week') {
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 7);
      return eventDate >= today && eventDate < endOfWeek;
    }

    if (dateFilter === 'custom' && customDate) {
      return isSameDay(eventDate, customDate);
    }

    return true;
  });

  // Construire la liste villes pour le filtre : ville user en premier, puis villes avec events
  const cityOptions = ['', ...availableCities];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SafeAreaView edges={['top']} style={styles.safeTop}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Explorer</Text>
            <Text style={styles.headerSub}>
              {city ? `Événements à ${city}` : 'Tous les événements'}
            </Text>
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="options-outline" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un événement, un lieu..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filtersSection}>
          {/* Filtres ville */}
          {cityOptions.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filtersRow}
              contentContainerStyle={styles.chipsContent}
            >
              {cityOptions.map(c => {
                const active = city === c;
                return (
                  <TouchableOpacity
                    key={c || '__all__'}
                    onPress={() => handleSelectCity(c)}
                    activeOpacity={0.75}
                    style={styles.chipWrap}
                  >
                    {active ? (
                      <LinearGradient
                        colors={COLORS.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.cityChipActive}
                      >
                        {c ? <Ionicons name="location" size={11} color={COLORS.bg} /> : null}
                        <Text style={styles.cityChipTxtActive}>{c || 'Toutes'}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.cityChip}>
                        {c ? <Ionicons name="location-outline" size={11} color={COLORS.textMuted} /> : null}
                        <Text style={styles.cityChipTxt}>{c || 'Toutes'}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Filtres moment */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersRow}
            contentContainerStyle={styles.chipsContent}
          >
            {MOMENTS.map(m => {
              const active = moment === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => handleSelectMoment(m.id)}
                  style={[styles.momentChip, active && styles.momentChipActive, styles.chipWrap]}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.momentChipTxt, active && styles.momentChipTxtActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersRow}
            contentContainerStyle={styles.chipsContent}
          >
            {DATE_FILTERS.map((filter) => {
              const active = filter.id === 'custom'
                ? dateFilter === 'custom' && !!customDate
                : dateFilter === filter.id;
              const label = filter.id === 'custom' && customDate
                ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(customDate)
                : filter.label;

              return (
                <TouchableOpacity
                  key={filter.id || '__all_dates__'}
                  onPress={() => handleSelectDateFilter(filter.id)}
                  style={[styles.momentChip, active && styles.momentChipActive, styles.chipWrap]}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.momentChipTxt, active && styles.momentChipTxtActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Catégories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catRow}
        contentContainerStyle={styles.chipsContent}
      >
        {CATEGORIES.map(cat => {
          const active = category === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => handleSelectCategory(cat.id)}
              activeOpacity={0.75}
              style={styles.chipWrap}
            >
              {active ? (
                <LinearGradient
                  colors={COLORS.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.catChipActive}
                >
                  <Ionicons name={cat.icon} size={13} color={COLORS.bg} />
                  <Text style={styles.catChipTxtActive}>{cat.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.catChip}>
                  <Ionicons name={cat.icon} size={13} color={COLORS.textMuted} />
                  <Text style={styles.catChipTxt}>{cat.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Compteur résultats */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {loading
            ? 'Chargement...'
            : `${displayedEvents.length} événement${displayedEvents.length !== 1 ? 's' : ''}${city ? ` à ${city}` : ''}`}
        </Text>
        {(category || moment || city || dateFilter || customDate) && (
          <TouchableOpacity onPress={handleResetFilters}>
            <Text style={styles.resetFilters}>Réinitialiser</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Liste */}
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primaryLight}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={COLORS.primaryLight} style={{ marginVertical: SPACING.lg }} />
              : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={28} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Aucun événement</Text>
              <Text style={styles.emptyText}>
                {city
                  ? `Pas d'événements à ${city} pour ces filtres.`
                  : 'Essaie de modifier les filtres.'}
              </Text>
              {city && (
                <TouchableOpacity style={styles.emptyBtn} onPress={() => handleSelectCity('')}>
                  <Text style={styles.emptyBtnTxt}>Voir toutes les villes</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {showDatePicker && (
        <DateTimePicker
          value={customDate || new Date()}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (event.type === 'set' && date) {
              setCustomDate(date);
              setDateFilter('custom');
            }
          }}
        />
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
  headerTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.bold,
  },
  headerSub: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
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
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: { marginRight: SPACING.sm },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    paddingVertical: 11,
    fontFamily: FONTS.regular,
  },

  filtersSection: {
    paddingBottom: SPACING.xs,
  },
  filtersRow: {
    flexGrow: 0,
    minHeight: 42,
    marginBottom: 8,
  },
  chipsContent: {
    paddingHorizontal: SPACING.lg,
    paddingRight: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipWrap: { marginRight: SPACING.sm },

  // City chips
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.full,
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cityChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: RADIUS.full,
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  cityChipTxt: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium },
  cityChipTxtActive: { color: COLORS.bg, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },

  // Moment chips
  momentChip: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.full,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  momentChipActive: {
    backgroundColor: 'rgba(201,169,97,0.15)',
    borderColor: 'rgba(201,169,97,0.3)',
  },
  momentChipTxt: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium },
  momentChipTxtActive: { color: COLORS.primaryLight, fontFamily: FONTS.semiBold },

  // Cat chips
  catRow: {
    flexGrow: 0,
    minHeight: 44,
    marginBottom: SPACING.xs,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    minHeight: 38,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: RADIUS.md,
    minHeight: 38,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  catChipTxt: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontFamily: FONTS.medium },
  catChipTxtActive: { color: COLORS.bg, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },

  // Résultats
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 2,
    paddingBottom: SPACING.sm,
  },
  resultsText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
  },
  resetFilters: {
    color: COLORS.primaryLight,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: 120, gap: SPACING.md },
  eventCard: {},

  // Empty
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: SPACING.md },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { color: COLORS.textPrimary, fontSize: FONTS.sizes.md, fontFamily: FONTS.semiBold },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: 'rgba(201,169,97,0.1)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyBtnTxt: { color: COLORS.primary, fontSize: FONTS.sizes.sm, fontFamily: FONTS.semiBold },
});
