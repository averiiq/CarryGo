import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
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
import { Parcel, Request } from '@/types';

export type ShowcaseSlideCategory = 'live' | 'urgent' | 'promo';

export interface ShowcaseSlide {
  id: string;
  category: ShowcaseSlideCategory;
  type:
    | 'live_delivery'
    | 'urgent_parcel'
    | 'promo_haryana'
    | 'promo_kyc'
    | 'promo_escrow'
    | 'promo_express';
  title: string;
  subtitle: string;
  badgeLabel: string;
  gradientColors: [string, string];
  accentColor: string;
  badgeBg: string;
  price?: number;
  fromCity?: string;
  toCity?: string;
  weight?: number;
  categoryIcon?: keyof typeof MaterialIcons.glyphMap;
  ctaText: string;
  request?: Request;
  parcel?: Parcel;
  onPress: () => void;
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
}

export interface TopLiveDeliveryShowcaseProps {
  liveRequests?: Request[];
  activeRequest?: Request | null;
  urgentParcels?: Parcel[];
  userId?: string;
  onTrackDelivery: (requestId: string) => void;
  onViewRequests?: () => void;
  onCarryParcel?: (parcelId: string) => void;
  onPressParcel?: (parcelId: string) => void;
  onCreateTrip?: () => void;
  onCreateParcel?: () => void;
  onOpenKyc?: () => void;
  onSelectCorridor?: (fromCity: string, toCity: string) => void;
}

// Built-in curated corridor urgent opportunities if live marketplace has no urgent items
const DEFAULT_URGENT_SHOWCASE_PARCELS: Partial<Parcel>[] = [
  {
    id: 'urgent-demo-1',
    userName: 'Aakash Verma',
    fromCity: 'Gurugram',
    toCity: 'Chandigarh',
    category: 'documents',
    description: 'Urgent legal documents needed today before 6 PM. Courier delayed.',
    weight: 1.2,
    priceOffer: 650,
    status: 'open',
  },
  {
    id: 'urgent-demo-2',
    userName: 'Pooja Sharma',
    fromCity: 'Delhi',
    toCity: 'Rohtak',
    category: 'medicine',
    description: 'Critical temperature-sensitive medical supplies for clinic delivery.',
    weight: 2.0,
    priceOffer: 500,
    status: 'open',
  },
];

