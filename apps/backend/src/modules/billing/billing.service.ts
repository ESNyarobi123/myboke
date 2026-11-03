import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CommissionStatus, InvoiceStatus, Prisma, SubStatus } from '@prisma/client';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CancelSubscriptionDto, CheckoutDto, SnippeWebhookDto } from './dto/billing.dto';

/** Punguzo kwa miezi mingi (inahamasisha cash-flow). */
const MONTH_DISCOUNTS: Record<number, number> = {
  1: 0,
  3: 0.05,
  6: 0.1,
  12: 0.15,
};

export interface SnippeCheckoutResult {
  reference: string;
  checkoutUrl: string;
  provider: string;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger('Billing');

  constructor(private readonly prisma: PrismaService) {}

  // ── Plans ─────────────────────────────────────────────────
  async plans() {
    const plans = await this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
    });

    return {
      currency: 'TZS',
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        monthlyPrice: p.monthlyPrice.toFixed(2),
        annualPrice: p.monthlyPrice.mul(12).mul(0.85).toFixed(2),
        maxShops: p.maxShops,
        maxSellers: p.maxSellers,
        features: p.features,
        discounts: MONTH_DISCOUNTS,
      })),
      periods: [1, 3, 6, 12].map((months) => ({
        months,
        discountPercent: (MONTH_DISCOUNTS[months] ?? 0) * 100,
      })),
    };
  }

  private priceFor(monthlyPrice: Prisma.Decimal, months: number) {
    const discount = MONTH_DISCOUNTS[months] ?? 0;
    const gross = monthlyPrice.mul(months);
    const amount = gross.mul(1 - discount);
    return {
      gross: gross.toFixed(2),
      discountPercent: discount * 100,
      amount: amount.toFixed(2),
      amountDecimal: amount,
    };
  }

  // ── Current subscription ──────────────────────────────────
  async current(businessId: string) {
    const [subscription, planList, shops, sellers, products] = await Promise.all([
      this.prisma.subscription.findUnique({ where: { businessId } }),
      this.prisma.plan.findMany({ where: { isActive: true } }),
      this.prisma.shop.count({ where: { businessId, isActive: true } }),
      this.prisma.membership.count({
        where: { businessId, isActive: true, role: { in: ['MANAGER', 'CASHIER'] } },
      }),
      this.prisma.product.count({ where: { businessId, isActive: true } }),
    ]);

    if (!subscription) {
      const free = planList.find((p) => p.id === 'free');
      return {
        subscription: null,
        plan: free
          ? {
              id: free.id,
              name: free.name,
              monthlyPrice: free.monthlyPrice.toFixed(2),
              maxShops: free.maxShops,
              maxSellers: free.maxSellers,
              features: free.features,
            }
          : null,
        status: 'NONE',
        usage: { shops, sellers, products },
        limits: free
          ? { shops: free.maxShops, sellers: free.maxSellers }
          : { shops: 1, sellers: 1 },
        canAddShop: !free || shops < free.maxShops,
        canAddSeller: !free || sellers < free.maxSellers,
      };
    }

    const plan = planList.find((p) => p.id === subscription.planId);
    const now = new Date();
    const expired = subscription.endsAt < now;
    const daysLeft = Math.max(
      Math.ceil((subscription.endsAt.getTime() - now.getTime()) / 86_400_000),
      0,
    );

    return {
      subscription: {
        id: subscription.id,
        status: expired ? SubStatus.EXPIRED : subscription.status,
        planId: subscription.planId,
        startsAt: subscription.startsAt,
        endsAt: subscription.endsAt,
        daysLeft,
        autoRenew: subscription.autoRenew,
        cancelledAt: subscription.cancelledAt,
      },
      plan: plan
        ? {
            id: plan.id,
            name: plan.name,
            monthlyPrice: plan.monthlyPrice.toFixed(2),
            maxShops: plan.maxShops,
            maxSellers: plan.maxSellers,
            features: plan.features,
          }
        : null,
      usage: { shops, sellers, products },
      limits: plan
        ? { shops: plan.maxShops, sellers: plan.maxSellers }
        : { shops: 1, sellers: 1 },
      canAddShop: !plan || shops < plan.maxShops,
      canAddSeller: !plan || sellers >= plan.maxSellers ? false : true,
      warning:
        daysLeft <= 3 && !expired
          ? `Plan yako inaisha siku ${daysLeft}. Lipa kuendelea.`
          : null,
    };
  }

  // ── Checkout ──────────────────────────────────────────────
  async checkout(businessId: string, userId: string, dto: CheckoutDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plan haipo.');
    }
    if (plan.monthlyPrice.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Plan ya bure haina malipo.');
    }

    let subscription = await this.prisma.subscription.findUnique({
      where: { businessId },
    });

    if (!subscription) {
      subscription = await this.prisma.subscription.create({
        data: {
          businessId,
          planId: dto.planId,
          status: SubStatus.TRIAL,
          endsAt: new Date(),
        },
      });
    }

    // Thibitisha code ya wakala kama imetolewa
    let partnerId: string | null = subscription.partnerId ?? null;
    if (dto.referralCode) {
      const partner = await this.prisma.partner.findFirst({
        where: { code: dto.referralCode.toUpperCase(), isActive: true },
      });
      if (!partner) {
        throw new BadRequestException('Code ya wakala si sahihi.');
      }
      partnerId = partner.id;
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { partnerId: partner.id, referralCode: partner.code },
      });
    }

    const pricing = this.priceFor(plan.monthlyPrice, dto.months);
    const paymentKey = `MYB-${randomBytes(8).toString('hex').toUpperCase()}`;

    const invoice = await this.prisma.invoice.create({
      data: {
        subscriptionId: subscription.id,
        businessId,
        planId: plan.id,
        amount: pricing.amount,
        months: dto.months,
        paymentKey,
        phone: dto.phone,
        status: InvoiceStatus.PENDING,
      },
    });

    const result = await this.initiatePayment({
      paymentKey,
      amount: pricing.amount,
      phone: dto.phone,
      description: `MyBoke ${plan.name} — miezi ${dto.months}`,
      provider: dto.provider ?? 'snippe',
      businessId,
      planId: plan.id,
      months: dto.months,
    });

    const updated = await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { reference: result.reference, checkoutUrl: result.checkoutUrl },
    });

    return {
      invoiceId: updated.id,
      reference: result.reference,
      paymentKey,
      checkoutUrl: result.checkoutUrl,
      provider: result.provider,
      plan: { id: plan.id, name: plan.name },
      months: dto.months,
      amount: pricing.amount,
      currency: 'TZS',
      pricing: {
        monthlyPrice: plan.monthlyPrice.toFixed(2),
        gross: pricing.gross,
        discountPercent: pricing.discountPercent,
        total: pricing.amount,
        currency: 'TZS',
      },
      phone: dto.phone,
      status: updated.status,
      expiresInMinutes: 30,
      note: 'Baada ya malipo, subscription itawashwa kiotomatiki kupitia webhook.',
    };
  }

  private async initiatePayment(input: {
    paymentKey: string;
    amount: string;
    phone: string;
    description: string;
    provider: string;
    businessId: string;
    planId: string;
    months: number;
  }): Promise<SnippeCheckoutResult> {
    const apiKey = process.env.SNIPPE_API_KEY;

    if (!apiKey) {
      this.logger.warn(
        'SNIPPE_API_KEY haipo — tunatumia sandbox checkout URL (dev only).',
      );
      return {
        reference: input.paymentKey,
        checkoutUrl: `https://sandbox.snippe.sh/pay/${input.paymentKey}`,
        provider: 'snippe-sandbox',
      };
    }

    try {
      const res = await fetch('https://api.snippe.sh/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          amount: Number(input.amount),
          currency: 'TZS',
          phone: input.phone,
          description: input.description,
          reference: input.paymentKey,
          metadata: {
            businessId: input.businessId,
            planId: input.planId,
            months: input.months,
          },
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Snippe checkout imeshindikana (${res.status}): ${body}`);
        throw new BadRequestException(
          'Malipo hayakuweza kuanzishwa. Jaribu tena baadaye.',
        );
      }

      const json = (await res.json()) as {
        data?: { reference?: string; checkout_url?: string };
        reference?: string;
        checkout_url?: string;
      };
      const data = json.data ?? json;

      return {
        reference: data.reference ?? input.paymentKey,
        checkoutUrl: data.checkout_url ?? `https://sandbox.snippe.sh/pay/${input.paymentKey}`,
        provider: 'snippe',
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Snippe error: ${String(error)}`);
      throw new BadRequestException('Mtandao wa malipo haupatikani. Jaribu tena.');
    }
  }

  async checkoutStatus(businessId: string, reference: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        businessId,
        OR: [{ reference }, { paymentKey: reference }, { id: reference }],
      },
      include: { subscription: true },
    });
    if (!invoice) throw new NotFoundException('Malipo hayapo.');

    const plan = invoice.planId
      ? await this.prisma.plan.findUnique({ where: { id: invoice.planId } })
      : null;

    return {
      invoiceId: invoice.id,
      reference: invoice.reference,
      paymentKey: invoice.paymentKey,
      status: invoice.status,
      amount: invoice.amount.toFixed(2),
      currency: 'TZS',
      months: invoice.months,
      plan: plan ? { id: plan.id, name: plan.name } : null,
      checkoutUrl: invoice.checkoutUrl,
      paidAt: invoice.paidAt,
      activated: invoice.status === InvoiceStatus.PAID,
      subscriptionEndsAt: invoice.subscription.endsAt,
    };
  }

  // ── Webhook ───────────────────────────────────────────────
  async handleWebhook(
    rawBody: string | undefined,
    signature: string | undefined,
    payload: SnippeWebhookDto,
  ) {
    this.verifySignature(rawBody, signature);

    const paymentKey = payload.paymentKey ?? payload.reference;
    if (!paymentKey) {
      throw new BadRequestException('Webhook haina paymentKey/reference.');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: {
        OR: [{ paymentKey }, { reference: paymentKey }],
      },
      include: { subscription: true },
    });

    if (!invoice) {
      this.logger.warn(`Webhook kwa paymentKey isiyojulikana: ${paymentKey}`);
      // Rudisha 200 ili Snippe isirudie bila sababu
      return { received: true, ignored: true, reason: 'invoice_not_found' };
    }

    if (invoice.status === InvoiceStatus.PAID) {
      return { received: true, idempotent: true, status: 'already_paid' };
    }

    const status = (payload.status ?? 'COMPLETED').toUpperCase();
    const isSuccess = ['COMPLETED', 'SUCCESS', 'PAID', 'SUCCESSFUL'].includes(status);

    if (!isSuccess) {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status:
            status === 'FAILED' || status === 'CANCELLED'
              ? InvoiceStatus.FAILED
              : InvoiceStatus.PENDING,
        },
      });
      return { received: true, status: 'updated', invoiceStatus: status };
    }

    const plan = invoice.planId
      ? await this.prisma.plan.findUnique({ where: { id: invoice.planId } })
      : null;

    const now = new Date();
    const base = invoice.subscription.endsAt > now ? invoice.subscription.endsAt : now;
    const newEndsAt = new Date(
      base.getTime() + invoice.months * 30 * 86_400_000,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const paidInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.PAID,
          paidAt: payload.paidAt ? new Date(payload.paidAt) : new Date(),
          reference: payload.reference ?? invoice.reference,
        },
      });

      const subscription = await tx.subscription.update({
        where: { id: invoice.subscriptionId },
        data: {
          planId: invoice.planId ?? invoice.subscription.planId,
          status: SubStatus.ACTIVE,
          startsAt: invoice.subscription.endsAt > now ? invoice.subscription.startsAt : now,
          endsAt: newEndsAt,
          cancelledAt: null,
          lastPaymentKey: invoice.paymentKey,
        },
      });

      // Commission ya wakala
      let commission: { id: string; amount: string } | null = null;
      if (subscription.partnerId) {
        const partner = await tx.partner.findUnique({
          where: { id: subscription.partnerId },
        });
        if (partner && partner.isActive) {
          const amount = invoice.amount.mul(
            partner.commissionRate.dividedBy(100),
          );
          const c = await tx.commission.create({
            data: {
              partnerId: partner.id,
              invoiceId: paidInvoice.id,
              amount: amount.toFixed(2),
              status: CommissionStatus.PENDING,
            },
          });
          commission = { id: c.id, amount: c.amount.toFixed(2) };
        }
      }

      const owner = await tx.membership.findFirst({
        where: { businessId: invoice.subscription.businessId, role: 'OWNER' },
        select: { userId: true },
      });
      if (owner?.userId) {
        await tx.notification.create({
          data: {
            userId: owner.userId,
            type: 'BILLING',
            title: 'Malipo yamekamilika',
            body: `Plan ${plan?.name ?? invoice.planId} imewashwa hadi ${newEndsAt.toLocaleDateString('en-GB')}.`,
            data: { invoiceId: invoice.id, planId: invoice.planId },
          },
        });
      }

      return { paidInvoice, subscription, commission };
    });

    return {
      received: true,
      status: 'activated',
      invoiceId: result.paidInvoice.id,
      planId: result.subscription.planId,
      endsAt: result.subscription.endsAt,
      commission: result.commission,
    };
  }

  private verifySignature(rawBody: string | undefined, signature: string | undefined) {
    const secret = process.env.SNIPPE_WEBHOOK_SECRET;

    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException('Webhook secret haipo.');
      }
      this.logger.warn('SNIPPE_WEBHOOK_SECRET haipo — signature haijathibitishwa (dev).');
      return;
    }

    if (!signature) {
      throw new UnauthorizedException('Signature haipo.');
    }

    const body = rawBody ?? '';
    if (!body) {
      throw new UnauthorizedException('Raw body haipo — hakikisha rawBody imewashwa.');
    }

    const expected = createHmac('sha256', secret).update(body).digest('hex');
    const provided = signature.replace(/^sha256=/, '').trim();

    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(provided, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Signature si sahihi.');
    }
  }

  // ── Invoices ──────────────────────────────────────────────
  async invoices(businessId: string, limit = 50) {
    const data = await this.prisma.invoice.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });

    const plans = await this.prisma.plan.findMany({
      select: { id: true, name: true },
    });
    const nameById = new Map(plans.map((p) => [p.id, p.name]));

    return {
      currency: 'TZS',
      count: data.length,
      data: data.map((i) => ({
        id: i.id,
        planId: i.planId,
        planName: i.planId ? (nameById.get(i.planId) ?? null) : null,
        amount: i.amount.toFixed(2),
        months: i.months,
        status: i.status,
        paymentKey: i.paymentKey,
        reference: i.reference,
        paidAt: i.paidAt,
        createdAt: i.createdAt,
      })),
    };
  }

  async cancel(businessId: string, dto: CancelSubscriptionDto) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId },
    });
    if (!subscription) throw new NotFoundException('Hakuna subscription.');

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { autoRenew: false, cancelledAt: new Date() },
    });

    return {
      success: true,
      cancelledAt: updated.cancelledAt,
      note: dto.reason ?? 'Subscription itaendelea hadi tarehe ya mwisho.',
      endsAt: updated.endsAt,
    };
  }

  /** Uhakiki wa mipaka (hutumika na modules nyingine). */
  async assertLimit(
    businessId: string,
    kind: 'shops' | 'sellers' | 'products',
  ) {
    const sub = await this.prisma.subscription.findUnique({
      where: { businessId },
      include: {},
    });
    const plan = sub
      ? await this.prisma.plan.findUnique({ where: { id: sub.planId } })
      : await this.prisma.plan.findUnique({ where: { id: 'free' } });

    if (!plan) return;

    if (kind === 'shops') {
      const count = await this.prisma.shop.count({
        where: { businessId, isActive: true },
      });
      if (count >= plan.maxShops) {
        throw new ForbiddenException({
          code: 'PLAN_LIMIT_REACHED',
          message: `Plan ${plan.name} inaruhusu maduka ${plan.maxShops}. Panda plan.`,
          limit: plan.maxShops,
        });
      }
    }

    if (kind === 'sellers') {
      const count = await this.prisma.membership.count({
        where: { businessId, isActive: true, role: { in: ['MANAGER', 'CASHIER'] } },
      });
      if (count >= plan.maxSellers) {
        throw new ForbiddenException({
          code: 'PLAN_LIMIT_REACHED',
          message: `Plan ${plan.name} inaruhusu wauzaji ${plan.maxSellers}. Panda plan.`,
          limit: plan.maxSellers,
        });
      }
    }

    if (kind === 'products' && plan.maxProducts !== null) {
      const count = await this.prisma.product.count({
        where: { businessId, isActive: true },
      });
      if (count >= plan.maxProducts) {
        throw new ForbiddenException({
          code: 'PLAN_LIMIT_REACHED',
          message: `Plan ${plan.name} inaruhusu bidhaa ${plan.maxProducts}. Panda plan kuongeza.`,
          limit: plan.maxProducts,
        });
      }
    }
  }
}
