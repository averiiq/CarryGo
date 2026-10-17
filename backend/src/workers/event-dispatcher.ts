import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DomainEvent } from '../lib/queue';
import { SmsNotificationPayload, EmailNotificationPayload, PushNotificationPayload } from './types';
import { config } from '../config';

export interface DispatcherQueues {
  smsQueueUrl?: string;
  emailQueueUrl?: string;
  pushQueueUrl?: string;
}

/**
 * Enterprise Event Dispatcher:
 * Decouples core business domain events from worker microservices.
 * Transforms domain events into specialized worker envelopes and places them
 * into their respective dedicated queues (SMS, Email, Push) with DLQ fallback.
 */
export class EventDispatcher {
  private sqs: SQSClient;
  private queues: DispatcherQueues;

  constructor(queues?: DispatcherQueues) {
    this.sqs = new SQSClient({ maxAttempts: 3 });
    this.queues = queues ?? {
      smsQueueUrl: (config as Record<string, unknown>).smsQueueUrl as string | undefined,
      emailQueueUrl: (config as Record<string, unknown>).emailQueueUrl as string | undefined,
      pushQueueUrl: (config as Record<string, unknown>).pushQueueUrl as string | undefined,
    };
  }

  public setQueues(queues: DispatcherQueues): void {
    this.queues = queues;
  }

  private async sendToQueue(queueUrl: string | undefined, body: unknown): Promise<boolean> {
    if (!queueUrl) {
      if (process.env.NODE_ENV !== 'test') {
        console.log('[EventDispatcher:MockQueue]', body);
      }
      return true;
    }

    try {
      await this.sqs.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(body),
        }),
      );
      return true;
    } catch (err) {
      console.error('[EventDispatcher:QueueError]', { queueUrl, err });
      return false;
    }
  }

  public async dispatchSms(payload: SmsNotificationPayload): Promise<boolean> {
    return await this.sendToQueue(this.queues.smsQueueUrl, payload);
  }

  public async dispatchEmail(payload: EmailNotificationPayload): Promise<boolean> {
    return await this.sendToQueue(this.queues.emailQueueUrl, payload);
  }

  public async dispatchPush(payload: PushNotificationPayload): Promise<boolean> {
    return await this.sendToQueue(this.queues.pushQueueUrl, payload);
  }

  /**
   * Fan-out router: maps a domain event into the appropriate SMS, Email, and Push notifications.
   */
  public async handleDomainEvent(event: DomainEvent): Promise<{
    smsDispatched: boolean;
    emailDispatched: boolean;
    pushDispatched: boolean;
  }> {
    let smsDispatched = false;
    let emailDispatched = false;
    let pushDispatched = false;

    const payload = event.payload as Record<string, unknown>;

    switch (event.topic) {
      case 'trip.created': {
        // Broadcast push notification to interested parcel senders along the route
        if (payload.matchedTokens && Array.isArray(payload.matchedTokens)) {
          pushDispatched = await this.dispatchPush({
            toToken: payload.matchedTokens as string[],
            title: 'New Trip on Your Route! 🚗',
            body: `A verified traveler is traveling from ${payload.fromCity} to ${payload.toCity}.`,
            data: { tripId: event.entityId, type: 'TRIP_MATCH' },
          });
        }
        break;
      }

      case 'request.created': {
        // Push to traveler immediately
        if (payload.travellerPushToken && typeof payload.travellerPushToken === 'string') {
          pushDispatched = await this.dispatchPush({
            toToken: payload.travellerPushToken,
            title: 'New Delivery Request! 📦',
            body: `You received a request of ₹${payload.price} for your trip.`,
            data: { requestId: event.entityId },
          });
        }
        // SMS alert if traveler opted into SMS notifications
        if (payload.travellerPhone && typeof payload.travellerPhone === 'string') {
          smsDispatched = await this.dispatchSms({
            toPhoneNumber: payload.travellerPhone,
            messageText: `CarryGo: New delivery request received for ₹${payload.price}. Check app to accept.`,
          });
        }
        break;
      }

      case 'booking.escrow_locked': {
        // Sender gets an email invoice / escrow receipt
        if (payload.senderEmail && typeof payload.senderEmail === 'string') {
          emailDispatched = await this.dispatchEmail({
            toEmail: payload.senderEmail,
            subject: 'CarryGo - Payment Secured in Escrow',
            template: 'ESCROW_HELD',
            variables: {
              requestId: event.entityId,
              amount: payload.amount,
            },
          });
        }
        // Traveler gets push alert that funds are secured
        if (payload.travellerPushToken && typeof payload.travellerPushToken === 'string') {
          pushDispatched = await this.dispatchPush({
            toToken: payload.travellerPushToken,
            title: 'Escrow Locked! 🔒',
            body: `Sender payment of ₹${payload.amount} has been secured. Ready for pickup.`,
            data: { requestId: event.entityId },
          });
        }
        break;
      }

      case 'delivery.completed': {
        // Email receipt to sender and traveler
        if (payload.senderEmail && typeof payload.senderEmail === 'string') {
          emailDispatched = await this.dispatchEmail({
            toEmail: payload.senderEmail,
            subject: 'CarryGo - Parcel Successfully Delivered',
            template: 'GENERIC',
            variables: {
              message: `Your parcel #${event.entityId} was successfully delivered. Thank you for using CarryGo!`,
            },
          });
        }
        // Traveler gets escrow payout notification
        if (payload.travellerEmail && typeof payload.travellerEmail === 'string') {
          await this.dispatchEmail({
            toEmail: payload.travellerEmail,
            subject: 'CarryGo - Payout Released to Your Wallet',
            template: 'ESCROW_RELEASED',
            variables: {
              parcelId: event.entityId,
              payoutAmount: payload.payoutAmount,
            },
          });
        }
        // SMS OTP confirmation
        if (payload.senderPhone && typeof payload.senderPhone === 'string') {
          smsDispatched = await this.dispatchSms({
            toPhoneNumber: payload.senderPhone,
            messageText: `CarryGo: Parcel #${event.entityId} has been successfully delivered.`,
          });
        }
        break;
      }

      default:
        break;
    }

    return { smsDispatched, emailDispatched, pushDispatched };
  }
}

export const eventDispatcher = new EventDispatcher();
