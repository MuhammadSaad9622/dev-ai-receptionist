import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';

async function bootstrap() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
    });
  }

  // rawBody: true preserves the exact request bytes for Twilio/Retell/Vapi
  // webhook signature verification (they sign the raw body, not the
  // re-serialized JSON) — see RawBodyRequest usage in webhooks/*.controller.ts.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(helmet());
  app.enableCors({
    origin: (process.env.DASHBOARD_ORIGIN ?? 'http://localhost:3000').split(
      ',',
    ),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api', {
    // Webhook and TwiML paths are dialed directly by Twilio/Retell/Vapi
    // with fixed URLs configured in each provider's dashboard — keep them
    // off the /api prefix so those URLs don't shift if the prefix changes.
    exclude: ['health', 'webhooks/(.*)', 'twiml/(.*)'],
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap().catch((error: unknown) => {
  console.error('Fatal error during bootstrap', error);
  process.exit(1);
});
