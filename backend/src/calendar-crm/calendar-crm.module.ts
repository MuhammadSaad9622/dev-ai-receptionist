import { Module } from '@nestjs/common';
import { CalendarCrmService } from './calendar-crm.service';
import { CredentialsCryptoService } from '../common/crypto/credentials-crypto.service';

@Module({
  providers: [CalendarCrmService, CredentialsCryptoService],
  exports: [CalendarCrmService],
})
export class CalendarCrmModule {}
