import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TriageCategory, Channel } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { InteractionsService } from './interactions.service';

// The dashboard's core feed: every call/text, its triage outcome, and
// (via the record's own fields) transcript + recording — PRD §7/Feature 1.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('interactions')
export class InteractionsController {
  constructor(private readonly interactions: InteractionsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('category') category?: TriageCategory,
    @Query('channel') channel?: Channel,
  ) {
    return this.interactions.list(user.organizationId, { category, channel });
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.interactions.getOne(user.organizationId, id);
  }
}
