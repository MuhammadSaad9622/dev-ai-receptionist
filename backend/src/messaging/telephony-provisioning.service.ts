import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Twilio } from 'twilio';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialsCryptoService } from '../common/crypto/credentials-crypto.service';
import { TelephonyCredentialsService } from './telephony-credentials.service';

export interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
}

// Each org connects and pays for their own Twilio account — this service
// owns that whole lifecycle: validate + store their credentials, search
// and buy a number on THEIR account, then bridge that number to Retell via
// Elastic SIP Trunking (verified against the installed `twilio` package's
// own .d.ts files, and https://docs.retellai.com/deploy/twilio, on
// 2026-08-18 — this is real infrastructure, not a simple webhook config).
@Injectable()
export class TelephonyProvisioningService {
  private readonly logger = new Logger(TelephonyProvisioningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CredentialsCryptoService,
    private readonly telephonyCredentials: TelephonyCredentialsService,
    private readonly config: ConfigService,
  ) {}

  async connectAccount(
    organizationId: string,
    accountSid: string,
    authToken: string,
  ): Promise<void> {
    // Validate against the real API before storing — a typo'd token should
    // fail loudly here, not silently on the next call/text.
    const client = new Twilio(accountSid, authToken);
    try {
      await client.api.v2010.accounts(accountSid).fetch();
    } catch {
      throw new BadRequestException('Invalid Twilio Account SID or Auth Token');
    }

    const encryptedCredentials = this.crypto.encrypt({ accountSid, authToken });
    await this.prisma.telephonyIntegration.upsert({
      where: { organizationId },
      create: {
        organizationId,
        provider: 'TWILIO',
        encryptedCredentials,
        status: 'PENDING',
      },
      update: { encryptedCredentials, status: 'PENDING', lastError: null },
    });
    this.telephonyCredentials.invalidateCache(organizationId);
  }

  async searchAvailableNumbers(
    organizationId: string,
    areaCode?: string,
  ): Promise<AvailableNumber[]> {
    const { client } = await this.telephonyCredentials.forOrg(organizationId);
    const numbers = await client.availablePhoneNumbers('US').local.list({
      areaCode: areaCode ? Number(areaCode) : undefined,
      voiceEnabled: true,
      smsEnabled: true,
      limit: 10,
    });
    return numbers.map((n) => ({
      phoneNumber: n.phoneNumber,
      friendlyName: n.friendlyName,
      locality: n.locality ?? null,
      region: n.region ?? null,
    }));
  }