export function buildShowcaseSlides({
  liveRequests = [],
  activeRequest,
  urgentParcels = [],
  userId,
  onTrackDelivery,
  onViewRequests,
  onCarryParcel,
  onPressParcel,
  onCreateTrip,
  onCreateParcel,
  onOpenKyc,
  onSelectCorridor,
}: TopLiveDeliveryShowcaseProps): ShowcaseSlide[] {
  // Combine and deduplicate active requests
  const set = new Map<string, Request>();
  if (activeRequest) {
    set.set(activeRequest.id, activeRequest);
  }
  liveRequests.forEach((req) => {
    if (req.status === 'accepted' || (req.status === 'pending' && req.travellerId === userId)) {
      set.set(req.id, req);
    }
  });
  const consolidatedLiveRequests = Array.from(set.values());

  // Determine urgent parcels to display
  const fromProps = urgentParcels.filter(
    (p) =>
      p.status === 'open' &&
      (p.category === 'medicine' ||
        p.category === 'documents' ||
        p.priceOffer >= 400 ||
        /urgent|emergency|express|today|fast|asap/i.test(p.description || ''))
  );
  const effectiveUrgentParcels =
    fromProps.length > 0 ? fromProps.slice(0, 3) : (DEFAULT_URGENT_SHOWCASE_PARCELS as Parcel[]);

  const list: ShowcaseSlide[] = [];

  // 1. LIVE DELIVERY SLIDES (High Priority)
  consolidatedLiveRequests.forEach((req) => {
    const isAccepted = req.status === 'accepted';
    const isTraveller = req.travellerId === userId;

    const badgeLabel = isAccepted
      ? 'LIVE IN-TRANSIT'
      : isTraveller
        ? 'ACTION REQUIRED'
        : 'REQUEST PENDING';

    const title = `${req.fromCity || 'Origin'} ➔ ${req.toCity || 'Destination'}`;
    const subtitle = isAccepted
      ? isTraveller
        ? 'You are carrying this parcel • Pickup/Drop OTP ready'
        : 'Traveler assigned • Track live journey & coordinates'
      : isTraveller
        ? 'Sender sent a delivery request • Tap to review'
        : 'Waiting for traveler confirmation';

    list.push({
      id: `live-${req.id}`,
      category: 'live',
      type: 'live_delivery',
      title,
      subtitle,
      badgeLabel,
      gradientColors: isAccepted
        ? ['rgba(6, 78, 59, 0.98)', 'rgba(15, 23, 42, 0.98)']
        : ['rgba(120, 53, 15, 0.98)', 'rgba(23, 23, 23, 0.98)'],
      accentColor: isAccepted ? '#10B981' : '#F59E0B',
      badgeBg: isAccepted ? 'rgba(16, 185, 129, 0.22)' : 'rgba(245, 158, 11, 0.22)',
      price: req.price,
      fromCity: req.fromCity,
      toCity: req.toCity,
      categoryIcon: 'local-shipping',
      ctaText: isAccepted ? 'Track Live' : 'Review',
      request: req,
      onPress: () => {
        Haptic.tap();
        if (isAccepted) {
          onTrackDelivery(req.id);
        } else {
          onViewRequests?.();
        }
      },
    });
  });

  // 2. URGENT DELIVERY SLIDES (Bounties / Same-day dispatch)
  effectiveUrgentParcels.forEach((parcel) => {
    const isRealParcel = !parcel.id.startsWith('urgent-demo');
    const categoryIcon: keyof typeof MaterialIcons.glyphMap =
      parcel.category === 'medicine'
        ? 'medical-services'
        : parcel.category === 'documents'
          ? 'description'
          : parcel.category === 'electronics'
            ? 'devices'
            : 'inventory-2';

    list.push({
      id: `urgent-${parcel.id}`,
      category: 'urgent',
      type: 'urgent_parcel',
      title: `${parcel.fromCity} ➔ ${parcel.toCity}`,
      subtitle: parcel.description || 'Same-day express parcel needing traveler delivery.',
      badgeLabel: '⚡ URGENT DISPATCH',
      gradientColors: ['rgba(154, 52, 18, 0.98)', 'rgba(67, 20, 7, 0.98)'],
      accentColor: '#FB923C',
      badgeBg: 'rgba(251, 146, 60, 0.22)',
      price: parcel.priceOffer,
      fromCity: parcel.fromCity,
      toCity: parcel.toCity,
      weight: parcel.weight,
      categoryIcon,
      parcel,
      ctaText: isRealParcel ? '⚡ Carry & Earn' : 'Explore Route',
      onPress: () => {
        Haptic.tap();
        if (isRealParcel) {
          onCarryParcel?.(parcel.id);
        } else if (parcel.fromCity && parcel.toCity) {
          onSelectCorridor?.(parcel.fromCity, parcel.toCity);
        }
      },
      secondaryAction: isRealParcel
        ? {
            label: 'Details',
            onPress: () => onPressParcel?.(parcel.id),
          }
        : undefined,
    });
  });

  // 3. PROMOTIONAL & FEATURE BANNERS
  // A: Haryana Corridor Sprint
  list.push({
    id: 'promo-haryana',
    category: 'promo',
    type: 'promo_haryana',
    title: '0% Platform Fee on Haryana Routes',
    subtitle: 'Travelers keep 100% of delivery earnings on Gurugram, Rohtak & Chandigarh routes this week.',
    badgeLabel: '🎉 HARYANA SPRINT',
    gradientColors: ['rgba(55, 48, 163, 0.98)', 'rgba(30, 27, 75, 0.98)'],
    accentColor: '#818CF8',
    badgeBg: 'rgba(129, 140, 248, 0.22)',
    categoryIcon: 'directions-car',
    ctaText: 'Post Trip & Earn',
    onPress: () => {
      Haptic.confirm();
      onCreateTrip?.();
    },
  });

  // B: Verified Traveler Advantage
  list.push({
    id: 'promo-kyc',
    category: 'promo',
    type: 'promo_kyc',
    title: 'Get 2x More Parcel Matches',
    subtitle: 'Complete instant DigiLocker & Aadhaar verification to unlock high-value parcels & instant payouts.',
    badgeLabel: '⭐ PRIORITY TRUST',
    gradientColors: ['rgba(13, 148, 136, 0.98)', 'rgba(17, 94, 89, 0.98)'],
    accentColor: '#2DD4BF',
    badgeBg: 'rgba(45, 212, 191, 0.22)',
    categoryIcon: 'verified-user',
    ctaText: 'Verify KYC Now',
    onPress: () => {
      Haptic.tap();
      onOpenKyc?.();
    },
  });

  // C: Escrow Protection Shield
  list.push({
    id: 'promo-escrow',
    category: 'promo',
    type: 'promo_escrow',
    title: '100% Insured Escrow Guarantee',
    subtitle: 'Senders pay securely upfront; funds are released to travelers only upon 6-digit delivery OTP verification.',
    badgeLabel: '🛡️ ESCROW SAFE',
    gradientColors: ['rgba(2, 132, 199, 0.98)', 'rgba(12, 74, 110, 0.98)'],
    accentColor: '#38BDF8',
    badgeBg: 'rgba(56, 189, 248, 0.22)',
    categoryIcon: 'lock',
    ctaText: 'Send Safe Parcel',
    onPress: () => {
      Haptic.tap();
      onCreateParcel?.();
    },
  });

  return list;
}

