/**
 * Unified Standalone Notification Service
 * Primary entrypoint for in-app, push, email, and SMS notifications.
 */

import { notificationOrchestrator } from './orchestrator';
import { inAppNotificationService } from './in-app.service';
import { pushNotificationService } from './push.service';
import { emailNotificationService } from './email.service';
import { smsNotificationService } from './sms.service';
import {
  NotificationChannel,
  NotificationCategory,
  NotificationPriority,
  UnifiedNotificationPayload,
  UnifiedNotificationResult,
} from './types';

export * from './types';
export { inAppNotificationService } from './in-app.service';
export { pushNotificationService } from './push.service';
export { emailNotificationService } from './email.service';
export { smsNotificationService } from './sms.service';
export { notificationOrchestrator } from './orchestrator';

/**
 * Main Standalone Notification Service API
 */
export const notificationService = {
  /**
   * Dispatches a unified notification across designated channels
   */
  async send(payload: UnifiedNotificationPayload): Promise<UnifiedNotificationResult> {
    return notificationOrchestrator.send(payload);
  },

  /** Sub-service handles */
  inApp: inAppNotificationService,
  push: pushNotificationService,
  email: emailNotificationService,
  sms: smsNotificationService,
};

// ── Backwards-Compatible Dispatch Function ───────────────────────────────────

export async function dispatchNotification(payload: {
  userId: string;
  senderId?: string;
  title: string;
  body: string;
  type: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  relatedId?: string;
  deepLink?: string;
  data?: Record<string, unknown>;
  channels?: NotificationChannel[];
}): Promise<{ success: boolean; error?: string }> {
  const result = await notificationOrchestrator.send({
    recipient: payload.userId,
    senderId: payload.senderId,
    title: payload.title,
    body: payload.body,
    type: payload.type,
    category: payload.category,
    priority: payload.priority,
    relatedId: payload.relatedId,
    deepLink: payload.deepLink,
    data: payload.data,
    channels: payload.channels || ['in_app', 'push'],
  });

  return {
    success: result.success,
    error: result.error,
  };
}

// ── Domain Event Notification Helpers ────────────────────────────────────────

/**
 * Notifies traveller when a sender creates a delivery request.
 */
export async function notifyNewRequest(params: {
  travellerId: string;
  senderId?: string;
  senderName: string;
  price: number;
  requestId: string;
  fromCity?: string;
  toCity?: string;
}) {
  const routeText = params.fromCity && params.toCity ? ` (${params.fromCity} → ${params.toCity})` : '';
  return notificationService.send({
    recipient: params.travellerId,
    senderId: params.senderId,
    title: '📦 New Delivery Request!',
    body: `${params.senderName} requested space on your route for ₹${params.price}${routeText}. Tap to review.`,
    type: 'new_request',
    category: 'matching',
    priority: 'high',
    relatedId: params.requestId,
    deepLink: '/(tabs)/requests',
    channels: ['in_app', 'push', 'email'],
    data: { idempotency_key: `req_created_${params.requestId}` },
  });
}

/**
 * Notifies sender when a traveller sends a carry offer on their parcel.
 */
export async function notifyNewCarryOffer(params: {
  senderId: string;
  travellerId?: string;
  travellerName: string;
  price: number;
  requestId: string;
  fromCity?: string;
  toCity?: string;
}) {
  const routeText = params.fromCity && params.toCity ? ` (${params.fromCity} → ${params.toCity})` : '';
  return notificationService.send({
    recipient: params.senderId,
    senderId: params.travellerId,
    title: '✈️ New Carry Offer!',
    body: `${params.travellerName} offered to deliver your parcel for ₹${params.price}${routeText}. Tap to review.`,
    type: 'new_offer',
    category: 'matching',
    priority: 'high',
    relatedId: params.requestId,
    deepLink: '/(tabs)/requests',
    channels: ['in_app', 'push', 'email'],
    data: { idempotency_key: `req_created_${params.requestId}` },
  });
}

/**
 * Notifies sender that the traveller accepted their request.
 */
export async function notifyRequestAccepted(params: {
  senderId: string;
  travellerId?: string;
  travellerName: string;
  requestId: string;
}) {
  return notificationService.send({
    recipient: params.senderId,
    senderId: params.travellerId,
    title: '✅ Request Accepted — Pay to Book',
    body: `${params.travellerName} accepted your delivery request. Tap to book and unlock your pickup OTP.`,
    type: 'request_accepted',
    category: 'matching',
    priority: 'high',
    relatedId: params.requestId,
    deepLink: '/(tabs)/requests',
    channels: ['in_app', 'push', 'email'],
    data: { idempotency_key: `req_acc_${params.requestId}` },
  });
}

/**
 * Notifies sender that their request was declined.
 */
