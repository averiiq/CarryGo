import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BorderRadius, FontSize, FontWeight, Spacing, TouchTarget } from '@/constants/theme';
import { Haptic } from '@/services/haptics.service';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'action' | 'navigation' | 'corridor' | 'support';
  icon: string;
  iconType?: 'material' | 'feather' | 'ionicons';
  route?: string;
  action?: () => void;
  badge?: string;
}

interface CommandPaletteProps {
  visible: boolean;
  onClose: () => void;
}

export function CommandPalette({ visible, onClose }: CommandPaletteProps) {
  const { C, isDark } = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      fadeAnim.setValue(0);
      setQuery('');
    }
  }, [visible, fadeAnim]);

  const commandItems: CommandItem[] = useMemo(
    () => [
      // Quick Actions
      {
        id: 'send-parcel',
        title: 'Send a Parcel',
        subtitle: 'Deliver items fast via verified travelers',
        category: 'action',
        icon: 'inventory-2',
        route: '/create-parcel',
      },
      {
        id: 'post-trip',
        title: 'Post a Trip',
        subtitle: 'Monetize your unused luggage space',
        category: 'action',
        icon: 'flight-takeoff',
        route: '/create-trip',
      },
      {
        id: 'verify-kyc',
        title: 'Complete Identity KYC',
        subtitle: 'Unlock trusted badge and higher weight limits',
        category: 'action',
        icon: 'verified-user',
        route: '/kyc',
        badge: 'Recommended',
      },
      {
        id: 'rewards-hub',
        title: 'Rewards & Daily Bonus',
        subtitle: 'Claim coins, vouchers, and travel credits',
        category: 'action',
        icon: 'card-giftcard',
        route: '/rewards',
      },
      {
        id: 'invite-friends',
        title: 'Invite Friends (Earn ₹100)',
        subtitle: 'Share your CaryGoo referral link',
        category: 'action',
        icon: 'share',
        route: '/rewards?tab=referral',
      },

      // Popular Corridors
      {
        id: 'corridor-del-ggn',
        title: 'Delhi ➔ Gurugram Express',
        subtitle: 'High frequency commuter corridor (Same day)',
        category: 'corridor',
        icon: 'directions-car',
        route: '/search?from=Delhi&to=Gurugram',
      },
      {
        id: 'corridor-chd-del',
        title: 'Chandigarh ➔ Delhi',
        subtitle: 'Daily express travelers and couriers',
        category: 'corridor',
        icon: 'train',
        route: '/search?from=Chandigarh&to=Delhi',
      },
      {
        id: 'corridor-del-jpr',
        title: 'Delhi ➔ Jaipur Highway',
        subtitle: 'Intercity verified parcels',
        category: 'corridor',
        icon: 'local-shipping',
        route: '/search?from=Delhi&to=Jaipur',
      },
      {
        id: 'corridor-bom-pnq',
        title: 'Mumbai ➔ Pune Express',
        subtitle: 'Express intercity connection',
        category: 'corridor',
        icon: 'alt-route',
        route: '/search?from=Mumbai&to=Pune',
      },

      // Core Navigation
      {
        id: 'nav-home',
        title: 'Home Marketplace',
        subtitle: 'Explore live available trips and parcels',
        category: 'navigation',
        icon: 'explore',
        route: '/',
      },
      {
        id: 'nav-requests',
        title: 'Delivery Requests',
        subtitle: 'Incoming offers and active deliveries',
        category: 'navigation',
        icon: 'swap-horiz',
        route: '/(tabs)/requests',
      },
      {
        id: 'nav-messages',
        title: 'Encrypted Messages',
        subtitle: 'Chat directly with senders and travelers',
        category: 'navigation',
        icon: 'chat',
        route: '/(tabs)/messages',
      },
      {
        id: 'nav-profile',
        title: 'My Profile & Settings',
        subtitle: 'Ratings, bio, account verification',
        category: 'navigation',
        icon: 'person',
        route: '/(tabs)/profile',
      },
      {
        id: 'nav-activity',
        title: 'Transactions & Delivery History',
        subtitle: 'Waybills, receipts, and order statuses',
        category: 'navigation',
        icon: 'receipt-long',
        route: '/my-activity',
      },
      {
        id: 'nav-support',
        title: 'Support & Safety Centre',
        subtitle: '24/7 resolution desk and emergency assistance',
        category: 'support',
        icon: 'support-agent',
        route: '/support',
      },
    ],
    []
  );

  const filteredItems = useMemo(() => {
    if (!query.trim()) return commandItems;
    const lower = query.toLowerCase().trim();
    return commandItems.filter(
      item =>
        item.title.toLowerCase().includes(lower) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(lower))
    );
  }, [commandItems, query]);

  const handleSelect = (item: CommandItem) => {
    Haptic.confirm();
    onClose();
    if (item.action) {
      item.action();
    } else if (item.route) {
      router.push(item.route as any);
    }
  };

  const renderIcon = (item: CommandItem) => {
    if (item.category === 'corridor') {
      return (
        <View style={[styles.itemIconBubble, { backgroundColor: '#EFF6FF' }]}>
          <MaterialIcons name={item.icon as any} size={20} color="#0284C7" />
        </View>
      );
    }
    if (item.category === 'action') {
      return (
        <View style={[styles.itemIconBubble, { backgroundColor: C.primarySubtle }]}>
          <MaterialIcons name={item.icon as any} size={20} color={C.primary} />
        </View>
      );
    }
    if (item.category === 'support') {
      return (
        <View style={[styles.itemIconBubble, { backgroundColor: '#FEF2F2' }]}>
          <MaterialIcons name={item.icon as any} size={20} color="#EF4444" />
        </View>
      );
    }
    return (
      <View style={[styles.itemIconBubble, { backgroundColor: C.surfaceBorderLight }]}>
        <MaterialIcons name={item.icon as any} size={20} color={C.textSecondary} />
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          style={[
            styles.paletteCard,
            {
              backgroundColor: C.surface,
              borderColor: C.surfaceBorder,
              marginTop: Math.max(insets.top + 20, 48),
              marginBottom: insets.bottom + 20,
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Header Search Input */}
          <View style={[styles.searchRow, { borderBottomColor: C.surfaceBorderLight }]}>
            <MaterialIcons name="search" size={22} color={C.primary} style={styles.searchIcon} />
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: C.textPrimary }]}
              placeholder="Jump to route, screen, action..."
              placeholderTextColor={C.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => {
                  Haptic.tap();
                  setQuery('');
                }}
                hitSlop={TouchTarget.smallHitSlop}
              >
                <MaterialIcons name="cancel" size={18} color={C.textMuted} />
              </Pressable>
            )}
            <Pressable
              style={[styles.closeBadge, { backgroundColor: C.surfaceElevated }]}
              onPress={onClose}
              hitSlop={TouchTarget.smallHitSlop}
            >
              <Text style={[styles.closeBadgeText, { color: C.textSecondary }]}>ESC</Text>
            </Pressable>
          </View>

          {/* Quick Categories Pills */}
          <View style={styles.categoryPillsRow}>
            {['All', 'Actions', 'Corridors', 'Navigation'].map((cat, idx) => (
              <Pressable
                key={cat}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: idx === 0 && !query ? C.primarySubtle : C.surfaceElevated,
                    borderColor: idx === 0 && !query ? C.primaryBorder : C.surfaceBorderLight,
                  },
                ]}
                onPress={() => {
                  Haptic.tap();
                  if (cat === 'All') setQuery('');
                  else setQuery(cat);
                }}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    { color: idx === 0 && !query ? C.primaryDark : C.textSecondary },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Results List */}
          <FlatList
            data={filteredItems}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.itemRow,
                  { backgroundColor: pressed ? C.surfaceElevated : 'transparent' },
                ]}
                onPress={() => handleSelect(item)}
              >
                {renderIcon(item)}
                <View style={styles.itemTextCol}>
                  <View style={styles.itemTitleRow}>
                    <Text style={[styles.itemTitle, { color: C.textPrimary }]}>{item.title}</Text>
                    {item.badge && (
                      <View style={[styles.itemBadge, { backgroundColor: C.primarySubtle }]}>
                        <Text style={[styles.itemBadgeText, { color: C.primaryDark }]}>
                          {item.badge}
                        </Text>
                      </View>
                    )}
                  </View>
                  {item.subtitle && (
                    <Text style={[styles.itemSub, { color: C.textMuted }]} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  )}
                </View>
                <Feather name="arrow-up-right" size={16} color={C.textMuted} />
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <MaterialIcons name="search-off" size={36} color={C.textMuted} />
                <Text style={[styles.emptyText, { color: C.textSecondary }]}>
                  No quick actions found for "{query}"
                </Text>
              </View>
            }
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.65)',
    paddingHorizontal: Spacing.md,
  },
  paletteCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1.2,
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  searchIcon: {
    marginRight: 2,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    paddingVertical: 4,
  },
  closeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    marginLeft: 6,
  },
  closeBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
  },
  listContent: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm + 2,
  },
  itemIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextCol: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemTitle: {
    fontSize: FontSize.sm + 1,
    fontWeight: FontWeight.semibold,
  },
  itemBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  itemBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  itemSub: {
    fontSize: 11,
    marginTop: 1,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  emptyText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});

