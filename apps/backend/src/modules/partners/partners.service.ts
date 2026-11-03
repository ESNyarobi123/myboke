import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommissionStatus, Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreatePartnerDto, UpdatePartnerDto } from './dto/partner.dto';

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Partner anayehusiana na mtumiaji (kupitia phone au membership). */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, phone: true },
    });

    const partner =
      (await this.prisma.partner.findFirst({
        where: { phone: user?.phone ?? undefined, isActive: true },
      })) ??
      (await this.prisma.membership
        .findFirst({ where: { userId, role: 'PARTNER', isActive: true } })
        .then(async (m) =>
          m
            ? this.prisma.partner.findFirst({
                where: { businessId: m.businessId, isActive: true },
              })
            : null,
        ));

    if (!partner) {
      throw new NotFoundException({
        code: 'NOT_A_PARTNER',
        message: 'Akaunti hii si wakala wa MyBoke.',
      });
    }

    const [pending, approved, paid, referredBusinesses] = await Promise.all([
      this.prisma.commission.aggregate({
        where: { partnerId: partner.id, status: CommissionStatus.PENDING },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.commission.aggregate({
        where: { partnerId: partner.id, status: CommissionStatus.APPROVED },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.commission.aggregate({
        where: { partnerId: partner.id, status: CommissionStatus.PAID },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.subscription.count({
        where: { partnerId: partner.id },
      }),
    ]);

    return {
      id: partner.id,
      name: partner.name,
      phone: partner.phone,
      code: partner.code,
      type: partner.type,
      commissionRate: partner.commissionRate.toFixed(2),
      isActive: partner.isActive,
      referralLink: `${process.env.PUBLIC_APP_URL ?? 'https://myboke.app'}/i/${partner.code}`,
      stats: {
        referredBusinesses,
        pending: pending._sum.amount?.toFixed(2) ?? '0.00',
        pendingCount: pending._count,
        approved: approved._sum.amount?.toFixed(2) ?? '0.00',
        approvedCount: approved._count,
        paid: paid._sum.amount?.toFixed(2) ?? '0.00',
        paidCount: paid._count,
        totalEarned: new Prisma.Decimal(pending._sum.amount ?? 0)
          .plus(approved._sum.amount ?? 0)
          .plus(paid._sum.amount ?? 0)
          .toFixed(2),
      },
    };
  }

  async myCommissions(userId: string, status?: CommissionStatus) {
    const me = await this.me(userId);
    const data = await this.prisma.commission.findMany({
      where: {
        partnerId: me.id,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return {
      partnerCode: me.code,
      currency: 'TZS',
      count: data.length,
      totals: me.stats,
      data: data.map((c) => ({
        id: c.id,
        invoiceId: c.invoiceId,
        amount: c.amount.toFixed(2),
        status: c.status,
        createdAt: c.createdAt,
        settledAt: c.settledAt,
      })),
    };
  }

  /** Public — thibitisha code ya referral kabla ya kujisajili. */
  async validateReferral(code: string) {
    const partner = await this.prisma.partner.findFirst({
      where: { code: code.trim().toUpperCase(), isActive: true },
    });
    if (!partner) {
      return { valid: false, code, message: 'Code haipo.' };
    }
    return {
      valid: true,
      code: partner.code,
      partnerName: partner.name,
      commissionRate: partner.commissionRate.toFixed(2),
      message: `Utasaidiwa na ${partner.name}.`,
    };
  }

  // ── Partner registry (owner-side / admin) ─────────────────
  private async uniqueCode(base?: string): Promise<string> {
    if (base) {
      const clean = base.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
      if (clean.length >= 3) {
        const exists = await this.prisma.partner.findUnique({ where: { code: clean } });
        if (!exists) return clean;
      }
    }
    for (let i = 0; i < 5; i += 1) {
      const code = `BOKE${randomBytes(3).toString('hex').toUpperCase()}`;
      const exists = await this.prisma.partner.findUnique({ where: { code } });
      if (!exists) return code;
    }
    throw new BadRequestException('Imeshindwa kutengeneza code ya kipekee.');
  }

  async create(dto: CreatePartnerDto, businessId?: string) {
    const code = await this.uniqueCode(dto.code);
    const rate = dto.commissionRate ?? '10';

    if (Number(rate) < 0 || Number(rate) > 100) {
      throw new BadRequestException('Commission rate iwe 0-100.');
    }

    return this.prisma.partner.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        code,
        type: dto.type ?? 'AGENT',
        commissionRate: rate,
        businessId: businessId ?? null,
      },
    });
  }

  async list(q: { limit?: number; q?: string } = {}) {
    const data = await this.prisma.partner.findMany({
      where: q.q
        ? {
            OR: [
              { name: { contains: q.q, mode: 'insensitive' } },
              { phone: { contains: q.q } },
              { code: { contains: q.q.toUpperCase() } },
            ],
          }
        : {},
      orderBy: { createdAt: 'desc' },
      take: Math.min(q.limit ?? 50, 200),
      include: {
        _count: { select: { commissions: true } },
      },
    });

    const totals = await this.prisma.commission.groupBy({
      by: ['partnerId'],
      _sum: { amount: true },
      _count: true,
    });
    const byPartner = new Map(totals.map((t) => [t.partnerId, t]));

    return {
      count: data.length,
      data: data.map((p) => ({
        id: p.id,
        name: p.name,
        phone: p.phone,
        code: p.code,
        type: p.type,
        commissionRate: p.commissionRate.toFixed(2),
        isActive: p.isActive,
        createdAt: p.createdAt,
        commissionsCount: byPartner.get(p.id)?._count ?? 0,
        commissionsTotal: byPartner.get(p.id)?._sum.amount?.toFixed(2) ?? '0.00',
      })),
    };
  }

  async update(id: string, dto: UpdatePartnerDto) {
    const partner = await this.prisma.partner.findUnique({ where: { id } });
    if (!partner) throw new NotFoundException('Wakala haipo.');

    return this.prisma.partner.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.commissionRate !== undefined
          ? { commissionRate: dto.commissionRate }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async settle(commissionId: string, status: 'APPROVED' | 'PAID' | 'REJECTED', note?: string) {
    const commission = await this.prisma.commission.findUnique({
      where: { id: commissionId },
    });
    if (!commission) throw new NotFoundException('Commission haipo.');

    const updated = await this.prisma.commission.update({
      where: { id: commissionId },
      data: {
        status: status as CommissionStatus,
        settledAt: status === 'PAID' ? new Date() : null,
      },
    });

    void note;

    return {
      id: updated.id,
      partnerId: updated.partnerId,
      amount: updated.amount.toFixed(2),
      status: updated.status,
      settledAt: updated.settledAt,
    };
  }

  async assertPartnerAccess(userId: string, businessId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { businessId_userId: { businessId, userId } },
    });
    if (!membership || membership.role !== 'PARTNER') {
      throw new ForbiddenException('Ruhusa ya PARTNER pekee.');
    }
  }
}
