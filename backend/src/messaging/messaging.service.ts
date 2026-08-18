import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsentService } from './consent.service';
import { TelephonyCredentialsService } from './telephony-credentials.service';

export interface SendSmsInput {
  organizationId: string;
  customerId: string;
  toNumber: string;
  body: string;
  /** Transactional messages (booking confirmations, "tech on the way") are
   * exempt from the marketing opt-out — only marketing/follow-up/retention
   * sends are blocked by STOP. Set true for those. */
  isMarketing: boolean;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telephony: TelephonyCredentialsService,
    private readonly consent: ConsentService,
  ) {}

  async sendSms(
    input: SendSmsInput,
  ): Promise<{ sent: boolean; sid?: string; skippedReason?: string }> {
    if (input.isMarketing) {
      const optedOut = await this.consent.isOptedOutOfMarketing(
        input.organizationId,
        input.customerId,
      );
      if (optedOut) {
        this.logger.log(
          `Skipping SMS to opted-out customer ${input.customerId}`,
        );
        return { sent: false, skippedReason: 'OPTED_OUT' };
      }
    }

    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: input.organizationId },
      select: { twilioPhoneNumber: true },
    });
    if (!org.twilioPhoneNumber) {
      throw new Error(
        `Organization ${input.organizationId} has no connected phone number yet`,
      );
    }

    const { client } = await this.telephony.forOrg(input.organizationId);
    const message = await client.messages.create({
      to: input.toNumber,
      from: org.twilioPhoneNumber,
      body: input.body,
      // NOTE: A2P 10DLC campaign registration (required for sustained US
      // SMS volume) happens in each org's own Twilio console, not here —
      // out of scope for this service, which only sends via their number.
    });

    return { sent: true, sid: message.sid };
  }

  /** Outbound emergency-escalation voice call to an owner/technician who
   * hasn't acked a push/SMS alert in time (see alerts/processors). */
  async placeVoiceCall(
    organizationId: string,
    toNumber: string,
    twimlUrl: string,
  ): Promise<{ sid: string }> {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { twilioPhoneNumber: true },
    });
    if (!org.twilioPhoneNumber) {
      throw new Error(
        `Organization ${organizationId} has no connected phone number yet`,
      );
    }

    const { client } = await this.telephony.forOrg(organizationId);
    const call = await client.calls.create({
      to: toNumber,
      from: org.twilioPhoneNumber,
      url: twimlUrl,
    });
    return { sid: call.sid };
  }
}
