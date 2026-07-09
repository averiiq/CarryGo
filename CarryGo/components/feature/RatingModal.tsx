import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { submitRating } from '@/services/ratings.service';
import { useAlert } from '@/template';

interface RatingModalProps {
  visible: boolean;
  requestId: string;
  fromUserId: string;
  toUserId: string;
  toUserName: string;
  onDone: () => void;
}

export function RatingModal({ visible, requestId, fromUserId, toUserId, toUserName, onDone }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();

  const activeRating = hovered || rating;

  const ratingLabels = ['', 'Terrible', 'Poor', 'Good', 'Great', 'Excellent'];

  const handleSubmit = async () => {
    if (rating === 0) {
      showAlert('Select Rating', 'Please tap a star to rate your experience');
      return;
    }
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconRing}>
              <Ionicons name="star" size={28} color={Colors.warning} />
            </View>
            <Text style={styles.title}>Rate Your Experience</Text>
            <Text style={styles.subtitle}>How was your delivery with</Text>
            <Text style={styles.userName}>{toUserName}</Text>
          </View>

          {/* Stars */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <Pressable
                key={star}
                onPress={() => setRating(star)}
                onPressIn={() => setHovered(star)}
                onPressOut={() => setHovered(0)}
                hitSlop={8}
              >
                <Ionicons
                  name={star <= activeRating ? 'star' : 'star-outline'}
                  size={42}
                  color={star <= activeRating ? Colors.warning : Colors.textMuted}
                />
              </Pressable>
            ))}
          </View>

          {activeRating > 0 ? (
            <Text style={styles.ratingLabel}>{ratingLabels[activeRating]}</Text>
          ) : null}

          {/* Comment */}
          <View style={styles.commentBox}>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Leave a comment (optional)..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              maxLength={200}
              textAlignVertical="top"
              accessibilityLabel="Rating comment"
            />
            <Text style={styles.charCount}>{comment.length}/200</Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.skipBtn]}
              onPress={onDone}
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
            <Pressable
              style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={rating === 0 || loading}
            >
              <Ionicons name="checkmark-circle" size={18} color={Colors.textInverse} />
              <Text style={styles.submitText}>{loading ? 'Saving...' : 'Submit Rating'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: Colors.overlayMedium,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadow.card,
  },
  header: { alignItems: 'center', gap: Spacing.sm },
  iconRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.warningSubtle,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.warning + '44',
  },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary },
  userName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.primary },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  ratingLabel: { textAlign: 'center', fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.warning },
  commentBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    padding: Spacing.sm,
  },
  commentInput: {
    fontSize: FontSize.md, color: Colors.textPrimary,
    minHeight: 70, lineHeight: 22,
  },
  charCount: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right', marginTop: 4 },
  actions: { flexDirection: 'row', gap: Spacing.md },
  skipBtn: {
    flex: 1, paddingVertical: Spacing.sm + 2,
    alignItems: 'center', borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  skipText: { fontSize: FontSize.md, color: Colors.textMuted, fontWeight: FontWeight.medium },
  submitBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textInverse },
});
