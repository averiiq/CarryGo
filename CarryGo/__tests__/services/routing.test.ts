import {
  fetchRouteAlternatives,
  fetchSuggestedStopovers,
  localFallback,
  pickStopoversFromGeometry,
  getAdaptiveThresholds,
} from '@/services/routing.service';
import { findCity } from '@/constants/indian-cities';

describe('Routing Service — Route Alternatives & Stopovers', () => {
  it('returns valid local fallback routes when network is absent or offline', async () => {
    const result = await fetchRouteAlternatives('Gurugram', 'Panipat');

    expect(result.routes).toBeDefined();
    expect(result.routes.length).toBeGreaterThanOrEqual(1);

    const primary = result.routes[0];
    expect(primary.name).toBeDefined();
    expect(primary.distanceKm).toBeGreaterThan(0);
    expect(primary.durationMin).toBeGreaterThan(0);
    expect(primary.geometry.length).toBeGreaterThan(0);
    expect(Array.isArray(primary.suggestedStopovers)).toBe(true);
  });

  it('correctly picks stopovers from a simulated road geometry', () => {
    const start = findCity('Gurugram');
    const end = findCity('Panipat');
    expect(start).toBeDefined();
    expect(end).toBeDefined();

    if (!start || !end) return;

    // Simulate geometry passing close to Sonipat
    const sonipat = findCity('Sonipat');
    expect(sonipat).toBeDefined();
    if (!sonipat) return;

    const testCoords: Array<[number, number]> = [
      [start.lng, start.lat],
      [sonipat.lng, sonipat.lat],
      [end.lng, end.lat],
    ];

    const stopovers = pickStopoversFromGeometry(start, end, testCoords, 'ors');
    expect(stopovers.length).toBeGreaterThanOrEqual(1);
    expect(stopovers.some((s) => s.city === 'Sonipat')).toBe(true);
  });

  it('localFallback returns cities between start and end within crosstrack distance', () => {
    const stops = localFallback('Delhi', 'Chandigarh');
    expect(Array.isArray(stops)).toBe(true);
    expect(stops.length).toBeGreaterThan(0);
    const cityNames = stops.map((s) => s.city);
    expect(cityNames.some((c) => ['Sonipat', 'Panipat', 'Karnal', 'Kurukshetra', 'Ambala'].includes(c))).toBe(true);
  });

  it('successfully fetches stopovers for shorter routes (Panipat to Karnal ~33km)', () => {
    const stops = localFallback('Panipat', 'Karnal');
    expect(Array.isArray(stops)).toBe(true);
    expect(stops.length).toBeGreaterThanOrEqual(1);
    const cityNames = stops.map((s) => s.city);
    expect(cityNames).toContain('Gharaunda');
  });

  it('successfully fetches stopovers for medium-short routes (Sonipat to Panipat ~45km)', () => {
    const stops = localFallback('Sonipat', 'Panipat');
    expect(Array.isArray(stops)).toBe(true);
    expect(stops.length).toBeGreaterThanOrEqual(1);
    const cityNames = stops.map((s) => s.city);
    expect(cityNames.some((c) => c === 'Ganaur' || c === 'Samalkha')).toBe(true);
  });

  it('successfully fetches stopovers for Gurugram to Rewari (~50km)', () => {
    const stops = localFallback('Gurugram', 'Rewari');
    expect(Array.isArray(stops)).toBe(true);
    expect(stops.length).toBeGreaterThanOrEqual(1);
    const cityNames = stops.map((s) => s.city);
    expect(cityNames).toContain('Manesar');
  });

  it('handles empty or identical cities gracefully', async () => {
    const result = await fetchRouteAlternatives('', '');
    expect(result.routes).toEqual([]);

    const sameCity = await fetchRouteAlternatives('Delhi', 'Delhi');
    expect(sameCity.routes).toBeDefined();
  });
});
