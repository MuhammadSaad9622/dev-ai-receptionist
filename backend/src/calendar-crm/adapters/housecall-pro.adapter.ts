import { Logger } from '@nestjs/common';
import {
  AvailabilityWindow,
  BookAppointmentInput,
  BookAppointmentResult,
  CalendarCrmAdapter,
  CheckAvailabilityInput,
} from '../calendar-crm-adapter.interface';

export interface HousecallProCredentials {
  apiKey: string;
}

// Housecall Pro's public API (api.housecallpro.com) uses a simpler API-key
// model than ServiceTitan — no partner agreement gate, which makes it a
// good first real integration to wire end-to-end.
export class HousecallProAdapter implements CalendarCrmAdapter {
  readonly provider = 'HOUSECALL_PRO' as const;
  private readonly logger = new Logger(HousecallProAdapter.name);

  constructor(private readonly credentials: HousecallProCredentials) {}

  checkAvailability(
    input: CheckAvailabilityInput,
  ): Promise<AvailabilityWindow[]> {
    // GET /jobs/availability — see Housecall Pro API docs
    this.logger.debug(
      `checkAvailability(${JSON.stringify(input)}) — not yet wired`,
    );
    return Promise.reject(
      new Error('HousecallProAdapter.checkAvailability not implemented'),
    );
  }

  bookAppointment(input: BookAppointmentInput): Promise<BookAppointmentResult> {
    // POST /jobs
    this.logger.debug(
      `bookAppointment(${JSON.stringify(input)}) — not yet wired`,
    );
    return Promise.reject(
      new Error('HousecallProAdapter.bookAppointment not implemented'),
    );
  }

  cancelAppointment(crmExternalId: string): Promise<void> {
    this.logger.debug(`cancelAppointment(${crmExternalId}) — not yet wired`);
    return Promise.reject(
      new Error('HousecallProAdapter.cancelAppointment not implemented'),
    );
  }

  healthCheck(): Promise<{ ok: boolean; error?: string }> {
    return Promise.resolve({
      ok: false,
      error: 'Housecall Pro adapter not yet connected',
    });
  }
}
