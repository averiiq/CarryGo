import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useSavedRoutes, SavedRoute } from '@/hooks/useSavedRoutes';
import { Haptic } from '@/services/haptics.service';

interface SavedRoutesSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectRoute: (fromCity: string, toCity: string) => void;
}

export function SavedRoutesSheet({ visible, onClose, onSelectRoute }: SavedRoutesSheetProps) {
  const { C } = useThemeColors();
  const { savedRoutes, recentRoutes, removeRoute } = useSavedRoutes();

  const handleSelect = (route: SavedRoute) => {
    Haptic.select();
    onSelectRoute(route.fromCity, route.toCity);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: C.overlay }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: C.surface, borderTopColor: C.surfaceBorder }]}>
        <View style={[styles.handle, { backgroundColor: C.surfaceBorderLight }]} />
        <Text style={[styles.title, { color: C.textPrimary }]}>Your Routes</Text>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Recent Routes */}
          {recentRoutes.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="history" size={14} color={C.textMuted} />
                <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Recent</Text>
              </View>
              {recentRoutes.map(route => (
                <RouteItem
                  key={route.id}
                  route={route}
                  onPress={() => handleSelect(route)}
                  C={C}
                />
              ))}
            </View>
          )}

          {/* Saved Routes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="bookmark" size={14} color={C.primary} />
              <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Saved</Text>
            </View>
            {savedRoutes.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: C.surfaceElevated }]}>
                <MaterialIcons name="bookmark-border" size={24} color={C.textMuted} />
                <Text style={[styles.emptyText, { color: C.textMuted }]}>
                  No saved routes yet. Routes you use frequently will appear here.
                </Text>
              </View>
            ) : (
              savedRoutes.map(route => (
                <RouteItem
                  key={route.id}
                  route={route}
                  onPress={() => handleSelect(route)}
                  onRemove={() => { Haptic.tap(); removeRoute(route.id); }}
                  C={C}
                  showCount
                />
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function RouteItem({ route, onPress, onRemove, C, showCount }: {
  route: SavedRoute;
  onPress: () => void;
  onRemove?: () => void;
  C: any;
  showCount?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.routeItem,
        { backgroundColor: pressed ? C.surfaceElevated : 'transparent', borderBottomColor: C.surfaceBorder },
      ]}
      onPress={onPress}
    >
      <View style={styles.routeIcon}>
        <View style={[styles.dot, { backgroundColor: C.success }]} />
        <View style={[styles.line, { backgroundColor: C.surfaceBorder }]} />
        <View style={[styles.dot, { backgroundColor: C.error }]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cityText, { color: C.textPrimary }]}>{route.fromCity}</Text>
        <Text style={[styles.cityText, { color: C.textPrimary }]}>{route.toCity}</Text>
      </View>
      {showCount && route.useCount > 1 && (
        <Text style={[styles.countBadge, { color: C.textMuted }]}>×{route.useCount}</Text>
      )}
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={8} style={styles.removeBtn}>
          <MaterialIcons name="close" size={16} color={C.textMuted} />
        </Pressable>
      )}
      <MaterialIcons name="chevron-right" size={18} color={C.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: Spacing.lg,
    maxHeight: '70%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.md,
  },
  content: { flex: 1 },
  section: { marginBottom: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
  },
  routeIcon: {
    alignItems: 'center',
    gap: 2,
    width: 12,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  line: { width: 1, height: 12 },
  cityText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  countBadge: { fontSize: FontSize.xs },
  removeBtn: { padding: 4 },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  emptyText: { fontSize: FontSize.sm, textAlign: 'center' },
});
