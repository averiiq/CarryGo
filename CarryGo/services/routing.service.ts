import { INDIAN_CITIES, IndianCity, findCity, getDistance, haversineDistance } from '@/constants/indian-cities';

export interface StopoverSuggestion {
  city: string;
  distanceFromOriginKm: number;
  source: 'ors' | 'mappls' | 'local';
}

export interface RoutingResult {
  data: StopoverSuggestion[];
  error: string | null;
}

export interface RouteOption {
  id: string;
  name: string;
  summary: string;
  distanceKm: number;
  durationMin: number;
  geometry: Array<[number, number]>; // Array of [lng, lat]
  suggestedStopovers: StopoverSuggestion[];
  isFastest?: boolean;
}

export interface RouteAlternativesResult {
  routes: RouteOption[];
  selectedRouteId: string;
  error: string | null;
}

const ORS_KEY = process.env.EXPO_PUBLIC_ORS_KEY;
const MAPPLS_REST_KEY = process.env.EXPO_PUBLIC_MAPMYINDIA_KEY;
const MAPPLS_CLIENT_ID = process.env.EXPO_PUBLIC_MAPMYINDIA_CLIENT_ID;
// TODO: SECURITY — MAPPLS_CLIENT_SECRET should NOT use EXPO_PUBLIC_ prefix as it gets
// bundled into the app binary. Migrate OAuth token exchange to a server-side Edge Function.
const MAPPLS_CLIENT_SECRET = process.env.EXPO_PUBLIC_MAPMYINDIA_CLIENT_SECRET;

const MAX_SUGGESTIONS = 12;
const ABSOLUTE_MIN_ROUTE_DISTANCE_KM = 12;

let cachedToken: { value: string; expiresAt: number } | null = null;

async function resolveMapplsKey(): Promise<string | null> {
  if (MAPPLS_REST_KEY) return MAPPLS_REST_KEY;
  if (!MAPPLS_CLIENT_ID || !MAPPLS_CLIENT_SECRET) return null;
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }
  try {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: MAPPLS_CLIENT_ID,
      client_secret: MAPPLS_CLIENT_SECRET,
    }).toString();
    const res = await fetch('https://outpost.mappls.com/api/security/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.access_token) return null;
    cachedToken = {
      value: json.access_token,
      expiresAt: Date.now() + (Number(json.expires_in || 3600) * 1000),
    };
    return cachedToken.value;
  } catch {
    return null;
  }
}

/**
 * Calculates adaptive thresholds based on the total route distance.
 * Allows short routes (15 - 55km) to discover intermediate stops (like Manesar, Gharaunda, Samalkha, Shahbad)
 * while maintaining proper spacing on long routes (150 - 300km).
 */
export function getAdaptiveThresholds(totalDistKm: number) {
  // Distance from origin or destination required for a valid stop
  const minLegKm = Math.max(3.5, Math.min(18, Math.round(totalDistKm * 0.12)));
  // Maximum cross-track tolerance off the highway corridor
  const maxCrossKm = Math.max(5.5, Math.min(25, Math.round(totalDistKm * 0.22)));
  // Minimum spacing between two consecutive suggested stops
  const minSpacingKm = Math.max(4, Math.min(16, Math.round(minLegKm * 0.75)));

  return { minLegKm, maxCrossKm, minSpacingKm };
}

/**
 * Perpendicular distance in km from a point to a line segment
 */
export function distancePointToSegmentKm(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const cosLat = Math.cos(((aLat + bLat) / 2) * (Math.PI / 180));
  const dx = (bLng - aLng) * cosLat;
  const dy = bLat - aLat;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return haversineDistance(pLat, pLng, aLat, aLng);

  const px = (pLng - aLng) * cosLat;
  const py = pLat - aLat;
  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / l2));
  const projLat = aLat + t * dy;
  const projLng = aLng + t * (bLng - aLng);
  return haversineDistance(pLat, pLng, projLat, projLng);
}

