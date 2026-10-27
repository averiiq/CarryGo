import React, { useRef, useState, memo } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Parcel } from '@/types';
import { FontSize, FontWeight, Spacing, BorderRadius, Motion } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatScheduleDate } from '@/components/feature/SevenDaySchedulePicker';
import { resolveImageUrl, getCategoryFallbackImage } from '@/constants/images';
import { Haptic } from '@/services/haptics.service';

const CATEGORY_META: Record<
  string,
  { label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string; bg: string }
> = {
  documents: { label: 'Documents', icon: 'description', color: '#D97706', bg: '#FEF3C7' },
  electronics: { label: 'Electronics', icon: 'devices', color: '#0284C7', bg: '#E0F2FE' },
  clothing: { label: 'Clothing', icon: 'checkroom', color: '#7C3AED', bg: '#F5F3FF' },
  food: { label: 'Food', icon: 'restaurant', color: '#EA580C', bg: '#FFEDD5' },
  medicine: { label: 'Medicine', icon: 'medical-services', color: '#DC2626', bg: '#FEE2E2' },
  other: { label: 'Box / General', icon: 'inventory-2', color: '#104BB9', bg: '#EEF4FF' },
};

export interface TravelerParcelCardProps {
  parcel: Parcel;
  onPress: () => void;
  testID?: string;
}

