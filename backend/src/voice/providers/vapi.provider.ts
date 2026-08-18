import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Organization, OrganizationSettings } from '@prisma/client';
import {
  VoiceCallEndedEvent,
  VoiceFunctionCallEvent,
  VoiceOption,
  VoiceProviderAdapter,
} from '../voice-provider.interface';
import { TriageToolName } from '../../triage/triage.types';
import { buildTriageSystemPrompt } from '../../triage/triage.prompt';

// Vapi: more developer-configurable than Retell, bring-your-own-LLM
// (PRD §2 Option B alternative). Webhook shapes follow Vapi's
// `server-message` events (`type: "function-call"` / `"end-of-call-report"`)
// — confirm against the live payload before go-live.
@Injectable()
export class VapiProvider implements VoiceProviderAdapter {
  readonly provider = 'VAPI' as const;
  private readonly logger = new Logger(VapiProvider.name);

  constructor(private readonly config: ConfigService) {}

  syncAgentConfig(
    org: Organization,
    settings: OrganizationSettings,
  ): Promise<void> {
    // PATCH https://api.vapi.ai/assistant/{assistant_id}
    // body: { model: { systemPrompt: buildTriageSystemPrompt(org, settings), functions: [...] } }
    this.logger.debug(`syncAgentConfig(${org.id}) — not yet wired to Vapi API`);
    void buildTriageSystemPrompt(org, settings);
    return Promise.resolve();
  }

  isFunctionCallEvent(rawPayload: unknown): boolean {
    const p = rawPayload as { message?: { type?: string } };
    return p?.message?.type === 'function-call';
  }

  parseFunctionCallEvent(rawPayload: unknown): VoiceFunctionCallEvent {
    const p = rawPayload as {
      message: {
        call: {
          id: string;
          customer?: { number?: string };
          phoneNumber?: { number?: string };
        };
        functionCall: { name: string; parameters: Record<string, unknown> };
      };
    };
    return {
      providerCallId: p.message.call.id,
      toolName: p.message.functionCall.name as TriageToolName,
      args: p.message.functionCall.parameters,
      fromNumber: p.message.call.customer?.number ?? '',
      toNumber: p.message.call.phoneNumber?.number ?? '',
    };
  }

  isCallEndedEvent(rawPayload: unknown): boolean {
    const p = rawPayload as { message?: { type?: string } };
    return p?.message?.type === 'end-of-call-report';
  }

  parseCallEndedEvent(rawPayload: unknown): VoiceCallEndedEvent {
    const p = rawPayload as {
      message: {
        call: { id: string };
        transcript?: string;
        recordingUrl?: string;
        durationSeconds?: number;
      };
    };
    return {
      providerCallId: p.message.call.id,
      transcript: p.message.transcript,
      recordingUrl: p.message.recordingUrl,
      durationSeconds: p.message.durationSeconds,
      recordingConsentGiven: undefined, // Vapi doesn't natively track this — captured via our own disclosure tool call instead
    };
  }

  buildToolResponse(result: unknown): unknown {
    return { result };
  }

  listVoices(): Promise<VoiceOption[]> {
    // Vapi supports several voice providers (11labs, playht, etc.) with
    // their own list-voice endpoints — not implemented yet, Retell is the
    // active provider for now. Empty list, not a throw: the dashboard
    // treats "no voices" as "nothing to pick from," not an error state.
    return Promise.resolve([]);
  }

  verifyWebhookSignature(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): boolean {
    if (!signatureHeader) return false;
    const secret = this.config.getOrThrow<string>('VAPI_WEBHOOK_SECRET');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      return timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(signatureHeader),
      );
    } catch {
      return false;
    }
  }
}