export function localFallback(fromCity: string, toCity: string): StopoverSuggestion[] {
  const start = findCity(fromCity);
  const end = findCity(toCity);
  if (!start || !end) return [];

  const total = getDistance(start, end);
  if (total < ABSOLUTE_MIN_ROUTE_DISTANCE_KM) return [];

  const { minLegKm, maxCrossKm, minSpacingKm } = getAdaptiveThresholds(total);

  const candidates: Array<{ city: IndianCity; dist: number; cross: number }> = [];
  for (const c of INDIAN_CITIES) {
    if (c.name === start.name || c.name === end.name) continue;
    const distFromStart = getDistance(start, c);
    const distToEnd = getDistance(c, end);
    if (distFromStart < minLegKm || distToEnd < minLegKm) continue;

    const cross = distancePointToSegmentKm(c.lat, c.lng, start.lat, start.lng, end.lat, end.lng);
    if (cross > maxCrossKm) continue;

    candidates.push({ city: c, dist: distFromStart, cross });
  }

  candidates.sort((a, b) => a.dist - b.dist);

  const picked: Array<{ city: IndianCity; dist: number }> = [];
  for (const cand of candidates) {
    if (picked.length >= MAX_SUGGESTIONS) break;
    const tooClose = picked.some(p => Math.abs(p.dist - cand.dist) < minSpacingKm);
    if (tooClose) continue;
    picked.push({ city: cand.city, dist: cand.dist });
  }

  return picked.map(p => ({
    city: p.city.name,
    distanceFromOriginKm: Math.round(p.dist),
    source: 'local' as const,
  }));
}

export function pickStopoversFromGeometry(
  from: IndianCity,
  to: IndianCity,
  geometry: Array<[number, number]>,
  source: 'ors' | 'mappls' | 'local',
): StopoverSuggestion[] {
  if (!geometry.length) return [];
  const totalDist = getDistance(from, to);
  if (totalDist < ABSOLUTE_MIN_ROUTE_DISTANCE_KM) return [];

  const { minLegKm, maxCrossKm, minSpacingKm } = getAdaptiveThresholds(totalDist);

  const candidates: Array<{ city: IndianCity; distFromStart: number; cross: number }> = [];

  for (const c of INDIAN_CITIES) {
    if (c.name === from.name || c.name === to.name) continue;
    const distFromStart = getDistance(from, c);
    const distToEnd = getDistance(c, to);
    if (distFromStart < minLegKm || distToEnd < minLegKm) continue;

    // Find minimum distance from candidate city to any point on the road geometry
    let minDistanceToRoad = Infinity;
    const step = Math.max(1, Math.floor(geometry.length / 90));
    for (let i = 0; i < geometry.length; i += step) {
      const [lng, lat] = geometry[i];
      const d = haversineDistance(c.lat, c.lng, lat, lng);
      if (d < minDistanceToRoad) {
        minDistanceToRoad = d;
      }
      if (d < 1.5) break; // close enough to road
    }

    if (minDistanceToRoad <= maxCrossKm) {
      candidates.push({ city: c, distFromStart, cross: minDistanceToRoad });
    }
  }

  candidates.sort((a, b) => a.distFromStart - b.distFromStart);

  const picked: Array<{ city: IndianCity; distFromStart: number }> = [];
  for (const cand of candidates) {
    if (picked.length >= MAX_SUGGESTIONS) break;
    const tooClose = picked.some(p => Math.abs(p.distFromStart - cand.distFromStart) < minSpacingKm);
    if (tooClose) continue;
    picked.push(cand);
  }

  return picked.map(p => ({
    city: p.city.name,
    distanceFromOriginKm: Math.round(p.distFromStart),
    source,
  }));
}

async function fetchFromMappls(from: IndianCity, to: IndianCity): Promise<StopoverSuggestion[] | null> {
  const key = await resolveMapplsKey();
  if (!key) return null;
  try {
    const url = `https://apis.mappls.com/advancedmaps/v1/${key}/route_adv/driving/${from.lng},${from.lat};${to.lng},${to.lat}?steps=true&overview=simplified`;
    const headers: Record<string, string> = MAPPLS_REST_KEY ? {} : { Authorization: `Bearer ${key}` };
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const json = await res.json();

    const geometry: Array<[number, number]> = json?.routes?.[0]?.geometry?.coordinates || [];
    if (!geometry.length) return null;

    const totalDistM = Number(json.routes[0].distance || 0);
    if (totalDistM < ABSOLUTE_MIN_ROUTE_DISTANCE_KM * 1000) return [];

    return pickStopoversFromGeometry(from, to, geometry, 'mappls');
  } catch {
    return null;
  }
}

