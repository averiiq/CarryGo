import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import { submitRating } from '@/services/ratings.service';
import { useAlert } from '@/template';
import { GestureBottomSheet } from '@/components/ui/GestureBottomSheet';

interface RatingModalProps {
  visible: boolean;
  requestId: string;
  fromUserId: string;
  toUserId: string;
  toUserName: string;
  onDone: () => void;
}

export function RatingModal({ visible, requestId, fromUserId, toUserId, toUserName, onDone }: RatingModalProps) {
  const { C } = useThemeColors();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();

  const activeRating = hovered || rating;

  const ratingLabels = ['', 'Terrible', 'Poor', 'Good', 'Great', 'Excellent'];

  const handleSelectStar = (star: number) => {
    if (star === 5) {
      Haptic.success();
    } else {
      Haptic.select();
    }
    setRating(star);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Haptic.warning();
      showAlert('Select Rating', 'Please tap a star to rate your experience');
      return;
    }
    Haptic.confirm();
    setLoading(true);
    const { error } = await submitRating({ fromUserId, toUserId, requestId, rating, comment: comment.trim() || undefined });
    setLoading(false);
    if (error) {
      showAlert('Could Not Submit Rating', error);
      return;
    }
    onDone();
  };

  return (
    <GestureBottomSheet
      visible={visible}
      onClose={onDone}
      showHandle
      enablePanDownToClose
      maxHeight="88%"
    >
      <View style={{ paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg }}>
        {/* Header with Close */}
        <View style={styles.topRow}>
          <View style={{ width: 32 }} />
          <View style={[styles.iconRing, { backgroundColor: C.warningSubtle, borderColor: C.warning + '44' }]}>
            <Ionicons name="star" size={28} color={C.warning} />
          </View>
          <Pressable
            onPress={() => {
              Haptic.tap();
              onDone();
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close rating dialog"
            style={({ pressed }) => [
              styles.closeBtn,
              {
                backgroundColor: C.surfaceElevated,
                borderColor: C.surfaceBorder,
                transform: [{ scale: pressed ? 0.92 : 1 }],
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <MaterialIcons name="close" size={18} color={C.textMuted} />
          </Pressable>
        </View>

        <View style={styles.header}>
          <Text style={[styles.title, { color: C.textPrimary }]}>Rate Your Experience</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>How was your delivery with</Text>
          <Text style={[styles.userName, { color: C.primary }]}>{toUserName || 'User'}</Text>
        </View>

        {/* Stars */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              onPress={() => handleSelectStar(star)}
              onPressIn={() => setHovered(star)}
              onPressOut={() => setHovered(0)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.starBtn,
                { transform: [{ scale: pressed ? 0.86 : 1 }] },
              ]}
            >
              <Ionicons
                name={star <= activeRating ? 'star' : 'star-outline'}
                size={40}
                color={star <= activeRating ? C.warning : C.textMuted}
              />
            </Pressable>
          ))}
        </View>

        {activeRating > 0 ? (
          <Text style={[styles.ratingLabel, { color: C.warning }]}>{ratingLabels[activeRating]}</Text>
        ) : null}

        {/* Comment */}
        <View style={[styles.commentBox, { backgroundColor: C.surfaceElevated, borderColor: C.surfaceBorder }]}>
          <TextInput
            style={[styles.commentInput, { color: C.textPrimary }]}
            value={comment}
            onChangeText={setComment}
            placeholder="Leave a comment (optional)..."
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={3}
            maxLength={200}
            textAlignVertical="top"
            accessibilityLabel="Rating comment"
          />
          <Text style={[styles.charCount, { color: C.textMuted }]}>{comment.length}/200</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.skipBtn,
              {
                backgroundColor: C.surfaceElevated,
                borderColor: C.surfaceBorder,
                transform: [{ scale: pressed ? 0.97 : 1 }],
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={() => {
              Haptic.tap();
              onDone();
            }}
          >
            <Text style={[styles.skipText, { color: C.textSecondary }]}>Skip</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              {
                backgroundColor: C.primary,
                transform: [{ scale: pressed && rating > 0 && !loading ? 0.97 : 1 }],
              },
              rating === 0 && styles.submitBtnDisabled,
              loading && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={rating === 0 || loading}
          >
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
            <Text style={styles.submitText}>{loading ? 'Saving...' : 'Submit Rating'}</Text>
          </Pressable>
        </View>
      </View>
    </GestureBottomSheet>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: Spacing.xs,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.md },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, letterSpacing: -0.3 },
  subtitle: { fontSize: FontSize.sm },
  userName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginVertical: Spacing.sm },
  starBtn: { padding: 4 },
  ratingLabel: { textAlign: 'center', fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm },
  commentBox: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.md,
  },
  commentInput: {
    fontSize: FontSize.sm,
    minHeight: 64,
    lineHeight: 20,
  },
  charCount: { fontSize: FontSize.xs, textAlign: 'right', marginTop: 4 },
  actions: { flexDirection: 'row', gap: Spacing.md },
  skipBtn: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  skipText: { fontSize: FontSize.md, fontWeight: FontWeight.medium },
  submitBtn: {
    flex: 2,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: BorderRadius.lg,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: '#FFFFFF' },
});
