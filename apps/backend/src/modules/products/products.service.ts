import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, Prisma, UnitType } from '@prisma/client';
import { Paginated } from '../../common/dto/pagination.dto';
import { toMoneyString } from '../../common/utils/money.util';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  buildCsv,
  buildXlsx,
  parseSpreadsheet,
  PRODUCT_IMPORT_COLUMNS,
} from '../../infra/files/sheet.util';
import {
  buildLabelsPdf,
  type BarcodeFormat,
  type LabelSize,
} from '../../infra/files/label.util';
import {
  AdjustStockDto,
  CreateCategoryDto,
  CreateProductDto,
  UpdateProductDto,
} from './dto/product.dto';
import {
  CreateSupplierDto,
  ImportProductsDto,
  PriceChangeDto,
  UpdateCategoryDto,
  UpdateSupplierDto,
} from './dto/product-extra.dto';

// ── Helpers za import ──────────────────────────────────────
function pick(row: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== '') return row[k];
  }
  for (const k of Object.keys(row)) {
    const norm = k.toLowerCase().replace(/[^a-z]/g, '');
    for (const key of keys) {
      if (norm === key.toLowerCase().replace(/[^a-z]/g, '')) {
        if (row[k] !== '') return row[k];
      }
    }
  }
  return undefined;
}

function isMoney(v: string | undefined): boolean {
  if (v === undefined || v === null) return false;
  return /^\d{1,15}(\.\d{1,2})?$/.test(v.replace(/[,\s]/g, ''));
}

function isQty(v: string | undefined): boolean {
  if (v === undefined || v === null) return false;
  return /^-?\d{1,15}(\.\d{1,3})?$/.test(v.replace(/[,\s]/g, ''));
}

function normalizeMoney(v: string): string {
  return v.replace(/[,\s]/g, '');
}

function mapUnit(raw: string): UnitType {
  const u = raw.toLowerCase().trim();
  if (['kg', 'kilo', 'kilo gramu'].includes(u)) return UnitType.KG;
  if (['g', 'gramu', 'gram'].includes(u)) return UnitType.G;
  if (['l', 'lita', 'litre', 'liter'].includes(u)) return UnitType.L;
  if (['m', 'mita', 'meter', 'metre'].includes(u)) return UnitType.M;
  if (['pkt', 'pakiti', 'packet', 'pack'].includes(u)) return UnitType.PKT;
  return UnitType.PCS;
}

function unitLabel(u: UnitType): string {
  switch (u) {
    case UnitType.KG: return 'kg';
    case UnitType.G: return 'g';
    case UnitType.L: return 'l';
    case UnitType.M: return 'm';
    case UnitType.PKT: return 'pkt';
    default: return 'pcs';
  }
}