async function fetchFromOrs(from: IndianCity, to: IndianCity): Promise<StopoverSuggestion[] | null> {
  if (!ORS_KEY) return null;
  try {
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?start=${from.lng},${from.lat}&end=${to.lng},${to.lat}`;
    const res = await fetch(url, { headers: { Authorization: ORS_KEY } });
    if (!res.ok) return null;
    const json = await res.json();
    const coords: Array<[number, number]> = json?.features?.[0]?.geometry?.coordinates || [];
    if (!coords.length) return null;
    const distM = Number(json.features[0].properties?.summary?.distance || 0);
    if (distM < ABSOLUTE_MIN_ROUTE_DISTANCE_KM * 1000) return [];
    return pickStopoversFromGeometry(from, to, coords, 'ors');
  } catch {
    return null;
  }
}

/**
 * Creates interpolated coordinates between cities for offline or fallback rendering
 */
function createInterpolatedGeometry(
  points: IndianCity[],
  numSegments = 20
): Array<[number, number]> {
  const coords: Array<[number, number]> = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    for (let s = 0; s < numSegments; s++) {
      const t = s / numSegments;
      const lng = p1.lng + (p2.lng - p1.lng) * t;
      const lat = p1.lat + (p2.lat - p1.lat) * t;
      coords.push([lng, lat]);
    }
  }
  const last = points[points.length - 1];
  coords.push([last.lng, last.lat]);
  return coords;
}

/**
 * Builds fallback route options when network/ORS is not accessible
 */
function buildLocalFallbackRoutes(from: IndianCity, to: IndianCity): RouteOption[] {
  const straightDist = Math.round(getDistance(from, to));
  const directStopovers = localFallback(from.name, to.name);

  // Direct Route
  const intermediateCities = directStopovers.slice(0, 3).map(s => findCity(s.city)).filter(Boolean) as IndianCity[];
  const directPathCities = [from, ...intermediateCities, to];
  const directGeometry = createInterpolatedGeometry(directPathCities);

  const route1: RouteOption = {
    id: 'route-direct',
    name: 'Primary Route (Direct)',
    summary: 'Direct Corridor',
    distanceKm: straightDist,
    durationMin: Math.round((straightDist / 60) * 60),
    geometry: directGeometry,
    suggestedStopovers: directStopovers,
    isFastest: true,
  };

  // Find candidate for alternative corridor
  const { minLegKm } = getAdaptiveThresholds(straightDist);
  const minAltCross = Math.max(6, Math.min(22, Math.round(straightDist * 0.18)));
  const maxAltCross = Math.max(15, Math.min(65, Math.round(straightDist * 0.55)));

  const altCandidates = INDIAN_CITIES.filter(c => {
    if (c.name === from.name || c.name === to.name) return false;
    const cross = distancePointToSegmentKm(c.lat, c.lng, from.lat, from.lng, to.lat, to.lng);
    const d1 = getDistance(from, c);
    const d2 = getDistance(c, to);
    return cross >= minAltCross && cross <= maxAltCross && d1 >= minLegKm && d2 >= minLegKm;
  });

  if (altCandidates.length > 0) {
    const altCity = altCandidates[0];
    const altDist = Math.round(getDistance(from, altCity) + getDistance(altCity, to));
    const altGeometry = createInterpolatedGeometry([from, altCity, to]);
    const altStopovers: StopoverSuggestion[] = [
      { city: altCity.name, distanceFromOriginKm: Math.round(getDistance(from, altCity)), source: 'local' },
      ...directStopovers.slice(0, 2),
    ];

    const route2: RouteOption = {
      id: 'route-alt',
      name: `via ${altCity.name} (Bypass)`,
      summary: `via ${altCity.name}`,
      distanceKm: altDist,
      durationMin: Math.round((altDist / 55) * 60),
      geometry: altGeometry,
      suggestedStopovers: altStopovers,
      isFastest: false,
    };
    return [route1, route2];
  }

  return [route1];
}

const routeAlternativesCache = new Map<string, { data: RouteOption[]; ts: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function cacheKey(from: string, to: string): string {
  return `${from.trim().toLowerCase()}|${to.trim().toLowerCase()}`;
}

/**
 * Fetch all available possible routes between two cities, with road geometry
 * and customized stopovers along each specific route corridor.
 */
export async function fetchRouteAlternatives(
  fromCity: string,
  toCity: string
): Promise<RouteAlternativesResult> {
  if (!fromCity || !toCity) {
    return { routes: [], selectedRouteId: '', error: null };
  }

  const start = findCity(fromCity);
  const end = findCity(toCity);
  if (!start || !end) {
    return { routes: [], selectedRouteId: '', error: 'Origin or destination city not found' };
  }

  const key = cacheKey(fromCity, toCity);
  const hit = routeAlternativesCache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return {
      routes: hit.data,
      selectedRouteId: hit.data[0]?.id || '',
      error: null,
    };
  }

  // If ORS key is available, query OpenRouteService Directions API
  if (ORS_KEY) {
    try {
      const straightDistKm = getDistance(start, end);

      // Scenario A: Under 100km, ORS native alternative_routes works directly
      if (straightDistKm < 100) {
        const url = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';
        const body = {
          coordinates: [[start.lng, start.lat], [end.lng, end.lat]],
          alternative_routes: { target_count: 2, share_factor: 0.6 },
        };
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: ORS_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const json = await res.json();
          const features: any[] = json?.features || [];
          if (features.length > 0) {
            const routes: RouteOption[] = features.map((feat, idx) => {
              const coords: Array<[number, number]> = feat.geometry?.coordinates || [];
              const distKm = Math.round((feat.properties?.summary?.distance || 0) / 1000);
              const durMin = Math.round((feat.properties?.summary?.duration || 0) / 60);
              const stopovers = pickStopoversFromGeometry(start, end, coords, 'ors');

              const isFirst = idx === 0;
              return {
                id: `route-${idx}`,
                name: isFirst ? 'Main Highway (Fastest)' : `Alternative Route ${idx}`,
                summary: isFirst ? 'Fastest highway corridor' : 'Alternate transit path',
                distanceKm: distKm,
                durationMin: durMin,
                geometry: coords,
                suggestedStopovers: stopovers,
                isFastest: isFirst,
              };
            });

            routeAlternativesCache.set(key, { data: routes, ts: Date.now() });
            return { routes, selectedRouteId: routes[0].id, error: null };
          }
        }
      }

      // Scenario B: >= 100km or alternative_routes returned 1 route:
      // Fetch primary direct route + query secondary corridor via waypoint
      const directUrl = `https://api.openrouteservice.org/v2/directions/driving-car?start=${start.lng},${start.lat}&end=${end.lng},${end.lat}`;
      const directRes = await fetch(directUrl, { headers: { Authorization: ORS_KEY } });

      if (directRes.ok) {
        const directJson = await directRes.json();
        const primaryCoords: Array<[number, number]> = directJson?.features?.[0]?.geometry?.coordinates || [];
        const primaryDistKm = Math.round((directJson?.features?.[0]?.properties?.summary?.distance || 0) / 1000);
        const primaryDurMin = Math.round((directJson?.features?.[0]?.properties?.summary?.duration || 0) / 60);

        if (primaryCoords.length > 0) {
          const primaryStopovers = pickStopoversFromGeometry(start, end, primaryCoords, 'ors');

          const primaryRoute: RouteOption = {
            id: 'route-primary',
            name: 'Main Route (Fastest)',
            summary: 'Primary expressway corridor',
            distanceKm: primaryDistKm,
            durationMin: primaryDurMin,
            geometry: primaryCoords,
            suggestedStopovers: primaryStopovers,
            isFastest: true,
          };

          const routes: RouteOption[] = [primaryRoute];

          // Search for a viable alternative waypoint from Indian cities using adaptive thresholds
          const { minLegKm } = getAdaptiveThresholds(straightDistKm);
          const minAltCross = Math.max(6, Math.min(22, Math.round(straightDistKm * 0.18)));
          const maxAltCross = Math.max(15, Math.min(65, Math.round(straightDistKm * 0.55)));

          const altCandidates = INDIAN_CITIES.filter((c) => {
            if (c.name === start.name || c.name === end.name) return false;
            const cross = distancePointToSegmentKm(c.lat, c.lng, start.lat, start.lng, end.lat, end.lng);
            const d1 = getDistance(start, c);
            const d2 = getDistance(c, end);
            return cross >= minAltCross && cross <= maxAltCross && d1 >= minLegKm && d2 >= minLegKm;
          });

          if (altCandidates.length > 0) {
            // Sort by balanced distance from midpoint
            const midDist = straightDistKm / 2;
            altCandidates.sort((a, b) => {
              const diffA = Math.abs(getDistance(start, a) - midDist);
              const diffB = Math.abs(getDistance(start, b) - midDist);
              return diffA - diffB;
            });

            const candidateVia = altCandidates[0];
            try {
              const viaUrl = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';
              const viaBody = {
                coordinates: [
                  [start.lng, start.lat],
                  [candidateVia.lng, candidateVia.lat],
                  [end.lng, end.lat],
                ],
              };
              const viaRes = await fetch(viaUrl, {
                method: 'POST',
                headers: {
                  Authorization: ORS_KEY,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(viaBody),
              });

              if (viaRes.ok) {
                const viaJson = await viaRes.json();
                const viaFeat = viaJson?.features?.[0];
                if (viaFeat?.geometry?.coordinates?.length) {
                  const altCoords: Array<[number, number]> = viaFeat.geometry.coordinates;
                  const altDistKm = Math.round((viaFeat.properties?.summary?.distance || 0) / 1000);
                  const altDurMin = Math.round((viaFeat.properties?.summary?.duration || 0) / 60);
                  const altStopovers = pickStopoversFromGeometry(start, end, altCoords, 'ors');

                  routes.push({
                    id: 'route-alt',
                    name: `via ${candidateVia.name} (Bypass)`,
                    summary: `Corridor via ${candidateVia.name}`,
                    distanceKm: altDistKm,
                    durationMin: altDurMin,
                    geometry: altCoords,
                    suggestedStopovers: altStopovers,
                    isFastest: false,
                  });
                }
              }
            } catch {
              // Keep primary route if waypoint request fails
            }
          }

          routeAlternativesCache.set(key, { data: routes, ts: Date.now() });
          return { routes, selectedRouteId: routes[0].id, error: null };
        }
      }
    } catch {
      // Fall through to local fallback
    }
  }

  // Fallback to local geometric corridor computation
  const fallbackRoutes = buildLocalFallbackRoutes(start, end);
  routeAlternativesCache.set(key, { data: fallbackRoutes, ts: Date.now() });
  return {
    routes: fallbackRoutes,
    selectedRouteId: fallbackRoutes[0]?.id || '',
    error: null,
  };
}

