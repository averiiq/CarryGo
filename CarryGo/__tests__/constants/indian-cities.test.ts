import { findCity, getDistance, haversineDistance, INDIAN_CITIES } from '@/constants/indian-cities';

describe('Indian Cities Optimization & Lookups', () => {
  it('finds city by exact name via Map lookup', () => {
    const gurugram = findCity('Gurugram');
    expect(gurugram).toBeDefined();
    expect(gurugram?.name).toBe('Gurugram');
    expect(gurugram?.state).toBe('Haryana');
  });

  it('finds city case-insensitively and with surrounding whitespace', () => {
    const gurugram = findCity('  gUrUgRaM  ');
    expect(gurugram).toBeDefined();
    expect(gurugram?.name).toBe('Gurugram');
  });

  it('finds city by partial match if exact match does not exist', () => {
    const faridabad = findCity('Farid');
    expect(faridabad).toBeDefined();
    expect(faridabad?.name).toBe('Faridabad');
  });

  it('returns undefined for nonexistent city or empty string', () => {
    expect(findCity('')).toBeUndefined();
    expect(findCity('Atlantis')).toBeUndefined();
  });

  it('calculates correct haversine distance between Gurugram and Faridabad', () => {
    const gurugram = findCity('Gurugram')!;
    const faridabad = findCity('Faridabad')!;
    const distance = getDistance(gurugram, faridabad);
    // Gurugram to Faridabad is approximately ~30-40 km
    expect(distance).toBeGreaterThan(25);
    expect(distance).toBeLessThan(50);
  });
});
