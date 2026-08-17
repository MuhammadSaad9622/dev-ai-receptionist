import { TriageToolName } from '../triage/triage.types';
import { Organization, OrganizationSettings } from '@prisma/client';

// The seam between "voice AI vendor" and everything else. PRD §2's whole
// point is that this choice (Retell/Vapi today, Gemini Live + Twilio later
// for cost-sensitive clients) should be swappable without touching triage,
// scheduling, or follow-up logic — this interface is where that boundary
// lives. Every provider adapter normalizes its own webhook/event shape into
// these three calls.

export interface VoiceFunctionCallEvent {
  providerCallId: string;
  toolName: TriageToolName;
  args: Record<string, unknown>;
  fromNumber: string;
  toNumber: string;
}

export interface VoiceCallEndedEvent {
  providerCallId: string;
  transcript?: string;
  recordingUrl?: string;
  durationSeconds?: number;
  recordingConsentGiven?: boolean;
}

export interface VoiceProviderAdapter {
  readonly provider: 'RETELL' | 'VAPI' | 'GEMINI_LIVE';

  /** Push the shared triage system prompt + tool schemas to the provider's
   * agent config (Retell/Vapi's dashboard-managed agent, or a Gemini Live
   * session template) — called whenever OrganizationSettings changes. */
  syncAgentConfig(
    org: Organization,
    settings: OrganizationSettings,
  ): Promise<void>;

  /** True if `rawPayload` is a function-call webhook event for this provider. */
  isFunctionCallEvent(rawPayload: unknown): boolean;
  parseFunctionCallEvent(rawPayload: unknown): VoiceFunctionCallEvent;

  /** True if `rawPayload` is a call-ended webhook event for this provider. */
  isCallEndedEvent(rawPayload: unknown): boolean;
  parseCallEndedEvent(rawPayload: unknown): VoiceCallEndedEvent;

  /** Provider-specific shape for the synchronous response to a function-call
   * webhook (what the agent says/does next). */
  buildToolResponse(result: unknown): unknown;

  /** Verifies the webhook signature header against the raw request body. */
  verifyWebhookSignature(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): boolean;
}
