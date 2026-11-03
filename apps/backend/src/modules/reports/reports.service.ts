import { Injectable, NotFoundException } from '@nestjs/common';
import { DebtStatus, DebtType, Prisma, SaleStatus } from '@prisma/client';
import {
  addDays,
  rangeEnd,
  rangeStart,
  startOfDayEAT,
  startOfMonthEAT,
  endOfDayEAT,
} from '../../common/utils/date.util';
import { toMoneyString, ZERO } from '../../common/utils/money.util';
import { PrismaService } from '../../infra/prisma/prisma.service';

const formatEatDate = (d: Date) =>
  new Date(d.getTime() + 3 * 3_600_000).toISOString().slice(0, 10);

interface RangeQuery {
  shopId?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Dashboard ya Home — namba za leo, mwezi, madeni na tahadhari. */
  async dashboard(businessId: string, shopId?: string) {
    const todayStart = startOfDayEAT();
    const todayEnd = endOfDayEAT();
    const monthStart = startOfMonthEAT();

    const saleWhere = (from: Date, to: Date): Prisma.SaleWhereInput => ({
      businessId,
      ...(shopId ? { shopId } : {}),
      status: { notIn: [SaleStatus.REFUNDED, SaleStatus.VOIDED] },
      saleDate: { gte: from, lte: to },
    });

    const [todayAgg, monthAgg, todayExp, monthExp, productCount] =
      await Promise.all([
        this.prisma.sale.aggregate({
          where: saleWhere(todayStart, todayEnd),
          _sum: { total: true, profit: true },
          _count: true,
        }),
        this.prisma.sale.aggregate({
          where: saleWhere(monthStart, todayEnd),
          _sum: { total: true, profit: true },
          _count: true,
        }),
        this.prisma.expense.aggregate({
          where: {
            businessId,
            ...(shopId ? { shopId } : {}),
            date: { gte: todayStart, lte: todayEnd },
          },
          _sum: { amount: true },
        }),
        this.prisma.expense.aggregate({
          where: {
            businessId,
            ...(shopId ? { shopId } : {}),
            date: { gte: monthStart, lte: todayEnd },
          },
          _sum: { amount: true },
        }),
        this.prisma.product.count({ where: { businessId, isActive: true } }),
      ]);

    const todayRevenue = new Prisma.Decimal(todayAgg._sum.total ?? 0);
    const todayProfit = new Prisma.Decimal(todayAgg._sum.profit ?? 0);
    const todayExpenses = new Prisma.Decimal(todayExp._sum.amount ?? 0);
    const monthRevenue = new Prisma.Decimal(monthAgg._sum.total ?? 0);
    const monthProfit = new Prisma.Decimal(monthAgg._sum.profit ?? 0);
    const monthExpenses = new Prisma.Decimal(monthExp._sum.amount ?? 0);

    const [debts, stockRows, trend, recent] = await Promise.all([
      this.debtTotals(businessId),
      this.stockTotals(businessId, shopId),
      this.trend(businessId, 7, shopId),
      this.prisma.sale.findMany({
        where: { businessId, ...(shopId ? { shopId } : {}) },
        orderBy: { saleDate: 'desc' },
        take: 5,
        include: { items: { select: { name: true, quantity: true } } },
      }),
    ]);

    return {
      today: {
        salesCount: todayAgg._count,
        revenue: toMoneyString(todayRevenue),
        profit: toMoneyString(todayProfit),
        expenses: toMoneyString(todayExpenses),
        netProfit: toMoneyString(todayProfit.minus(todayExpenses)),
      },
      month: {
        salesCount: monthAgg._count,
        revenue: toMoneyString(monthRevenue),
        profit: toMoneyString(monthProfit),
        expenses: toMoneyString(monthExpenses),
        netProfit: toMoneyString(monthProfit.minus(monthExpenses)),
        marginPercent:
          monthRevenue.greaterThan(0)
            ? Number(monthProfit.dividedBy(monthRevenue).mul(100).toFixed(1))
            : 0,
      },
      debts,
      stock: { products: productCount, ...stockRows },
      trend,
      recentSales: recent.map((s) => ({
        id: s.id,
        receiptNo: s.receiptNo,
        total: toMoneyString(s.total),
        profit: toMoneyString(s.profit),
        saleDate: s.saleDate,
        itemCount: s.items.length,
        firstItem: s.items[0]?.name ?? null,
      })),
    };
  }

