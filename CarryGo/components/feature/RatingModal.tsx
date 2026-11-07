import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import { submitRating } from '@/services/ratings.service';
import { useAlert } from '@/template';
import { ExpressionStarRating, RatingSubmission } from '@/components/ui/ExpressionStarRating';

export interface RatingModalProps {
  visible: boolean;
  requestId: string;
  fromUserId: string;
  toUserId: string;
  toUserName: string;
  onDone: () => void;
}

export function RatingModal({
  visible,
  requestId,
  fromUserId,
  toUserId,
  toUserName,
  onDone,
}: RatingModalProps) {
  const { C, isDark } = useThemeColors();
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();

  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.92);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  if (!visible) return null;

  const handleRatingSubmit = async (payload: RatingSubmission) => {
    if (payload.rating === 0) {
      Haptic.warning();
      showAlert('Select Rating', 'Please select a star rating to rate your delivery experience.');
      return;
    }

    setLoading(true);

    // Format comment with selected tags if any
    let finalComment = payload.comment;
    if (payload.selectedTags.length > 0) {
      const tagPrefix = `[${payload.selectedTags.join(', ')}]`;
      finalComment = finalComment ? `${tagPrefix} ${finalComment}` : tagPrefix;
    }

    const { error } = await submitRating({
      fromUserId,
      toUserId,
      requestId,
      rating: payload.rating,
      comment: finalComment || undefined,
    });
    setLoading(false);

    if (error) {
      showAlert('Could Not Submit Rating', error);
      return;
    }

    Haptic.success();
    setTimeout(() => {
      onDone();
    }, 450);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDone}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        {/* Dimming Backdrop */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            Haptic.tap();
            onDone();
          }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss rating dialog"
        >
          <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />
        </Pressable>

        {/* Floating Centered Creative Card */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
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
                backgroundColor: isDark ? C.surfaceElevated : '#F1F5F9',
                borderColor: isDark ? C.surfaceBorder : '#E2E8F0',
                transform: [{ scale: pressed ? 0.92 : 1 }],
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <MaterialIcons name="close" size={18} color={isDark ? C.textMuted : '#64748B'} />
          </Pressable>

          <ExpressionStarRating
            recipientName={toUserName || 'your delivery partner'}
            mode="delivery"
            onSubmit={handleRatingSubmit}
            isSubmitting={loading}
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 16, 26, 0.65)',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
