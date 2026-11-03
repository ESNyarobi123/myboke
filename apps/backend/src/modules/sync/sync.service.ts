import { Injectable, Logger } from '@nestjs/common';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { toMoneyString } from '../../common/utils/money.util';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CustomersService } from '../customers/customers.service';
import { DebtsService } from '../debts/debts.service';
import { ExpensesService } from '../expenses/expenses.service';
import { ProductsService } from '../products/products.service';
import { SalesService } from '../sales/sales.service';
import { StockService } from '../stock/stock.service';
import { SyncOperationDto, SyncPushDto } from './dto/sync.dto';

type OpResult = {
  opId: string;
  status: 'applied' | 'duplicate' | 'conflict' | 'failed' | 'rejected';
  serverId?: string;
  version?: number;
  error?: string;
  conflict?: {
    current: Record<string, unknown>;
    strategy: 'server-wins' | 'client-wins' | 'append-only';
    resolution: 'pending-user' | 'auto-merged';
  };
};

export interface ChangeItem {
  entity: string;
  id: string;
  action: 'create' | 'update' | 'delete';
  version: number;
  updatedAt: string;
  payload: Record<string, unknown>;
}

const CURSOR_SEP = '|';

function idOf(value: unknown, fallback?: unknown): string {
  const id = (value as { id?: string } | null)?.id;
  return id ?? String(fallback ?? '');
}

function encodeCursor(ts: Date, id: string): string {
  return Buffer.from(`${ts.toISOString()}${CURSOR_SEP}${id}`).toString('base64url');
}

