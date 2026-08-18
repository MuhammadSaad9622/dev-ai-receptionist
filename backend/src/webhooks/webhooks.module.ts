import { Module } from '@nestjs/common';
import { VoiceWebhookController } from './voice-webhook.controller';
import { TwilioSmsWebhookController } from './twilio-sms-webhook.controller';
import { TwimlController } from './twiml.controller';
import { VoiceModule } from '../voice/voice.module';
import { TriageModule } from '../triage/triage.module';
import { MessagingModule } from '../messaging/messaging.module';

// All unauthenticated, publicly reachable endpoints (Twilio/Retell/Vapi call
// these directly) live here, isolated from the JWT-guarded dashboard API in
// AppModule's other feature modules. Each controller does its own
// signature verification instead of relying on a shared guard, since each
// provider's scheme is different.
@Module({
  imports: [VoiceModule, TriageModule, MessagingModule],
  controllers: [
    VoiceWebhookController,
    TwilioSmsWebhookController,
    TwimlController,
  ],
})
export class WebhooksModule {}
