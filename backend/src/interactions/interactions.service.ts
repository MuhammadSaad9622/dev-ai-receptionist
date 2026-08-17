import { Injectable, NotFoundException } from '@nestjs/common';
import { Channel, TriageCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InteractionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(
    organizationId: string,
    filter: { category?: TriageCategory; channel?: Channel },
  ) {
    return this.prisma.interaction.findMany({
      where: {
        organizationId,
        ...(filter.category ? { triageCategory: filter.category } : {}),
        ...(filter.channel ? { channel: filter.channel } : {}),
      },
      include: { customer: { select: { id: true, name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getOne(organizationId: string, id: string) {
    const interaction = await this.prisma.interaction.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        quote: true,
        appointment: true,
        emergencyAlert: true,
      },
    });
    if (!interaction) throw new NotFoundException('Interaction not found');
    return interaction;
  }
}
