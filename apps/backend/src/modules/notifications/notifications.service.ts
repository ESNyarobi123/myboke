import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PushService } from '../../infra/push/push.service';
import { ListNotificationsQueryDto, RegisterDeviceFullDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  async list(userId: string, q: ListNotificationsQueryDto) {
    const limit = Math.min(q.limit ?? 30, 100);
    const unreadOnly = q.unread === 'true' || q.unread === '1';

    const data = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });

    const hasMore = data.length > limit;
    const page = hasMore ? data.slice(0, limit) : data;

    const unreadCount = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });

    return {
      data: page.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data,
        read: Boolean(n.readAt),
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
      unreadCount,
      nextCursor: hasMore ? page[page.length - 1].id : null,
      hasMore,
    };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Taarifa haipo.');

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: notification.readAt ?? new Date() },
    });
  }

  async markAllRead(userId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true, updated: res.count };
  }

  async remove(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Taarifa haipo.');
    await this.prisma.notification.delete({ where: { id } });
    return { success: true };
  }

  /** Hutumika na services nyingine (billing, sync, growth). */
  async create(input: {
    userId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data as Prisma.InputJsonValue | undefined,
      },
    });

    // §10.10 — push kwa vifaa vya mtumiaji (best-effort).
    try {
      const devices = await this.prisma.device.findMany({
        where: { userId: input.userId, fcmToken: { not: null } },
        select: { fcmToken: true },
      });
      const tokens = devices
        .map((d) => d.fcmToken)
        .filter((t): t is string => Boolean(t));
      if (tokens.length > 0) {
        await this.push.send(tokens, input.title, input.body, input.data);
      }
    } catch {
      /* push ni ya hiari */
    }

    return notification;
  }

  // ── Devices ───────────────────────────────────────────────
  async registerDevice(userId: string, dto: RegisterDeviceFullDto) {
    const device = await this.prisma.device.upsert({
      where: { userId_deviceId: { userId, deviceId: dto.deviceId } },
      create: {
        userId,
        deviceId: dto.deviceId,
        platform: dto.platform,
        appVersion: dto.appVersion,
        fcmToken: dto.fcmToken,
        lastSeenAt: new Date(),
      },
      update: {
        platform: dto.platform,
        appVersion: dto.appVersion,
        fcmToken: dto.fcmToken,
        lastSeenAt: new Date(),
      },
    });

    return {
      id: device.id,
      deviceId: device.deviceId,
      platform: device.platform,
      appVersion: device.appVersion,
      notificationsEnabled: dto.notificationsEnabled ?? true,
      lastSeenAt: device.lastSeenAt,
    };
  }

  async devices(userId: string) {
    const data = await this.prisma.device.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
    });
    return {
      count: data.length,
      data: data.map((d) => ({
        id: d.id,
        deviceId: d.deviceId,
        platform: d.platform,
        appVersion: d.appVersion,
        hasPushToken: Boolean(d.fcmToken),
        lastSeenAt: d.lastSeenAt,
      })),
    };
  }

  async removeDevice(userId: string, id: string) {
    const device = await this.prisma.device.findFirst({
      where: { id, userId },
    });
    if (!device) throw new NotFoundException('Kifaa haipo.');
    await this.prisma.device.delete({ where: { id } });
    return { success: true };
  }

  /** Push token ya kifaa (hutumika na workers za FCM). */
  async pushTokensForUser(userId: string) {
    const devices = await this.prisma.device.findMany({
      where: { userId, fcmToken: { not: null } },
      select: { fcmToken: true },
    });
    return devices.map((d) => d.fcmToken).filter((t): t is string => Boolean(t));
  }
}
