import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { OrganizationsService } from './organizations.service';

class UpdateSettingsDto {
  @IsOptional() @IsInt() @Min(30) emergencyAckTimeoutSeconds?: number;
  @IsOptional() @IsArray() quoteFollowUpOffsetsDays?: number[];
  @IsOptional() @IsInt() @Min(1) quoteExpiresAfterDays?: number;
  @IsOptional() @IsInt() @Min(1) retentionCadenceMonths?: number;
  @IsOptional() @IsString() recordingDisclosureScript?: string;
}

class SetVoiceDto {
  @IsNotEmpty() @IsString() voiceId: string;
}

class ConnectTwilioDto {
  @IsNotEmpty() @IsString() accountSid: string;
  @IsNotEmpty() @IsString() authToken: string;
}

class PurchaseNumberDto {
  @IsNotEmpty() @IsString() phoneNumber: string;
}

// Every route here relies on CurrentUser().organizationId to scope
// data — the caller can never pass an org id explicitly. See
// auth/current-user.decorator.ts.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organization')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  getCurrent(@CurrentUser() user: AuthenticatedUser) {
    return this.organizations.getWithSettings(user.organizationId);
  }

  @Patch('settings')
  @Roles('OWNER', 'ADMIN')
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.organizations.updateSettings(user.organizationId, { ...dto });
  }

  // Manual trigger for initial voice-provider setup, or retrying a sync
  // that failed (e.g. RETELL_API_KEY wasn't configured yet when settings
  // were first saved).
  @Post('voice/sync')
  @Roles('OWNER', 'ADMIN')
  async syncVoiceProvider(@CurrentUser() user: AuthenticatedUser) {
    await this.organizations.syncVoiceProvider(user.organizationId);
    return { ok: true };
  }

  // Feeds the dashboard's voice picker — the org owner listens to previews
  // and chooses, we never default this server-side.
  @Get('voice/options')
  listVoiceOptions(@CurrentUser() user: AuthenticatedUser) {
    return this.organizations.listVoiceOptions(user.organizationId);
  }

  @Patch('voice')
  @Roles('OWNER', 'ADMIN')
  async setVoice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetVoiceDto,
  ) {
    await this.organizations.setVoiceId(user.organizationId, dto.voiceId);
    // Voice choice only matters once it reaches the live agent — sync
    // immediately rather than waiting for the next unrelated settings save.
    await this.organizations.syncVoiceProvider(user.organizationId);
    return { ok: true };
  }

  // ── Telephony (Twilio) — each org connects and pays for their own ──────

  @Patch('telephony')
  @Roles('OWNER', 'ADMIN')
  async connectTwilio(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConnectTwilioDto,
  ) {
    await this.organizations.connectTwilio(
      user.organizationId,
      dto.accountSid,
      dto.authToken,
    );
    return { ok: true };
  }

  @Get('telephony/numbers')
  @Roles('OWNER', 'ADMIN')
  searchNumbers(
    @CurrentUser() user: AuthenticatedUser,
    @Query('areaCode') areaCode?: string,
  ) {
    return this.organizations.searchAvailableNumbers(
      user.organizationId,
      areaCode,
    );
  }

  // Charges the org's own Twilio balance — confirm intent client-side
  // before calling this (see dashboard's purchase confirmation dialog).
  @Post('telephony/numbers')
  @Roles('OWNER', 'ADMIN')
  purchaseNumber(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PurchaseNumberDto,
  ) {
    return this.organizations.purchaseNumber(
      user.organizationId,
      dto.phoneNumber,
    );
  }

  @Post('telephony/connect-voice')
  @Roles('OWNER', 'ADMIN')
  async connectVoiceToRetell(@CurrentUser() user: AuthenticatedUser) {
    await this.organizations.connectVoiceToRetell(user.organizationId);
    return { ok: true };
  }
}
