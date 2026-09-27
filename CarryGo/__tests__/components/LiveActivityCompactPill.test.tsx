import { getLiveActivityPillDetails } from '@/components/feature/LiveActivityCompactPill';
import { Request } from '@/types';

describe('LiveActivityCompactPill - getLiveActivityPillDetails', () => {
  const mockRequest: Request = {
    id: 'req-live-1',
    parcelId: 'parcel-1',
    tripId: 'trip-1',
    senderId: 'user-sender',
    senderName: 'Sender User',
    travellerId: 'user-traveller',
    travellerName: 'Traveler One',
    status: 'accepted',
    price: 450,
    fromCity: 'Delhi',
    toCity: 'Chandigarh',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('returns null when request is null or undefined', () => {
    expect(getLiveActivityPillDetails(null)).toBeNull();
    expect(getLiveActivityPillDetails(undefined)).toBeNull();
  });

  it('returns active in-transit details for accepted delivery', () => {
    const details = getLiveActivityPillDetails(mockRequest, false);
    expect(details).toBeDefined();
    expect(details?.isAccepted).toBe(true);
    expect(details?.statusLabel).toBe('In Transit');
    expect(details?.actionLabel).toBe('Track');
    expect(details?.routeText).toBe('Delhi ➔ Chandigarh');
    expect(details?.badgeColor).toBe('#10B981');
  });

  it('returns Action Required for traveller when request is pending', () => {
    const pendingReq: Request = {
      ...mockRequest,
      status: 'pending',
    };

    const details = getLiveActivityPillDetails(pendingReq, true);
    expect(details).toBeDefined();
    expect(details?.isAccepted).toBe(false);
    expect(details?.statusLabel).toBe('Action Required');
    expect(details?.actionLabel).toBe('Review');
    expect(details?.badgeColor).toBe('#F59E0B');
  });

  it('returns Pending for sender when request is pending', () => {
    const pendingReq: Request = {
      ...mockRequest,
      status: 'pending',
    };

    const details = getLiveActivityPillDetails(pendingReq, false);
    expect(details?.statusLabel).toBe('Pending');
  });
});
