import { Logger } from '@nestjs/common';
import {
  AvailabilityWindow,
  BookAppointmentInput,
  BookAppointmentResult,
  CalendarCrmAdapter,
  CheckAvailabilityInput,
} from '../calendar-crm-adapter.interface';

export interface JobberCredentials {
  accessToken: string;
  refreshToken: string;
}

// Jobber exposes a GraphQL API (api.getjobber.com) with standard OAuth2 —
// wire via their app-marketplace listing per client.
export class JobberAdapter implements CalendarCrmAdapter {
  readonly provider = 'JOBBER' as const;
  private readonly logger = new Logger(JobberAdapter.name);

  constructor(private readonly credentials: JobberCredentials) {}

  checkAvailability(
    input: CheckAvailabilityInput,
  ): Promise<AvailabilityWindow[]> {
    this.logger.debug(
      `checkAvailability(${JSON.stringify(input)}) — not yet wired`,
    );
    return Promise.reject(
      new Error('JobberAdapter.checkAvailability not implemented'),
    );
  }

  bookAppointment(input: BookAppointmentInput): Promise<BookAppointmentResult> {
    this.logger.debug(
      `bookAppointment(${JSON.stringify(input)}) — not yet wired`,
    );
    return Promise.reject(
      new Error('JobberAdapter.bookAppointment not implemented'),
    );
  }

  cancelAppointment(crmExternalId: string): Promise<void> {
    this.logger.debug(`cancelAppointment(${crmExternalId}) — not yet wired`);
    return Promise.reject(
      new Error('JobberAdapter.cancelAppointment not implemented'),
    );
  }

  healthCheck(): Promise<{ ok: boolean; error?: string }> {
    return Promise.resolve({
      ok: false,
      error: 'Jobber adapter not yet connected',
    });
  }
}