  /** GET /reports/summary — muhtasari mmoja kwa dashboard. */
  /**
   * Ripoti za siku zilizoprecompute na `reports` job (§10.8).
   * Siku ambayo haijasnapshottwa bado inahesabiwa live ili dashboard isikose data.
   */
  async dailySnapshots(businessId: string, q: RangeQuery = {}) {
    const to = q.to ?? formatEatDate(new Date(Date.now() - 86_400_000));
    const from =
      q.from ??
      formatEatDate(new Date(Date.now() - 30 * 86_400_000));

    const rows = await this.prisma.dailySnapshot.findMany({
      where: {
        businessId,
        ...(q.shopId ? { OR: [{ shopId: q.shopId }, { shopId: null }] } : {}),
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'desc' },
    });

    const days = rows.filter((r) => r.shopId === null || r.shopId === q.shopId);
    const totals = days.reduce(
      (acc, r) => ({
        grossSales: acc.grossSales.plus(r.grossSales),
        netSales: acc.netSales.plus(r.netSales),
        vat: acc.vat.plus(r.vat),
        cogs: acc.cogs.plus(r.cogs),
        profit: acc.profit.plus(r.profit),
        expenses: acc.expenses.plus(r.expenses),
        salesCount: acc.salesCount + r.salesCount,
      }),
      {
        grossSales: ZERO,
        netSales: ZERO,
        vat: ZERO,
        cogs: ZERO,
        profit: ZERO,
        expenses: ZERO,
        salesCount: 0,
      },
    );

    return {
      from,
      to,
      shopId: q.shopId ?? null,
      cached: days.length > 0,
      days: days.map((r) => ({
        date: r.date,
        shopId: r.shopId,
        grossSales: toMoneyString(r.grossSales),
        netSales: toMoneyString(r.netSales),
        vat: toMoneyString(r.vat),
        cogs: toMoneyString(r.cogs),
        profit: toMoneyString(r.profit),
        expenses: toMoneyString(r.expenses),
        salesCount: r.salesCount,
      })),
      totals: {
        grossSales: toMoneyString(totals.grossSales),
        netSales: toMoneyString(totals.netSales),
        vat: toMoneyString(totals.vat),
        cogs: toMoneyString(totals.cogs),
        profit: toMoneyString(totals.profit),
        expenses: toMoneyString(totals.expenses),
        salesCount: totals.salesCount,
      },
    };
  }

  async summary(businessId: string, shopId?: string) {
    const [dashboard, stockValue] = await Promise.all([
      this.dashboard(businessId, shopId),
      this.stockTotals(businessId, shopId),
    ]);
    return {
      generatedAt: new Date().toISOString(),
      ...dashboard,
      stock: { ...dashboard.stock, ...stockValue },
    };
  }

