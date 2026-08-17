import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { EmergencyAlertStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from '../alerts.service';
import { EMERGENCY_ESCALATION_QUEUE } from '../alerts.constants';

interface CheckAckJobData {
  alertId: string;
  tier: number;
}

// Fires emergencyAckTimeoutSeconds after each notification tier. If nobody
// has acked yet, escalates to the next tier in OrganizationSettings
// .emergencyEscalationChain (e.g. owner push+SMS -> owner voice call ->
// backup technician). Stops once acked, resolved, or the chain runs out.
@Processor(EMERGENCY_ESCALATION_QUEUE)
export class EmergencyEscalationProcessor extends WorkerHost {
  private readonly logger = new Logger(EmergencyEscalationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    @InjectQueue(EMERGENCY_ESCALATION_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async process(job: Job<CheckAckJobData>): Promise<void> {
    const { alertId, tier } = job.data;

    const alert = await this.prisma.emergencyAlert.findUnique({
      where: { id: alertId },
    });
    if (
      !alert ||
      alert.status === EmergencyAlertStatus.ACKED ||
      alert.status === EmergencyAlertStatus.RESOLVED
    ) {
      return; // already handled — nothing to escalate
    }

    const nextTier = tier + 1;
    await this.alerts.notifyTier(alert.organizationId, alertId, nextTier);

    const settings = await this.prisma.organizationSettings.findUniqueOrThrow({
      where: { organizationId: alert.organizationId },
    });
    const chain = settings.emergencyEscalationChain as unknown as unknown[];
    if (nextTier < chain.length - 1) {
      await this.queue.add(
        'check-ack',
        { alertId, tier: nextTier },
        { delay: settings.emergencyAckTimeoutSeconds * 1000 },
      );
    } else {
      this.logger.error(
        `Emergency alert ${alertId} exhausted escalation chain without an ack`,
      );
    }
  }
}
