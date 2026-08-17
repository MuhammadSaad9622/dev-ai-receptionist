import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { ConsentService } from './consent.service';

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
  private readonly client: Twilio;
  private readonly messagingServiceSid: string;

  constructor(
    private readonly config: ConfigService,
    private readonly consent: ConsentService,
  ) {
    this.client = new Twilio(
      this.config.getOrThrow('TWILIO_ACCOUNT_SID'),
      this.config.getOrThrow('TWILIO_AUTH_TOKEN'),
    );
    this.messagingServiceSid = this.config.get(
      'TWILIO_MESSAGING_SERVICE_SID',
      '',
    );
  }

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

    const message = await this.client.messages.create({
      to: input.toNumber,
      body: input.body,
      ...(this.messagingServiceSid
        ? { messagingServiceSid: this.messagingServiceSid }
        : { from: this.config.getOrThrow('TWILIO_PHONE_NUMBER') }),
    });

    return { sent: true, sid: message.sid };
  }

  /** Outbound emergency-escalation voice call to an owner/technician who
   * hasn't acked a push/SMS alert in time (see alerts/processors). */
  async placeVoiceCall(
    toNumber: string,
    twimlUrl: string,
  ): Promise<{ sid: string }> {
    const call = await this.client.calls.create({
      to: toNumber,
      from: this.config.getOrThrow('TWILIO_PHONE_NUMBER'),
      url: twimlUrl,
    });
    return { sid: call.sid };
  }
}
