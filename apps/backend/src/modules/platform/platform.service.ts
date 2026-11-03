import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { rangeEnd, rangeStart } from '../../common/utils/date.util';
import { PrismaService } from '../../infra/prisma/prisma.service';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Audit log (I13) ───────────────────────────────────────
  async auditLogs(
    businessId: string,
    q: {
      entity?: string;
      action?: string;
      userId?: string;
      from?: string;
      to?: string;
      limit?: number;
      cursor?: string;
    },
  ) {
    const limit = Math.min(Number(q.limit ?? 50), 200);
    const where: Prisma.AuditLogWhereInput = {
      businessId,
      ...(q.entity ? { entity: q.entity } : {}),
      ...(q.action ? { action: { contains: q.action, mode: 'insensitive' } } : {}),
      ...(q.userId ? { userId: q.userId } : {}),
      ...(q.from || q.to
        ? {
            createdAt: {
              ...(q.from ? { gte: rangeStart(q.from) } : {}),
              ...(q.to ? { lte: rangeEnd(q.to) } : {}),
            },
          }
        : {}),
    };

    const rows = await this.prisma.auditLog.findMany({
      where,
      take: limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    return {
      data,
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }

  async auditLog(businessId: string, id: string) {
    const row = await this.prisma.auditLog.findFirst({
      where: { id, businessId },
    });
    if (!row) throw new NotFoundException('Kumbukumbu haipo.');
    return row;
  }

  // ── API keys (I16) ────────────────────────────────────────
  async apiKeys(businessId: string) {
    const rows = await this.prisma.apiKey.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
    return {
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        prefix: r.prefix,
        scopes: r.scopes,
        lastUsedAt: r.lastUsedAt,
        revokedAt: r.revokedAt,
        createdAt: r.createdAt,
      })),
    };
  }

  async createApiKey(
    businessId: string,
    userId: string,
    dto: { name: string; scopes?: string[] },
  ) {
    const raw = `mbk_live_${randomBytes(24).toString('hex')}`;
    const key = await this.prisma.apiKey.create({
      data: {
        businessId,
        name: dto.name,
        prefix: raw.slice(0, 12),
        keyHash: sha256(raw),
        scopes: (dto.scopes ?? ['read']) as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        businessId,
        userId,
        action: 'API_KEY_CREATED',
        entity: 'ApiKey',
        entityId: key.id,
        after: { name: key.name, prefix: key.prefix },
      },
    });

    return {
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      scopes: key.scopes,
      createdAt: key.createdAt,
      // Huonyeshwa MARA MOJA tu.
      key: raw,
      warning: 'Hifadhi key hii sasa — haitaonyeshwa tena.',
    };
  }

  async revokeApiKey(businessId: string, userId: string, id: string) {
    const key = await this.prisma.apiKey.findFirst({
      where: { id, businessId },
    });
    if (!key) throw new NotFoundException('API key haipo.');
    await this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    await this.prisma.auditLog.create({
      data: {
        businessId,
        userId,
        action: 'API_KEY_REVOKED',
        entity: 'ApiKey',
        entityId: id,
      },
    });
    return { success: true };
  }

  // ── Webhooks (I16) ────────────────────────────────────────
  async webhooks(businessId: string) {
    const rows = await this.prisma.webhookEndpoint.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { deliveries: true } },
      },
    });
    return {
      data: rows.map((r) => ({
        id: r.id,
        url: r.url,
        events: r.events,
        isActive: r.isActive,
        createdAt: r.createdAt,
        deliveries: r._count.deliveries,
      })),
    };
  }

  async createWebhook(
    businessId: string,
    dto: { url: string; events?: string[] },
  ) {
    if (!/^https?:\/\//.test(dto.url ?? '')) {
      throw new BadRequestException('URL lazima ianze na http(s)://');
    }
    const endpoint = await this.prisma.webhookEndpoint.create({
      data: {
        businessId,
        url: dto.url,
        secret: randomBytes(24).toString('hex'),
        events: (dto.events ?? ['sale.created', 'payment.received']) as Prisma.InputJsonValue,
      },
    });
    return {
      id: endpoint.id,
      url: endpoint.url,
      secret: endpoint.secret,
      events: endpoint.events,
      warning: 'Hifadhi secret hii — inatumika kuverify HMAC.',
    };
  }

  async updateWebhook(
    businessId: string,
    id: string,
    dto: { url?: string; events?: string[]; isActive?: boolean },
  ) {
    const existing = await this.prisma.webhookEndpoint.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Webhook haipo.');
    const updated = await this.prisma.webhookEndpoint.update({
      where: { id },
      data: {
        ...(dto.url !== undefined ? { url: dto.url } : {}),
        ...(dto.events !== undefined
          ? { events: dto.events as Prisma.InputJsonValue }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
    return updated;
  }

  async deleteWebhook(businessId: string, id: string) {
    const existing = await this.prisma.webhookEndpoint.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Webhook haipo.');
    await this.prisma.webhookEndpoint.delete({ where: { id } });
    return { success: true };
  }

  async deliveries(businessId: string, id: string, limit = 50) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({
      where: { id, businessId },
    });
    if (!endpoint) throw new NotFoundException('Webhook haipo.');
    const rows = await this.prisma.webhookDelivery.findMany({
      where: { endpointId: id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
    return { data: rows };
  }

  /** Tuma event kwa webhooks zote zinazohusika (HMAC SHA-256). */
  async dispatch(
    businessId: string,
    event: string,
    payload: Record<string, unknown>,
  ) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { businessId, isActive: true },
    });

    const results = [];
    for (const endpoint of endpoints) {
      const events = Array.isArray(endpoint.events)
        ? (endpoint.events as string[])
        : [];
      if (events.length > 0 && !events.includes(event)) continue;

      const body = JSON.stringify({ event, data: payload, at: new Date().toISOString() });
      const signature = createHmac('sha256', endpoint.secret)
        .update(body)
        .digest('hex');

      const started = Date.now();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5_000);
        const res = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-MyBoke-Event': event,
            'X-MyBoke-Signature': signature,
          },
          body,
          signal: controller.signal,
        });
        clearTimeout(timer);

        await this.prisma.webhookDelivery.create({
          data: {
            endpointId: endpoint.id,
            event,
            status: res.ok ? 'SENT' : 'FAILED',
            response: res.status,
            attempts: 1,
            payload: payload as Prisma.InputJsonValue,
          },
        });
        results.push({
          endpointId: endpoint.id,
          status: res.ok ? 'SENT' : 'FAILED',
          httpStatus: res.status,
          ms: Date.now() - started,
        });
      } catch (error) {
        await this.prisma.webhookDelivery.create({
          data: {
            endpointId: endpoint.id,
            event,
            status: 'FAILED',
            attempts: 1,
            error: (error as Error).message,
            payload: payload as Prisma.InputJsonValue,
          },
        });
        results.push({
          endpointId: endpoint.id,
          status: 'FAILED',
          error: (error as Error).message,
        });
      }
    }

    return { event, delivered: results.length, results };
  }

  async testWebhook(businessId: string, id: string) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({
      where: { id, businessId },
    });
    if (!endpoint) throw new NotFoundException('Webhook haipo.');
    const out = await this.dispatch(businessId, 'webhook.test', {
      endpointId: id,
      message: 'Jaribio la MyBoke webhook',
    });
    return out;
  }

  // ── Feedback / rate us (I7) ───────────────────────────────
  async feedback(
    userId: string,
    businessId: string | undefined,
    dto: { rating: number; comment?: string },
  ) {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating ni kati ya 1 na 5.');
    }
    const row = await this.prisma.feedback.create({
      data: {
        userId,
        businessId: businessId ?? null,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
    return { success: true, id: row.id };
  }

  async feedbackSummary() {
    const grouped = await this.prisma.feedback.groupBy({
      by: ['rating'],
      _count: true,
    });
    const total = grouped.reduce((a, g) => a + g._count, 0);
    const sum = grouped.reduce((a, g) => a + g.rating * g._count, 0);
    return {
      total,
      average: total ? Number((sum / total).toFixed(2)) : 0,
      byRating: grouped.map((g) => ({ rating: g.rating, count: g._count })),
    };
  }

  // ── Daily digest (G11) ────────────────────────────────────
  async digests(businessId: string) {
    const rows = await this.prisma.digestSubscription.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
    return { data: rows };
  }

  async subscribeDigest(
    businessId: string,
    dto: { channel?: string; destination: string },
  ) {
    const channel = (dto.channel ?? 'WHATSAPP').toUpperCase();
    if (!['WHATSAPP', 'EMAIL'].includes(channel)) {
      throw new BadRequestException('Channel ni WHATSAPP au EMAIL.');
    }
    const row = await this.prisma.digestSubscription.upsert({
      where: {
        businessId_channel_destination: {
          businessId,
          channel,
          destination: dto.destination,
        },
      },
      create: { businessId, channel, destination: dto.destination },
      update: { isActive: true },
    });
    return row;
  }

  async unsubscribeDigest(businessId: string, id: string) {
    const row = await this.prisma.digestSubscription.findFirst({
      where: { id, businessId },
    });
    if (!row) throw new NotFoundException('Usajili haupo.');
    await this.prisma.digestSubscription.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Hutengeneza muhtasari wa jana kwa kila biashara na kumtumia
   * mmiliki kama notification (+ kiungo cha WhatsApp kwa digest).
   */
  async runDigests() {
    const since = new Date();
    const from = new Date(since.getTime() - 86_400_000);
    const subscriptions = await this.prisma.digestSubscription.findMany({
      where: { isActive: true },
    });

    let sent = 0;
    for (const sub of subscriptions) {
      const [sales, expenses] = await Promise.all([
        this.prisma.sale.aggregate({
          where: {
            businessId: sub.businessId,
            saleDate: { gte: from, lte: since },
            status: { not: 'VOIDED' },
          },
          _sum: { total: true, profit: true },
          _count: true,
        }),
        this.prisma.expense.aggregate({
          where: {
            businessId: sub.businessId,
            date: { gte: from, lte: since },
          },
          _sum: { amount: true },
        }),
      ]);

      const gross = new Prisma.Decimal(sales._sum?.total ?? 0);
      const profit = new Prisma.Decimal(sales._sum?.profit ?? 0);
      const spend = new Prisma.Decimal(expenses._sum?.amount ?? 0);
      const net = profit.minus(spend);
      const body = `Jana: mauzo ${gross.toFixed(2)}, faida halisi ${net.toFixed(2)} (mauzo ${sales._count}).`;

      const owners = await this.prisma.membership.findMany({
        where: {
          businessId: sub.businessId,
          isActive: true,
          role: { in: ['OWNER', 'MANAGER'] },
        },
        select: { userId: true },
      });

      if (sub.channel === 'WHATSAPP') {
        const phone = sub.destination.replace(/\D/g, '').replace(/^0/, '255');
        void `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
      }

      await this.prisma.notification.createMany({
        data: owners.map((o) => ({
          userId: o.userId,
          type: 'DAILY_DIGEST',
          title: 'Muhtasari wa jana',
          body,
          data: {
            channel: sub.channel,
            destination: sub.destination,
          } as Prisma.InputJsonValue,
        })),
      });
      sent += owners.length;
    }

    return { subscriptions: subscriptions.length, notifications: sent };
  }
}
