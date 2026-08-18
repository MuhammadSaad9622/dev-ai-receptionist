import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Thin wrapper around Firebase Cloud Messaging. Kept separate from
// MessagingService (SMS/voice) so alerts/alerts.service.ts can fan out a
// single emergency notification across push + SMS + voice without those
// channels knowing about each other.
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly config: ConfigService) {}

  sendPush(
    fcmTokens: string[],
    payload: PushPayload,
  ): Promise<{ sent: number; failed: number }> {
    if (fcmTokens.length === 0) return Promise.resolve({ sent: 0, failed: 0 });

    // TODO: wire firebase-admin once FCM_SERVICE_ACCOUNT_JSON is set.
    // const admin = getFirebaseAdminApp(this.config);
    // const result = await admin.messaging().sendEachForMulticast({ tokens: fcmTokens, notification: payload });
    this.logger.debug(
      `sendPush to ${fcmTokens.length} device(s): ${payload.title} — not yet wired`,
    );
    return Promise.resolve({ sent: 0, failed: fcmTokens.length });
  }
}
