import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { GrowthService } from '../growth/growth.service';
import {
  AdjustStockDtoV2,
  CountStockDto,
  TransferStockDto,
} from './dto/stock.dto';

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly growth: GrowthService,
  ) {}

  /** Uhakikishe shop ni ya biashara hii. */
  private async assertShop(businessId: string, shopId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, businessId },
    });
    if (!shop) throw new NotFoundException('Duka haipo.');
    return shop;
  }

  async list(
    businessId: string,
    opts: { shopId?: string; categoryId?: string; q?: string; low?: boolean },
  ) {
    const shops = await this.prisma.shop.findMany({
      where: { businessId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    });

    const shopIds = opts.shopId
      ? [opts.shopId]
      : shops.map((s) => s.id);

    const products = await this.prisma.product.findMany({
      where: {
        businessId,
        isActive: true,
        ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
        ...(opts.q
          ? {
              OR: [
                { name: { contains: opts.q, mode: 'insensitive' } },
                { barcode: { contains: opts.q } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: 500,
      include: {
        category: { select: { id: true, name: true } },
        stock: { where: { shopId: { in: shopIds } } },
      },
    });

    const rows = products.map((p) => {
      const byShop: Record<string, string> = {};
      let total = new Prisma.Decimal(0);
      for (const s of p.stock) {
        byShop[s.shopId] = s.quantity.toString();
        total = total.plus(s.quantity);
      }
      for (const sid of shopIds) {
        if (byShop[sid] === undefined) byShop[sid] = '0';
      }
      return {
        productId: p.id,
        name: p.name,
        barcode: p.barcode,
        category: p.category?.name ?? null,
        unit: p.unitSymbol,
        alertLevel: p.alertLevel,
        total: total.toString(),
        byShop,
        isLow: total.lessThanOrEqualTo(p.alertLevel),
        isOut: total.lessThanOrEqualTo(0),
      };
    });

    return {
      shops,
      data: opts.low ? rows.filter((r) => r.isLow) : rows,
      count: rows.length,
    };
  }

  async movements(
    businessId: string,
    opts: {
      shopId?: string;
      productId?: string;
      type?: MovementType;
      from?: string;
      to?: string;
      limit?: number;
    },
  ) {
    const shopIds = (
      await this.prisma.shop.findMany({
        where: { businessId },
        select: { id: true },
      })
    ).map((s) => s.id);

    const where: Prisma.StockMovementWhereInput = {
      shopId: opts.shopId ? opts.shopId : { in: shopIds },
      ...(opts.productId ? { productId: opts.productId } : {}),
      ...(opts.type ? { type: opts.type } : {}),
      ...(opts.from || opts.to
        ? {
            createdAt: {
              ...(opts.from ? { gte: new Date(opts.from) } : {}),
              ...(opts.to ? { lte: new Date(opts.to) } : {}),
            },
          }
        : {}),
    };

    const data = await this.prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(opts.limit ?? 100, 500),
      include: {
        product: { select: { id: true, name: true, unitSymbol: true } },
      },
    });

    return { data, count: data.length };
  }

  async adjust(
    businessId: string,
    userId: string,
    dto: AdjustStockDtoV2,
  ) {
    await this.assertShop(businessId, dto.shopId);

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, businessId },
    });
    if (!product) throw new NotFoundException('Bidhaa haipo.');

    const level = await this.prisma.stockLevel.findUnique({
      where: {
        shopId_productId: { shopId: dto.shopId, productId: dto.productId },
      },
    });
    const current = level?.quantity ?? new Prisma.Decimal(0);
    const qty = new Prisma.Decimal(dto.quantity);

    let next: Prisma.Decimal;
    let movementQty: Prisma.Decimal;
    let type: MovementType;

    if (dto.type === 'ADJUST') {
      next = qty;
      movementQty = qty.minus(current);
      type = MovementType.ADJUST;
    } else if (dto.type === 'IN') {
      next = current.plus(qty);
      movementQty = qty;
      type = MovementType.IN;
    } else {
      if (qty.greaterThan(current)) {
        throw new BadRequestException(
          `Stock iliyopo ni ${current.toString()}; hauwezi kutoa ${qty.toString()}.`,
        );
      }
      next = current.minus(qty);
      movementQty = qty;
      type = MovementType.OUT;
    }

    if (next.lessThan(0)) {
      throw new BadRequestException('Stock haiwezi kuwa chini ya sifuri.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const lvl = await tx.stockLevel.upsert({
        where: {
          shopId_productId: { shopId: dto.shopId, productId: dto.productId },
        },
        create: {
          shopId: dto.shopId,
          productId: dto.productId,
          quantity: next,
        },
        update: { quantity: next },
      });

      await tx.stockMovement.create({
        data: {
          shopId: dto.shopId,
          productId: dto.productId,
          type,
          quantity: movementQty,
          reason: dto.reason ?? `manual_${dto.type.toLowerCase()}`,
          refType: 'manual',
          refId: lvl.id,
          userId,
        },
      });

      return lvl;
    });

    return {
      productId: dto.productId,
      shopId: dto.shopId,
      previous: current.toString(),
      quantity: updated.quantity.toString(),
      movement: movementQty.toString(),
      type,
    };
  }

  async transfer(businessId: string, userId: string, dto: TransferStockDto) {
    if (dto.fromShopId === dto.toShopId) {
      throw new BadRequestException('Duka la kuanzia na la kwenda lazima zitofautiane.');
    }
    await this.assertShop(businessId, dto.fromShopId);
    await this.assertShop(businessId, dto.toShopId);

    const ids = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, businessId },
      select: { id: true, name: true },
    });
    const nameById = new Map(products.map((p) => [p.id, p.name]));

    const transferRef = `TRF-${Date.now().toString(36).toUpperCase()}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const moved: { productId: string; name: string; quantity: string }[] = [];

      for (const item of dto.items) {
        if (!nameById.has(item.productId)) {
          throw new NotFoundException(`Bidhaa ${item.productId} haipo.`);
        }
        const qty = new Prisma.Decimal(item.quantity);
        if (qty.lessThanOrEqualTo(0)) {
          throw new BadRequestException('Idadi lazima iwe zaidi ya sifuri.');
        }

        const from = await tx.stockLevel.findUnique({
          where: {
            shopId_productId: {
              shopId: dto.fromShopId,
              productId: item.productId,
            },
          },
        });
        const available = from?.quantity ?? new Prisma.Decimal(0);
        if (available.lessThan(qty)) {
          throw new BadRequestException(
            `Stock ya ${nameById.get(item.productId)} haitoshi (ipo ${available.toString()}).`,
          );
        }

        await tx.stockLevel.update({
          where: {
            shopId_productId: {
              shopId: dto.fromShopId,
              productId: item.productId,
            },
          },
          data: { quantity: available.minus(qty) },
        });

        await tx.stockLevel.upsert({
          where: {
            shopId_productId: {
              shopId: dto.toShopId,
              productId: item.productId,
            },
          },
          create: {
            shopId: dto.toShopId,
            productId: item.productId,
            quantity: qty,
          },
          update: { quantity: { increment: qty } },
        });

        await tx.stockMovement.createMany({
          data: [
            {
              shopId: dto.fromShopId,
              productId: item.productId,
              type: MovementType.OUT,
              quantity: qty,
              reason: dto.reason ?? 'transfer_out',
              refType: 'transfer',
              refId: transferRef,
              userId,
            },
            {
              shopId: dto.toShopId,
              productId: item.productId,
              type: MovementType.IN,
              quantity: qty,
              reason: dto.reason ?? 'transfer_in',
              refType: 'transfer',
              refId: transferRef,
              userId,
            },
          ],
        });

        moved.push({
          productId: item.productId,
          name: nameById.get(item.productId) as string,
          quantity: qty.toString(),
        });
      }

      return moved;
    });

    return { transferRef, fromShopId: dto.fromShopId, toShopId: dto.toShopId, moved: result };
  }

  async count(businessId: string, userId: string, dto: CountStockDto) {
    await this.assertShop(businessId, dto.shopId);

    const ids = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, businessId },
      select: { id: true, name: true },
    });
    const nameById = new Map(products.map((p) => [p.id, p.name]));

    const countRef = `CNT-${Date.now().toString(36).toUpperCase()}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const lines: {
        productId: string;
        name: string;
        system: string;
        counted: string;
        difference: string;
      }[] = [];
      let mismatches = 0;

      for (const item of dto.items) {
        if (!nameById.has(item.productId)) {
          throw new NotFoundException(`Bidhaa ${item.productId} haipo.`);
        }
        const counted = new Prisma.Decimal(item.countedQty);
        const level = await tx.stockLevel.findUnique({
          where: {
            shopId_productId: {
              shopId: dto.shopId,
              productId: item.productId,
            },
          },
        });
        const system = level?.quantity ?? new Prisma.Decimal(0);
        const diff = counted.minus(system);

        await tx.stockLevel.upsert({
          where: {
            shopId_productId: {
              shopId: dto.shopId,
              productId: item.productId,
            },
          },
          create: {
            shopId: dto.shopId,
            productId: item.productId,
            quantity: counted,
          },
          update: { quantity: counted },
        });

        if (!diff.equals(0)) {
          mismatches += 1;
          await tx.stockMovement.create({
            data: {
              shopId: dto.shopId,
              productId: item.productId,
              type: MovementType.ADJUST,
              quantity: diff,
              reason: dto.note ?? 'stock_count',
              refType: 'count',
              refId: countRef,
              userId,
            },
          });
        }

        lines.push({
          productId: item.productId,
          name: nameById.get(item.productId) as string,
          system: system.toString(),
          counted: counted.toString(),
          difference: diff.toString(),
        });
      }

      return { lines, mismatches };
    });

    // §8 — coins +15 kwa hesabu ya stock (mara moja kwa siku).
    const coin = await this.growth
      .awardMilestone(userId, 'stock_count', countRef)
      .catch(() => null);

    return {
      countRef,
      shopId: dto.shopId,
      totalItems: dto.items.length,
      mismatches: result.mismatches,
      lines: result.lines,
      coinsEarned: coin ? 15 : 0,
    };
  }

  async alerts(businessId: string, shopId?: string) {
    const shops = await this.prisma.shop.findMany({
      where: { businessId, isActive: true },
      select: { id: true, name: true },
    });
    const shopIds = shopId ? [shopId] : shops.map((s) => s.id);

    const products = await this.prisma.product.findMany({
      where: { businessId, isActive: true },
      include: { stock: { where: { shopId: { in: shopIds } } } },
    });

    const out: {
      productId: string;
      name: string;
      unit: string;
      total: string;
      alertLevel: number;
      severity: 'OUT' | 'LOW';
      shopId?: string;
    }[] = [];

    for (const p of products) {
      if (shopId) {
        const level = p.stock.find((s) => s.shopId === shopId);
        const qty = level?.quantity ?? new Prisma.Decimal(0);
        if (qty.lessThanOrEqualTo(0)) {
          out.push({
            productId: p.id,
            name: p.name,
            unit: p.unitSymbol,
            total: qty.toString(),
            alertLevel: p.alertLevel,
            severity: 'OUT',
            shopId,
          });
        } else if (qty.lessThanOrEqualTo(p.alertLevel)) {
          out.push({
            productId: p.id,
            name: p.name,
            unit: p.unitSymbol,
            total: qty.toString(),
            alertLevel: p.alertLevel,
            severity: 'LOW',
            shopId,
          });
        }
        continue;
      }

      const total = p.stock.reduce(
        (acc, s) => acc.plus(s.quantity),
        new Prisma.Decimal(0),
      );
      if (total.lessThanOrEqualTo(0)) {
        out.push({
          productId: p.id,
          name: p.name,
          unit: p.unitSymbol,
          total: total.toString(),
          alertLevel: p.alertLevel,
          severity: 'OUT',
        });
      } else if (total.lessThanOrEqualTo(p.alertLevel)) {
        out.push({
          productId: p.id,
          name: p.name,
          unit: p.unitSymbol,
          total: total.toString(),
          alertLevel: p.alertLevel,
          severity: 'LOW',
        });
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      outOfStock: out.filter((o) => o.severity === 'OUT').length,
      lowStock: out.filter((o) => o.severity === 'LOW').length,
      alerts: out.sort((a, b) => (a.severity === 'OUT' ? -1 : 1)),
    };
  }

  /** Thamani ya stock kwa gharama (kwa reports). */
  async valuation(businessId: string, shopId?: string) {
    const shops = await this.prisma.shop.findMany({
      where: { businessId },
      select: { id: true },
    });
    const shopIds = shopId ? [shopId] : shops.map((s) => s.id);

    const levels = await this.prisma.stockLevel.findMany({
      where: { shopId: { in: shopIds } },
      include: {
        product: { select: { buyingPrice: true, sellingPrice: true } },
      },
    });

    let cost = new Prisma.Decimal(0);
    let retail = new Prisma.Decimal(0);
    for (const l of levels) {
      cost = cost.plus(l.quantity.times(l.product.buyingPrice));
      retail = retail.plus(l.quantity.times(l.product.sellingPrice));
    }

    return {
      costValue: cost.toFixed(2),
      retailValue: retail.toFixed(2),
      potentialProfit: retail.minus(cost).toFixed(2),
      skus: levels.length,
    };
  }
}
