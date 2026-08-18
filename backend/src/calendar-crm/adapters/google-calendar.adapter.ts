import { Logger } from '@nestjs/common';
import {
  AvailabilityWindow,
  BookAppointmentInput,
  BookAppointmentResult,
  CalendarCrmAdapter,
  CheckAvailabilityInput,
} from '../calendar-crm-adapter.interface';

export interface GoogleCalendarCredentials {
  refreshToken: string;
  calendarId: string; // usually the owner's primary calendar
}

// Fallback for clients without a dedicated field-service CRM, and the
// simplest v1 target to demo the full triage → booking flow end-to-end
// before a client's ServiceTitan/Housecall Pro/Jobber access is approved.
// Implementation uses the `googleapis` package's calendar.freebusy.query
// and calendar.events.insert — add `pnpm add googleapis` when wiring this in.
export class GoogleCalendarAdapter implements CalendarCrmAdapter {
  readonly provider = 'GOOGLE_CALENDAR' as const;
  private readonly logger = new Logger(GoogleCalendarAdapter.name);

  constructor(private readonly credentials: GoogleCalendarCredentials) {}

  checkAvailability(
    input: CheckAvailabilityInput,
  ): Promise<AvailabilityWindow[]> {
    this.logger.debug(
      `checkAvailability(${JSON.stringify(input)}) — not yet wired`,
    );
    return Promise.reject(
      new Error('GoogleCalendarAdapter.checkAvailability not implemented'),
    );
  }

  bookAppointment(input: BookAppointmentInput): Promise<BookAppointmentResult> {
    this.logger.debug(
      `bookAppointment(${JSON.stringify(input)}) — not yet wired`,
    );
    return Promise.reject(
      new Error('GoogleCalendarAdapter.bookAppointment not implemented'),
    );
  }

  cancelAppointment(crmExternalId: string): Promise<void> {
    this.logger.debug(`cancelAppointment(${crmExternalId}) — not yet wired`);
    return Promise.reject(
      new Error('GoogleCalendarAdapter.cancelAppointment not implemented'),
    );
  }

  healthCheck(): Promise<{ ok: boolean; error?: string }> {
    return Promise.resolve({
      ok: false,
      error: 'Google Calendar adapter not yet connected',
    });
  }
}
