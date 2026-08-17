import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  FollowUpStatus,
  FollowUpStepStatus,
  FollowUpType,
  QuoteStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FOLLOW_UP_QUEUE } from './follow-up.constants';

// Feature 3 (quote follow-up): day 2/5/10 nudges after an open quote.
// Feature 4 (retention): periodic rebooking outreach after a completed job.
// Both are modeled as a FollowUpSequence + ordered FollowUpStep rows, each
// step scheduled as its own BullMQ delayed job so any step can be
// individually cancelled the moment the customer books, replies, or opts out.
@Injectable()
export class FollowUpService {
  private readonly logger = new Logger(FollowUpService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(FOLLOW_UP_QUEUE) private readonly queue: Queue,
  ) {}

  async startQuoteFollowUpSequence(quoteId: string): Promise<void> {
    const quote = await this.prisma.quote.findUniqueOrThrow({
      where: { id: quoteId },
    });
    const settings = await this.prisma.organizationSettings.findUniqueOrThrow({
      where: { organizationId: quote.organizationId },
    });

    const sequence = await this.prisma.followUpSequence.create({
      data: {
        organizationId: quote.organizationId,
        type: FollowUpType.QUOTE_FOLLOW_UP,
        customerId: quote.customerId,
        quoteId: quote.id,
        status: FollowUpStatus.ACTIVE,
        nextStepAt: this.addDays(
          new Date(),
          settings.quoteFollowUpOffsetsDays[0],
        ),
      },
    });

    await this.scheduleSteps(
      sequence.id,
      quote.organizationId,
      settings.quoteFollowUpOffsetsDays,
      (day) =>
        `Hi — following up on the estimate we sent ${day} day(s) ago. Any questions, or want to get it on the schedule? Reply STOP to opt out.`,
    );
  }

  /** Run daily: find customers whose last completed job crossed the
   * retention cadence and who don't already have an active retention
   * sequence, then start one. */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async runRetentionSweep(): Promise<void> {
    const orgs = await this.prisma.organization.findMany({
      include: { settings: true },
    });

    for (const org of orgs) {
      if (!org.settings) continue;
      const cutoff = this.addMonths(
        new Date(),
        -org.settings.retentionCadenceMonths,
      );

      const candidates = await this.prisma.customer.findMany({
        where: {
          organizationId: org.id,
          lastJobCompletedAt: { lte: cutoff },
          followUpSequences: {
            none: {
              type: FollowUpType.RETENTION,
              status: FollowUpStatus.ACTIVE,
            },
          },
        },
      });

      for (const customer of candidates) {
        await this.startRetentionSequence(customer.id, org.id);
      }
    }
  }

  async startRetentionSequence(
    customerId: string,
    organizationId: string,
  ): Promise<void> {
    const sequence = await this.prisma.followUpSequence.create({
      data: {
        organizationId,
        type: FollowUpType.RETENTION,
        customerId,
        status: FollowUpStatus.ACTIVE,
        nextStepAt: new Date(),
      },
    });

    await this.scheduleSteps(
      sequence.id,
      organizationId,
      [0],
      () =>
        `Hi from your HVAC/plumbing team — it's been a while since your last service. Want us to get you back on the schedule for a checkup? Reply STOP to opt out.`,
    );
  }

  /** Cancel every still-pending step (customer booked, replied, or opted out mid-sequence). */
  async cancelSequence(sequenceId: string): Promise<void> {
    const steps = await this.prisma.followUpStep.findMany({
      where: { sequenceId, status: FollowUpStepStatus.PENDING },
    });
    for (const step of steps) {
      if (step.scheduledJobId) {
        const job = await this.queue.getJob(step.scheduledJobId);
        await job?.remove().catch(() => undefined);
      }
    }
    await this.prisma.$transaction([
      this.prisma.followUpStep.updateMany({
        where: { sequenceId, status: FollowUpStepStatus.PENDING },
        data: { status: FollowUpStepStatus.SKIPPED_OPTED_OUT },
      }),
      this.prisma.followUpSequence.update({
        where: { id: sequenceId },
        data: { status: FollowUpStatus.CANCELLED },
      }),
    ]);
  }

  /** Daily sweep: quotes past their expiry with no conversion become EXPIRED
   * (the "cold-lead marking" job called out in PRD §3's scheduler row). */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async markExpiredQuotes(): Promise<void> {
    await this.prisma.quote.updateMany({
      where: {
        status: { in: [QuoteStatus.OPEN, QuoteStatus.FOLLOWING_UP] },
        expiresAt: { lte: new Date() },
      },
      data: { status: QuoteStatus.EXPIRED },
    });
  }

  private async scheduleSteps(
    sequenceId: string,
    organizationId: string,
    offsetsDays: number[],
    messageFor: (day: number, stepNumber: number) => string,
  ): Promise<void> {
    for (const [index, offsetDays] of offsetsDays.entries()) {
      const stepNumber = index + 1;
      const scheduledFor = this.addDays(new Date(), offsetDays);
      const messageBody = messageFor(offsetDays, stepNumber);

      const step = await this.prisma.followUpStep.create({
        data: { sequenceId, stepNumber, scheduledFor, messageBody },
      });

      const job = await this.queue.add(
        'send-step',
        { stepId: step.id },
        { delay: Math.max(0, scheduledFor.getTime() - Date.now()) },
      );

      await this.prisma.followUpStep.update({
        where: { id: step.id },
        data: { scheduledJobId: job.id },
      });
    }
  }

  private addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  private addMonths(date: Date, months: number): Date {
    const copy = new Date(date);
    copy.setMonth(copy.getMonth() + months);
    return copy;
  }
}
