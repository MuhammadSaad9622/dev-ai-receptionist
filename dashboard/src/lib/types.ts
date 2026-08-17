// Mirrors backend/prisma/schema.prisma. Kept as plain types (not a shared
// package yet) since the two apps deploy independently — see
// ARCHITECTURE.md "Deployment model". Revisit as a shared package once
// there's a monorepo tool in place.

export type BusinessType = "HVAC" | "PLUMBING" | "HVAC_AND_PLUMBING";
export type UserRole = "OWNER" | "ADMIN" | "TECHNICIAN";
export type Channel = "VOICE" | "SMS";
export type Direction = "INBOUND" | "OUTBOUND";
export type VoiceProvider = "RETELL" | "VAPI" | "GEMINI_LIVE";

export type TriageCategory =
  | "EMERGENCY"
  | "ROUTINE_SCHEDULING"
  | "QUOTE_FOLLOW_UP"
  | "OUT_OF_SCOPE"
  | "RETENTION"
  | "UNCLASSIFIED";

export type InteractionStatus =
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ESCALATED"
  | "FAILED";

export type QuoteStatus =
  | "OPEN"
  | "FOLLOWING_UP"
  | "WON"
  | "LOST"
  | "EXPIRED";

export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type EmergencyAlertStatus = "PENDING" | "ACKED" | "ESCALATED" | "RESOLVED";

export interface Customer {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  lastInteractionAt: string | null;
  lastJobCompletedAt: string | null;
}

export interface CustomerSummary {
  id: string;
  name: string | null;
  phone: string;
}

export interface Interaction {
  id: string;
  customer: CustomerSummary | null;
  channel: Channel;
  direction: Direction;
  provider: string;
  fromNumber: string;
  toNumber: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  transcript: string | null;
  recordingUrl: string | null;
  recordingConsentGiven: boolean | null;
  triageCategory: TriageCategory;
  triageReasoning: string | null;
  status: InteractionStatus;
  createdAt: string;
}

export interface Quote {
  id: string;
  customer: CustomerSummary;
  description: string;
  amountCents: number | null;
  status: QuoteStatus;
  expiresAt: string | null;
  createdAt: string;
}

export interface Appointment {
  id: string;
  customer: CustomerSummary & { address: string | null };
  jobType: string | null;
  technicianName: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  status: AppointmentStatus;
  crmProvider: string | null;
}

export interface EmergencyAlert {
  id: string;
  status: EmergencyAlertStatus;
  createdAt: string;
  ackedAt: string | null;
  interaction: Interaction & { customer: Customer | null };
}

export interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  onDuty: boolean;
}

export interface OrganizationSettings {
  emergencyAckTimeoutSeconds: number;
  quoteFollowUpOffsetsDays: number[];
  quoteExpiresAfterDays: number;
  retentionCadenceMonths: number;
  recordingDisclosureScript: string;
}

export interface Organization {
  id: string;
  name: string;
  businessType: BusinessType;
  timezone: string;
  twilioPhoneNumber: string | null;
  voiceProvider: VoiceProvider;
  settings: OrganizationSettings | null;
  crmIntegration: { provider: string; status: string; lastSyncAt: string | null } | null;
}
