import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { ConsentService } from './consent.service';

@Module({
  providers: [MessagingService, ConsentService],
  exports: [MessagingService, ConsentService],
})
export class MessagingModule {}
