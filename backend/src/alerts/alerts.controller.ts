import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { AlertsService } from './alerts.service';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('alerts')
export class AlertsController {
  constructor(
    private readonly alerts: AlertsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  listOpen(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.emergencyAlert.findMany({
      where: {
        organizationId: user.organizationId,
        status: { in: ['PENDING', 'ESCALATED'] },
      },
      include: { interaction: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Any authenticated org member can ack — the whole point is "whoever
  // sees it first stops the escalation chain," not a specific role.
  @Post(':id/ack')
  ack(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.alerts.ackAlert(user.organizationId, id, user.id);
  }
}
