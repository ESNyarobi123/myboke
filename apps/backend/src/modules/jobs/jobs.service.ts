import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  DebtStatus,
  MissionStatus,
  Prisma,
  SaleStatus,
  SubStatus,
} from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PushService } from '../../infra/push/push.service';
import { ExpensesService } from '../expenses/expenses.service';
import { GrowthService } from '../growth/growth.service';
import { PlatformService } from '../platform/platform.service';

export type JobName =
  | 'reports'
  | 'billing'
  | 'growth-missions'
  | 'growth-impact'
  | 'notifications'
  | 'expenses'
  | 'recurring-expenses'
  | 'digest'
  | 'maintenance';

const HOUR = 3_600_000;
const DAY = 86_400_000;

/** Siku ya EAT (UTC+3) kwa muundo YYYY-MM-DD. */
export function eatDate(d: Date = new Date()): string {
  return new Date(d.getTime() + 3 * HOUR).toISOString().slice(0, 10);
}

/** Mwanzo wa siku ya EAT (00:00 → 21:00 UTC ya siku iliyopita). */
export function startOfEatDay(date: string): Date {
  return new Date(`${date}T00:00:00.000+03:00`);
}

export interface JobResult {
  job: JobName;
  processed: number;
  details: Record<string, number | string>;
  durationMs: number;
}

