import { Logger } from '@nestjs/common';
import {
  AvailabilityWindow,
  BookAppointmentInput,
  BookAppointmentResult,
  CalendarCrmAdapter,
  CheckAvailabilityInput,
} from '../calendar-crm-adapter.interface';

export interface ServiceTitanCredentials {
  tenantId: string;
  accessToken: string;
  refreshToken: string;
}

// ServiceTitan requires a signed partner/integration agreement before API
// access is granted (PRD §10) — validate this per client before quoting a
// timeline. Endpoints below follow ServiceTitan's JPM (Job/Project
// Management) + Dispatch v2 API; fill in once partner access is live.
export class ServiceTitanAdapter implements CalendarCrmAdapter {
  readonly provider = 'SERVICETITAN' as const;
  private readonly logger = new Logger(ServiceTitanAdapter.name);

  constructor(private readonly credentials: ServiceTitanCredentials) {}

  checkAvailability(
    input: CheckAvailabilityInput,
  ): Promise<AvailabilityWindow[]> {
    // GET /dispatch/v2/tenant/{tenantId}/capacity
    this.logger.debug(
      `checkAvailability(${JSON.stringify(input)}) — not yet wired`,
    );
    return Promise.reject(
      new Error(
        'ServiceTitanAdapter.checkAvailability not implemented — pending partner API access',
      ),
    );
  }

  bookAppointment(input: BookAppointmentInput): Promise<BookAppointmentResult> {
    // POST /jpm/v2/tenant/{tenantId}/jobs
    this.logger.debug(
      `bookAppointment(${JSON.stringify(input)}) — not yet wired`,
    );
    return Promise.reject(
      new Error(
        'ServiceTitanAdapter.bookAppointment not implemented — pending partner API access',
      ),
    );
  }

  cancelAppointment(crmExternalId: string): Promise<void> {
    this.logger.debug(`cancelAppointment(${crmExternalId}) — not yet wired`);
    return Promise.reject(
      new Error(
        'ServiceTitanAdapter.cancelAppointment not implemented — pending partner API access',
      ),
    );
  }

  healthCheck(): Promise<{ ok: boolean; error?: string }> {
    return Promise.resolve({
      ok: false,
      error: 'ServiceTitan adapter not yet connected',
    });
  }
}
