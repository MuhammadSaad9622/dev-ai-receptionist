import { Injectable, Logger } from '@nestjs/common';
import { Organization, OrganizationSettings } from '@prisma/client';
import {
  VoiceCallEndedEvent,
  VoiceFunctionCallEvent,
  VoiceProviderAdapter,
} from '../voice-provider.interface';
import { buildTriageSystemPrompt } from '../../triage/triage.prompt';

// Option A (PRD §2): Gemini Live API + a self-owned Twilio Media Streams
// bridge. Deliberately NOT built in this pass — flagged as the Phase 2
// migration path once Option B's handoff/reliability patterns are proven.
//
// Structural note: unlike Retell/Vapi, Gemini Live is a persistent
// bidirectional WebSocket session, not a request/response webhook. A real
// implementation needs a separate long-lived gateway (e.g. a
// `voice/gemini-live.gateway.ts` WS server accepting Twilio's Media Streams
// connection, forwarding audio frames to the Gemini Live session, and
// calling TriageService.handleToolCall() directly in-process when the model
// invokes a tool) — it will not arrive as an HTTP POST the way
// isFunctionCallEvent/parseFunctionCallEvent below assume. Those two methods
// exist only so this class satisfies VoiceProviderAdapter for uniform
// config/admin tooling (e.g. "which providers are available to this org");
// they are not on the real Gemini Live call path and intentionally throw.
@Injectable()
export class GeminiLiveProvider implements VoiceProviderAdapter {
  readonly provider = 'GEMINI_LIVE' as const;
  private readonly logger = new Logger(GeminiLiveProvider.name);

  syncAgentConfig(
    org: Organization,
    settings: OrganizationSettings,
  ): Promise<void> {
    // The Gemini Live equivalent of "agent config" is the session's
    // systemInstruction + FunctionDeclaration[], sent when the bridge opens
    // a new Live session per call — not a persisted remote agent, so this
    // is a no-op today. Kept here so the bridge (once built) has one place
    // to pull the canonical prompt from.
    this.logger.debug(
      `syncAgentConfig(${org.id}) — no persisted agent; prompt applied per-session by the bridge`,
    );
    void buildTriageSystemPrompt(org, settings);
    return Promise.resolve();
  }

  isFunctionCallEvent(): boolean {
    return false; // see class doc — not a webhook path
  }

  parseFunctionCallEvent(): VoiceFunctionCallEvent {
    throw new Error(
      'GeminiLiveProvider has no webhook path; the Media Streams bridge calls TriageService directly.',
    );
  }

  isCallEndedEvent(): boolean {
    return false;
  }

  parseCallEndedEvent(): VoiceCallEndedEvent {
    throw new Error(
      'GeminiLiveProvider has no webhook path; the Media Streams bridge calls TriageService directly.',
    );
  }

  buildToolResponse(result: unknown): unknown {
    return result;
  }

  verifyWebhookSignature(): boolean {
    return false;
  }
}
