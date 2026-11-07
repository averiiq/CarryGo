import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
  PanResponder,
  LayoutChangeEvent,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';

export interface RatingConfig {
  label: string;
  subtext: string;
  color: string;
  bgTint: string;
  mouthPath: string;
  eyeType: 'sad' | 'neutral' | 'happy' | 'star';
  tags?: string[];
}

export const DEFAULT_APP_RATING_DATA: Record<number, RatingConfig> = {
  0: {
    label: 'Rate your experience',
    subtext: 'Tap or slide across the stars',
    color: '#94A3B8',
    bgTint: '#F8FAFC',
    mouthPath: 'M 38 62 Q 50 62 62 62',
    eyeType: 'neutral',
  },
  1: {
    label: 'Rough',
    subtext: 'What went wrong?',
    color: '#EF4444',
    bgTint: '#FEF2F2',
    mouthPath: 'M 36 66 Q 50 52 64 66',
    eyeType: 'sad',
    tags: ['Bugs / Crashes', 'Too Slow', 'Confusing UI', 'Support'],
  },
  2: {
    label: 'Underwhelming',
    subtext: 'How can we improve?',
    color: '#F97316',
    bgTint: '#FFF7ED',
    mouthPath: 'M 38 63 Q 50 57 62 63',
    eyeType: 'sad',
    tags: ['Missing Features', 'Design', 'Performance', 'Pricing'],
  },
  3: {
    label: 'Decent',
    subtext: 'What would make it 5 stars?',
    color: '#EAB308',
    bgTint: '#FEFCE8',
    mouthPath: 'M 38 60 Q 50 62 62 60',
    eyeType: 'neutral',
    tags: ['Needs Polish', 'Speed', 'More Options'],
  },
  4: {
    label: 'Great',
    subtext: 'Really enjoyed it',
    color: '#10B981',
    bgTint: '#ECFDF5',
    mouthPath: 'M 35 57 Q 50 70 65 57',
    eyeType: 'happy',
    tags: ['Smooth Flow', 'Great Experience', 'Helpful'],
  },
  5: {
    label: 'Obsessed!',
    subtext: 'Exceeded every expectation',
    color: '#8B5CF6',
    bgTint: '#F5F3FF',
    mouthPath: 'M 33 55 Q 50 75 67 55 Z',
    eyeType: 'star',
    tags: ['Love Everything', 'Lightning Fast', 'Flawless'],
  },
};

export const DELIVERY_RATING_DATA: Record<number, RatingConfig> = {
  0: {
    label: 'Rate your delivery',
    subtext: 'Tap or slide across the stars',
    color: '#94A3B8',
    bgTint: '#F8FAFC',
    mouthPath: 'M 38 62 Q 50 62 62 62',
    eyeType: 'neutral',
  },
  1: {
    label: 'Rough',
    subtext: 'What went wrong with the delivery?',
    color: '#EF4444',
    bgTint: '#FEF2F2',
    mouthPath: 'M 36 66 Q 50 52 64 66',
    eyeType: 'sad',
    tags: ['Late Delivery', 'Damaged Item', 'Unresponsive', 'Wrong Location'],
  },
  2: {
    label: 'Underwhelming',
    subtext: 'What could have gone better?',
    color: '#F97316',
    bgTint: '#FFF7ED',
    mouthPath: 'M 38 63 Q 50 57 62 63',
    eyeType: 'sad',
    tags: ['Delayed Pickup', 'Communication Gap', 'Handling Issue', 'Scheduling'],
  },
  3: {
    label: 'Decent',
    subtext: 'Satisfactory handover',
    color: '#EAB308',
    bgTint: '#FEFCE8',
    mouthPath: 'M 38 60 Q 50 62 62 60',
    eyeType: 'neutral',
    tags: ['Minor Delay', 'Could Be Faster', 'Needed More Updates'],
  },
  4: {
    label: 'Great',
    subtext: 'Punctual & careful traveler',
    color: '#10B981',
    bgTint: '#ECFDF5',
    mouthPath: 'M 35 57 Q 50 70 65 57',
    eyeType: 'happy',
    tags: ['On Time', 'Careful Handling', 'Polite & Friendly', 'Prompt Handover'],
  },
  5: {
    label: 'Obsessed!',
    subtext: '5-star courier experience',
    color: '#8B5CF6',
    bgTint: '#F5F3FF',
    mouthPath: 'M 33 55 Q 50 75 67 55 Z',
    eyeType: 'star',
    tags: ['Lightning Fast', 'Careful Handling', 'Super Friendly', 'Flawless Handover'],
  },
};

export interface RatingSubmission {
  rating: number;
  selectedTags: string[];
  comment: string;
}

export interface ExpressionStarRatingProps {
  initialRating?: number;
  onChange?: (rating: number) => void;
  onSubmit?: (data: RatingSubmission) => void;
  mode?: 'delivery' | 'app';
  customRatingData?: Record<number, RatingConfig>;
  recipientName?: string;
  isSubmitting?: boolean;
}

