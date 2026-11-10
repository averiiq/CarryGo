jest.mock('@/template', () => ({
  getSupabaseClient: jest.fn(),
}));

import { parseAllowedCategories, parseStopovers } from '@/services/trips.service';
import { partitionMatchingParcels } from '@/components/feature/SendRequestModal';
import { Parcel, Trip } from '@/types';

describe('Trip Allowed Categories & Verification Security', () => {
  describe('parseAllowedCategories', () => {
    it('handles standard array of categories', () => {
      const result = parseAllowedCategories(['documents', 'electronics']);
      expect(result).toEqual(['documents', 'electronics']);
    });

    it('handles PostgreSQL text array format "{documents,electronics}"', () => {
      const result = parseAllowedCategories('{documents,electronics}');
      expect(result).toEqual(['documents', 'electronics']);
    });

    it('handles single item in PostgreSQL format "{documents}"', () => {
      const result = parseAllowedCategories('{documents}');
      expect(result).toEqual(['documents']);
    });

    it('handles JSON string array format \'["documents", "clothing"]\'', () => {
      const result = parseAllowedCategories('["documents", "clothing"]');
      expect(result).toEqual(['documents', 'clothing']);
    });

    it('handles comma-separated string "documents, food"', () => {
      const result = parseAllowedCategories('documents, food');
      expect(result).toEqual(['documents', 'food']);
    });

    it('returns undefined for empty, null, or undefined input', () => {
      expect(parseAllowedCategories(null)).toBeUndefined();
      expect(parseAllowedCategories(undefined)).toBeUndefined();
      expect(parseAllowedCategories('')).toBeUndefined();
      expect(parseAllowedCategories('{}')).toBeUndefined();
    });
  });

  describe('parseStopovers', () => {
    it('handles array of stopover cities', () => {
      const result = parseStopovers(['Panipat', 'Ambala']);
      expect(result).toEqual(['Panipat', 'Ambala']);
    });

    it('handles PostgreSQL format "{Panipat,Ambala}"', () => {
      const result = parseStopovers('{Panipat,Ambala}');
      expect(result).toEqual(['Panipat', 'Ambala']);
    });

    it('handles JSON string array format', () => {
      const result = parseStopovers('["Panipat", "Ambala"]');
      expect(result).toEqual(['Panipat', 'Ambala']);
    });
  });

  describe('partitionMatchingParcels with strict categories', () => {
    const baseTrip: Pick<Trip, 'fromCity' | 'toCity' | 'availableCapacity'> & { allowedCategories?: any[] } = {
      fromCity: 'Delhi',
      toCity: 'Chandigarh',
      availableCapacity: 10,
      allowedCategories: ['documents'],
    };

    const makeParcel = (id: string, category: Parcel['category'], weight = 2): Parcel => ({
      id,
      userId: 'sender-1',
      userName: 'Sender',
      fromCity: 'Delhi',
      toCity: 'Chandigarh',
      category,
      weight,
      description: 'Test parcel',
      priceOffer: 200,
      status: 'open',
      createdAt: new Date().toISOString(),
    });

    it('allows only parcels matching traveller specified category', () => {
      const p1 = makeParcel('p-1', 'documents', 1);
      const p2 = makeParcel('p-2', 'electronics', 2);
      const p3 = makeParcel('p-3', 'food', 3);

      const partitioned = partitionMatchingParcels([p1, p2, p3], baseTrip);

      expect(partitioned.eligible).toHaveLength(1);
      expect(partitioned.eligible[0].id).toBe('p-1');
      expect(partitioned.incompatibleCategory).toHaveLength(2);
      expect(partitioned.incompatibleCategory.map(p => p.id)).toEqual(['p-2', 'p-3']);
    });

    it('allows multiple categories when trip allows them', () => {
      const multiTrip = {
        ...baseTrip,
        allowedCategories: ['documents', 'medicine'] as Trip['allowedCategories'],
      };
      const p1 = makeParcel('p-1', 'documents', 1);
      const p2 = makeParcel('p-2', 'medicine', 2);
      const p3 = makeParcel('p-3', 'clothing', 3);

      const partitioned = partitionMatchingParcels([p1, p2, p3], multiTrip);

      expect(partitioned.eligible).toHaveLength(2);
      expect(partitioned.eligible.map(p => p.id)).toEqual(['p-1', 'p-2']);
      expect(partitioned.incompatibleCategory).toHaveLength(1);
      expect(partitioned.incompatibleCategory[0].id).toBe('p-3');
    });
  });
});
