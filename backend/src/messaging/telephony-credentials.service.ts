import { Injectable, NotFoundException } from '@nestjs/common';
import { Twilio } from 'twilio';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialsCryptoService } from '../common/crypto/credentials-crypto.service';

interface TwilioCredentials {
  accountSid: string;
  authToken: string;
}

interface ResolvedTelephony extends TwilioCredentials {
  client: Twilio;
}

// Resolves + caches a Twilio client per org, exactly like
// CalendarCrmService.forOrg() does for CRM adapters. Each org connects and
// pays for their own Twilio account (their own number, their own usage
// credits) — this must never fall back to a shared/global credential, or
// one client's calls/texts would run (and bill) against another's account.
@Injectable()
export class TelephonyCredentialsService {
  private readonly cache = new Map<string, ResolvedTelephony>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CredentialsCryptoService,
  ) {}

  async forOrg(organizationId: string): Promise<ResolvedTelephony> {
    const cached = this.cache.get(organizationId);
    if (cached) return cached;

    const integration = await this.prisma.telephonyIntegration.findUnique({
      where: { organizationId },
    });
    if (!integration) {
      throw new NotFoundException(
        `Organization ${organizationId} has no connected Twilio account`,
      );
    }

    const { accountSid, authToken } = this.crypto.decrypt<TwilioCredentials>(
      integration.encryptedCredentials,
    );
    const resolved: ResolvedTelephony = {
      accountSid,
      authToken,
      client: new Twilio(accountSid, authToken),
    };
    this.cache.set(organizationId, resolved);
    return resolved;
  }

  /** Call after credentials are reconnected/rotated via the dashboard. */
  invalidateCache(organizationId: string): void {
    this.cache.delete(organizationId);
  }
}
