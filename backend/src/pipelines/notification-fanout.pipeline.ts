import { eventDispatcher } from '../workers/event-dispatcher';
import { DomainEvent } from '../lib/queue';

export interface FanoutStats {
  receivedCount: number;
  routedSms: number;
  routedEmail: number;
  routedPush: number;
  failedRoutes: number;
}

/**
 * Enterprise Notification Fanout Pipeline:
 * Processes high-throughput streams of domain events (up to millions per day)
 * and safely delegates them to dedicated, horizontally scalable worker queues.
 */
export class NotificationFanoutPipeline {
  private stats: FanoutStats = {
    receivedCount: 0,
    routedSms: 0,
    routedEmail: 0,
    routedPush: 0,
    failedRoutes: 0,
  };

  public getStats(): FanoutStats {
    return { ...this.stats };
  }

  public resetStats(): void {
    this.stats = {
      receivedCount: 0,
      routedSms: 0,
      routedEmail: 0,
      routedPush: 0,
      failedRoutes: 0,
    };
  }

  public async processEvent(event: DomainEvent): Promise<{
    success: boolean;
    sms: boolean;
    email: boolean;
    push: boolean;
  }> {
    this.stats.receivedCount++;

    try {
      const result = await eventDispatcher.handleDomainEvent(event);
      if (result.smsDispatched) this.stats.routedSms++;
      if (result.emailDispatched) this.stats.routedEmail++;
      if (result.pushDispatched) this.stats.routedPush++;

      return {
        success: true,
        sms: result.smsDispatched,
        email: result.emailDispatched,
        push: result.pushDispatched,
      };
    } catch (err) {
      this.stats.failedRoutes++;
      console.error('[NotificationFanoutPipeline:Error]', { topic: event.topic, err });
      return { success: false, sms: false, email: false, push: false };
    }
  }

  public async processBatch(events: DomainEvent[]): Promise<FanoutStats> {
    for (const event of events) {
      await this.processEvent(event);
    }
    return this.getStats();
  }
}

export const notificationFanoutPipeline = new NotificationFanoutPipeline();
