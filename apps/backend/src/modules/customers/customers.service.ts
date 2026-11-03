import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SaleStatus } from '@prisma/client';
import { Paginated } from '../../common/dto/pagination.dto';
import { toMoneyString } from '../../common/utils/money.util';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  CampaignDto,
  CreateCustomerDto,
  ListCustomersQueryDto,
  UpdateCustomerDto,
} from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(businessId: string, q: ListCustomersQueryDto): Promise<Paginated<unknown>> {
    const limit = Math.min(Number(q.limit ?? 50), 200);
    const where: Prisma.CustomerWhereInput = {
      businessId,
      ...(q.q
        ? {
            OR: [
              { name: { contains: q.q, mode: 'insensitive' } },
              { phone: { contains: q.q } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.customer.findMany({
      where,
      take: limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: { debts: { where: { status: { not: 'PAID' } } } },
    });

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    return {
      data: data.map((c) => ({
        ...c,
        creditLimit: c.creditLimit ? toMoneyString(c.creditLimit) : null,
        balance: toMoneyString(
          c.debts.reduce(
            (acc, d) =>
              acc.plus(new Prisma.Decimal(d.originalAmount)).minus(d.paidAmount),
            new Prisma.Decimal(0),
          ),
        ),
      })),
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }

  async get(businessId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, businessId },
      include: {
        debts: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!customer) throw new NotFoundException('Mteja haipo.');

    const sales = await this.prisma.sale.findMany({
      where: { businessId, customerId: id },
      orderBy: { saleDate: 'desc' },
      take: 20,
    });

    const balance = customer.debts.reduce(
      (acc, d) =>
        acc.plus(new Prisma.Decimal(d.originalAmount)).minus(d.paidAmount),
      new Prisma.Decimal(0),
    );

    return {
      ...customer,
      creditLimit: customer.creditLimit ? toMoneyString(customer.creditLimit) : null,
      balance: toMoneyString(balance),
      debts: customer.debts.map((d) => ({
        ...d,
        originalAmount: toMoneyString(d.originalAmount),
        paidAmount: toMoneyString(d.paidAmount),
        remaining: toMoneyString(
          new Prisma.Decimal(d.originalAmount).minus(d.paidAmount),
        ),
      })),
      recentSales: sales.map((s) => ({
        ...s,
        total: toMoneyString(s.total),
        profit: toMoneyString(s.profit),
      })),
    };
  }

  /** GET /customers/:id/ledger — daftari la mteja kwa mfululizo. */
  async ledger(businessId: string, id: string, from?: string, to?: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, businessId },
    });
    if (!customer) throw new NotFoundException('Mteja haipo.');

    const dateFilter = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };

    const sales = await this.prisma.sale.findMany({
      where: {
        businessId,
        customerId: id,
        status: { notIn: [SaleStatus.VOIDED] },
        ...(from || to ? { saleDate: dateFilter } : {}),
      },
      orderBy: { saleDate: 'asc' },
      select: {
        id: true,
        receiptNo: true,
        saleDate: true,
        total: true,
        paymentMethod: true,
        status: true,
      },
    });

    const debts = await this.prisma.debt.findMany({
      where: { businessId, customerId: id },
      include: { payments: { orderBy: { paidAt: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });

    const saleIds = sales.map((s) => s.id);
    const debtIds = debts.map((d) => d.id);

    const payments = await this.prisma.payment.findMany({
      where: {
        businessId,
        OR: [
          ...(saleIds.length ? [{ saleId: { in: saleIds } }] : []),
          ...(debtIds.length ? [{ debtId: { in: debtIds } }] : []),
        ],
        ...(from || to ? { paidAt: dateFilter } : {}),
      },
      orderBy: { paidAt: 'asc' },
    });

    type Entry = {
      date: Date;
      type: 'SALE' | 'PAYMENT' | 'DEBT' | 'DEBT_PAYMENT';
      ref: string;
      description: string;
      debit: string;
      credit: string;
    };

    const entries: Entry[] = [];

    for (const s of sales) {
      entries.push({
        date: s.saleDate,
        type: 'SALE',
        ref: s.receiptNo,
        description:
          s.paymentMethod === 'CREDIT'
            ? `Mauzo kwa mkopo (${s.receiptNo})`
            : `Mauzo (${s.receiptNo})`,
        debit: s.total.toFixed(2),
        credit: '0.00',
      });
    }

    for (const d of debts) {
      entries.push({
        date: d.createdAt,
        type: 'DEBT',
        ref: d.id.slice(-8),
        description: d.description ?? `Deni: ${d.personName}`,
        debit: d.originalAmount.toFixed(2),
        credit: '0.00',
      });
    }

    for (const p of payments) {
      entries.push({
        date: p.paidAt,
        type: p.debtId ? 'DEBT_PAYMENT' : 'PAYMENT',
        ref: p.reference ?? p.id.slice(-8),
        description: `Malipo (${p.method})`,
        debit: '0.00',
        credit: p.amount.toFixed(2),
      });
    }

    entries.sort((a, b) => a.date.getTime() - b.date.getTime());

    let running = new Prisma.Decimal(0);
    const lines = entries.map((e) => {
      running = running.plus(e.debit).minus(e.credit);
      return { ...e, date: e.date.toISOString(), balance: running.toFixed(2) };
    });

    const totalDebit = entries.reduce(
      (a, e) => a.plus(e.debit),
      new Prisma.Decimal(0),
    );
    const totalCredit = entries.reduce(
      (a, e) => a.plus(e.credit),
      new Prisma.Decimal(0),
    );

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        creditLimit: customer.creditLimit?.toFixed(2) ?? null,
      },
      period: { from: from ?? null, to: to ?? null },
      openingBalance: '0.00',
      closingBalance: running.toFixed(2),
      totalDebit: totalDebit.toFixed(2),
      totalCredit: totalCredit.toFixed(2),
      entries: lines,
    };
  }

  /** GET /customers/:id/statement?format=pdf|html|json */
  async statement(
    businessId: string,
    id: string,
    from?: string,
    to?: string,
  ) {
    const ledger = await this.ledger(businessId, id, from, to);
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, currency: true, tin: true },
    });

    const customer = await this.prisma.customer.findFirst({
      where: { id, businessId },
      select: { name: true, phone: true },
    });

    const period =
      from || to
        ? `${from ?? 'mwanzoni'} → ${to ?? 'leo'}`
        : 'Muda wote';

    return {
      business,
      customer: customer
        ? { ...ledger.customer, name: customer.name }
        : ledger.customer,
      period: ledger.period,
      openingBalance: ledger.openingBalance,
      closingBalance: ledger.closingBalance,
      totalDebit: ledger.totalDebit,
      totalCredit: ledger.totalCredit,
      entries: ledger.entries,
      periodLabel: period,
    };
  }

  // ── Segments (E9) ─────────────────────────────────────────
  async segments(businessId: string) {
    const now = new Date();
    const since30 = new Date(now.getTime() - 30 * 86_400_000);
    const since60 = new Date(now.getTime() - 60 * 86_400_000);

    const [customers, sales] = await Promise.all([
      this.prisma.customer.findMany({
        where: { businessId },
        select: { id: true, name: true, phone: true },
      }),
      this.prisma.sale.findMany({
        where: { businessId, customerId: { not: null }, status: { not: 'VOIDED' } },
        select: {
          customerId: true,
          total: true,
          saleDate: true,
          payments: { select: { amount: true } },
        },
      }),
    ]);

    const stats = new Map<
      string,
      {
        count: number;
        spend: Prisma.Decimal;
        lastPurchase: Date | null;
        balance: Prisma.Decimal;
      }
    >();

    for (const sale of sales) {
      const id = sale.customerId as string;
      const entry =
        stats.get(id) ??
        {
          count: 0,
          spend: new Prisma.Decimal(0),
          lastPurchase: null,
          balance: new Prisma.Decimal(0),
        };
      entry.count += 1;
      entry.spend = entry.spend.plus(sale.total);
      if (!entry.lastPurchase || sale.saleDate > entry.lastPurchase) {
        entry.lastPurchase = sale.saleDate;
      }
      const paid = sale.payments.reduce(
        (acc, p) => acc.plus(p.amount),
        new Prisma.Decimal(0),
      );
      entry.balance = entry.balance.plus(sale.total.minus(paid));
      stats.set(id, entry);
    }

    const buckets = {
      NEW: [] as { id: string; name: string }[],
      LOYAL: [] as { id: string; name: string }[],
      LOST: [] as { id: string; name: string }[],
      DEBTORS: [] as { id: string; name: string }[],
      VIP: [] as { id: string; name: string }[],
    };

    for (const c of customers) {
      const st = stats.get(c.id);
      if (!st) {
        buckets.NEW.push({ id: c.id, name: c.name });
        continue;
      }
      if (st.count >= 3) buckets.LOYAL.push({ id: c.id, name: c.name });
      if (st.count === 1 && st.lastPurchase && st.lastPurchase >= since30) {
        buckets.NEW.push({ id: c.id, name: c.name });
      }
      if (st.lastPurchase && st.lastPurchase < since60) {
        buckets.LOST.push({ id: c.id, name: c.name });
      }
      if (st.balance.greaterThan(0)) {
        buckets.DEBTORS.push({ id: c.id, name: c.name });
      }
      if (new Prisma.Decimal(st.spend).greaterThanOrEqualTo(100_000)) {
        buckets.VIP.push({ id: c.id, name: c.name });
      }
    }

    return {
      total: customers.length,
      segments: Object.entries(buckets).map(([name, members]) => ({
        name,
        count: members.length,
        sample: members.slice(0, 5),
      })),
    };
  }

  // ── Loyalty (E8) ──────────────────────────────────────────
  async loyalty(businessId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, businessId },
    });
    if (!customer) throw new NotFoundException('Mteja hapo.');

    const sales = await this.prisma.sale.findMany({
      where: { businessId, customerId: id, status: { not: 'VOIDED' } },
      orderBy: { saleDate: 'desc' },
      take: 50,
      select: { id: true, receiptNo: true, total: true, saleDate: true },
    });

    return {
      customerId: id,
      name: customer.name,
      points: customer.loyaltyPoints,
      rule: 'Pointi 1 kwa kila 1,000 TZS iliyolipwa',
      valuePerPoint: '1.00',
      history: sales.map((s) => ({
        saleId: s.id,
        receiptNo: s.receiptNo,
        date: s.saleDate,
        total: toMoneyString(s.total),
        points: Math.floor(Number(s.total) / 1000),
      })),
    };
  }

  // ── Birthdays (E12) ───────────────────────────────────────
  async birthdays(businessId: string, month?: string, days?: string) {
    const m = month ? Number(month) : new Date().getMonth() + 1;
    const horizon = days ? Number(days) : null;

    const customers = await this.prisma.customer.findMany({
      where: { businessId, birthday: { not: null } },
      select: { id: true, name: true, phone: true, birthday: true },
    });

    const now = new Date();
    const rows = customers
      .map((c) => {
        const b = c.birthday as Date;
        const next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
        if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
          next.setFullYear(now.getFullYear() + 1);
        }
        const daysAway = Math.ceil((next.getTime() - now.getTime()) / 86_400_000);
        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          birthday: b.toISOString().slice(0, 10),
          nextBirthday: next.toISOString().slice(0, 10),
          daysAway,
        };
      })
      .filter((c) => (month ? new Date(c.birthday).getMonth() + 1 === m : true))
      .filter((c) => (horizon !== null ? c.daysAway <= horizon : true))
      .sort((a, b) => a.daysAway - b.daysAway);

    return { month: m, count: rows.length, customers: rows };
  }

  // ── Bulk WhatsApp campaign (E10) ──────────────────────────
  async campaign(businessId: string, userId: string, dto: CampaignDto) {
    const segment = await this.segments(businessId);
    let ids: string[] = dto.customerIds ?? [];

    if (dto.segment !== 'CUSTOM') {
      const all = await this.prisma.customer.findMany({
        where: { businessId },
        select: { id: true, name: true, phone: true },
      });
      const saleStats = await this.prisma.sale.groupBy({
        by: ['customerId'],
        where: { businessId, customerId: { not: null }, status: { not: 'VOIDED' } },
        _count: { _all: true },
        _max: { saleDate: true },
        _sum: { total: true },
      });
      const byId = new Map(
        saleStats
          .filter((s) => s.customerId)
          .map((s) => [s.customerId as string, s]),
      );
      const now = Date.now();

      ids = all
        .filter((c) => {
          if (dto.segment === 'ALL') return true;
          const st = byId.get(c.id);
          if (dto.segment === 'LOYAL') return (st?._count._all ?? 0) >= 3;
          if (dto.segment === 'NEW') {
            return (
              (st?._count._all ?? 0) === 1 &&
              !!st?._max.saleDate &&
              now - st._max.saleDate.getTime() <= 30 * 86_400_000
            );
          }
          if (dto.segment === 'LOST') {
            return (
              !!st?._max.saleDate &&
              now - st._max.saleDate.getTime() > 60 * 86_400_000
            );
          }
          if (dto.segment === 'DEBTORS') {
            return Number(st?._sum.total ?? 0) > 0;
          }
          return false;
        })
        .map((c) => c.id);
    }

    const customers = await this.prisma.customer.findMany({
      where: { id: { in: ids }, businessId },
      select: { id: true, name: true, phone: true },
    });

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true },
    });

    const messages = customers.map((c) => {
      const text = dto.message
        .replaceAll('{jina}', c.name)
        .replaceAll('{biashara}', business?.name ?? 'MyBoke');
      const phone = (c.phone ?? '').replace(/\D/g, '').replace(/^0/, '255');
      return {
        customerId: c.id,
        name: c.name,
        phone: c.phone,
        message: text,
        whatsappUrl: phone
          ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
          : null,
      };
    });

    const withPhone = messages.filter((m) => m.whatsappUrl).length;

    await this.prisma.auditLog.create({
      data: {
        businessId,
        userId,
        action: 'CAMPAIGN_CREATED',
        entity: 'Customer',
        entityId: dto.segment,
        after: {
          segment: dto.segment,
          recipients: messages.length,
          withPhone,
        },
      },
    });

    return {
      segment: dto.segment,
      total: messages.length,
      deliverable: withPhone,
      skipped: messages.length - withPhone,
      segments: segment.segments.map((s) => ({ name: s.name, count: s.count })),
      messages,
    };
  }

  async create(businessId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        businessId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        creditLimit: dto.creditLimit,
        notes: dto.notes,
        birthday: dto.birthday ? new Date(dto.birthday) : null,
      },
    });
  }

  async update(businessId: string, id: string, dto: UpdateCustomerDto) {
    await this.get(businessId, id);
    return this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.creditLimit !== undefined ? { creditLimit: dto.creditLimit } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.birthday !== undefined
          ? { birthday: dto.birthday ? new Date(dto.birthday) : null }
          : {}),
      },
    });
  }

  async remove(businessId: string, id: string) {
    await this.get(businessId, id);
    await this.prisma.customer.delete({ where: { id } });
    return { success: true };
  }
}
