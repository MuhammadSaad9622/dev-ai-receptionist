import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { FollowUpService } from './follow-up.service';
import { FollowUpStepProcessor } from './processors/follow-up-step.processor';
import { MessagingModule } from '../messaging/messaging.module';
import { FOLLOW_UP_QUEUE } from './follow-up.constants';

// Note: @Cron handlers in FollowUpService require ScheduleModule.forRoot(),
// registered once in AppModule (not here) since it's a process-global hook.
@Module({
  imports: [
    BullModule.registerQueue({ name: FOLLOW_UP_QUEUE }),
    MessagingModule,
  ],
  providers: [FollowUpService, FollowUpStepProcessor],
  exports: [FollowUpService],
})
export class FollowUpModule {}
