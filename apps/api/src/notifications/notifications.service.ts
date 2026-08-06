import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async sendNotification(
    userId: string,
    title: string,
    body?: string,
    type: NotificationType = NotificationType.SYSTEM
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
      },
    });
  }
}
