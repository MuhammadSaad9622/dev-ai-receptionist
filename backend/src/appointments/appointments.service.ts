import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(
    organizationId: string,
    filter: { from?: string; to?: string; status?: AppointmentStatus },
  ) {
    return this.prisma.appointment.findMany({
      where: {
        organizationId,
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.from || filter.to
          ? {
              scheduledStart: {
                ...(filter.from ? { gte: new Date(filter.from) } : {}),
                ...(filter.to ? { lte: new Date(filter.to) } : {}),
              },
            }
          : {}),
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, address: true },
        },
      },
      orderBy: { scheduledStart: 'asc' },
      take: 200,
    });
  }

  async getOne(organizationId: string, id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, organizationId },
      include: { customer: true, interaction: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }
}