@Injectable()
export class JobsService {
  private readonly log = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly growth: GrowthService,
    private readonly expenses: ExpensesService,
    private readonly platform: PlatformService,
    private readonly push: PushService,
  ) {}

  // ═════════════════════════════════════════════════════════
  // `reports` — pre-compute ripoti za kila siku (01:00 EAT)
  // ═════════════════════════════════════════════════════════
  async precomputeReports(date?: string): Promise<JobResult> {
    const started = Date.now();
    const day = date ?? eatDate(new Date(Date.now() - DAY));
    const from = startOfEatDay(day);
    const to = new Date(from.getTime() + DAY);

    const businesses = await this.prisma.business.findMany({
      select: { id: true },
    });

    let processed = 0;
    for (const business of businesses) {
      const shops = await this.prisma.shop.findMany({
        where: { businessId: business.id },
        select: { id: true },
      });

      const targets: { shopId: string | null }[] = [
        { shopId: null },
        ...shops.map((s) => ({ shopId: s.id })),
      ];

      for (const target of targets) {
        const scope = {
          businessId: business.id,
          saleDate: { gte: from, lt: to },
          status: {
            in: [
              SaleStatus.COMPLETED,
              SaleStatus.PARTIAL_REFUND,
              SaleStatus.REFUNDED,
            ],
          },
          ...(target.shopId ? { shopId: target.shopId } : {}),
        };

        const totals = await this.prisma.sale.aggregate({
          where: scope,
          _sum: {
            total: true,
            subtotal: true,
            costTotal: true,
            profit: true,
          },
          _count: true,
        });

        const expenses = await this.prisma.expense.aggregate({
          where: {
            businessId: business.id,
            date: { gte: from, lt: to },
            ...(target.shopId ? { shopId: target.shopId } : {}),
          },
          _sum: { amount: true },
        });

        const gross = new Prisma.Decimal(totals._sum?.total ?? 0);
        const net = new Prisma.Decimal(totals._sum?.subtotal ?? 0);
        const vat = gross.minus(net);
        const profit = new Prisma.Decimal(totals._sum?.profit ?? 0).minus(
          expenses._sum?.amount ?? 0,
        );

        const values = {
          grossSales: gross,
          netSales: net,
          vat,
          cogs: new Prisma.Decimal(totals._sum?.costTotal ?? 0),
          profit,
          expenses: new Prisma.Decimal(expenses._sum?.amount ?? 0),
          salesCount: totals._count,
        };

        const existing = await this.prisma.dailySnapshot.findFirst({
          where: {
            businessId: business.id,
            shopId: target.shopId,
            date: day,
          },
          select: { id: true },
        });

        if (existing) {
          await this.prisma.dailySnapshot.update({
            where: { id: existing.id },
            data: values,
          });
        } else {
          await this.prisma.dailySnapshot.create({
            data: {
              businessId: business.id,
              shopId: target.shopId,
              date: day,
              ...values,
            },
          });
        }
        processed += 1;
      }
    }

    return this.done('reports', processed, { date: day }, started);
  }

  // ═════════════════════════════════════════════════════════
  // `billing` — subscription expiry + invoices
  // ═════════════════════════════════════════════════════════
  async checkSubscriptions(): Promise<JobResult> {
    const started = Date.now();
    const now = new Date();
    const graceCutoff = new Date(now.getTime() - 7 * DAY);

    const subs = await this.prisma.subscription.findMany({
      where: {
        status: { in: [SubStatus.TRIAL, SubStatus.ACTIVE, SubStatus.PAST_DUE] },
        endsAt: { lt: now },
      },
      include: {
        invoices: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    let overdue = 0;
    let expired = 0;
    let notified = 0;

    for (const sub of subs) {
      const isExpired = sub.endsAt < graceCutoff;
      const nextStatus = isExpired ? SubStatus.EXPIRED : SubStatus.PAST_DUE;
      if (sub.status === nextStatus) continue;

      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: nextStatus },
      });
      if (isExpired) expired += 1;
      else overdue += 1;

      const owners = await this.owners(sub.businessId);
      const pending = sub.invoices[0];
      const title = isExpired ? 'Plan yako imeisha' : 'Plan yako inahitaji malipo';
      const body = isExpired
        ? `Plan ${sub.planId} imeisha. Lipa kuendelea kutumia MyBoke.`
        : `Plan ${sub.planId} ina deni. Lipa sasa kuepusha kusimamishwa.`;

      notified += await this.notify(owners, 'BILLING', title, body, {
        subscriptionId: sub.id,
        planId: sub.planId,
        status: nextStatus,
        invoiceId: pending?.id ?? null,
        checkoutUrl: pending?.checkoutUrl ?? null,
        endsAt: sub.endsAt.toISOString(),
      });
    }

    return this.done(
      'billing',
      subs.length,
      { overdue, expired, notified },
      started,
    );
  }

  /**
   * §10.10 — kumbusho la kuisha kwa plan siku 7, 3 na 1 kabla.
   * Inaepuka kurudia kumbusho la siku hiyo hiyo.
   */
  async sendRenewalReminders(): Promise<number> {
    const now = new Date();
    const dayStart = startOfEatDay(eatDate());
    let sent = 0;

    for (const daysLeft of [7, 3, 1]) {
      const from = new Date(dayStart.getTime() + daysLeft * DAY);
      const to = new Date(from.getTime() + DAY);

      const subs = await this.prisma.subscription.findMany({
        where: {
          status: { in: [SubStatus.TRIAL, SubStatus.ACTIVE] },
          endsAt: { gte: from, lt: to },
        },
        select: { id: true, businessId: true, planId: true, endsAt: true },
      });

      for (const sub of subs) {
        const owners = await this.owners(sub.businessId);
        if (owners.length === 0) continue;

        // Dedupe: kumbusho la siku hii kwa subscription hii tayari lipo?
        const already = await this.prisma.notification.count({
          where: {
            userId: { in: owners },
            type: 'BILLING',
            createdAt: { gte: dayStart },
            body: { contains: `${daysLeft} siku` },
          },
        });
        if (already > 0) continue;

        sent += await this.notify(
          owners,
          'BILLING',
          daysLeft === 1
            ? 'Plan yako inaisha kesho'
            : `Plan yako inaisha baada ya siku ${daysLeft}`,
          `Plan ${sub.planId} inaisha ${sub.endsAt.toISOString().slice(0, 10)} (siku ${daysLeft}). Lipa mapema kuepusha kukatika.`,
          { subscriptionId: sub.id, planId: sub.planId, daysLeft },
        );
      }
    }

    return sent;
  }

  // ═════════════════════════════════════════════════════════
  // `growth` — missions za leo + kufunga zilizopitwa na wakati
  // ═════════════════════════════════════════════════════════
  async generateDailyMissions(): Promise<JobResult> {
    const started = Date.now();
    const businesses = await this.prisma.business.findMany({
      select: { id: true },
    });

    let created = 0;
    let skipped = 0;

    for (const business of businesses) {
      for (const owner of await this.owners(business.id)) {
        try {
          // Usirudie missions za leo (job inaweza kuitwa mara kadhaa).
          const existing = await this.prisma.mission.count({
            where: {
              businessId: business.id,
              userId: owner,
              dueAt: { gte: startOfEatDay(eatDate()) },
            },
          });
          if (existing > 0) {
            skipped += 1;
            continue;
          }
          const missions = await this.growth.generateMissions(
            business.id,
            owner,
          );
          created += missions.length;
          if (missions.length > 0) {
            await this.notify(
              [owner],
              'GROWTH',
              'Mission mpya za leo ziko tayari',
              `Una mission ${missions.length} mpya. Fanya moja uanze kupata BokeCoins.`,
              { count: missions.length },
            );
          }
        } catch (error) {
          skipped += 1;
          this.log.warn(
            `Mission generation imeshindikana (${business.id}/${owner}): ${
              (error as Error).message
            }`,
          );
        }
      }
    }

    // Expire missions ambazo dueAt imepita zaidi ya siku 2 bila kukamilika.
    const expired = await this.prisma.mission.updateMany({
      where: {
        status: { in: [MissionStatus.PENDING, MissionStatus.ACTIVE] },
        dueAt: { lt: new Date(Date.now() - 2 * DAY) },
      },
      data: { status: MissionStatus.EXPIRED },
    });

    return this.done(
      'growth-missions',
      businesses.length,
      { created, expired: expired.count, skipped },
      started,
    );
  }

  /** Pima impact ya missions zilizokamilika siku 7 zilizopita (§H2). */
  async measureMissionImpact(): Promise<JobResult> {
    const started = Date.now();
    const cutoff = new Date(Date.now() - 7 * DAY);

    const missions = await this.prisma.mission.findMany({
      where: {
        status: MissionStatus.COMPLETED,
        impactAt: null,
        completedAt: { lte: cutoff },
      },
      select: { id: true, businessId: true, userId: true },
      take: 500,
    });

    let measured = 0;
    let failed = 0;
    for (const m of missions) {
      try {
        await this.growth.missionImpact(m.businessId, m.userId, m.id);
        measured += 1;
      } catch (error) {
        failed += 1;
        this.log.warn(
          `Impact imeshindikana (${m.id}): ${(error as Error).message}`,
        );
      }
    }

    return this.done('growth-impact', missions.length, { measured, failed }, started);
  }

  // ═════════════════════════════════════════════════════════
  // `notifications` — madeni yaliyochelewa + stock ndogo
  // ═════════════════════════════════════════════════════════
  async dailyNotifications(): Promise<JobResult> {
    const started = Date.now();
    const now = new Date();

    const businessIds = (
      await this.prisma.business.findMany({ select: { id: true } })
    ).map((b) => b.id);

    const overdue = await this.prisma.debt.findMany({
      where: {
        status: { in: [DebtStatus.OPEN, DebtStatus.PARTIAL] },
        dueDate: { lt: now },
      },
      select: {
        id: true,
        businessId: true,
        originalAmount: true,
        paidAmount: true,
      },
    });

    const perDebtBusiness = new Map<
      string,
      { count: number; amount: Prisma.Decimal }
    >();
    for (const debt of overdue) {
      const bucket = perDebtBusiness.get(debt.businessId) ?? {
        count: 0,
        amount: new Prisma.Decimal(0),
      };
      bucket.count += 1;
      bucket.amount = bucket.amount.plus(
        debt.originalAmount.minus(debt.paidAmount),
      );
      perDebtBusiness.set(debt.businessId, bucket);
    }

    let notified = 0;
    for (const [businessId, bucket] of perDebtBusiness) {
      const owners = await this.owners(businessId);
      notified += await this.notify(
        owners,
        'DEBT_OVERDUE',
        'Madeni yamechelewa',
        `Kuna madeni ${bucket.count} yaliyochelewa — jumla ${bucket.amount.toFixed(2)} TZS.`,
        { count: bucket.count, amount: bucket.amount.toFixed(2) },
      );
    }

    const markedOverdue = await this.prisma.debt.updateMany({
      where: {
        status: { in: [DebtStatus.OPEN, DebtStatus.PARTIAL] },
        dueDate: { lt: now },
        id: { in: overdue.map((d) => d.id) },
      },
      data: { status: DebtStatus.OVERDUE },
    });

    const overdueDebts = markedOverdue;

    // Threshold ni per-product (alertLevel) — Prisma hailinganishi columns mbili,
    // kwa hiyo tunachuja baada ya kusoma (indexed kwa businessId).
    const levels = await this.prisma.stockLevel.findMany({
      where: {
        product: { businessId: { in: businessIds }, isActive: true },
      },
      include: {
        product: { select: { name: true, businessId: true, alertLevel: true } },
      },
    });

    const lowStock = levels.filter(
      (level) =>
        level.product.alertLevel > 0 &&
        Number(level.quantity) <= level.product.alertLevel,
    );

    const perBusiness = new Map<string, string[]>();
    for (const level of lowStock) {
      const list = perBusiness.get(level.product.businessId) ?? [];
      if (!list.includes(level.product.name) && list.length < 5) {
        list.push(level.product.name);
      }
      perBusiness.set(level.product.businessId, list);
    }

    for (const [businessId, names] of perBusiness) {
      const owners = await this.owners(businessId);
      notified += await this.notify(
        owners,
        'LOW_STOCK',
        'Bidhaa zinakaribia kuisha',
        `${names.length === 5 ? '5+' : names.length} bidhaa zina stock ndogo: ${names.slice(0, 5).join(', ')}.`,
        { products: names },
      );
    }

    // §10.10 — expiry inakaribia (push 07:00).
    const until = new Date(now.getTime() + 30 * DAY);
    const expiring = await this.prisma.product.findMany({
      where: {
        isActive: true,
        hasExpiry: true,
        expiryDate: { not: null, lte: until },
      },
      select: { businessId: true, name: true, expiryDate: true },
      orderBy: { expiryDate: 'asc' },
    });

    const expiringByBusiness = new Map<string, string[]>();
    for (const product of expiring) {
      const list = expiringByBusiness.get(product.businessId) ?? [];
      if (list.length < 5) {
        const daysLeft = Math.ceil(
          ((product.expiryDate as Date).getTime() - now.getTime()) / DAY,
        );
        list.push(
          `${product.name} (${daysLeft < 0 ? 'imeisha muda' : `siku ${daysLeft}`})`,
        );
      }
      expiringByBusiness.set(product.businessId, list);
    }

    for (const [businessId, names] of expiringByBusiness) {
      const owners = await this.owners(businessId);
      notified += await this.notify(
        owners,
        'EXPIRY',
        'Bidhaa zinazoisha muda',
        `${names.length === 5 ? '5+' : names.length} bidhaa zinaisha muda hivi karibuni: ${names.join(', ')}.`,
        { products: names },
      );
    }

    return this.done(
      'notifications',
      overdueDebts.count + perBusiness.size + expiringByBusiness.size,
      {
        notified,
        overdueDebts: overdueDebts.count,
        lowStockProducts: lowStock.length,
        expiringProducts: expiring.length,
      },
      started,
    );
  }

  // ═════════════════════════════════════════════════════════
  // `expenses` — gharama zinazorudi (F9)
  // ═════════════════════════════════════════════════════════
  async recurringExpenses(): Promise<JobResult> {
    const started = Date.now();
    const out = await this.expenses.generateRecurring();
    return this.done('recurring-expenses' as JobName, out.created, {
      templates: out.templates,
      created: out.created,
      skipped: out.skipped,
    }, started);
  }

  // ═════════════════════════════════════════════════════════
  // `digest` — muhtasari wa kila siku (G11)
  // ═════════════════════════════════════════════════════════
  async dailyDigest(): Promise<JobResult> {
    const started = Date.now();
    const out = await this.platform.runDigests();
    return this.done('digest' as JobName, out.notifications, out, started);
  }

  // ═════════════════════════════════════════════════════════
  // `maintenance` — cleanup tokens, OTP, sync ops
  // ═════════════════════════════════════════════════════════
  async maintenance(): Promise<JobResult> {
    const started = Date.now();
    const now = new Date();

    // A10 — safisha demo tenants zilizoisha muda (siku 1).
    const demoIds = (
      await this.prisma.business.findMany({
        where: { isDemo: true, demoExpiresAt: { lt: now } },
        select: { id: true },
      })
    ).map((b) => b.id);
    if (demoIds.length > 0) {
      const demoMembers = await this.prisma.membership.findMany({
        where: { businessId: { in: demoIds } },
        select: { userId: true },
      });
      await this.prisma.business.deleteMany({ where: { id: { in: demoIds } } });
      await this.prisma.user.deleteMany({
        where: {
          id: { in: demoMembers.map((m) => m.userId) },
          memberships: { none: {} },
        },
      });
    }

    const [tokens, otps, resets, audits, syncOps, notifications, exports] =
      await Promise.all([
        this.prisma.refreshToken.deleteMany({
          where: {
            OR: [
              { expiresAt: { lt: new Date(now.getTime() - 30 * DAY) } },
              { revokedAt: { lt: new Date(now.getTime() - 30 * DAY) } },
            ],
          },
        }),
        this.prisma.otpCode.deleteMany({
          where: { expiresAt: { lt: new Date(now.getTime() - DAY) } },
        }),
        this.prisma.passwordResetToken.deleteMany({
          where: { expiresAt: { lt: new Date(now.getTime() - 7 * DAY) } },
        }),
        this.prisma.auditLog.deleteMany({
          where: { createdAt: { lt: new Date(now.getTime() - 180 * DAY) } },
        }),
        this.prisma.syncOperation.deleteMany({
          where: { createdAt: { lt: new Date(now.getTime() - 90 * DAY) } },
        }),
        this.prisma.notification.deleteMany({
          where: {
            createdAt: { lt: new Date(now.getTime() - 90 * DAY) },
            readAt: { not: null },
          },
        }),
        this.prisma.exportJob.deleteMany({
          where: {
            status: { in: ['DONE', 'FAILED'] },
            createdAt: { lt: new Date(now.getTime() - 30 * DAY) },
          },
        }),
      ]);

    const processed =
      tokens.count +
      otps.count +
      resets.count +
      audits.count +
      syncOps.count +
      notifications.count +
      exports.count;

    return this.done(
      'maintenance',
      processed,
      {
        refreshTokens: tokens.count,
        otps: otps.count,
        passwordResets: resets.count,
        auditLogs: audits.count,
        syncOperations: syncOps.count,
        notifications: notifications.count,
        exportJobs: exports.count,
        demoBusinesses: demoIds.length,
      },
      started,
    );
  }

  // ═════════════════════════════════════════════════════════
  // Runner
  // ═════════════════════════════════════════════════════════
  async run(job: string, date?: string): Promise<JobResult> {
    switch (job) {
      case 'reports':
        return this.precomputeReports(date);
      case 'billing': {
        const base = await this.checkSubscriptions();
        const reminders = await this.sendRenewalReminders();
        return { ...base, details: { ...base.details, reminders } };
      }
      case 'growth':
      case 'growth-missions':
        return this.generateDailyMissions();
      case 'growth-impact':
        return this.measureMissionImpact();
      case 'expenses':
      case 'recurring-expenses':
        return this.recurringExpenses();
      case 'notifications':
        return this.dailyNotifications();
      case 'digest':
      case 'notifications-digest':
        return this.dailyDigest();
      case 'maintenance':
        return this.maintenance();
      default:
        throw new NotFoundException({
          code: 'UNKNOWN_JOB',
          message: `Job "${job}" haipo. Chagua: reports, billing, growth, growth-impact, notifications, maintenance.`,
        });
    }
  }

  async status() {
    const [snapshots, missions, tokens, syncOps] = await Promise.all([
      this.prisma.dailySnapshot.count(),
      this.prisma.mission.count({ where: { status: MissionStatus.PENDING } }),
      this.prisma.refreshToken.count(),
      this.prisma.syncOperation.count(),
    ]);
    return {
      queues: {
        exports: 'on-demand',
        reports: 'cron 01:00 EAT',
        notifications: 'cron 07:00 EAT',
        billing: 'cron 06:00 EAT',
        growth: 'cron 05:00 EAT',
        maintenance: 'cron 02:00 EAT',
      },
      counters: { snapshots, pendingMissions: missions, refreshTokens: tokens, syncOperations: syncOps },
    };
  }

  // ── helpers ───────────────────────────────────────────────
  private done(
    job: JobName,
    processed: number,
    details: Record<string, number | string>,
    started: number,
  ): JobResult {
    const durationMs = Date.now() - started;
    this.log.log(`job ${job}: ${JSON.stringify(details)} (${durationMs}ms)`);
    return { job, processed, details, durationMs };
  }

  private async owners(businessId: string) {
    const rows = await this.prisma.membership.findMany({
      where: {
        businessId,
        isActive: true,
        role: { in: ['OWNER', 'MANAGER'] },
      },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }

  private async notify(
    userIds: string[],
    type: string,
    title: string,
    body: string,
    data?: Prisma.InputJsonValue,
  ) {
    if (userIds.length === 0) return 0;
    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        title,
        body,
        data: data ?? Prisma.JsonNull,
      })),
    });

    // §10.10 — push kwa vifaa vilivyosajiliwa (best-effort, haizuii job).
    try {
      const devices = await this.prisma.device.findMany({
        where: { userId: { in: userIds }, fcmToken: { not: null } },
        select: { fcmToken: true },
      });
      const tokens = devices
        .map((d) => d.fcmToken)
        .filter((t): t is string => Boolean(t));
      if (tokens.length > 0) {
        await this.push.send(
          tokens,
          title,
          body,
          (data as Record<string, unknown> | undefined) ?? undefined,
        );
      }
    } catch (error) {
      this.log.warn(`Push imeshindikana: ${(error as Error).message}`);
    }

    return userIds.length;
  }
}
