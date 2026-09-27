import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { BorderRadius, FontSize, FontWeight, Spacing, TouchTarget } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Haptic } from '@/services/haptics.service';
import { Parcel, PromotionalBanner } from '@/types';

// Bundled high-resolution photography assets
const BANNER_IMAGES = {
  urgentExpress: require('@/assets/images/banners/banner_urgent_express.jpg'),
  haryanaRoad: require('@/assets/images/banners/banner_haryana_road.jpg'),
  verifiedKyc: require('@/assets/images/banners/banner_verified_kyc.jpg'),
};

export function resolveBannerImage(imageUrl?: string | null): ImageSourcePropType {
  if (!imageUrl) return BANNER_IMAGES.urgentExpress;
  if (imageUrl === 'urgentExpress' || imageUrl === 'banner_urgent_express') return BANNER_IMAGES.urgentExpress;
  if (imageUrl === 'haryanaRoad' || imageUrl === 'banner_haryana_road') return BANNER_IMAGES.haryanaRoad;
  if (imageUrl === 'verifiedKyc' || imageUrl === 'banner_verified_kyc') return BANNER_IMAGES.verifiedKyc;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return { uri: imageUrl };
  }
  return BANNER_IMAGES.urgentExpress;
}

export interface PromoSlideItem {
  id: string;
  type: string;
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  ctaText: string;
  image: ImageSourcePropType;
  onPress: () => void;
}

export interface PromotionalBannerCarouselProps {
  banners?: PromotionalBanner[];
  urgentParcels?: Parcel[];
  onCarryParcel?: (parcelId: string) => void;
  onPressParcel?: (parcelId: string) => void;
  onCreateTrip?: () => void;
  onCreateParcel?: () => void;
  onOpenKyc?: () => void;
  onSelectCorridor?: (fromCity: string, toCity: string) => void;
  onNavigateDeepLink?: (url: string) => void;
}

