import {
  EMPTY_PARCEL_DRAFT,
  PARCEL_CATEGORIES,
  PARCEL_OFFER_PRESETS,
  PARCEL_WEIGHT_PRESETS,
  ParcelDraft,
  normalizeParcelCity,
  validateParcelDetails,
  validateParcelRoute,
} from '@/components/feature/parcel/types';

describe('Parcel Steps - Validation & Formatting Helpers', () => {
  describe('normalizeParcelCity', () => {
    it('trims leading and trailing whitespace', () => {
      expect(normalizeParcelCity('  Mumbai  ')).toBe('Mumbai');
    });

    it('collapses multiple internal whitespace characters into single space', () => {
      expect(normalizeParcelCity('New    Delhi')).toBe('New Delhi');
      expect(normalizeParcelCity('  Bangalore   Urban  ')).toBe('Bangalore Urban');
    });

    it('handles empty strings cleanly', () => {
      expect(normalizeParcelCity('')).toBe('');
    });
  });

  describe('validateParcelRoute', () => {
    const today = '2026-10-17';

    it('returns errors when origin or destination are empty', () => {
      const draft: ParcelDraft = {
        ...EMPTY_PARCEL_DRAFT,
        fromCity: '',
        toCity: '',
      };
      const errors = validateParcelRoute(draft, today);
      expect(errors.fromCity).toBe('Select origin city');
      expect(errors.toCity).toBe('Select destination city');
    });

    it('rejects identical origin and destination (case-insensitive)', () => {
      const draft: ParcelDraft = {
        ...EMPTY_PARCEL_DRAFT,
        fromCity: 'Delhi',
        toCity: 'delhi',
      };
      const errors = validateParcelRoute(draft, today);
      expect(errors.toCity).toBe('Must differ from origin');
      expect(errors.fromCity).toBeUndefined();
    });

    it('rejects delivery date in the past', () => {
      const draft: ParcelDraft = {
        ...EMPTY_PARCEL_DRAFT,
        fromCity: 'Delhi',
        toCity: 'Jaipur',
        deliveryDate: '2026-10-16', // Yesterday
      };
      const errors = validateParcelRoute(draft, today);
      expect(errors.deliveryDate).toBe('Delivery date cannot be in the past');
    });

    it('passes for today or future delivery dates with different cities', () => {
      const draftToday: ParcelDraft = {
        ...EMPTY_PARCEL_DRAFT,
        fromCity: 'Delhi',
        toCity: 'Jaipur',
        deliveryDate: '2026-10-17',
      };
      expect(validateParcelRoute(draftToday, today)).toEqual({});

      const draftFuture: ParcelDraft = {
        ...EMPTY_PARCEL_DRAFT,
        fromCity: 'Mumbai',
        toCity: 'Pune',
        deliveryDate: '2026-10-25',
      };
      expect(validateParcelRoute(draftFuture, today)).toEqual({});
    });
  });

  describe('validateParcelDetails', () => {
    it('flags missing parcel images', () => {
      const draft: ParcelDraft = {
        ...EMPTY_PARCEL_DRAFT,
        images: [],
        weight: '2',
        priceOffer: '250',
      };
      const errors = validateParcelDetails(draft);
      expect(errors.images).toBe('Add at least 1 parcel photo');
    });

    it('flags duplicate parcel images', () => {
      const draft: ParcelDraft = {
        ...EMPTY_PARCEL_DRAFT,
        images: ['https://example.com/item.jpg', 'https://example.com/item.jpg'],
        weight: '2',
        priceOffer: '250',
      };
      const errors = validateParcelDetails(draft);
      expect(errors.images).toBe('Duplicate images are not allowed');
    });

    describe('weight validation', () => {
      it('flags empty weight', () => {
        const draft: ParcelDraft = {
          ...EMPTY_PARCEL_DRAFT,
          images: ['https://example.com/item.jpg'],
          weight: '',
          priceOffer: '300',
        };
        const errors = validateParcelDetails(draft);
        expect(errors.weight).toBe('Enter weight');
      });

      it('flags invalid or out-of-range weight', () => {
        const base: ParcelDraft = {
          ...EMPTY_PARCEL_DRAFT,
          images: ['https://example.com/item.jpg'],
          priceOffer: '300',
        };

        expect(validateParcelDetails({ ...base, weight: '0' }).weight).toBe('0.1 - 100 kg');
        expect(validateParcelDetails({ ...base, weight: '-2' }).weight).toBe('0.1 - 100 kg');
        expect(validateParcelDetails({ ...base, weight: '105' }).weight).toBe('0.1 - 100 kg');
        expect(validateParcelDetails({ ...base, weight: 'abc' }).weight).toBe('0.1 - 100 kg');
      });

      it('accepts valid weights within 0.1 to 100 kg', () => {
        const draft: ParcelDraft = {
          ...EMPTY_PARCEL_DRAFT,
          images: ['https://example.com/item.jpg'],
          weight: '0.5',
          priceOffer: '200',
        };
        expect(validateParcelDetails(draft).weight).toBeUndefined();

        const heavyDraft: ParcelDraft = { ...draft, weight: '85' };
        expect(validateParcelDetails(heavyDraft).weight).toBeUndefined();
      });
    });

    describe('price offer validation', () => {
      it('flags empty price offer', () => {
        const draft: ParcelDraft = {
          ...EMPTY_PARCEL_DRAFT,
          images: ['https://example.com/item.jpg'],
          weight: '3',
          priceOffer: '',
        };
        const errors = validateParcelDetails(draft);
        expect(errors.priceOffer).toBe('Enter price offer');
      });

      it('flags price offer below 1 or above 100,000', () => {
        const base: ParcelDraft = {
          ...EMPTY_PARCEL_DRAFT,
          images: ['https://example.com/item.jpg'],
          weight: '2',
        };

        expect(validateParcelDetails({ ...base, priceOffer: '0' }).priceOffer).toBe(
          'Rs 1 - Rs 1,00,000'
        );
        expect(validateParcelDetails({ ...base, priceOffer: '-50' }).priceOffer).toBe(
          'Rs 1 - Rs 1,00,000'
        );
        expect(validateParcelDetails({ ...base, priceOffer: '100001' }).priceOffer).toBe(
          'Rs 1 - Rs 1,00,000'
        );
        expect(validateParcelDetails({ ...base, priceOffer: 'xyz' }).priceOffer).toBe(
          'Rs 1 - Rs 1,00,000'
        );
      });

      it('accepts valid price offers within Rs 1 to Rs 1,00,000', () => {
        const draft: ParcelDraft = {
          ...EMPTY_PARCEL_DRAFT,
          images: ['https://example.com/item.jpg'],
          weight: '2',
          priceOffer: '450',
        };
        expect(validateParcelDetails(draft)).toEqual({});
      });
    });
  });

  describe('Presets and Categories Integrity', () => {
    it('provides standard parcel categories with icons and colors', () => {
      expect(PARCEL_CATEGORIES.length).toBeGreaterThanOrEqual(5);
      const types = PARCEL_CATEGORIES.map((c) => c.type);
      expect(types).toContain('documents');
      expect(types).toContain('electronics');
      expect(types).toContain('clothing');
      expect(types).toContain('food');
      expect(types).toContain('medicine');
    });

    it('contains weight and offer presets', () => {
      expect(PARCEL_WEIGHT_PRESETS).toEqual(['0.5', '1', '2', '5']);
      expect(PARCEL_OFFER_PRESETS).toEqual(['100', '200', '500', '1000']);
    });
  });
});
