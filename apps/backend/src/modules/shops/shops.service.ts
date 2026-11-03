import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bwipjs from 'bwip-js';
import { randomBytes } from 'node:crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateShopDto, UpdateShopDto } from './dto/shop.dto';

const EAT_OFFSET_MS = 3 * 3_600_000;
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
type Hours = Record<
  string,
  { open?: string; close?: string; closed?: boolean } | undefined
>;

const PLAN_LIMITS: Record<string, number> = {
  free: 1,
  starter: 1,
  growth: 3,
  premium: 6,
};

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(businessId: string) {
    return this.prisma.shop.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { stock: true, sales: true } } },
    });
  }

  async get(businessId: string, id: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id, businessId },
    });
    if (!shop) throw new NotFoundException('Duka haipo.');
    return shop;
  }

  async create(businessId: string, role: Role, dto: CreateShopDto) {
    if (role !== Role.OWNER) {
      throw new ForbiddenException('Ni OWNER pekee anayeweza kuongeza duka.');
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId },
    });
    const planId = subscription?.planId ?? 'free';
    const limit = PLAN_LIMITS[planId] ?? 1;
    const count = await this.prisma.shop.count({ where: { businessId } });

    if (count >= limit) {
      throw new BadRequestException(
        `Plan yako (${planId}) inaruhusu maduka ${limit}. Panda plan kuongeza.`,
      );
    }

    return this.prisma.shop.create({
      data: { businessId, ...dto },
    });
  }

  async update(businessId: string, role: Role, id: string, dto: UpdateShopDto) {
    if (role === Role.CASHIER) {
      throw new ForbiddenException('Huna ruhusa.');
    }
    await this.get(businessId, id);
    return this.prisma.shop.update({ where: { id }, data: dto });
  }

  async remove(businessId: string, role: Role, id: string) {
    if (role !== Role.OWNER) {
      throw new ForbiddenException('Ni OWNER pekee.');
    }
    await this.get(businessId, id);
    const count = await this.prisma.shop.count({ where: { businessId } });
    if (count <= 1) {
      throw new BadRequestException('Hauwezi kufuta duka la mwisho.');
    }
    await this.prisma.shop.update({ where: { id }, data: { isActive: false } });
    return { success: true };
  }

  // ── Saa za kazi + likizo (B7) ─────────────────────────────

  async schedule(businessId: string, shopId: string) {
    const shop = await this.get(businessId, shopId);
    const hours = (shop.businessHours ?? {}) as Hours;
    const now = new Date();
    const eat = new Date(now.getTime() + EAT_OFFSET_MS);
    const dayKey = DAY_KEYS[eat.getUTCDay()];
    const today = hours[dayKey];

    const holidays = await this.prisma.shopHoliday.findMany({
      where: { shopId },
      orderBy: { date: 'asc' },
    });
    const todayIso = eat.toISOString().slice(0, 10);
    const onHoliday = holidays.some(
      (h) => h.date.toISOString().slice(0, 10) === todayIso,
    );

    let isOpen = false;
    let reason: string | null = null;
    if (onHoliday) {
      reason = 'Likizo';
    } else if (!today || today.closed) {
      reason = 'Duka limefungwa leo';
    } else if (today.open && today.close) {
      const [oh, om] = today.open.split(':').map(Number);
      const [ch, cm] = today.close.split(':').map(Number);
      const minutes = eat.getUTCHours() * 60 + eat.getUTCMinutes();
      isOpen = minutes >= oh * 60 + om && minutes < ch * 60 + cm;
      if (!isOpen) reason = `Saa za kazi: ${today.open}–${today.close}`;
    } else {
      isOpen = true;
    }

    return {
      shopId,
      now: eat.toISOString(),
      day: dayKey,
      today: today ?? null,
      hours,
      isOpen,
      reason,
      upcomingHolidays: holidays.filter(
        (h) => h.date.toISOString().slice(0, 10) >= todayIso,
      ),
    };
  }

  async addHoliday(businessId: string, shopId: string, date: string, reason?: string) {
    await this.get(businessId, shopId);
    const parsed = new Date(`${date.slice(0, 10)}T00:00:00.000+03:00`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Tarehe si sahihi (YYYY-MM-DD).');
    }
    return this.prisma.shopHoliday.upsert({
      where: { shopId_date: { shopId, date: parsed } },
      create: { shopId, date: parsed, reason },
      update: { reason },
    });
  }

  async holidays(businessId: string, shopId: string) {
    await this.get(businessId, shopId);
    const rows = await this.prisma.shopHoliday.findMany({
      where: { shopId },
      orderBy: { date: 'asc' },
    });
    return { shopId, data: rows };
  }

  async removeHoliday(businessId: string, shopId: string, id: string) {
    await this.get(businessId, shopId);
    const row = await this.prisma.shopHoliday.findFirst({
      where: { id, shopId },
    });
    if (!row) throw new NotFoundException('Likizo haipo.');
    await this.prisma.shopHoliday.delete({ where: { id } });
    return { success: true };
  }

  // ── QR ya duka (B8) ───────────────────────────────────────

  async qr(businessId: string, shopId: string) {
    const shop = await this.get(businessId, shopId);
    let token = shop.qrToken;
    if (!token) {
      token = randomBytes(8).toString('hex');
      await this.prisma.shop.update({
        where: { id: shopId },
        data: { qrToken: token },
      });
    }

    const payload = JSON.stringify({
      v: 1,
      type: 'myboke-shop',
      shopId,
      token,
      name: shop.name,
    });

    const png = Buffer.from(
      await bwipjs.toBuffer({ bcid: 'qrcode', text: payload, scale: 6 }),
    );

    return {
      shopId,
      name: shop.name,
      token,
      payload,
      lat: shop.lat,
      lng: shop.lng,
      qrDataUrl: `data:image/png;base64,${png.toString('base64')}`,
      png,
    };
  }

  /** Afya ya stock ya duka: asilimia ya bidhaa zenye stock ya kutosha. */
  async health(businessId: string, shopId: string) {
    await this.get(businessId, shopId);
    const rows = await this.prisma.stockLevel.findMany({
      where: { shopId },
      include: { product: { select: { alertLevel: true, isActive: true } } },
    });
    const active = rows.filter((r) => r.product.isActive);
    const healthy = active.filter(
      (r) => Number(r.quantity) > r.product.alertLevel,
    ).length;
    const out = active.filter((r) => Number(r.quantity) === 0).length;
    return {
      totalProducts: active.length,
      healthy,
      lowStock: active.length - healthy - out,
      outOfStock: out,
      healthPercent:
        active.length === 0 ? 0 : Math.round((healthy / active.length) * 100),
    };
  }
}