export const TravelerParcelCard = memo(function TravelerParcelCard({
  parcel,
  onPress,
  testID,
}: TravelerParcelCardProps) {
  const { C, S } = useThemeColors();
  const [imgError, setImgError] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const rawPhoto = parcel.imageUri || parcel.imageUris?.[0];
  const resolvedPhoto = resolveImageUrl(rawPhoto);
  const fallbackImage = getCategoryFallbackImage(parcel.category);
  const catMeta = CATEGORY_META[parcel.category] || CATEGORY_META.other;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: Motion.pressScale,
      useNativeDriver: true,
      tension: Motion.springFast.tension,
      friction: Motion.springFast.friction,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: Motion.springDefault.tension,
      friction: Motion.springDefault.friction,
    }).start();
  };

  const handlePress = () => {
    Haptic.select();
    onPress();
  };

  const formattedDate = parcel.deliveryDate
    ? formatScheduleDate(parcel.deliveryDate)
    : 'Flexible Date';

  const senderInitial = (parcel.userName || 'S').trim().charAt(0).toUpperCase();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, styles.wrapper]}>
      <Pressable
        testID={testID}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`Parcel request: ${parcel.category}, ${parcel.weight} kg, from ${parcel.fromCity} to ${parcel.toCity}. Expected reward: ₹${parcel.priceOffer}. Deliver by ${formattedDate}. Tap to make offer.`}
        style={[
          styles.card,
          S.card,
          {
            backgroundColor: C.card,
            borderColor: C.surfaceBorder,
          },
        ]}
      >
        {/* Top Header Row: Sender Info & Category Badge */}
        <View style={styles.topHeaderRow}>
          <View style={styles.senderWrap}>
            <View style={[styles.avatarCircle, { backgroundColor: C.surfaceElevated }]}>
              {parcel.userAvatar ? (
                <Image
                  source={{ uri: resolveImageUrl(parcel.userAvatar) }}
                  style={styles.avatarImg}
                  contentFit="cover"
                />
              ) : (
                <Text style={[styles.avatarText, { color: C.primary }]}>{senderInitial}</Text>
              )}
            </View>
            <View>
              <View style={styles.senderNameRow}>
                <Text style={[styles.senderName, { color: C.textPrimary }]} numberOfLines={1}>
                  {parcel.userName || 'Verified Sender'}
                </Text>
                <MaterialIcons name="verified" size={13} color="#10B981" />
              </View>
              <Text style={[styles.postedTimeText, { color: C.textMuted }]}>
                Deliver by {formattedDate}
              </Text>
            </View>
          </View>

          {/* Category Chip */}
          <View style={[styles.categoryBadge, { backgroundColor: catMeta.bg }]}>
            <MaterialIcons name={catMeta.icon} size={12} color={catMeta.color} />
            <Text style={[styles.categoryBadgeText, { color: catMeta.color }]}>
              {catMeta.label}
            </Text>
          </View>
        </View>

        {/* Content Body: Thumbnail + Details */}
        <View style={styles.bodyRow}>
          {/* Parcel Photo Thumbnail with Fallback */}
          <View style={[styles.thumbnailWrap, { backgroundColor: C.surfaceElevated }]}>
            <Image
              source={resolvedPhoto && !imgError ? { uri: resolvedPhoto } : fallbackImage}
              style={styles.thumbnail}
              contentFit="cover"
              onError={() => setImgError(true)}
              transition={200}
            />
            {/* Weight Pill overlay */}
            <View style={styles.weightBadgeOverlay}>
              <MaterialIcons name="fitness-center" size={10} color="#FFFFFF" />
              <Text style={styles.weightBadgeText}>{parcel.weight} kg</Text>
            </View>
          </View>

          {/* Route & Details Column */}
          <View style={styles.detailsCol}>
            {/* Pick & Drop Route */}
            <View style={styles.routeContainer}>
              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.cityText, { color: C.textPrimary }]} numberOfLines={1}>
                  {parcel.fromCity}
                </Text>
              </View>

              <View style={styles.routeLineWrap}>
                <View style={[styles.routeDashedLine, { borderColor: C.surfaceBorder }]} />
                <MaterialIcons name="arrow-downward" size={12} color={C.textMuted} />
              </View>

              <View style={styles.routePoint}>
                <View style={[styles.routeDot, { backgroundColor: '#EF4444' }]} />
                <Text style={[styles.cityText, { color: C.textPrimary }]} numberOfLines={1}>
                  {parcel.toCity}
                </Text>
              </View>
            </View>

            {/* Description (if provided) */}
            {parcel.description ? (
              <Text style={[styles.descText, { color: C.textSecondary }]} numberOfLines={1}>
                {parcel.description}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Footer Row: Expected Price Offer + Green Action Button */}
        <View style={[styles.footerRow, { borderTopColor: C.surfaceBorder }]}>
          <View style={styles.priceContainer}>
            <Text style={[styles.priceSubLabel, { color: C.textMuted }]}>
              SENDER'S OFFER
            </Text>
            <Text style={[styles.priceOfferAmount, { color: '#064E3B' }]}>
              ₹{parcel.priceOffer}
            </Text>
          </View>

          {/* Green Action Button strictly matching index.styles.ts */}
          <View
            style={[
              styles.greenActionBtn,
              { backgroundColor: '#10B981' },
            ]}
          >
            <Text style={styles.greenActionBtnText}>Make Offer</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.xl, // 24 from index.styles.ts
    borderWidth: 1,
    padding: Spacing.md,
    gap: 12,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  senderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  senderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  senderName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    maxWidth: 160,
  },
  postedTimeText: {
    fontSize: 10,
    marginTop: 1,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    textTransform: 'capitalize',
  },
  bodyRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  thumbnailWrap: {
    width: 76,
    height: 76,
    borderRadius: BorderRadius.md, // 14
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  weightBadgeOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  weightBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  detailsCol: {
    flex: 1,
    gap: 6,
  },
  routeContainer: {
    gap: 2,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cityText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    flex: 1,
  },
  routeLineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 3,
    height: 14,
  },
  routeDashedLine: {
    height: 12,
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
    marginRight: 4,
  },
  descText: {
    fontSize: 11,
    lineHeight: 15,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  priceContainer: {
    gap: 1,
  },
  priceSubLabel: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  priceOfferAmount: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    letterSpacing: -0.3,
  },
  // Green action button strictly matching index.styles.ts
  greenActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    minHeight: 42,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  greenActionBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
});
