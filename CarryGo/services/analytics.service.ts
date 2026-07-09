import { getSupabaseClient } from '@/template';

export interface UserStats {
  completedDeliveries: number;
  totalTrips: number;
  totalParcels: number;
  averageRating: number;
  totalEarnings: number;
  responseTimeMinutes: number;
  routesServed: string[];
  memberSince: string;
  successRate: number;
}

export interface RoutePopularity {
  fromCity: string;
  toCity: string;
  activeTrips: number;
  openParcels: number;
  averagePrice: number;
  demandScore: number;
}

export interface ActivityEvent {
  id: string;
  type: 'trip_created' | 'parcel_created' | 'request_sent' | 'request_accepted' | 'delivery_completed' | 'rating_received';
  description: string;
  timestamp: string;
}

export async function fetchUserStats(userId: string): Promise<{ data: UserStats | null; error: string | null }> {
  const sb = getSupabaseClient();

  const [profileRes, tripsRes, parcelsRes, requestsRes, paymentsRes, ratingsRes] = await Promise.all([
    sb.from('user_profiles').select('rating, total_deliveries, total_trips, created_at').eq('id', userId).single(),
    sb.from('trips').select('id, from_city, to_city', { count: 'exact' }).eq('user_id', userId),
    sb.from('parcels').select('id', { count: 'exact' }).eq('user_id', userId),
    sb.from('requests').select('id, status', { count: 'exact' }).or(`sender_id.eq.${userId},traveller_id.eq.${userId}`).eq('status', 'completed'),
    sb.from('payments').select('amount').eq('traveller_id', userId).eq('status', 'released'),
    sb.from('ratings').select('rating').eq('to_user_id', userId),
  ]);

  if (profileRes.error) return { data: null, error: profileRes.error.message };

  const routes: string[] = [];
  tripsRes.data?.forEach(t => {
    const route = `${t.from_city} → ${t.to_city}`;
    if (!routes.includes(route)) routes.push(route);
  });

  const avgRating = ratingsRes.data && ratingsRes.data.length > 0
    ? ratingsRes.data.reduce((sum, r) => sum + r.rating, 0) / ratingsRes.data.length
    : profileRes.data.rating ?? 4.5;

  const totalEarnings = paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

  const totalRequests = requestsRes.count ?? 0;
  const completedDeliveries = profileRes.data.total_deliveries ?? 0;

  return {
    data: {
      completedDeliveries,
      totalTrips: tripsRes.count ?? 0,
      totalParcels: parcelsRes.count ?? 0,
      averageRating: Math.round(avgRating * 10) / 10,
      totalEarnings,
      responseTimeMinutes: 15,
      routesServed: routes.slice(0, 10),
      memberSince: profileRes.data.created_at,
      successRate: totalRequests > 0 ? Math.round((completedDeliveries / totalRequests) * 100) : 100,
    },
    error: null,
  };
}

export async function fetchRoutePopularity(fromCity: string, toCity: string): Promise<{ data: RoutePopularity | null; error: string | null }> {
  const sb = getSupabaseClient();

  const [tripsRes, parcelsRes, priceRes] = await Promise.all([
    sb.from('trips').select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .ilike('from_city', `%${fromCity}%`)
      .ilike('to_city', `%${toCity}%`),
    sb.from('parcels').select('id', { count: 'exact', head: true })
      .eq('status', 'open')
      .ilike('from_city', `%${fromCity}%`)
      .ilike('to_city', `%${toCity}%`),
    sb.from('trips').select('price_per_kg')
      .eq('status', 'active')
      .ilike('from_city', `%${fromCity}%`)
      .ilike('to_city', `%${toCity}%`)
      .limit(20),
  ]);

  const activeTrips = tripsRes.count ?? 0;
  const openParcels = parcelsRes.count ?? 0;
  const prices = priceRes.data?.map(p => Number(p.price_per_kg)) ?? [];
  const averagePrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;

  const demandScore = Math.min(100, Math.round(
    (openParcels * 15) + (activeTrips * 10) + (averagePrice > 0 ? 20 : 0)
  ));

  return {
    data: { fromCity, toCity, activeTrips, openParcels, averagePrice, demandScore },
    error: null,
  };
}

export async function fetchUserActivityTimeline(userId: string, days: number = 30): Promise<{ data: ActivityEvent[]; error: string | null }> {
  const sb = getSupabaseClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const [tripsRes, parcelsRes, requestsRes] = await Promise.all([
    sb.from('trips').select('id, from_city, to_city, created_at')
      .eq('user_id', userId).gte('created_at', sinceStr)
      .order('created_at', { ascending: false }).limit(20),
    sb.from('parcels').select('id, from_city, to_city, created_at')
      .eq('user_id', userId).gte('created_at', sinceStr)
      .order('created_at', { ascending: false }).limit(20),
    sb.from('requests').select('id, status, created_at, updated_at')
      .or(`sender_id.eq.${userId},traveller_id.eq.${userId}`)
      .gte('created_at', sinceStr)
      .order('created_at', { ascending: false }).limit(20),
  ]);

  const events: ActivityEvent[] = [];

  tripsRes.data?.forEach(t => {
    events.push({
      id: t.id,
      type: 'trip_created',
      description: `Posted trip ${t.from_city} → ${t.to_city}`,
      timestamp: t.created_at,
    });
  });

  parcelsRes.data?.forEach(p => {
    events.push({
      id: p.id,
      type: 'parcel_created',
      description: `Created parcel ${p.from_city} → ${p.to_city}`,
      timestamp: p.created_at,
    });
  });

  requestsRes.data?.forEach(r => {
    if (r.status === 'completed') {
      events.push({
        id: r.id,
        type: 'delivery_completed',
        description: 'Delivery completed successfully',
        timestamp: r.updated_at,
      });
    }
  });

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return { data: events.slice(0, 30), error: null };
}
