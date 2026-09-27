// Mock expo-linear-gradient and expo modules before any imports
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

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

import { buildShowcaseSlides } from '@/components/feature/TopLiveDeliveryShowcase';
import { Request, Parcel } from '@/types';

describe('TopLiveDeliveryShowcase - buildShowcaseSlides', () => {
  const mockTrackDelivery = jest.fn();
  const mockViewRequests = jest.fn();
  const mockCarryParcel = jest.fn();
  const mockPressParcel = jest.fn();
  const mockCreateTrip = jest.fn();
  const mockCreateParcel = jest.fn();
  const mockOpenKyc = jest.fn();
  const mockSelectCorridor = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockLiveRequest: Request = {
    id: 'req-1',
    parcelId: 'parcel-101',
    tripId: 'trip-202',
    senderId: 'user-sender',
    senderName: 'Sender User',
    travellerId: 'user-1',
    travellerName: 'Traveler One',
    status: 'accepted',
    price: 450,
    fromCity: 'Delhi',
    toCity: 'Chandigarh',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockUrgentParcel: Parcel = {
    id: 'parcel-urgent-1',
    userId: 'user-sender-2',
    userName: 'Vikram Singh',
    fromCity: 'Gurugram',
    toCity: 'Rohtak',
    category: 'medicine',
    description: 'Urgent medical supplies needed today before 5pm',
    weight: 2.5,
    priceOffer: 550,
    status: 'open',
    createdAt: new Date().toISOString(),
  };

  it('builds live delivery card when user has active accepted delivery', () => {
    const slides = buildShowcaseSlides({
      liveRequests: [mockLiveRequest],
      urgentParcels: [mockUrgentParcel],
      userId: 'user-1',
      onTrackDelivery: mockTrackDelivery,
      onViewRequests: mockViewRequests,
      onCarryParcel: mockCarryParcel,
      onPressParcel: mockPressParcel,
      onCreateTrip: mockCreateTrip,
      onCreateParcel: mockCreateParcel,
      onOpenKyc: mockOpenKyc,
      onSelectCorridor: mockSelectCorridor,
    });

    const liveSlide = slides.find((s) => s.category === 'live');
    expect(liveSlide).toBeDefined();
    expect(liveSlide?.badgeLabel).toBe('LIVE IN-TRANSIT');
    expect(liveSlide?.price).toBe(450);
    expect(liveSlide?.ctaText).toBe('Track Live');

    // Test CTA trigger
    liveSlide?.onPress();
    expect(mockTrackDelivery).toHaveBeenCalledWith('req-1');
  });

  it('builds action required card for traveller with pending request', () => {
    const pendingRequest: Request = {
      ...mockLiveRequest,
      id: 'req-pending-1',
      status: 'pending',
    };

    const slides = buildShowcaseSlides({
      liveRequests: [pendingRequest],
      userId: 'user-1',
      onTrackDelivery: mockTrackDelivery,
      onViewRequests: mockViewRequests,
    });

    const pendingSlide = slides.find((s) => s.id === 'live-req-pending-1');
    expect(pendingSlide).toBeDefined();
    expect(pendingSlide?.badgeLabel).toBe('ACTION REQUIRED');
    expect(pendingSlide?.ctaText).toBe('Review');

    pendingSlide?.onPress();
    expect(mockViewRequests).toHaveBeenCalled();
  });

  it('builds urgent delivery cards from marketplace parcels', () => {
    const slides = buildShowcaseSlides({
      liveRequests: [],
      urgentParcels: [mockUrgentParcel],
      userId: 'user-1',
      onTrackDelivery: mockTrackDelivery,
      onCarryParcel: mockCarryParcel,
      onPressParcel: mockPressParcel,
    });

    const urgentSlide = slides.find((s) => s.category === 'urgent');
    expect(urgentSlide).toBeDefined();
    expect(urgentSlide?.badgeLabel).toBe('⚡ URGENT DISPATCH');
    expect(urgentSlide?.price).toBe(550);
    expect(urgentSlide?.weight).toBe(2.5);

    // Test carry action
    urgentSlide?.onPress();
    expect(mockCarryParcel).toHaveBeenCalledWith('parcel-urgent-1');

    // Test secondary details action
    urgentSlide?.secondaryAction?.onPress();
    expect(mockPressParcel).toHaveBeenCalledWith('parcel-urgent-1');
  });

  it('includes promotional banners with appropriate action callbacks', () => {
    const slides = buildShowcaseSlides({
      liveRequests: [],
      urgentParcels: [],
      userId: 'user-1',
      onTrackDelivery: mockTrackDelivery,
      onCreateTrip: mockCreateTrip,
      onOpenKyc: mockOpenKyc,
      onCreateParcel: mockCreateParcel,
    });

    const promoSlides = slides.filter((s) => s.category === 'promo');
    expect(promoSlides.length).toBeGreaterThanOrEqual(3);

    // Haryana Sprint
    const haryanaPromo = promoSlides.find((s) => s.id === 'promo-haryana');
    expect(haryanaPromo?.badgeLabel).toBe('🎉 HARYANA SPRINT');
    haryanaPromo?.onPress();
    expect(mockCreateTrip).toHaveBeenCalled();

    // KYC Promo
    const kycPromo = promoSlides.find((s) => s.id === 'promo-kyc');
    expect(kycPromo?.badgeLabel).toBe('⭐ PRIORITY TRUST');
    kycPromo?.onPress();
    expect(mockOpenKyc).toHaveBeenCalled();

    // Escrow Promo
    const escrowPromo = promoSlides.find((s) => s.id === 'promo-escrow');
    expect(escrowPromo?.badgeLabel).toBe('🛡️ ESCROW SAFE');
    escrowPromo?.onPress();
    expect(mockCreateParcel).toHaveBeenCalled();
  });

  it('uses default fallback urgent corridors when feed has no open parcels', () => {
    const slides = buildShowcaseSlides({
      liveRequests: [],
      urgentParcels: [],
      userId: 'user-1',
      onTrackDelivery: mockTrackDelivery,
      onSelectCorridor: mockSelectCorridor,
    });

    const fallbackUrgent = slides.find((s) => s.id.startsWith('urgent-urgent-demo'));
    expect(fallbackUrgent).toBeDefined();
    expect(fallbackUrgent?.fromCity).toBeDefined();
    expect(fallbackUrgent?.toCity).toBeDefined();

    fallbackUrgent?.onPress();
    expect(mockSelectCorridor).toHaveBeenCalledWith(
      fallbackUrgent?.fromCity,
      fallbackUrgent?.toCity
    );
  });
});
