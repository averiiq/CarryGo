import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useNotifications } from '@/hooks/useNotifications';
import { Haptic } from '@/services/haptics.service';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { AppNotification } from '@/types';

type CategoryFilter = 'all' | 'deliveries' | 'messages' | 'payments' | 'matches';

export default function NotificationsScreen() {
  const { C, isDark } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    notifications,
    loading,
    refresh,
    unreadCount,
    markAllRead,
    openNotification,
    markNotificationAsRead,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<CategoryFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptic.tap();
    refresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'deliveries') {
        return (
          notif.type.includes('delivery') ||
          notif.type.includes('request') ||
          notif.type.includes('otp') ||
          notif.category === 'parcel_update' ||
          notif.category === 'trip_update'
        );
      }
      if (activeTab === 'messages') {
        return notif.type === 'chat_message' || notif.category === 'message';
      }
      if (activeTab === 'payments') {
        return notif.type.includes('payment') || notif.category === 'payment';
      }
      if (activeTab === 'matches') {
        return notif.type.includes('match') || notif.category === 'matching';
      }
      return true;
    });
  }, [notifications, activeTab]);

  const getNotificationIcon = (type: string) => {
    if (type === 'chat_message') return { name: 'chat' as const, color: '#F59E0B', bg: isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7' };
    if (type.includes('delivery_otp') || type.includes('otp')) return { name: 'vpn-key' as const, color: '#10B981', bg: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5' };
    if (type.includes('delivery') || type.includes('request')) return { name: 'local-shipping' as const, color: '#3B82F6', bg: isDark ? 'rgba(59,130,246,0.15)' : '#DBEAFE' };
    if (type.includes('payment')) return { name: 'account-balance-wallet' as const, color: '#8B5CF6', bg: isDark ? 'rgba(139,92,246,0.15)' : '#EDE9FE' };
    if (type.includes('match')) return { name: 'map' as const, color: '#6366F1', bg: isDark ? 'rgba(99,102,241,0.15)' : '#E0E7FF' };
    if (type.includes('rating')) return { name: 'star' as const, color: '#F59E0B', bg: isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7' };
    return { name: 'notifications' as const, color: C.primary, bg: C.primarySubtle };
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return '';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const renderNotificationCard = ({ item }: { item: AppNotification }) => {
    const iconCfg = getNotificationIcon(item.type);
    const isUnread = !item.read;

    return (
      <Pressable
        onPress={() => {
          Haptic.tap();
          openNotification(item);
        }}
        style={({ pressed }) => [
          styles.notifCard,
          {
            backgroundColor: isDark ? (isUnread ? '#1E293B' : '#0F172A') : (isUnread ? '#F8FAFC' : '#FFFFFF'),
            borderColor: isDark ? (isUnread ? '#3B82F6' : '#1E293B') : (isUnread ? '#BFDBFE' : '#F1F5F9'),
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: iconCfg.bg }]}>
          <MaterialIcons name={iconCfg.name} size={22} color={iconCfg.color} />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: C.textPrimary }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.cardTime, { color: C.textMuted }]}>
              {formatRelativeTime(item.createdAt)}
            </Text>
          </View>

          <Text style={[styles.cardBody, { color: C.textSecondary }]} numberOfLines={2}>
            {item.body}
          </Text>

          {item.data?.action ? (
            <View style={styles.tagWrap}>
              <View style={[styles.actionTag, { backgroundColor: iconCfg.bg }]}>
                <Text style={[styles.actionTagText, { color: iconCfg.color }]}>
                  {String(item.data.action).replace(/_/g, ' ')}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {isUnread ? (
          <View style={[styles.unreadDot, { backgroundColor: C.primary }]} />
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: C.surfaceBorder }]}>
        <Pressable
          onPress={() => {
            Haptic.tap();
            router.back();
          }}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={24} color={C.textPrimary} />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Notifications</Text>
          {unreadCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: C.primary }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.headerActions}>
          {unreadCount > 0 ? (
            <Pressable
              onPress={() => {
                Haptic.tap();
                markAllRead();
              }}
              style={styles.markReadBtn}
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
            >
              <Text style={[styles.markReadText, { color: C.primary }]}>Mark all read</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => {
              Haptic.tap();
              router.push('/notification-settings');
            }}
            style={styles.settingsBtn}
            accessibilityRole="button"
            accessibilityLabel="Notification settings"
          >
            <MaterialIcons name="settings" size={22} color={C.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {(['all', 'deliveries', 'messages', 'payments', 'matches'] as CategoryFilter[]).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab.charAt(0).toUpperCase() + tab.slice(1);
          return (
            <Pressable
              key={tab}
              onPress={() => {
                Haptic.select();
                setActiveTab(tab);
              }}
              style={[
                styles.tabChip,
                {
                  backgroundColor: isActive ? C.primary : (isDark ? '#1E293B' : '#F1F5F9'),
                },
              ]}
            >
              <Text
                style={[
                  styles.tabChipText,
                  {
                    color: isActive ? '#FFFFFF' : C.textSecondary,
                    fontWeight: isActive ? FontWeight.bold : FontWeight.medium,
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotificationCard}
        contentContainerStyle={[
          styles.listContainer,
          filteredNotifications.length === 0 && styles.emptyListContainer,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <MaterialIcons name="notifications-none" size={48} color={C.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>You're all caught up!</Text>
            <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>
              {activeTab === 'all'
                ? 'No notifications at this time.'
                : `No ${activeTab} notifications to display.`}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: Spacing.xs,
    marginRight: Spacing.xs,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.lg + 1,
    fontWeight: FontWeight.bold,
  },
  badge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: Spacing.xs + 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  markReadBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markReadText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  settingsBtn: {
    padding: Spacing.xs,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs + 2,
  },
  tabChip: {
    paddingHorizontal: Spacing.md - 2,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  tabChipText: {
    fontSize: FontSize.xs + 1,
  },
  listContainer: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: FontSize.sm + 1,
    fontWeight: FontWeight.bold,
    flex: 1,
    marginRight: 6,
  },
  cardTime: {
    fontSize: FontSize.xs,
  },
  cardBody: {
    fontSize: FontSize.xs + 1,
    lineHeight: 18,
  },
  tagWrap: {
    marginTop: 6,
    flexDirection: 'row',
  },
  actionTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  actionTagText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 4,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.md + 1,
    fontWeight: FontWeight.bold,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
