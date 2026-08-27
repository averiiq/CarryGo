import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { json, JsonResponse } from './response';
import { handleHealth } from '../modules/health/handler';
import { handleReserveBooking } from '../modules/bookings/handler';
import {
  handleCreateTrip,
  handleGetTrip,
  handleListTrips,
  handleUpdateTripStatus,
} from '../modules/trips/handler';
import {
  handleCreateParcel,
  handleGetParcel,
  handleListParcels,
  handleUpdateParcelStatus,
} from '../modules/parcels/handler';
import {
  handleCreateRequest,
  handleDisputesOverview,
  handleGetRequest,
  handleListRequests,
  handleListRequestsByParcel,
  handleListRequestsByTrip,
  handleUpdateRequestStatus,
} from '../modules/requests/handler';

const normalizePath = (rawPath: string): string => {
  if (rawPath.startsWith('/api/')) {
    return rawPath.replace('/api', '');
  }

  return rawPath;
};

export const routeRequest = async (
  event: APIGatewayProxyEventV2,
): Promise<JsonResponse> => {
  const method = event.requestContext.http.method;
  const path = normalizePath(event.rawPath);

  if (method === 'GET' && path === '/health') {
    return handleHealth();
  }

  if (method === 'POST' && path === '/bookings/reserve') {
    return handleReserveBooking(event);
  }

  if (method === 'GET' && path === '/trips') {
    return handleListTrips(event);
  }

  if (method === 'POST' && path === '/trips') {
    return handleCreateTrip(event);
  }

  const tripStatusMatch = path.match(/^\/trips\/([^/]+)\/status$/);
  if (method === 'PATCH' && tripStatusMatch) {
    return handleUpdateTripStatus(tripStatusMatch[1], event);
  }

  const tripMatch = path.match(/^\/trips\/([^/]+)$/);
  if (method === 'GET' && tripMatch) {
    return handleGetTrip(tripMatch[1]);
  }

  if (method === 'GET' && path === '/parcels') {
    return handleListParcels(event);
  }

  if (method === 'POST' && path === '/parcels') {
    return handleCreateParcel(event);
  }

  const parcelStatusMatch = path.match(/^\/parcels\/([^/]+)\/status$/);
  if (method === 'PATCH' && parcelStatusMatch) {
    return handleUpdateParcelStatus(parcelStatusMatch[1], event);
  }

  const parcelMatch = path.match(/^\/parcels\/([^/]+)$/);
  if (method === 'GET' && parcelMatch) {
    return handleGetParcel(parcelMatch[1]);
  }

  if (method === 'GET' && path === '/requests') {
    return handleListRequests(event);
  }

  if (method === 'POST' && path === '/requests') {
    return handleCreateRequest(event);
  }

  if (method === 'GET' && path === '/admin/disputes') {
    return handleDisputesOverview(event);
  }

  const requestByTripMatch = path.match(/^\/requests\/by-trip\/([^/]+)$/);
  if (method === 'GET' && requestByTripMatch) {
    return handleListRequestsByTrip(event, requestByTripMatch[1]);
  }

  const requestByParcelMatch = path.match(/^\/requests\/by-parcel\/([^/]+)$/);
  if (method === 'GET' && requestByParcelMatch) {
    return handleListRequestsByParcel(event, requestByParcelMatch[1]);
  }

  const requestStatusMatch = path.match(/^\/requests\/([^/]+)\/status$/);
  if (method === 'PATCH' && requestStatusMatch) {
    return handleUpdateRequestStatus(requestStatusMatch[1], event);
  }

  const requestMatch = path.match(/^\/requests\/([^/]+)$/);
  if (method === 'GET' && requestMatch) {
    return handleGetRequest(event, requestMatch[1]);
  }

  return json(404, {
    message: 'Not found',
    method,
    path,
  });
};