interface ListProductsQuery {
  shopId?: string;
  categoryId?: string;
  q?: string;
  lowStock?: boolean;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    businessId: string,
    query: ListProductsQuery,
  ): Promise<Paginated<unknown>> {
    const limit = Math.min(query.limit ?? 50, 200);
    const where: Prisma.ProductWhereInput = {
      businessId,
      isActive: true,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { barcode: { contains: query.q } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.product.findMany({
      where,
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true } },
        stock: query.shopId ? { where: { shopId: query.shopId } } : false,
      },
    });

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    return {
      data: data.map((p) => this.serialize(p)),
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }

  async get(businessId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, businessId },
      include: {
        category: true,
        stock: true,
        priceHistory: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!product) throw new NotFoundException('Bidhaa haipo.');
    return this.serialize(product);
  }

  async findByBarcode(businessId: string, barcode: string) {
    const product = await this.prisma.product.findFirst({
      where: { businessId, barcode, isActive: true },
      include: { stock: true },
    });
    if (!product) throw new NotFoundException('Bidhaa yenye barcode hii haipo.');
    return this.serialize(product);
  }

  /** §8 — mipaka ya plan: `maxProducts` (null = bila kikomo). */
  private async assertProductLimit(businessId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { businessId },
      select: { planId: true },
    });
    const plan = await this.prisma.plan.findUnique({
      where: { id: sub?.planId ?? 'free' },
      select: { name: true, maxProducts: true },
    });
    if (!plan || plan.maxProducts === null) return;

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

  async create(businessId: string, dto: CreateProductDto) {
    await this.assertProductLimit(businessId);

    const product = await this.prisma.product.create({
      data: {
        businessId,
        name: dto.name,
        barcode: dto.barcode,
        categoryId: dto.categoryId,
        unitType: dto.unitType ?? 'PCS',
        unitSymbol: dto.unitSymbol ?? 'pcs',
        buyingPrice: dto.buyingPrice,
        sellingPrice: dto.sellingPrice,
        alertLevel: dto.alertLevel ?? 5,
        hasExpiry: dto.hasExpiry ?? false,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        description: dto.description,
      },
    });

    const shopId =
      dto.shopId ??
      (
        await this.prisma.shop.findFirst({
          where: { businessId, isActive: true },
          orderBy: { createdAt: 'asc' },
        })
      )?.id;

    if (shopId && dto.initialStock && Number(dto.initialStock) > 0) {
      await this.prisma.$transaction([
        this.prisma.stockLevel.create({
          data: { shopId, productId: product.id, quantity: dto.initialStock },
        }),
        this.prisma.stockMovement.create({
          data: {
            shopId,
            productId: product.id,
            type: MovementType.IN,
            quantity: dto.initialStock,
            reason: 'initial',
            refType: 'product',
            refId: product.id,
          },
        }),
      ]);
    }

    return this.get(businessId, product.id);
  }

  async update(businessId: string, id: string, dto: UpdateProductDto, userId: string) {
    const existing = await this.prisma.product.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Bidhaa haipo.');

    const history: Prisma.PriceHistoryCreateManyInput[] = [];

    if (
      dto.buyingPrice !== undefined &&
      Number(dto.buyingPrice) !== Number(existing.buyingPrice)
    ) {
      history.push({
        productId: id,
        field: 'buyingPrice',
        oldValue: existing.buyingPrice,
        newValue: dto.buyingPrice,
        changedBy: userId,
      });
    }
    if (
      dto.sellingPrice !== undefined &&
      Number(dto.sellingPrice) !== Number(existing.sellingPrice)
    ) {
      history.push({
        productId: id,
        field: 'sellingPrice',
        oldValue: existing.sellingPrice,
        newValue: dto.sellingPrice,
        changedBy: userId,
      });
    }

    await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.barcode !== undefined ? { barcode: dto.barcode } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.unitType !== undefined ? { unitType: dto.unitType } : {}),
        ...(dto.unitSymbol !== undefined ? { unitSymbol: dto.unitSymbol } : {}),
        ...(dto.buyingPrice !== undefined ? { buyingPrice: dto.buyingPrice } : {}),
        ...(dto.sellingPrice !== undefined ? { sellingPrice: dto.sellingPrice } : {}),
        ...(dto.alertLevel !== undefined ? { alertLevel: dto.alertLevel } : {}),
        ...(dto.hasExpiry !== undefined ? { hasExpiry: dto.hasExpiry } : {}),
        ...(dto.expiryDate !== undefined
          ? { expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null }
          : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        version: { increment: 1 },
      },
    });

    if (history.length > 0) {
      await this.prisma.priceHistory.createMany({ data: history });
    }

    return this.get(businessId, id);
  }

  async remove(businessId: string, id: string) {
    const existing = await this.prisma.product.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Bidhaa haipo.');
    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    return { success: true };
  }

  async adjustStock(businessId: string, productId: string, dto: AdjustStockDto, userId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId },
    });
    if (!product) throw new NotFoundException('Bidhaa haipo.');

    const shop = await this.prisma.shop.findFirst({
      where: { id: dto.shopId, businessId },
    });
    if (!shop) throw new NotFoundException('Duka haipo.');

    const qty = new Prisma.Decimal(dto.quantity);
    if (qty.equals(0)) throw new BadRequestException('Kiasi kiwe zaidi ya 0.');

    return this.prisma.$transaction(async (tx) => {
      const level = await tx.stockLevel.upsert({
        where: { shopId_productId: { shopId: dto.shopId, productId } },
        create: {
          shopId: dto.shopId,
          productId,
          quantity: qty,
        },
        update: { quantity: { increment: qty } },
      });

      if (Number(level.quantity) < 0) {
        throw new BadRequestException(
          `Stock haitoshi. Zilizopo: ${level.quantity}`,
        );
      }

      await tx.stockMovement.create({
        data: {
          shopId: dto.shopId,
          productId,
          type: qty.greaterThan(0) ? MovementType.IN : MovementType.OUT,
          quantity: qty,
          reason: dto.reason,
          refType: 'adjustment',
          userId,
        },
      });

      return level;
    });
  }

  async movements(businessId: string, productId: string, shopId?: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId },
    });
    if (!product) throw new NotFoundException('Bidhaa haipo.');

    return this.prisma.stockMovement.findMany({
      where: { productId, ...(shopId ? { shopId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async lowStock(businessId: string, shopId?: string) {
    const rows = await this.prisma.stockLevel.findMany({
      where: {
        ...(shopId ? { shopId } : {}),
        product: { businessId, isActive: true },
      },
      include: { product: true, shop: { select: { id: true, name: true } } },
    });

    return rows
      .filter((r) => Number(r.quantity) <= r.product.alertLevel)
      .map((r) => ({
        productId: r.productId,
        productName: r.product.name,
        shopId: r.shopId,
        shopName: r.shop.name,
        quantity: r.quantity.toString(),
        alertLevel: r.product.alertLevel,
        outOfStock: Number(r.quantity) === 0,
      }));
  }

  /** §C8 — bidhaa zinazoisha muda (expiry alerts). */
  async expiring(businessId: string, days = 30, shopId?: string) {
    const now = new Date();
    const until = new Date(now.getTime() + Math.max(1, days) * 86_400_000);

    const products = await this.prisma.product.findMany({
      where: {
        businessId,
        isActive: true,
        hasExpiry: true,
        expiryDate: { not: null, lte: until },
      },
      include: {
        stock: shopId ? { where: { shopId } } : true,
      },
      orderBy: { expiryDate: 'asc' },
    });

    const rows = products.map((p) => {
      const expiry = p.expiryDate as Date;
      const daysLeft = Math.ceil(
        (expiry.getTime() - now.getTime()) / 86_400_000,
      );
      const quantity = p.stock.reduce((a, s) => a + Number(s.quantity), 0);
      return {
        productId: p.id,
        productName: p.name,
        barcode: p.barcode,
        expiryDate: expiry.toISOString(),
        daysLeft,
        expired: daysLeft < 0,
        quantity: quantity.toFixed(3),
        stockValue: (quantity * Number(p.buyingPrice)).toFixed(2),
        alert:
          daysLeft < 0
            ? 'EXPIRED'
            : daysLeft <= 7
              ? 'CRITICAL'
              : daysLeft <= 30
                ? 'WARNING'
                : 'OK',
      };
    });

    return {
      days,
      total: rows.length,
      expired: rows.filter((r) => r.expired).length,
      critical: rows.filter((r) => r.alert === 'CRITICAL').length,
      atRiskValue: rows
        .reduce((a, r) => a + Number(r.stockValue), 0)
        .toFixed(2),
      data: rows,
    };
  }

  async categories(businessId: string) {
    return this.prisma.category.findMany({
      where: { businessId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async createCategory(businessId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: { businessId, name: dto.name, icon: dto.icon },
    });
  }

  async updateCategory(businessId: string, id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Category haipo.');
    return this.prisma.category.update({
      where: { id },
      data: { name: dto.name, icon: dto.icon },
    });
  }

  async deleteCategory(businessId: string, id: string) {
    const existing = await this.prisma.category.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Category haipo.');
    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }

  // ── Search ────────────────────────────────────────────────
  async search(businessId: string, q: string, shopId?: string, limit = 20) {
    const term = (q ?? '').trim();
    if (!term) return [];

    const rows = await this.prisma.product.findMany({
      where: {
        businessId,
        isActive: true,
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { barcode: { contains: term } },
          { sku: { contains: term, mode: 'insensitive' } },
        ],
      },
      take: Math.min(limit, 50),
      orderBy: { name: 'asc' },
      include: {
        category: { select: { id: true, name: true } },
        stock: shopId ? { where: { shopId } } : false,
      },
    });

    return rows.map((p) => this.serialize(p));
  }

  // ── Price change ──────────────────────────────────────────
  async priceChange(
    businessId: string,
    productId: string,
    dto: PriceChangeDto,
    userId: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId },
    });
    if (!product) throw new NotFoundException('Bidhaa haipo.');

    const targets = dto.applyToCategory && product.categoryId
      ? await this.prisma.product.findMany({
          where: { businessId, categoryId: product.categoryId, isActive: true },
        })
      : [product];

    const oldValue = dto.field === 'sellingPrice' ? product.sellingPrice : product.buyingPrice;
    if (dto.field === 'sellingPrice' && Number(dto.newPrice) < Number(product.buyingPrice)) {
      // Onyo tu — tunaruhusu (mf. kufukuza stock) lakini tunarekodi
    }

    const results = await this.prisma.$transaction(async (tx) => {
      const updated: string[] = [];
      for (const t of targets) {
        const before = dto.field === 'sellingPrice' ? t.sellingPrice : t.buyingPrice;
        await tx.product.update({
          where: { id: t.id },
          data: {
            [dto.field]: dto.newPrice,
            version: { increment: 1 },
          },
        });
        await tx.priceHistory.create({
          data: {
            productId: t.id,
            field: dto.field,
            oldValue: before,
            newValue: dto.newPrice,
            reason: dto.reason,
            changedBy: userId,
          },
        });
        updated.push(t.id);
      }
      return updated;
    });

    return {
      updated: results.length,
      productIds: results,
      field: dto.field,
      oldPrice: oldValue.toString(),
      newPrice: dto.newPrice,
    };
  }

  async priceHistory(businessId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId },
    });
    if (!product) throw new NotFoundException('Bidhaa haipo.');

    return this.prisma.priceHistory.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ── Import ────────────────────────────────────────────────
  async importSpreadsheet(
    businessId: string,
    buffer: Buffer,
    filename: string,
    dto: ImportProductsDto,
    userId: string,
  ) {
    if (buffer.length > 10 * 1024 * 1024) {
      throw new BadRequestException('Faili ni kubwa mno (kiwango 10 MB).');
    }

    const parsed = await parseSpreadsheet(buffer, filename);
    if (parsed.rows.length === 0) {
      throw new BadRequestException(
        'Faili haina data. Tumia template ya MyBoke (safu ya kwanza ni vichwa).',
      );
    }
    if (parsed.rows.length > 5000) {
      throw new BadRequestException('Kiwango ni mistari 5,000 kwa faili.');
    }

    const shopId =
      dto.shopId ??
      (
        await this.prisma.shop.findFirst({
          where: { businessId, isActive: true },
          orderBy: { createdAt: 'asc' },
        })
      )?.id;

    const existingCategories = await this.prisma.category.findMany({
      where: { businessId },
    });
    const categoryByName = new Map(
      existingCategories.map((c) => [c.name.toLowerCase(), c.id]),
    );

    const barcodes = parsed.rows
      .map((r) => pick(r, ['Barcode', 'barcode'])?.trim())
      .filter((b): b is string => Boolean(b));
    const existingProducts = barcodes.length
      ? await this.prisma.product.findMany({
          where: { businessId, barcode: { in: barcodes } },
          select: { id: true, barcode: true },
        })
      : [];
    const productByBarcode = new Map(
      existingProducts.map((p) => [p.barcode as string, p.id]),
    );

    const job = await this.prisma.importJob.create({
      data: {
        businessId,
        createdBy: userId,
        status: 'RUNNING',
        dryRun: Boolean(dto.dryRun),
        totalRows: parsed.rows.length,
      },
    });

    const errors: { row: number; field: string; reason: string }[] = [];
    const valid: {
      row: number;
      name: string;
      barcode?: string;
      categoryName?: string;
      unitType: UnitType;
      unitSymbol: string;
      buyingPrice: string;
      sellingPrice: string;
      stock: string;
      alertLevel: number;
      existingId?: string;
    }[] = [];

    parsed.rows.forEach((raw, idx) => {
      const row = idx + 2; // +1 header, +1 zero-index
      const name = pick(raw, ['Jina', 'Name', 'name', 'jina'])?.trim();
      const buying = pick(raw, ['Bei ya kununua', 'buyingPrice', 'Buying Price', 'Kununua']);
      const selling = pick(raw, ['Bei ya kuuza', 'sellingPrice', 'Selling Price', 'Kuuza']);
      const barcode = pick(raw, ['Barcode', 'barcode'])?.trim();
      const categoryName = pick(raw, ['Category', 'category', 'Kundi'])?.trim();
      const unitRaw = (pick(raw, ['Unit', 'unit', 'Kipimo']) ?? 'pcs').toLowerCase();
      const stock = pick(raw, ['Stock', 'stock', 'Idadi']) ?? '0';
      const alertRaw = pick(raw, ['Alert', 'alertLevel', 'Alert Level']) ?? '';

      if (!name) {
        errors.push({ row, field: 'Jina', reason: 'Jina linahitajika' });
        return;
      }
      if (!isMoney(buying)) {
        errors.push({ row, field: 'Bei ya kununua', reason: `"${buying}" si namba` });
        return;
      }
      if (!isMoney(selling)) {
        errors.push({ row, field: 'Bei ya kuuza', reason: `"${selling}" si namba` });
        return;
      }
      if (!isQty(stock)) {
        errors.push({ row, field: 'Stock', reason: `"${stock}" si namba` });
        return;
      }

      const unitType = mapUnit(unitRaw);
      const existingId = barcode ? productByBarcode.get(barcode) : undefined;
      if (existingId && (dto.onDuplicate ?? 'skip') === 'skip') {
        errors.push({
          row,
          field: 'Barcode',
          reason: `Barcode ${barcode} ipo tayari (imerukwa)`,
        });
        return;
      }

      valid.push({
        row,
        name,
        barcode: barcode || undefined,
        categoryName: categoryName || undefined,
        unitType,
        unitSymbol: unitLabel(unitType),
        buyingPrice: normalizeMoney(buying!),
        sellingPrice: normalizeMoney(selling!),
        stock: normalizeMoney(stock),
        alertLevel: Number(alertRaw) > 0 ? Number(alertRaw) : 5,
        existingId,
      });
    });

    // §8 — kikomo cha bidhaa kwa plan (dry-run pia inaonyesha kikomo).
    const sub = await this.prisma.subscription.findUnique({
      where: { businessId },
      select: { planId: true },
    });
    const plan = await this.prisma.plan.findUnique({
      where: { id: sub?.planId ?? 'free' },
      select: { name: true, maxProducts: true },
    });
    let planRemaining: number | null = null;
    if (plan?.maxProducts !== null && plan?.maxProducts !== undefined) {
      const current = await this.prisma.product.count({
        where: { businessId, isActive: true },
      });
      planRemaining = Math.max(0, plan.maxProducts - current);
    }

    if (dto.dryRun) {
      await this.prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: 'DONE',
          imported: valid.filter((v) => !v.existingId).length,
          updated: valid.filter((v) => v.existingId).length,
          failed: errors.length,
          errors: errors.slice(0, 200) as never,
          completedAt: new Date(),
        },
      });
      return {
        jobId: job.id,
        dryRun: true,
        total: parsed.rows.length,
        valid: valid.length,
        willCreate: valid.filter((v) => !v.existingId).length,
        willUpdate: valid.filter((v) => v.existingId).length,
        errors: errors.slice(0, 200),
        errorCount: errors.length,
        headers: parsed.headers,
        plan: {
          name: plan?.name ?? 'Bure',
          maxProducts: plan?.maxProducts ?? null,
          remaining: planRemaining,
          exceedsPlan:
            planRemaining !== null &&
            valid.filter((v) => !v.existingId).length > planRemaining,
        },
      };
    }

    if (
      planRemaining !== null &&
      valid.filter((v) => !v.existingId).length > planRemaining
    ) {
      throw new ForbiddenException({
        code: 'PLAN_LIMIT_REACHED',
        message: `Plan ${plan?.name} inabakiza bidhaa ${planRemaining} tu; import ina bidhaa mpya ${
          valid.filter((v) => !v.existingId).length
        }. Panda plan au punguza mistari.`,
        limit: plan?.maxProducts ?? 0,
        remaining: planRemaining,
      });
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const ids: string[] = [];

      for (const item of valid) {
        let categoryId: string | undefined;
        if (item.categoryName) {
          const key = item.categoryName.toLowerCase();
          categoryId = categoryByName.get(key);
          if (!categoryId) {
            const cat = await tx.category.create({
              data: { businessId, name: item.categoryName },
            });
            categoryId = cat.id;
            categoryByName.set(key, cat.id);
          }
        }

        if (item.existingId) {
          await tx.product.update({
            where: { id: item.existingId },
            data: {
              name: item.name,
              buyingPrice: item.buyingPrice,
              sellingPrice: item.sellingPrice,
              categoryId,
              version: { increment: 1 },
            },
          });
          ids.push(item.existingId);
          continue;
        }

        const product = await tx.product.create({
          data: {
            businessId,
            name: item.name,
            barcode: item.barcode,
            categoryId,
            unitType: item.unitType,
            unitSymbol: item.unitSymbol,
            buyingPrice: item.buyingPrice,
            sellingPrice: item.sellingPrice,
            alertLevel: item.alertLevel,
          },
        });
        ids.push(product.id);

        if (shopId && Number(item.stock) > 0) {
          await tx.stockLevel.create({
            data: { shopId, productId: product.id, quantity: item.stock },
          });
          await tx.stockMovement.create({
            data: {
              shopId,
              productId: product.id,
              type: MovementType.IN,
              quantity: item.stock,
              reason: 'import',
              refType: 'import',
              refId: product.id,
              userId,
            },
          });
        }
      }

      return ids;
    });

    await this.prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: 'DONE',
        imported: valid.filter((v) => !v.existingId).length,
        updated: valid.filter((v) => v.existingId).length,
        failed: errors.length,
        errors: errors.slice(0, 200) as never,
        completedAt: new Date(),
      },
    });

    return {
      jobId: job.id,
      dryRun: false,
      total: parsed.rows.length,
      imported: created.length,
      created: valid.filter((v) => !v.existingId).length,
      updated: valid.filter((v) => v.existingId).length,
      failed: errors.length,
      errors: errors.slice(0, 200),
      productIds: created,
    };
  }

  /** Hali ya import job (§19.1 `GET /products/import/:jobId`). */
  async importJob(businessId: string, id: string) {
    const job = await this.prisma.importJob.findFirst({
      where: { id, businessId },
    });
    if (!job) throw new NotFoundException('Import job haipo.');
    const processed = job.imported + job.updated + job.failed;
    return {
      id: job.id,
      status: job.status,
      dryRun: job.dryRun,
      totalRows: job.totalRows,
      imported: job.imported,
      updated: job.updated,
      failed: job.failed,
      processed,
      progress: job.totalRows
        ? Math.min(100, Math.round((processed / job.totalRows) * 100))
        : 100,
      errors: job.errors ?? [],
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }

  /** Lebo za barcode (§18.2 · C11) kama PDF. */
  async labels(
    businessId: string,
    opts: {
      ids?: string;
      shopId?: string;
      size?: LabelSize;
      format?: BarcodeFormat;
      copies?: number;
      categoryId?: string;
    },
  ): Promise<{ buffer: Buffer; filename: string }> {
    const ids = (opts.ids ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

    const shop = opts.shopId
      ? await this.prisma.shop.findFirst({
          where: { id: opts.shopId, businessId },
        })
      : await this.prisma.shop.findFirst({
          where: { businessId, isActive: true },
          orderBy: { createdAt: 'asc' },
        });

    const products = await this.prisma.product.findMany({
      where: {
        businessId,
        isActive: true,
        ...(ids.length ? { id: { in: ids } } : {}),
        ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
      },
      orderBy: { name: 'asc' },
      take: 500,
      include: { stock: true },
    });

    if (products.length === 0) {
      throw new BadRequestException('Hakuna bidhaa za kuchapisha lebo.');
    }

    const items = products.map((p) => ({
      name: p.name,
      price: `${Number(p.sellingPrice).toFixed(2)}`,
      barcode: p.barcode ?? p.sku ?? p.id.slice(0, 12),
      shopName: shop?.name ?? 'MyBoke',
    }));

    const buffer = await buildLabelsPdf(
      items,
      opts.size ?? '40x30',
      opts.format ?? 'code128',
      Math.min(Math.max(opts.copies ?? 1, 1), 50),
    );

    return { buffer, filename: `myboke-labels-${Date.now()}.pdf` };
  }

  /** Quick keys za POS (§D17) — bidhaa 8 zinazouzwa zaidi siku 30. */
  async quickKeys(businessId: string, shopId?: string) {
    const from = new Date(Date.now() - 30 * 86_400_000);

    const grouped = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        productId: { not: null },
        sale: {
          businessId,
          saleDate: { gte: from },
          status: { in: ['COMPLETED', 'PARTIAL_REFUND'] },
          ...(shopId ? { shopId } : {}),
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 8,
    });

    const ids = grouped.map((g) => g.productId as string);
    if (ids.length === 0) {
      const fallback = await this.prisma.product.findMany({
        where: { businessId, isActive: true },
        take: 8,
        orderBy: { createdAt: 'asc' },
        include: { stock: shopId ? { where: { shopId } } : true },
      });
      return { source: 'fallback', products: fallback.map((p) => this.serialize(p)) };
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      include: { stock: shopId ? { where: { shopId } } : true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    return {
      source: 'sales',
      products: ids
        .map((id) => byId.get(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => this.serialize(p)),
    };
  }

  // ── Variants (C14) ─────────────────────────────────────────

  async createVariant(
    businessId: string,
    parentId: string,
    dto: {
      variantLabel: string;
      barcode?: string;
      buyingPrice?: string;
      sellingPrice?: string;
      initialStock?: string;
      shopId?: string;
    },
  ) {
    const parent = await this.prisma.product.findFirst({
      where: { id: parentId, businessId, isActive: true },
    });
    if (!parent) throw new NotFoundException('Bidhaa mama haipo.');

    const variant = await this.prisma.product.create({
      data: {
        businessId,
        parentId,
        variantLabel: dto.variantLabel,
        name: `${parent.name} — ${dto.variantLabel}`,
        barcode: dto.barcode ?? null,
        sku: parent.sku ? `${parent.sku}-${dto.variantLabel.slice(0, 6)}` : null,
        categoryId: parent.categoryId,
        supplierId: parent.supplierId,
        unitType: parent.unitType,
        unitSymbol: parent.unitSymbol,
        buyingPrice: dto.buyingPrice ?? parent.buyingPrice,
        sellingPrice: dto.sellingPrice ?? parent.sellingPrice,
        alertLevel: parent.alertLevel,
      },
    });

    const shopId =
      dto.shopId ??
      (
        await this.prisma.shop.findFirst({
          where: { businessId, isActive: true },
          orderBy: { createdAt: 'asc' },
        })
      )?.id;

    if (shopId && dto.initialStock && Number(dto.initialStock) > 0) {
      await this.prisma.$transaction([
        this.prisma.stockLevel.create({
          data: { shopId, productId: variant.id, quantity: dto.initialStock },
        }),
        this.prisma.stockMovement.create({
          data: {
            shopId,
            productId: variant.id,
            type: MovementType.IN,
            quantity: dto.initialStock,
            reason: 'variant-initial',
            refType: 'product',
            refId: variant.id,
          },
        }),
      ]);
    }

    return this.serialize(variant);
  }

  async variants(businessId: string, parentId: string) {
    const parent = await this.prisma.product.findFirst({
      where: { id: parentId, businessId },
    });
    if (!parent) throw new NotFoundException('Bidhaa mama haipo.');

    const rows = await this.prisma.product.findMany({
      where: { parentId, businessId, isActive: true },
      include: { stock: true },
      orderBy: { createdAt: 'asc' },
    });
    return {
      parentId,
      parentName: parent.name,
      variants: rows.map((v) => ({
        ...this.serialize(v),
        label: v.variantLabel,
      })),
    };
  }

  // ── Bundles (C15) ──────────────────────────────────────────

  async listBundles(businessId: string) {
    const bundles = await this.prisma.bundle.findMany({
      where: { businessId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    return this.bundlePayload(bundles);
  }

  async createBundle(
    businessId: string,
    dto: {
      name: string;
      sellingPrice: string;
      items: { productId: string; quantity: string }[];
    },
  ) {
    if (!dto.items?.length) {
      throw new BadRequestException('Bundle inahitaji bidhaa angalau 1.');
    }
    const productIds = dto.items.map((i) => i.productId);
    const found = await this.prisma.product.count({
      where: { id: { in: productIds }, businessId, isActive: true },
    });
    if (found !== new Set(productIds).size) {
      throw new BadRequestException('Baadhi ya bidhaa hazipo kwenye biashara hii.');
    }

    const bundle = await this.prisma.bundle.create({
      data: {
        businessId,
        name: dto.name,
        sellingPrice: dto.sellingPrice,
        items: {
          create: dto.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        },
      },
      include: { items: true },
    });
    return this.bundlePayload([bundle])[0];
  }

  async updateBundle(
    businessId: string,
    id: string,
    dto: {
      name?: string;
      sellingPrice?: string;
      isActive?: boolean;
      items?: { productId: string; quantity: string }[];
    },
  ) {
    const bundle = await this.prisma.bundle.findFirst({
      where: { id, businessId },
    });
    if (!bundle) throw new NotFoundException('Bundle haipo.');

    if (dto.items) {
      const productIds = dto.items.map((i) => i.productId);
      const found = await this.prisma.product.count({
        where: { id: { in: productIds }, businessId, isActive: true },
      });
      if (found !== new Set(productIds).size) {
        throw new BadRequestException('Baadhi ya bidhaa hazipo.');
      }
      await this.prisma.bundleItem.deleteMany({ where: { bundleId: id } });
    }

    const updated = await this.prisma.bundle.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.sellingPrice !== undefined
          ? { sellingPrice: dto.sellingPrice }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.items
          ? {
              items: {
                create: dto.items.map((i) => ({
                  productId: i.productId,
                  quantity: i.quantity,
                })),
              },
            }
          : {}),
      },
      include: { items: true },
    });
    return this.bundlePayload([updated])[0];
  }

  async deleteBundle(businessId: string, id: string) {
    const bundle = await this.prisma.bundle.findFirst({
      where: { id, businessId },
    });
    if (!bundle) throw new NotFoundException('Bundle haipo.');
    await this.prisma.bundle.update({
      where: { id },
      data: { isActive: false },
    });
    return { success: true };
  }

  private bundlePayload(
    bundles: {
      id: string;
      name: string;
      sellingPrice: Prisma.Decimal;
      isActive: boolean;
      createdAt: Date;
      items: { id: string; productId: string; quantity: Prisma.Decimal }[];
    }[],
  ) {
    return bundles.map((b) => ({
      ...b,
      items: b.items,
      itemCount: b.items.length,
    }));
  }

  /** Faili ya template ya import. */
  async importTemplate(): Promise<Buffer> {
    return buildXlsx(
      'Bidhaa',
      PRODUCT_IMPORT_COLUMNS,
      [
        {
          name: 'Soda 500ml',
          barcode: '5449000000996',
          category: 'Vinywaji',
          unit: 'pcs',
          buyingPrice: '800.00',
          sellingPrice: '1200.00',
          stock: '50',
          alertLevel: '10',
        },
        {
          name: 'Unga wa Sembe 1kg',
          barcode: '6001234567890',
          category: 'Vyakula',
          unit: 'pcs',
          buyingPrice: '1400.00',
          sellingPrice: '2000.00',
          stock: '20',
          alertLevel: '5',
        },
      ],
    );
  }

  // ── Export ────────────────────────────────────────────────
  async export(
    businessId: string,
    format: 'xlsx' | 'csv',
    shopId?: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const products = await this.prisma.product.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: 'asc' },
      include: {
        category: { select: { name: true } },
        stock: shopId ? { where: { shopId } } : true,
      },
    });

    const rows = products.map((p) => ({
      name: p.name,
      barcode: p.barcode ?? '',
      category: p.category?.name ?? '',
      unit: p.unitSymbol,
      buyingPrice: p.buyingPrice.toFixed(2),
      sellingPrice: p.sellingPrice.toFixed(2),
      stock: p.stock ? p.stock.map((s) => s.quantity.toString()).join(' | ') : '',
      alertLevel: p.alertLevel,
      profit: p.sellingPrice.minus(p.buyingPrice).toFixed(2),
    }));

    const stamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      return {
        buffer: buildCsv(PRODUCT_IMPORT_COLUMNS, rows),
        filename: `bidhaa-${stamp}.csv`,
        contentType: 'text/csv; charset=utf-8',
      };
    }

    return {
      buffer: await buildXlsx(
        'Bidhaa',
        [
          ...PRODUCT_IMPORT_COLUMNS,
          { header: 'Faida kwa unit', key: 'profit', width: 16 },
        ],
        rows,
      ),
      filename: `bidhaa-${stamp}.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  // ── Suppliers ─────────────────────────────────────────────
  async suppliers(businessId: string, q?: string) {
    return this.prisma.supplier.findMany({
      where: {
        businessId,
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async supplier(businessId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, businessId },
    });
    if (!supplier) throw new NotFoundException('Msambazaji haipo.');

    const linked = await this.prisma.product.findMany({
      where: { businessId, supplierId: id },
      select: {
        id: true,
        name: true,
        sellingPrice: true,
        buyingPrice: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      ...supplier,
      productCount: linked.length,
      products: linked.map((p) => ({
        ...p,
        sellingPrice: toMoneyString(p.sellingPrice),
        buyingPrice: toMoneyString(p.buyingPrice),
      })),
    };
  }

  // ── Supplier payments (F13) ───────────────────────────────

  async addSupplierPayment(
    businessId: string,
    supplierId: string,
    userId: string,
    dto: {
      amount: string;
      method?: string;
      reference?: string;
      note?: string;
      paidAt?: string;
    },
  ) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, businessId },
    });
    if (!supplier) throw new NotFoundException('Msambazaji haipo.');

    const payment = await this.prisma.supplierPayment.create({
      data: {
        businessId,
        supplierId,
        amount: dto.amount,
        method: dto.method ?? 'CASH',
        reference: dto.reference,
        note: dto.note,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        createdBy: userId,
      },
    });

    return { ...payment, amount: toMoneyString(payment.amount) };
  }

  async supplierPayments(businessId: string, supplierId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, businessId },
    });
    if (!supplier) throw new NotFoundException('Msambazaji haipo.');

    const rows = await this.prisma.supplierPayment.findMany({
      where: { businessId, supplierId },
      orderBy: { paidAt: 'desc' },
      take: 200,
    });

    return {
      supplierId,
      data: rows.map((r) => ({ ...r, amount: toMoneyString(r.amount) })),
      total: toMoneyString(
        rows.reduce((acc, r) => acc.plus(r.amount), new Prisma.Decimal(0)),
      ),
    };
  }

  /** Ledger ya msambazaji: manunuzi − malipo = salio tunalodaiwa. */
  async supplierLedger(businessId: string, supplierId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, businessId },
    });
    if (!supplier) throw new NotFoundException('Msambazaji haipo.');

    const [orders, payments] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: {
          businessId,
          supplierId,
          status: { in: ['SENT', 'RECEIVED'] },
        },
        orderBy: { orderedAt: 'asc' },
      }),
      this.prisma.supplierPayment.findMany({
        where: { businessId, supplierId },
        orderBy: { paidAt: 'asc' },
      }),
    ]);

    const entries = [
      ...orders.map((o) => ({
        date: o.orderedAt,
        type: 'PURCHASE',
        reference: o.number,
        description: `Manunuzi ${o.number}`,
        debit: o.total,
        credit: new Prisma.Decimal(0),
      })),
      ...payments.map((p) => ({
        date: p.paidAt,
        type: 'PAYMENT',
        reference: p.reference ?? p.id,
        description: `Malipo ${p.method}`,
        debit: new Prisma.Decimal(0),
        credit: p.amount,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    let balance = new Prisma.Decimal(0);
    const rows = entries.map((e) => {
      balance = balance.plus(e.debit).minus(e.credit);
      return {
        date: e.date,
        type: e.type,
        reference: e.reference,
        description: e.description,
        debit: toMoneyString(e.debit),
        credit: toMoneyString(e.credit),
        balance: toMoneyString(balance),
      };
    });

    const purchased = orders.reduce(
      (acc, o) => acc.plus(o.total),
      new Prisma.Decimal(0),
    );
    const paid = payments.reduce(
      (acc, p) => acc.plus(p.amount),
      new Prisma.Decimal(0),
    );

    return {
      supplier: { id: supplier.id, name: supplier.name, phone: supplier.phone },
      totals: {
        purchased: toMoneyString(purchased),
        paid: toMoneyString(paid),
        balance: toMoneyString(purchased.minus(paid)),
      },
      entries: rows,
    };
  }

  async createSupplier(businessId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: { businessId, name: dto.name, phone: dto.phone, notes: dto.notes },
    });
  }

  async updateSupplier(businessId: string, id: string, dto: UpdateSupplierDto) {
    const existing = await this.prisma.supplier.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Msambazaji haipo.');
    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }

  async deleteSupplier(businessId: string, id: string) {
    const existing = await this.prisma.supplier.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Msambazaji haipo.');
    await this.prisma.supplier.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Pesa/desimali zinaachwa kama `Prisma.Decimal` — `DecimalSerializerInterceptor`
   * inazibadilisha kuwa string sahihi (`"1200.00"`, `"2.375"`).
   * `.toString()` ya Decimal inapoteza desimali (`"1200"`), hivyo hatuitumii.
   */
  private serialize(product: Record<string, any>) {
    return product;
  }
}
