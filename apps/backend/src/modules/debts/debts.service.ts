import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DebtStatus, DebtType, Prisma } from '@prisma/client';
import { Paginated } from '../../common/dto/pagination.dto';
import { toMoneyString } from '../../common/utils/money.util';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  CreateDebtDto,
  DebtPaymentDto,
  ListDebtsQueryDto,
  UpdateDebtDto,
} from './dto/debt.dto';

@Injectable()
export class DebtsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(businessId: string, q: ListDebtsQueryDto): Promise<Paginated<unknown>> {
    const limit = Math.min(Number(q.limit ?? 50), 200);
    const where: Prisma.DebtWhereInput = {
      businessId,
      ...(q.type ? { type: q.type } : {}),
      ...(q.status ? { status: q.status as DebtStatus } : {}),
    };

    const rows = await this.prisma.debt.findMany({
      where,
      take: limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    return {
      data: data.map((d) => this.serialize(d)),
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }

  async summary(businessId: string) {
    const debts = await this.prisma.debt.findMany({ where: { businessId } });

    let oweMe = new Prisma.Decimal(0);
    let iOwe = new Prisma.Decimal(0);
    let overdue = new Prisma.Decimal(0);
    let overdueCount = 0;
    const now = new Date();

    for (const d of debts) {
      const remaining = new Prisma.Decimal(d.originalAmount).minus(d.paidAmount);
      if (remaining.lessThanOrEqualTo(0)) continue;

      if (d.type === DebtType.OWE_ME) oweMe = oweMe.plus(remaining);
      else iOwe = iOwe.plus(remaining);

      if (d.dueDate && d.dueDate < now) {
        overdue = overdue.plus(remaining);
        overdueCount += 1;
      }
    }

    return {
      oweMe: toMoneyString(oweMe),
      iOwe: toMoneyString(iOwe),
      overdue: toMoneyString(overdue),
      overdueCount,
      totalCount: debts.length,
    };
  }

  async create(businessId: string, dto: CreateDebtDto) {
    const debt = await this.prisma.debt.create({
      data: {
        businessId,
        type: dto.type,
        personName: dto.personName,
        personPhone: dto.personPhone,
        customerId: dto.customerId,
        originalAmount: dto.originalAmount,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        status: DebtStatus.OPEN,
      },
    });
    return this.serialize(debt);
  }

  async update(businessId: string, id: string, dto: UpdateDebtDto) {
    const existing = await this.findOne(businessId, id);
    const updated = await this.prisma.debt.update({
      where: { id: existing.id },
      data: {
        ...(dto.personName !== undefined ? { personName: dto.personName } : {}),
        ...(dto.personPhone !== undefined ? { personPhone: dto.personPhone } : {}),
        ...(dto.originalAmount !== undefined
          ? { originalAmount: dto.originalAmount }
          : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.dueDate !== undefined
          ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
          : {}),
      },
    });
    return this.serialize(updated);
  }

  async addPayment(
    businessId: string,
    id: string,
    dto: DebtPaymentDto,
    userId: string,
  ) {
    const debt = await this.findOne(businessId, id);
    const remaining = new Prisma.Decimal(debt.originalAmount).minus(
      debt.paidAmount,
    );
    const amount = new Prisma.Decimal(dto.amount);

    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Kiasi kiwe zaidi ya 0.');
    }
    if (amount.greaterThan(remaining)) {
      throw new BadRequestException(
        `Kiasi kinazidi salio. Salio: ${remaining.toFixed(2)}`,
      );
    }

    const newPaid = new Prisma.Decimal(debt.paidAmount).plus(amount);
    const isPaid = newPaid.greaterThanOrEqualTo(debt.originalAmount);

    const [, updated] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          businessId,
          debtId: id,
          amount,
          method: dto.method,
          reference: dto.reference,
          recordedBy: userId,
        },
      }),
      this.prisma.debt.update({
        where: { id },
        data: {
          paidAmount: newPaid,
          status: isPaid ? DebtStatus.PAID : DebtStatus.PARTIAL,
        },
      }),
    ]);

    return this.serialize(updated);
  }

  /**
   * §8 — kumbusho la deni kwa ngazi 3:
   * siku 0 (due) = upole · +7 = makali · +14 = la mwisho.
   */
  async remind(businessId: string, id: string) {
    const debt = await this.findOne(businessId, id);
    const remaining = new Prisma.Decimal(debt.originalAmount).minus(
      debt.paidAmount,
    );

    const now = new Date();
    const daysSinceDue = debt.dueDate
      ? Math.floor((now.getTime() - debt.dueDate.getTime()) / 86_400_000)
      : 0;

    const tier = daysSinceDue >= 14 ? 3 : daysSinceDue >= 7 ? 2 : 1;
    const amount = remaining.toFixed(2);
    const name = debt.personName;

    const message =
      tier === 3
        ? `Habari ${name}, huu ni ukumbusho wa MWISHO: deni lako ni TSh ${amount}. Tafadhali lipa mara moja ili kuepuka hatua zaidi. Asante.`
        : tier === 2
          ? `Habari ${name}, deni lako limefikia TSh ${amount}. Tafadhali lipa mapema ili kuepuka usumbufu. Asante.`
          : `Habari ${name}, natumai uko salama. Kumbusho la upole: deni lako ni TSh ${amount}.${
              debt.dueDate
                ? ` Tarehe ya malipo: ${debt.dueDate.toISOString().slice(0, 10)}.`
                : ''
            } Asante.`;

    await this.prisma.debt.update({
      where: { id },
      data: { lastReminderAt: now },
    });

    const phone = (debt.personPhone ?? '').replace(/^0/, '255');

    return {
      whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      message,
      remaining: toMoneyString(remaining),
      tier,
      daysSinceDue: Math.max(0, daysSinceDue),
    };
  }

  async remove(businessId: string, id: string) {
    await this.findOne(businessId, id);
    await this.prisma.debt.delete({ where: { id } });
    return { success: true };
  }

  async detail(businessId: string, id: string) {
    const debt = await this.prisma.debt.findFirst({
      where: { id, businessId },
      include: { customer: true },
    });
    if (!debt) throw new NotFoundException('Deni haipo.');

    const payments = await this.prisma.payment.findMany({
      where: { debtId: id },
      orderBy: { paidAt: 'desc' },
    });

    return {
      ...this.serialize(debt as never),
      payments: payments.map((p) => ({ ...p, amount: toMoneyString(p.amount) })),
    };
  }

  private async findOne(businessId: string, id: string) {
    const debt = await this.prisma.debt.findFirst({ where: { id, businessId } });
    if (!debt) throw new NotFoundException('Deni haipo.');
    return debt;
  }

  private serialize(debt: Record<string, any>) {
    return {
      ...debt,
      originalAmount: toMoneyString(debt.originalAmount),
      paidAmount: toMoneyString(debt.paidAmount),
      remaining: toMoneyString(
        new Prisma.Decimal(debt.originalAmount ?? 0).minus(debt.paidAmount ?? 0),
      ),
      isOverdue: Boolean(debt.dueDate && new Date(debt.dueDate) < new Date()),
    };
  }
}
