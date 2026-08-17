// Every CRM has its own auth model, rate limits, and data shape (PRD §10).
// This interface is the seam: triage/booking logic (and the dashboard API)
// only ever talk to CalendarCrmAdapter, never to ServiceTitan/Housecall
// Pro/Jobber/Google Calendar directly. Swapping or adding a provider means
// implementing this interface — nothing upstream changes.

export interface AvailabilityWindow {
  start: Date;
  end: Date;
  technicianName?: string;
}

export interface CheckAvailabilityInput {
  jobType: string;
  preferredDate?: Date;
  durationMinutes?: number;
}

export interface BookAppointmentInput {
  customerName?: string;
  customerPhone: string;
  address?: string;
  jobType: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  notes?: string;
}

export interface BookAppointmentResult {
  crmExternalId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  technicianName?: string;
}

export interface CalendarCrmAdapter {
  readonly provider:
    'SERVICETITAN' | 'HOUSECALL_PRO' | 'JOBBER' | 'GOOGLE_CALENDAR';

  checkAvailability(
    input: CheckAvailabilityInput,
  ): Promise<AvailabilityWindow[]>;
  bookAppointment(input: BookAppointmentInput): Promise<BookAppointmentResult>;
  cancelAppointment(crmExternalId: string): Promise<void>;
  /** Lightweight credential/connection check surfaced on the dashboard's integration status. */
  healthCheck(): Promise<{ ok: boolean; error?: string }>;
}
