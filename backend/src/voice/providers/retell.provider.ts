import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Organization, OrganizationSettings } from '@prisma/client';
import {
  VoiceCallEndedEvent,
  VoiceFunctionCallEvent,
  VoiceProviderAdapter,
} from '../voice-provider.interface';
import { TriageToolName } from '../../triage/triage.types';
import { buildTriageSystemPrompt } from '../../triage/triage.prompt';
import { TRIAGE_TOOL_SCHEMAS } from '../../triage/triage.types';

// Retell AI: managed telephony + STT + LLM + TTS + transfer-to-human
// (PRD §2 Option B). Webhook shapes below follow Retell's documented
// `call_started` / `call_ended` / custom function-call events — confirm
// exact field names against the live Retell webhook payload before
// go-live; this adapter is the only place that needs to change if they do.
@Injectable()
export class RetellProvider implements VoiceProviderAdapter {
  readonly provider = 'RETELL' as const;
  private readonly logger = new Logger(RetellProvider.name);

  constructor(private readonly config: ConfigService) {}

  syncAgentConfig(
    org: Organization,
    settings: OrganizationSettings,
  ): Promise<void> {
    // PATCH https://api.retellai.com/update-agent/{agent_id}
    // body: { general_prompt: buildTriageSystemPrompt(org, settings), general_tools: [...] }
    this.logger.debug(
      `syncAgentConfig(${org.id}) — not yet wired to Retell API`,
    );
    void buildTriageSystemPrompt(org, settings);
    void TRIAGE_TOOL_SCHEMAS;
    return Promise.resolve();
  }

  isFunctionCallEvent(rawPayload: unknown): boolean {
    const p = rawPayload as { event?: string };
    return p?.event === 'function_call';
  }

  parseFunctionCallEvent(rawPayload: unknown): VoiceFunctionCallEvent {
    const p = rawPayload as {
      call: { call_id: string; from_number: string; to_number: string };
      name: string;
      args: Record<string, unknown>;
    };
    return {
      providerCallId: p.call.call_id,
      toolName: p.name as TriageToolName,
      args: p.args,
      fromNumber: p.call.from_number,
      toNumber: p.call.to_number,
    };
  }

  isCallEndedEvent(rawPayload: unknown): boolean {
    const p = rawPayload as { event?: string };
    return p?.event === 'call_ended';
  }

  parseCallEndedEvent(rawPayload: unknown): VoiceCallEndedEvent {
    const p = rawPayload as {
      call: {
        call_id: string;
        transcript?: string;
        recording_url?: string;
        duration_ms?: number;
        opt_in_recording?: boolean;
      };
    };
    return {
      providerCallId: p.call.call_id,
      transcript: p.call.transcript,
      recordingUrl: p.call.recording_url,
      durationSeconds: p.call.duration_ms
        ? Math.round(p.call.duration_ms / 1000)
        : undefined,
      recordingConsentGiven: p.call.opt_in_recording,
    };
  }

  buildToolResponse(result: unknown): unknown {
    return { response: result };
  }

  verifyWebhookSignature(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): boolean {
    if (!signatureHeader) return false;
    const secret = this.config.getOrThrow<string>('RETELL_WEBHOOK_SECRET');
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
