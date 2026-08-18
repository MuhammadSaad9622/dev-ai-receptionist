import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { ConsentService } from './consent.service';
import { TelephonyCredentialsService } from './telephony-credentials.service';
import { TelephonyProvisioningService } from './telephony-provisioning.service';
import { CredentialsCryptoService } from '../common/crypto/credentials-crypto.service';

@Module({
  providers: [
    MessagingService,
    ConsentService,
    TelephonyCredentialsService,
    TelephonyProvisioningService,
    CredentialsCryptoService,
  ],
  exports: [
    MessagingService,
    ConsentService,
    TelephonyCredentialsService,
    TelephonyProvisioningService,
  ],
})
export class MessagingModule {}
