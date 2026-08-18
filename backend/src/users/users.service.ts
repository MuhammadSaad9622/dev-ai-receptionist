import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async getOne(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(
    organizationId: string,
    id: string,
    patch: Record<string, unknown>,
  ) {
    await this.getOne(organizationId, id);
    return this.prisma.user.update({ where: { id }, data: patch });
  }

  async registerPushToken(userId: string, fcmToken: string) {
    return this.prisma.pushSubscription.upsert({
      where: { fcmToken },
      create: { userId, fcmToken },
      update: { userId },
    });
  }
}
