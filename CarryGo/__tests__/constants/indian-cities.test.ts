import { findCity, getDistance, haversineDistance, INDIAN_CITIES } from '@/constants/indian-cities';

describe('Indian Cities Optimization & Lookups', () => {
  it('finds city by exact name via Map lookup', () => {
    const delhi = findCity('Delhi');
    expect(delhi).toBeDefined();
    expect(delhi?.name).toBe('Delhi');
    expect(delhi?.state).toBe('Delhi');
  });

  it('finds city case-insensitively and with surrounding whitespace', () => {
    const mumbai = findCity('  mUmBaI  ');
    expect(mumbai).toBeDefined();
    expect(mumbai?.name).toBe('Mumbai');
  });

  it('finds city by partial match if exact match does not exist', () => {
    const visakhapatnam = findCity('Visakha');
    expect(visakhapatnam).toBeDefined();
    expect(visakhapatnam?.name).toBe('Visakhapatnam');
  });

  it('returns undefined for nonexistent city or empty string', () => {
    expect(findCity('')).toBeUndefined();
    expect(findCity('Atlantis')).toBeUndefined();
  });

  it('calculates correct haversine distance between Mumbai and Pune', () => {
    const mumbai = findCity('Mumbai')!;
    const pune = findCity('Pune')!;
    const distance = getDistance(mumbai, pune);
    // Mumbai to Pune is approximately ~120-150 km
    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(170);
  });
});
