import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SaleStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CloseShiftDto, OpenShiftDto } from './dto/shift.dto';

const CASH_METHODS = ['CASH', 'MIXED'];

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertShop(businessId: string, shopId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, businessId, isActive: true },
    });
    if (!shop) throw new NotFoundException('Duka haipo.');
    return shop;
  }

  async open(businessId: string, userId: string, dto: OpenShiftDto) {
    await this.assertShop(businessId, dto.shopId);

    const existing = await this.prisma.shift.findFirst({
      where: { shopId: dto.shopId, userId, status: 'OPEN' },
    });
    if (existing) {
      throw new BadRequestException({
        code: 'SHIFT_ALREADY_OPEN',
        message: 'Una shift iliyo wazi. Ifunge kwanza.',
        shiftId: existing.id,
      });
    }

    return this.prisma.shift.create({
      data: {
        businessId,
        shopId: dto.shopId,
        userId,
        openingFloat: dto.openingFloat,
        note: dto.note,
        status: 'OPEN',
      },
    });
  }

  async current(businessId: string, userId: string, shopId?: string) {
    const shift = await this.prisma.shift.findFirst({
      where: {
        businessId,
        userId,
        status: 'OPEN',
        ...(shopId ? { shopId } : {}),
      },
      orderBy: { openedAt: 'desc' },
    });

    if (!shift) return { shift: null, summary: null };

    return {
      shift,
      summary: await this.liveSummary(shift),
    };
  }

  async history(businessId: string, shopId?: string, limit = 30) {
    const data = await this.prisma.shift.findMany({
      where: { businessId, ...(shopId ? { shopId } : {}) },
      orderBy: { openedAt: 'desc' },
      take: Math.min(limit, 100),
    });
    return { data, count: data.length };
  }

  async findOne(businessId: string, id: string) {
    const shift = await this.prisma.shift.findFirst({
      where: { id, businessId },
    });
    if (!shift) throw new NotFoundException('Shift haipo.');
    return shift;
  }

  /** Muhtasari wa mauzo ndani ya muda wa shift. */
  private async liveSummary(shift: {
    id: string;
    shopId: string;
    userId: string;
    openedAt: Date;
    openingFloat: Prisma.Decimal;
  }) {
    const end = new Date();

    const sales = await this.prisma.sale.findMany({
      where: {
        shopId: shift.shopId,
        saleDate: { gte: shift.openedAt, lte: end },
        status: { notIn: [SaleStatus.VOIDED] },
      },
      include: { items: true, payments: true },
    });

    const expenses = await this.prisma.expense.findMany({
      where: {
        shopId: shift.shopId,
        date: { gte: shift.openedAt, lte: end },
      },
    });

    let gross = new Prisma.Decimal(0);
    let refunded = new Prisma.Decimal(0);
    let cashSales = new Prisma.Decimal(0);
    let nonCashSales = new Prisma.Decimal(0);
    const byMethod: Record<string, string> = {};
    const byCashier: Record<string, { count: number; total: string }> = {};
    let completedCount = 0;

    for (const sale of sales) {
      const isRefund = sale.status === SaleStatus.REFUNDED;
      const isPartial = sale.status === SaleStatus.PARTIAL_REFUND;

      gross = gross.plus(sale.total);
      if (isRefund) refunded = refunded.plus(sale.total);
      if (!isRefund) completedCount += 1;

      if (CASH_METHODS.includes(sale.paymentMethod)) {
        if (isRefund) cashSales = cashSales.minus(sale.total);
        else cashSales = cashSales.plus(sale.total);
      } else if (sale.paymentMethod !== 'CREDIT') {
        if (isRefund) nonCashSales = nonCashSales.minus(sale.total);
        else nonCashSales = nonCashSales.plus(sale.total);
      }

      const key = sale.paymentMethod;
      byMethod[key] = new Prisma.Decimal(byMethod[key] ?? 0)
        .plus(sale.total)
        .toFixed(2);

      const seller = sale.sellerId ?? 'unknown';
      const current = byCashier[seller] ?? { count: 0, total: '0' };
      byCashier[seller] = {
        count: current.count + 1,
        total: new Prisma.Decimal(current.total).plus(sale.total).toFixed(2),
      };
      void isPartial;
    }

    const totalExpenses = expenses.reduce(
      (acc, e) => acc.plus(e.amount),
      new Prisma.Decimal(0),
    );

    const expectedCash = shift.openingFloat
      .plus(cashSales)
      .minus(totalExpenses);

    return {
      shiftId: shift.id,
      openedAt: shift.openedAt,
      asOf: end.toISOString(),
      openingFloat: shift.openingFloat.toFixed(2),
      salesCount: completedCount,
      grossSales: gross.toFixed(2),
      refunds: refunded.toFixed(2),
      netSales: gross.minus(refunded).toFixed(2),
      cashSales: cashSales.toFixed(2),
      nonCashSales: nonCashSales.toFixed(2),
      byMethod,
      byCashier,
      expenses: totalExpenses.toFixed(2),
      expectedCash: expectedCash.toFixed(2),
    };
  }

  async close(businessId: string, userId: string, id: string, dto: CloseShiftDto) {
    const shift = await this.findOne(businessId, id);
    if (shift.status === 'CLOSED') {
      throw new BadRequestException('Shift hii imefungwa tayari.');
    }
    if (shift.userId !== userId) {
      const member = await this.prisma.membership.findUnique({
        where: { businessId_userId: { businessId, userId } },
      });
      if (!member || (member.role !== 'OWNER' && member.role !== 'MANAGER')) {
        throw new BadRequestException('Huwezi kufunga shift ya mtu mwingine.');
      }
    }

    const summary = await this.liveSummary(shift);
    const counted = new Prisma.Decimal(dto.countedCash);
    const expected = new Prisma.Decimal(summary.expectedCash);
    const difference = counted.minus(expected);

    const updated = await this.prisma.shift.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        expectedCash: summary.expectedCash,
        countedCash: dto.countedCash,
        difference: difference.toFixed(2),
        cashSales: summary.cashSales,
        nonCashSales: summary.nonCashSales,
        salesCount: summary.salesCount,
        note: dto.note ?? shift.note,
      },
    });

    return {
      shift: updated,
      zReport: this.buildZReport(updated, summary),
    };
  }

  async zReport(businessId: string, id: string) {
    const shift = await this.findOne(businessId, id);
    const summary = await this.liveSummary(shift);
    return this.buildZReport(shift, summary);
  }

  private buildZReport(
    shift: {
      id: string;
      shopId: string;
      userId: string;
      status: string;
      openingFloat: Prisma.Decimal;
      countedCash: Prisma.Decimal | null;
      expectedCash: Prisma.Decimal | null;
      difference: Prisma.Decimal | null;
      note: string | null;
      openedAt: Date;
      closedAt: Date | null;
    },
    summary: Awaited<ReturnType<ShiftsService['liveSummary']>>,
  ) {
    return {
      reportType: 'Z_REPORT',
      shiftId: shift.id,
      shopId: shift.shopId,
      cashierId: shift.userId,
      status: shift.status,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      generatedAt: new Date().toISOString(),
      openingFloat: summary.openingFloat,
      sales: {
        count: summary.salesCount,
        gross: summary.grossSales,
        refunds: summary.refunds,
        net: summary.netSales,
        cash: summary.cashSales,
        nonCash: summary.nonCashSales,
        byMethod: summary.byMethod,
        byCashier: summary.byCashier,
      },
      expenses: summary.expenses,
      cashDrawer: {
        openingFloat: summary.openingFloat,
        expected: shift.expectedCash?.toFixed(2) ?? summary.expectedCash,
        counted: shift.countedCash?.toFixed(2) ?? null,
        difference: shift.difference?.toFixed(2) ?? null,
      },
      note: shift.note,
      signature: {
        type: 'SHA256',
        value: createHash('sha256')
          .update(
            [
              shift.id,
              summary.grossSales,
              summary.refunds,
              summary.expectedCash,
              shift.closedAt?.toISOString() ?? '',
            ].join('|'),
          )
          .digest('hex'),
      },
    };
  }
}
