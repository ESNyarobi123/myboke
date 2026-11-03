import { Injectable } from '@nestjs/common';
import { Prisma, SaleStatus } from '@prisma/client';
import {
  endOfDayEAT,
  startOfDayEAT,
  startOfMonthEAT,
  rangeEnd,
  rangeStart,
} from '../../common/utils/date.util';
import { toMoneyString } from '../../common/utils/money.util';
import { PrismaService } from '../../infra/prisma/prisma.service';

interface Range {
  shopId?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveRange(q: Range, defaultDays = 30) {
    const to = q.to ? rangeEnd(q.to) : endOfDayEAT();
    const from = q.from
      ? rangeStart(q.from)
      : new Date(to.getTime() - defaultDays * 86_400_000);
    return { from, to };
  }

  private saleWhere(
    businessId: string,
    from: Date,
    to: Date,
    shopId?: string,
  ): Prisma.SaleWhereInput {
    return {
      businessId,
      ...(shopId ? { shopId } : {}),
      status: { notIn: [SaleStatus.REFUNDED, SaleStatus.VOIDED] },
      saleDate: { gte: from, lte: to },
    };
  }

  async overview(businessId: string, q: Range) {
    const { from, to } = this.resolveRange(q);
    const spanMs = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - spanMs);
    const prevTo = new Date(from.getTime() - 1);

