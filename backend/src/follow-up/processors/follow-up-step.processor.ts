import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { FollowUpStatus, FollowUpStepStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MessagingService } from '../../messaging/messaging.service';
import { FOLLOW_UP_QUEUE } from '../follow-up.constants';

interface SendStepJobData {
  stepId: string;
}

@Processor(FOLLOW_UP_QUEUE)
export class FollowUpStepProcessor extends WorkerHost {
  private readonly logger = new Logger(FollowUpStepProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
  ) {
    super();
  }

  async process(job: Job<SendStepJobData>): Promise<void> {
    const step = await this.prisma.followUpStep.findUnique({
      where: { id: job.data.stepId },
      include: { sequence: { include: { customer: true } } },
    });
    if (!step || step.status !== FollowUpStepStatus.PENDING) return; // cancelled/opted out since scheduling

    const { sequence } = step;

    const result = await this.messaging.sendSms({
      organizationId: sequence.organizationId,
      customerId: sequence.customerId,
      toNumber: sequence.customer.phone,
      body: step.messageBody ?? 'Following up on your service request.',
      isMarketing: true, // enforces opt-out check per PRD §10
    });

    await this.prisma.followUpStep.update({
      where: { id: step.id },
      data: {
        status: result.sent
          ? FollowUpStepStatus.SENT
          : FollowUpStepStatus.SKIPPED_OPTED_OUT,
        sentAt: result.sent ? new Date() : undefined,
      },
    });

    const remaining = await this.prisma.followUpStep.count({
      where: { sequenceId: sequence.id, status: FollowUpStepStatus.PENDING },
    });
    if (remaining === 0) {
      await this.prisma.followUpSequence.update({
        where: { id: sequence.id },
        data: { status: FollowUpStatus.COMPLETED },
      });
    }
  }
}
