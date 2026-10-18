import {
  parseTimeString,
  format24Hour,
  estimateTripDuration,
  formatDurationLabel,
  getRouteTimelineMeta,
  formatBlaBlaPrice,
} from '@/components/feature/matching/blaBlaHelpers';
import type { Trip } from '@/types';

describe('blaBlaHelpers', () => {
  describe('parseTimeString', () => {
    it('parses 24h format string', () => {
      expect(parseTimeString('19:15')).toEqual({ hours: 19, minutes: 15 });
      expect(parseTimeString('08:30')).toEqual({ hours: 8, minutes: 30 });
    });

    it('parses 12h AM/PM strings', () => {
      expect(parseTimeString('07:30 PM')).toEqual({ hours: 19, minutes: 30 });
      expect(parseTimeString('07:30 AM')).toEqual({ hours: 7, minutes: 30 });
      expect(parseTimeString('12:00 PM')).toEqual({ hours: 12, minutes: 0 });
      expect(parseTimeString('12:00 AM')).toEqual({ hours: 0, minutes: 0 });
    });

    it('falls back safely on empty or invalid string', () => {
      expect(parseTimeString('')).toEqual({ hours: 10, minutes: 0 });
      expect(parseTimeString(undefined)).toEqual({ hours: 10, minutes: 0 });
    });
  });

  describe('format24Hour', () => {
    it('formats numbers with leading zeroes', () => {
      expect(format24Hour(9, 5)).toBe('09:05');
      expect(format24Hour(19, 15)).toBe('19:15');
      expect(format24Hour(24, 0)).toBe('00:00');
    });
  });

  describe('estimateTripDuration', () => {
    it('estimates highway transit between Haryana cities for cars', () => {
      const minutes = estimateTripDuration('Bhiwani', 'Hisar', 'car');
      expect(minutes).toBeGreaterThan(0);
      expect(minutes).toBeLessThan(240);
    });

    it('adjusts duration for different vehicle types', () => {
      const carMin = estimateTripDuration('Gurugram', 'Chandigarh', 'car');
      const flightMin = estimateTripDuration('Gurugram', 'Chandigarh', 'flight');
      const trainMin = estimateTripDuration('Gurugram', 'Chandigarh', 'train');

      expect(flightMin).toBeLessThan(carMin);
      expect(trainMin).toBeGreaterThan(0);
    });
  });

  describe('formatDurationLabel', () => {
    it('formats duration in BlaBlaCar format (e.g. 1h20)', () => {
      expect(formatDurationLabel(80)).toBe('1h20');
      expect(formatDurationLabel(50)).toBe('0h50');
      expect(formatDurationLabel(125)).toBe('2h05');
    });
  });

  describe('getRouteTimelineMeta', () => {
    const mockTrip: Trip = {
      id: 'trip-1',
      userId: 'user-1',
      userName: 'Naveen',
      userRating: 4.8,
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

    it('computes departure, arrival and duration accurately', () => {
      const meta = getRouteTimelineMeta(mockTrip);
      expect(meta.departureTime).toBe('19:15');
      expect(meta.durationMinutes).toBeGreaterThan(0);
      expect(meta.durationLabel).toMatch(/^\d+h\d{2}$/);
      expect(meta.arrivalTime).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('formatBlaBlaPrice', () => {
    it('formats rupee values into amount and decimal components', () => {
      expect(formatBlaBlaPrice(180)).toEqual({ amount: '180', decimal: '.00' });
      expect(formatBlaBlaPrice(1250)).toEqual({ amount: '1,250', decimal: '.00' });
      expect(formatBlaBlaPrice(0)).toEqual({ amount: '0', decimal: '.00' });
    });
  });
});