    const [current, previous, expenses, debts, stockValue, newCustomers] =
      await Promise.all([
        this.prisma.sale.aggregate({
          where: this.saleWhere(businessId, from, to, q.shopId),
          _sum: { total: true, profit: true, discount: true },
          _count: true,
          _avg: { total: true },
        }),
        this.prisma.sale.aggregate({
          where: this.saleWhere(businessId, prevFrom, prevTo, q.shopId),
          _sum: { total: true, profit: true },
          _count: true,
        }),
        this.prisma.expense.aggregate({
          where: {
            businessId,
            ...(q.shopId ? { shopId: q.shopId } : {}),
            date: { gte: from, lte: to },
          },
          _sum: { amount: true },
        }),
        this.prisma.debt.aggregate({
          where: {
            businessId,
            status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] },
            type: 'OWE_ME',
          },
          _sum: { originalAmount: true, paidAmount: true },
        }),
        this.prisma.stockLevel.findMany({
          where: {
            shop: { businessId },
            ...(q.shopId ? { shopId: q.shopId } : {}),
          },
          include: { product: { select: { buyingPrice: true, sellingPrice: true } } },
        }),
        this.prisma.customer.count({
          where: { businessId, createdAt: { gte: from, lte: to } },
        }),
      ]);

    const revenue = new Prisma.Decimal(current._sum.total ?? 0);
    const profit = new Prisma.Decimal(current._sum.profit ?? 0);
    const exp = new Prisma.Decimal(expenses._sum.amount ?? 0);
    const prevRevenue = new Prisma.Decimal(previous._sum.total ?? 0);
    const prevProfit = new Prisma.Decimal(previous._sum.profit ?? 0);

    let costVal = new Prisma.Decimal(0);
    let retailVal = new Prisma.Decimal(0);
    for (const l of stockValue) {
      costVal = costVal.plus(l.quantity.times(l.product.buyingPrice));
      retailVal = retailVal.plus(l.quantity.times(l.product.sellingPrice));
    }

    const openDebt = new Prisma.Decimal(debts._sum.originalAmount ?? 0).minus(
      debts._sum.paidAmount ?? 0,
    );

    const growth = (curr: Prisma.Decimal, prev: Prisma.Decimal) =>
      prev.greaterThan(0)
        ? Number(curr.minus(prev).dividedBy(prev).mul(100).toFixed(1))
        : curr.greaterThan(0)
          ? 100
          : 0;

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      kpis: {
        revenue: toMoneyString(revenue),
        profit: toMoneyString(profit),
        expenses: toMoneyString(exp),
        netProfit: toMoneyString(profit.minus(exp)),
        orders: current._count,
        avgTicket: toMoneyString(new Prisma.Decimal(current._avg.total ?? 0)),
        discountGiven: toMoneyString(new Prisma.Decimal(current._sum.discount ?? 0)),
        marginPercent: revenue.greaterThan(0)
          ? Number(profit.dividedBy(revenue).mul(100).toFixed(1))
          : 0,
        newCustomers,
      },
      growth: {
        revenuePercent: growth(revenue, prevRevenue),
        profitPercent: growth(profit, prevProfit),
        ordersPercent: growth(
          new Prisma.Decimal(current._count),
          new Prisma.Decimal(previous._count),
        ),
      },
      balanceSheet: {
        stockCost: costVal.toFixed(2),
        stockRetail: retailVal.toFixed(2),
        stockPotentialProfit: retailVal.minus(costVal).toFixed(2),
        receivables: openDebt.toFixed(2),
      },
    };
  }

  async trends(businessId: string, q: Range & { days?: number; metric?: string }) {
    const days = Math.min(Math.max(q.days ?? 30, 1), 365);
    const to = q.to ? rangeEnd(q.to) : endOfDayEAT();
    const from = new Date(to.getTime() - (days - 1) * 86_400_000);

    const sales = await this.prisma.sale.findMany({
      where: this.saleWhere(businessId, from, endOfDayEAT(to), q.shopId),
      select: { saleDate: true, total: true, profit: true, paymentMethod: true },
    });

    const expenses = await this.prisma.expense.findMany({
      where: {
        businessId,
        ...(q.shopId ? { shopId: q.shopId } : {}),
        date: { gte: from, lte: endOfDayEAT(to) },
      },
      select: { date: true, amount: true },
    });

    const byDay = new Map<
      string,
      { revenue: number; profit: number; orders: number; expenses: number }
    >();

    for (let i = 0; i < days; i += 1) {
      const d = new Date(from.getTime() + i * 86_400_000);
      byDay.set(d.toISOString().slice(0, 10), {
        revenue: 0,
        profit: 0,
        orders: 0,
        expenses: 0,
      });
    }

    for (const s of sales) {
      const key = s.saleDate.toISOString().slice(0, 10);
      const row = byDay.get(key);
      if (!row) continue;
      row.revenue += Number(s.total);
      row.profit += Number(s.profit);
      row.orders += 1;
    }

    for (const e of expenses) {
      const key = e.date.toISOString().slice(0, 10);
      const row = byDay.get(key);
      if (!row) continue;
      row.expenses += Number(e.amount);
    }

    const series = [...byDay.entries()].map(([date, v]) => ({
      date,
      revenue: v.revenue.toFixed(2),
      profit: v.profit.toFixed(2),
      orders: v.orders,
      expenses: v.expenses.toFixed(2),
      netProfit: (v.profit - v.expenses).toFixed(2),
    }));

    const byMethod: Record<string, string> = {};
    for (const s of sales) {
      byMethod[s.paymentMethod] = new Prisma.Decimal(byMethod[s.paymentMethod] ?? 0)
        .plus(s.total)
        .toFixed(2);
    }

    const bestDay = series.reduce(
      (best, d) => (Number(d.revenue) > Number(best.revenue) ? d : best),
      series[0] ?? { date: '', revenue: '0', profit: '0', orders: 0, expenses: '0', netProfit: '0' },
    );

    void startOfDayEAT;
    void startOfMonthEAT;

    return {
      metric: q.metric ?? 'revenue',
      period: { from: from.toISOString(), to },
      days,
      series,
      byPaymentMethod: byMethod,
      bestDay,
      totals: {
        revenue: series
          .reduce((a, d) => a + Number(d.revenue), 0)
          .toFixed(2),
        profit: series.reduce((a, d) => a + Number(d.profit), 0).toFixed(2),
        orders: series.reduce((a, d) => a + d.orders, 0),
      },
    };
  }

  async compare(
    businessId: string,
    q: {
      shopId?: string;
      periodAFrom?: string;
      periodATo?: string;
      periodBFrom?: string;
      periodBTo?: string;
    },
  ) {
    const now = endOfDayEAT();
    const aFrom = q.periodAFrom
      ? rangeStart(q.periodAFrom)
      : new Date(now.getTime() - 29 * 86_400_000);
    const aTo = q.periodATo ? rangeEnd(q.periodATo) : now;
    const aSpan = aTo.getTime() - aFrom.getTime();

    const bFrom = q.periodBFrom
      ? rangeStart(q.periodBFrom)
      : new Date(aFrom.getTime() - aSpan - 86_400_000);
    const bTo = q.periodBTo ? rangeEnd(q.periodBTo) : new Date(aFrom.getTime() - 1);

    const [a, b, aExp, bExp] = await Promise.all([
      this.prisma.sale.aggregate({
        where: this.saleWhere(businessId, aFrom, aTo, q.shopId),
        _sum: { total: true, profit: true },
        _count: true,
      }),
      this.prisma.sale.aggregate({
        where: this.saleWhere(businessId, bFrom, bTo, q.shopId),
        _sum: { total: true, profit: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: {
          businessId,
          ...(q.shopId ? { shopId: q.shopId } : {}),
          date: { gte: aFrom, lte: aTo },
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          businessId,
          ...(q.shopId ? { shopId: q.shopId } : {}),
          date: { gte: bFrom, lte: bTo },
        },
        _sum: { amount: true },
      }),
    ]);

    const build = (
      s: typeof a,
      e: typeof aExp,
    ) => {
      const revenue = new Prisma.Decimal(s._sum.total ?? 0);
      const profit = new Prisma.Decimal(s._sum.profit ?? 0);
      const expenses = new Prisma.Decimal(e._sum.amount ?? 0);
      return {
        revenue: revenue.toFixed(2),
        profit: profit.toFixed(2),
        expenses: expenses.toFixed(2),
        netProfit: profit.minus(expenses).toFixed(2),
        orders: s._count,
        avgTicket: s._count
          ? revenue.dividedBy(s._count).toFixed(2)
          : '0.00',
      };
    };

    const periodA = build(a, aExp);
    const periodB = build(b, bExp);

    const delta = (x: string, y: string) => {
      const base = new Prisma.Decimal(y);
      const val = new Prisma.Decimal(x);
      return {
        absolute: val.minus(base).toFixed(2),
        percent: base.greaterThan(0)
          ? Number(val.minus(base).dividedBy(base).mul(100).toFixed(1))
          : val.greaterThan(0)
            ? 100
            : 0,
      };
    };

    return {
      periodA: { from: aFrom.toISOString(), to: aTo.toISOString(), ...periodA },
      periodB: { from: bFrom.toISOString(), to: bTo.toISOString(), ...periodB },
      delta: {
        revenue: delta(periodA.revenue, periodB.revenue),
        profit: delta(periodA.profit, periodB.profit),
        expenses: delta(periodA.expenses, periodB.expenses),
        netProfit: delta(periodA.netProfit, periodB.netProfit),
        orders: delta(String(periodA.orders), String(periodB.orders)),
        avgTicket: delta(periodA.avgTicket, periodB.avgTicket),
      },
    };
  }

  /** Mchango wa category kwenye mauzo. */
  /** D13 — Ulinganisho wa maduka (shop vs shop). */
  async byShop(businessId: string, q: Range) {
    const { from, to } = this.resolveRange(q);
    const shops = await this.prisma.shop.findMany({
      where: { businessId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const sales = await this.prisma.sale.groupBy({
      by: ['shopId'],
      where: this.saleWhere(businessId, from, to),
      _sum: { total: true, profit: true },
      _count: { id: true },
    });
    const payments = await this.prisma.payment.groupBy({
      by: ['saleId'],
      where: { businessId },
      _sum: { amount: true },
    });
    const paymentBySale = new Map(
      payments.map((p) => [p.saleId, Number(p._sum.amount ?? 0)]),
    );
    const saleShop = await this.prisma.sale.findMany({
      where: this.saleWhere(businessId, from, to),
      select: { id: true, shopId: true, total: true },
    });
    const collectedByShop = new Map<string, number>();
    for (const s of saleShop) {
      const paid = paymentBySale.get(s.id) ?? Number(s.total);
      collectedByShop.set(
        s.shopId,
        (collectedByShop.get(s.shopId) ?? 0) + paid,
      );
    }

    const rows = shops.map((shop) => {
      const agg = sales.find((x) => x.shopId === shop.id);
      const revenue = Number(agg?._sum?.total ?? 0);
      const profit = Number(agg?._sum?.profit ?? 0);
      const txCount = agg?._count?.id ?? 0;
      return {
        shopId: shop.id,
        name: shop.name,
        revenue: revenue.toFixed(2),
        profit: profit.toFixed(2),
        collected: (collectedByShop.get(shop.id) ?? 0).toFixed(2),
        transactions: txCount,
        avgBasket: txCount > 0 ? (revenue / txCount).toFixed(2) : '0.00',
        marginPct:
          revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : 0,
      };
    });

    const topRevenue = rows
      .slice()
      .sort((a, b) => Number(b.revenue) - Number(a.revenue))[0];

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      bestShopId: topRevenue?.shopId ?? null,
      shops: rows,
    };
  }

  async byCategory(businessId: string, q: Range) {
    const { from, to } = this.resolveRange(q);
    const items = await this.prisma.saleItem.findMany({
      where: {
        sale: this.saleWhere(businessId, from, to, q.shopId),
      },
      select: {
        name: true,
        lineTotal: true,
        buyingPrice: true,
        quantity: true,
        productId: true,
      },
    });

    const productIds = [
      ...new Set(items.map((i) => i.productId).filter((v): v is string => Boolean(v))),
    ];
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, category: { select: { name: true } } },
        })
      : [];
    const categoryByProduct = new Map(
      products.map((p) => [p.id, p.category?.name ?? 'Bila category']),
    );

    const map = new Map<
      string,
      { revenue: number; profit: number; qty: number; items: number }
    >();

    for (const i of items) {
      const key = i.productId
        ? (categoryByProduct.get(i.productId) ?? 'Bila category')
        : 'Bila category';
      const row = map.get(key) ?? { revenue: 0, profit: 0, qty: 0, items: 0 };
      const lineProfit = i.lineTotal.minus(i.buyingPrice.times(i.quantity));
      row.revenue += Number(i.lineTotal);
      row.profit += Number(lineProfit);
      row.qty += Number(i.quantity);
      row.items += 1;
      map.set(key, row);
    }

    const total = [...map.values()].reduce((a, r) => a + r.revenue, 0);

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      categories: [...map.entries()]
        .map(([name, v]) => ({
          name,
          revenue: v.revenue.toFixed(2),
          profit: v.profit.toFixed(2),
          quantity: v.qty.toFixed(3),
          share:
            total > 0 ? Number(((v.revenue / total) * 100).toFixed(1)) : 0,
        }))
        .sort((x, y) => Number(y.revenue) - Number(x.revenue)),
    };
  }
}
