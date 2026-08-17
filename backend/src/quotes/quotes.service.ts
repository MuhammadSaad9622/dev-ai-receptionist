import { Injectable, NotFoundException } from '@nestjs/common';
import { QuoteStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FollowUpService } from '../follow-up/follow-up.service';

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly followUp: FollowUpService,
  ) {}

  list(organizationId: string, status?: QuoteStatus) {
    return this.prisma.quote.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      include: { customer: { select: { id: true, name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getOne(organizationId: string, id: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        followUpSequence: { include: { steps: true } },
      },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    return quote;
  }

  async updateStatus(organizationId: string, id: string, status: QuoteStatus) {
    const quote = await this.getOne(organizationId, id);
    const updated = await this.prisma.quote.update({
      where: { id },
      data: { status },
    });

    if (
      (status === 'WON' || status === 'LOST') &&
      quote.followUpSequence?.status === 'ACTIVE'
    ) {
      await this.followUp.cancelSequence(quote.followUpSequence.id);
    }

    return updated;
  }
}
