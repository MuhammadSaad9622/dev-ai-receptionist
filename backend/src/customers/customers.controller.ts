import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CustomersService } from './customers.service';

class UpdateCustomerDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() notes?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
  ) {
    return this.customers.list(user.organizationId, search);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.customers.getOne(user.organizationId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(user.organizationId, id, { ...dto });
  }
}
