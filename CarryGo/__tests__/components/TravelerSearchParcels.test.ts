import {
  filterTravelerParcels,
  sortTravelerParcels,
  TravelerParcelFilterOptions,
} from '@/components/feature/search/searchHelpers';
import { Parcel } from '@/types';

describe('Phase 2 Traveler Flow: Search Parcels & Explore Logic', () => {
  const mockParcels: Parcel[] = [
    {
      id: 'p-del-mum-1',
      userId: 'sender-1',
      userName: 'Aakash Verma',
      fromCity: 'Delhi',
      toCity: 'Mumbai',
      category: 'electronics',
      description: 'Laptop and charger',
      weight: 3.5,
      priceOffer: 850,
      deliveryDate: '2026-10-30',
      status: 'open',
      createdAt: '2026-10-20T10:00:00Z',
    },
    {
      id: 'p-del-mum-2',
      userId: 'sender-2',
      userName: 'Pooja Sharma',
      fromCity: 'New Delhi',
      toCity: 'Mumbai',
      category: 'documents',
      description: 'Legal Deeds',
      weight: 0.8,
      priceOffer: 350,
      deliveryDate: '2026-10-28',
      status: 'open',
      createdAt: '2026-10-22T08:00:00Z',
    },
    {
      id: 'p-del-chd-3',
      userId: 'sender-3',
      userName: 'Gurpreet Singh',
      fromCity: 'Delhi',
      toCity: 'Chandigarh',
      category: 'clothing',
      description: 'Wedding outfit',
      weight: 6.0,
      priceOffer: 500,
      deliveryDate: '2026-10-29',
      status: 'open',
      createdAt: '2026-10-21T12:00:00Z',
    },
    {
      id: 'p-heavy-4',
      userId: 'sender-4',
      userName: 'Rajesh Kumar',
      fromCity: 'Delhi',
      toCity: 'Mumbai',
      category: 'other',
      description: 'Heavy machine parts',
      weight: 12.0,
      priceOffer: 1500,
      deliveryDate: '2026-11-02',
      status: 'open',
      createdAt: '2026-10-23T14:00:00Z',
    },
    {
      id: 'p-closed-5',
      userId: 'sender-5',
      userName: 'Anita Rao',
      fromCity: 'Delhi',
      toCity: 'Mumbai',
      category: 'medicine',
      description: 'Insulin cool pack',
      weight: 1.5,
      priceOffer: 400,
      deliveryDate: '2026-10-30',
      status: 'delivered', // Not open
      createdAt: '2026-10-18T10:00:00Z',
    },
  ];

  describe('filterTravelerParcels', () => {
    it('returns only open parcels matching Source and Destination', () => {
      const results = filterTravelerParcels(mockParcels, {
        fromCity: 'delhi',
        toCity: 'mumbai',
      });

      // p-closed-5 must be excluded because status === 'delivered'
      // p-del-chd-3 must be excluded because toCity is Chandigarh
      expect(results.map((p) => p.id)).toEqual([
        'p-del-mum-1',
        'p-del-mum-2',
        'p-heavy-4',
      ]);
    });

    it('filters parcels by weight ranges correctly', () => {
      // Under 2 kg
      const under2 = filterTravelerParcels(mockParcels, { weightRange: 'under_2' });
      expect(under2.map((p) => p.id)).toEqual(['p-del-mum-2']);

      // 2 to 5 kg
      const twoToFive = filterTravelerParcels(mockParcels, { weightRange: '2_5' });
      expect(twoToFive.map((p) => p.id)).toEqual(['p-del-mum-1']);

      // 5 to 10 kg
      const fiveToTen = filterTravelerParcels(mockParcels, { weightRange: '5_10' });
      expect(fiveToTen.map((p) => p.id)).toEqual(['p-del-chd-3']);

      // 10+ kg
      const overTen = filterTravelerParcels(mockParcels, { weightRange: 'over_10' });
      expect(overTen.map((p) => p.id)).toEqual(['p-heavy-4']);
    });

    it('filters parcels by category', () => {
      const docs = filterTravelerParcels(mockParcels, { category: 'documents' });
      expect(docs.length).toBe(1);
      expect(docs[0].id).toBe('p-del-mum-2');

      const electronics = filterTravelerParcels(mockParcels, { category: 'electronics' });
      expect(electronics.length).toBe(1);
      expect(electronics[0].id).toBe('p-del-mum-1');
    });

    it('filters parcels by traveler travel date', () => {
      // Traveler is traveling on 2026-10-30.
      // Parcels with deliveryDate before 2026-10-30 cannot be delivered on time.
      const onOct30 = filterTravelerParcels(mockParcels, {
        travelDate: '2026-10-30',
        fromCity: 'Delhi',
        toCity: 'Mumbai',
      });

      // p-del-mum-2 has deliveryDate 2026-10-28 (too early)
      // p-del-mum-1 has deliveryDate 2026-10-30 (valid)
      // p-heavy-4 has deliveryDate 2026-11-02 (valid)
      expect(onOct30.map((p) => p.id)).toEqual(['p-del-mum-1', 'p-heavy-4']);
    });

    it('excludes parcels created by the logged-in traveler', () => {
      const results = filterTravelerParcels(mockParcels, {
        excludeUserId: 'sender-1',
      });

      expect(results.some((p) => p.userId === 'sender-1')).toBe(false);
    });
  });

  describe('sortTravelerParcels', () => {
    it('sorts parcels by highest offer first (offer_high)', () => {
      const openParcels = mockParcels.filter((p) => p.status === 'open');
      const sorted = sortTravelerParcels(openParcels, 'offer_high');
      expect(sorted.map((p) => p.priceOffer)).toEqual([1500, 850, 500, 350]);
    });

    it('sorts parcels by lowest offer first (offer_low)', () => {
      const openParcels = mockParcels.filter((p) => p.status === 'open');
      const sorted = sortTravelerParcels(openParcels, 'offer_low');
      expect(sorted.map((p) => p.priceOffer)).toEqual([350, 500, 850, 1500]);
    });

    it('sorts parcels by lowest weight first (weight_low)', () => {
      const openParcels = mockParcels.filter((p) => p.status === 'open');
      const sorted = sortTravelerParcels(openParcels, 'weight_low');
      expect(sorted.map((p) => p.weight)).toEqual([0.8, 3.5, 6.0, 12.0]);
    });

    it('sorts parcels by nearest delivery date (date_nearest)', () => {
      const openParcels = mockParcels.filter((p) => p.status === 'open');
      const sorted = sortTravelerParcels(openParcels, 'date_nearest');
      expect(sorted.map((p) => p.deliveryDate)).toEqual([
        '2026-10-28',
        '2026-10-29',
        '2026-10-30',
        '2026-11-02',
      ]);
    });
  });
});
