import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TRIAGE_TOOL_SCHEMAS, TriageToolName } from './triage.types';

export interface GeminiFunctionCallResult {
  toolName: TriageToolName;
  args: Record<string, unknown>;
  assistantReply: string;
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        functionCall?: { name: string; args: Record<string, unknown> };
        text?: string;
      }>;
    };
  }>;
}

// Thin REST client for Gemini's generateContent + function-calling, used
// only by the SMS text-triage path (voice triage happens inside
// Retell/Vapi's own LLM turn, or inside a Gemini Live session under Option
// A — see voice/providers). Deliberately dependency-free (plain fetch)
// since this is a single endpoint call, not a whole SDK's worth of surface.
@Injectable()
export class GeminiTextClient {
  private readonly logger = new Logger(GeminiTextClient.name);
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: ConfigService) {
    this.apiKey = config.getOrThrow('GEMINI_API_KEY');
    this.model = config.get('GEMINI_TEXT_MODEL', 'gemini-flash-latest');
  }

  async classify(
    systemPrompt: string,
    userMessage: string,
  ): Promise<GeminiFunctionCallResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      tools: [{ functionDeclarations: Object.values(TRIAGE_TOOL_SCHEMAS) }],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Gemini classify() failed: ${response.status} ${text}`);
      throw new Error(`Gemini text triage request failed: ${response.status}`);
    }

    const json = (await response.json()) as GeminiGenerateContentResponse;
    const parts = json.candidates?.[0]?.content?.parts ?? [];

    const functionCallPart = parts.find((p) => p.functionCall);
    const textPart = parts.find((p) => p.text)?.text ?? '';

    if (!functionCallPart?.functionCall) {
      // Model replied without calling a tool — treat as UNCLASSIFIED/out-of-scope
      // rather than silently dropping the message.
      throw new Error('Gemini did not return a triage function call');
    }

    return {
      toolName: functionCallPart.functionCall.name as TriageToolName,
      args: functionCallPart.functionCall.args,
      assistantReply: textPart,
    };
  }
}
