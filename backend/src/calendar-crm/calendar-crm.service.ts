import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CrmProvider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialsCryptoService } from '../common/crypto/credentials-crypto.service';
import { CalendarCrmAdapter } from './calendar-crm-adapter.interface';
import {
  ServiceTitanAdapter,
  ServiceTitanCredentials,
} from './adapters/servicetitan.adapter';
import {
  HousecallProAdapter,
  HousecallProCredentials,
} from './adapters/housecall-pro.adapter';
import { JobberAdapter, JobberCredentials } from './adapters/jobber.adapter';
import {
  GoogleCalendarAdapter,
  GoogleCalendarCredentials,
} from './adapters/google-calendar.adapter';

// Resolves + caches the right CalendarCrmAdapter per org, so triage/booking
// code just calls `calendarCrmService.forOrg(orgId)` and never touches
// provider-specific classes or credential decryption itself.
@Injectable()
export class CalendarCrmService {
  private readonly logger = new Logger(CalendarCrmService.name);
  private readonly adapterCache = new Map<string, CalendarCrmAdapter>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CredentialsCryptoService,
  ) {}

  async forOrg(organizationId: string): Promise<CalendarCrmAdapter> {
    const cached = this.adapterCache.get(organizationId);
    if (cached) return cached;

    const integration = await this.prisma.crmIntegration.findUnique({
      where: { organizationId },
    });

    if (!integration) {
      throw new NotFoundException(
        `Organization ${organizationId} has no connected CRM/calendar integration`,
      );
    }

    const credentials = this.crypto.decrypt(integration.encryptedCredentials);
    const adapter = this.buildAdapter(integration.provider, credentials);
    this.adapterCache.set(organizationId, adapter);
    return adapter;
  }

  /** Call after credentials are rotated/reconnected via the dashboard. */
  invalidateCache(organizationId: string): void {
    this.adapterCache.delete(organizationId);
  }

  // Credentials come back from CredentialsCryptoService.decrypt() as an
  // untyped blob (whatever JSON was encrypted at connect-time) — each branch
  // asserts the shape its own adapter expects rather than reaching for `any`.
  private buildAdapter(
    provider: CrmProvider,
    credentials: Record<string, unknown>,
  ): CalendarCrmAdapter {
    switch (provider) {
      case 'SERVICETITAN':
        return new ServiceTitanAdapter(
          credentials as unknown as ServiceTitanCredentials,
        );
      case 'HOUSECALL_PRO':
        return new HousecallProAdapter(
          credentials as unknown as HousecallProCredentials,
        );
      case 'JOBBER':
        return new JobberAdapter(credentials as unknown as JobberCredentials);
      case 'GOOGLE_CALENDAR':
        return new GoogleCalendarAdapter(
          credentials as unknown as GoogleCalendarCredentials,
        );
      default:
        throw new Error(`Unsupported CRM provider: ${String(provider)}`);
    }
  }
}
