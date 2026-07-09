import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/template';
import { Trip, Parcel } from '@/types';
import { useAuth } from '@/hooks/useAuth';

interface RecommendationsReturn {
  recommendedTrips: Trip[];
  recommendedParcels: Parcel[];
  isLoading: boolean;
}

/**
 * Personalized recommendations based on user's saved routes and past activity.
 * Suggests trips to carry on frequent routes, and parcels to send on upcoming trips.
 */
export function useRecommendations(): RecommendationsReturn {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['recommendations', user?.id],
    enabled: Boolean(user?.id),
    staleTime: 5 * 60 * 1000, // 5 minute cache
    queryFn: async () => {
      if (!user) return { recommendedTrips: [], recommendedParcels: [] };

      const sb = getSupabaseClient();

      // Get user's route subscriptions for interest signals
      const { data: subscriptions } = await sb
        .from('route_subscriptions')
        .select('from_city, to_city')
        .eq('user_id', user.id)
        .eq('active', true)
        .limit(10);

      // Get user's past trips for route patterns
      const { data: userTrips } = await sb
        .from('trips')
        .select('from_city, to_city')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get user's past parcels for route patterns
      const { data: userParcels } = await sb
        .from('parcels')
        .select('from_city, to_city')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Build set of interesting routes
      const routes = new Set<string>();
      for (const sub of subscriptions ?? []) {
        routes.add(`${sub.from_city}|${sub.to_city}`);
      }
      for (const trip of userTrips ?? []) {
        routes.add(`${trip.from_city}|${trip.to_city}`);
        // Also add reverse route
        routes.add(`${trip.to_city}|${trip.from_city}`);
      }
      for (const parcel of userParcels ?? []) {
        routes.add(`${parcel.from_city}|${parcel.to_city}`);
      }

      if (routes.size === 0) {
        return { recommendedTrips: [], recommendedParcels: [] };
      }

      // Get unique cities from routes
      const fromCities = new Set<string>();
      const toCities = new Set<string>();
      for (const route of routes) {
        const [from, to] = route.split('|');
        fromCities.add(from);
        toCities.add(to);
      }

      // Fetch active trips on user's frequent routes (not user's own)
      const { data: matchingTrips } = await sb
        .from('trips')
        .select('*')
        .eq('status', 'active')
        .neq('user_id', user.id)
        .in('from_city', Array.from(fromCities))
        .in('to_city', Array.from(toCities))
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch open parcels on user's frequent routes (not user's own)
      const { data: matchingParcels } = await sb
        .from('parcels')
        .select('*')
        .in('status', ['open'])
        .neq('user_id', user.id)
        .in('from_city', Array.from(fromCities))
        .in('to_city', Array.from(toCities))
        .order('created_at', { ascending: false })
        .limit(10);

      const recommendedTrips: Trip[] = (matchingTrips ?? []).map(row => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        userRating: parseFloat(String(row.user_rating)) || 4.5,
        fromCity: row.from_city,
        toCity: row.to_city,
        date: row.date,
        time: row.time,
        vehicleType: row.vehicle_type as Trip['vehicleType'],
        availableCapacity: parseFloat(String(row.available_capacity)),
        pricePerKg: parseFloat(String(row.price_per_kg)),
        status: row.status as Trip['status'],
        createdAt: row.created_at,
      }));

      const recommendedParcels: Parcel[] = (matchingParcels ?? []).map(row => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        fromCity: row.from_city,
        toCity: row.to_city,
        category: row.category as Parcel['category'],
        description: row.description,
        weight: parseFloat(String(row.weight)),
        priceOffer: parseFloat(String(row.price_offer)),
        status: row.status as Parcel['status'],
        imageUri: row.image_url ?? undefined,
        createdAt: row.created_at,
      }));

      return { recommendedTrips, recommendedParcels };
    },
  });

  return {
    recommendedTrips: data?.recommendedTrips ?? [],
    recommendedParcels: data?.recommendedParcels ?? [],
    isLoading,
  };
}
