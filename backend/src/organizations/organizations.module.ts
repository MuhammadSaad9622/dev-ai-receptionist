import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { VoiceModule } from '../voice/voice.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [VoiceModule, MessagingModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
})
export class OrganizationsModule {}
