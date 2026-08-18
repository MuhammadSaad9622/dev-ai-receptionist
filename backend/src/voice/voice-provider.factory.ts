import { Injectable } from '@nestjs/common';
import { VoiceProvider } from '@prisma/client';
import { VoiceProviderAdapter } from './voice-provider.interface';
import { RetellProvider } from './providers/retell.provider';
import { VapiProvider } from './providers/vapi.provider';
import { GeminiLiveProvider } from './providers/gemini-live.provider';

@Injectable()
export class VoiceProviderFactory {
  constructor(
    private readonly retell: RetellProvider,
    private readonly vapi: VapiProvider,
    private readonly geminiLive: GeminiLiveProvider,
  ) {}

  get(provider: VoiceProvider): VoiceProviderAdapter {
    switch (provider) {
      case 'RETELL':
        return this.retell;
      case 'VAPI':
        return this.vapi;
      case 'GEMINI_LIVE':
        return this.geminiLive;
      default:
        throw new Error(`Unsupported voice provider: ${String(provider)}`);
    }
  }
}
