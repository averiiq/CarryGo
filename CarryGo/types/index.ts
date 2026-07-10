// CarryGo - Type Definitions

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export type UserRole = 'sender' | 'traveller' | 'both';

export type KycStatus = 'pending' | 'submitted' | 'approved' | 'rejected';
export type KycIdType = 'aadhaar' | 'pan' | 'passport' | 'driving_license';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  username?: string;
  avatar?: string;
  rating: number;
  totalDeliveries: number;
  totalTrips: number;
  joinedAt: string;
  verified: boolean;
  pushToken?: string;
  kycStatus: KycStatus;
  fullName?: string;
  role?: UserRole;
  profileCompletedAt?: string;
}

export type VehicleType = 'bike' | 'car' | 'bus' | 'train' | 'flight';

export interface Trip {
  id: string;
  userId: string;
  userName: string;
  userRating: number;
  fromCity: string;
  toCity: string;
  date: string;
  time: string;
  vehicleType: VehicleType;
  availableCapacity: number;
  pricePerKg: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

export type ParcelCategory = 'documents' | 'electronics' | 'clothing' | 'food' | 'medicine' | 'other';

export interface Parcel {
  id: string;
  userId: string;
  userName: string;
  fromCity: string;
  toCity: string;
  category: ParcelCategory;
  description: string;
  deliveryDate?: string;
  weight: number;
  priceOffer: number;
  imageUri?: string;
  status: 'open' | 'matched' | 'in_transit' | 'delivered' | 'failed' | 'cancelled';
  createdAt: string;
}

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'failed';

export interface Request {
  id: string;
  parcelId: string;
  tripId: string;
  senderId: string;
  senderName: string;
  travellerId: string;
  travellerName: string;
  status: RequestStatus;
  price: number;
  message?: string;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryStatus = 'awaiting_pickup' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';

export interface Delivery {
  id: string;
  requestId: string;
  pickupConfirmed: boolean;
  pickupConfirmedAt?: string;
  deliveryConfirmed: boolean;
  deliveryConfirmedAt?: string;
  status: DeliveryStatus;
  travellerLat?: number;
  travellerLng?: number;
  locationUpdatedAt?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  requestId: string;
  participants: string[];
  participantNames: { [userId: string]: string };
  lastMessage?: ChatMessage;
  parcelDescription: string;
  route: string;
}

export interface Rating {
  id: string;
  fromUserId: string;
  toUserId: string;
  requestId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export type NotificationType = 'new_request' | 'request_accepted' | 'request_rejected' | 'delivery_otp' | 'rating' | 'general' | 'route_match' | 'chat_message';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  relatedId?: string;
  read: boolean;
  createdAt: string;
}

export interface FilterOptions {
  fromCity: string;
  toCity: string;
  vehicleType: VehicleType | '';
  dateFrom: string;
  dateTo: string;
}

// Payment / Escrow
export type PaymentStatus = 'locked' | 'released' | 'refunded';

export interface Payment {
  id: string;
  requestId: string;
  senderId: string;
  travellerId: string;
  amount: number;
  status: PaymentStatus;
  lockedAt: string;
  releasedAt?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
}

export interface RazorpayOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface RazorpayPaymentResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// Route Subscriptions
export interface RouteSubscription {
  id: string;
  userId: string;
  fromCity: string;
  toCity: string;
  active: boolean;
  createdAt: string;
}

// Search
export interface SearchResult {
  type: 'trip' | 'parcel';
  trip?: Trip;
  parcel?: Parcel;
}

// KYC Documents
export type KycDocumentType = 'id_front' | 'id_back' | 'selfie' | 'address_proof';

export interface KycDocument {
  id: string;
  sessionId: string;
  documentType: KycDocumentType;
  storagePath: string;
  fileSizeBytes?: number;
  mimeType?: string;
  uploadedAt: string;
}

export interface KycSession {
  id: string;
  userId: string;
  fullName: string;
  idType: KycIdType;
  status: KycStatus;
  rejectionReason?: string;
  submissionAttempt: number;
  documents: KycDocument[];
  createdAt: string;
}
