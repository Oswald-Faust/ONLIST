import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Image, RefreshControl, ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { applicationsAPI } from '../../services/api';
import CityPickerSheet from './CityPickerScreen';
import { useAuth } from '../../context/AuthContext';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400';

// Statuts avec icône et couleur
const STATUS_ITEMS = [
  { id: 'pending',  label: 'En attente', icon: 'time-outline',             color: COLORS.warning },
  { id: 'accepted', label: 'Confirmés',  icon: 'checkmark-circle-outline', color: COLORS.success },
  { id: 'rejected', label: 'Passés',     icon: 'close-circle-outline',     color: COLORS.error   },
];

const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];
const DAYS_FR = ['L','M','M','J','V','S','D'];

const toDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ─── Calendrier maison ────────────────────────────────────────────────────────
function buildCalendar(year, month) {
  const jsDay    = new Date(year, month, 1).getDay();
  const firstDay = jsDay === 0 ? 6 : jsDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = [];
  let day = 1;
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let d = 0; d < 7; d++) {
      const col = w * 7 + d;
      row.push(col >= firstDay && day <= daysInMonth ? day++ : null);
    }
    weeks.push(row);
    if (day > daysInMonth) break;
  }
  return weeks;
}

// ─── Carte de filtre de statut (Figma : carte compacte horizontale) ───────────
function StatusCard({ item, count, active, onPress }) {
  return (
    <TouchableOpacity
      style={[S.statusCard, active && S.statusCardActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Icône cercle */}
      <View style={[S.statusIconBg, active && S.statusIconBgActive]}>
        <Ionicons
          name={item.icon}
          size={18}
          color={active ? COLORS.bg : COLORS.textMuted}
        />
      </View>
      {/* Compteur + label */}
      <View>
        <Text style={[S.statusCount, active && S.statusCountActive]}>{count}</Text>
        <Text style={[S.statusLabel, active && S.statusLabelActive]}>{item.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Carte événement (Figma exact) ────────────────────────────────────────────
function EventCard({ item, onPress }) {
  const ev  = item.event;
  const img = ev?.images?.[0] || PLACEHOLDER;

  const date = ev?.date ? new Date(ev.date) : null;
  const dateStr = date
    ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : null;

  // Durée entre startTime et endTime
  const getDuration = (start, end) => {
    if (!start || !end) return null;
    try {
      const parse = t => {
        const [time, period] = t.split(' ');
        let [h, m = 0] = time.split(':').map(Number);
        if (period?.toUpperCase() === 'PM' && h !== 12) h += 12;
        if (period?.toUpperCase() === 'AM' && h === 12) h = 0;
        return h * 60 + m;
      };
      let diff = parse(end) - parse(start);
      if (diff <= 0) diff += 24 * 60;
      const hrs = Math.floor(diff / 60);
      const min = diff % 60;
      return min > 0 ? `${hrs}h${min}` : `${hrs}h`;
    } catch { return null; }
  };

  const duration = getDuration(ev?.startTime, ev?.endTime);

  return (
    <TouchableOpacity style={S.card} onPress={onPress} activeOpacity={0.88}>
      {/* Image carrée gauche */}
      <Image source={{ uri: img }} style={S.cardImg} />

      {/* Contenu droite */}
      <View style={S.cardContent}>
        {/* Badge invitation */}
        {item.isInvitation && (
          <View style={S.inviteBadge}>
            <Ionicons name="mail" size={9} color={COLORS.primaryLight} />
            <Text style={S.inviteBadgeTxt}>Invitation</Text>
          </View>
        )}

        {/* Titre */}
        <Text style={S.cardTitle} numberOfLines={2}>{ev?.title || 'Événement'}</Text>

        {/* Lieu */}
        {(ev?.venue || ev?.city) && (
          <View style={S.cardMeta}>
            <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
            <Text style={S.cardMetaTxt} numberOfLines={1}>{ev.venue || ev.city}</Text>
          </View>
        )}

        {/* Date + heure + durée sur une ligne */}
        <View style={S.cardDateRow}>
          {dateStr && (
            <View style={S.cardMeta}>
              <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
              <Text style={S.cardMetaTxt}>{dateStr}</Text>
            </View>
          )}
          {ev?.startTime && (
            <View style={S.cardMeta}>
              <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
              <Text style={S.cardMetaTxt}>{ev.startTime}</Text>
            </View>
          )}
          {duration && (
            <View style={S.durationPill}>
              <Text style={S.durationTxt}>{duration}</Text>
            </View>
          )}
        </View>

        {/* Boutons d'action */}
        <View style={S.cardActions}>
          {item.status === 'pending' && (
            <View style={S.btnPending}>
              <Ionicons name="time-outline" size={15} color={COLORS.primaryLight} />
              <Text style={S.btnPendingTxt}>En attente de confirmation</Text>
            </View>
          )}
          {item.status === 'accepted' && (
            <TouchableOpacity style={S.btnConfirmed} activeOpacity={0.8}>
              <Ionicons name="checkmark-circle-outline" size={15} color={COLORS.success} />
              <Text style={S.btnConfirmedTxt}>Confirmé</Text>
            </TouchableOpacity>
          )}
          {item.status === 'rejected' && (
            <View style={S.btnFull}>
              <Text style={S.btnFullTxt}>Complet</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Vue calendrier ───────────────────────────────────────────────────────────
function CalendarView({ applications, onPressEvent }) {
  const now   = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const today = now.getDate();
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();
  const weeks = buildCalendar(year, month);
  const todayKey = toDateKey(now);

  const monthApps = applications.filter(a => {
    if (!a.event?.date) return false;
    const d = new Date(a.event.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const eventDateKeys = new Set(monthApps.map((a) => toDateKey(a.event.date)).filter(Boolean));
  const selectedApps = selectedDateKey
    ? monthApps.filter((a) => toDateKey(a.event.date) === selectedDateKey)
    : monthApps;
  const selectedDayNumber = selectedDateKey ? Number(selectedDateKey.split('-')[2]) : null;

  useEffect(() => {
    setSelectedDateKey((currentKey) => {
      if (currentKey) {
        const [currentYear, currentMonth] = currentKey.split('-').map(Number);
        if (currentYear === year && currentMonth === month + 1) {
          return currentKey;
        }
      }
      if (!currentKey && isCurrentMonth) {
        return todayKey;
      }
      return '';
    });
  }, [isCurrentMonth, month, todayKey, year]);

  const prevMonth = () => {
    setSelectedDateKey('');
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    setSelectedDateKey('');
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Calendrier */}
      <View style={S.calCard}>
        <View style={S.calHeader}>
          <TouchableOpacity onPress={prevMonth} style={S.calArrow}>
            <Ionicons name="chevron-back" size={18} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={S.calMonthTxt}>{MONTHS_FR[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={S.calArrow}>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* En-tête jours */}
        <View style={S.calDaysRow}>
          {DAYS_FR.map((d, i) => (
            <Text key={i} style={S.calDayLbl}>{d}</Text>
          ))}
        </View>

        {/* Grille */}
        {weeks.map((week, wi) => (
          <View key={wi} style={S.calWeekRow}>
            {week.map((day, di) => {
              const isToday  = day === today && isCurrentMonth;
              const cellDateKey = day ? toDateKey(new Date(year, month, day)) : '';
              const hasEvent = !!cellDateKey && eventDateKeys.has(cellDateKey);
              const isSelected = !!cellDateKey && cellDateKey === selectedDateKey;
              return (
                <TouchableOpacity
                  key={di}
                  style={S.calDayCell}
                  disabled={!day}
                  activeOpacity={day ? 0.8 : 1}
                  onPress={() => setSelectedDateKey(cellDateKey)}
                >
                  <View style={[S.calDayCircle, isToday && S.calDayToday, isSelected && S.calDaySelected]}>
                    <Text style={[S.calDayTxt, !day && { opacity: 0 }, (isToday || isSelected) && S.calDayTodayTxt]}>
                      {day ?? ' '}
                    </Text>
                  </View>
                  {hasEvent && <View style={S.calDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Événements du mois */}
      <View style={S.calEventsHead}>
        <Text style={S.calEventsTitle}>
          {selectedDayNumber
            ? `Événements le ${selectedDayNumber} ${MONTHS_FR[month].toLowerCase()}`
            : 'Événements ce mois-ci'}
        </Text>
        <View style={S.calCountPill}>
          <Text style={S.calCountTxt}>{selectedApps.length}</Text>
        </View>
      </View>

      {selectedApps.length === 0 ? (
        <View style={S.calEmpty}>
          <Ionicons name="calendar-outline" size={36} color={COLORS.textMuted} />
          <Text style={S.calEmptyTxt}>
            {selectedDateKey ? 'Aucun événement à cette date' : 'Aucun événement ce mois-ci'}
          </Text>
        </View>
      ) : (
        selectedApps.map(app => (
          <TouchableOpacity
            key={app._id}
            style={S.calEventCard}
            activeOpacity={0.85}
            onPress={() => onPressEvent(app.event)}
          >
            <Image
              source={{ uri: app.event?.images?.[0] || PLACEHOLDER }}
              style={S.calEventImg}
            />
            <View style={S.calEventBody}>
              <Text style={S.calEventTitle} numberOfLines={1}>
                {app.event?.title || 'Événement'}
              </Text>
              {(app.event?.venue || app.event?.city) && (
                <View style={S.cardMeta}>
                  <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
                  <Text style={S.cardMetaTxt}>{app.event.venue || app.event.city}</Text>
                </View>
              )}
              {app.event?.date && (
                <Text style={S.calEventDate}>
                  {new Date(app.event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </Text>
              )}
            </View>
            <View style={[
              S.calStatusDot,
              {
                backgroundColor:
                  app.status === 'accepted' ? COLORS.success :
                  app.status === 'rejected' ? COLORS.error   : COLORS.warning,
              },
            ]} />
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────
export default function MyEventsScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [viewMode,     setViewMode]     = useState('list');
  const [filter,       setFilter]       = useState('pending');
  const [applications, setApplications] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [selectedCity, setSelectedCity] = useState(user?.selectedCity || '');

  useEffect(() => {
    setSelectedCity(user?.selectedCity || '');
  }, [user?.selectedCity]);

  const fetchApplications = useCallback(async () => {
    try {
      const data = await applicationsAPI.myApplications({});
      setApplications(data.applications || []);
    } catch (err) {
      console.log('MyEvents error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchApplications(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchApplications(); };

  const count = (id) => applications.filter(a => a.status === id).length;

  const filtered =
    filter === 'pending'  ? applications.filter(a => a.status === 'pending')  :
    filter === 'accepted' ? applications.filter(a => a.status === 'accepted') :
                            applications.filter(a => a.status === 'rejected');

  const cityFiltered = selectedCity
    ? filtered.filter((a) => {
      const eventCity = a.event?.city?.trim().toLowerCase();
      return eventCity && eventCity === selectedCity.trim().toLowerCase();
    })
    : filtered;

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Header ── */}
      <View style={[S.header, { paddingTop: insets.top + 14 }]}>
        <Text style={S.headerTitle}>Mes Évènements</Text>

        {/* Toggle vue */}
        <View style={S.viewToggle}>
          <TouchableOpacity
            style={[S.toggleBtn, viewMode === 'list' && S.toggleBtnOn]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons
              name="list"
              size={18}
              color={viewMode === 'list' ? COLORS.bg : COLORS.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[S.toggleBtn, viewMode === 'calendar' && S.toggleBtnOn]}
            onPress={() => setViewMode('calendar')}
          >
            <Ionicons
              name="calendar"
              size={17}
              color={viewMode === 'calendar' ? COLORS.bg : COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Cartes de statut (Figma : compactes horizontales) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={S.statusRail}
        contentContainerStyle={S.statusRow}
      >
        {STATUS_ITEMS.map(item => (
          <StatusCard
            key={item.id}
            item={item}
            count={count(item.id)}
            active={filter === item.id}
            onPress={() => setFilter(item.id)}
          />
        ))}
      </ScrollView>

      {/* ── Filtres secondaires (Filters + Localisation) ── */}
      <View style={S.secondaryFilters}>
        <TouchableOpacity style={S.filterPill} activeOpacity={0.8}>
          <Ionicons name="options-outline" size={15} color={COLORS.textPrimary} />
          <Text style={S.filterPillTxt}>Filtres</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.filterPill} activeOpacity={0.8} onPress={() => setCityPickerVisible(true)}>
          <Ionicons name="location-outline" size={15} color={COLORS.textPrimary} />
          <Text style={S.filterPillTxt}>{selectedCity || 'Toutes'}</Text>
          <Ionicons name="chevron-down" size={13} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── Contenu ── */}
      {loading ? (
        <View style={S.center}>
          <ActivityIndicator color={COLORS.primaryLight} size="large" />
        </View>
      ) : viewMode === 'calendar' ? (
        <View style={{ flex: 1, paddingHorizontal: SPACING.lg }}>
          <CalendarView
            applications={cityFiltered}
            onPressEvent={ev => navigation.navigate('EventDetail', { event: ev })}
          />
        </View>
      ) : (
        <FlatList
          data={cityFiltered}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <EventCard
              item={item}
              onPress={() => navigation.navigate('EventDetail', { event: item.event })}
            />
          )}
          contentContainerStyle={S.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primaryLight}
            />
          }
          ListEmptyComponent={
            <View style={S.empty}>
              <Ionicons name="calendar-outline" size={52} color={COLORS.textMuted} />
              <Text style={S.emptyTitle}>
                {filter === 'pending'  ? 'Aucune candidature en attente' :
                 filter === 'accepted' ? 'Aucun événement confirmé' :
                                        'Aucun événement passé'}
              </Text>
              <Text style={S.emptyText}>Explorez les événements et postulez !</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Explore')}
                style={{ borderRadius: RADIUS.full, overflow: 'hidden', marginTop: SPACING.md }}
              >
                <LinearGradient
                  colors={COLORS.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={S.exploreBtnGrad}
                >
                  <Text style={S.exploreBtnTxt}>Explorer les événements</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <CityPickerSheet
        visible={cityPickerVisible}
        onClose={() => setCityPickerVisible(false)}
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
        onResetCity={() => setSelectedCity('')}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Header ──────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.bold,
  },

  // ── Toggle liste/calendrier ──────────────────────────────────────────
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.full,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 2,
  },
  toggleBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnOn: { backgroundColor: COLORS.primary },

  // ── Cartes de statut ────────────────────────────────────────────────
  statusRail: {
    flexGrow: 0,
  },
  statusRow: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: 10,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: 160,
    height: 72,
    borderRadius: 18,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  statusCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  statusIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconBgActive: {
    backgroundColor: 'rgba(10,10,15,0.22)',
  },
  statusCount: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xl,
    fontFamily: FONTS.extraBold,
    lineHeight: 26,
  },
  statusCountActive: { color: COLORS.bg },
  statusLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.medium,
  },
  statusLabelActive: { color: 'rgba(10,10,15,0.6)' },

  // ── Filtres secondaires ──────────────────────────────────────────────
  secondaryFilters: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: 10,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.bgCard,
  },
  filterPillTxt: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
  },

  // ── Liste ────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 120,
    gap: 12,
  },

  // ── Carte événement ──────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 138,
  },
  cardImg: {
    width: 112,
    height: undefined,
    aspectRatio: undefined,
    // On laisse l'image s'étirer sur la hauteur de la carte
    alignSelf: 'stretch',
  },
  cardContent: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 13,
    gap: 4,
    justifyContent: 'center',
  },
  inviteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212,175,119,0.15)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(212,175,119,0.3)',
    marginBottom: 2,
  },
  inviteBadgeTxt: {
    color: COLORS.primaryLight,
    fontSize: 9,
    fontFamily: FONTS.semiBold,
  },
  cardTitle: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontFamily: FONTS.bold,
    lineHeight: 20,
    marginBottom: 1,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardMetaTxt: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.regular,
    flex: 1,
  },
  cardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
    marginTop: 1,
  },
  durationPill: {
    backgroundColor: COLORS.bgCard2,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  durationTxt: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.semiBold,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  btnPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(201,169,97,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(201,169,97,0.22)',
    alignSelf: 'flex-start',
  },
  btnPendingTxt: {
    color: COLORS.primaryLight,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semiBold,
  },
  btnRefuse: {
    flex: 1,
    height: 38,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.5)',
    backgroundColor: 'transparent',
  },
  btnRefuseTxt: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semiBold,
  },
  btnAccept: {
    flex: 1,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  btnAcceptGrad: {
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
  },
  btnAcceptTxt: {
    color: COLORS.bg,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.bold,
  },
  btnConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(16,217,160,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(16,217,160,0.35)',
    alignSelf: 'flex-start',
  },
  btnConfirmedTxt: {
    color: COLORS.success,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semiBold,
  },
  btnFull: {
    paddingHorizontal: 20,
    height: 38,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(201,169,97,0.4)',
    alignSelf: 'flex-start',
  },
  btnFullTxt: {
    color: COLORS.primaryLight,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semiBold,
  },

  // ── Calendrier ───────────────────────────────────────────────────────
  calCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 18,
    padding: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  calArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCard2,
  },
  calMonthTxt: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.semiBold,
  },
  calDaysRow: { flexDirection: 'row', marginBottom: 6 },
  calDayLbl: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.medium,
  },
  calWeekRow: { flexDirection: 'row', marginBottom: 2 },
  calDayCell: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 2 },
  calDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayToday: { backgroundColor: COLORS.primary },
  calDaySelected: {
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  calDayTxt: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.medium,
  },
  calDayTodayTxt: { color: COLORS.bg, fontFamily: FONTS.bold },
  calDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.primaryLight,
  },

  calEventsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  calEventsTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.semiBold,
  },
  calCountPill: {
    backgroundColor: 'rgba(201,169,97,0.15)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  calCountTxt: {
    color: COLORS.primaryLight,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.semiBold,
  },
  calEmpty: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  calEmptyTxt: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.regular,
  },
  calEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  calEventImg: { width: 52, height: 52, borderRadius: 10 },
  calEventBody: { flex: 1, gap: 3 },
  calEventTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontFamily: FONTS.semiBold,
  },
  calEventDate: {
    color: COLORS.primaryLight,
    fontSize: FONTS.sizes.xs,
    fontFamily: FONTS.medium,
  },
  calStatusDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },

  // ── Empty state ──────────────────────────────────────────────────────
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontFamily: FONTS.bold,
    textAlign: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.regular,
    textAlign: 'center',
  },
  exploreBtnGrad: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: 14,
    borderRadius: RADIUS.full,
  },
  exploreBtnTxt: {
    color: COLORS.bg,
    fontSize: FONTS.sizes.base,
    fontFamily: FONTS.semiBold,
  },
});
