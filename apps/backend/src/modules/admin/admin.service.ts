import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { rangeEnd, rangeStart } from '../../common/utils/date.util';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async overview() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      businesses,
      users,
      shops,
      products,
      subscriptions,
      activeSubs,
      paidInvoices,
      monthPaid,
      commissions,
      pendingCommissions,
      demand,
      missions,
      coins,
      sales,
    ] = await Promise.all([
      this.prisma.business.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.shop.count({ where: { isActive: true } }),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.subscription.groupBy({ by: ['planId'], _count: true }),
      this.prisma.subscription.count({
        where: { status: { in: ['ACTIVE', 'TRIAL'] }, endsAt: { gt: now } },
      }),
      this.prisma.invoice.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { status: 'PAID', paidAt: { gte: monthStart } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.commission.aggregate({
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.commission.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.demandRecord.count(),
      this.prisma.mission.count({ where: { status: 'COMPLETED' } }),
      this.prisma.coinTransaction.aggregate({
        where: { amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.sale.aggregate({
        _sum: { total: true },
        _count: true,
      }),
    ]);

    const planPrices = await this.prisma.plan.findMany({
      select: { id: true, name: true, monthlyPrice: true },
    });
    const priceById = new Map(planPrices.map((p) => [p.id, p.monthlyPrice]));

    let mrr = new Prisma.Decimal(0);
    for (const s of subscriptions) {
      const price = priceById.get(s.planId);
      if (price) mrr = mrr.plus(price.mul(s._count));
    }

    const newBusinessesThisMonth = await this.prisma.business.count({
      where: { createdAt: { gte: monthStart } },
    });

    return {
      generatedAt: now.toISOString(),
      platform: {
        businesses,
        newBusinessesThisMonth,
        users,
        shops,
        products,
        gmv: sales._sum.total?.toFixed(2) ?? '0.00',
        salesCount: sales._count,
      },
      billing: {
        subscriptionsByPlan: subscriptions.map((s) => ({
          planId: s.planId,
          planName: (planPrices.find((p) => p.id === s.planId)?.name) ?? s.planId,
          count: s._count,
        })),
        activeSubscriptions: activeSubs,
        mrr: mrr.toFixed(2),
        arr: mrr.mul(12).toFixed(2),
        lifetimePaid: paidInvoices._sum.amount?.toFixed(2) ?? '0.00',
        paidInvoices: paidInvoices._count,
        thisMonthPaid: monthPaid._sum.amount?.toFixed(2) ?? '0.00',
        thisMonthInvoices: monthPaid._count,
      },
      partners: {
        totalCommissions: commissions._sum.amount?.toFixed(2) ?? '0.00',
        commissionsCount: commissions._count,
        pendingAmount: pendingCommissions._sum.amount?.toFixed(2) ?? '0.00',
        pendingCount: pendingCommissions._count,
      },
      growth: {
        demandRecords: demand,
        missionsCompleted: missions,
        coinsIssued: coins._sum.amount ?? 0,
      },
    };
  }

  async businesses(q: { q?: string; limit?: number; cursor?: string }) {
    const limit = Math.min(q.limit ?? 20, 100);

    const data = await this.prisma.business.findMany({
      where: q.q
        ? {
            OR: [
              { name: { contains: q.q, mode: 'insensitive' } },
              { id: { contains: q.q } },
            ],
          }
        : {},
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      include: {
        subscription: true,
        memberships: {
          where: { role: 'OWNER' },
          include: { user: { select: { name: true, phone: true } } },
          take: 1,
        },
        _count: { select: { shops: true, products: true, sales: true, memberships: true } },
      },
    });

    const hasMore = data.length > limit;
    const page = hasMore ? data.slice(0, limit) : data;

    const salesTotals = await this.prisma.sale.groupBy({
      by: ['businessId'],
      where: { businessId: { in: page.map((b) => b.id) } },
      _sum: { total: true },
    });
    const revenueById = new Map(
      salesTotals.map((s) => [s.businessId, s._sum.total?.toFixed(2) ?? '0.00']),
    );

    const plans = await this.prisma.plan.findMany({ select: { id: true, name: true } });
    const planName = new Map(plans.map((p) => [p.id, p.name]));

    return {
      data: page.map((b) => ({
        id: b.id,
        name: b.name,
        type: b.type,
        currency: b.currency,
        owner: b.memberships[0]?.user?.name ?? null,
        ownerPhone: b.memberships[0]?.user?.phone ?? null,
        shops: b._count.shops,
        products: b._count.products,
        sales: b._count.sales,
        members: b._count.memberships,
        revenue: revenueById.get(b.id) ?? '0.00',
        planId: b.subscription?.planId ?? null,
        planName: b.subscription ? (planName.get(b.subscription.planId) ?? null) : null,
        subscriptionStatus: b.subscription?.status ?? null,
        subscriptionEndsAt: b.subscription?.endsAt ?? null,
        createdAt: b.createdAt,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
      hasMore,
    };
  }

  async businessDetail(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        shops: true,
        subscription: true,
        memberships: {
          include: { user: { select: { id: true, name: true, phone: true, email: true } } },
        },
        _count: {
          select: { products: true, sales: true, customers: true, expenses: true },
        },
      },
    });
    if (!business) throw new NotFoundException('Biashara haipatikani');
    return business;
  }

  /**
   * §23.4 — Ingia kama mmiliki wa biashara (support access).
   * Token inaishi saa 1 tu, na kila matumizi yanarekodiwa kwenye AuditLog.
   */
  async impersonate(
    businessId: string,
    actorId: string,
    opts: { reason?: string; ip?: string; shopId?: string } = {},
  ) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        businessId,
        isActive: true,
        role: { in: ['OWNER', 'MANAGER', 'CASHIER'] },
      },
      orderBy: { role: 'asc' },
      include: { user: { select: { id: true, name: true, phone: true } } },
    });
    if (!membership) {
      throw new NotFoundException('Biashara haina mtumiaji anayeweza kuigizwa');
    }

    const payload = {
      sub: membership.user.id,
      bid: businessId,
      role: membership.role,
      shops: membership.shopIds,
      name: membership.user.name,
      imp: actorId,
      reason: opts.reason ?? null,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret_change_me',
      expiresIn: '1h',
    });

    await this.prisma.auditLog.create({
      data: {
        businessId,
        userId: actorId,
        action: 'ADMIN_IMPERSONATE',
        entity: 'business',
        entityId: businessId,
        after: {
          impersonatedUserId: membership.user.id,
          role: membership.role,
          reason: opts.reason ?? null,
          expiresInSeconds: 3600,
        },
        ip: opts.ip ?? null,
      },
    });

    return {
      businessId,
      memberId: membership.id,
      userId: membership.user.id,
      user: membership.user,
      role: membership.role,
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
      impersonatedBy: actorId,
      note: 'Token inaisha baada ya saa 1 na ipo kwenye audit log.',
    };
  }

  /** §23.4 — Ongeza siku za subscription (support / goodwill). */
  async extendSubscription(
    subscriptionId: string,
    days: number,
    actorId: string,
    opts: { reason?: string } = {},
  ) {
    if (!Number.isFinite(days) || days === 0) {
      throw new NotFoundException('Idadi ya siku si sahihi');
    }
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!sub) throw new NotFoundException('Subscription haipatikani');

    const base =
      sub.endsAt.getTime() > Date.now() ? sub.endsAt.getTime() : Date.now();
    const endsAt = new Date(base + days * 86_400_000);

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        endsAt,
        status: sub.status === 'EXPIRED' ? 'ACTIVE' : sub.status,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        businessId: sub.businessId,
        userId: actorId,
        action: 'ADMIN_SUBSCRIPTION_EXTEND',
        entity: 'subscription',
        entityId: subscriptionId,
        before: { endsAt: sub.endsAt, status: sub.status },
        after: { endsAt, days, reason: opts.reason ?? null },
      },
    });

    const owners = await this.prisma.membership.findMany({
      where: { businessId: sub.businessId, role: 'OWNER', isActive: true },
      select: { userId: true },
    });
    if (owners.length) {
      await this.prisma.notification.createMany({
        data: owners.map((o) => ({
          userId: o.userId,
          type: 'SUBSCRIPTION',
          title: 'Subscription imeongezwa',
          body: `Siku ${days} zimeongezwa kwenye subscription yako. Inaisha ${endsAt
            .toISOString()
            .slice(0, 10)}.`,
          data: { subscriptionId, endsAt: endsAt.toISOString() },
        })),
      });
    }

    return updated;
  }

  /** §23.4 — Migongano ya sync inayojirudia (sync issues dashboard). */
  async syncIssues(opts: { limit?: number; deviceId?: string; entity?: string } = {}) {
    const limit = Math.min(opts.limit ?? 50, 200);
    const where: Prisma.SyncOperationWhereInput = {
      status: { in: ['conflict', 'rejected', 'error'] },
      ...(opts.deviceId ? { deviceId: opts.deviceId } : {}),
      ...(opts.entity ? { entity: opts.entity } : {}),
    };

    const [rows, byStatus, byEntity, total] = await Promise.all([
      this.prisma.syncOperation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.syncOperation.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.syncOperation.groupBy({
        by: ['entity'],
        where,
        _count: true,
      }),
      this.prisma.syncOperation.count({ where }),
    ]);

    const deviceCounts = new Map<string, number>();
    for (const r of rows) {
      deviceCounts.set(r.deviceId, (deviceCounts.get(r.deviceId) ?? 0) + 1);
    }

    return {
      total,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      byEntity: byEntity
        .map((s) => ({ entity: s.entity, count: s._count }))
        .sort((a, b) => b.count - a.count),
      devices: [...deviceCounts.entries()]
        .map(([deviceId, count]) => ({ deviceId, count }))
        .sort((a, b) => b.count - a.count),
      data: rows.map((r) => ({
        id: r.id,
        deviceId: r.deviceId,
        opId: r.opId,
        businessId: r.businessId,
        userId: r.userId,
        entity: r.entity,
        action: r.action,
        status: r.status,
        error: r.error,
        serverId: r.serverId,
        version: r.version,
        createdAt: r.createdAt,
      })),
    };
  }

  async subscriptions(limit = 50) {
    const data = await this.prisma.subscription.findMany({
      orderBy: { endsAt: 'asc' },
      take: Math.min(limit, 200),
      include: { business: { select: { id: true, name: true } } },
    });

    const plans = await this.prisma.plan.findMany({ select: { id: true, name: true } });
    const nameById = new Map(plans.map((p) => [p.id, p.name]));

    return {
      count: data.length,
      data: data.map((s) => ({
        id: s.id,
        businessId: s.businessId,
        businessName: s.business?.name ?? null,
        planId: s.planId,
        planName: nameById.get(s.planId) ?? null,
        status: s.status,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        daysLeft: Math.max(
          Math.ceil((s.endsAt.getTime() - Date.now()) / 86_400_000),
          0,
        ),
        autoRenew: s.autoRenew,
        referralCode: s.referralCode,
      })),
    };
  }

  async demandReport(q: { from?: string; to?: string }) {
    const to = q.to ? rangeEnd(q.to) : new Date();
    const from = q.from ? rangeStart(q.from) : new Date(to.getTime() - 30 * 86_400_000);

    const records = await this.prisma.demandRecord.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { productName: true, ward: true, businessId: true, createdAt: true },
    });

    const byProduct = new Map<string, number>();
    const byWard = new Map<string, number>();
    const byBusiness = new Map<string, number>();

    for (const r of records) {
      const key = r.productName.toLowerCase();
      byProduct.set(key, (byProduct.get(key) ?? 0) + 1);
      if (r.ward) byWard.set(r.ward, (byWard.get(r.ward) ?? 0) + 1);
      byBusiness.set(r.businessId, (byBusiness.get(r.businessId) ?? 0) + 1);
    }

    const total = records.length;

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      total,
      uniqueProducts: byProduct.size,
      topProducts: [...byProduct.entries()]
        .map(([name, count]) => ({
          name,
          requests: count,
          share: total ? Number(((count / total) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 50),
      wardLeaderboard: [...byWard.entries()]
        .map(([ward, requests]) => ({ ward, requests }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 50),
      activeBusinesses: byBusiness.size,
      topBusinesses: [...byBusiness.entries()]
        .map(([businessId, requests]) => ({ businessId, requests }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 20),
    };
  }
}