export async function notifyRequestDeclined(params: {
  senderId: string;
  travellerId?: string;
  travellerName: string;
  requestId: string;
}) {
  return notificationService.send({
    recipient: params.senderId,
    senderId: params.travellerId,
    title: '❌ Request Declined',
    body: `${params.travellerName} was unable to accept your request. Explore other available routes on CaryGoo!`,
    type: 'request_rejected',
    category: 'matching',
    priority: 'normal',
    relatedId: params.requestId,
    deepLink: '/(tabs)/requests',
    channels: ['in_app', 'push'],
    data: { idempotency_key: `req_rej_${params.requestId}` },
  });
}

/**
 * Notifies traveller that their carry offer was accepted.
 */
export async function notifyOfferAccepted(params: {
  travellerId: string;
  senderId?: string;
  senderName: string;
  requestId: string;
}) {
  return notificationService.send({
    recipient: params.travellerId,
    senderId: params.senderId,
    title: '🎉 Carry Offer Accepted!',
    body: `${params.senderName} accepted your carry offer. Once payment is reserved, pickup OTP will be generated.`,
    type: 'request_accepted',
    category: 'matching',
    priority: 'high',
    relatedId: params.requestId,
    deepLink: '/(tabs)/requests',
    channels: ['in_app', 'push', 'email'],
    data: { idempotency_key: `req_acc_${params.requestId}` },
  });
}

/**
 * Notifies traveller that their carry offer was declined.
 */
export async function notifyOfferDeclined(params: {
  travellerId: string;
  senderId?: string;
  senderName: string;
  requestId: string;
}) {
  return notificationService.send({
    recipient: params.travellerId,
    senderId: params.senderId,
    title: '❌ Offer Declined',
    body: `${params.senderName} was unable to accept your carry offer.`,
    type: 'request_rejected',
    category: 'matching',
    priority: 'normal',
    relatedId: params.requestId,
    deepLink: '/(tabs)/requests',
    channels: ['in_app', 'push'],
    data: { idempotency_key: `req_rej_${params.requestId}` },
  });
}

/**
 * Notifies sender when traveller confirms pickup.
 */
export async function notifyPickupConfirmed(params: {
  senderId: string;
  travellerId?: string;
  travellerName: string;
  deliveryId: string;
}) {
  return notificationService.send({
    recipient: params.senderId,
    senderId: params.travellerId,
    title: '🚗 Parcel Picked Up & In Transit!',
    body: `${params.travellerName} verified pickup. Your parcel is now safely en route to destination.`,
    type: 'delivery_pickup',
    category: 'parcel_update',
    priority: 'high',
    relatedId: params.deliveryId,
    deepLink: `/delivery/${params.deliveryId}`,
    channels: ['in_app', 'push', 'sms'],
    data: { idempotency_key: `del_pickup_${params.deliveryId}` },
  });
}

/**
 * Notifies sender when delivery is completed.
 */
export async function notifyDeliveryCompleted(params: {
  senderId: string;
  travellerId?: string;
  travellerName: string;
  deliveryId: string;
}) {
  return notificationService.send({
    recipient: params.senderId,
    senderId: params.travellerId,
    title: '🎉 Delivery Confirmed!',
    body: `${params.travellerName} successfully delivered your parcel! Please rate your experience.`,
    type: 'delivery_confirmed',
    category: 'parcel_update',
    priority: 'high',
    relatedId: params.deliveryId,
    deepLink: `/delivery/${params.deliveryId}`,
    channels: ['in_app', 'push', 'email', 'sms'],
    data: { idempotency_key: `del_comp_${params.deliveryId}` },
  });
}

/**
 * Notifies user with their pickup OTP.
 */
export async function notifyPickupOtpReady(params: {
  recipientId: string;
  otp: string;
  deliveryId: string;
  travellerName?: string;
}) {
  return notificationService.send({
    recipient: params.recipientId,
    title: '🔑 Pickup OTP Ready',
    body: `Your pickup verification code is ready. Share it ONLY with ${params.travellerName || 'your traveller'} upon meeting. Check SMS for code.`,
    type: 'delivery_otp',
    category: 'parcel_update',
    priority: 'critical',
    relatedId: params.deliveryId,
    deepLink: `/delivery/${params.deliveryId}`,
    channels: ['in_app', 'push', 'sms'],
    smsOptions: {
      otp: params.otp,
      message: `Your CarryGo Pickup OTP is ${params.otp}. Share only with your traveller during parcel handover.`,
    },
    data: { idempotency_key: `pickup_otp_${params.deliveryId}` },
  });
}

/**
 * Notifies recipient with their delivery OTP.
 */
export async function notifyDeliveryOtpReady(params: {
  recipientId: string;
  otp: string;
  deliveryId: string;
  travellerName?: string;
}) {
  return notificationService.send({
    recipient: params.recipientId,
    title: '🔐 Delivery Completion OTP',
    body: `Your delivery completion code is ready. Provide it to ${params.travellerName || 'your traveller'} after inspecting parcel. Check SMS for code.`,
    type: 'delivery_otp',
    category: 'parcel_update',
    priority: 'critical',
    relatedId: params.deliveryId,
    deepLink: `/delivery/${params.deliveryId}`,
    channels: ['in_app', 'push', 'sms'],
    smsOptions: {
      otp: params.otp,
      message: `Your CarryGo Delivery OTP is ${params.otp}. Share with traveller only after receiving your package.`,
    },
    data: { idempotency_key: `delivery_otp_${params.deliveryId}` },
  });
}

