import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  StatusBar, Image, ActivityIndicator, Dimensions, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { eventsAPI, applicationsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const { width: W } = Dimensions.get('window');

// ─── FAQ en Français ────────────────────────────────────────────────────────
const FAQS = [
  {
    id: 'faq1',
    question: "Comment s'inscrire à un événement ?",
    answer: "Parcourez les événements, choisissez-en un qui vous plaît et appuyez sur 'Postuler'. L'établissement examinera votre demande et vous informera dès qu'elle sera acceptée."
  },
  {
    id: 'faq2',
    question: "Quel est le code vestimentaire (dresscode) ?",
    answer: "Chaque événement a son propre dresscode (ex: Élégant, Décontracté, Chic). Il est indiqué dans les détails de l'événement. Merci de le respecter."
  },
  {
    id: 'faq3',
    question: "Comment changer de ville ?",
    answer: "Vous pouvez changer de ville à tout moment en appuyant sur le sélecteur de ville dans l'en-tête de l'écran d'accueil."
  },
  {
    id: 'faq4',
    question: "Combien de followers faut-il ?",
    answer: "Les critères dépendent de l'établissement et de l'événement. Certains sont ouverts à tous, tandis que d'autres exigent un nombre minimum de followers sur Instagram ou TikTok."
  },
  {
    id: 'faq5',
    question: "Quand ma demande est-elle validée ?",
    answer: "Les établissements traitent généralement les demandes dans les 24 à 48 heures précédant l'événement. Vous recevrez une notification et le statut sera mis à jour dans 'Mes événements'."
  }
];

// ─── Custom Date Badge Helper (fr-FR) ────────────────────────────────────────
const getDayAndMonth = (dateStr) => {
  if (!dateStr) return { day: '--', month: '---' };
  const date = new Date(dateStr);
  const day = date.getDate().toString();
  const month = date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase();
  return { day, month };
};

// ─── FAQ Item Accordion Component ───────────────────────────────────────────
function FAQItem({ item }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.faqCard}
      activeOpacity={0.85}
      onPress={() => setExpanded(!expanded)}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{item.question}</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={COLORS.primaryLight}
        />
      </View>
      {expanded && (
        <Text style={styles.faqAnswer}>{item.answer}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Search Screen ───────────────────────────────────────────────────────────
export default function SearchScreen({ navigation }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('events'); // 'events', 'my_events', 'faqs'
  const [recentSearches, setRecentSearches] = useState([]);

  // Data sources
  const [allEvents, setAllEvents] = useState([]);
  const [allApplications, setAllApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load recent searches and prefetch data
  useEffect(() => {
    const loadRecent = async () => {
      try {
        const stored = await AsyncStorage.getItem('recent_searches');
        if (stored) {
          setRecentSearches(JSON.parse(stored));
        } else {
          setRecentSearches([]);
        }
      } catch (err) {
        console.log('Load recent searches error:', err.message);
      }
    };

    const prefetchData = async () => {
      try {
        const city = user?.selectedCity;
        const [eventsRes, appsRes] = await Promise.all([
          eventsAPI.list({ limit: 100, ...(city ? { city } : {}) }),
          applicationsAPI.myApplications(),
        ]);
        setAllEvents(eventsRes.events || []);
        setAllApplications(appsRes.applications || []);
      } catch (err) {
        console.log('Search prefetch error:', err.message);
      } finally {
        setLoading(false);
      }
    };

    loadRecent();
    prefetchData();
  }, [user?.selectedCity]);

  // Handle Search Input Change
  const handleSearchChange = (text) => {
    setSearchQuery(text);
  };

  // Add term to recent searches on submit
  const handleSearchSubmit = async () => {
    if (!searchQuery.trim()) return;
    const term = searchQuery.trim();
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    await AsyncStorage.setItem('recent_searches', JSON.stringify(updated));
  };

  // Trigger search from recent search click
  const handleRecentSearchPress = (term) => {
    setSearchQuery(term);
  };

  // Filter lists based on query
  const queryLower = searchQuery.trim().toLowerCase();

  const filteredEvents = queryLower
    ? allEvents.filter(e =>
        e.title?.toLowerCase().includes(queryLower) ||
        e.venue?.toLowerCase().includes(queryLower) ||
        e.description?.toLowerCase().includes(queryLower)
      )
    : [];

  const filteredApplications = queryLower
    ? allApplications.filter(a =>
        a.event?.title?.toLowerCase().includes(queryLower) ||
        a.event?.venue?.toLowerCase().includes(queryLower)
      )
    : [];

  const filteredFAQs = queryLower
    ? FAQS.filter(faq =>
        faq.question.toLowerCase().includes(queryLower) ||
        faq.answer.toLowerCase().includes(queryLower)
      )
    : FAQS;

  const activeResults =
    activeTab === 'events'
      ? filteredEvents
      : activeTab === 'my_events'
      ? filteredApplications
      : filteredFAQs;

  const showResults = searchQuery.trim().length > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <SafeAreaView edges={['top']} style={styles.safeTop}>
        {/* ─── Search Header Row ─── */}
        <View style={styles.headerRow}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={18} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Que cherchez-vous ?"
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={handleSearchChange}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* ─── Tabs Bar (Only when search is active) ─── */}
        {showResults && (
          <View style={styles.tabsRow}>
            {[
              { id: 'events', label: 'Événements' },
              { id: 'my_events', label: 'Mes événements' },
              { id: 'faqs', label: 'FAQ' },
            ].map(tab => {
              const active = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  activeOpacity={0.75}
                >
                  {active ? (
                    <LinearGradient
                      colors={['#EC4899', '#8B5CF6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.tabItemActive}
                    >
                      <Text style={styles.tabLabelActive}>{tab.label}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.tabItem}>
                      <Text style={styles.tabLabel}>{tab.label}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </SafeAreaView>

      {/* ─── Loading State ─── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primaryLight} size="large" />
        </View>
      ) : (
        /* ─── Main Content ─── */
        <View style={{ flex: 1 }}>
          {!showResults ? (
            /* ───── Recent Searches Block ───── */
            <ScrollView
              contentContainerStyle={styles.recentContainer}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.sectionTitle}>Recherches récentes</Text>
              {recentSearches.length === 0 ? (
                <Text style={styles.emptyRecentText}>Aucune recherche récente</Text>
              ) : (
                recentSearches.map((term, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.recentItem}
                    onPress={() => handleRecentSearchPress(term)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="time-outline" size={20} color={COLORS.textSecondary} style={styles.clockIcon} />
                    <Text style={styles.recentText}>{term}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          ) : (
            /* ───── Search Results Block ───── */
            <View style={{ flex: 1 }}>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                  {activeResults.length} résultat{activeResults.length !== 1 ? 's' : ''} trouvé{activeResults.length !== 1 ? 's' : ''}
                </Text>
              </View>

              <FlatList
                data={activeResults}
                keyExtractor={item => item._id || item.id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  if (activeTab === 'events') {
                    const { day, month } = getDayAndMonth(item.date);
                    return (
                      <TouchableOpacity
                        style={styles.eventCard}
                        activeOpacity={0.9}
                        onPress={() => navigation.navigate('EventDetail', { event: item })}
                      >
                        {item.images?.[0] || item.coverImage ? (
                          <Image
                            source={{ uri: item.images?.[0] || item.coverImage }}
                            style={StyleSheet.absoluteFill}
                          />
                        ) : null}
                        <LinearGradient
                          colors={['rgba(10,10,15,0.4)', 'rgba(10,10,15,0.92)']}
                          style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.eventCardContent}>
                          {/* Left Date Circle */}
                          <View style={styles.dateCircle}>
                            <Text style={styles.dateCircleDay}>{day}</Text>
                            <Text style={styles.dateCircleMonth}>{month}</Text>
                          </View>
                          {/* Right Information */}
                          <View style={styles.eventCardInfo}>
                            <Text style={styles.eventCardTitle} numberOfLines={1}>
                              {item.title}
                            </Text>
                            {item.date && (
                              <View style={styles.eventCardRow}>
                                <Ionicons name="time-outline" size={13} color="#FFFFFF" />
                                <Text style={styles.eventCardTxt}>
                                  {new Date(item.date).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit', minute: '2-digit',
                                  })}
                                </Text>
                              </View>
                            )}
                            <Text style={styles.eventCardDesc} numberOfLines={2}>
                              {item.description}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  } else if (activeTab === 'my_events') {
                    // Applied Application Card
                    const event = item.event;
                    const { day, month } = getDayAndMonth(event?.date);
                    return (
                      <TouchableOpacity
                        style={styles.eventCard}
                        activeOpacity={0.9}
                        onPress={() => navigation.navigate('EventDetail', { event })}
                      >
                        {event?.images?.[0] || event?.coverImage ? (
                          <Image
                            source={{ uri: event.images?.[0] || event.coverImage }}
                            style={StyleSheet.absoluteFill}
                          />
                        ) : null}
                        <LinearGradient
                          colors={['rgba(10,10,15,0.4)', 'rgba(10,10,15,0.92)']}
                          style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.eventCardContent}>
                          {/* Left Date Circle */}
                          <View style={styles.dateCircle}>
                            <Text style={styles.dateCircleDay}>{day}</Text>
                            <Text style={styles.dateCircleMonth}>{month}</Text>
                          </View>
                          {/* Right Information */}
                          <View style={styles.eventCardInfo}>
                            <Text style={styles.eventCardTitle} numberOfLines={1}>
                              {event?.title || 'Événement'}
                            </Text>
                            <View style={styles.statusRow}>
                              <Text style={styles.statusLabel}>Statut : </Text>
                              <Text
                                style={[
                                  styles.statusValue,
                                  {
                                    color:
                                      item.status === 'accepted'
                                        ? COLORS.success
                                        : item.status === 'rejected'
                                        ? COLORS.error
                                        : COLORS.warning,
                                  },
                                ]}
                              >
                                {item.status === 'accepted'
                                  ? 'Accepté ✓'
                                  : item.status === 'rejected'
                                  ? 'Refusé'
                                  : 'En attente'}
                              </Text>
                            </View>
                            <Text style={styles.eventCardDesc} numberOfLines={2}>
                              {event?.description}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  } else {
                    // FAQ Card Accordion
                    return <FAQItem item={item} />;
                  }
                }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>Aucun résultat trouvé</Text>
                    <Text style={styles.emptyText}>
                      Nous n'avons rien trouvé correspondant à "{searchQuery}".
                    </Text>
                  </View>
                }
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  safeTop: { backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header Row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 48,
    marginRight: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: '#000000',
    fontSize: 15,
    fontFamily: FONTS.regular,
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs Row
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  tabItem: {
    backgroundColor: '#1C1A1D',
    borderRadius: RADIUS.full,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tabItemActive: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  tabLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
  tabLabelActive: {
    color: COLORS.white,
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },

  // Recent Searches
  recentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.bold,
    marginBottom: SPACING.md,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  clockIcon: { marginRight: 12 },
  recentText: {
    color: COLORS.white,
    fontSize: 15,
    fontFamily: FONTS.medium,
  },
  emptyRecentText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: FONTS.regular,
    marginTop: 8,
  },

  // Results Header
  resultsHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  resultsCount: {
    color: COLORS.primaryLight,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },

  // List & Cards
  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
    gap: SPACING.md,
  },
  eventCard: {
    height: 140,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1C1A1D',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  eventCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  dateCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#4F46E5', // Royal indigo-blue
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  dateCircleDay: {
    color: COLORS.white,
    fontSize: 18,
    fontFamily: FONTS.bold,
    lineHeight: 20,
  },
  dateCircleMonth: {
    color: COLORS.white,
    fontSize: 9,
    fontFamily: FONTS.semiBold,
    textTransform: 'uppercase',
  },
  eventCardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  eventCardTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: FONTS.bold,
    marginBottom: 4,
  },
  eventCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  eventCardTxt: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: FONTS.regular,
  },
  eventCardDesc: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONTS.regular,
    lineHeight: 16,
  },

  // FAQ Accordion Card
  faqCard: {
    backgroundColor: '#1C1A1D',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: SPACING.md,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: FONTS.bold,
    flex: 1,
    marginRight: SPACING.sm,
  },
  faqAnswer: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.regular,
    marginTop: SPACING.sm,
    lineHeight: 18,
  },

  // Status block inside My Events
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: FONTS.regular,
  },
  statusValue: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },

  // Empty Container
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: SPACING.sm,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textAlign: 'center',
  },
});