function decodeCursor(cursor?: string): { ts: Date; id: string } | null {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const idx = raw.lastIndexOf(CURSOR_SEP);
    if (idx === -1) return null;
    const ts = new Date(raw.slice(0, idx));
    if (Number.isNaN(ts.getTime())) return null;
    return { ts, id: raw.slice(idx + 1) };
  } catch {
    return null;
  }
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
    private readonly expenses: ExpensesService,
    private readonly debts: DebtsService,
    private readonly customers: CustomersService,
    private readonly products: ProductsService,
    private readonly stock: StockService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // PUSH
  // ═══════════════════════════════════════════════════════════
  async push(user: JwtPayload, dto: SyncPushDto) {
    const businessId = user.bid;
    const results: OpResult[] = [];

    for (const op of dto.operations) {
      const prior = await this.prisma.syncOperation.findUnique({
        where: { deviceId_opId: { deviceId: dto.deviceId, opId: op.opId } },
      });

      if (prior) {
        results.push({
          opId: op.opId,
          status: 'duplicate',
          serverId: prior.serverId ?? undefined,
          version: prior.version ?? undefined,
        });
        continue;
      }

      try {
        const result = await this.applyOperation(user, dto.deviceId, op);
        await this.prisma.syncOperation.create({
          data: {
            businessId,
            userId: user.sub,
            deviceId: dto.deviceId,
            opId: op.opId,
            entity: op.entity,
            action: op.action,
            status: result.status,
            error: result.error ?? null,
            serverId: result.serverId ?? null,
            version: result.version ?? null,
          },
        });
        results.push(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Hitilafu';
        this.logger.warn(`Sync op ${op.opId} imeshindikana: ${message}`);
        await this.prisma.syncOperation
          .create({
            data: {
              businessId,
              userId: user.sub,
              deviceId: dto.deviceId,
              opId: op.opId,
              entity: op.entity,
              action: op.action,
              status: 'FAILED',
              error: message,
            },
          })
          .catch(() => undefined);
        results.push({ opId: op.opId, status: 'failed', error: message });
      }
    }

    const applied = results.filter((r) => r.status === 'applied').length;

    return {
      results,
      serverCursor: await this.currentCursor(businessId),
      nextPushAfterMs: results.some((r) => r.status === 'failed') ? 30_000 : 0,
      summary: {
        total: results.length,
        applied,
        duplicates: results.filter((r) => r.status === 'duplicate').length,
        conflicts: results.filter((r) => r.status === 'conflict').length,
        failed: results.filter((r) => r.status === 'failed').length,
      },
    };
  }

  private async applyOperation(
    user: JwtPayload,
    deviceId: string,
    op: SyncOperationDto,
  ): Promise<OpResult> {
    const businessId = user.bid;

    switch (op.entity) {
      case 'sale': {
        if (op.action !== 'create') return this.reject(op, 'Mauzo ni append-only.');
        const sale = await this.sales.create(user, {
          ...op.payload,
          idempotencyKey:
            (op.payload.idempotencyKey as string) ?? `${deviceId}:${op.opId}`,
        } as never);
        return {
          opId: op.opId,
          status: 'applied',
          serverId: (sale as { id: string }).id,
          version: 1,
        };
      }

      case 'expense': {
        if (op.action !== 'create') return this.reject(op, 'Matumizi ni append-only.');
        const created = await this.expenses.create(
          businessId,
          op.payload as never,
          user.sub,
        );
        return {
          opId: op.opId,
          status: 'applied',
          serverId: idOf(created, op.payload.id),
          version: 1,
        };
      }

      case 'debt': {
        if (op.action === 'create') {
          const created = await this.debts.create(businessId, op.payload as never);
          return {
            opId: op.opId,
            status: 'applied',
            serverId: idOf(created, op.payload.id),
            version: 1,
          };
        }
        if (op.action === 'update') {
          const id = String(op.payload.id ?? '');
          await this.debts.update(businessId, id, op.payload as never);
          return { opId: op.opId, status: 'applied', serverId: id, version: 1 };
        }
        return this.reject(op, 'Kufuta deni hakuungwa mkono kwenye sync.');
      }

      case 'payment': {
        const debtId = op.payload.debtId as string | undefined;
        const saleId = op.payload.saleId as string | undefined;
        if (debtId) {
          await this.debts.addPayment(
            businessId,
            debtId,
            op.payload as never,
            user.sub,
          );
          return { opId: op.opId, status: 'applied', serverId: debtId, version: 1 };
        }
        if (saleId) {
          await this.sales.addPayment(businessId, saleId, op.payload as never, user.sub);
          return { opId: op.opId, status: 'applied', serverId: saleId, version: 1 };
        }
        return this.reject(op, 'Malipo yanahitaji debtId au saleId.');
      }

      case 'product':
        return this.syncProduct(user, op);

      case 'customer':
        return this.syncCustomer(businessId, op);

      case 'stockMovement': {
        const created = await this.stock.adjust(businessId, user.sub, {
          shopId: op.payload.shopId as string,
          productId: op.payload.productId as string,
          quantity: String(op.payload.quantity ?? '0'),
          type: (op.payload.type as 'IN' | 'OUT' | 'ADJUST') ?? 'IN',
          reason: op.payload.reason as string | undefined,
        });
        return {
          opId: op.opId,
          status: 'applied',
          serverId: op.payload.productId as string,
          version: 1,
          ...(created ? {} : {}),
        };
      }

      case 'shop':
        return this.reject(op, 'Mipangilio ya duka ni server-authoritative.');

      default:
        return this.reject(op, `Entity ${op.entity} haiungwi mkono.`);
    }
  }

  private reject(op: SyncOperationDto, reason: string): OpResult {
    return { opId: op.opId, status: 'rejected', error: reason };
  }

  // ── Version-based entities ────────────────────────────────
  private async syncProduct(user: JwtPayload, op: SyncOperationDto): Promise<OpResult> {
    const businessId = user.bid;

    if (op.action === 'create') {
      const created = await this.products.create(businessId, op.payload as never);
      return {
        opId: op.opId,
        status: 'applied',
        serverId: idOf(created, op.payload.id),
        version: 1,
      };
    }

    const id = String(op.payload.id ?? '');
    const current = await this.prisma.product.findFirst({
      where: { id, businessId },
    });
    if (!current) {
      return { opId: op.opId, status: 'failed', error: 'Bidhaa haipo.' };
    }

    if (op.baseVersion !== undefined && op.baseVersion < current.version) {
      return {
        opId: op.opId,
        status: 'conflict',
        serverId: current.id,
        version: current.version,
        conflict: {
          current: {
            id: current.id,
            name: current.name,
            sellingPrice: toMoneyString(current.sellingPrice),
            buyingPrice: toMoneyString(current.buyingPrice),
            alertLevel: current.alertLevel,
            version: current.version,
          },
          strategy: 'server-wins',
          resolution: 'pending-user',
        },
      };
    }

    if (op.action === 'delete') {
      await this.products.remove(businessId, id);
      return { opId: op.opId, status: 'applied', serverId: id, version: current.version + 1 };
    }

    const updated = await this.products.update(
      businessId,
      id,
      op.payload as never,
      user.sub,
    );
    return {
      opId: op.opId,
      status: 'applied',
      serverId: id,
      version: (updated as { version?: number }).version ?? current.version + 1,
    };
  }

  private async syncCustomer(
    businessId: string,
    op: SyncOperationDto,
  ): Promise<OpResult> {
    if (op.action === 'create') {
      const created = await this.customers.create(businessId, op.payload as never);
      return {
        opId: op.opId,
        status: 'applied',
        serverId: (created as { id: string }).id,
        version: 1,
      };
    }

    const id = String(op.payload.id ?? '');
    if (op.action === 'delete') {
      await this.customers.remove(businessId, id);
      return { opId: op.opId, status: 'applied', serverId: id };
    }

    const updated = await this.customers.update(
      businessId,
      id,
      op.payload as never,
    );
    return {
      opId: op.opId,
      status: 'applied',
      serverId: idOf(updated, id),
      version: 1,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // PULL
  // ═══════════════════════════════════════════════════════════
  async pull(businessId: string, since?: string, limit = 500) {
    const capped = Math.min(Math.max(limit, 1), 1000);
    const cursor = decodeCursor(since);
    const ts = cursor?.ts ?? new Date(0);

    const shopIds = (
      await this.prisma.shop.findMany({ where: { businessId }, select: { id: true } })
    ).map((s) => s.id);

    const [products, customers, debts, sales, expenses, shops, shifts, stockLevels] =
      await Promise.all([
        this.prisma.product.findMany({
          where: { businessId, updatedAt: { gt: ts } },
          orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
          take: capped,
        }),
        this.prisma.customer.findMany({
          where: { businessId, updatedAt: { gt: ts } },
          orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
          take: capped,
        }),
        this.prisma.debt.findMany({
          where: { businessId, updatedAt: { gt: ts } },
          orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
          take: capped,
        }),
        this.prisma.sale.findMany({
          where: { businessId, updatedAt: { gt: ts } },
          orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
          take: capped,
          include: { items: true, payments: true },
        }),
        this.prisma.expense.findMany({
          where: { businessId, createdAt: { gt: ts } },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          take: capped,
        }),
        this.prisma.shop.findMany({
          where: { businessId, updatedAt: { gt: ts } },
          orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
          take: capped,
        }),
        this.prisma.shift.findMany({
          where: { businessId, openedAt: { gt: ts } },
          orderBy: [{ openedAt: 'asc' }, { id: 'asc' }],
          take: capped,
        }),
        this.prisma.stockLevel.findMany({
          where: { shopId: { in: shopIds }, updatedAt: { gt: ts } },
          orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
          take: capped,
        }),
      ]);

    const changes: ChangeItem[] = [];

    for (const p of products) {
      changes.push({
        entity: 'product',
        id: p.id,
        action: p.isActive ? (p.createdAt.getTime() === p.updatedAt.getTime() ? 'create' : 'update') : 'delete',
        version: p.version,
        updatedAt: p.updatedAt.toISOString(),
        payload: {
          id: p.id,
          name: p.name,
          barcode: p.barcode,
          sku: p.sku,
          categoryId: p.categoryId,
          unitType: p.unitType,
          unitSymbol: p.unitSymbol,
          buyingPrice: toMoneyString(p.buyingPrice),
          sellingPrice: toMoneyString(p.sellingPrice),
          alertLevel: p.alertLevel,
          isActive: p.isActive,
          version: p.version,
        },
      });
    }

    for (const c of customers) {
      changes.push({
        entity: 'customer',
        id: c.id,
        action: c.createdAt.getTime() === c.updatedAt.getTime() ? 'create' : 'update',
        version: 1,
        updatedAt: c.updatedAt.toISOString(),
        payload: {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          creditLimit: c.creditLimit ? toMoneyString(c.creditLimit) : null,
          loyaltyPoints: c.loyaltyPoints,
        },
      });
    }

    for (const d of debts) {
      changes.push({
        entity: 'debt',
        id: d.id,
        action: 'update',
        version: 1,
        updatedAt: d.updatedAt.toISOString(),
        payload: {
          id: d.id,
          customerId: d.customerId,
          type: d.type,
          personName: d.personName,
          personPhone: d.personPhone,
          originalAmount: toMoneyString(d.originalAmount),
          paidAmount: toMoneyString(d.paidAmount),
          remaining: d.originalAmount.minus(d.paidAmount).toFixed(2),
          status: d.status,
          dueDate: d.dueDate?.toISOString() ?? null,
        },
      });
    }

    for (const s of sales) {
      changes.push({
        entity: 'sale',
        id: s.id,
        action: 'create',
        version: 1,
        updatedAt: s.updatedAt.toISOString(),
        payload: {
          id: s.id,
          receiptNo: s.receiptNo,
          shopId: s.shopId,
          customerId: s.customerId,
          sellerId: s.sellerId,
          saleDate: s.saleDate.toISOString(),
          subtotal: toMoneyString(s.subtotal),
          discount: toMoneyString(s.discount),
          total: toMoneyString(s.total),
          profit: toMoneyString(s.profit),
          paymentMethod: s.paymentMethod,
          status: s.status,
          efdReceiptNo: s.efdReceiptNo,
          items: s.items.map((i) => ({
            productId: i.productId,
            name: i.name,
            quantity: i.quantity.toString(),
            unitSymbol: i.unitSymbol,
            price: toMoneyString(i.price),
            lineTotal: toMoneyString(i.lineTotal),
          })),
          payments: s.payments.map((p) => ({
            method: p.method,
            amount: toMoneyString(p.amount),
            reference: p.reference,
          })),
        },
      });
    }

    for (const e of expenses) {
      changes.push({
        entity: 'expense',
        id: e.id,
        action: 'create',
        version: 1,
        updatedAt: e.createdAt.toISOString(),
        payload: {
          id: e.id,
          shopId: e.shopId,
          name: e.name,
          amount: toMoneyString(e.amount),
          category: e.category,
          date: e.date.toISOString(),
          notes: e.notes,
        },
      });
    }

    for (const s of shops) {
      changes.push({
        entity: 'shop',
        id: s.id,
        action: s.isActive ? 'update' : 'delete',
        version: 1,
        updatedAt: s.updatedAt.toISOString(),
        payload: {
          id: s.id,
          name: s.name,
          address: s.address,
          phone: s.phone,
          isActive: s.isActive,
          lat: s.lat,
          lng: s.lng,
        },
      });
    }

    for (const s of shifts) {
      changes.push({
        entity: 'shift',
        id: s.id,
        action: s.status === 'CLOSED' ? 'update' : 'create',
        version: 1,
        updatedAt: (s.closedAt ?? s.openedAt).toISOString(),
        payload: {
          id: s.id,
          shopId: s.shopId,
          userId: s.userId,
          status: s.status,
          openingFloat: toMoneyString(s.openingFloat),
          expectedCash: s.expectedCash ? toMoneyString(s.expectedCash) : null,
          countedCash: s.countedCash ? toMoneyString(s.countedCash) : null,
          difference: s.difference ? toMoneyString(s.difference) : null,
          openedAt: s.openedAt.toISOString(),
          closedAt: s.closedAt?.toISOString() ?? null,
        },
      });
    }

    for (const l of stockLevels) {
      changes.push({
        entity: 'stockLevel',
        id: l.id,
        action: 'update',
        version: 1,
        updatedAt: l.updatedAt.toISOString(),
        payload: {
          shopId: l.shopId,
          productId: l.productId,
          quantity: l.quantity.toString(),
        },
      });
    }

    changes.sort((a, b) => {
      const diff = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      return diff !== 0 ? diff : a.id.localeCompare(b.id);
    });

    const page = changes.slice(0, capped);
    const hasMore = changes.length > capped;
    const last = page[page.length - 1];

    return {
      changes: page,
      serverCursor: last ? encodeCursor(new Date(last.updatedAt), last.id) : since ?? null,
      hasMore,
      count: page.length,
      serverTime: new Date().toISOString(),
    };
  }

  async state(businessId: string, deviceId?: string) {
    const cursorTs = new Date();
    const [products, customers, sales, expenses, debts, pending] = await Promise.all([
      this.prisma.product.count({ where: { businessId, isActive: true } }),
      this.prisma.customer.count({ where: { businessId } }),
      this.prisma.sale.count({ where: { businessId } }),
      this.prisma.expense.count({ where: { businessId } }),
      this.prisma.debt.count({ where: { businessId, status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] } } }),
      deviceId
        ? this.prisma.syncOperation.findMany({
            where: { businessId, deviceId, status: { in: ['FAILED', 'CONFLICT'] } },
            orderBy: { createdAt: 'desc' },
            take: 20,
          })
        : Promise.resolve([]),
    ]);

    return {
      serverCursor: encodeCursor(cursorTs, '0'),
      serverTime: cursorTs.toISOString(),
      counts: { products, customers, sales, expenses, openDebts: debts },
      lastPushFailures: pending,
      conflictStrategy: {
        sale: 'append-only',
        expense: 'append-only',
        payment: 'append-only',
        stockMovement: 'append-only',
        product: 'version-based (server-wins)',
        customer: 'version-based (server-wins)',
        debt: 'version-based (server-wins)',
        shop: 'server-wins',
        stockQuantity: 'server-authoritative',
      },
    };
  }

  private async currentCursor(businessId: string): Promise<string> {
    const [product, sale, expense] = await Promise.all([
      this.prisma.product.findFirst({
        where: { businessId },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      this.prisma.sale.findFirst({
        where: { businessId },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      this.prisma.expense.findFirst({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    const candidates = [
      product?.updatedAt,
      sale?.updatedAt,
      expense?.createdAt,
    ].filter((d): d is Date => Boolean(d));

    const latest = candidates.length
      ? new Date(Math.max(...candidates.map((d) => d.getTime())))
      : new Date(0);

    return encodeCursor(latest, '0');
  }

  /** GET /sync/operations — historia ya ops za kifaa. */
  async operations(businessId: string, deviceId?: string, limit = 50) {
    const data = await this.prisma.syncOperation.findMany({
      where: {
        businessId,
        ...(deviceId ? { deviceId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
    return { data, count: data.length };
  }

  /** Purge ops za zamani (siku 30). */
  async purge(businessId: string) {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const res = await this.prisma.syncOperation.deleteMany({
      where: { businessId, createdAt: { lt: cutoff } },
    });
    return { deleted: res.count, cutoff };
  }
}
