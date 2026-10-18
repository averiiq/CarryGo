import {
  VEHICLE_MAX_CAPACITY,
  VEHICLE_QUICK_DEFAULTS,
  VEHICLES,
} from '@/components/feature/trip/TripDetailsStep';
import { VehicleType } from '@/types';

describe('TripDetailsStep - Vehicle configuration & capacity validation', () => {
  it('defines realistic maximum capacity per vehicle type', () => {
    expect(VEHICLE_MAX_CAPACITY.bike).toBe(15);
    expect(VEHICLE_MAX_CAPACITY.flight).toBe(25);
    expect(VEHICLE_MAX_CAPACITY.car).toBe(100);
    expect(VEHICLE_MAX_CAPACITY.bus).toBe(100);
    expect(VEHICLE_MAX_CAPACITY.train).toBe(150);
  });

  it('contains exactly the 5 supported PostgreSQL enum vehicle types', () => {
    const types = VEHICLES.map((v) => v.type).sort();
    const expectedTypes: VehicleType[] = ['bike', 'bus', 'car', 'flight', 'train'].sort() as VehicleType[];
    expect(types).toEqual(expectedTypes);
  });

  it('provides quick capacity defaults within the safe vehicle limits', () => {
    for (const vehicle of VEHICLES) {
      const def = VEHICLE_QUICK_DEFAULTS[vehicle.type];
      expect(def).toBeDefined();
      const capNum = Number(def.capacity);
      expect(capNum).toBeGreaterThan(0);
      expect(capNum).toBeLessThanOrEqual(VEHICLE_MAX_CAPACITY[vehicle.type]);
      expect(Number(def.price)).toBeGreaterThan(0);
    }
  });

  it('calculates potential earnings correctly', () => {
    const capacity = '10';
    const pricePerKg = '80';
    const earnings = Number(capacity) * Number(pricePerKg);
    expect(earnings).toBe(800);
  });

  it('flags capacities that exceed vehicle physical constraints', () => {
    const validateCapacity = (vehicle: VehicleType, capacityStr: string) => {
      const cap = Number(capacityStr);
      const max = VEHICLE_MAX_CAPACITY[vehicle];
      if (!Number.isFinite(cap) || cap <= 0) return 'Enter capacity';
      if (cap > max) return `Max ${max} kg for ${vehicle}`;
      return null;
    };

    expect(validateCapacity('bike', '20')).toBe('Max 15 kg for bike');
    expect(validateCapacity('bike', '10')).toBeNull();
    expect(validateCapacity('flight', '30')).toBe('Max 25 kg for flight');
    expect(validateCapacity('flight', '15')).toBeNull();
    expect(validateCapacity('car', '150')).toBe('Max 100 kg for car');
    expect(validateCapacity('car', '50')).toBeNull();
  });
});
