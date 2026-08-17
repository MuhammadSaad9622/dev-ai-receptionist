import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';
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
}
