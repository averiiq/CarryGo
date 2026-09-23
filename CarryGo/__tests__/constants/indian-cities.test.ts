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

  it('finds Delhi and resolves common aliases correctly', () => {
    const delhi = findCity('Delhi');
    expect(delhi).toBeDefined();
    expect(delhi?.name).toBe('Delhi');

    const dilli = findCity('Dilli');
    expect(dilli?.name).toBe('Delhi');

    const delhiNcr = findCity('delhi ncr');
    expect(delhiNcr?.name).toBe('Delhi');

    const gurgaon = findCity('Gurgaon');
    expect(gurgaon?.name).toBe('Gurugram');
  });

  it('calculates realistic distance between Bhiwani and Delhi', () => {
    const bhiwani = findCity('Bhiwani')!;
    const delhi = findCity('Delhi')!;
    const distance = getDistance(bhiwani, delhi);
    // Bhiwani to Delhi is approximately ~100-140 km
    expect(distance).toBeGreaterThan(90);
    expect(distance).toBeLessThan(150);
  });

  it('contains exclusively Haryana cities in the primary city list', () => {
    expect(INDIAN_CITIES.length).toBeGreaterThan(50);
    for (const city of INDIAN_CITIES) {
      expect(city.state).toBe('Haryana');
    }
  });

  it('resolves Haryana aliases correctly', () => {
    expect(findCity('mewat')?.name).toBe('Nuh');
    expect(findCity('sonepat')?.name).toBe('Sonipat');
    expect(findCity('jagadhri')?.name).toBe('Yamunanagar');
    expect(findCity('dabwali')?.name).toBe('Mandi Dabwali');
    expect(findCity('mahendragarh')?.name).toBe('Narnaul');
  });

  it('calculates distance between Hisar and Bhiwani', () => {
    const hisar = findCity('Hisar')!;
    const bhiwani = findCity('Bhiwani')!;
    const distance = getDistance(hisar, bhiwani);
    expect(distance).toBeGreaterThan(45);
    expect(distance).toBeLessThan(75);
  });
});

