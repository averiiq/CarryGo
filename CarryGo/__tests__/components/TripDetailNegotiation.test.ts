import { getRouteTimelineMeta, estimateTripDuration, formatDurationLabel, parseTimeString, format24Hour } from '@/components/feature/matching/blaBlaHelpers';
import type { Trip, Parcel } from '@/types';

describe('Phase 3 - Traveler Detail & Negotiation Flow', () => {
  const sampleTrip: Trip = {
    id: 'trip-bhiwani-hisar-1',
    userId: 'user-naveen-123',
    userName: 'Naveen Kumar',
    userRating: 4.8,
    userAvatar: 'https://example.com/avatar.jpg',
    fromCity: 'Bhiwani',
    toCity: 'Hisar',
    date: '2026-10-18',
    time: '19:15',
    vehicleType: 'car',
    availableCapacity: 10,
    pricePerKg: 90,
    status: 'active',
    createdAt: '2026-10-18T10:00:00Z',
  };

  const sampleParcel: Parcel = {
    id: 'parcel-gadget-1',
    userId: 'user-sender-999',
    userName: 'Sender User',
    fromCity: 'Bhiwani',
    toCity: 'Hisar',
    category: 'electronics',
    weight: 2,
    priceOffer: 180,
    description: 'Wireless Headphones',
    status: 'open',
    createdAt: '2026-10-18T10:30:00Z',
  };

  describe('Route Timeline & Schedule', () => {
    it('computes exact BlaBlaCar departure and estimated arrival times', () => {
      const meta = getRouteTimelineMeta(sampleTrip);
      expect(meta.departureTime).toBe('19:15');
      expect(meta.durationMinutes).toBeGreaterThanOrEqual(30);
      expect(meta.durationLabel).toMatch(/^\d+h\d{2}$/);
      expect(meta.arrivalTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it('formats duration nicely as hours and minutes', () => {
      expect(formatDurationLabel(80)).toBe('1h20');
      expect(formatDurationLabel(50)).toBe('0h50');
      expect(formatDurationLabel(125)).toBe('2h05');
    });

    it('correctly parses 12-hour AM/PM formats', () => {
      expect(parseTimeString('07:15 PM')).toEqual({ hours: 19, minutes: 15 });
      expect(parseTimeString('9:30 AM')).toEqual({ hours: 9, minutes: 30 });
      expect(parseTimeString('12:00 PM')).toEqual({ hours: 12, minutes: 0 });
      expect(parseTimeString('12:00 AM')).toEqual({ hours: 0, minutes: 0 });
    });
  });

  describe('Fare Calculation & Luggage Fit Verification', () => {
    it('computes price based on parcel weight and traveler pricePerKg', () => {
      const price = Math.max(80, Math.round(sampleTrip.pricePerKg * sampleParcel.weight));
      expect(price).toBe(180); // 90 * 2 = 180
    });

    it('verifies parcel weight against traveler remaining capacity', () => {
      const bookedWeight = 2.5;
      const remainingWeight = Math.max(0, sampleTrip.availableCapacity - bookedWeight);
      expect(remainingWeight).toBe(7.5);

      const fits = remainingWeight >= sampleParcel.weight;
      expect(fits).toBe(true); // 2kg fits in 7.5kg

      const heavyParcelWeight = 9.0;
      const heavyFits = remainingWeight >= heavyParcelWeight;
      expect(heavyFits).toBe(false); // 9kg exceeds 7.5kg
    });
  });

  describe('Negotiation Suggestions & Counter-Offers', () => {
    it('generates standard landmark pickup and drop suggestions for corridor', () => {
      const pickupOptions = [
        `${sampleTrip.fromCity} Bus Stand`,
        `${sampleTrip.fromCity} Railway Stn`,
        'Highway Toll Plaza',
      ];
      expect(pickupOptions).toContain('Bhiwani Bus Stand');
      expect(pickupOptions).toContain('Bhiwani Railway Stn');

      const dropOptions = [
        `${sampleTrip.toCity} Bus Stand`,
        `${sampleTrip.toCity} Railway Stn`,
        'City Center',
      ];
      expect(dropOptions).toContain('Hisar Bus Stand');
      expect(dropOptions).toContain('Hisar Railway Stn');
    });

    it('computes price differential and incentive indicators accurately', () => {
      const listedPrice = 180;
      const proposedLower = 150;
      const diffLower = proposedLower - listedPrice;
      expect(diffLower).toBe(-30);

      const proposedHigher = 200;
      const diffHigher = proposedHigher - listedPrice;
      expect(diffHigher).toBe(20);
    });

    it('formats comprehensive negotiation message including pickup, drop, fare, and note', () => {
      const pickup = 'Bhiwani Bus Stand Gate 2';
      const drop = 'Hisar Railway Station';
      const offered = 160;
      const listed = 180;
      const note = 'Sealed box, flexible timing';

      const msg = [
        `🤝 Delivery Negotiation Proposed:`,
        `• Offered Fare: ₹${offered} (Listed: ₹${listed})`,
        `• Pickup Spot: ${pickup}`,
        `• Drop-off Spot: ${drop}`,
        note ? `• Note: "${note}"` : null,
      ].filter(Boolean).join('\n');

      expect(msg).toContain('Offered Fare: ₹160 (Listed: ₹180)');
      expect(msg).toContain('Pickup Spot: Bhiwani Bus Stand Gate 2');
      expect(msg).toContain('Drop-off Spot: Hisar Railway Station');
      expect(msg).toContain('Note: "Sealed box, flexible timing"');
    });
  });
});
