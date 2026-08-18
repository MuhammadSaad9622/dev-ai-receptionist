import { Module } from '@nestjs/common';
import { TriageService } from './triage.service';
import { GeminiTextClient } from './gemini-text.client';
import { CalendarCrmModule } from '../calendar-crm/calendar-crm.module';
import { AlertsModule } from '../alerts/alerts.module';
import { FollowUpModule } from '../follow-up/follow-up.module';

@Module({
  imports: [CalendarCrmModule, AlertsModule, FollowUpModule],
  providers: [TriageService, GeminiTextClient],
  exports: [TriageService],
})
export class TriageModule {}
