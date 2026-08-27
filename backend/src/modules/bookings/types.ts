export interface ReserveBookingRequest {
  tripId: string;
  senderId: string;
  units: number;
}

export interface ReserveBookingCommand {
  idempotencyKey: string;
  tripId: string;
  senderId: string;
  units: number;
}