export function buildPromotionalSlides({
  banners = [],
  urgentParcels = [],
  onCarryParcel,
  onPressParcel,
  onCreateTrip,
  onCreateParcel,
  onOpenKyc,
  onSelectCorridor,
  onNavigateDeepLink,
}: PromotionalBannerCarouselProps): PromoSlideItem[] {
  const topUrgentParcel =
    urgentParcels.find(
      (p) =>
        p.status === 'open' &&
        (p.category === 'medicine' ||
          p.category === 'documents' ||
          p.priceOffer >= 400 ||
          /urgent|emergency|express|today|fast|asap/i.test(p.description || ''))
    ) || urgentParcels[0];

  // If dynamic CMS banners are provided from admin panel, map them into slides
  if (banners && banners.length > 0) {
    return banners.map((banner, index) => {
      const bannerImg = resolveBannerImage(banner.image_url);

      const handlePress = () => {
        Haptic.confirm();
        switch (banner.cta_action) {
          case 'create_parcel':
            onCreateParcel?.();
            break;
          case 'create_trip':
            onCreateTrip?.();
            break;
          case 'open_kyc':
            onOpenKyc?.();
            break;
          case 'matching':
            if (topUrgentParcel) {
              if (onCarryParcel) onCarryParcel(topUrgentParcel.id);
              else onPressParcel?.(topUrgentParcel.id);
            } else {
              onCreateParcel?.();
            }
            break;
          case 'link':
            if (banner.deep_link) {
              onNavigateDeepLink?.(banner.deep_link);
            } else {
              onCreateParcel?.();
            }
            break;
          case 'none':
            break;
          default:
            onCreateParcel?.();
            break;
        }
      };

      return {
        id: banner.id || `cms-banner-${index}`,
        type: banner.type || 'urgent',
        badge: banner.badge_text || '⭐ FEATURED',
        badgeColor: banner.badge_color || '#F59E0B',
        title: banner.title,
        subtitle: banner.subtitle,
        ctaText: banner.cta_text || 'Learn More',
        image: bannerImg,
        onPress: handlePress,
      };
    });
  }

  // Fallback to high-resolution photography bundled slides if CMS is offline or has 0 active banners
  const list: PromoSlideItem[] = [];

  // Slide 1: Urgent Express Delivery
  list.push({
    id: 'slide-urgent-express',
    type: 'urgent',
    badge: '⚡ SAME-DAY EXPRESS',
    badgeColor: '#F59E0B',
    title: topUrgentParcel
      ? `${topUrgentParcel.fromCity} ➔ ${topUrgentParcel.toCity}`
      : 'Urgent Same-Day Delivery',
    subtitle: topUrgentParcel
      ? `₹${topUrgentParcel.priceOffer} Reward • ${topUrgentParcel.category} package ready for pickup.`
      : 'Send or carry urgent documents & essentials with travellers leaving today.',
    ctaText: topUrgentParcel ? '⚡ Carry & Earn' : 'Send Parcel',
    image: BANNER_IMAGES.urgentExpress,
    onPress: () => {
      Haptic.confirm();
      if (topUrgentParcel) {
        if (onCarryParcel) {
          onCarryParcel(topUrgentParcel.id);
        } else {
          onPressParcel?.(topUrgentParcel.id);
        }
      } else {
        onCreateParcel?.();
      }
    },
  });

  // Slide 2: Haryana Highway Corridor Special (0% fee)
  list.push({
    id: 'slide-haryana-corridor',
    type: 'corridor',
    badge: '🎉 0% COMMISSION',
    badgeColor: '#10B981',
    title: 'Haryana Corridor Sprint',
    subtitle: 'Keep 100% of your earnings on Delhi ⇄ Chandigarh, Gurugram & Rohtak.',
    ctaText: 'Post a Trip',
    image: BANNER_IMAGES.haryanaRoad,
    onPress: () => {
      Haptic.confirm();
      onCreateTrip?.();
    },
  });

  // Slide 3: Verified Traveler Trust Club
  list.push({
    id: 'slide-verified-kyc',
    type: 'kyc',
    badge: '⭐ VERIFIED TRAVELER',
    badgeColor: '#38BDF8',
    title: 'Unlock 2x More Deliveries',
    subtitle: 'Complete instant DigiLocker & Aadhaar KYC for priority matching & fast payouts.',
    ctaText: 'Verify in 2 Mins',
    image: BANNER_IMAGES.verifiedKyc,
    onPress: () => {
      Haptic.tap();
      onOpenKyc?.();
    },
  });

  return list;
}