  /** GET /reports/debts — deni kwa wateja + aging buckets. */
  async debtsReport(businessId: string, shopId?: string) {
    const debts = await this.prisma.debt.findMany({
      where: {
        businessId,
        status: { in: [DebtStatus.OPEN, DebtStatus.PARTIAL, DebtStatus.OVERDUE] },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        payments: { select: { amount: true, paidAt: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const now = new Date();
    const buckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
    let owedToMe = new Prisma.Decimal(0);
    let iOwe = new Prisma.Decimal(0);

    const rows = debts.map((d) => {
      const remaining = d.originalAmount.minus(d.paidAmount);
      if (d.type === 'I_OWE') iOwe = iOwe.plus(remaining);
      else owedToMe = owedToMe.plus(remaining);

      const overdueDays = d.dueDate
        ? Math.floor((now.getTime() - d.dueDate.getTime()) / 86_400_000)
        : 0;

      if (!d.dueDate || overdueDays <= 0) buckets.current += Number(remaining);
      else if (overdueDays <= 30) buckets.d1_30 += Number(remaining);
      else if (overdueDays <= 60) buckets.d31_60 += Number(remaining);
      else if (overdueDays <= 90) buckets.d61_90 += Number(remaining);
      else buckets.d90_plus += Number(remaining);

      return {
        id: d.id,
        customer: d.customer?.name ?? d.personName,
        phone: d.customer?.phone ?? d.personPhone,
        type: d.type,
        status: d.status,
        originalAmount: d.originalAmount.toFixed(2),
        paidAmount: d.paidAmount.toFixed(2),
        remaining: remaining.toFixed(2),
        dueDate: d.dueDate?.toISOString() ?? null,
        overdueDays: Math.max(overdueDays, 0),
        lastPaymentAt: d.payments.length
          ? d.payments[d.payments.length - 1].paidAt.toISOString()
          : null,
      };
    });

    const topDebtors = [...rows]
      .filter((r) => r.type === 'OWE_ME')
      .sort((a, b) => Number(b.remaining) - Number(a.remaining))
      .slice(0, 10);

    void shopId;

    return {
      generatedAt: now.toISOString(),
      totals: {
        owedToMe: owedToMe.toFixed(2),
        iOwe: iOwe.toFixed(2),
        net: owedToMe.minus(iOwe).toFixed(2),
        count: rows.length,
        overdue: rows.filter((r) => r.overdueDays > 0).length,
      },
      aging: {
        current: buckets.current.toFixed(2),
        d1_30: buckets.d1_30.toFixed(2),
        d31_60: buckets.d31_60.toFixed(2),
        d61_90: buckets.d61_90.toFixed(2),
        d90_plus: buckets.d90_plus.toFixed(2),
      },
      topDebtors,
      rows,
    };
  }

  async salesReport(businessId: string, q: RangeQuery) {
    const from = q.from ? rangeStart(q.from) : startOfMonthEAT();
    const to = q.to ? rangeEnd(q.to) : endOfDayEAT();

    const where: Prisma.SaleWhereInput = {
      businessId,
      ...(q.shopId ? { shopId: q.shopId } : {}),
      status: { notIn: [SaleStatus.REFUNDED, SaleStatus.VOIDED] },
      saleDate: { gte: from, lte: to },
    };

    const [agg, byMethod, bySeller] = await Promise.all([
      this.prisma.sale.aggregate({
        where,
        _sum: { total: true, profit: true, discount: true, costTotal: true },
        _count: true,
        _avg: { total: true },
      }),
      this.prisma.sale.groupBy({
        by: ['paymentMethod'],
        where,
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.sale.groupBy({
        by: ['sellerId'],
        where,
        _sum: { total: true, profit: true },
        _count: true,
      }),
    ]);

    return {
      period: { from, to },
      totals: {
        count: agg._count,
        revenue: toMoneyString(agg._sum.total ?? 0),
        profit: toMoneyString(agg._sum.profit ?? 0),
        discount: toMoneyString(agg._sum.discount ?? 0),
        cost: toMoneyString(agg._sum.costTotal ?? 0),
        averageSale: toMoneyString(agg._avg.total ?? 0),
      },
      byPaymentMethod: byMethod.map((m) => ({
        method: m.paymentMethod,
        total: toMoneyString(m._sum.total ?? 0),
        count: m._count,
      })),
      bySeller: bySeller.map((s) => ({
        sellerId: s.sellerId,
        total: toMoneyString(s._sum.total ?? 0),
        profit: toMoneyString(s._sum.profit ?? 0),
        count: s._count,
      })),
    };
  }

  async profitReport(businessId: string, q: RangeQuery) {
    const from = q.from ? rangeStart(q.from) : startOfMonthEAT();
    const to = q.to ? rangeEnd(q.to) : endOfDayEAT();

    const [sales, expenses] = await Promise.all([
      this.prisma.sale.aggregate({
        where: {
          businessId,
          ...(q.shopId ? { shopId: q.shopId } : {}),
          status: { notIn: [SaleStatus.REFUNDED, SaleStatus.VOIDED] },
          saleDate: { gte: from, lte: to },
        },
        _sum: { total: true, profit: true, costTotal: true, discount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          businessId,
          ...(q.shopId ? { shopId: q.shopId } : {}),
          date: { gte: from, lte: to },
        },
        _sum: { amount: true },
      }),
    ]);

    const revenue = new Prisma.Decimal(sales._sum.total ?? 0);
    const grossProfit = new Prisma.Decimal(sales._sum.profit ?? 0);
    const totalExpenses = new Prisma.Decimal(expenses._sum.amount ?? 0);
    const netProfit = grossProfit.minus(totalExpenses);

    return {
      period: { from, to },
      revenue: toMoneyString(revenue),
      costOfGoods: toMoneyString(sales._sum.costTotal ?? 0),
      grossProfit: toMoneyString(grossProfit),
      expenses: toMoneyString(totalExpenses),
      netProfit: toMoneyString(netProfit),
      marginPercent: revenue.greaterThan(0)
        ? Number(grossProfit.dividedBy(revenue).mul(100).toFixed(1))
        : 0,
      isLoss: netProfit.lessThan(0),
    };
  }

  async topProducts(businessId: string, q: RangeQuery) {
    const from = q.from ? rangeStart(q.from) : startOfMonthEAT();
    const to = q.to ? rangeEnd(q.to) : endOfDayEAT();

    const grouped = await this.prisma.saleItem.groupBy({
      by: ['productId', 'name'],
      where: {
        sale: {
          businessId,
          ...(q.shopId ? { shopId: q.shopId } : {}),
          status: { notIn: [SaleStatus.REFUNDED, SaleStatus.VOIDED] },
          saleDate: { gte: from, lte: to },
        },
      },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: 10,
    });

    return grouped.map((g) => ({
      productId: g.productId,
      name: g.name,
      quantity: toMoneyString(g._sum.quantity ?? 0),
      revenue: toMoneyString(g._sum.lineTotal ?? 0),
    }));
  }

  /** G9 — wateja wanaonunua zaidi kwa kipindi. */
  async topCustomers(businessId: string, q: RangeQuery) {
    const from = q.from ? rangeStart(q.from) : startOfMonthEAT();
    const to = q.to ? rangeEnd(q.to) : endOfDayEAT();

    const grouped = await this.prisma.sale.groupBy({
      by: ['customerId'],
      where: {
        businessId,
        ...(q.shopId ? { shopId: q.shopId } : {}),
        customerId: { not: null },
        status: { notIn: [SaleStatus.REFUNDED, SaleStatus.VOIDED] },
        saleDate: { gte: from, lte: to },
      },
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 10,
    });

    const ids = grouped
      .map((g) => g.customerId)
      .filter((id): id is string => Boolean(id));
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: ids }, businessId },
      select: { id: true, name: true, phone: true },
    });
    const byId = new Map(customers.map((c) => [c.id, c]));

    return grouped.map((g) => {
      const customer = g.customerId ? byId.get(g.customerId) : undefined;
      const revenue = toMoneyString(g._sum.total ?? 0);
      const orders = g._count._all;
      return {
        customerId: g.customerId,
        name: customer?.name ?? 'Mteja',
        phone: customer?.phone ?? null,
        orders,
        revenue,
        averageBasket: toMoneyString(
          new Prisma.Decimal(revenue).div(Math.max(1, orders)),
        ),
      };
    });
  }

  /** G9 — wauzaji wanaouza zaidi kwa kipindi (attribution). */
  async topSellers(businessId: string, q: RangeQuery) {
    const from = q.from ? rangeStart(q.from) : startOfMonthEAT();
    const to = q.to ? rangeEnd(q.to) : endOfDayEAT();

    const grouped = await this.prisma.sale.groupBy({
      by: ['sellerId'],
      where: {
        businessId,
        ...(q.shopId ? { shopId: q.shopId } : {}),
        sellerId: { not: null },
        status: { notIn: [SaleStatus.REFUNDED, SaleStatus.VOIDED] },
        saleDate: { gte: from, lte: to },
      },
      _sum: { total: true, profit: true },
      _count: { _all: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 10,
    });

    const ids = grouped
      .map((g) => g.sellerId)
      .filter((id): id is string => Boolean(id));
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const byId = new Map(users.map((u) => [u.id, u.name]));

    return grouped.map((g) => {
      const revenue = toMoneyString(g._sum?.total ?? 0);
      const orders = g._count._all;
      return {
        userId: g.sellerId,
        name: (g.sellerId ? byId.get(g.sellerId) : undefined) ?? 'Muuzaji',
        orders,
        revenue,
        profit: toMoneyString(g._sum?.profit ?? 0),
        averageBasket: toMoneyString(
          new Prisma.Decimal(revenue).div(Math.max(1, orders)),
        ),
      };
    });
  }

  async stockReport(businessId: string, shopId?: string) {
    const rows = await this.prisma.stockLevel.findMany({
      where: { ...(shopId ? { shopId } : {}), product: { businessId, isActive: true } },
      include: { product: true, shop: { select: { id: true, name: true } } },
    });

    let totalValue = ZERO;
    let retailValue = ZERO;
    let low = 0;
    let out = 0;

    for (const r of rows) {
      totalValue = totalValue.plus(
        new Prisma.Decimal(r.product.buyingPrice).mul(r.quantity),
      );
      retailValue = retailValue.plus(
        new Prisma.Decimal(r.product.sellingPrice).mul(r.quantity),
      );
      if (Number(r.quantity) === 0) out += 1;
      else if (Number(r.quantity) <= r.product.alertLevel) low += 1;
    }

    return {
      items: rows.length,
      stockValue: toMoneyString(totalValue),
      retailValue: toMoneyString(retailValue),
      potentialProfit: toMoneyString(retailValue.minus(totalValue)),
      lowStock: low,
      outOfStock: out,
      healthPercent:
        rows.length === 0
          ? 0
          : Math.round(((rows.length - low - out) / rows.length) * 100),
    };
  }

  // ── helpers ───────────────────────────────────────────────
  /**
   * Cash flow statement (F10) — fedha iliyoingia vs iliyotoka kwa kipindi.
   */
  async cashFlow(businessId: string, q: RangeQuery = {}) {
    const to = q.to ? rangeEnd(q.to) : new Date();
    const from = q.from
      ? rangeStart(q.from)
      : new Date(to.getTime() - 30 * 86_400_000);

    const [inflowPayments, expenses, supplierPayments] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          businessId,
          paidAt: { gte: from, lte: to },
          ...(q.shopId ? { sale: { shopId: q.shopId } } : {}),
        },
        select: { amount: true, method: true, paidAt: true, saleId: true },
        orderBy: { paidAt: 'asc' },
      }),
      this.prisma.expense.findMany({
        where: {
          businessId,
          date: { gte: from, lte: to },
          ...(q.shopId ? { shopId: q.shopId } : {}),
        },
        select: { amount: true, category: true, date: true, name: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.supplierPayment.findMany({
        where: { businessId, paidAt: { gte: from, lte: to } },
        select: { amount: true, paidAt: true, supplierId: true },
        orderBy: { paidAt: 'asc' },
      }),
    ]);

    const inflow = inflowPayments.reduce(
      (acc, p) => acc.plus(p.amount),
      new Prisma.Decimal(0),
    );
    const expenseTotal = expenses.reduce(
      (acc, e) => acc.plus(e.amount),
      new Prisma.Decimal(0),
    );
    const supplierTotal = supplierPayments.reduce(
      (acc, p) => acc.plus(p.amount),
      new Prisma.Decimal(0),
    );
    const outflow = expenseTotal.plus(supplierTotal);

    const byMethod = new Map<string, Prisma.Decimal>();
    for (const p of inflowPayments) {
      byMethod.set(
        p.method,
        (byMethod.get(p.method) ?? new Prisma.Decimal(0)).plus(p.amount),
      );
    }

    const byExpenseCategory = new Map<string, Prisma.Decimal>();
    for (const e of expenses) {
      byExpenseCategory.set(
        e.category,
        (byExpenseCategory.get(e.category) ?? new Prisma.Decimal(0)).plus(
          e.amount,
        ),
      );
    }

    // Mtiririko wa kila siku kwa chart.
    const days = new Map<string, { in: Prisma.Decimal; out: Prisma.Decimal }>();
    const key = (d: Date) =>
      new Date(d.getTime() + 3 * 3_600_000).toISOString().slice(0, 10);
    for (const p of inflowPayments) {
      const k = key(p.paidAt);
      const day = days.get(k) ?? { in: ZERO, out: ZERO };
      day.in = day.in.plus(p.amount);
      days.set(k, day);
    }
    for (const e of expenses) {
      const k = key(e.date);
      const day = days.get(k) ?? { in: ZERO, out: ZERO };
      day.out = day.out.plus(e.amount);
      days.set(k, day);
    }
    for (const sp of supplierPayments) {
      const k = key(sp.paidAt);
      const day = days.get(k) ?? { in: ZERO, out: ZERO };
      day.out = day.out.plus(sp.amount);
      days.set(k, day);
    }

    return {
      from,
      to,
      inflow: toMoneyString(inflow),
      outflow: toMoneyString(outflow),
      net: toMoneyString(inflow.minus(outflow)),
      expenses: toMoneyString(expenseTotal),
      supplierPayments: toMoneyString(supplierTotal),
      byMethod: [...byMethod].map(([method, amount]) => ({
        method,
        amount: toMoneyString(amount),
      })),
      byCategory: [...byExpenseCategory]
        .map(([category, amount]) => ({
          category,
          amount: toMoneyString(amount),
        }))
        .sort((a, b) => Number(b.amount) - Number(a.amount)),
      daily: [...days]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
          date,
          in: toMoneyString(v.in),
          out: toMoneyString(v.out),
          net: toMoneyString(v.in.minus(v.out)),
        })),
    };
  }

  /** Break-even analysis (F11). */
  async breakEven(businessId: string, q: RangeQuery = {}) {
    const to = q.to ? rangeEnd(q.to) : new Date();
    const from = q.from
      ? rangeStart(q.from)
      : new Date(to.getTime() - 30 * 86_400_000);

    const saleWhere: Prisma.SaleWhereInput = {
      businessId,
      saleDate: { gte: from, lte: to },
      status: { not: SaleStatus.VOIDED },
      ...(q.shopId ? { shopId: q.shopId } : {}),
    };

    const [sales, expenses] = await Promise.all([
      this.prisma.sale.aggregate({
        where: saleWhere,
        _sum: { total: true, costTotal: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: {
          businessId,
          date: { gte: from, lte: to },
          ...(q.shopId ? { shopId: q.shopId } : {}),
        },
        _sum: { amount: true },
      }),
    ]);

    const revenue = new Prisma.Decimal(sales._sum?.total ?? 0);
    const cogs = new Prisma.Decimal(sales._sum?.costTotal ?? 0);
    const fixed = new Prisma.Decimal(expenses._sum?.amount ?? 0);
    const grossProfit = revenue.minus(cogs);
    const marginRatio = revenue.greaterThan(0)
      ? grossProfit.div(revenue)
      : new Prisma.Decimal(0);
    const breakEvenRevenue = marginRatio.greaterThan(0)
      ? fixed.div(marginRatio)
      : new Prisma.Decimal(0);
    const progress = breakEvenRevenue.greaterThan(0)
      ? Math.min(
          999,
          Math.round(
            (Number(revenue) / Number(breakEvenRevenue)) * 100,
          ),
        )
      : 100;

    return {
      from,
      to,
      revenue: toMoneyString(revenue),
      cogs: toMoneyString(cogs),
      grossProfit: toMoneyString(grossProfit),
      grossMarginPct: marginRatio.mul(100).toFixed(2),
      fixedCosts: toMoneyString(fixed),
      breakEvenRevenue: toMoneyString(breakEvenRevenue),
      breakEvenSalesCount: sales._count,
      currentProfit: toMoneyString(grossProfit.minus(fixed)),
      progressPct: progress,
      reached: revenue.greaterThanOrEqualTo(breakEvenRevenue),
      message:
        revenue.greaterThanOrEqualTo(breakEvenRevenue)
          ? 'Umefikia break-even kwa kipindi hiki.'
          : `Unahitaji mauzo ya ${breakEvenRevenue.minus(revenue).toFixed(2)} zaidi kufikia break-even.`,
    };
  }

  // ── Budgets (F12) ─────────────────────────────────────────

  private static monthOf(d: Date = new Date()) {
    return new Date(d.getTime() + 3 * 3_600_000).toISOString().slice(0, 7);
  }

  async budgets(businessId: string, month?: string) {
    const m = month ?? ReportsService.monthOf();
    const monthStart = new Date(`${m}-01T00:00:00.000+03:00`);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const [budgets, spent] = await Promise.all([
      this.prisma.budget.findMany({
        where: { businessId, month: m },
        orderBy: { category: 'asc' },
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where: { businessId, date: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
      }),
    ]);

    const spentByCategory = new Map(
      spent.map((s) => [s.category, new Prisma.Decimal(s._sum?.amount ?? 0)]),
    );

    const rows = budgets.map((b) => {
      const used = spentByCategory.get(b.category) ?? ZERO;
      const pct = b.amount.greaterThan(0)
        ? Math.round((Number(used) / Number(b.amount)) * 100)
        : 0;
      return {
        id: b.id,
        category: b.category,
        month: b.month,
        amount: toMoneyString(b.amount),
        spent: toMoneyString(used),
        remaining: toMoneyString(b.amount.minus(used)),
        usedPct: pct,
        alert: pct >= 100 ? 'EXCEEDED' : pct >= 80 ? 'WARNING' : 'OK',
      };
    });

    const totalBudget = budgets.reduce(
      (acc, b) => acc.plus(b.amount),
      ZERO,
    );
    const totalSpent = rows.reduce(
      (acc, r) => acc.plus(r.spent),
      ZERO,
    );

    return {
      month: m,
      totals: {
        budget: toMoneyString(totalBudget),
        spent: toMoneyString(totalSpent),
        remaining: toMoneyString(totalBudget.minus(totalSpent)),
        usedPct: totalBudget.greaterThan(0)
          ? Math.round((Number(totalSpent) / Number(totalBudget)) * 100)
          : 0,
      },
      alerts: rows.filter((r) => r.alert !== 'OK'),
      data: rows,
      unbudgeted: [...spentByCategory]
        .filter(([cat]) => !budgets.some((b) => b.category === cat))
        .map(([category, amount]) => ({
          category,
          spent: toMoneyString(amount),
        })),
    };
  }

  async upsertBudget(
    businessId: string,
    dto: { category: string; amount: string; month?: string },
  ) {
    const month = dto.month ?? ReportsService.monthOf();
    const existing = await this.prisma.budget.findFirst({
      where: { businessId, category: dto.category, month },
    });

    const budget = existing
      ? await this.prisma.budget.update({
          where: { id: existing.id },
          data: { amount: dto.amount },
        })
      : await this.prisma.budget.create({
          data: {
            businessId,
            category: dto.category,
            amount: dto.amount,
            month,
          },
        });

    return { ...budget, amount: toMoneyString(budget.amount) };
  }

  async updateBudget(
    businessId: string,
    id: string,
    dto: { amount?: string; category?: string; month?: string },
  ) {
    const existing = await this.prisma.budget.findFirst({
      where: { id, businessId },
    });
    if (!existing) {
      throw new NotFoundException({ code: 'BUDGET_NOT_FOUND', message: 'Budget haipo.' });
    }
    const budget = await this.prisma.budget.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.month !== undefined ? { month: dto.month } : {}),
      },
    });
    return { ...budget, amount: toMoneyString(budget.amount) };
  }

  async deleteBudget(businessId: string, id: string) {
    const existing = await this.prisma.budget.findFirst({
      where: { id, businessId },
    });
    if (!existing) {
      throw new NotFoundException({ code: 'BUDGET_NOT_FOUND', message: 'Budget haipo.' });
    }
    await this.prisma.budget.delete({ where: { id } });
    return { success: true };
  }

  private async trend(businessId: string, days: number, shopId?: string) {
    const end = endOfDayEAT();
    const start = startOfDayEAT(addDays(new Date(), -(days - 1)));

    const sales = await this.prisma.sale.findMany({
      where: {
        businessId,
        ...(shopId ? { shopId } : {}),
        status: { notIn: [SaleStatus.REFUNDED, SaleStatus.VOIDED] },
        saleDate: { gte: start, lte: end },
      },
      select: { saleDate: true, total: true, profit: true },
    });

    const buckets = new Map<string, { revenue: Prisma.Decimal; profit: Prisma.Decimal }>();
    for (let i = 0; i < days; i += 1) {
      const d = addDays(start, i);
      buckets.set(d.toISOString().slice(0, 10), {
        revenue: new Prisma.Decimal(0),
        profit: new Prisma.Decimal(0),
      });
    }

    for (const s of sales) {
      const key = startOfDayEAT(s.saleDate).toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.revenue = bucket.revenue.plus(s.total);
      bucket.profit = bucket.profit.plus(s.profit);
    }

    return Array.from(buckets.entries()).map(([date, v]) => ({
      date,
      revenue: toMoneyString(v.revenue),
      profit: toMoneyString(v.profit),
    }));
  }

  private async debtTotals(businessId: string) {
    const debts = await this.prisma.debt.findMany({
      where: { businessId, status: { not: 'PAID' } },
    });
    let oweMe = ZERO;
    let iOwe = ZERO;
    let overdue = ZERO;
    const now = new Date();

    for (const d of debts) {
      const remaining = new Prisma.Decimal(d.originalAmount).minus(d.paidAmount);
      if (remaining.lessThanOrEqualTo(0)) continue;
      if (d.type === DebtType.OWE_ME) oweMe = oweMe.plus(remaining);
      else iOwe = iOwe.plus(remaining);
      if (d.dueDate && d.dueDate < now) overdue = overdue.plus(remaining);
    }

    return {
      oweMe: toMoneyString(oweMe),
      iOwe: toMoneyString(iOwe),
      overdue: toMoneyString(overdue),
    };
  }

  private async stockTotals(businessId: string, shopId?: string) {
    const rows = await this.prisma.stockLevel.findMany({
      where: { ...(shopId ? { shopId } : {}), product: { businessId, isActive: true } },
      include: { product: { select: { alertLevel: true } } },
    });
    let low = 0;
    let out = 0;
    for (const r of rows) {
      if (Number(r.quantity) === 0) out += 1;
      else if (Number(r.quantity) <= r.product.alertLevel) low += 1;
    }
    return { trackedItems: rows.length, lowStock: low, outOfStock: out };
  }
}
