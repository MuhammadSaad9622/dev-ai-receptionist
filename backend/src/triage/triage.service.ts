import { Injectable, Logger } from '@nestjs/common';
import {
  Channel,
  Direction,
  InteractionStatus,
  QuoteStatus,
  TriageCategory,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarCrmService } from '../calendar-crm/calendar-crm.service';
import { AlertsService } from '../alerts/alerts.service';
import { FollowUpService } from '../follow-up/follow-up.service';
import { GeminiTextClient } from './gemini-text.client';
import { buildTriageSystemPrompt } from './triage.prompt';
import { argToString, TriageToolName } from './triage.types';

export interface ToolCallContext {
  organizationId: string;
  interactionId: string;
  customerId: string;
}

// The convergence point for both channels: the voice provider's webhook
// (after Retell/Vapi/Gemini Live reports a function call) and the SMS
// pipeline (after Gemini text triage picks a tool) both end up calling
// handleToolCall() with the same tool name/args shape. This is what makes
// "identical triage rules" (PRD Feature 1) an enforced fact, not a
// convention two separate code paths have to remember to honor.
@Injectable()
export class TriageService {
  private readonly logger = new Logger(TriageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calendarCrm: CalendarCrmService,
    private readonly alerts: AlertsService,
    private readonly followUp: FollowUpService,
    private readonly gemini: GeminiTextClient,
  ) {}

  // ── SMS entry point ──────────────────────────────────────────────────