  /** Buys the given number on the org's own Twilio account — this charges
   * their Twilio balance (their own credits, per the product's model).
   * Caller is responsible for confirming intent before calling this. */
  async purchaseNumber(
    organizationId: string,
    phoneNumber: string,
  ): Promise<{ phoneNumber: string; sid: string }> {
    const { client } = await this.telephonyCredentials.forOrg(organizationId);
    const purchased = await client.incomingPhoneNumbers.create({ phoneNumber });
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        twilioPhoneNumber: purchased.phoneNumber,
        twilioNumberSid: purchased.sid,
      },
    });
    return { phoneNumber: purchased.phoneNumber, sid: purchased.sid };
  }

  /** Bridges the org's connected Twilio number to Retell: creates (or
   * reuses) an Elastic SIP Trunk, sets termination auth, points
   * origination at Retell's SIP domain, moves the number into the trunk,
   * then imports it into Retell. Idempotent on the trunk/credential-list
   * — re-running rotates the SIP credential and re-imports rather than
   * creating duplicate Twilio resources. */
  async connectVoiceToRetell(organizationId: string): Promise<void> {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: { telephonyIntegration: true },
    });
    if (!org.twilioPhoneNumber || !org.twilioNumberSid) {
      throw new BadRequestException(
        'Connect and purchase a phone number before linking it to voice AI',
      );
    }
    if (!org.telephonyIntegration) {
      throw new NotFoundException(
        'No Twilio account connected for this organization',
      );
    }

    const { client } = await this.telephonyCredentials.forOrg(organizationId);

    // 1. Trunk — reuse if this org already has one.
    let trunkSid = org.telephonyIntegration.twilioTrunkSid;
    let domainName: string;
    if (trunkSid) {
      const trunk = await client.trunking.v1.trunks(trunkSid).fetch();
      domainName = trunk.domainName;
    } else {
      const trunk = await client.trunking.v1.trunks.create({
        friendlyName: `${org.name} — AI Receptionist`,
      });
      trunkSid = trunk.sid;
      domainName = trunk.domainName;
    }

    // 2. SIP credential (username/password) for termination auth. Rotated
    // on every run rather than reused — we never store the plaintext
    // password after creation, so there's nothing to reuse.
    let credentialListSid = org.telephonyIntegration.twilioCredentialListSid;
    if (!credentialListSid) {
      const credentialList = await client.sip.credentialLists.create({
        friendlyName: `${org.name} — Retell auth`,
      });
      credentialListSid = credentialList.sid;
      // NOTE: Twilio's SDK spells this sub-resource "credentialsLists" (with
      // an extra "s") on Trunk, unlike client.sip.credentialLists above —
      // confirmed against the installed package's trunk.d.ts.
      await client.trunking.v1
        .trunks(trunkSid)
        .credentialsLists.create({ credentialListSid });
    }
    const username = `retell_${org.id.slice(0, 12)}`;
    const password = generateSipPassword();
    await client.sip
      .credentialLists(credentialListSid)
      .credentials.create({ username, password });

    // 3. Origination URL — inbound calls on this trunk route to Retell.
    const existing = await client.trunking.v1
      .trunks(trunkSid)
      .originationUrls.list();
    if (!existing.some((o) => o.sipUrl === 'sip:sip.retellai.com')) {
      await client.trunking.v1.trunks(trunkSid).originationUrls.create({
        sipUrl: 'sip:sip.retellai.com',
        weight: 10,
        priority: 10,
        enabled: true,
        friendlyName: 'Retell',
      });
    }

    // 4. Move the number into the trunk.
    await client.trunking.v1
      .trunks(trunkSid)
      .phoneNumbers.create({ phoneNumberSid: org.twilioNumberSid });

    // 5. Import into Retell — https://docs.retellai.com/api-references/import-phone-number
    const retellApiKey = this.config.getOrThrow<string>('RETELL_API_KEY');
    const res = await fetch('https://api.retellai.com/import-phone-number', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${retellApiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: org.twilioPhoneNumber,
        termination_uri: domainName,
        sip_trunk_auth_username: username,
        sip_trunk_auth_password: password,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      await this.prisma.telephonyIntegration.update({
        where: { organizationId },
        data: {
          twilioTrunkSid: trunkSid,
          twilioCredentialListSid: credentialListSid,
          sipTerminationUri: domainName,
          status: 'ERROR',
          lastError: `Retell import-phone-number failed: ${res.status} ${text}`,
        },
      });
      throw new Error(
        `Retell import-phone-number failed: ${res.status} ${text}`,
      );
    }

    await this.prisma.telephonyIntegration.update({
      where: { organizationId },
      data: {
        twilioTrunkSid: trunkSid,
        twilioCredentialListSid: credentialListSid,
        sipTerminationUri: domainName,
        retellImportedAt: new Date(),
        status: 'NUMBER_CONNECTED',
        lastSyncAt: new Date(),
        lastError: null,
      },
    });
    this.logger.log(
      `Connected org ${organizationId}'s Twilio number to Retell via trunk ${trunkSid}`,
    );
  }
}

// Twilio SIP credential passwords must be >=12 chars, mixed case, >=1
// digit. Built from a random byte pool rather than a template string.
function generateSipPassword(): string {
  const raw = randomBytes(18)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '');
  return `Aa1${raw.slice(0, 16)}`;
}
