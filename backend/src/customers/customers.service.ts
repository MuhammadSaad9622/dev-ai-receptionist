import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, search?: string) {
    return this.prisma.customer.findMany({
      where: {
        organizationId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { lastInteractionAt: 'desc' },
      take: 100,
    });
  }

  async getOne(organizationId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId }, // organizationId in the WHERE, not just checked after — cross-tenant reads 404 rather than leak
      include: {
        interactions: { orderBy: { createdAt: 'desc' }, take: 20 },
        quotes: { orderBy: { createdAt: 'desc' }, take: 20 },
        appointments: { orderBy: { scheduledStart: 'desc' }, take: 20 },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(
    organizationId: string,
    id: string,
    patch: Record<string, unknown>,
  ) {
    await this.getOne(organizationId, id); // 404s early on cross-tenant id
    return this.prisma.customer.update({ where: { id }, data: patch });
  }
}
