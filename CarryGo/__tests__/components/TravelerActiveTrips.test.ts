import { Trip, Request, Parcel } from '@/types';

describe('Phase 4 Traveler Flow: My Active Trips (Traveler Dashboard) Data Logic', () => {
  const sampleTrip: Trip = {
    id: 'trip-delhi-mumbai-01',
    userId: 'traveler-rahul-456',
    userName: 'Rahul Verma',
    userRating: 4.9,
    fromCity: 'Delhi',
    toCity: 'Mumbai',
    date: '2026-10-30',
    time: '08:00 AM',
    vehicleType: 'car',
    availableCapacity: 15, // 15 kg total capacity
    pricePerKg: 100,
    status: 'active',
    stopovers: ['Jaipur', 'Ahmedabad'],
    createdAt: '2026-10-24T12:00:00Z',
  };

  const sampleParcels: Parcel[] = [
    {
      id: 'parcel-cam-01',
      userId: 'sender-priya-01',
      userName: 'Priya Sharma',
      fromCity: 'Delhi',
      toCity: 'Mumbai',
      category: 'electronics',
      description: 'DSLR Camera & Lens Kit',
      weight: 3.5,
      priceOffer: 450,
      status: 'matched',
      createdAt: '2026-10-25T10:00:00Z',
    },
    {
      id: 'parcel-doc-02',
      userId: 'sender-amit-02',
      userName: 'Amit Kumar',
      fromCity: 'Delhi',
      toCity: 'Mumbai',
      category: 'documents',
      description: 'Legal Contracts Portfolio',
      weight: 1.5,
      priceOffer: 250,
      status: 'matched',
      createdAt: '2026-10-25T11:00:00Z',
    },
    {
      id: 'parcel-books-03',
      userId: 'sender-neha-03',
      userName: 'Neha Gupta',
      fromCity: 'Delhi',
      toCity: 'Mumbai',
      category: 'clothing',
      description: 'Winter Jacket & Apparel',
      weight: 4.0,
      priceOffer: 400,
      status: 'open', // Pending/open, NOT accepted yet
      createdAt: '2026-10-25T12:00:00Z',
    },
  ];

  const sampleRequests: Request[] = [
    {
      id: 'req-accepted-01',
      tripId: 'trip-delhi-mumbai-01',
      parcelId: 'parcel-cam-01',
      senderId: 'sender-priya-01',
      senderName: 'Priya Sharma',
      travellerId: 'traveler-rahul-456',
      travellerName: 'Rahul Verma',
      status: 'accepted', // Officially accepted
      price: 450,
      parcelWeight: 3.5,
      parcelCategory: 'electronics',
      createdAt: '2026-10-25T10:00:00Z',
      updatedAt: '2026-10-25T10:30:00Z',
    },
    {
      id: 'req-accepted-02',
      tripId: 'trip-delhi-mumbai-01',
      parcelId: 'parcel-doc-02',
      senderId: 'sender-amit-02',
      senderName: 'Amit Kumar',
      travellerId: 'traveler-rahul-456',
      travellerName: 'Rahul Verma',
      status: 'accepted', // Officially accepted
      price: 250,
      parcelWeight: 1.5,
      parcelCategory: 'documents',
      createdAt: '2026-10-25T11:00:00Z',
      updatedAt: '2026-10-25T11:30:00Z',
    },
    {
      id: 'req-pending-03',
      tripId: 'trip-delhi-mumbai-01',
      parcelId: 'parcel-books-03',
      senderId: 'sender-neha-03',
      senderName: 'Neha Gupta',
      travellerId: 'traveler-rahul-456',
      travellerName: 'Rahul Verma',
      status: 'pending', // Pending, must NOT subtract capacity yet
      price: 400,
      parcelWeight: 4.0,
      parcelCategory: 'clothing',
      createdAt: '2026-10-25T12:00:00Z',
      updatedAt: '2026-10-25T12:00:00Z',
    },
  ];

  describe('Capacity Progress & Dynamic Subtraction Logic', () => {
    it('filters only officially accepted or completed requests for the trip', () => {
      const acceptedRequests = sampleRequests.filter(
        (r) => r.tripId === sampleTrip.id && (r.status === 'accepted' || r.status === 'completed')
      );

      expect(acceptedRequests).toHaveLength(2);
      expect(acceptedRequests.map((r) => r.id)).toEqual(['req-accepted-01', 'req-accepted-02']);
    });

    it('dynamically calculates filled capacity by summing accepted parcel weights (e.g. 5kg out of 15kg)', () => {
      const acceptedRequests = sampleRequests.filter(
        (r) => r.tripId === sampleTrip.id && (r.status === 'accepted' || r.status === 'completed')
      );

      const filledWeight = acceptedRequests.reduce((sum, req) => {
        const parcelObj = sampleParcels.find((p) => p.id === req.parcelId);
        const weight = req.parcelWeight ?? parcelObj?.weight ?? 0;
        return sum + Number(weight);
      }, 0);

      // 3.5kg (camera) + 1.5kg (documents) = 5.0kg
      expect(filledWeight).toBe(5.0);
    });

    it('correctly calculates remaining capacity by subtracting accepted parcel weights from total trip capacity', () => {
      const totalCapacity = Number(sampleTrip.availableCapacity) || 0; // 15kg
      const acceptedRequests = sampleRequests.filter(
        (r) => r.tripId === sampleTrip.id && (r.status === 'accepted' || r.status === 'completed')
      );

      const filledWeight = acceptedRequests.reduce((sum, req) => {
        const parcelObj = sampleParcels.find((p) => p.id === req.parcelId);
        const weight = req.parcelWeight ?? parcelObj?.weight ?? 0;
        return sum + Number(weight);
      }, 0);

      const remainingCapacity = Math.max(0, totalCapacity - filledWeight);

      // 15kg total - 5kg filled = 10kg remaining
      expect(remainingCapacity).toBe(10.0);
    });

    it('computes accurate fill percentage and caps at 100%', () => {
      const totalCapacity = 15;
      const filledWeight = 5;

      const fillPercentage =
        totalCapacity > 0 ? Math.min(100, Math.round((filledWeight / totalCapacity) * 100)) : 0;

      // 5 / 15 = 33.333% -> 33%
      expect(fillPercentage).toBe(33);

      // Over capacity safeguard
      const overFilledPercentage = Math.min(100, Math.round((20 / totalCapacity) * 100));
      expect(overFilledPercentage).toBe(100);
    });

    it('assigns correct theme color thresholds for progress bar & ring chart', () => {
      const getColor = (pct: number) => {
        if (pct >= 100) return '#EF4444'; // Red (fully booked)
        if (pct >= 85) return '#F59E0B'; // Amber (near capacity)
        return '#10B981'; // Green (standard brand color)
      };

      expect(getColor(33)).toBe('#10B981');
      expect(getColor(84)).toBe('#10B981');
      expect(getColor(85)).toBe('#F59E0B');
      expect(getColor(95)).toBe('#F59E0B');
      expect(getColor(100)).toBe('#EF4444');
    });
  });

  describe('Accepted Parcels List Details & Earnings', () => {
    it('accurately lists each accepted parcel with item description, weight, and agreed price', () => {
      const acceptedRequests = sampleRequests.filter(
        (r) => r.tripId === sampleTrip.id && (r.status === 'accepted' || r.status === 'completed')
      );

      const parcelsSummary = acceptedRequests.map((req) => {
        const parcelObj = sampleParcels.find((p) => p.id === req.parcelId);
        return {
          id: req.id,
          parcelId: req.parcelId,
          item: parcelObj?.description,
          weight: req.parcelWeight ?? parcelObj?.weight,
          price: req.price,
          senderName: req.senderName,
        };
      });

      expect(parcelsSummary).toHaveLength(2);
      expect(parcelsSummary[0]).toEqual({
        id: 'req-accepted-01',
        parcelId: 'parcel-cam-01',
        item: 'DSLR Camera & Lens Kit',
        weight: 3.5,
        price: 450,
        senderName: 'Priya Sharma',
      });
      expect(parcelsSummary[1]).toEqual({
        id: 'req-accepted-02',
        parcelId: 'parcel-doc-02',
        item: 'Legal Contracts Portfolio',
        weight: 1.5,
        price: 250,
        senderName: 'Amit Kumar',
      });
    });

    it('aggregates total traveler earnings for the trip', () => {
      const acceptedRequests = sampleRequests.filter(
        (r) => r.tripId === sampleTrip.id && (r.status === 'accepted' || r.status === 'completed')
      );

      const totalEarned = acceptedRequests.reduce((sum, req) => sum + Number(req.price || 0), 0);

      // ₹450 + ₹250 = ₹700
      expect(totalEarned).toBe(700);
    });
  });

  describe('Phase 5 Transition Mechanics (Update Status / Journey)', () => {
    it('transitions directly to Phase 5 delivery tracking for single accepted shipment', () => {
      const singleAcceptedList = [sampleRequests[0]];

      const getTransitionTarget = (accepted: Request[]) => {
        if (accepted.length === 1) {
          return { route: `/delivery/${accepted[0].id}`, mode: 'direct' };
        }
        if (accepted.length > 1) {
          return { route: null, mode: 'selection_sheet' };
        }
        return { route: null, mode: 'find_parcels' };
      };

      const result = getTransitionTarget(singleAcceptedList);
      expect(result.mode).toBe('direct');
      expect(result.route).toBe('/delivery/req-accepted-01');
    });

    it('provides multi-shipment selection when multiple parcels are accepted for the trip', () => {
      const acceptedRequests = sampleRequests.filter(
        (r) => r.tripId === sampleTrip.id && (r.status === 'accepted' || r.status === 'completed')
      );

      const getTransitionTarget = (accepted: Request[]) => {
        if (accepted.length === 1) {
          return { route: `/delivery/${accepted[0].id}`, mode: 'direct' };
        }
        if (accepted.length > 1) {
          return {
            mode: 'selection_sheet',
            options: accepted.map((r) => ({ requestId: r.id, price: r.price })),
          };
        }
        return { route: null, mode: 'find_parcels' };
      };

      const result = getTransitionTarget(acceptedRequests);
      expect(result.mode).toBe('selection_sheet');
      expect(result.options).toHaveLength(2);
      expect(result.options?.[0].requestId).toBe('req-accepted-01');
      expect(result.options?.[1].requestId).toBe('req-accepted-02');
    });

    it('prompts to find parcels on route when no parcels are accepted yet', () => {
      const noAccepted: Request[] = [];

      const getTransitionTarget = (accepted: Request[], trip: Trip) => {
        if (accepted.length > 0) return { mode: 'delivery' };
        return {
          mode: 'find_parcels',
          searchRoute: `/search?fromCity=${trip.fromCity}&toCity=${trip.toCity}&mode=parcels`,
        };
      };

      const result = getTransitionTarget(noAccepted, sampleTrip);
      expect(result.mode).toBe('find_parcels');
      expect(result.searchRoute).toBe('/search?fromCity=Delhi&toCity=Mumbai&mode=parcels');
    });
  });
});
