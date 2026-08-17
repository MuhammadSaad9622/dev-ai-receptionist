import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EmergencyAlertStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MessagingService } from '../messaging/messaging.service';
import { EMERGENCY_ESCALATION_QUEUE } from './alerts.constants';

export interface EscalationChainEntry {
  userId: string;
  channels: Array<'PUSH' | 'SMS' | 'VOICE'>;
}

// PRD §7: true emergencies must reach a human immediately — push/SMS,
// escalating to an outbound phone call — and cannot depend on the owner
// having the dashboard open. This service owns that whole lifecycle.
@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly messaging: MessagingService,
    @InjectQueue(EMERGENCY_ESCALATION_QUEUE)
    private readonly escalationQueue: Queue,
  ) {}

  /** Called by the triage engine the moment tag_emergency fires, from either channel. */
  async triggerEmergencyAlert(
    organizationId: string,
    interactionId: string,
  ): Promise<void> {
    const settings = await this.prisma.organizationSettings.findUniqueOrThrow({
      where: { organizationId },
    });

    const alert = await this.prisma.emergencyAlert.create({
      data: {
        organizationId,
        interactionId,
        status: EmergencyAlertStatus.PENDING,
      },
    });

    await this.notifyTier(organizationId, alert.id, 0);

    const job = await this.escalationQueue.add(
      'check-ack',
      { alertId: alert.id, tier: 0 },
      { delay: settings.emergencyAckTimeoutSeconds * 1000 },
    );

    await this.prisma.emergencyAlert.update({
      where: { id: alert.id },
      data: { scheduledEscalationJobId: job.id },
    });
  }

  /** Sends push+SMS (and voice for the final tier) to one entry in the
   * escalation chain, and records the attempt for the dashboard timeline. */
  async notifyTier(
    organizationId: string,
    alertId: string,
    tier: number,
  ): Promise<void> {
    const settings = await this.prisma.organizationSettings.findUniqueOrThrow({
      where: { organizationId },
    });
    const chain =
      settings.emergencyEscalationChain as unknown as EscalationChainEntry[];
    const entry = chain[tier];
    if (!entry) {
      this.logger.warn(
        `Emergency alert ${alertId}: escalation chain exhausted with no ack`,
      );
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: entry.userId },
    });
    if (!user) return;

    if (entry.channels.includes('PUSH')) {
      const tokens = await this.prisma.pushSubscription.findMany({
        where: { userId: user.id },
      });
      await this.notifications.sendPush(
        tokens.map((t) => t.fcmToken),
        {
          title: 'EMERGENCY call',
          body: 'A caller reported a true emergency — tap to view.',
        },
      );
    }
    if (entry.channels.includes('SMS') && user.phone) {
      await this.messaging.sendSms({
        organizationId,
        customerId: '', // internal alert, not a customer-facing send — see note below
        toNumber: user.phone,
        body: `EMERGENCY: a caller needs immediate attention. Open the dashboard now.`,
        isMarketing: false,
      });
    }
    if (entry.channels.includes('VOICE') && user.phone) {
      await this.messaging.placeVoiceCall(
        user.phone,
        `${process.env.APP_URL}/twiml/emergency-alert`,
      );
    }

    await this.prisma.emergencyAlert.update({
      where: { id: alertId },
      data: {
        status: EmergencyAlertStatus.ESCALATED,
        notificationAttempts: {
          push: [{ tier, userId: user.id, at: new Date().toISOString() }],
        },
      },
    });
  }

  async ackAlert(
    organizationId: string,
    alertId: string,
    userId: string,
  ): Promise<void> {
    const alert = await this.prisma.emergencyAlert.findFirstOrThrow({
      where: { id: alertId, organizationId }, // scoped so acking a cross-tenant alert 404s instead of leaking/clobbering
    });
    if (alert.scheduledEscalationJobId) {
      const job = await this.escalationQueue.getJob(
        alert.scheduledEscalationJobId,
      );
      await job?.remove().catch(() => undefined);
    }
    await this.prisma.emergencyAlert.update({
      where: { id: alertId },
      data: {
        status: EmergencyAlertStatus.ACKED,
        ackedById: userId,
        ackedAt: new Date(),
      },
    });
  }
}
