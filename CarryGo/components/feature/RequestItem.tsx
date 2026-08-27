import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Request, Parcel } from '@/types';

type StatusKey = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled' | 'failed';

export const STATUS_CONFIG: Record<StatusKey, { label: string; color: string; bg: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  pending:   { label: 'Pending',   color: Colors.warning,  bg: Colors.warningSubtle,  icon: 'hourglass-empty' },
  accepted:  { label: 'Accepted',  color: Colors.success,  bg: Colors.successSubtle,  icon: 'check-circle' },
  rejected:  { label: 'Rejected',  color: Colors.error,    bg: Colors.errorSubtle,    icon: 'cancel' },
  completed: { label: 'Completed', color: Colors.info,     bg: Colors.infoSubtle,     icon: 'verified' },
  cancelled: { label: 'Cancelled', color: Colors.textMuted, bg: Colors.surfaceElevated, icon: 'block' },
  failed:    { label: 'Failed',    color: Colors.error,    bg: Colors.errorSubtle,    icon: 'error' },
};

const TIMELINE_ORDER: StatusKey[] = ['pending', 'accepted', 'completed'];

export function timelineStep(status: StatusKey): number {
  if (status === 'accepted') return 1;
  if (status === 'completed') return 2;
  return 0;
}

export interface RequestItemProps {
  request: Request;
  parcel?: Parcel;
  viewerRole: 'traveller' | 'sender' | 'observer';
  onAccept: () => void;
  onReject: () => void;
  onChat: () => void;
  onDelivery: () => void;
  onPayment: () => void;
}

export function RequestItem({ request, parcel, viewerRole, onAccept, onReject, onChat, onDelivery, onPayment }: RequestItemProps) {
  const sc = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
  const step = timelineStep(request.status);
  const isRejectedOrCancelled = request.status === 'rejected' || request.status === 'cancelled';
  const isTraveller = viewerRole === 'traveller';
  const isSender = viewerRole === 'sender';
  const canOpenAcceptedActions = isTraveller || isSender;

  return (
    <View style={styles.requestItem}>
      {/* Timeline spine connector rendered by parent */}
      <View style={styles.requestBody}>
        {/* Status badge + sender */}
        <View style={styles.requestHeader}>
          <View style={styles.senderRow}>
            <View style={styles.senderAvatar}>
              <Text style={styles.senderAvatarText}>{request.senderName.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.senderName}>{request.senderName}</Text>
              <Text style={styles.requestTime}>
                {new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                {' · '}
                {new Date(request.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <MaterialIcons name={sc.icon} size={11} color={sc.color} />
            <Text style={[styles.statusBadgeText, { color: sc.color }]}>{sc.label}</Text>
          </View>
        </View>

        {/* Parcel info */}
        {parcel ? (
          <View style={styles.parcelInfoRow}>
            <View style={styles.parcelIconWrap}>
              <MaterialIcons name="inventory-2" size={15} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.parcelDesc} numberOfLines={1}>{parcel.description}</Text>
              <Text style={styles.parcelMeta}>{parcel.category} · {parcel.weight}kg</Text>
            </View>
            <Text style={styles.parcelRoute}>{parcel.fromCity} → {parcel.toCity}</Text>
          </View>
        ) : null}

        {/* Message */}
        {request.message ? (
          <View style={styles.messageBox}>
            <Ionicons name="chatbubble-ellipses-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.messageText} numberOfLines={2}>{request.message}</Text>
          </View>
        ) : null}

        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Agreed price</Text>
          <Text style={styles.priceValue}>Rs {request.price}</Text>
        </View>

        {/* Timeline progress bar */}
        {!isRejectedOrCancelled && (
          <View style={styles.progressRow}>
            {TIMELINE_ORDER.map((s, i) => {
              const done = step >= i;
              const psc = STATUS_CONFIG[s];
              return (
                <React.Fragment key={s}>
                  <View style={[styles.progressStep, done && { backgroundColor: psc.color }]}>
                    {done ? (
                      <MaterialIcons name={psc.icon} size={11} color="#fff" />
                    ) : (
                      <View style={styles.progressDot} />
                    )}
                  </View>
                  {i < TIMELINE_ORDER.length - 1 ? (
                    <View style={[styles.progressLine, done && i < step && { backgroundColor: psc.color }]} />
                  ) : null}
                </React.Fragment>
              );
            })}
            <Text style={styles.progressLabel}>{sc.label}</Text>
          </View>
        )}

        {/* Actions */}
        {isTraveller && request.status === 'pending' ? (
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.rejectBtn, pressed && { opacity: 0.75 }]}
              onPress={onReject}
              hitSlop={4}
            >
              <MaterialIcons name="close" size={16} color={Colors.error} />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.acceptBtn, pressed && { opacity: 0.8 }]}
              onPress={onAccept}
              hitSlop={4}
            >
              <MaterialIcons name="check" size={16} color={Colors.textInverse} />
              <Text style={styles.acceptBtnText}>Accept</Text>
            </Pressable>
          </View>
        ) : null}

        {request.status === 'accepted' && canOpenAcceptedActions ? (
          <View style={styles.actions}>
            {isSender ? (
              <Pressable
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.75 }]}
                onPress={onPayment}
              >
                <MaterialIcons name="account-balance-wallet" size={15} color={Colors.warning} />
                <Text style={[styles.actionBtnText, { color: Colors.warning }]}>Payment</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.75 }]}
              onPress={onChat}
            >
              <Ionicons name="chatbubble-outline" size={15} color={Colors.info} />
              <Text style={[styles.actionBtnText, { color: Colors.info }]}>Chat</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, { backgroundColor: Colors.primarySubtle, borderColor: Colors.primary + '44' }, pressed && { opacity: 0.75 }]}
              onPress={onDelivery}
            >
              <MaterialIcons name="local-shipping" size={15} color={Colors.primary} />
              <Text style={[styles.actionBtnText, { color: Colors.primary }]}>Track</Text>
            </Pressable>
          </View>
        ) : null}

        {request.status === 'completed' ? (
          <View style={styles.completedRow}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.completedText}>
              Delivered · {request.updatedAt ? new Date(request.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  requestItem: { padding: Spacing.md },
  requestBody: { gap: Spacing.sm },
  requestHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.sm },
  senderRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  senderAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  senderAvatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  senderName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  requestTime: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: BorderRadius.full, flexShrink: 0,
  },
  statusBadgeText: { fontSize: 10, fontWeight: FontWeight.bold },

  parcelInfoRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  parcelIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center', justifyContent: 'center',
  },
  parcelDesc: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  parcelMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  parcelRoute: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.medium },

  messageBox: {
    flexDirection: 'row', gap: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.sm, padding: Spacing.sm,
    borderLeftWidth: 2, borderLeftColor: Colors.surfaceBorderLight,
  },
  messageText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },

  priceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  priceLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  priceValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.primary },

  // Progress timeline
  progressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 0,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.sm, padding: Spacing.sm,
  },
  progressStep: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.surfaceBorderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  progressDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.surfaceBorder },
  progressLine: { flex: 1, height: 2, backgroundColor: Colors.surfaceBorderLight },
  progressLabel: { marginLeft: Spacing.sm, fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },

  // Actions
  actions: { flexDirection: 'row', gap: Spacing.sm },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.md,
    backgroundColor: Colors.errorSubtle, borderWidth: 1, borderColor: Colors.error + '44',
  },
  rejectBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.error },
  acceptBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  acceptBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textInverse },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  actionBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  completedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: Spacing.sm,
  },
  completedText: { fontSize: FontSize.sm, color: Colors.success, fontWeight: FontWeight.medium },
});
