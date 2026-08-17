import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsIn, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { UsersService } from './users.service';

class RegisterPushTokenDto {
  @IsString() fcmToken: string;
}

class UpdateUserDto {
  @IsIn(['OWNER', 'ADMIN', 'TECHNICIAN']) role?: UserRole;
  @IsBoolean() onDuty?: boolean;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.users.list(user.organizationId);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getOne(user.organizationId, user.id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(user.organizationId, id, { ...dto });
  }

  // Called by the dashboard PWA after the browser grants notification
  // permission — feeds AlertsService's push fan-out (PRD §7).
  @Post('me/push-tokens')
  registerPushToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.users.registerPushToken(user.id, dto.fcmToken);
  }
}
