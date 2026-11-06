import {
  isPermittedCorridorCity,
  isValidHaryanaDelhiCorridor,
  normalizeCorridorCity,
  getDynamicPopularCorridors,
  recordCorridorUsage,
} from '../../services/corridors.service';

// Mock Supabase
jest.mock('@/template', () => ({
  getSupabaseClient: () => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
  }),
}));

describe('Dynamic Corridors Algorithm Suite', () => {
  describe('1. Corridor Boundary Rules (Haryana + Delhi Only)', () => {
    it('accepts legitimate Haryana cities', () => {
      expect(isPermittedCorridorCity('Gurugram')).toBe(true);
      expect(isPermittedCorridorCity('Rohtak')).toBe(true);
      expect(isPermittedCorridorCity('Faridabad')).toBe(true);
      expect(isPermittedCorridorCity('Panipat')).toBe(true);
      expect(isPermittedCorridorCity('Hisar')).toBe(true);
      expect(isPermittedCorridorCity('Ambala')).toBe(true);
      expect(isPermittedCorridorCity('Rewari')).toBe(true);
    });

    it('accepts common Haryana aliases', () => {
      expect(isPermittedCorridorCity('Gurgaon')).toBe(true);
      expect(isPermittedCorridorCity('Sonepat')).toBe(true);
    });

    it('accepts permitted regional gateways (Delhi and Chandigarh)', () => {
      expect(isPermittedCorridorCity('Delhi')).toBe(true);
      expect(isPermittedCorridorCity('New Delhi')).toBe(true);
      expect(isPermittedCorridorCity('Chandigarh')).toBe(true);
    });

    it('strictly rejects out-of-Haryana cities (e.g. Jaipur, Agra, Mumbai)', () => {
      expect(isPermittedCorridorCity('Jaipur')).toBe(false);
      expect(isPermittedCorridorCity('Agra')).toBe(false);
      expect(isPermittedCorridorCity('Mumbai')).toBe(false);
      expect(isPermittedCorridorCity('Bengaluru')).toBe(false);
      expect(isPermittedCorridorCity('Lucknow')).toBe(false);
    });

    it('validates legitimate Haryana-Delhi corridor pairs', () => {
      expect(isValidHaryanaDelhiCorridor('Delhi', 'Gurugram')).toBe(true);
      expect(isValidHaryanaDelhiCorridor('Gurugram', 'Rohtak')).toBe(true);
      expect(isValidHaryanaDelhiCorridor('Faridabad', 'Delhi')).toBe(true);
      expect(isValidHaryanaDelhiCorridor('Panipat', 'Ambala')).toBe(true);
    });

    it('rejects pairs where one or both cities are out-of-region', () => {
      // Previously hardcoded static corridors that are now forbidden
      expect(isValidHaryanaDelhiCorridor('Delhi', 'Jaipur')).toBe(false);
      expect(isValidHaryanaDelhiCorridor('Noida', 'Agra')).toBe(false);
      expect(isValidHaryanaDelhiCorridor('Agra', 'Faridabad')).toBe(false);
    });

    it('rejects identical origin and destination', () => {
      expect(isValidHaryanaDelhiCorridor('Delhi', 'Delhi')).toBe(false);
      expect(isValidHaryanaDelhiCorridor('Gurugram', 'Gurugram')).toBe(false);
    });
  });

  describe('2. City Normalization', () => {
    it('normalizes aliases to canonical names', () => {
      expect(normalizeCorridorCity('Gurgaon')).toBe('Gurugram');
      expect(normalizeCorridorCity('Sonepat')).toBe('Sonipat');
      expect(normalizeCorridorCity('New Delhi')).toBe('Delhi');
      expect(normalizeCorridorCity('Dilli')).toBe('Delhi');
    });
  });

  describe('3. Dynamic Popular Corridor Algorithm', () => {
    it('returns corridors exclusively within Haryana and Delhi', async () => {
      const corridors = await getDynamicPopularCorridors(8);
      expect(corridors.length).toBeGreaterThan(0);

      corridors.forEach((c) => {
        expect(isPermittedCorridorCity(c.fromCity)).toBe(true);
        expect(isPermittedCorridorCity(c.toCity)).toBe(true);
        expect(c.fromCity.toLowerCase()).not.toBe('jaipur');
        expect(c.toCity.toLowerCase()).not.toBe('jaipur');
        expect(c.fromCity.toLowerCase()).not.toBe('agra');
        expect(c.toCity.toLowerCase()).not.toBe('agra');
      });
    });

    it('dynamically computes real-world distances with units', async () => {
      const corridors = await getDynamicPopularCorridors(5);
      const delhiGurugram = corridors.find(
        (c) =>
          (c.fromCity === 'Delhi' && c.toCity === 'Gurugram') ||
          (c.fromCity === 'Gurugram' && c.toCity === 'Delhi')
      );
      expect(delhiGurugram).toBeDefined();
      expect(delhiGurugram?.distance).toMatch(/^\d+\s*km$/);
    });

    it('records and boosts corridor usage dynamically', async () => {
      await recordCorridorUsage('Rewari', 'Gurugram');
      const updated = await getDynamicPopularCorridors(8);
      const rewariGgn = updated.find(
        (c) =>
          (c.fromCity === 'Rewari' && c.toCity === 'Gurugram') ||
          (c.fromCity === 'Gurugram' && c.toCity === 'Rewari')
      );
      expect(rewariGgn).toBeDefined();
    });
  });
});

