import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Paginated } from '../../common/dto/pagination.dto';
import { rangeEnd, rangeStart } from '../../common/utils/date.util';
import { toMoneyString } from '../../common/utils/money.util';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  CreateExpenseDto,
  ListExpensesQueryDto,
  UpdateExpenseDto,
} from './dto/expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(businessId: string, q: ListExpensesQueryDto): Promise<Paginated<unknown>> {
    const limit = Math.min(Number(q.limit ?? 50), 200);
    const where: Prisma.ExpenseWhereInput = {
      businessId,
      ...(q.shopId ? { shopId: q.shopId } : {}),
      ...(q.category ? { category: q.category } : {}),
      ...(q.from || q.to
        ? {
            date: {
              ...(q.from ? { gte: rangeStart(q.from) } : {}),
              ...(q.to ? { lte: rangeEnd(q.to) } : {}),
            },
          }
        : {}),
    };

    const rows = await this.prisma.expense.findMany({
      where,
      take: limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      orderBy: { date: 'desc' },
      include: { shop: { select: { id: true, name: true } } },
    });

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    return {
      data: data.map((e) => ({ ...e, amount: toMoneyString(e.amount) })),
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }

  async create(businessId: string, dto: CreateExpenseDto, userId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: dto.shopId, businessId },
    });
    if (!shop) throw new NotFoundException('Duka haipo.');

    const expense = await this.prisma.expense.create({
      data: {
        businessId,
        shopId: dto.shopId,
        name: dto.name,
        amount: dto.amount,
        category: dto.category,
        date: dto.date ? new Date(dto.date) : new Date(),
        notes: dto.notes,
        isRecurring: dto.isRecurring ?? false,
        recurEvery: dto.recurEvery,
        createdBy: userId,
      },
    });
    return { ...expense, amount: toMoneyString(expense.amount) };
  }

  async detail(businessId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, businessId },
      include: { shop: { select: { id: true, name: true } } },
    });
    if (!expense) throw new NotFoundException('Gharama haipo.');
    return { ...expense, amount: toMoneyString(expense.amount) };
  }

  async update(businessId: string, id: string, dto: UpdateExpenseDto) {    const existing = await this.prisma.expense.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Gharama haipo.');

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.isRecurring !== undefined ? { isRecurring: dto.isRecurring } : {}),
        ...(dto.recurEvery !== undefined ? { recurEvery: dto.recurEvery } : {}),
      },
    });
    return { ...updated, amount: toMoneyString(updated.amount) };
  }

  async remove(businessId: string, id: string) {
    const existing = await this.prisma.expense.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Gharama haipo.');
    await this.prisma.expense.delete({ where: { id } });
    return { success: true };
  }

  async summary(businessId: string, shopId?: string, from?: string, to?: string) {
    const where: Prisma.ExpenseWhereInput = {
      businessId,
      ...(shopId ? { shopId } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const grouped = await this.prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: true,
    });

    const total = grouped.reduce(
      (acc, g) => acc.plus(g._sum.amount ?? 0),
      new Prisma.Decimal(0),
    );

    return {
      total: toMoneyString(total),
      byCategory: grouped.map((g) => ({
        category: g.category,
        amount: toMoneyString(g._sum.amount ?? 0),
        count: g._count,
      })),
    };
  }

  // ── Recurring expenses (F9) ───────────────────────────────

  private static intervalDays(recurEvery?: string | null): number | null {
    const v = (recurEvery ?? '').toLowerCase();
    if (['daily', 'kila siku', 'siku'].includes(v)) return 1;
    if (['weekly', 'kila wiki', 'wiki'].includes(v)) return 7;
    if (['monthly', 'kila mwezi', 'mwezi'].includes(v)) return 30;
    if (['quarterly', 'robo mwaka'].includes(v)) return 90;
    if (['yearly', 'annual', 'mwaka'].includes(v)) return 365;
    return null;
  }

  async recurring(businessId: string) {
    const templates = await this.prisma.expense.findMany({
      where: { businessId, isRecurring: true },
      orderBy: { date: 'asc' },
    });

    const rows = [];
    for (const t of templates) {
      const interval = ExpensesService.intervalDays(t.recurEvery);
      const latest = await this.prisma.expense.findFirst({
        where: {
          businessId,
          shopId: t.shopId,
          name: t.name,
          category: t.category,
        },
        orderBy: { date: 'desc' },
        select: { date: true },
      });
      const last = latest?.date ?? t.date;
      const nextDue = interval
        ? new Date(last.getTime() + interval * 86_400_000)
        : null;
      rows.push({
        id: t.id,
        name: t.name,
        category: t.category,
        amount: toMoneyString(t.amount),
        shopId: t.shopId,
        recurEvery: t.recurEvery,
        intervalDays: interval,
        lastGenerated: last,
        nextDue,
        due: nextDue ? nextDue <= new Date() : false,
      });
    }

    return {
      data: rows,
      total: rows.length,
      due: rows.filter((r) => r.due).length,
    };
  }

  /** Huundwa na `recurring` job kila siku. */
  async generateRecurring(businessId?: string) {
    const templates = await this.prisma.expense.findMany({
      where: {
        isRecurring: true,
        ...(businessId ? { businessId } : {}),
      },
    });

    let created = 0;
    let skipped = 0;
    const now = new Date();

    for (const template of templates) {
      const interval = ExpensesService.intervalDays(template.recurEvery);
      if (!interval) {
        skipped += 1;
        continue;
      }

      const latest = await this.prisma.expense.findFirst({
        where: {
          businessId: template.businessId,
          shopId: template.shopId,
          name: template.name,
          category: template.category,
        },
        orderBy: { date: 'desc' },
        select: { date: true },
      });

      let next = new Date(
        (latest?.date ?? template.date).getTime() + interval * 86_400_000,
      );

      // Ruka mpaka tarehe ya leo ikiwa job haikuendeshwa kwa muda mrefu.
      let guard = 0;
      while (next <= now && guard < 24) {
        await this.prisma.expense.create({
          data: {
            businessId: template.businessId,
            shopId: template.shopId,
            name: template.name,
            amount: template.amount,
            category: template.category,
            date: next,
            notes: template.notes,
            isRecurring: false,
            recurEvery: template.recurEvery,
            createdBy: template.createdBy,
          },
        });
        created += 1;
        next = new Date(next.getTime() + interval * 86_400_000);
        guard += 1;
      }
    }

    return { created, skipped, templates: templates.length };
  }
}
