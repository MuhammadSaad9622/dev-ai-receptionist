import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { EmergencyEscalationProcessor } from './processors/emergency-escalation.processor';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagingModule } from '../messaging/messaging.module';
import { EMERGENCY_ESCALATION_QUEUE } from './alerts.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: EMERGENCY_ESCALATION_QUEUE }),
    NotificationsModule,
    MessagingModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService, EmergencyEscalationProcessor],
  exports: [AlertsService],
})
export class AlertsModule {}
