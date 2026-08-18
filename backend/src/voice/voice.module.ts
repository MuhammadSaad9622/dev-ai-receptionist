import { Module } from '@nestjs/common';
import { RetellProvider } from './providers/retell.provider';
import { VapiProvider } from './providers/vapi.provider';
import { GeminiLiveProvider } from './providers/gemini-live.provider';
import { VoiceProviderFactory } from './voice-provider.factory';

@Module({
  providers: [
    RetellProvider,
    VapiProvider,
    GeminiLiveProvider,
    VoiceProviderFactory,
  ],
  exports: [VoiceProviderFactory],
})
export class VoiceModule {}