export const PromotionalBannerCarousel = React.memo(function PromotionalBannerCarousel({
  banners = [],
  urgentParcels = [],
  onCarryParcel,
  onPressParcel,
  onCreateTrip,
  onCreateParcel,
  onOpenKyc,
  onSelectCorridor,
  onNavigateDeepLink,
}: PromotionalBannerCarouselProps) {
  const { C } = useThemeColors();
  const { width: screenWidth, isTablet } = useResponsive();

  const [activeIndex, setActiveIndex] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);

  const flatListRef = useRef<FlatList<PromoSlideItem>>(null);
  const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Responsive card dimension: banner width leaves ~20px peek of next card
  const cardWidth = useMemo(() => {
    if (isTablet) return 580;
    return Math.max(300, Math.min(screenWidth - Spacing.md * 2 - 20, 380));
  }, [isTablet, screenWidth]);

  const snapInterval = cardWidth + Spacing.smd;

  // Construct curated image slides via buildPromotionalSlides
  const slides = useMemo(() => {
    return buildPromotionalSlides({
      banners,
      urgentParcels,
      onCarryParcel,
      onPressParcel,
      onCreateTrip,
      onCreateParcel,
      onOpenKyc,
      onSelectCorridor,
      onNavigateDeepLink,
    });
  }, [
    banners,
    onCarryParcel,
    onCreateParcel,
    onCreateTrip,
    onNavigateDeepLink,
    onOpenKyc,
    onPressParcel,
    onSelectCorridor,
    urgentParcels,
  ]);

  // Auto-play timer (6s)
  useEffect(() => {
    if (isInteracting || slides.length <= 1) return;

    autoPlayTimerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % slides.length;
        flatListRef.current?.scrollToOffset({
          offset: next * snapInterval,
          animated: true,
        });
        return next;
      });
    }, 6000);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isInteracting, slides.length, snapInterval]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const idx = Math.round(offsetX / snapInterval);
      if (idx >= 0 && idx < slides.length && idx !== activeIndex) {
        setActiveIndex(idx);
      }
    },
    [activeIndex, slides.length, snapInterval]
  );

  const scrollToSlide = useCallback(
    (index: number) => {
      Haptic.tap();
      setActiveIndex(index);
      flatListRef.current?.scrollToOffset({
        offset: index * snapInterval,
        animated: true,
      });
    },
    [snapInterval]
  );

  const renderItem = useCallback(
    ({ item }: { item: PromoSlideItem }) => {
      return (
        <Pressable
          onPress={item.onPress}
          accessibilityRole="button"
          accessibilityLabel={`${item.badge}: ${item.title}`}
          style={({ pressed }) => [
            styles.cardContainer,
            { width: cardWidth },
            pressed && { opacity: 0.95, transform: [{ scale: 0.985 }] },
          ]}
        >
          {/* Background Photography Image */}
          <Image source={item.image} style={StyleSheet.absoluteFillObject} resizeMode="cover" />

          {/* Dark Gradient Scrim to ensure crisp typography */}
          <LinearGradient
            colors={[
              'rgba(15, 23, 42, 0.92)',
              'rgba(15, 23, 42, 0.72)',
              'rgba(15, 23, 42, 0.25)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Foreground Content */}
          <View style={styles.cardContent}>
            {/* Top Pill Badge */}
            <View style={[styles.badgePill, { borderColor: item.badgeColor + '55' }]}>
              <Text style={[styles.badgeText, { color: item.badgeColor }]}>{item.badge}</Text>
            </View>

            {/* Title & Subtitle */}
            <View style={styles.textWrap}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={2}>
                {item.subtitle}
              </Text>
            </View>

            {/* Bottom Action Pill */}
            <View style={styles.ctaPill}>
              <Text style={styles.ctaText}>{item.ctaText}</Text>
              <MaterialIcons name="arrow-forward" size={14} color="#0F172A" />
            </View>
          </View>
        </Pressable>
      );
    },
    [cardWidth]
  );

  return (
    <View style={styles.rootContainer}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onTouchStart={() => setIsInteracting(true)}
        onTouchEnd={() => setIsInteracting(false)}
        onScrollBeginDrag={() => setIsInteracting(true)}
        onScrollEndDrag={() => setIsInteracting(false)}
        getItemLayout={(_data, index) => ({
          length: snapInterval,
          offset: snapInterval * index,
          index,
        })}
      />

      {/* Sleek Pagination Dots */}
      <View style={styles.dotsRow}>
        {slides.map((slide, idx) => {
          const isActive = idx === activeIndex;
          return (
            <Pressable
              key={slide.id}
              onPress={() => scrollToSlide(idx)}
              hitSlop={TouchTarget.smallHitSlop}
              accessibilityRole="button"
              accessibilityLabel={`Go to banner ${idx + 1}`}
              style={[
                styles.dot,
                isActive
                  ? [styles.activeDot, { backgroundColor: slide.badgeColor, width: 18 }]
                  : [styles.inactiveDot, { backgroundColor: C.surfaceBorder }],
              ]}
            />
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  rootContainer: {
    marginVertical: Spacing.smd,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.smd,
  },
  cardContainer: {
    height: 155,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
    maxWidth: '78%',
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: FontSize.xs - 2,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  textWrap: {
    marginVertical: 4,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    lineHeight: 20,
  },
  cardSubtitle: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: FontSize.xs,
    lineHeight: 16,
    marginTop: 2,
  },
  ctaPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  ctaText: {
    color: '#0F172A',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 8,
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
  },
  activeDot: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  inactiveDot: {
    width: 5,
  },
});