export function ExpressionStarRating({
  initialRating = 0,
  onChange,
  onSubmit,
  mode = 'delivery',
  customRatingData,
  recipientName,
  isSubmitting = false,
}: ExpressionStarRatingProps) {
  const { C, isDark } = useThemeColors();
  const [rating, setRating] = useState<number>(initialRating);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  const ratingSource = customRatingData || (mode === 'delivery' ? DELIVERY_RATING_DATA : DEFAULT_APP_RATING_DATA);

  // Refs for gesture tracking & animations
  const currentRatingRef = useRef<number>(initialRating);
  const rowWidthRef = useRef<number>(280);
  const faceScale = useRef(new Animated.Value(1)).current;
  const faceRotate = useRef(new Animated.Value(0)).current;
  const drawerAnim = useRef(
    new Animated.Value(initialRating > 0 ? 1 : 0)
  ).current;
  const starScales = useRef(
    [1, 2, 3, 4, 5].map(() => new Animated.Value(1))
  ).current;

  const currentConfig = ratingSource[rating] || ratingSource[0];

  useEffect(() => {
    if (initialRating > 0 && initialRating !== currentRatingRef.current) {
      currentRatingRef.current = initialRating;
      setRating(initialRating);
    }
  }, [initialRating]);

  const triggerAnimations = (selected: number, isScrubbing = false) => {
    const tiltDirection = selected <= 2 ? -1 : selected >= 4 ? 1 : 0;
    faceScale.setValue(isScrubbing ? 0.92 : 0.82);
    faceRotate.setValue(tiltDirection * 0.12);

    Animated.parallel([
      Animated.spring(faceScale, {
        toValue: 1,
        friction: 4,
        tension: 150,
        useNativeDriver: true,
      }),
      Animated.spring(faceRotate, {
        toValue: 0,
        friction: 5,
        tension: 110,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate active star pills
    const animations = starScales.map((scale, index) => {
      if (index < selected) {
        scale.setValue(isScrubbing ? 0.85 : 0.65);
        return Animated.spring(scale, {
          toValue: index + 1 === selected && isScrubbing ? 1.15 : 1,
          friction: 4,
          tension: 170,
          delay: isScrubbing ? 0 : index * 30,
          useNativeDriver: true,
        });
      }
      return Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      });
    });

    Animated.parallel(animations).start();

    // Expand feedback drawer once a rating is chosen
    const shouldShowDrawer = selected >= 1;
    Animated.timing(drawerAnim, {
      toValue: shouldShowDrawer ? 1 : 0,
      duration: 240,
      useNativeDriver: false,
    }).start();
  };

  const updateRating = (newRating: number, isScrubbing = false) => {
    const clamped = Math.max(1, Math.min(5, newRating));
    if (clamped !== currentRatingRef.current) {
      currentRatingRef.current = clamped;
      setRating(clamped);
      setSubmitted(false);
      if (clamped === 5) {
        Haptic.success();
      } else {
        Haptic.select();
      }
      onChange?.(clamped);
      triggerAnimations(clamped, isScrubbing);
    }
  };

  // Convert horizontal touch location inside the star row to 1..5
  const calculateStarFromTouch = (locationX: number) => {
    const width = rowWidthRef.current || 280;
    const rawStar = Math.ceil((locationX / width) * 5);
    return Math.max(1, Math.min(5, rawStar));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const star = calculateStarFromTouch(evt.nativeEvent.locationX);
        updateRating(star, false);
      },
      onPanResponderMove: (evt) => {
        const star = calculateStarFromTouch(evt.nativeEvent.locationX);
        updateRating(star, true);
      },
      onPanResponderRelease: () => {
        // Settle active star back to normal scale of 1 on finger lift
        Animated.parallel(
          starScales.map((scale) =>
            Animated.spring(scale, {
              toValue: 1,
              friction: 5,
              useNativeDriver: true,
            })
          )
        ).start();
      },
    })
  ).current;

  const handleRowLayout = (e: LayoutChangeEvent) => {
    rowWidthRef.current = e.nativeEvent.layout.width;
  };

  const toggleTag = (tag: string) => {
    Haptic.tap();
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    Haptic.confirm();
    setSubmitted(true);
    onSubmit?.({
      rating,
      selectedTags,
      comment: comment.trim(),
    });
  };

  const rotateInterpolation = faceRotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-1rad', '1rad'],
  });

  const drawerMaxHeight = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 240],
  });

  const renderEyes = (type: RatingConfig['eyeType'], color: string) => {
    switch (type) {
      case 'sad':
        return (
          <G>
            <Path
              d="M 28 36 L 38 40 M 72 36 L 62 40"
              stroke={color}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <Circle cx="35" cy="45" r="4" fill={color} />
            <Circle cx="65" cy="45" r="4" fill={color} />
          </G>
        );
      case 'happy':
        return (
          <G>
            <Path
              d="M 29 44 Q 35 36 41 44"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M 59 44 Q 65 36 71 44"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </G>
        );
      case 'star':
        return (
          <G fill={color}>
            <Path
              transform="translate(26, 33) scale(0.75)"
              d="M12 2L14.8 8.5L22 9.3L16.5 14L18.2 21L12 17.3L5.8 21L7.5 14L2 9.3L9.2 8.5L12 2Z"
            />
            <Path
              transform="translate(56, 33) scale(0.75)"
              d="M12 2L14.8 8.5L22 9.3L16.5 14L18.2 21L12 17.3L5.8 21L7.5 14L2 9.3L9.2 8.5L12 2Z"
            />
          </G>
        );
      default:
        return (
          <G>
            <Circle cx="35" cy="43" r="4.5" fill={color} />
            <Circle cx="65" cy="43" r="4.5" fill={color} />
          </G>
        );
    }
  };

  const dynamicBgTint = isDark
    ? rating === 0
      ? 'rgba(255, 255, 255, 0.04)'
      : `${currentConfig.color}1E`
    : currentConfig.bgTint;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? C.surface : '#FFFFFF',
          borderColor: isDark ? C.surfaceBorder : '#F1F5F9',
        },
      ]}
    >
      {/* Animated Expression Orb */}
      <Animated.View
        style={[
          styles.faceContainer,
          {
            backgroundColor: dynamicBgTint,
            borderColor: `${currentConfig.color}40`,
            transform: [{ scale: faceScale }, { rotate: rotateInterpolation }],
          },
        ]}
      >
        <Svg width={88} height={88} viewBox="0 0 100 100">
          {renderEyes(currentConfig.eyeType, currentConfig.color)}
          <Path
            d={currentConfig.mouthPath}
            stroke={currentConfig.color}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={rating === 5 ? currentConfig.color : 'none'}
          />
        </Svg>
      </Animated.View>

      {/* Dynamic Copy */}
      <View style={styles.textWrap}>
        <Text style={[styles.label, { color: isDark ? C.textPrimary : '#0F172A' }]}>
          {currentConfig.label}
        </Text>
        <Text style={[styles.subtext, { color: isDark ? C.textMuted : '#64748B' }]}>
          {recipientName && rating === 0
            ? `How was your delivery with ${recipientName}?`
            : currentConfig.subtext}
        </Text>
      </View>

      {/* Touch & Scrub Star Row */}
      <View
        style={styles.starsRow}
        onLayout={handleRowLayout}
        {...panResponder.panHandlers}
      >
        {[1, 2, 3, 4, 5].map((star, index) => {
          const isFilled = star <= rating;
          return (
            <Animated.View
              key={star}
              pointerEvents="none"
              style={[
                styles.starPill,
                isFilled && { backgroundColor: dynamicBgTint },
                { transform: [{ scale: starScales[index] }] },
              ]}
            >
              <Svg width={32} height={32} viewBox="0 0 24 24">
                <Path
                  d="M12 2.5L14.9 8.6L21.6 9.4L16.7 14L17.9 20.6L12 17.4L6.1 20.6L7.3 14L2.4 9.4L9.1 8.6L12 2.5Z"
                  fill={isFilled ? currentConfig.color : 'transparent'}
                  stroke={isFilled ? currentConfig.color : (isDark ? '#475569' : '#CBD5E1')}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              </Svg>
            </Animated.View>
          );
        })}
      </View>

      {/* Expandable Feedback Drawer */}
      <Animated.View
        style={[
          styles.drawerContainer,
          {
            maxHeight: drawerMaxHeight,
            opacity: drawerAnim,
          },
        ]}
      >
        {/* Quick Feedback Chips */}
        {currentConfig.tags && (
          <View style={styles.tagsRow}>
            {currentConfig.tags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: isDark ? C.surfaceElevated : '#F8FAFC',
                      borderColor: isDark ? C.surfaceBorder : '#E2E8F0',
                    },
                    active && {
                      backgroundColor: dynamicBgTint,
                      borderColor: currentConfig.color,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      { color: isDark ? C.textSecondary : '#475569' },
                      active && { color: currentConfig.color, fontWeight: '700' },
                    ]}
                  >
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Minimal Comment Input */}
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: isDark ? C.surfaceElevated : '#F8FAFC',
              borderColor: isDark ? C.surfaceBorder : '#E2E8F0',
              color: isDark ? C.textPrimary : '#0F172A',
            },
          ]}
          placeholder="Add details about the trip or handover (optional)..."
          placeholderTextColor={isDark ? C.textMuted : '#94A3B8'}
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={220}
        />
      </Animated.View>

      {/* Submit Action Button (Appears once rated) */}
      {rating > 0 && (
        <Pressable
          onPress={handleSubmit}
          disabled={submitted || isSubmitting}
          style={({ pressed }) => [
            styles.submitButton,
            { backgroundColor: submitted ? '#10B981' : currentConfig.color },
            (submitted || isSubmitting) && { opacity: 0.8 },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>
              {submitted ? 'Thanks for your feedback! ✓' : 'Submit Rating'}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  faceContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 14,
  },
  textWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  subtext: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 272,
    paddingVertical: 4,
  },
  starPill: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    marginBottom: 12,
    justifyContent: 'center',
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    minHeight: 68,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  submitButton: {
    width: '100%',
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ExpressionStarRating;