const suggestionCache = new Map<string, { data: StopoverSuggestion[]; ts: number }>();

export async function fetchSuggestedStopovers(fromCity: string, toCity: string): Promise<RoutingResult> {
  if (!fromCity || !toCity) return { data: [], error: null };
  const start = findCity(fromCity);
  const end = findCity(toCity);
  if (!start || !end) return { data: [], error: null };

  const key = cacheKey(fromCity, toCity);
  const hit = suggestionCache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return { data: hit.data, error: null };
  }

  const ors = await fetchFromOrs(start, end);
  if (ors && ors.length > 0) {
    suggestionCache.set(key, { data: ors, ts: Date.now() });
    return { data: ors, error: null };
  }

  const mappls = await fetchFromMappls(start, end);
  if (mappls && mappls.length > 0) {
    suggestionCache.set(key, { data: mappls, ts: Date.now() });
    return { data: mappls, error: null };
  }

  const local = localFallback(fromCity, toCity);
  suggestionCache.set(key, { data: local, ts: Date.now() });
  return { data: local, error: null };
}

export const MAX_STOPOVERS = 5;

export function isMapplsConfigured(): boolean {
  return Boolean(ORS_KEY || MAPPLS_REST_KEY || (MAPPLS_CLIENT_ID && MAPPLS_CLIENT_SECRET));
}
