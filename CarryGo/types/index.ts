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
  totalRatings?: number;
  totalDeliveries: number;
  totalTrips: number;
  joinedAt: string;
  verified: boolean;
  pushToken?: string;
  kycStatus: KycStatus;
  isAadhaarVerified?: boolean;
  isAddressVerified?: boolean;
  verifiedAddress?: string;
  fullName?: string;
  role?: UserRole;
  city?: string;
  profileCompletedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  isPanVerified?: boolean;
  panMasked?: string;
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
  imageUris?: string[];
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
  fromCity?: string;
  toCity?: string;
  parcelCategory?: string;
  parcelWeight?: number;
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
  pickupOtp?: string;
  deliveryOtp?: string;
  tripNote?: string;
  tripStatus?: string;
  etaText?: string;
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

export type NotificationType =
  | 'new_request'
  | 'request_accepted'
  | 'request_rejected'
  | 'delivery_otp'
  | 'delivery_pickup'
  | 'delivery_completed'
  | 'rating'
  | 'general'
  | 'route_match'
  | 'chat_message'
  | 'trip_created'
  | 'trip_updated'
  | 'trip_cancelled'
  | 'parcel_created'
  | 'parcel_updated'
  | 'parcel_cancelled'
  | 'payment_locked'
  | 'payment_released'
  | 'payment_refunded'
  | 'admin_broadcast'
  | 'promo'
  | 'system_alert';

export type NotificationCategory =
  | 'general'
  | 'matching'
  | 'trip_update'
  | 'parcel_update'
  | 'message'
  | 'payment'
  | 'promotion'
  | 'city_alert'
  | 'broadcast'
  | 'system_alert';

export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  relatedId?: string;
  read: boolean;
  readAt?: string | null;
  deepLink?: string | null;
  imageUrl?: string | null;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface UserNotificationPreferences {
  userId: string;
  enableMatches: boolean;
  enableTripUpdates: boolean;
  enableParcelUpdates: boolean;
  enableChat: boolean;
  enablePayments: boolean;
  enablePromotions: boolean;
  enableCityAlerts: boolean;
  updatedAt?: string;
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

export type KycState =
  | 'NOT_STARTED'
  | 'AADHAAR_PENDING'
  | 'AADHAAR_VERIFIED'
  | 'SELFIE_PENDING'
  | 'PAN_PENDING'
  | 'KYC_COMPLETED'
  | 'VERIFICATION_FAILED'
  | 'VERIFICATION_REVIEW';

export interface AadhaarVerifiedAddress {
  fullAddress: string;
  house?: string;
  street?: string;
  locality?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface AadhaarVerifiedData {
  referenceId: string;
  name: string;
  aadhaarNumberMasked?: string;
  dob?: string;
  gender?: string;
  address?: AadhaarVerifiedAddress;
  verifiedAt: string;
}

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
  // Sandbox DigiLocker / Aadhaar fields
  aadhaarStatus?: 'pending' | 'verified' | 'failed';
  aadhaarNumberMasked?: string;
  aadhaarReferenceId?: string;
  aadhaarName?: string;
  aadhaarDob?: string;
  aadhaarGender?: string;
  aadhaarAddress?: AadhaarVerifiedAddress;
  selfieStatus?: 'pending' | 'uploaded' | 'verified';
  faceVerified?: boolean;
  faceConfidence?: number;
  faceMetrics?: Record<string, unknown>;
  panStatus?: 'not_provided' | 'pending' | 'verified' | 'failed';
  panReferenceId?: string;
  kycFlowVersion?: number;
}

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type SupportTicketCategory =
  | 'delivery_issue'
  | 'payment_refund'
  | 'kyc_account'
  | 'safety_conduct'
  | 'technical_bug'
  | 'general';

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  status: SupportTicketStatus;
  category?: SupportTicketCategory;
  rawSubject?: string;
  assignedTo?: string | null;
  createdAt: string;
  updatedAt: string;
}
