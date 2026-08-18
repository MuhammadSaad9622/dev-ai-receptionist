import { Injectable } from '@nestjs/common';
import { ConsentStatus, ConsentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// PRD §10: "Consent/opt-out for follow-up sequences must be enforced at the
// messaging layer, not just prompted for in the agent's language." Every
// outbound SMS send (MessagingService.sendSms) calls
// isOptedOutOfMarketing() first — there is no code path that skips this.
@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async isOptedOutOfMarketing(
    organizationId: string,
    customerId: string,
  ): Promise<boolean> {
    const latest = await this.prisma.consentRecord.findFirst({
      where: { organizationId, customerId, type: ConsentType.SMS_MARKETING },
      orderBy: { recordedAt: 'desc' },
    });
    return latest?.status === ConsentStatus.OPTED_OUT;
  }

  /** Called from the Twilio inbound-SMS webhook when the carrier/Twilio's
   * advanced opt-out doesn't already intercept a STOP keyword upstream. */
  async recordSmsOptOut(
    organizationId: string,
    customerId: string,
  ): Promise<void> {
    await this.prisma.consentRecord.create({
      data: {
        organizationId,
        customerId,
        type: ConsentType.SMS_MARKETING,
        status: ConsentStatus.OPTED_OUT,
        source: 'sms_stop_keyword',
      },
    });
  }

  async recordSmsOptIn(
    organizationId: string,
    customerId: string,
    source: string,
  ): Promise<void> {
    await this.prisma.consentRecord.create({
      data: {
        organizationId,
        customerId,
        type: ConsentType.SMS_MARKETING,
        status: ConsentStatus.GRANTED,
        source,
      },
    });
  }

  async recordCallRecordingConsent(
    organizationId: string,
    customerId: string,
    granted: boolean,
  ): Promise<void> {
    await this.prisma.consentRecord.create({
      data: {
        organizationId,
        customerId,
        type: ConsentType.CALL_RECORDING,
        status: granted ? ConsentStatus.GRANTED : ConsentStatus.DENIED,
        source: 'voice_disclosure',
      },
    });
  }
}
