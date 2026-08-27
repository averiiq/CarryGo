export const queryKeys = {
  listings: {
    all: ['listings'] as const,
    trips: (filters?: { fromCity?: string; toCity?: string; userCity?: string }) =>
      filters ? ['listings', 'trips', filters] as const : ['listings', 'trips'] as const,
    trip: (tripId: string) => ['listings', 'trip', tripId] as const,
    parcels: (filters?: { fromCity?: string; toCity?: string; userCity?: string }) =>
      filters ? ['listings', 'parcels', filters] as const : ['listings', 'parcels'] as const,
    parcel: (parcelId: string) => ['listings', 'parcel', parcelId] as const,
    parcelsByIds: (parcelIds: string[]) => ['listings', 'parcels-by-ids', ...parcelIds] as const,
  },
  requests: {
    all: ['requests'] as const,
    byUser: (userId: string) => ['requests', 'by-user', userId] as const,
    detail: (requestId: string) => ['requests', 'detail', requestId] as const,
    byTrip: (tripId: string) => ['requests', 'by-trip', tripId] as const,
    byParcel: (parcelId: string) => ['requests', 'by-parcel', parcelId] as const,
  },
  conversations: {
    all: ['conversations'] as const,
    byUser: (userId: string) => ['conversations', 'by-user', userId] as const,
    messages: (conversationId: string) => ['conversations', 'messages', conversationId] as const,
  },
  recommendations: {
    byUser: (userId: string) => ['recommendations', userId] as const,
  },
  smartSearch: {
    trips: (fromCity: string, toCity: string) => ['smartSearch', 'trips', fromCity, toCity] as const,
    parcels: (fromCity: string, toCity: string) => ['smartSearch', 'parcels', fromCity, toCity] as const,
  },
};
