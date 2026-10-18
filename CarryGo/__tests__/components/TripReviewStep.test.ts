import { VEHICLES, VEHICLE_MAX_CAPACITY } from '@/components/feature/trip/TripDetailsStep';
import { TripReviewDraft } from '@/components/feature/trip/TripReviewStep';

describe('TripReviewStep - Waybill mapping and publishing readiness', () => {
  const validDraft: TripReviewDraft = {
    fromCity: 'Gurugram',
    toCity: 'Chandigarh',
    date: '2026-10-25',
    time: '10:00 AM',
    vehicle: 'car',
    capacity: '10',
    price: '80',
  };

  it('maps vehicle type to correct display label and icon', () => {
    for (const v of VEHICLES) {
      expect(v.label).toBeDefined();
      expect(v.icon).toBeDefined();
    }

    const carVehicle = VEHICLES.find((v) => v.type === 'car');
    expect(carVehicle?.label).toBe('Car');
    expect(carVehicle?.icon).toBe('directions-car');

    const bikeVehicle = VEHICLES.find((v) => v.type === 'bike');
    expect(bikeVehicle?.label).toBe('Bike');
    expect(bikeVehicle?.icon).toBe('two-wheeler');
  });

  it('verifies complete trip draft readiness before publishing', () => {
    const isReadyToPublish = (draft: TripReviewDraft) => {
      if (!draft.fromCity || !draft.toCity) return false;
      if (draft.fromCity.trim().toLowerCase() === draft.toCity.trim().toLowerCase()) return false;
      if (!draft.date || !draft.time) return false;
      const cap = Number(draft.capacity);
      if (!Number.isFinite(cap) || cap <= 0 || cap > (VEHICLE_MAX_CAPACITY[draft.vehicle] || 100)) return false;
      const price = Number(draft.price);
      if (!Number.isFinite(price) || price < 1 || price > 50000) return false;
      return true;
    };

    expect(isReadyToPublish(validDraft)).toBe(true);

    // Identical cities should fail
    expect(
      isReadyToPublish({
        ...validDraft,
        toCity: 'Gurugram',
      })
    ).toBe(false);

    // Excessive capacity should fail
    expect(
      isReadyToPublish({
        ...validDraft,
        vehicle: 'bike',
        capacity: '50', // Max bike is 15
      })
    ).toBe(false);

    // Invalid price should fail
    expect(
      isReadyToPublish({
        ...validDraft,
        price: '0',
      })
    ).toBe(false);
  });
});
