import { buildPromotionalSlides } from '@/components/feature/PromotionalBannerCarousel';
import { Parcel } from '@/types';

// Mock Haptics
jest.mock('@/services/haptics.service', () => ({
  Haptic: {
    tap: jest.fn(),
    select: jest.fn(),
    confirm: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    heavy: jest.fn(),
  },
}));

describe('PromotionalBannerCarousel - buildPromotionalSlides', () => {
  const mockCarryParcel = jest.fn();
  const mockPressParcel = jest.fn();
  const mockCreateTrip = jest.fn();
  const mockCreateParcel = jest.fn();
  const mockOpenKyc = jest.fn();
  const mockSelectCorridor = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUrgentParcel: Parcel = {
    id: 'parcel-urgent-1',
    userId: 'user-sender',
    userName: 'Anil Kumar',
    fromCity: 'Gurugram',
    toCity: 'Chandigarh',
    category: 'medicine',
    description: 'Emergency medicine delivery needed today',
    weight: 1.5,
    priceOffer: 600,
    status: 'open',
    createdAt: new Date().toISOString(),
  };

  it('builds all 3 high-impact promotional image slides', () => {
    const slides = buildPromotionalSlides({
      urgentParcels: [mockUrgentParcel],
      onCarryParcel: mockCarryParcel,
      onCreateTrip: mockCreateTrip,
      onOpenKyc: mockOpenKyc,
    });

    expect(slides.length).toBe(3);

    // Urgent banner check
    const urgentSlide = slides.find((s) => s.type === 'urgent');
    expect(urgentSlide).toBeDefined();
    expect(urgentSlide?.badge).toBe('⚡ SAME-DAY EXPRESS');
    expect(urgentSlide?.title).toBe('Gurugram ➔ Chandigarh');
    expect(urgentSlide?.ctaText).toBe('⚡ Carry & Earn');

    // Haryana corridor banner check
    const corridorSlide = slides.find((s) => s.type === 'corridor');
    expect(corridorSlide).toBeDefined();
    expect(corridorSlide?.badge).toBe('🎉 0% COMMISSION');
    expect(corridorSlide?.title).toBe('Haryana Corridor Sprint');

    // KYC banner check
    const kycSlide = slides.find((s) => s.type === 'kyc');
    expect(kycSlide).toBeDefined();
    expect(kycSlide?.badge).toBe('⭐ VERIFIED TRAVELER');
    expect(kycSlide?.title).toBe('Unlock 2x More Deliveries');
  });

  it('triggers carry action on pressing urgent delivery banner', () => {
    const slides = buildPromotionalSlides({
      urgentParcels: [mockUrgentParcel],
      onCarryParcel: mockCarryParcel,
    });

    const urgentSlide = slides.find((s) => s.type === 'urgent');
    urgentSlide?.onPress();
    expect(mockCarryParcel).toHaveBeenCalledWith('parcel-urgent-1');
  });

  it('triggers trip creation on pressing corridor banner', () => {
    const slides = buildPromotionalSlides({
      urgentParcels: [],
      onCreateTrip: mockCreateTrip,
    });

    const corridorSlide = slides.find((s) => s.type === 'corridor');
    corridorSlide?.onPress();
    expect(mockCreateTrip).toHaveBeenCalled();
  });

  it('triggers KYC on pressing verified banner', () => {
    const slides = buildPromotionalSlides({
      urgentParcels: [],
      onOpenKyc: mockOpenKyc,
    });

    const kycSlide = slides.find((s) => s.type === 'kyc');
    kycSlide?.onPress();
    expect(mockOpenKyc).toHaveBeenCalled();
  });

  it('renders dynamic banners from CMS admin panel with custom CTA action and deep links', () => {
    const mockNavigateDeepLink = jest.fn();
    const dynamicBanners = [
      {
        id: 'banner-cms-1',
        type: 'discount' as const,
        badge_text: '🎁 50% OFF FEES',
        badge_color: '#EC4899',
        title: 'Festival Delivery Fest',
        subtitle: 'Get 50% off platform escrow fee across Haryana.',
        cta_text: 'Claim Offer',
        cta_action: 'link' as const,
        deep_link: '/festival-offer',
        image_url: 'urgentExpress',
        display_order: 0,
        is_active: true,
      },
      {
        id: 'banner-cms-2',
        type: 'corridor' as const,
        badge_text: '🛣️ ROHTAK EXPRESS',
        badge_color: '#10B981',
        title: 'Rohtak ⇄ Delhi Corridor',
        subtitle: '10+ departures every hour.',
        cta_text: 'Post Trip',
        cta_action: 'create_trip' as const,
        image_url: 'haryanaRoad',
        display_order: 1,
        is_active: true,
      },
    ];

    const slides = buildPromotionalSlides({
      banners: dynamicBanners,
      onNavigateDeepLink: mockNavigateDeepLink,
      onCreateTrip: mockCreateTrip,
    });

    expect(slides.length).toBe(2);
    expect(slides[0].id).toBe('banner-cms-1');
    expect(slides[0].badge).toBe('🎁 50% OFF FEES');
    expect(slides[0].badgeColor).toBe('#EC4899');
    expect(slides[0].title).toBe('Festival Delivery Fest');
    expect(slides[0].ctaText).toBe('Claim Offer');

    // Trigger deep link action
    slides[0].onPress();
    expect(mockNavigateDeepLink).toHaveBeenCalledWith('/festival-offer');

    // Trigger create trip action on second banner
    slides[1].onPress();
    expect(mockCreateTrip).toHaveBeenCalled();
  });
});
