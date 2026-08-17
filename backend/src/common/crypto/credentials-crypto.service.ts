import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// Encrypts per-org CRM credentials (ServiceTitan/Housecall Pro/Jobber OAuth
// tokens, Google Calendar refresh tokens) before they touch Postgres.
// CrmIntegration.encryptedCredentials stores the base64 of iv|authTag|ciphertext.
@Injectable()
export class CredentialsCryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const b64Key = config.getOrThrow<string>('CREDENTIALS_ENCRYPTION_KEY');
    this.key = Buffer.from(b64Key, 'base64');
    if (this.key.length !== 32) {
      throw new Error(
        'CREDENTIALS_ENCRYPTION_KEY must decode to exactly 32 bytes',
      );
    }
  }

  encrypt(plaintext: Record<string, unknown>): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(plaintext), 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
  }

  decrypt<T = Record<string, unknown>>(encoded: string): T {
    const buffer = Buffer.from(encoded, 'base64');
    const iv = buffer.subarray(0, 12);
    const authTag = buffer.subarray(12, 28);
    const ciphertext = buffer.subarray(28);

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return JSON.parse(plaintext.toString('utf8')) as T;
  }
}
