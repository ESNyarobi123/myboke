import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MissionStatus, Prisma, SaleStatus } from '@prisma/client';
import {
  endOfDayEAT,
  startOfDayEAT,
  startOfMonthEAT,
  rangeEnd,
  rangeStart,
} from '../../common/utils/date.util';
import { toMoneyString } from '../../common/utils/money.util';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  AssistantChatDto,
  CreateDemandDto,
  CreatePosterDto,
  RedeemCoinsDto,
} from './dto/growth.dto';

const COIN_REWARDS = {
  DEMAND: 10,
  FIRST_SALE: 2,
  MISSION_MIN: 20,
  MISSION_MAX: 50,
  ONBOARDING: 100,
  STOCK_COUNT: 15,
} as const;

const REDEEM_COSTS = {
  AIRTIME_1000: 500,
  VOUCHER_300: 300,
  POSTER_50: 50,
} as const;

const COINS = "'gold'";

@Injectable()
export class GrowthService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  // BOKECOINS
  // ═══════════════════════════════════════════════════════════
  async balance(userId: string) {
    const agg = await this.prisma.coinTransaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    const earned = await this.prisma.coinTransaction.aggregate({
      where: { userId, amount: { gt: 0 } },
      _sum: { amount: true },
    });
    const spent = await this.prisma.coinTransaction.aggregate({
      where: { userId, amount: { lt: 0 } },
      _sum: { amount: true },
    });

    const balance = Math.max(agg._sum.amount ?? 0, 0);
    const nextReward = this.nextMilestone(balance);

    return {
      balance,
      earned: earned._sum.amount ?? 0,
      spent: Math.abs(spent._sum.amount ?? 0),
      currency: COINS,
      nextMilestone: nextReward,
      rates: {
        earn: {
          demandRecord: COIN_REWARDS.DEMAND,
          firstSaleOfDay: COIN_REWARDS.FIRST_SALE,
          missionComplete: `${COIN_REWARDS.MISSION_MIN}-${COIN_REWARDS.MISSION_MAX}`,
          onboarding: COIN_REWARDS.ONBOARDING,
          stockCount: COIN_REWARDS.STOCK_COUNT,
        },
        redeem: REDEEM_COSTS,
      },
    };
  }

  private nextMilestone(balance: number) {
    const targets = [500, 1000, 2500, 5000, 10000];
    const next = targets.find((t) => t > balance);
    return next ? { target: next, remaining: next - balance } : null;
  }

  async transactions(userId: string, limit = 50) {
    const data = await this.prisma.coinTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
    return { data, count: data.length, currency: COINS };
  }

  async redeem(userId: string, dto: RedeemCoinsDto) {
    const cost = REDEEM_COSTS[dto.item];
    const bal = (await this.balance(userId)).balance;

    if (bal < cost) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_COINS',
        message: `Unahitaji coins ${cost}, una ${bal}.`,
        balance: bal,
        required: cost,
      });
    }

    const tx = await this.prisma.coinTransaction.create({
      data: {
        userId,
        amount: -cost,
        reason: `redeem:${dto.item}`,
        refType: 'redeem',
        refId: dto.item,
      },
    });

    return {
      success: true,
      item: dto.item,
      cost,
      balance: bal - cost,
      transaction: tx,
      fulfilment:
        dto.item === 'AIRTIME_1000'
          ? {
              type: 'AIRTIME',
              value: '1000 TZS',
              phone: dto.phone ?? null,
              status: 'PENDING',
              note: 'Itatumwa ndani ya saa 24.',
            }
          : dto.item === 'VOUCHER_300'
            ? {
                type: 'VOUCHER',
                code: `BOKE-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
                value: '300 TZS',
                status: 'ACTIVE',
                expiresInDays: 30,
              }
            : { type: 'POSTER_CREDIT', value: '1 poster', status: 'ACTIVE' },
    };
  }

  private async award(
    userId: string,
    amount: number,
    reason: string,
    refType?: string,
    refId?: string,
  ) {
    return this.prisma.coinTransaction.create({
      data: { userId, amount, reason, refType, refId },
    });
  }

  /**
   * §8 — coins za vitendo (mara moja kwa siku / kwa maisha):
   * `first_sale` +2 · `stock_count` +15 · `onboarding` +100.
   * Hurudisha `null` kama mtumiaji ameshaipata leo.
   */
  async awardMilestone(
    userId: string,
    kind: 'first_sale' | 'stock_count' | 'onboarding',
    refId?: string,
  ) {
    const amount =
      kind === 'first_sale'
        ? COIN_REWARDS.FIRST_SALE
        : kind === 'stock_count'
          ? COIN_REWARDS.STOCK_COUNT
          : COIN_REWARDS.ONBOARDING;

    const since =
      kind === 'onboarding' ? new Date(0) : startOfDayEAT(new Date());

    const existing = await this.prisma.coinTransaction.findFirst({
      where: {
        userId,
        reason: kind,
        ...(kind === 'onboarding' ? {} : { createdAt: { gte: since } }),
      },
      select: { id: true },
    });
    if (existing) return null;

    return this.award(userId, amount, kind, kind, refId);
  }

  // ═══════════════════════════════════════════════════════════
  // MISSIONS
  // ═══════════════════════════════════════════════════════════
  async missionsToday(businessId: string, userId: string) {
    const dueFilter = {
      businessId,
      userId,
      status: { in: [MissionStatus.PENDING, MissionStatus.ACTIVE] },
      dueAt: { gte: startOfDayEAT(), lte: endOfDayEAT() },
    };

    let missions = await this.prisma.mission.findMany({
      where: dueFilter,
      orderBy: { createdAt: 'asc' },
    });

    if (missions.length === 0) {
      missions = await this.generateMissions(businessId, userId);
    }

    const coins = await this.balance(userId);

    return {
      date: startOfDayEAT().toISOString().slice(0, 10),
      coins,
      missions: missions.map((m) => ({
        id: m.id,
        type: m.type,
        title: m.title,
        description: m.description,
        reason: m.reason,
        coinsReward: m.coinsReward,
        status: m.status,
        dueAt: m.dueAt,
        payload: m.payload,
        cta: this.missionCta(m.type),
      })),
      count: missions.length,
    };
  }

  private missionCta(type: string) {
    switch (type) {
      case 'STOCK_SWEEP':
        return { route: '/stock', label: 'Nenda stock' };
      case 'PRICE_MARGIN':
        return { route: '/products', label: 'Badilisha bei' };
      case 'RECORD_EXPENSE':
        return { route: '/expenses/new', label: 'Rekodi matumizi' };
      case 'DEBT_FOLLOWUP':
        return { route: '/debts', label: 'Fuatilia madeni' };
      case 'FIRST_SALE':
        return { route: '/pos', label: 'Anza kuuza' };
      case 'RECORD_DEMAND':
        return { route: '/demand/new', label: 'Rekodi mahitaji' };
      case 'STOCK_COUNT':
        return { route: '/stock/count', label: 'Hesabu stock' };
      default:
        return { route: '/home', label: 'Fungua' };
    }
  }

  /** Hutengeneza missions 3 za leo kutoka data halisi ya biashara. */
  async generateMissions(businessId: string, userId: string) {
    const todayStart = startOfDayEAT();
    const todayEnd = endOfDayEAT();
    const dueAt = todayEnd;

    const [products, todaySales, todayExpenses, overdueDebts, todayDemand] =
      await Promise.all([
        this.prisma.product.findMany({
          where: { businessId, isActive: true },
          include: { stock: true },
          take: 200,
        }),
        this.prisma.sale.count({
          where: {
            businessId,
            saleDate: { gte: todayStart, lte: todayEnd },
            status: { notIn: [SaleStatus.VOIDED] },
          },
        }),
        this.prisma.expense.count({
          where: { businessId, date: { gte: todayStart, lte: todayEnd } },
        }),
        this.prisma.debt.count({
          where: {
            businessId,
            status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] },
            dueDate: { lt: new Date() },
          },
        }),
        this.prisma.demandRecord.count({
          where: { businessId, createdAt: { gte: todayStart } },
        }),
      ]);

    const candidates: {
      type: string;
      title: string;
      description: string;
      reason: string;
      payload: Record<string, unknown>;
      coinsReward: number;
      priority: number;
    }[] = [];

    const lowStock = products
      .map((p) => ({
        product: p,
        total: p.stock.reduce(
          (a, s) => a.plus(s.quantity),
          new Prisma.Decimal(0),
        ),
      }))
      .filter((x) => x.total.lessThanOrEqualTo(x.product.alertLevel))
      .sort((a, b) => Number(a.total) - Number(b.total))
      .slice(0, 3);

    if (lowStock.length > 0) {
      candidates.push({
        type: 'STOCK_SWEEP',
        title: `Jaza stock ya ${lowStock[0].product.name}`,
        description: `Bidhaa ${lowStock.length} ziko chini ya alert level. Anza na ${lowStock[0].product.name}.`,
        reason:
          'Bidhaa inayokwisha hupoteza mauzo ya kurudia — wateja huhamia duka jingine.',
        payload: {
          products: lowStock.map((l) => ({
            productId: l.product.id,
            name: l.product.name,
            remaining: l.total.toString(),
            alertLevel: l.product.alertLevel,
          })),
        },
        coinsReward: 30,
        priority: 1,
      });
    }

    const thinMargin = products
      .filter((p) => p.buyingPrice.greaterThan(0))
      .map((p) => ({
        product: p,
        margin: Number(
          p.sellingPrice
            .minus(p.buyingPrice)
            .dividedBy(p.sellingPrice)
            .mul(100)
            .toFixed(1),
        ),
      }))
      .filter((x) => x.margin < 15)
      .sort((a, b) => a.margin - b.margin)
      .slice(0, 3);

    if (thinMargin.length > 0) {
      candidates.push({
        type: 'PRICE_MARGIN',
        title: `Pandisha margin ya ${thinMargin[0].product.name}`,
        description: `Margin ni ${thinMargin[0].margin}%. Lengo: zaidi ya 15%.`,
        reason:
          'Margin ndogo hufanya faida itoweke hata mauzo yakiongezeka.',
        payload: {
          products: thinMargin.map((t) => ({
            productId: t.product.id,
            name: t.product.name,
            sellingPrice: toMoneyString(t.product.sellingPrice),
            buyingPrice: toMoneyString(t.product.buyingPrice),
            margin: t.margin,
            suggestedPrice: t.product.buyingPrice.mul(1.25).toFixed(2),
          })),
        },
        coinsReward: 30,
        priority: 2,
      });
    }

    if (todaySales === 0) {
      candidates.push({
        type: 'FIRST_SALE',
        title: 'Fanya mauzo ya kwanza leo',
        description: 'Bado hakuna risiti leo. Anza na bidhaa zinazouzwa zaidi.',
        reason: 'Mauzo ya asubuhi huongeza uwezekano wa siku yenye faida.',
        payload: {},
        coinsReward: 20,
        priority: 0,
      });
    }

    if (todayExpenses === 0) {
      candidates.push({
        type: 'RECORD_EXPENSE',
        title: 'Rekodi matumizi ya leo',
        description: 'Hakuna matumizi yaliyorekodiwa leo.',
        reason:
          'Faida halisi inategemea matumizi — bila kuyarekodi, ripoti hazitakuwa sahihi.',
        payload: {},
        coinsReward: 20,
        priority: 3,
      });
    }

    if (overdueDebts > 0) {
      candidates.push({
        type: 'DEBT_FOLLOWUP',
        title: `Fuatilia madeni ${overdueDebts} yaliyochelewa`,
        description: 'Tuma ukumbusho wa WhatsApp kwa wateja walio na deni.',
        reason: 'Deni la siku 30+ lina uwezekano mdogo wa kulipwa.',
        payload: { overdueCount: overdueDebts },
        coinsReward: 25,
        priority: 1,
      });
    }

    if (todayDemand === 0) {
      candidates.push({
        type: 'RECORD_DEMAND',
        title: 'Rekodi bidhaa 1 ambayo mteja aliomba',
        description: 'Mahitaji yasiyokidhiwa ni fursa ya mauzo ya kesho.',
        reason: 'Data ya demand hukusaidia kujua nini cha kuagiza.',
        payload: {},
        coinsReward: 20,
        priority: 4,
      });
    }

    candidates.sort((a, b) => a.priority - b.priority);
    const picked = candidates.slice(0, 3);

    if (picked.length === 0) {
      picked.push({
        type: 'STOCK_COUNT',
        title: 'Fanya hesabu ndogo ya stock',
        description: 'Chagua bidhaa 5 na uthibitishe idadi iliyopo.',
        reason: 'Hesabu ya mara kwa mara hupunguza upotevu usiojulikana.',
        payload: {},
        coinsReward: 15,
        priority: 5,
      });
    }

    await this.prisma.mission.createMany({
      data: picked.map((m) => ({
        businessId,
        userId,
        type: m.type,
        title: m.title,
        description: m.description,
        reason: m.reason,
        payload: m.payload as Prisma.InputJsonValue,
        coinsReward: m.coinsReward,
        status: MissionStatus.PENDING,
        dueAt,
      })),
    });

    return this.prisma.mission.findMany({
      where: {
        businessId,
        userId,
        status: { in: [MissionStatus.PENDING, MissionStatus.ACTIVE] },
        dueAt: { gte: startOfDayEAT(), lte: endOfDayEAT() },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async completeMission(businessId: string, userId: string, id: string) {
    const mission = await this.prisma.mission.findFirst({
      where: { id, businessId, userId },
    });
    if (!mission) throw new NotFoundException('Mission haipo.');
    if (mission.status === MissionStatus.COMPLETED) {
      return {
        success: true,
        alreadyCompleted: true,
        coinsAwarded: 0,
        mission,
      };
    }

    const [updated, tx] = await this.prisma.$transaction([
      this.prisma.mission.update({
        where: { id },
        data: {
          status: MissionStatus.COMPLETED,
          completedAt: new Date(),
          impactAt: new Date(Date.now() + 7 * 86_400_000),
        },
      }),
      this.prisma.coinTransaction.create({
        data: {
          userId,
          amount: mission.coinsReward,
          reason: `mission:${mission.type}`,
          refType: 'mission',
          refId: mission.id,
        },
      }),
    ]);

    const balance = await this.balance(userId);

    return {
      success: true,
      alreadyCompleted: false,
      coinsAwarded: mission.coinsReward,
      balance: balance.balance,
      mission: updated,
      transaction: tx,
      celebration: {
        message: `Hongera! Umepata coins ${mission.coinsReward}`,
        colors: ['#16A760', '#73D31C'],
      },
    };
  }

  async missionImpact(businessId: string, userId: string, id: string) {
    const mission = await this.prisma.mission.findFirst({
      where: { id, businessId, userId },
    });
    if (!mission) throw new NotFoundException('Mission haipo.');

    if (mission.status !== MissionStatus.COMPLETED || !mission.completedAt) {
      return {
        missionId: id,
        status: mission.status,
        impact: null,
        note: 'Impact hupimwa siku 7 baada ya kukamilisha mission.',
      };
    }

    const before = new Date(
      mission.completedAt.getTime() - 7 * 86_400_000,
    );
    const after = new Date(
      Math.min(mission.completedAt.getTime() + 7 * 86_400_000, Date.now()),
    );

    const [beforeAgg, afterAgg] = await Promise.all([
      this.prisma.sale.aggregate({
        where: {
          businessId,
          saleDate: { gte: before, lt: mission.completedAt },
          status: { notIn: [SaleStatus.VOIDED] },
        },
        _sum: { total: true, profit: true },
        _count: true,
      }),
      this.prisma.sale.aggregate({
        where: {
          businessId,
          saleDate: { gte: mission.completedAt, lte: after },
          status: { notIn: [SaleStatus.VOIDED] },
        },
        _sum: { total: true, profit: true },
        _count: true,
      }),
    ]);

    const beforeRevenue = new Prisma.Decimal(beforeAgg._sum.total ?? 0);
    const afterRevenue = new Prisma.Decimal(afterAgg._sum.total ?? 0);
    const delta = afterRevenue.minus(beforeRevenue);
    const percent = beforeRevenue.greaterThan(0)
      ? Number(delta.dividedBy(beforeRevenue).mul(100).toFixed(1))
      : afterRevenue.greaterThan(0)
        ? 100
        : 0;

    const impact = {
      measuredAt: after.toISOString(),
      daysMeasured: Math.floor(
        (after.getTime() - mission.completedAt.getTime()) / 86_400_000,
      ),
      before: {
        revenue: beforeRevenue.toFixed(2),
        profit: toMoneyString(beforeAgg._sum.profit ?? 0),
        orders: beforeAgg._count,
      },
      after: {
        revenue: afterRevenue.toFixed(2),
        profit: toMoneyString(afterAgg._sum.profit ?? 0),
        orders: afterAgg._count,
      },
      delta: {
        revenue: delta.toFixed(2),
        percent,
        verdict: percent > 0 ? 'positive' : percent < 0 ? 'negative' : 'neutral',
      },
    };

    await this.prisma.mission.update({
      where: { id },
      data: { impact: impact as unknown as Prisma.InputJsonValue },
    });

    return { missionId: id, status: mission.status, impact };
  }

  async missionsHistory(businessId: string, userId: string, limit = 40) {
    const data = await this.prisma.mission.findMany({
      where: { businessId, userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
    return { data, count: data.length };
  }

  // ═══════════════════════════════════════════════════════════
  // DEMAND
  // ═══════════════════════════════════════════════════════════
  async createDemand(
    businessId: string,
    userId: string,
    dto: CreateDemandDto,
  ) {
    let shopId = dto.shopId;
    if (shopId) {
      const shop = await this.prisma.shop.findFirst({
        where: { id: shopId, businessId },
      });
      if (!shop) throw new NotFoundException('Duka haipo.');
    } else {
      const shop = await this.prisma.shop.findFirst({
        where: { businessId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      shopId = shop?.id;
    }
    if (!shopId) throw new BadRequestException('Hakuna duka.');

    const record = await this.prisma.demandRecord.create({
      data: {
        businessId,
        shopId,
        productName: dto.productName.trim(),
        ward: dto.ward,
      },
    });

    const tx = await this.award(
      userId,
      COIN_REWARDS.DEMAND,
      'demand_recorded',
      'demand',
      record.id,
    );

    // Onyesha kama demand hii imejirudia (fursa)
    const similar = await this.prisma.demandRecord.count({
      where: {
        businessId,
        productName: { equals: record.productName, mode: 'insensitive' },
      },
    });

    const bal = await this.balance(userId);

    return {
      id: record.id,
      productName: record.productName,
      ward: record.ward,
      coinsEarned: COIN_REWARDS.DEMAND,
      balance: bal.balance,
      transaction: tx,
      insight:
        similar >= 3
          ? {
              level: 'HIGH',
              message: `${similar} wateja wameomba ${record.productName} — fikiria kuagiza.`,
            }
          : similar === 2
            ? { level: 'MEDIUM', message: `${record.productName} imeombwa mara 2.` }
            : null,
    };
  }

  async demandReport(
    businessId: string,
    q: { from?: string; to?: string; limit?: number },
  ) {
    const to = q.to ? rangeEnd(q.to) : endOfDayEAT();
    const from = q.from
      ? rangeStart(q.from)
      : new Date(to.getTime() - 30 * 86_400_000);

    const records = await this.prisma.demandRecord.findMany({
      where: { businessId, createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: 'desc' },
    });

    const byProduct = new Map<string, { count: number; wards: Set<string> }>();
    const byWard = new Map<string, number>();

    for (const r of records) {
      const key = r.productName.toLowerCase();
      const row = byProduct.get(key) ?? { count: 0, wards: new Set<string>() };
      row.count += 1;
      if (r.ward) row.wards.add(r.ward);
      byProduct.set(key, row);

      if (r.ward) byWard.set(r.ward, (byWard.get(r.ward) ?? 0) + 1);
    }

    const total = records.length;

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      total,
      uniqueProducts: byProduct.size,
      topProducts: [...byProduct.entries()]
        .map(([name, v]) => ({
          name,
          requests: v.count,
          wards: [...v.wards],
          share: total > 0 ? Number(((v.count / total) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, q.limit ?? 20),
      wardLeaderboard: [...byWard.entries()]
        .map(([ward, count]) => ({ ward, requests: count }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 20),
      recent: records.slice(0, 20).map((r) => ({
        id: r.id,
        productName: r.productName,
        ward: r.ward,
        createdAt: r.createdAt.toISOString(),
      })),
      restockSuggestions: [...byProduct.entries()]
        .filter(([, v]) => v.count >= 2)
        .map(([name, v]) => ({ productName: name, requests: v.count }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // POSTERS
  // ═══════════════════════════════════════════════════════════
  async createPoster(businessId: string, userId: string, dto: CreatePosterDto) {
    const bal = (await this.balance(userId)).balance;
    const discount = dto.template === 'DISCOUNT' ? 12 : 0;

    if (bal < REDEEM_COSTS.POSTER_50) {
      // Ruhusu bila coins ikiwa ni template ya kwanza ya siku?
      throw new BadRequestException({
        code: 'INSUFFICIENT_COINS',
        message: `Poster inagharimu coins ${REDEEM_COSTS.POSTER_50}, una ${bal}.`,
        balance: bal,
      });
    }

    const [business, product] = await Promise.all([
      this.prisma.business.findUnique({
        where: { id: businessId },
        select: { name: true, currency: true },
      }),
      dto.productId
        ? this.prisma.product.findFirst({
            where: { id: dto.productId, businessId },
            select: { id: true, name: true, sellingPrice: true, unitSymbol: true },
          })
        : Promise.resolve(null),
    ]);

    if (dto.productId && !product) {
      throw new NotFoundException('Bidhaa haipo.');
    }

    const accent = dto.accentColor ?? '#0269E9';
    const price = dto.price
      ? toMoneyString(new Prisma.Decimal(dto.price))
      : product
        ? toMoneyString(product.sellingPrice)
        : null;

    const headline =
      dto.headline ??
      (dto.template === 'DISCOUNT'
        ? `Punguzo ${discount}% leo tu!`
        : dto.template === 'NEW_STOCK'
          ? 'Bidhaa mpya zimefika!'
          : dto.template === 'OPENING'
            ? 'Duka limefunguliwa!'
            : 'Ofa maalum leo!');

    const subject = product?.name ?? business?.name ?? 'MyBoke';

    // SVG halisi inayoweza kuonyeshwa au ku-export kama PNG kwa client.
    const svg = this.renderPosterSvg({
      width: 1080,
      height: 1350,
      brand: business?.name ?? 'MyBoke',
      headline,
      subject,
      price,
      currency: business?.currency ?? 'TZS',
      accent,
      footer: 'Piga simu / tembelea duka letu',
    });

    await this.award(
      userId,
      -REDEEM_COSTS.POSTER_50,
      'poster_generated',
      'poster',
      dto.template,
    );

    return {
      template: dto.template,
      headline,
      subject,
      price,
      currency: business?.currency ?? 'TZS',
      accentColor: accent,
      dimensions: { width: 1080, height: 1350, preset: 'instagram_portrait' },
      formats: ['svg', 'png', 'pdf'],
      svg,
      html: `<div style="width:1080px;height:1350px;background:linear-gradient(160deg,#0B37A1,#0269E9 60%,${accent});color:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:80px;font-family:system-ui">\n<div style="font-size:34px;letter-spacing:6px;opacity:.8">${business?.name ?? ''}</div>\n<div><div style="font-size:76px;font-weight:800;line-height:1.05">${headline}</div>\n<div style="font-size:46px;margin-top:24px;opacity:.9">${subject}</div>${price ? `<div style="font-size:92px;font-weight:900;margin-top:32px;color:#73D31C">${business?.currency ?? 'TZS'} ${price}</div>` : ''}</div>\n<div style="font-size:30px;opacity:.85">Piga simu / tembelea duka letu</div></div>`,
      coinsSpent: REDEEM_COSTS.POSTER_50,
      balance: bal - REDEEM_COSTS.POSTER_50,
      note: 'Render SVG au HTML kwenye client; export PNG kwa kutumia renderer ya KMP.',
    };
  }

  private renderPosterSvg(input: {
    width: number;
    height: number;
    brand: string;
    headline: string;
    subject: string;
    price: string | null;
    currency: string;
    accent: string;
    footer: string;
  }): string {
    const { width, height, brand, headline, subject, price, currency, accent } =
      input;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B37A1"/>
      <stop offset="60%" stop-color="#0269E9"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <circle cx="${width - 90}" cy="120" r="220" fill="#FFFFFF" opacity="0.06"/>
  <circle cx="90" cy="${height - 140}" r="260" fill="#73D31C" opacity="0.10"/>
  <text x="80" y="150" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#FFFFFF" opacity="0.85" letter-spacing="6">${this.escape(brand.toUpperCase())}</text>
  <text x="80" y="520" font-family="Helvetica, Arial, sans-serif" font-size="82" font-weight="bold" fill="#FFFFFF">${this.wrap(headline, 20)
    .map(
      (line, i) =>
        `<tspan x="80" dy="${i === 0 ? 0 : 96}">${this.escape(line)}</tspan>`,
    )
    .join('')}</text>
  <text x="80" y="760" font-family="Helvetica, Arial, sans-serif" font-size="48" fill="#FFFFFF" opacity="0.9">${this.escape(subject)}</text>
  ${
    price
      ? `<text x="80" y="960" font-family="Helvetica, Arial, sans-serif" font-size="96" font-weight="bold" fill="#73D31C">${this.escape(currency)} ${this.escape(price)}</text>`
      : ''
  }
  <rect x="80" y="${height - 220}" width="420" height="4" fill="#73D31C"/>
  <text x="80" y="${height - 150}" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#FFFFFF" opacity="0.85">${this.escape(input.footer)}</text>
  <text x="80" y="${height - 90}" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#FFFFFF" opacity="0.6">MyBoke</text>
</svg>`;
  }

  private wrap(text: string, maxChars: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > maxChars && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = (cur ? `${cur} ` : '') + w;
      }
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 3);
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ═══════════════════════════════════════════════════════════
  // RECOMMENDATIONS (data-driven)
  // ═══════════════════════════════════════════════════════════
  async recommendations(businessId: string) {
    const now = new Date();
    const monthStart = startOfMonthEAT();
    const last30 = new Date(now.getTime() - 30 * 86_400_000);

    const [products, saleItems, demand, debts, monthExpenses] = await Promise.all([
      this.prisma.product.findMany({
        where: { businessId, isActive: true },
        include: { stock: true },
        take: 500,
      }),
      this.prisma.saleItem.findMany({
        where: {
          sale: {
            businessId,
            saleDate: { gte: last30 },
            status: { notIn: [SaleStatus.VOIDED] },
          },
        },
        select: { productId: true, quantity: true, lineTotal: true, name: true },
      }),
      this.prisma.demandRecord.groupBy({
        by: ['productName'],
        where: { businessId, createdAt: { gte: last30 } },
        _count: { productName: true },
      }),
      this.prisma.debt.findMany({
        where: {
          businessId,
          status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] },
          type: 'OWE_ME',
        },
        select: { originalAmount: true, paidAmount: true, dueDate: true },
      }),
      this.prisma.expense.aggregate({
        where: { businessId, date: { gte: monthStart } },
        _sum: { amount: true },
      }),
    ]);

    const soldByProduct = new Map<string, { qty: number; revenue: number }>();
    for (const i of saleItems) {
      if (!i.productId) continue;
      const row = soldByProduct.get(i.productId) ?? { qty: 0, revenue: 0 };
      row.qty += Number(i.quantity);
      row.revenue += Number(i.lineTotal);
      soldByProduct.set(i.productId, row);
    }

    const items: {
      id: string;
      type: string;
      severity: 'HIGH' | 'MEDIUM' | 'LOW';
      title: string;
      detail: string;
      metric?: Record<string, unknown>;
      action: { route: string; label: string };
    }[] = [];

    // 1. Margin ndogo
    for (const p of products.filter((x) => x.buyingPrice.greaterThan(0))) {
      const margin = Number(
        p.sellingPrice.minus(p.buyingPrice).dividedBy(p.sellingPrice).mul(100).toFixed(1),
      );
      if (margin < 15) {
        items.push({
          id: `margin-${p.id}`,
          type: 'PRICE',
          severity: margin < 5 ? 'HIGH' : 'MEDIUM',
          title: `Margin ndogo: ${p.name}`,
          detail: `Margin ni ${margin}%. Bei ya kununua ${toMoneyString(p.buyingPrice)}, kuuza ${toMoneyString(p.sellingPrice)}.`,
          metric: {
            marginPercent: margin,
            suggestedPrice: p.buyingPrice.mul(1.25).toFixed(2),
          },
          action: { route: `/products/${p.id}`, label: 'Badilisha bei' },
        });
      }
    }

    // 2. Dead stock
    for (const p of products) {
      const sold = soldByProduct.get(p.id);
      const totalStock = p.stock.reduce(
        (a, s) => a.plus(s.quantity),
        new Prisma.Decimal(0),
      );
      if (!sold && totalStock.greaterThan(0)) {
        items.push({
          id: `deadstock-${p.id}`,
          type: 'DEAD_STOCK',
          severity: 'MEDIUM',
          title: `Haijauzwa siku 30: ${p.name}`,
          detail: `Stock ${totalStock.toString()} ${p.unitSymbol} haijapata mauzo. Fikiria punguzo au kuunganisha ofa.`,
          metric: {
            stockValue: totalStock.times(p.buyingPrice).toFixed(2),
            quantity: totalStock.toString(),
          },
          action: { route: `/products/${p.id}`, label: 'Tengeneza ofa' },
        });
      }
    }

    // 3. Restock kutokana na demand
    for (const d of demand) {
      if (d._count.productName < 2) continue;
      items.push({
        id: `demand-${d.productName}`,
        type: 'RESTOCK',
        severity: d._count.productName >= 5 ? 'HIGH' : 'MEDIUM',
        title: `Agiza: ${d.productName}`,
        detail: `${d._count.productName} wateja wameomba bidhaa hii katika siku 30.`,
        metric: { requests: d._count.productName },
        action: { route: '/demand', label: 'Ona demand' },
      });
    }

    // 4. Madeni yaliyochelewa
    const overdue = debts.filter((d) => d.dueDate && d.dueDate < now);
    if (overdue.length > 0) {
      const amount = overdue.reduce(
        (a, d) => a.plus(d.originalAmount).minus(d.paidAmount),
        new Prisma.Decimal(0),
      );
      items.push({
        id: 'overdue-debts',
        type: 'CASHFLOW',
        severity: 'HIGH',
        title: `Madeni ${overdue.length} yamechelewa`,
        detail: `Jumla ${toMoneyString(amount)} imepita tarehe ya malipo.`,
        metric: { amount: amount.toFixed(2), count: overdue.length },
        action: { route: '/debts', label: 'Tuma ukumbusho' },
      });
    }

    // 5. Matumizi makubwa
    const revenueLast30 = saleItems.reduce((a, i) => a + Number(i.lineTotal), 0);
    const expenses = Number(monthExpenses._sum.amount ?? 0);
    if (revenueLast30 > 0 && expenses > revenueLast30 * 0.5) {
      items.push({
        id: 'expense-ratio',
        type: 'EXPENSE',
        severity: 'HIGH',
        title: 'Matumizi yanazidi 50% ya mauzo',
        detail: `Mauzo ${revenueLast30.toFixed(2)} vs matumizi ${expenses.toFixed(2)} mwezi huu.`,
        metric: {
          expenseRatio: Number(((expenses / revenueLast30) * 100).toFixed(1)),
        },
        action: { route: '/expenses', label: 'Kagua matumizi' },
      });
    }

    // 6. Bidhaa zinazoongoza — hakikisha stock
    const top = [...soldByProduct.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5);
    for (const [productId, stat] of top) {
      const p = products.find((x) => x.id === productId);
      if (!p) continue;
      const totalStock = p.stock.reduce(
        (a, s) => a.plus(s.quantity),
        new Prisma.Decimal(0),
      );
      if (totalStock.lessThanOrEqualTo(p.alertLevel)) {
        items.push({
          id: `top-restock-${p.id}`,
          type: 'RESTOCK',
          severity: 'HIGH',
          title: `Bidhaa inayoongoza inakaribia kuisha: ${p.name}`,
          detail: `Imeuza ${stat.qty} katika siku 30 lakini stock ipo ${totalStock.toString()}.`,
          metric: { sold: stat.qty, stock: totalStock.toString() },
          action: { route: `/products/${p.id}`, label: 'Agiza stock' },
        });
      }
    }

    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    items.sort((a, b) => order[a.severity] - order[b.severity]);

    return {
      generatedAt: now.toISOString(),
      count: items.length,
      high: items.filter((i) => i.severity === 'HIGH').length,
      recommendations: items.slice(0, 25),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // RESTOCK SUGGESTIONS (H11)
  // ═══════════════════════════════════════════════════════════
  async restockSuggestions(businessId: string, shopId?: string) {
    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 86_400_000);
    const month = now.getMonth();

    const [products, saleItems, demand] = await Promise.all([
      this.prisma.product.findMany({
        where: { businessId, isActive: true },
        include: { stock: shopId ? { where: { shopId } } : true },
        take: 500,
      }),
      this.prisma.saleItem.findMany({
        where: {
          productId: { not: null },
          sale: {
            businessId,
            saleDate: { gte: last30 },
            status: { in: [SaleStatus.COMPLETED, SaleStatus.PARTIAL_REFUND] },
            ...(shopId ? { shopId } : {}),
          },
        },
        select: { productId: true, quantity: true },
      }),
      this.prisma.demandRecord.groupBy({
        by: ['productName'],
        where: { businessId, createdAt: { gte: last30 } },
        _count: { productName: true },
      }),
    ]);

    const sold = new Map<string, number>();
    for (const item of saleItems) {
      if (!item.productId) continue;
      sold.set(
        item.productId,
        (sold.get(item.productId) ?? 0) + Number(item.quantity),
      );
    }
    const demandByName = new Map(
      demand.map((d) => [d.productName.toLowerCase(), d._count.productName]),
    );

    // Msimu: miezi ya joto (Jun–Sep, Des–Feb) huongeza mahitaji ya vinywaji.
    const hotSeason = [11, 0, 1, 5, 6, 7, 8].includes(month);
    const seasonFactor = hotSeason ? 1.2 : 1.0;

    const rows = products
      .map((p) => {
        const stock = p.stock.reduce(
          (acc, s) => acc.plus(s.quantity),
          new Prisma.Decimal(0),
        );
        const soldQty = sold.get(p.id) ?? 0;
        const demandCount = demandByName.get(p.name.toLowerCase()) ?? 0;
        const avgDaily = (soldQty / 30) * seasonFactor;
        const daysLeft =
          avgDaily > 0 ? Math.floor(Number(stock) / avgDaily) : null;
        const target = Math.ceil(avgDaily * 14 + demandCount);
        const suggestedQty = Math.max(0, target - Number(stock));
        if (suggestedQty <= 0) return null;

        const priority =
          Number(stock) === 0
            ? 'CRITICAL'
            : daysLeft !== null && daysLeft <= 3
              ? 'HIGH'
              : daysLeft !== null && daysLeft <= 7
                ? 'MEDIUM'
                : 'LOW';

        return {
          productId: p.id,
          name: p.name,
          unitSymbol: p.unitSymbol,
          stock: stock.toFixed(3),
          soldLast30: soldQty,
          demandRequests: demandCount,
          avgDailySales: Number(avgDaily.toFixed(2)),
          daysOfStockLeft: daysLeft,
          suggestedQuantity: suggestedQty,
          estimatedCost: p.buyingPrice.mul(suggestedQty).toFixed(2),
          seasonFactor,
          season: hotSeason ? 'JOTO' : 'KAWAIDA',
          priority,
          action: { route: `/products/${p.id}`, label: 'Agiza' },
        };
      })
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .sort((a, b) => {
        const rank: Record<string, number> = {
          CRITICAL: 0,
          HIGH: 1,
          MEDIUM: 2,
          LOW: 3,
        };
        return (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
      })
      .slice(0, 25);

    return {
      generatedAt: now.toISOString(),
      horizonDays: 14,
      season: hotSeason ? 'JOTO' : 'KAWAIDA',
      count: rows.length,
      estimatedTotalCost: rows
        .reduce((acc, r) => acc + Number(r.estimatedCost), 0)
        .toFixed(2),
      suggestions: rows,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // PRICE SUGGESTIONS (H12)
  // ═══════════════════════════════════════════════════════════
  async priceSuggestions(businessId: string, targetMargin = 25) {
    const last30 = new Date(Date.now() - 30 * 86_400_000);

    const [products, saleItems] = await Promise.all([
      this.prisma.product.findMany({
        where: { businessId, isActive: true },
        take: 500,
      }),
      this.prisma.saleItem.findMany({
        where: {
          productId: { not: null },
          sale: {
            businessId,
            saleDate: { gte: last30 },
            status: { in: [SaleStatus.COMPLETED, SaleStatus.PARTIAL_REFUND] },
          },
        },
        select: { productId: true, quantity: true },
      }),
    ]);

    const sold = new Map<string, number>();
    for (const i of saleItems) {
      if (!i.productId) continue;
      sold.set(i.productId, (sold.get(i.productId) ?? 0) + Number(i.quantity));
    }

    const rows = products
      .filter((p) => p.buyingPrice.greaterThan(0))
      .map((p) => {
        const price = Number(p.sellingPrice);
        const cost = Number(p.buyingPrice);
        const marginPct = price > 0 ? ((price - cost) / price) * 100 : 0;
        const qty = sold.get(p.id) ?? 0;
        const suggested = Math.max(
          cost * (1 + targetMargin / 100),
          cost + 1,
        );
        const roundTo = suggested >= 10_000 ? 500 : suggested >= 1_000 ? 100 : 50;
        const rounded = Math.round(suggested / roundTo) * roundTo;
        const delta = rounded - price;
        const impact = delta * qty;

        return {
          productId: p.id,
          name: p.name,
          buyingPrice: toMoneyString(p.buyingPrice),
          currentPrice: toMoneyString(p.sellingPrice),
          marginPct: Number(marginPct.toFixed(1)),
          targetMarginPct: targetMargin,
          suggestedPrice: rounded.toFixed(2),
          delta: delta.toFixed(2),
          soldLast30: qty,
          monthlyImpact: impact.toFixed(2),
          reason:
            marginPct < targetMargin
              ? `Margin ni ${marginPct.toFixed(1)}% — chini ya lengo ${targetMargin}%.`
              : `Una nafasi ya kuongeza bei kidogo (margin ${marginPct.toFixed(1)}%).`,
          action: { route: `/products/${p.id}`, label: 'Badilisha bei' },
        };
      })
      .sort((a, b) => Number(b.monthlyImpact) - Number(a.monthlyImpact))
      .slice(0, 25);

    return {
      generatedAt: new Date().toISOString(),
      targetMarginPct: targetMargin,
      count: rows.length,
      suggestions: rows,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // STREAKS & BADGES (H13)
  // ═══════════════════════════════════════════════════════════
  async streaks(businessId: string, userId: string) {
    const since = new Date(Date.now() - 180 * 86_400_000);
    const sales = await this.prisma.sale.findMany({
      where: {
        businessId,
        saleDate: { gte: since },
        status: { notIn: [SaleStatus.VOIDED] },
      },
      select: { saleDate: true },
      orderBy: { saleDate: 'asc' },
    });

    const dayKey = (d: Date) =>
      new Date(d.getTime() + 3 * 3_600_000).toISOString().slice(0, 10);

    const days = [...new Set(sales.map((s) => dayKey(s.saleDate)))].sort();

    const today = dayKey(new Date());
    const yesterday = dayKey(new Date(Date.now() - 86_400_000));
    const daySet = new Set(days);

    // Streak inaendelea kama leo au jana ina mauzo.
    let cursor = daySet.has(today) ? today : daySet.has(yesterday) ? yesterday : null;
    let currentStreak = 0;
    while (cursor && daySet.has(cursor)) {
      currentStreak += 1;
      const d = new Date(`${cursor}T00:00:00.000+03:00`);
      cursor = dayKey(new Date(d.getTime() - 86_400_000));
    }

    // Longest streak ndani ya kipindi.
    let longest = 0;
    let run = 0;
    let prev: Date | null = null;
    for (const key of days) {
      const d = new Date(`${key}T00:00:00.000+03:00`);
      if (prev && d.getTime() - prev.getTime() <= 86_400_000 * 1.5) run += 1;
      else run = 1;
      longest = Math.max(longest, run);
      prev = d;
    }

    const [completedMissions, earnings, totalSales] = await Promise.all([
      this.prisma.mission.count({
        where: { businessId, userId, status: MissionStatus.COMPLETED },
      }),
      this.prisma.coinTransaction.aggregate({
        where: { userId, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.sale.count({
        where: { businessId, status: { notIn: [SaleStatus.VOIDED] } },
      }),
    ]);

    const coinsEarned = earnings._sum?.amount ?? 0;

    const badges = [
      {
        id: 'first_sale',
        title: 'Mauzo ya Kwanza',
        description: 'Umeuza mara ya kwanza',
        unlocked: totalSales >= 1,
        progress: Math.min(totalSales, 1),
        target: 1,
      },
      {
        id: 'streak_7',
        title: 'Siku 7 Mfululizo',
        description: 'Mauzo kila siku kwa wiki nzima',
        unlocked: longest >= 7,
        progress: Math.min(longest, 7),
        target: 7,
      },
      {
        id: 'streak_30',
        title: 'Mwezi Mzima',
        description: 'Mauzo kila siku kwa siku 30',
        unlocked: longest >= 30,
        progress: Math.min(longest, 30),
        target: 30,
      },
      {
        id: 'missions_10',
        title: 'Mkakamavu',
        description: 'Kamilisha missions 10',
        unlocked: completedMissions >= 10,
        progress: Math.min(completedMissions, 10),
        target: 10,
      },
      {
        id: 'coins_500',
        title: 'Mkusanyaji wa BokeCoins',
        description: 'Kusanya BokeCoins 500',
        unlocked: coinsEarned >= 500,
        progress: Math.min(coinsEarned, 500),
        target: 500,
      },
      {
        id: 'sales_100',
        title: 'Mfanyabiashara Hodari',
        description: 'Fanya mauzo 100',
        unlocked: totalSales >= 100,
        progress: Math.min(totalSales, 100),
        target: 100,
      },
    ];

    return {
      currentStreak,
      longestStreak: longest,
      activeToday: daySet.has(today),
      lastSaleDay: days.length ? days[days.length - 1] : null,
      totalSales,
      completedMissions,
      coinsEarned,
      activeDays: days.length,
      badges,
      nextBadge:
        badges.find((b) => !b.unlocked) ?? null,
      message:
        currentStreak >= 7
          ? `Hongera! Siku ${currentStreak} mfululizo.`
          : currentStreak > 0
            ? `Siku ${currentStreak} mfululizo — endelea!`
            : 'Anza streak leo kwa mauzo moja.',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // ASSISTANT
  // ═══════════════════════════════════════════════════════════
  async chat(businessId: string, dto: AssistantChatDto) {
    const message = dto.message.toLowerCase();
    const now = new Date();
    const todayStart = startOfDayEAT();
    const weekStart = new Date(now.getTime() - 7 * 86_400_000);
    const monthStart = startOfMonthEAT();

    const has = (...keys: string[]) => keys.some((k) => message.includes(k));

    // Faida
    if (has('faida', 'profit', 'benefit')) {
      const period = has('leo', 'today')
        ? { from: todayStart, label: 'leo' }
        : has('mwezi', 'month')
          ? { from: monthStart, label: 'mwezi huu' }
          : { from: weekStart, label: 'wiki hii' };

      const [sales, expenses] = await Promise.all([
        this.prisma.sale.aggregate({
          where: {
            businessId,
            saleDate: { gte: period.from },
            status: { notIn: [SaleStatus.VOIDED, SaleStatus.REFUNDED] },
          },
          _sum: { total: true, profit: true },
          _count: true,
        }),
        this.prisma.expense.aggregate({
          where: { businessId, date: { gte: period.from } },
          _sum: { amount: true },
        }),
      ]);

      const profit = new Prisma.Decimal(sales._sum.profit ?? 0);
      const exp = new Prisma.Decimal(expenses._sum.amount ?? 0);
      const revenue = new Prisma.Decimal(sales._sum.total ?? 0);

      return {
        intent: 'PROFIT',
        answer: `Faida yako ya ${period.label}: ghafi ${toMoneyString(profit)}, matumizi ${toMoneyString(exp)}, halisi ${toMoneyString(profit.minus(exp))}. Mauzo ${sales._count} yenye jumla ${toMoneyString(revenue)}.`,
        data: {
          period: period.label,
          revenue: toMoneyString(revenue),
          grossProfit: toMoneyString(profit),
          expenses: toMoneyString(exp),
          netProfit: toMoneyString(profit.minus(exp)),
          orders: sales._count,
        },
        suggestions: [
          {
            label: 'Ona ripoti kamili',
            route: '/reports/profit',
          },
        ],
      };
    }

    // Mauzo
    if (has('mauzo', 'sales', 'nimeuza', 'revenue', 'mapato')) {
      const sales = await this.prisma.sale.aggregate({
        where: {
          businessId,
          saleDate: { gte: has('leo', 'today') ? todayStart : weekStart },
          status: { notIn: [SaleStatus.VOIDED, SaleStatus.REFUNDED] },
        },
        _sum: { total: true },
        _count: true,
        _avg: { total: true },
      });

      return {
        intent: 'SALES',
        answer: `Mauzo ${has('leo', 'today') ? 'ya leo' : 'ya wiki hii'}: ${sales._count} risiti, jumla ${toMoneyString(new Prisma.Decimal(sales._sum.total ?? 0))}, wastani ${toMoneyString(new Prisma.Decimal(sales._avg.total ?? 0))} kwa risiti.`,
        data: {
          orders: sales._count,
          revenue: toMoneyString(new Prisma.Decimal(sales._sum.total ?? 0)),
          avgTicket: toMoneyString(new Prisma.Decimal(sales._avg.total ?? 0)),
        },
        suggestions: [{ label: 'Ona mauzo', route: '/sales' }],
      };
    }

    // Stock
    if (has('stock', 'bidhaa', 'product', 'imeisha', 'ghala')) {
      const alerts = await this.prisma.product.count({
        where: { businessId, isActive: true },
      });
      const low = await this.prisma.product.findMany({
        where: { businessId, isActive: true },
        include: { stock: true },
        take: 200,
      });

      const lowList = low
        .map((p) => ({
          name: p.name,
          total: p.stock
            .reduce((a, s) => a.plus(s.quantity), new Prisma.Decimal(0))
            .toString(),
          alertLevel: p.alertLevel,
        }))
        .filter((x) => Number(x.total) <= x.alertLevel)
        .slice(0, 5);

      return {
        intent: 'STOCK',
        answer:
          lowList.length > 0
            ? `Una bidhaa ${alerts}; ${lowList.length} ziko chini ya alert level: ${lowList.map((l) => `${l.name} (${l.total})`).join(', ')}.`
            : `Una bidhaa ${alerts} na stock yote iko juu ya alert level.`,
        data: { products: alerts, lowStock: lowList },
        suggestions: [{ label: 'Nenda stock', route: '/stock' }],
      };
    }

    // Madeni
    if (has('deni', 'madeni', 'debt', 'anadaiwa', 'wanaodaiwa')) {
      const debts = await this.prisma.debt.findMany({
        where: { businessId, status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] } },
        select: { originalAmount: true, paidAmount: true, type: true, dueDate: true },
      });
      const owed = debts
        .filter((d) => d.type === 'OWE_ME')
        .reduce(
          (a, d) => a.plus(d.originalAmount).minus(d.paidAmount),
          new Prisma.Decimal(0),
        );
      const overdue = debts.filter(
        (d) => d.dueDate && d.dueDate < now && d.type === 'OWE_ME',
      ).length;

      return {
        intent: 'DEBTS',
        answer: `Wateja wanakudai ${toMoneyString(owed)}; ${overdue} deni limechelewa.`,
        data: { owedToMe: owed.toFixed(2), overdue, count: debts.length },
        suggestions: [{ label: 'Fuatilia madeni', route: '/debts' }],
      };
    }

    // Bidhaa bora
    if (has('bora', 'inauzwa', 'top', 'best')) {
      const items = await this.prisma.saleItem.groupBy({
        by: ['name'],
        where: {
          sale: {
            businessId,
            saleDate: { gte: weekStart },
            status: { notIn: [SaleStatus.VOIDED] },
          },
        },
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { lineTotal: 'desc' } },
        take: 5,
      });

      return {
        intent: 'TOP_PRODUCTS',
        answer:
          items.length > 0
            ? `Bidhaa bora wiki hii: ${items
                .map(
                  (i) =>
                    `${i.name} (${i._sum.lineTotal ? toMoneyString(i._sum.lineTotal) : '0'})`,
                )
                .join(', ')}.`
            : 'Hakuna mauzo wiki hii bado.',
        data: {
          top: items.map((i) => ({
            name: i.name,
            quantity: i._sum.quantity?.toString() ?? '0',
            revenue: i._sum.lineTotal ? toMoneyString(i._sum.lineTotal) : '0',
          })),
        },
        suggestions: [{ label: 'Ona bidhaa bora', route: '/reports/top' }],
      };
    }

    // Madeni/mapendekezo kwa ujumla
    if (has('nifanye', 'ushauri', 'advice', 'recommend', 'nisaidie')) {
      const recs = await this.recommendations(businessId);
      return {
        intent: 'ADVICE',
        answer:
          recs.recommendations.length > 0
            ? `Ushauri wa kwanza: ${recs.recommendations[0].title} — ${recs.recommendations[0].detail}`
            : 'Hakuna tahadhari kubwa kwa sasa. Endelea kurekodi mauzo na matumizi.',
        data: { recommendations: recs.recommendations.slice(0, 5) },
        suggestions: [{ label: 'Ona mapendekezo yote', route: '/recommendations' }],
      };
    }

    return {
      intent: 'UNKNOWN',
      answer:
        'Naweza kukujibu kuhusu: faida, mauzo, stock, madeni, bidhaa bora, na ushauri. Mfano: "Faida yangu wiki hii ni ngapi?"',
      data: null,
      suggestions: [
        { label: 'Faida ya wiki hii', route: '/assistant?q=faida+wiki+hii' },
        { label: 'Stock iliyoisha', route: '/assistant?q=stock+imeisha' },
        { label: 'Madeni yaliyochelewa', route: '/assistant?q=madeni' },
      ],
    };
  }
}