export const TopLiveDeliveryShowcase = React.memo(function TopLiveDeliveryShowcase({
  liveRequests = [],
  activeRequest,
  urgentParcels = [],
  userId,
  onTrackDelivery,
  onViewRequests,
  onCarryParcel,
  onPressParcel,
  onCreateTrip,
  onCreateParcel,
  onOpenKyc,
  onSelectCorridor,
}: TopLiveDeliveryShowcaseProps) {
  const { C } = useThemeColors();
  const { width: screenWidth, isTablet } = useResponsive();

  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<ShowcaseSlideCategory | 'all'>('all');
  const [isInteracting, setIsInteracting] = useState(false);

  const flatListRef = useRef<FlatList<ShowcaseSlide>>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Responsive card dimension
  const cardWidth = useMemo(() => {
    if (isTablet) return 560;
    // Standard phone: leaves ~22px of next card peeking for intuitive swipe cue
    return Math.max(300, Math.min(screenWidth - Spacing.md * 2 - 24, 380));
  }, [isTablet, screenWidth]);

  const snapInterval = cardWidth + Spacing.smd;

  // Radar Pulse animation for live cards
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Construct structured slides list via buildShowcaseSlides
  const slides = useMemo(() => {
    return buildShowcaseSlides({
      liveRequests,
      activeRequest,
      urgentParcels,
      userId,
      onTrackDelivery,
      onViewRequests,
      onCarryParcel,
      onPressParcel,
      onCreateTrip,
      onCreateParcel,
      onOpenKyc,
      onSelectCorridor,
    });
  }, [
    activeRequest,
    liveRequests,
    onCarryParcel,
    onCreateParcel,
    onCreateTrip,
    onOpenKyc,
    onPressParcel,
    onSelectCorridor,
    onTrackDelivery,
    onViewRequests,
    urgentParcels,
    userId,
  ]);

  // Filter slides by category pill selection
  const filteredSlides = useMemo(() => {
    if (selectedCategory === 'all') return slides;
    return slides.filter((s) => s.category === selectedCategory);
  }, [selectedCategory, slides]);

  // Auto-advance carousel smoothly every 6 seconds when not interacting
  useEffect(() => {
    if (isInteracting || filteredSlides.length <= 1) return;

    autoPlayTimerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % filteredSlides.length;
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
  }, [filteredSlides.length, isInteracting, snapInterval]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const idx = Math.round(offsetX / snapInterval);
      if (idx >= 0 && idx < filteredSlides.length && idx !== activeIndex) {
        setActiveIndex(idx);
      }
    },
    [activeIndex, filteredSlides.length, snapInterval]
  );

  const handleSelectCategory = useCallback(
    (cat: ShowcaseSlideCategory | 'all') => {
      Haptic.select();
      setSelectedCategory(cat);
      setActiveIndex(0);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    },
    []
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

  // Available categories count
  const liveCount = useMemo(() => slides.filter((s) => s.category === 'live').length, [slides]);
  const urgentCount = useMemo(() => slides.filter((s) => s.category === 'urgent').length, [slides]);
  const promoCount = useMemo(() => slides.filter((s) => s.category === 'promo').length, [slides]);

  const renderSlideItem = useCallback(
    ({ item, index }: { item: ShowcaseSlide; index: number }) => {
      const isLive = item.category === 'live';
      const isUrgent = item.category === 'urgent';

      return (
        <Pressable
          onPress={item.onPress}
          accessibilityRole="button"
          accessibilityLabel={`${item.badgeLabel}: ${item.title}`}
          style={({ pressed }) => [
            styles.cardWrapper,
            { width: cardWidth, borderColor: item.accentColor + '55' },
            pressed && { opacity: 0.95, transform: [{ scale: 0.985 }] },
          ]}
        >
          <LinearGradient
            colors={item.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            {/* Top Row: Badge + Price / Meta Pill */}
            <View style={styles.cardTopRow}>
              <View style={[styles.badgeWrap, { backgroundColor: item.badgeBg, borderColor: item.accentColor + '66' }]}>
                {isLive ? (
                  <Animated.View
                    style={[styles.radarPulseDot, { backgroundColor: item.accentColor, opacity: pulseAnim }]}
                  />
                ) : (
                  <MaterialIcons
                    name={isUrgent ? 'bolt' : item.categoryIcon || 'stars'}
                    size={14}
                    color={item.accentColor}
                  />
                )}
                <Text style={[styles.badgeLabelText, { color: item.accentColor }]}>{item.badgeLabel}</Text>
              </View>

              {item.price ? (
                <View style={styles.pricePill}>
                  <Text style={styles.pricePillText}>₹{item.price}</Text>
                  <Text style={styles.pricePillSub}>
                    {isLive ? '• Escrow' : isUrgent ? '• Bounty' : ''}
                  </Text>
                </View>
              ) : (
                <View style={styles.infoPill}>
                  <MaterialIcons name="security" size={13} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.infoPillText}>CarryGo Verified</Text>
                </View>
              )}
            </View>

            {/* Middle Section: Route / Headline visual */}
            <View style={styles.cardBody}>
              {item.fromCity && item.toCity ? (
                <View style={styles.routeHeaderRow}>
                  <Text style={styles.cityNameText} numberOfLines={1}>
                    {item.fromCity}
                  </Text>
                  <View style={styles.routeArrowContainer}>
                    <View style={styles.routeArrowLine} />
                    <View style={[styles.routeIconBubble, { backgroundColor: item.accentColor }]}>
                      <MaterialIcons
                        name={item.categoryIcon || 'local-shipping'}
                        size={13}
                        color="#FFFFFF"
                      />
                    </View>
                    <View style={styles.routeArrowLine} />
                  </View>
                  <Text style={styles.cityNameText} numberOfLines={1}>
                    {item.toCity}
                  </Text>
                </View>
              ) : (
                <View style={styles.headlineWrap}>
                  <Text style={styles.promoHeadlineText} numberOfLines={2}>
                    {item.title}
                  </Text>
                </View>
              )}

              {/* Subtitle description */}
              <Text style={styles.subtitleText} numberOfLines={2}>
                {item.subtitle}
              </Text>

              {/* Visual Track Indicators */}
              {isLive ? (
                <View style={styles.liveProgressTrack}>
                  <View style={[styles.progressStep, styles.progressStepActive]}>
                    <View style={[styles.progressDot, { backgroundColor: item.accentColor }]} />
                    <Text style={styles.progressStepText}>Matched</Text>
                  </View>
                  <View style={[styles.progressLine, { backgroundColor: item.accentColor }]} />
                  <View style={[styles.progressStep, styles.progressStepActive]}>
                    <View style={[styles.progressDot, { backgroundColor: item.accentColor }]} />
                    <Text style={styles.progressStepText}>Pickup</Text>
                  </View>
                  <View style={styles.progressLine} />
                  <View style={styles.progressStep}>
                    <View style={styles.progressDotInactive} />
                    <Text style={styles.progressStepTextInactive}>In Transit</Text>
                  </View>
                  <View style={styles.progressLine} />
                  <View style={styles.progressStep}>
                    <View style={styles.progressDotInactive} />
                    <Text style={styles.progressStepTextInactive}>Delivered</Text>
                  </View>
                </View>
              ) : isUrgent ? (
                <View style={styles.urgentMetaRow}>
                  <View style={styles.urgentChip}>
                    <MaterialIcons name="alarm" size={13} color="#FED7AA" />
                    <Text style={styles.urgentChipText}>Today Express</Text>
                  </View>
                  {item.weight ? (
                    <View style={styles.urgentChip}>
                      <MaterialIcons name="fitness-center" size={13} color="#FED7AA" />
                      <Text style={styles.urgentChipText}>{item.weight} kg</Text>
                    </View>
                  ) : null}
                  <View style={styles.urgentChip}>
                    <MaterialIcons name="verified" size={13} color="#FED7AA" />
                    <Text style={styles.urgentChipText}>Escrow Safe</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.promoPerksRow}>
                  <View style={styles.promoPerkItem}>
                    <MaterialIcons name="check-circle" size={13} color={item.accentColor} />
                    <Text style={styles.promoPerkText}>Verified Trips</Text>
                  </View>
                  <View style={styles.promoPerkItem}>
                    <MaterialIcons name="check-circle" size={13} color={item.accentColor} />
                    <Text style={styles.promoPerkText}>Instant UPI</Text>
                  </View>
                  <View style={styles.promoPerkItem}>
                    <MaterialIcons name="check-circle" size={13} color={item.accentColor} />
                    <Text style={styles.promoPerkText}>Dual OTP</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Bottom Row: CTA Button + Secondary Action */}
            <View style={styles.cardFooterRow}>
              {item.secondaryAction ? (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    Haptic.tap();
                    item.secondaryAction?.onPress();
                  }}
                  hitSlop={TouchTarget.smallHitSlop}
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryBtnText}>{item.secondaryAction.label}</Text>
                </Pressable>
              ) : (
                <View style={styles.footerBrandWrap}>
                  <MaterialIcons name="flash-on" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.footerBrandText}>CarryGo Express Radar</Text>
                </View>
              )}

              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  item.onPress();
                }}
                hitSlop={TouchTarget.smallHitSlop}
                style={[styles.primaryCtaBtn, { backgroundColor: item.accentColor }]}
              >
                <Text style={styles.primaryCtaText}>{item.ctaText}</Text>
                <MaterialIcons name="arrow-forward" size={15} color="#FFFFFF" />
              </Pressable>
            </View>
          </LinearGradient>
        </Pressable>
      );
    },
    [cardWidth, pulseAnim]
  );

  if (filteredSlides.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Top Header & Category Selector Tabs */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionPulseDot, { backgroundColor: liveCount > 0 ? '#10B981' : C.primary }]} />
          <Text style={[styles.sectionTitleText, { color: C.textPrimary }]}>
            {liveCount > 0 ? 'Live Activity & Express Radar' : 'Live Express & Spotlight'}
          </Text>
        </View>

        <View style={styles.slideCounterPill}>
          <Text style={[styles.slideCounterText, { color: C.textMuted }]}>
            {activeIndex + 1}/{filteredSlides.length}
          </Text>
        </View>
      </View>

      {/* Segmented Category Filter Pills */}
      <View style={styles.categoryPillsRow}>
        <Pressable
          onPress={() => handleSelectCategory('all')}
          style={[
            styles.categoryPill,
            selectedCategory === 'all' && [styles.categoryPillActive, { backgroundColor: C.primarySubtle, borderColor: C.primary }],
          ]}
        >
          <Text
            style={[
              styles.categoryPillText,
              { color: selectedCategory === 'all' ? C.primary : C.textSecondary },
            ]}
          >
            🔥 Highlights
          </Text>
        </Pressable>

        {liveCount > 0 ? (
          <Pressable
            onPress={() => handleSelectCategory('live')}
            style={[
              styles.categoryPill,
              selectedCategory === 'live' && [styles.categoryPillActive, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }],
            ]}
          >
            <View style={styles.categoryPillDot} />
            <Text
              style={[
                styles.categoryPillText,
                { color: selectedCategory === 'live' ? '#047857' : C.textSecondary },
              ]}
            >
              Live ({liveCount})
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => handleSelectCategory('urgent')}
          style={[
            styles.categoryPill,
            selectedCategory === 'urgent' && [styles.categoryPillActive, { backgroundColor: '#FFF7ED', borderColor: '#F97316' }],
          ]}
        >
          <Text
            style={[
              styles.categoryPillText,
              { color: selectedCategory === 'urgent' ? '#C2410C' : C.textSecondary },
            ]}
          >
            ⚡ Urgent ({urgentCount})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleSelectCategory('promo')}
          style={[
            styles.categoryPill,
            selectedCategory === 'promo' && [styles.categoryPillActive, { backgroundColor: '#EEF2FF', borderColor: '#6366F1' }],
          ]}
        >
          <Text
            style={[
              styles.categoryPillText,
              { color: selectedCategory === 'promo' ? '#4338CA' : C.textSecondary },
            ]}
          >
            ✨ Specials ({promoCount})
          </Text>
        </Pressable>
      </View>

      {/* Swipeable Carousel */}
      <FlatList
        ref={flatListRef}
        data={filteredSlides}
        renderItem={renderSlideItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        decelerationRate="fast"
        contentContainerStyle={styles.listContentContainer}
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

      {/* Pagination Indicator Dots */}
      <View style={styles.paginationRow}>
        <View style={styles.dotsGroup}>
          {filteredSlides.map((slide, idx) => {
            const isActive = idx === activeIndex;
            return (
              <Pressable
                key={slide.id}
                onPress={() => scrollToSlide(idx)}
                hitSlop={TouchTarget.smallHitSlop}
                accessibilityRole="button"
                accessibilityLabel={`Go to slide ${idx + 1}`}
                style={[
                  styles.dot,
                  isActive
                    ? [styles.activeDot, { backgroundColor: slide.accentColor, width: 22 }]
                    : [styles.inactiveDot, { backgroundColor: C.surfaceBorder }],
                ]}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitleText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  slideCounterPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  slideCounterText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryPillActive: {
    borderWidth: 1,
  },
  categoryPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  categoryPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  listContentContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
    gap: Spacing.smd,
  },
  cardWrapper: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  cardGradient: {
    padding: Spacing.md,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  radarPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  badgeLabelText: {
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  pricePillText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs + 1,
    fontWeight: FontWeight.bold,
  },
  pricePillSub: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.medium,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  infoPillText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.semibold,
  },
  cardBody: {
    marginVertical: 4,
  },
  routeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cityNameText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    maxWidth: '40%',
  },
  routeArrowContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeArrowLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  routeIconBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  headlineWrap: {
    marginBottom: 4,
  },
  promoHeadlineText: {
    color: '#FFFFFF',
    fontSize: FontSize.md + 1,
    fontWeight: FontWeight.bold,
    lineHeight: 22,
  },
  subtitleText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: FontSize.xs + 0.5,
    lineHeight: 17,
    marginTop: 2,
  },
  liveProgressTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
  },
  progressStep: {
    alignItems: 'center',
    gap: 3,
  },
  progressStepActive: {
    opacity: 1,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressDotInactive: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 4,
  },
  progressStepText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },
  progressStepTextInactive: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 9,
    fontWeight: FontWeight.medium,
  },
  urgentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  urgentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  urgentChipText: {
    color: '#FED7AA',
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.semibold,
  },
  promoPerksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  promoPerkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  promoPerkText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: FontSize.xs - 0.5,
    fontWeight: FontWeight.medium,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.smd,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  footerBrandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerBrandText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.semibold,
  },
  secondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  primaryCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs + 0.5,
    fontWeight: FontWeight.bold,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: Spacing.xs,
  },
  dotsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  inactiveDot: {
    width: 6,
  },
});