/**
 * Notifies sender of trip milestone / progress updates.
 */
export async function notifyTripMilestone(params: {
  senderId: string;
  travellerId?: string;
  milestoneText: string;
  deliveryId: string;
}) {
  return notificationService.send({
    recipient: params.senderId,
    senderId: params.travellerId,
    title: '📍 Delivery Progress Update',
    body: params.milestoneText,
    type: 'trip_milestone',
    category: 'trip_update',
    priority: 'high',
    relatedId: params.deliveryId,
    deepLink: `/delivery/${params.deliveryId}`,
    channels: ['in_app', 'push'],
    data: { idempotency_key: `trip_milestone_${params.deliveryId}_${Date.now()}` },
  });
}

/**
 * Notifies user that payment is safely locked and reserved for booking.
 */
export async function notifyPaymentLocked(params: {
  userId: string;
  senderId?: string;
  amount: number;
  deliveryOrRequestId: string;
  isTraveller?: boolean;
}) {
  const title = params.isTraveller ? '🔒 Payment Booked & Secured' : '🔒 Payment Reserved';
  const body = params.isTraveller
    ? `Sender payment of ₹${params.amount} has been secured in CaryGoo Booking. Safe to proceed with pickup!`
    : `Your payment of ₹${params.amount} is securely booked until you confirm delivery.`;

  return notificationService.send({
    recipient: params.userId,
    senderId: params.senderId,
    title,
    body,
    type: 'payment_locked',
    category: 'payment',
    priority: 'high',
    relatedId: params.deliveryOrRequestId,
    deepLink: '/my-activity?tab=transactions',
    channels: ['in_app', 'push', 'email'],
    data: { idempotency_key: `pay_lock_${params.isTraveller ? 'trav' : 'send'}_${params.deliveryOrRequestId}` },
  });
}

/**
 * Notifies user of a new rating.
 */
export async function notifyRatingReceived(params: {
  toUserId: string;
  fromUserId?: string;
  fromName: string;
  rating: number;
  requestId: string;
}) {
  const stars = '⭐'.repeat(Math.min(params.rating, 5));
  return notificationService.send({
    recipient: params.toUserId,
    senderId: params.fromUserId,
    title: `${stars} New Rating Received!`,
    body: `${params.fromName} rated you ${params.rating}/5 stars. Tap to see your updated profile.`,
    type: 'rating',
    category: 'general',
    priority: 'normal',
    relatedId: params.requestId,
    deepLink: '/(tabs)/profile',
    channels: ['in_app', 'push'],
    data: { idempotency_key: `rating_${params.requestId}` },
  });
}
export async function notifyPaymentReserved(params: {
  recipientId: string;
  senderId?: string;
  amount: number;
  requestId: string;
}) {
  return notificationService.send({
    recipient: params.recipientId,
    senderId: params.senderId,
    title: '🔒 Payment Safely Reserved',
    body: `₹${params.amount} is securely held until delivery confirmation. Pickup code is now active.`,
    type: 'payment_reserved',
    category: 'payment',
    priority: 'high',
    relatedId: params.requestId,
    deepLink: '/(tabs)/requests',
    channels: ['in_app', 'push', 'email'],
    data: { idempotency_key: `pay_reserved_${params.requestId}` },
  });
}

/**
 * Notifies traveller when payment payout is released.
 */
export async function notifyPayoutReleased(params: {
  travellerId: string;
  amount: number;
  deliveryId: string;
}) {
  return notificationService.send({
    recipient: params.travellerId,
    title: '💰 Payout Released!',
    body: `₹${params.amount} has been released to your account for completing the delivery!`,
    type: 'payment_released',
    category: 'payment',
    priority: 'high',
    relatedId: params.deliveryId,
    deepLink: '/transactions',
    channels: ['in_app', 'push', 'email'],
    data: { idempotency_key: `pay_rel_${params.deliveryId}` },
  });
}

/**
 * Notifies user of an incoming chat message.
 */
export async function notifyChatMessage(params: {
  recipientId: string;
  senderId?: string;
  senderName: string;
  text: string;
  conversationId: string;
}) {
  const preview = params.text.length > 80 ? params.text.substring(0, 77) + '...' : params.text;
  return notificationService.send({
    recipient: params.recipientId,
    senderId: params.senderId,
    title: `💬 ${params.senderName}`,
    body: preview,
    type: 'chat_message',
    category: 'message',
    priority: 'high',
    relatedId: params.conversationId,
    deepLink: `/chat/${params.conversationId}`,
    channels: ['in_app', 'push'],
    data: { idempotency_key: `chat_msg_${params.conversationId}_${Date.now()}` },
  });
}
