import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { AppointmentsService } from './appointments.service';

// Reads only — appointments are created/cancelled through the triage tool
// calls (book_appointment) and the CRM adapter, not directly via this API,
// since the CRM is the source of truth for schedule state (see
// calendar-crm/calendar-crm-adapter.interface.ts).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: AppointmentStatus,
  ) {
    return this.appointments.list(user.organizationId, { from, to, status });
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.appointments.getOne(user.organizationId, id);
  }
}
