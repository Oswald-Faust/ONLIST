import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { eventsAPI, notificationsAPI } from '../../services/api';

const TABS = [
  { key: 'all', label: 'Tout' },
  { key: 'events', label: 'Événements' },
  { key: 'invites', label: 'Invitations' },
  { key: 'profile', label: 'Profil' },
  { key: 'system', label: 'Système' },
];

const CATEGORY_ICONS = {
  all: 'notifications-outline',
  events: 'sparkles-outline',
  invites: 'mail-open-outline',
  profile: 'person-outline',
  system: 'settings-outline',
};

function formatRelativeTime(dateString) {
  const createdAt = new Date(dateString);
  const diffMs = Date.now() - createdAt.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Il y a ${diffDays} j`;
  return createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function NotificationCard({ item, onPress }) {
  const accentColor = item.isRead ? COLORS.textMuted : COLORS.primaryLight;
  const iconName = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.all;

  return (
    <TouchableOpacity
      style={[styles.card, !item.isRead && styles.cardUnread]}
      activeOpacity={0.88}
      onPress={() => onPress(item)}
    >
      <View style={[styles.cardIconWrap, !item.isRead && styles.cardIconWrapUnread]}>
        <Ionicons name={iconName} size={20} color={accentColor} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.cardText}>{item.body}</Text>
        <Text style={styles.cardTime}>{formatRelativeTime(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState({
    all: 0,
    events: 0,
    invites: 0,
    profile: 0,
    system: 0,
  });

  const fetchNotifications = useCallback(async (category = activeCategory, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await notificationsAPI.list({ category, limit: 100 });
      setNotifications(data?.notifications || []);
      setSummary(data?.summary || {
        all: data?.unreadCount || 0,
        events: 0,
        invites: 0,
        profile: 0,
        system: 0,
      });
    } catch (error) {
      console.log('Notifications error:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCategory]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications(activeCategory, false);
    }, [activeCategory, fetchNotifications])
  );

  const unreadItems = useMemo(
    () => notifications.filter((item) => !item.isRead),
    [notifications]
  );

  const readItems = useMemo(
    () => notifications.filter((item) => item.isRead),
    [notifications]
  );

  const applyReadState = useCallback((targetItem) => {
    if (!targetItem || targetItem.isRead) return;

    setNotifications((current) =>
      current.map((item) => (
        item._id === targetItem._id
          ? { ...item, isRead: true, readAt: new Date().toISOString() }
          : item
      ))
    );
    setSummary((current) => {
      const next = { ...current };
      next.all = Math.max(0, (next.all || 0) - 1);
      if (targetItem.category && next[targetItem.category] !== undefined) {
        next[targetItem.category] = Math.max(0, next[targetItem.category] - 1);
      }
      return next;
    });
  }, []);

  const openNotification = async (item) => {
    if (!item.isRead) {
      applyReadState(item);
      try {
        await notificationsAPI.markRead(item._id);
      } catch (error) {
        console.log('markRead error:', error.message);
      }
    }

    const eventId = item.entityType === 'event'
      ? item.entityId || item.data?.eventId
      : item.data?.eventId;

    if (!eventId) return;

    try {
      const data = await eventsAPI.get(eventId);
      if (data?.event) {
        navigation.navigate('EventDetail', { event: data.event });
      }
    } catch (error) {
      console.log('notification open error:', error.message);
    }
  };

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead(activeCategory === 'all' ? undefined : activeCategory);
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() })));
      setSummary((current) => ({
        ...current,
        all: activeCategory === 'all' ? 0 : Math.max(0, (current.all || 0) - (current[activeCategory] || 0)),
        ...(activeCategory === 'all'
          ? { events: 0, invites: 0, profile: 0, system: 0 }
          : { [activeCategory]: 0 }),
      }));
    } catch (error) {
      console.log('markAllRead error:', error.message);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(activeCategory, true);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primaryLight}
          />
        )}
        contentContainerStyle={{
          paddingTop: insets.top + 6,
          paddingHorizontal: SPACING.lg,
          paddingBottom: 48,
          gap: SPACING.md,
        }}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              {summary.all > 0 ? `${summary.all} non lues` : 'Centre de notifications'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.markAllButton}
            activeOpacity={0.8}
            onPress={markAllRead}
            disabled={summary.all === 0}
          >
            <Text style={[styles.markAllText, summary.all === 0 && styles.markAllTextDisabled]}>
              Tout lire
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {TABS.map((tab) => {
            const active = activeCategory === tab.key;
            const count = summary[tab.key] || 0;

            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.85}
                onPress={() => setActiveCategory(tab.key)}
              >
                {active ? (
                  <LinearGradient colors={COLORS.gradient} style={styles.tabActive}>
                    <Text style={styles.tabActiveText}>{tab.label}</Text>
                    {count > 0 && (
                      <View style={styles.tabBadgeActive}>
                        <Text style={styles.tabBadgeActiveText}>{count}</Text>
                      </View>
                    )}
                  </LinearGradient>
                ) : (
                  <View style={styles.tab}>
                    <Text style={styles.tabText}>{tab.label}</Text>
                    {count > 0 && (
                      <View style={styles.tabBadge}>
                        <Text style={styles.tabBadgeText}>{count}</Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={COLORS.primaryLight} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={28} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptyText}>
              Les nouvelles invitations, validations et réponses apparaîtront ici.
            </Text>
          </View>
        ) : (
          <View style={styles.groupsWrap}>
            {unreadItems.length > 0 && (
              <View style={styles.group}>
                <Text style={styles.groupTitle}>Non lues</Text>
                <View style={styles.cardsWrap}>
                  {unreadItems.map((item) => (
                    <NotificationCard key={item._id} item={item} onPress={openNotification} />
                  ))}
                </View>
              </View>
            )}

            {readItems.length > 0 && (
              <View style={styles.group}>
                <Text style={styles.groupTitle}>{unreadItems.length > 0 ? 'Plus tôt' : 'Récentes'}</Text>
                <View style={styles.cardsWrap}>
                  {readItems.map((item) => (
                    <NotificationCard key={item._id} item={item} onPress={openNotification} />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  backButton: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18,17,14,0.72)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold,
    fontSize: FONTS.sizes.xl,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.sm,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  markAllText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
    fontSize: FONTS.sizes.sm,
    textDecorationLine: 'underline',
  },
  markAllTextDisabled: {
    color: COLORS.textMuted,
    textDecorationLine: 'none',
  },
  tabsRow: {
    gap: 10,
    paddingRight: SPACING.lg,
  },
  tab: {
    minHeight: 52,
    paddingHorizontal: 22,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(18,17,14,0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tabActive: {
    minHeight: 52,
    paddingHorizontal: 22,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tabText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.semiBold,
    fontSize: FONTS.sizes.base,
  },
  tabActiveText: {
    color: COLORS.bg,
    fontFamily: FONTS.bold,
    fontSize: FONTS.sizes.base,
  },
  tabBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tabBadgeActive: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tabBadgeText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold,
    fontSize: FONTS.sizes.sm,
  },
  tabBadgeActiveText: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    fontSize: FONTS.sizes.sm,
  },
  loaderWrap: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupsWrap: {
    gap: SPACING.xl,
  },
  group: {
    gap: SPACING.md,
  },
  groupTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold,
    fontSize: FONTS.sizes.lg,
  },
  cardsWrap: {
    gap: SPACING.md,
  },
  card: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: 28,
    backgroundColor: '#17131D',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardUnread: {
    borderColor: 'rgba(201,169,97,0.22)',
    backgroundColor: '#1C1720',
  },
  cardIconWrap: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconWrapUnread: {
    backgroundColor: 'rgba(201,169,97,0.1)',
  },
  cardBody: {
    flex: 1,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  cardTitle: {
    flex: 1,
    color: COLORS.white,
    fontFamily: FONTS.semiBold,
    fontSize: 18,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primaryLight,
  },
  cardText: {
    color: '#8E84A3',
    fontFamily: FONTS.regular,
    fontSize: 16,
    lineHeight: 28,
  },
  cardTime: {
    color: '#8E84A3',
    fontFamily: FONTS.regular,
    fontSize: 14,
    marginTop: 8,
  },
  emptyCard: {
    minHeight: 260,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: SPACING.md,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold,
    fontSize: FONTS.sizes.lg,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: FONTS.sizes.base,
    textAlign: 'center',
    lineHeight: 24,
  },
});
