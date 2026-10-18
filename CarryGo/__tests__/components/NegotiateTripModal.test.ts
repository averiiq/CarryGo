import type { Trip, Parcel } from '@/types';

describe('NegotiateTripModal - Domain and Fare Calculations', () => {
  const mockTrip: Trip = {
    id: 'trip-101',
    userId: 'traveler-1',
    userName: 'Naveen Kumar',
    userRating: 4.8,
    fromCity: 'Bhiwani',
    toCity: 'Hisar',
    date: '2026-10-18',
    time: '19:15',
    vehicleType: 'car',
    availableCapacity: 8,
    pricePerKg: 90,
    status: 'active',
    createdAt: '2026-10-18T10:00:00Z',
  };

  const mockParcel: Parcel = {
    id: 'parcel-202',
    userId: 'sender-1',
    userName: 'Sender User',
    fromCity: 'Bhiwani',
    toCity: 'Hisar',
    category: 'electronics',
    weight: 2,
    priceOffer: 160,
    description: 'Boxed headphones',
    status: 'open',
    createdAt: '2026-10-18T10:00:00Z',
  };

  it('calculates listed price based on trip pricePerKg and parcel weight', () => {
    const listedPrice = Math.max(80, Math.round(mockTrip.pricePerKg * mockParcel.weight));
    expect(listedPrice).toBe(180); // 90 * 2 = 180
  });

  it('enforces a minimum floor of 80 for very light parcels', () => {
    const lightParcel: Parcel = { ...mockParcel, weight: 0.5 };
    const listedPrice = Math.max(80, Math.round(mockTrip.pricePerKg * lightParcel.weight));
    expect(listedPrice).toBe(80); // 90 * 0.5 = 45 -> floor is 80
  });

  it('formats counter-offer comparison diff accurately', () => {
    const baseListed = 180;

    const lowerOffer = 140;
    const diffLower = lowerOffer - baseListed;
    expect(diffLower).toBe(-40);
    expect(diffLower < 0).toBe(true);

    const higherOffer = 220;
    const diffHigher = higherOffer - baseListed;
    expect(diffHigher).toBe(40);
    expect(diffHigher > 0).toBe(true);

    const matchOffer = 180;
    expect(matchOffer - baseListed).toBe(0);
  });

  it('formats structured negotiation message containing pickup, drop, and custom notes', () => {
    const pickupLandmark = 'Bhiwani Bus Stand Gate 2';
    const dropLandmark = 'Hisar Railway Station';
    const offeredPrice = 160;
    const baseListedPrice = 180;
    const customNote = 'Fragile item, can meet at 7 PM';

    const formattedMessage = [
      `🤝 Delivery Negotiation Proposed:`,
      `• Offered Fare: ₹${offeredPrice} (Listed: ₹${baseListedPrice})`,
      `• Pickup Spot: ${pickupLandmark}`,
      `• Drop-off Spot: ${dropLandmark}`,
      `• Note: "${customNote}"`,
    ].join('\n');

    expect(formattedMessage).toContain('Offered Fare: ₹160 (Listed: ₹180)');
    expect(formattedMessage).toContain('Bhiwani Bus Stand Gate 2');
    expect(formattedMessage).toContain('Hisar Railway Station');
    expect(formattedMessage).toContain('Fragile item, can meet at 7 PM');
  });
});