  async handleInboundSms(input: {
    organizationId: string;
    fromNumber: string;
    toNumber: string;
    body: string;
  }): Promise<{ replyBody: string }> {
    const customer = await this.prisma.customer.upsert({
      where: {
        organizationId_phone: {
          organizationId: input.organizationId,
          phone: input.fromNumber,
        },
      },
      create: { organizationId: input.organizationId, phone: input.fromNumber },
      update: { lastInteractionAt: new Date() },
    });

    const interaction = await this.prisma.interaction.create({
      data: {
        organizationId: input.organizationId,
        customerId: customer.id,
        channel: Channel.SMS,
        direction: Direction.INBOUND,
        provider: 'TWILIO_SMS',
        fromNumber: input.fromNumber,
        toNumber: input.toNumber,
        transcript: input.body,
      },
    });

    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: input.organizationId },
      include: { settings: true },
    });
    if (!org.settings) {
      throw new Error(`Organization ${org.id} has no OrganizationSettings row`);
    }

    try {
      const result = await this.gemini.classify(
        buildTriageSystemPrompt(org, org.settings),
        input.body,
      );

      await this.handleToolCall(
        {
          organizationId: org.id,
          interactionId: interaction.id,
          customerId: customer.id,
        },
        result.toolName,
        result.args,
      );

      return {
        replyBody:
          result.assistantReply ||
          'Thanks — we got your message and will follow up shortly.',
      };
    } catch (error) {
      this.logger.error(
        `SMS triage failed for interaction ${interaction.id}`,
        error as Error,
      );
      await this.prisma.interaction.update({
        where: { id: interaction.id },
        data: { status: InteractionStatus.FAILED },
      });
      // Fail open toward a human, never toward silence — an ungraded SMS
      // still gets a reply telling the customer a person will follow up.
      return {
        replyBody:
          'Thanks for reaching out — a team member will follow up with you shortly.',
      };
    }
  }

  // ── Shared tool-call handler (voice webhook + SMS path both call this) ─

  async handleToolCall(
    ctx: ToolCallContext,
    toolName: TriageToolName,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    switch (toolName) {
      case 'check_availability':
        return this.handleCheckAvailability(ctx, args);
      case 'book_appointment':
        return this.handleBookAppointment(ctx, args);
      case 'tag_emergency':
        return this.handleTagEmergency(ctx, args);
      case 'create_quote':
        return this.handleCreateQuote(ctx, args);
      case 'log_out_of_scope':
        return this.handleLogOutOfScope(ctx, args);
      default:
        this.logger.warn(`Unknown triage tool call: ${String(toolName)}`);
        return { ok: false, error: 'Unknown tool' };
    }
  }

  private async handleCheckAvailability(
    ctx: ToolCallContext,
    args: Record<string, unknown>,
  ) {
    const adapter = await this.calendarCrm.forOrg(ctx.organizationId);
    const windows = await adapter.checkAvailability({
      jobType: argToString(args.jobType, 'service call'),
      preferredDate: args.preferredDate
        ? new Date(argToString(args.preferredDate))
        : undefined,
    });
    return { windows };
  }

  private async handleBookAppointment(
    ctx: ToolCallContext,
    args: Record<string, unknown>,
  ) {
    const adapter = await this.calendarCrm.forOrg(ctx.organizationId);
    const scheduledStart = new Date(argToString(args.scheduledStart));
    const scheduledEnd = new Date(argToString(args.scheduledEnd));

    const booking = await adapter.bookAppointment({
      customerName: args.customerName
        ? argToString(args.customerName)
        : undefined,
      customerPhone: argToString(args.customerPhone),
      address: args.address ? argToString(args.address) : undefined,
      jobType: argToString(args.jobType, 'service call'),
      scheduledStart,
      scheduledEnd,
    });

    await this.prisma.$transaction([
      this.prisma.appointment.create({
        data: {
          organizationId: ctx.organizationId,
          customerId: ctx.customerId,
          interactionId: ctx.interactionId,
          crmProvider: adapter.provider,
          crmExternalId: booking.crmExternalId,
          jobType: argToString(args.jobType, 'service call'),
          technicianName: booking.technicianName,
          scheduledStart: booking.scheduledStart,
          scheduledEnd: booking.scheduledEnd,
        },
      }),
      this.prisma.interaction.update({
        where: { id: ctx.interactionId },
        data: {
          triageCategory: TriageCategory.ROUTINE_SCHEDULING,
          status: InteractionStatus.COMPLETED,
        },
      }),
    ]);

    return { ok: true, booking };
  }

  private async handleTagEmergency(
    ctx: ToolCallContext,
    args: Record<string, unknown>,
  ) {
    await this.prisma.interaction.update({
      where: { id: ctx.interactionId },
      data: {
        triageCategory: TriageCategory.EMERGENCY,
        triageReasoning: args.reasoning
          ? argToString(args.reasoning)
          : undefined,
        triageEntities: {
          urgencySignals: args.urgencySignals ?? [],
          address: args.address ?? null,
        },
        status: InteractionStatus.ESCALATED,
      },
    });

    await this.alerts.triggerEmergencyAlert(
      ctx.organizationId,
      ctx.interactionId,
    );
    return { ok: true, escalated: true };
  }

  private async handleCreateQuote(
    ctx: ToolCallContext,
    args: Record<string, unknown>,
  ) {
    const settings = await this.prisma.organizationSettings.findUniqueOrThrow({
      where: { organizationId: ctx.organizationId },
    });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + settings.quoteExpiresAfterDays);

    const quote = await this.prisma.quote.create({
      data: {
        organizationId: ctx.organizationId,
        customerId: ctx.customerId,
        interactionId: ctx.interactionId,
        description: argToString(args.description, 'Estimate requested'),
        amountCents: args.amountCents ? Number(args.amountCents) : undefined,
        status: QuoteStatus.OPEN,
        expiresAt,
      },
    });

    await this.prisma.interaction.update({
      where: { id: ctx.interactionId },
      data: {
        triageCategory: TriageCategory.QUOTE_FOLLOW_UP,
        status: InteractionStatus.COMPLETED,
      },
    });

    await this.followUp.startQuoteFollowUpSequence(quote.id);
    return { ok: true, quoteId: quote.id };
  }

  private async handleLogOutOfScope(
    ctx: ToolCallContext,
    args: Record<string, unknown>,
  ) {
    await this.prisma.interaction.update({
      where: { id: ctx.interactionId },
      data: {
        triageCategory: TriageCategory.OUT_OF_SCOPE,
        triageReasoning: args.reasoning
          ? argToString(args.reasoning)
          : undefined,
        status: InteractionStatus.COMPLETED,
      },
    });
    return { ok: true };
  }
}
