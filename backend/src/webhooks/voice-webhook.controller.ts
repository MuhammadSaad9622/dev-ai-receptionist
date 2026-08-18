import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { VoiceProvider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VoiceProviderFactory } from '../voice/voice-provider.factory';
import { TriageService } from '../triage/triage.service';
import { Channel, Direction, InteractionStatus } from '@prisma/client';

// One endpoint per provider, e.g. POST /webhooks/voice/retell,
// POST /webhooks/voice/vapi. The org is resolved from the dialed number
// (toNumber) on function-call events, and from the stored Interaction on
// call-ended events — never trusted from the payload's org-identifying
// fields alone, since these endpoints are public and only protected by the
// provider's webhook signature.
@Controller('webhooks/voice')
export class VoiceWebhookController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly voiceProviders: VoiceProviderFactory,
    private readonly triage: TriageService,
  ) {}

  @Post(':provider')
  async handle(
    @Param('provider') providerParam: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
    @Body() body: unknown,
  ) {
    const provider = providerParam.toUpperCase() as VoiceProvider;
    const adapter = this.voiceProviders.get(provider);

    const signatureHeader =
      headers['x-retell-signature'] ?? headers['x-vapi-signature'];
    if (
      !req.rawBody ||
      !adapter.verifyWebhookSignature(req.rawBody, signatureHeader)
    ) {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (adapter.isFunctionCallEvent(body)) {
      const event = adapter.parseFunctionCallEvent(body);

      const org = await this.prisma.organization.findFirst({
        where: { twilioPhoneNumber: event.toNumber },
      });
      if (!org)
        throw new BadRequestException(
          `No organization found for number ${event.toNumber}`,
        );

      const customer = await this.prisma.customer.upsert({
        where: {
          organizationId_phone: {
            organizationId: org.id,
            phone: event.fromNumber,
          },
        },
        create: { organizationId: org.id, phone: event.fromNumber },
        update: { lastInteractionAt: new Date() },
      });

      const interaction = await this.prisma.interaction.upsert({
        where: { providerCallId: event.providerCallId },
        create: {
          organizationId: org.id,
          customerId: customer.id,
          channel: Channel.VOICE,
          direction: Direction.INBOUND,
          provider,
          providerCallId: event.providerCallId,
          fromNumber: event.fromNumber,
          toNumber: event.toNumber,
        },
        update: {},
      });

      const result = await this.triage.handleToolCall(
        {
          organizationId: org.id,
          interactionId: interaction.id,
          customerId: customer.id,
        },
        event.toolName,
        event.args,
      );

      return adapter.buildToolResponse(result);
    }

    if (adapter.isCallEndedEvent(body)) {
      const event = adapter.parseCallEndedEvent(body);
      await this.prisma.interaction.updateMany({
        where: { providerCallId: event.providerCallId },
        data: {
          transcript: event.transcript,
          recordingUrl: event.recordingUrl,
          durationSeconds: event.durationSeconds,
          recordingConsentGiven: event.recordingConsentGiven,
          endedAt: new Date(),
          status: InteractionStatus.COMPLETED,
        },
      });
      return { ok: true };
    }

    // Unrecognized event type for this provider (e.g. call_started, a
    // status ping) — ack 200 so the provider doesn't retry, do nothing else.
    return { ok: true };
  }
}
