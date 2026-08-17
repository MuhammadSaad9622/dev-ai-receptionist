import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  getWithSettings(organizationId: string) {
    return this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      include: {
        settings: true,
        crmIntegration: {
          select: { provider: true, status: true, lastSyncAt: true },
        },
      },
    });
  }

  updateSettings(organizationId: string, patch: Record<string, unknown>) {
    return this.prisma.organizationSettings.update({
      where: { organizationId },
      data: patch,
    });
  }
}
