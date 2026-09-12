import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/hooks/useThemeColors';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Request, Parcel } from '@/types';

type StatusKey = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled' | 'failed';

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

export function RequestItem({
  request,
  parcel,
  viewerRole,
  onAccept,
  onReject,
  onChat,
  onDelivery,
  onPayment,
}: RequestItemProps) {
  const { C } = useThemeColors();
  const isTraveller = viewerRole === 'traveller';
  const isSender = viewerRole === 'sender';
  const isPending = request.status === 'pending';
  const isAccepted = request.status === 'accepted';
  const isCompleted = request.status === 'completed';

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.surfaceBorder }]}>
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.personInfo}>
          <View style={[styles.avatar, { backgroundColor: C.primarySubtle }]}>
            <Text style={[styles.avatarText, { color: C.primary }]}>
              {request.senderName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: C.textPrimary }]}>{request.senderName}</Text>
              <MaterialIcons name="verified" size={14} color={C.success} />
            </View>
            <Text style={[styles.time, { color: C.textMuted }]}>
              {new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>

        {/* Price Tag */}
        <View style={styles.priceContainer}>
          <Text style={[styles.priceAmount, { color: C.textPrimary }]}>₹{request.price}</Text>
          <Text style={[styles.priceSub, { color: C.textMuted }]}>Offered</Text>
        </View>
      </View>

      {/* Parcel Details Chip */}
      {parcel ? (
        <View style={[styles.parcelPill, { backgroundColor: C.surfaceElevated }]}>
          <MaterialIcons name="inventory-2" size={16} color={C.primary} />
          <Text style={[styles.parcelDesc, { color: C.textPrimary }]} numberOfLines={1}>
            {parcel.description}
          </Text>
          <Text style={[styles.parcelWeight, { color: C.textMuted }]}>
            • {parcel.weight}kg
          </Text>
        </View>
      ) : null}

      {/* Message if provided */}
      {request.message ? (
        <Text style={[styles.message, { color: C.textSecondary }]} numberOfLines={2}>
          "{request.message}"
        </Text>
      ) : null}

      {/* Action Buttons */}
      {isTraveller && isPending ? (
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.declineBtn,
              { borderColor: C.surfaceBorder },
              pressed && { opacity: 0.7 }
            ]}
            onPress={onReject}
          >
            <Text style={[styles.declineText, { color: C.textSecondary }]}>Decline</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.acceptBtn,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
            ]}
            onPress={onAccept}
          >
            <LinearGradient
              colors={[C.primary, C.primaryDark]}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <MaterialIcons name="check" size={16} color="#fff" />
            <Text style={styles.acceptText}>Accept Delivery</Text>
          </Pressable>
        </View>
      ) : null}

      {isAccepted ? (
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryActionBtn,
              { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
              pressed && { opacity: 0.75 }
            ]}
            onPress={onChat}
          >
            <Ionicons name="chatbubble-outline" size={15} color={C.textPrimary} />
            <Text style={[styles.secondaryActionText, { color: C.textPrimary }]}>Chat</Text>
          </Pressable>

          {isSender ? (
            <Pressable
              style={({ pressed }) => [
                styles.secondaryActionBtn,
                { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder },
                pressed && { opacity: 0.75 }
              ]}
              onPress={onPayment}
            >
              <MaterialIcons name="account-balance-wallet" size={15} color={C.warning} />
              <Text style={[styles.secondaryActionText, { color: C.warning }]}>Escrow</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.primaryTrackingBtn,
              pressed && { opacity: 0.9 }
            ]}
            onPress={onDelivery}
          >
            <LinearGradient
              colors={[C.primary, C.primaryDark]}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <MaterialIcons name={isSender ? 'radar' : 'fact-check'} size={15} color="#fff" />
            <Text style={styles.primaryTrackingText}>
              {isSender ? 'Live Tracking' : 'Process Delivery'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {isCompleted ? (
        <View style={styles.completedRow}>
          <Ionicons name="checkmark-circle" size={16} color={C.success} />
          <Text style={[styles.completedText, { color: C.success }]}>
            Successfully Delivered
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: Spacing.mdl,
    borderWidth: 1,
    gap: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  personInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  time: {
    fontSize: 11,
    marginTop: 1,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.4,
  },
  priceSub: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
  },
  parcelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  parcelDesc: {
    fontSize: 13,
    fontWeight: FontWeight.semibold,
    flexShrink: 1,
  },
  parcelWeight: {
    fontSize: 12,
  },
  message: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: 2,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  declineText: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
  },
  acceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  acceptText: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  primaryTrackingBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryTrackingText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  completedText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
});
