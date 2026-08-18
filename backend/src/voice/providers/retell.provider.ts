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
import { TriageToolName, TRIAGE_TOOL_SCHEMAS } from '../../triage/triage.types';
import { buildTriageSystemPrompt } from '../../triage/triage.prompt';
import { PrismaService } from '../../prisma/prisma.service';

const RETELL_API_BASE = 'https://api.retellai.com';

interface SharedToolSchema {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Retell AI: managed telephony + STT + LLM + TTS + transfer-to-human
// (PRD §2 Option B). Every field/endpoint shape below was verified against
// the live docs at docs.retellai.com on 2026-08-18 (not trusted from
// training-data memory) — see inline citations. Two things this got wrong
// in an earlier pass, worth flagging since they're easy to get wrong again:
//  1. Custom-function webhooks hit each tool's own `url` with a bare
//     {name, call, args} body — there is NO `event` field, unlike the
//     account-level call_started/call_ended/call_analyzed webhook.
//  2. The webhook signature is HMAC-SHA256(rawBody + timestamp, API_KEY) —
//     signed with the API key itself, not a separate webhook secret, and
//     the header is `v={timestamp_ms},d={hex}`, not a bare hex digest.
@Injectable()
export class RetellProvider implements VoiceProviderAdapter {
  readonly provider = 'RETELL' as const;
  private readonly logger = new Logger(RetellProvider.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Agent config sync ────────────────────────────────────────────────
  // Retell's resource model is two-tier: a "Retell LLM" resource holds the
  // prompt + tools, an "Agent" resource references it via llm_id plus
  // voice/telephony settings. Per https://docs.retellai.com/api-references/
  // create-retell-llm and .../create-agent. Both ids are stored on the org
  // row (see schema.prisma) so repeat syncs PATCH the existing resources
  // instead of creating duplicates every time settings change.
  async syncAgentConfig(
    org: Organization,
    settings: OrganizationSettings,
  ): Promise<void> {
    if (!org.voiceId) {
      throw new Error(
        `Organization ${org.id} has no voiceId set — call listVoices() and PATCH /organization/voice first`,
      );
    }

    const apiKey = this.config.getOrThrow<string>('RETELL_API_KEY');
    const webhookUrl = `${this.config.getOrThrow<string>('APP_URL')}/webhooks/voice/retell`;

    const generalTools = Object.values(TRIAGE_TOOL_SCHEMAS).map((schema) => {
      const s = schema as SharedToolSchema;
      return {
        type: 'custom',
        name: s.name,
        description: s.description,
        url: webhookUrl,
        parameters: s.parameters,
      };
    });

    const llmBody = {
      general_prompt: buildTriageSystemPrompt(org, settings),
      general_tools: generalTools,
    };

    const llmId = org.retellLlmId
      ? await this.updateLlm(apiKey, org.retellLlmId, llmBody)
      : await this.createLlm(apiKey, llmBody);

    const agentBody = {
      response_engine: { type: 'retell-llm', llm_id: llmId },
      voice_id: org.voiceId,
      agent_name: org.name,
      webhook_url: webhookUrl, // account-level: call_started/call_ended/call_analyzed
    };

    const agentId = org.retellAgentId
      ? await this.updateAgent(apiKey, org.retellAgentId, agentBody)
      : await this.createAgent(apiKey, agentBody);

    if (llmId !== org.retellLlmId || agentId !== org.retellAgentId) {
      await this.prisma.organization.update({
        where: { id: org.id },
        data: { retellLlmId: llmId, retellAgentId: agentId },
      });
    }

    this.logger.log(
      `Synced Retell config for org ${org.id} (llm=${llmId}, agent=${agentId})`,
    );
  }

  private async createLlm(apiKey: string, body: unknown): Promise<string> {
    const res = await this.callRetell(
      apiKey,
      'POST',
      '/create-retell-llm',
      body,
    );
    return res.llm_id as string;
  }

  private async updateLlm(
    apiKey: string,
    llmId: string,
    body: unknown,
  ): Promise<string> {
    const res = await this.callRetell(
      apiKey,
      'PATCH',
      `/update-retell-llm/${llmId}`,
      body,
    );
    return res.llm_id as string;
  }

  private async createAgent(apiKey: string, body: unknown): Promise<string> {
    const res = await this.callRetell(apiKey, 'POST', '/create-agent', body);
    return res.agent_id as string;
  }

  private async updateAgent(
    apiKey: string,
    agentId: string,
    body: unknown,
  ): Promise<string> {
    // PATCH /update-agent/{agent_id} is inferred by convention from the
    // confirmed PATCH /update-retell-llm/{llm_id} shape — the docs fetch
    // for this specific endpoint 404'd. Verify against
    // https://docs.retellai.com/api-references/update-agent on first real
    // sync; if it 404s, check that page directly.
    const res = await this.callRetell(
      apiKey,
      'PATCH',
      `/update-agent/${agentId}`,
      body,
    );
    return res.agent_id as string;
  }

  private async callRetell(
    apiKey: string,
    method: string,
    path: string,
    body: unknown,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${RETELL_API_BASE}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Retell API ${method} ${path} failed: ${res.status} ${text}`,
      );
    }
    return (await res.json()) as Record<string, unknown>;
  }

  // ── Webhook parsing ──────────────────────────────────────────────────

  isFunctionCallEvent(rawPayload: unknown): boolean {
    const p = rawPayload as { event?: string; name?: unknown };
    return typeof p?.name === 'string' && p.event === undefined;
  }

  parseFunctionCallEvent(rawPayload: unknown): VoiceFunctionCallEvent {
    const p = rawPayload as {
      name: string;
      args: Record<string, unknown>;
      call: { call_id: string; from_number?: string; to_number?: string };
    };
    if (!p.call.from_number || !p.call.to_number) {
      this.logger.warn(
        `Retell function-call payload missing from_number/to_number for call ${p.call.call_id} — org resolution will fail`,
      );
    }
    return {
      providerCallId: p.call.call_id,
      toolName: p.name as TriageToolName,
      args: p.args,
      fromNumber: p.call.from_number ?? '',
      toNumber: p.call.to_number ?? '',
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
        start_timestamp?: number;
        end_timestamp?: number;
      };
    };
    const durationSeconds =
      p.call.start_timestamp && p.call.end_timestamp
        ? Math.round((p.call.end_timestamp - p.call.start_timestamp) / 1000)
        : undefined;
    return {
      providerCallId: p.call.call_id,
      transcript: p.call.transcript,
      recordingUrl: p.call.recording_url,
      durationSeconds,
      // Retell doesn't expose a recording-consent flag on the call object —
      // there is no field to read here. If per-call consent proof is
      // required for compliance (PRD §10), capture it via a dedicated tool
      // call the agent makes after reading the disclosure, same pattern as
      // tag_emergency/create_quote, rather than inventing a field that
      // doesn't exist.
      recordingConsentGiven: undefined,
    };
  }

  buildToolResponse(result: unknown): unknown {
    return result;
  }

  // GET /list-voices — https://docs.retellai.com/api-references/list-voices.
  // Feeds the dashboard's org-setup voice picker; the org owner chooses,
  // we don't default it (see the voiceId check in syncAgentConfig above).
  async listVoices(): Promise<VoiceOption[]> {
    const apiKey = this.config.getOrThrow<string>('RETELL_API_KEY');
    const res = await fetch(`${RETELL_API_BASE}/list-voices`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      throw new Error(
        `Retell list-voices failed: ${res.status} ${await res.text()}`,
      );
    }
    const voices = (await res.json()) as Array<{
      voice_id: string;
      voice_name: string;
      provider: string;
      gender?: string;
      accent?: string;
      preview_audio_url?: string;
    }>;
    return voices.map((v) => ({
      id: v.voice_id,
      name: v.voice_name,
      provider: v.provider,
      gender: v.gender,
      accent: v.accent,
      previewUrl: v.preview_audio_url,
    }));
  }

  // Per https://docs.retellai.com/features/secure-webhook: header is
  // `X-Retell-Signature: v={timestamp_ms},d={hex_hmac}`; digest is
  // HMAC-SHA256(rawBody + timestamp, apiKey) via string concatenation —
  // Retell signs with the API key itself, there is no separate webhook
  // secret (this previously read a nonexistent RETELL_WEBHOOK_SECRET var).
  verifyWebhookSignature(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): boolean {
    if (!signatureHeader) return false;
    const match = /^v=(\d+),d=(.*)$/.exec(signatureHeader);
    if (!match) return false;
    const [, timestamp, digest] = match;

    const ageMs = Math.abs(Date.now() - Number(timestamp));
    if (ageMs > 5 * 60 * 1000) {
      this.logger.warn(
        'Retell webhook signature timestamp outside the 5-minute window — rejecting',
      );
      return false;
    }

    const apiKey = this.config.getOrThrow<string>('RETELL_API_KEY');
    const expected = createHmac('sha256', apiKey)
      .update(Buffer.concat([rawBody, Buffer.from(timestamp)]))
      .digest('hex');

    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(digest));
    } catch {
      return false;
    }
  }
}
