export const moduleBoundaries = [
  'auth',
  'users',
  'trips',
  'parcels',
  'matching',
  'bookings',
  'payments',
  'tracking',
  'ratings',
  'notifications',
  'admin',
] as const;

export type ModuleName = (typeof moduleBoundaries)[number];

