import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsIn } from 'class-validator';
import { QuoteStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { QuotesService } from './quotes.service';

class UpdateQuoteStatusDto {
  @IsIn(['OPEN', 'FOLLOWING_UP', 'WON', 'LOST', 'EXPIRED'])
  status: QuoteStatus;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: QuoteStatus,
  ) {
    return this.quotes.list(user.organizationId, status);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.quotes.getOne(user.organizationId, id);
  }

  // Marking WON/LOST manually cancels any still-pending follow-up steps —
  // no point nudging a customer who already said yes or no.
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateQuoteStatusDto,
  ) {
    return this.quotes.updateStatus(user.organizationId, id, dto.status);
  }
}
