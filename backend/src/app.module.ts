import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { InteractionsModule } from './interactions/interactions.module';
import { QuotesModule } from './quotes/quotes.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { TriageModule } from './triage/triage.module';
import { VoiceModule } from './voice/voice.module';
import { CalendarCrmModule } from './calendar-crm/calendar-crm.module';
import { FollowUpModule } from './follow-up/follow-up.module';
import { AlertsModule } from './alerts/alerts.module';
import { MessagingModule } from './messaging/messaging.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(), // process-global — powers FollowUpService's @Cron sweeps
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    BullModule.forRootAsync({
      useFactory: () => ({ connection: { url: process.env.REDIS_URL } }),
    }),

    PrismaModule,
    AuthModule,

    // Public, signature-verified provider callbacks (Twilio/Retell/Vapi).
    WebhooksModule,

    // Core domain/orchestration.
    TriageModule,
    VoiceModule,
    CalendarCrmModule,
    FollowUpModule,
    AlertsModule,
    MessagingModule,
    NotificationsModule,

    // JWT-guarded dashboard REST API.
    OrganizationsModule,
    UsersModule,
    CustomersModule,
    InteractionsModule,
    QuotesModule,
    AppointmentsModule,

    HealthModule,
  ],
  // Note on auth: every dashboard controller applies
  // @UseGuards(JwtAuthGuard, RolesGuard) itself rather than registering
  // those as global APP_GUARD providers, because WebhooksModule's
  // controllers (Twilio/Retell/Vapi callbacks) and HealthController must
  // stay reachable without a Supabase JWT — they authenticate via
  // provider-specific webhook signatures instead (see
  // webhooks/*.controller.ts). A global guard would need an explicit
  // @Public() bypass for every one of those; per-controller guards make
  // "does this route require a dashboard login" a visible, local fact.
})
export class AppModule {}
