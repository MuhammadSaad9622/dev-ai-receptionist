import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { validateRequest } from 'twilio';
import { PrismaService } from '../prisma/prisma.service';
import { TriageService } from '../triage/triage.service';
import { ConsentService } from '../messaging/consent.service';
import { TelephonyCredentialsService } from '../messaging/telephony-credentials.service';

interface TwilioInboundSmsBody {
  From: string;
  To: string;
  Body: string;
}

const STOP_KEYWORDS = new Set([
  'STOP',
  'STOPALL',
  'UNSUBSCRIBE',
  'CANCEL',
  'END',
  'QUIT',
]);

@Controller('webhooks/sms')
export class TwilioSmsWebhookController {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly triage: TriageService,
    private readonly consent: ConsentService,
    private readonly telephony: TelephonyCredentialsService,
  ) {}

  @Post('twilio')
  async handle(
    @Body() body: TwilioInboundSmsBody,
    @Headers('x-twilio-signature') signature: string,
    @Res() res: Response,
  ) {
    // Org is per-Twilio-account (each client brings their own), so which
    // auth token verifies this request depends on which org's number it
    // was sent to — that has to be resolved BEFORE signature verification,
    // not after. `To` is public request data, safe to use for routing
    // ahead of auth; the actual signature check still gates everything
    // that follows.
    const org = await this.prisma.organization.findFirst({
      where: { twilioPhoneNumber: body.To },
    });
    if (!org) {
      throw new BadRequestException(
        `No organization found for number ${body.To}`,
      );
    }

    const { authToken } = await this.telephony.forOrg(org.id);
    const url = `${this.config.getOrThrow('APP_URL')}/webhooks/sms/twilio`;
    const valid = validateRequest(authToken, signature, url, body);
    if (!valid) throw new BadRequestException('Invalid Twilio signature');

    // TCPA/carrier STOP handling — enforced here regardless of what the
    // triage model would have said, per PRD §10.
    const normalized = body.Body.trim().toUpperCase();
    if (STOP_KEYWORDS.has(normalized)) {
      const customer = await this.prisma.customer.upsert({
        where: {
          organizationId_phone: { organizationId: org.id, phone: body.From },
        },
        create: { organizationId: org.id, phone: body.From },
        update: {},
      });
      await this.consent.recordSmsOptOut(org.id, customer.id);
      res.type('text/xml').send('<Response></Response>'); // Twilio Advanced Opt-Out already sends the confirmation text
      return;
    }

    const { replyBody } = await this.triage.handleInboundSms({
      organizationId: org.id,
      fromNumber: body.From,
      toNumber: body.To,
      body: body.Body,
    });

    res
      .type('text/xml')
      .send(`<Response><Message>${escapeXml(replyBody)}</Message></Response>`);
  }
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
