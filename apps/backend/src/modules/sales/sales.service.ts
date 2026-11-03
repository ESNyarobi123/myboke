import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, PaymentMethod, Prisma, SaleStatus } from '@prisma/client';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Paginated } from '../../common/dto/pagination.dto';
import { startOfDayEAT, endOfDayEAT, receiptNo, rangeStart, rangeEnd } from '../../common/utils/date.util';
import { clampDiscount, money, toMoneyString } from '../../common/utils/money.util';
import { efdVerificationCode, splitVat } from '../../common/utils/vat.util';
import { receiptPdf } from '../../infra/files/pdf.util';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { GrowthService } from '../growth/growth.service';
import { PlatformService } from '../platform/platform.service';
import {
  AddSalePaymentDto,
  CreateSaleDto,
  HoldSaleDto,
  ListSalesQueryDto,
  RefundSaleDto,
} from './dto/sale.dto';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platform: PlatformService,
    private readonly growth: GrowthService,
  ) {}

  // ── Create ────────────────────────────────────────────────
  async create(user: JwtPayload, dto: CreateSaleDto) {
    if (dto.idempotencyKey) {
      const existing = await this.prisma.sale.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: { items: true, payments: true },
      });
      if (existing) return this.serialize(existing);
    }

    const shop = await this.prisma.shop.findFirst({
      where: { id: dto.shopId, businessId: user.bid, isActive: true },
    });
    if (!shop) throw new NotFoundException('Duka haipo.');

    for (const item of dto.items) {
      if (!item.productId && !item.bundleId) {
        throw new BadRequestException(
          'Kila kipengee kinahitaji productId au bundleId.',
        );
      }
    }

    const productIds = dto.items
      .map((i) => i.productId)
      .filter((id): id is string => Boolean(id));
    const bundleIds = dto.items
      .map((i) => i.bundleId)
      .filter((id): id is string => Boolean(id));

    const [products, bundles] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: productIds }, businessId: user.bid, isActive: true },
      }),
      this.prisma.bundle.findMany({
        where: { id: { in: bundleIds }, businessId: user.bid, isActive: true },
        include: { items: true },
      }),
    ]);
    const byId = new Map(products.map((p) => [p.id, p]));
    const bundleById = new Map(bundles.map((b) => [b.id, b]));

    // Bidhaa za ndani ya bundles (kwa stock + cost).
    const componentIds = [
      ...new Set(bundles.flatMap((b) => b.items.map((i) => i.productId))),
    ];
    const componentProducts = componentIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: componentIds }, businessId: user.bid },
        })
      : [];
    const componentsById = new Map(componentProducts.map((p) => [p.id, p]));

    interface SaleLine {
      productId: string | null;
      name: string;
      quantity: Prisma.Decimal;
      unitSymbol: string;
      price: Prisma.Decimal;
      buyingPrice: Prisma.Decimal;
      discount: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
      components: { productId: string; name: string; quantity: Prisma.Decimal }[];
    }

    const lines: SaleLine[] = dto.items.map((item) => {
      const qty = money(item.quantity);
      const discount = money(item.discount ?? 0);

      if (item.bundleId) {
        const bundle = bundleById.get(item.bundleId);
        if (!bundle) {
          throw new BadRequestException(
            `Bundle ${item.bundleId} haipo kwenye biashara hii.`,
          );
        }
        if (qty.lessThanOrEqualTo(0)) {
          throw new BadRequestException(`Kiasi cha ${bundle.name} si sahihi.`);
        }

        let unitCost = new Prisma.Decimal(0);
        const components = bundle.items.map((bi) => {
          const component = componentsById.get(bi.productId);
          if (!component) {
            throw new BadRequestException(
              `Bidhaa ya bundle ${bundle.name} haipo.`,
            );
          }
          unitCost = unitCost.plus(component.buyingPrice.mul(bi.quantity));
          return {
            productId: bi.productId,
            name: component.name,
            quantity: bi.quantity.mul(qty),
          };
        });

        const price = money(item.price ?? bundle.sellingPrice);
        const gross = price.mul(qty);
        if (discount.greaterThan(gross)) {
          throw new BadRequestException(
            `Punguzo la ${bundle.name} linazidi kiasi chake.`,
          );
        }

        return {
          productId: null,
          name: `${bundle.name} (kifurushi)`,
          quantity: qty,
          unitSymbol: 'bundle',
          price,
          buyingPrice: unitCost,
          discount,
          lineTotal: gross.minus(discount),
          components,
        };
      }

      const product = byId.get(item.productId as string);
      if (!product) {
        throw new BadRequestException(
          `Bidhaa ${item.productId} haipo kwenye biashara hii.`,
        );
      }
      if (qty.lessThanOrEqualTo(0)) {
        throw new BadRequestException(`Kiasi cha ${product.name} si sahihi.`);
      }
      const price = money(item.price ?? product.sellingPrice);
      const buyingPrice = money(product.buyingPrice);
      const gross = price.mul(qty);

      if (discount.greaterThan(gross)) {
        throw new BadRequestException(
          `Punguzo la ${product.name} linazidi kiasi chake.`,
        );
      }

      return {
        productId: product.id,
        name: product.name,
        quantity: qty,
        unitSymbol: product.unitSymbol,
        price,
        buyingPrice,
        discount,
        lineTotal: gross.minus(discount),
        components: [
          { productId: product.id, name: product.name, quantity: qty },
        ],
      };
    });

    const subtotal = lines.reduce(
      (acc, l) => acc.plus(l.price.mul(l.quantity)),
      new Prisma.Decimal(0),
    );
    const discount = clampDiscount(dto.discount ?? 0, subtotal);
    const total = subtotal.minus(discount);
    const costTotal = lines.reduce(
      (acc, l) => acc.plus(l.buyingPrice.mul(l.quantity)),
      new Prisma.Decimal(0),
    );
    const profit = total.minus(costTotal);
    const saleDate = dto.saleDate ? new Date(dto.saleDate) : new Date();

    const dayStart = startOfDayEAT(saleDate);
    const dayEnd = endOfDayEAT(saleDate);
    const todaysCount = await this.prisma.sale.count({
      where: { businessId: user.bid, saleDate: { gte: dayStart, lte: dayEnd } },
    });

    // ── Split payment (D12) ───────────────────────────────
    const method = dto.paymentMethod ?? PaymentMethod.CASH;
    const deposit = dto.paidAmount !== undefined ? money(dto.paidAmount) : null;
    const splits = (dto.payments ?? []).map((p) => ({
      method: p.method,
      amount: money(p.amount),
      reference: p.reference,
    }));
    const splitTotal = splits.reduce(
      (acc, p) => acc.plus(p.amount),
      new Prisma.Decimal(0),
    );
    if (splits.some((p) => p.amount.lessThanOrEqualTo(0))) {
      throw new BadRequestException('Kila malipo ya split lazima yawe > 0.');
    }
    if (splits.length > 0 && splitTotal.greaterThan(total)) {
      throw new BadRequestException(
        `Malipo ya split (${splitTotal.toFixed(2)}) yanazidi jumla (${total.toFixed(2)}).`,
      );
    }

    const effectivePaid =
      splits.length > 0
        ? splitTotal
        : (deposit ??
          (method === PaymentMethod.CREDIT ? new Prisma.Decimal(0) : total));
    const unpaid = total.minus(effectivePaid);

    if (dto.customerId && unpaid.greaterThan(0)) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, businessId: user.bid },
      });
      if (!customer) {
        throw new BadRequestException('Mteja haipo kwenye biashara hii.');
      }
      if (customer.creditLimit && customer.creditLimit.greaterThan(0)) {
        const [priorSales, priorPaid] = await Promise.all([
          this.prisma.sale.aggregate({
            where: {
              businessId: user.bid,
              customerId: dto.customerId,
              status: { not: SaleStatus.VOIDED },
            },
            _sum: { total: true },
          }),
          this.prisma.payment.aggregate({
            where: {
              businessId: user.bid,
              sale: { customerId: dto.customerId },
            },
            _sum: { amount: true },
          }),
        ]);
        const outstanding = new Prisma.Decimal(
          priorSales._sum?.total ?? 0,
        ).minus(priorPaid._sum?.amount ?? 0);
        const nextOutstanding = outstanding.plus(unpaid);
        if (nextOutstanding.greaterThan(customer.creditLimit)) {
          throw new ConflictException({
            code: 'CREDIT_LIMIT_EXCEEDED',
            message: `Kikomo cha deni cha ${customer.name} ni ${customer.creditLimit.toFixed(
              2,
            )}; deni jipya lingefika ${nextOutstanding.toFixed(2)}.`,
            creditLimit: customer.creditLimit.toFixed(2),
            outstanding: outstanding.toFixed(2),
            requested: unpaid.toFixed(2),
          });
        }
      }
    }

    // ── Loyalty points (E8): pointi 1 kwa kila 1,000 iliyolipwa ──
    const loyaltyPoints = Math.floor(Number(effectivePaid) / 1000);

    const sale = await this.prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          businessId: user.bid,
          shopId: dto.shopId,
          receiptNo: receiptNo(todaysCount + 1, saleDate),
          customerId: dto.customerId,
          sellerId: user.sub,
          saleDate,
          subtotal,
          discount,
          total,
          costTotal,
          profit,
          paymentMethod:
            splits.length > 1 ? PaymentMethod.MIXED : (splits[0]?.method ?? method),
          note: dto.note,
          idempotencyKey: dto.idempotencyKey,
          syncedAt: new Date(),
          items: {
            create: lines.map((l) => ({
              productId: l.productId ?? undefined,
              name: l.name,
              quantity: l.quantity,
              unitSymbol: l.unitSymbol,
              price: l.price,
              buyingPrice: l.buyingPrice,
              discount: l.discount,
              lineTotal: l.lineTotal,
            })),
          },
        },
        include: { items: true },
      });

      for (const line of lines) {
        for (const component of line.components) {
          const level = await tx.stockLevel.upsert({
            where: {
              shopId_productId: {
                shopId: dto.shopId,
                productId: component.productId,
              },
            },
            create: {
              shopId: dto.shopId,
              productId: component.productId,
              quantity: component.quantity.negated(),
            },
            update: { quantity: { decrement: component.quantity } },
          });

          if (Number(level.quantity) < 0) {
            throw new ConflictException({
              code: 'INSUFFICIENT_STOCK',
              message: `Stock haitoshi: ${component.name}`,
              productId: component.productId,
              available: Number(level.quantity) + Number(component.quantity),
              requested: Number(component.quantity),
            });
          }

          await tx.stockMovement.create({
            data: {
              shopId: dto.shopId,
              productId: component.productId,
              type: MovementType.OUT,
              quantity: component.quantity.negated(),
              reason: line.productId ? 'sale' : 'sale-bundle',
              refType: 'sale',
              refId: created.id,
              userId: user.sub,
            },
          });
        }
      }

      // ── Malipo ya awali ────────────────────────────────────
      // CREDIT = deni: hakuna malipo unless client ametuma `paidAmount` (deposit).
      // MIXED = malipo ya sehemu; CASH/MPESA/AIRTEL = malipo kamili.
      if (deposit && deposit.greaterThan(total)) {
        throw new BadRequestException(
          `Malipo ya awali yanazidi jumla (${total.toFixed(2)}).`,
        );
      }
      if (deposit && deposit.lessThan(0)) {
        throw new BadRequestException('Malipo ya awali hayawezi kuwa hasi.');
      }
      if (splits.length > 0) {
        for (const split of splits) {
          await tx.payment.create({
            data: {
              businessId: user.bid,
              saleId: created.id,
              amount: split.amount,
              method: split.method,
              reference: split.reference,
              recordedBy: user.sub,
            },
          });
        }
      } else if (!deposit && method === PaymentMethod.CREDIT) {
        // deni lote — hakuna Payment record
      } else {
        const paidAmount = deposit ?? total;
        if (paidAmount.greaterThan(0)) {
          await tx.payment.create({
            data: {
              businessId: user.bid,
              saleId: created.id,
              amount: paidAmount,
              method,
              recordedBy: user.sub,
            },
          });
        }
      }

      if (dto.customerId && loyaltyPoints > 0) {
        await tx.customer.update({
          where: { id: dto.customerId },
          data: { loyaltyPoints: { increment: loyaltyPoints } },
        });
      }

      return created;
    });

    // §8 — coins: sale ya kwanza ya siku (+2), mara moja kwa siku.
    void this.growth
      .awardMilestone(user.sub, 'first_sale', sale.id)
      .catch(() => undefined);

    // Webhooks (best-effort, haiathiri mauzo — I16).
    void this.platform
      .dispatch(user.bid, 'sale.created', {
        saleId: sale.id,
        receiptNo: sale.receiptNo,
        total: sale.total.toFixed(2),
        shopId: sale.shopId,
        paymentMethod: sale.paymentMethod,
      })
      .catch(() => undefined);

    return this.get(user.bid, sale.id);
  }

  // ── Hold / park sale (D13) ────────────────────────────────
  async hold(user: JwtPayload, dto: HoldSaleDto) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: dto.shopId, businessId: user.bid, isActive: true },
    });
    if (!shop) throw new NotFoundException('Duka haipo.');

    return this.prisma.heldSale.create({
      data: {
        businessId: user.bid,
        shopId: dto.shopId,
        userId: user.sub,
        label: dto.label,
        payload: dto.payload as Prisma.InputJsonValue,
      },
    });
  }

  async heldList(businessId: string, shopId?: string) {
    const rows = await this.prisma.heldSale.findMany({
      where: { businessId, ...(shopId ? { shopId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { data: rows, total: rows.length };
  }

  async heldGet(businessId: string, id: string) {
    const row = await this.prisma.heldSale.findFirst({
      where: { id, businessId },
    });
    if (!row) throw new NotFoundException('Mauzo yaliyohifadhiwa hayapo.');
    return row;
  }

  async heldDelete(businessId: string, id: string) {
    const row = await this.prisma.heldSale.findFirst({
      where: { id, businessId },
    });
    if (!row) throw new NotFoundException('Mauzo yaliyohifadhiwa hayapo.');
    await this.prisma.heldSale.delete({ where: { id } });
    return { success: true };
  }

  // ── Read ──────────────────────────────────────────────────
  async list(businessId: string, q: ListSalesQueryDto): Promise<Paginated<unknown>> {
    const limit = Math.min(Number(q.limit ?? 50), 200);
    const where: Prisma.SaleWhereInput = {
      businessId,
      ...(q.shopId ? { shopId: q.shopId } : {}),
      ...(q.customerId ? { customerId: q.customerId } : {}),
      ...(q.from || q.to
        ? {
            saleDate: {
              ...(q.from ? { gte: rangeStart(q.from) } : {}),
              ...(q.to ? { lte: rangeEnd(q.to) } : {}),
            },
          }
        : {}),
    };

    const rows = await this.prisma.sale.findMany({
      where,
      take: limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      orderBy: { saleDate: 'desc' },
      include: {
        items: true,
        shop: { select: { id: true, name: true } },
        payments: true,
      },
    });

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const vat = await this.vatSettings(businessId);
    return {
      data: data.map((s) => this.serialize(s, vat)),
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }

  async get(businessId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, businessId },
      include: {
        items: true,
        payments: true,
        shop: { select: { id: true, name: true, address: true, phone: true } },
        business: {
          select: {
            vatEnabled: true,
            vatRate: true,
            isVatRegistered: true,
            vatNumber: true,
            efdSerial: true,
            currency: true,
          },
        },
      },
    });
    if (!sale) throw new NotFoundException('Mauzo hayapo.');
    return this.serialize(sale, {
      enabled: sale.business.vatEnabled && sale.business.isVatRegistered
        ? true
        : sale.business.vatEnabled,
      rate: Number(sale.business.vatRate),
      isVatRegistered: sale.business.isVatRegistered,
      vatNumber: sale.business.vatNumber,
      efdSerial: sale.business.efdSerial,
      currency: sale.business.currency,
    });
  }

  /** Mipangilio ya VAT ya biashara — hutumika kwenye serialization ya mauzo. */
  private async vatSettings(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        vatEnabled: true,
        vatRate: true,
        isVatRegistered: true,
        vatNumber: true,
        efdSerial: true,
        currency: true,
      },
    });
    return {
      enabled: business?.vatEnabled ?? false,
      rate: Number(business?.vatRate ?? 0),
      isVatRegistered: business?.isVatRegistered ?? false,
      vatNumber: business?.vatNumber ?? null,
      efdSerial: business?.efdSerial ?? null,
      currency: business?.currency ?? 'TZS',
    };
  }

  async receipt(businessId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, businessId },
      include: {
        items: true,
        payments: true,
        shop: true,
        business: true,
      },
    });
    if (!sale) throw new NotFoundException('Mauzo hayapo.');

    return {
      business: {
        name: sale.business.name,
        tin: sale.business.tin,
        vatNumber: sale.business.vatNumber,
        isVatRegistered: sale.business.isVatRegistered,
        efdSerial: sale.business.efdSerial,
        phone: sale.shop.phone,
        address: sale.shop.address,
      },
      receiptNo: sale.receiptNo,
      saleDate: sale.saleDate,
      items: sale.items.map((i) => ({
        name: i.name,
        quantity: i.quantity.toString(),
        unitSymbol: i.unitSymbol,
        price: toMoneyString(i.price),
        lineTotal: toMoneyString(i.lineTotal),
      })),
      subtotal: toMoneyString(sale.subtotal),
      discount: toMoneyString(sale.discount),
      total: toMoneyString(sale.total),
      vat: splitVat(sale.total, sale.business.vatEnabled ? sale.business.vatRate : 0),
      efd: sale.business.isVatRegistered
        ? {
            receiptNo: sale.efdReceiptNo,
            verificationCode: sale.efdVerificationCode,
            issuedAt: sale.efdIssuedAt,
          }
        : null,
      payments: sale.payments.map((p) => ({
        method: p.method,
        amount: toMoneyString(p.amount),
        reference: p.reference,
      })),
      currency: sale.business.currency,
    };
  }

  /** Weka namba ya EFD risiti kwa mkono (awamu ya MVP kabla ya VFD). */
  async attachEfd(businessId: string, id: string, efdReceiptNo: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id, businessId } });
    if (!sale) throw new NotFoundException('Mauzo hayapo.');

    const updated = await this.prisma.sale.update({
      where: { id },
      data: {
        efdReceiptNo,
        efdVerificationCode: efdVerificationCode(`${id}:${efdReceiptNo}`),
        efdIssuedAt: new Date(),
      },
    });
    return { efdReceiptNo: updated.efdReceiptNo, efdVerificationCode: updated.efdVerificationCode };
  }

  // ── Mutations ─────────────────────────────────────────────
  async refund(businessId: string, userId: string, id: string, dto: RefundSaleDto) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, businessId },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException('Mauzo hayapo.');
    if (sale.status === SaleStatus.REFUNDED) {
      throw new BadRequestException('Mauzo haya yalisharudishwa.');
    }

    const restock = dto.restock ?? true;

    await this.prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id },
        data: { status: SaleStatus.REFUNDED, note: dto.reason ?? sale.note },
      });

      if (!restock) return;

      for (const item of sale.items) {
        if (!item.productId) continue;
        await tx.stockLevel.upsert({
          where: {
            shopId_productId: {
              shopId: sale.shopId,
              productId: item.productId,
            },
          },
          create: {
            shopId: sale.shopId,
            productId: item.productId,
            quantity: item.quantity,
          },
          update: { quantity: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            shopId: sale.shopId,
            productId: item.productId,
            type: MovementType.IN,
            quantity: item.quantity,
            reason: 'refund',
            refType: 'sale',
            refId: sale.id,
            userId,
          },
        });
      }
    });

    return this.get(businessId, id);
  }

  async void(businessId: string, userId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, businessId },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException('Mauzo hayapo.');

    await this.prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id },
        data: { status: SaleStatus.VOIDED },
      });
      for (const item of sale.items) {
        if (!item.productId) continue;
        await tx.stockLevel.update({
          where: {
            shopId_productId: {
              shopId: sale.shopId,
              productId: item.productId,
            },
          },
          data: { quantity: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            shopId: sale.shopId,
            productId: item.productId,
            type: MovementType.IN,
            quantity: item.quantity,
            reason: 'void',
            refType: 'sale',
            refId: sale.id,
            userId,
          },
        });
      }
    });

    return { success: true };
  }

  async addPayment(businessId: string, id: string, dto: AddSalePaymentDto, userId: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, businessId },
      include: { payments: true },
    });
    if (!sale) throw new NotFoundException('Mauzo hayapo.');

    const paid = sale.payments.reduce(
      (acc, p) => acc.plus(p.amount),
      new Prisma.Decimal(0),
    );
    const balance = money(sale.total).minus(paid);
    const amount = money(dto.amount);

    if (amount.greaterThan(balance)) {
      throw new BadRequestException(
        `Kiasi kinazidi salio. Salio: ${balance.toFixed(2)}`,
      );
    }

    await this.prisma.payment.create({
      data: {
        businessId,
        saleId: id,
        amount,
        method: dto.method,
        reference: dto.reference,
        recordedBy: userId,
      },
    });

    return this.get(businessId, id);
  }

  /** PATCH /sales/:id — rekebisha taarifa zisizoathiri hesabu kwa nguvu. */
  async update(
    businessId: string,
    id: string,
    dto: {
      note?: string;
      customerId?: string | null;
      discount?: string;
      paymentMethod?: 'CASH' | 'MPESA' | 'AIRTEL' | 'MIXED' | 'CREDIT';
    },
    userId: string,
  ) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, businessId },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException('Mauzo hayapo.');
    if (sale.status === SaleStatus.VOIDED) {
      throw new BadRequestException('Mauzo yaliyofutwa hayabadilishiki.');
    }

    let subtotal = sale.subtotal;
    let discount = sale.discount;
    let total = sale.total;
    let profit = sale.profit;

    if (dto.discount !== undefined) {
      const requested = money(dto.discount);
      if (requested.lessThan(0)) {
        throw new BadRequestException('Punguzo haliwezi kuwa hasi.');
      }
      if (requested.greaterThan(sale.subtotal)) {
        throw new BadRequestException('Punguzo linazidi jumla ndogo.');
      }
      subtotal = sale.subtotal;
      discount = requested;
      total = sale.subtotal.minus(requested);
      profit = total.minus(sale.costTotal);
    }

    const updated = await this.prisma.sale.update({
      where: { id },
      data: {
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        ...(dto.customerId !== undefined ? { customerId: dto.customerId } : {}),
        ...(dto.paymentMethod ? { paymentMethod: dto.paymentMethod } : {}),
        ...(dto.discount !== undefined
          ? { discount, total, profit }
          : {}),
      },
      include: { items: true, payments: true },
    });

    await this.prisma.auditLog.create({
      data: {
        businessId,
        userId,
        action: 'SALE_UPDATED',
        entity: 'Sale',
        entityId: id,
        before: {
          discount: sale.discount.toString(),
          total: sale.total.toString(),
          note: sale.note,
        },
        after: {
          discount: updated.discount.toString(),
          total: updated.total.toString(),
          note: updated.note,
        },
      },
    });

    return this.serialize(updated);
  }

  // ── Risiti: HTML & PDF ─────────────────────────────────────
  /** D19 — QR ya risiti kama data URL (PNG base64). */
  private async receiptQr(
    saleId: string,
    receiptNoValue: string,
    verifyCode: string,
  ): Promise<string | null> {
    try {
      const bwipjs = (await import('bwip-js')).default;
      const base =
        process.env.PUBLIC_RECEIPT_BASE_URL ?? 'https://myboke.app/r';
      const payload = `${base}/${saleId}?v=${verifyCode}`;
      const png = await bwipjs.toBuffer({
        bcid: 'qrcode',
        text: payload,
        scale: 4,
        padding: 2,
      });
      return `data:image/png;base64,${png.toString('base64')}`;
    } catch {
      // QR ni ya hiari — risiti isizuiliwe.
      void receiptNoValue;
      return null;
    }
  }

  async receiptHtml(businessId: string, id: string): Promise<string> {
    const r = await this.receipt(businessId, id);
    const qr = await this.receiptQr(
      id,
      r.receiptNo,
      r.efd?.verificationCode ?? r.receiptNo,
    );

    const rows = r.items
      .map(
        (i) => `
        <tr>
          <td>${escapeHtml(i.name)}</td>
          <td class="r">${i.quantity}</td>
          <td class="r">${i.price}</td>
          <td class="r">${i.lineTotal}</td>
        </tr>`,
      )
      .join('');

    const vatRows = r.vat
      ? `<tr><td>Net (VAT ${r.vat.rate}%)</td><td class="r">${r.vat.net}</td></tr>
         <tr><td>VAT ${r.vat.rate}%</td><td class="r">${r.vat.vat}</td></tr>`
      : '';

    return `<!doctype html>
<html lang="sw">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Risiti ${escapeHtml(r.receiptNo)}</title>
<style>
  :root { --blue:#0B37A1; --royal:#0269E9; --ink:#0F172A; }
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#F1F5F9;margin:0;padding:24px;color:var(--ink)}
  .receipt{max-width:360px;margin:0 auto;background:#fff;border-radius:16px;padding:20px;box-shadow:0 8px 30px rgba(11,55,161,.12)}
  .brand{text-align:center;border-bottom:2px dashed #CBD5E1;padding-bottom:12px;margin-bottom:12px}
  .brand h1{margin:0;font-size:16px;color:var(--blue);letter-spacing:.5px}
  .brand p{margin:2px 0;font-size:11px;color:#64748B}
  .meta{display:flex;justify-content:space-between;font-size:12px;margin:4px 0}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{padding:4px 0;text-align:left}
  td.r,th.r{text-align:right}
  thead th{font-size:10px;text-transform:uppercase;color:#64748B;border-bottom:1px solid #E2E8F0}
  .totals{margin-top:10px;border-top:2px dashed #CBD5E1;padding-top:8px}
  .grand{font-weight:700;font-size:15px;color:var(--blue)}
  .efd{margin-top:10px;font-size:10px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:8px;color:#065F46}
  .thanks{text-align:center;margin-top:14px;font-size:12px;color:var(--royal);font-weight:600}
  .qr{text-align:center;margin-top:12px}
  .qr p{margin:4px 0 0;font-size:9px;color:#64748B}
  @media print{body{background:#fff;padding:0}.receipt{box-shadow:none}}
</style>
</head>
<body>
  <div class="receipt">
    <div class="brand">
      <h1>${escapeHtml(r.business.name)}</h1>
      ${r.business.address ? `<p>${escapeHtml(r.business.address)}</p>` : ''}
      ${r.business.phone ? `<p>Simu: ${escapeHtml(r.business.phone)}</p>` : ''}
      ${r.business.tin ? `<p>TIN: ${escapeHtml(r.business.tin)}</p>` : ''}
      ${r.business.vatNumber ? `<p>VAT: ${escapeHtml(r.business.vatNumber)}</p>` : ''}
    </div>
    <div class="meta"><span>Risiti</span><strong>${escapeHtml(r.receiptNo)}</strong></div>
    <div class="meta"><span>Tarehe</span><span>${new Date(r.saleDate).toLocaleString('en-GB')}</span></div>
    <table>
      <thead><tr><th>Bidhaa</th><th class="r">Idadi</th><th class="r">Bei</th><th class="r">Jumla</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <table>
        <tr><td>Jumla ndogo</td><td class="r">${r.subtotal}</td></tr>
        ${Number(r.discount) > 0 ? `<tr><td>Punguzo</td><td class="r">-${r.discount}</td></tr>` : ''}
        ${vatRows}
        <tr class="grand"><td>JUMLA</td><td class="r">${r.currency} ${r.total}</td></tr>
      </table>
    </div>
    ${
      r.efd?.receiptNo || r.efd?.verificationCode
        ? `<div class="efd"><strong>EFD:</strong> ${escapeHtml(r.efd.receiptNo ?? '')}<br/>Verification: ${escapeHtml(r.efd.verificationCode ?? '')}</div>`
        : ''
    }
    ${
      qr
        ? `<div class="qr"><img src="${qr}" alt="QR ya risiti" width="120" height="120" /><p>Scan kuthibitisha risiti</p></div>`
        : ''
    }
    <div class="thanks">Asante kwa kununua!</div>
  </div>
</body>
</html>`;
  }

  async receiptPdf(businessId: string, id: string, widthMm: 58 | 80 = 80) {
    const r = await this.receipt(businessId, id);
    const qr = await this.receiptQr(
      id,
      r.receiptNo,
      r.efd?.verificationCode ?? r.receiptNo,
    );
    return receiptPdf({
      businessName: r.business.name,
      shopName: '',
      address: r.business.address,
      phone: r.business.phone,
      tin: r.business.tin,
      vatNumber: r.business.vatNumber,
      receiptNo: r.receiptNo,
      saleDate: r.saleDate,
      currency: r.currency,
      items: r.items,
      subtotal: r.subtotal,
      discount: r.discount,
      total: r.total,
      vat: r.vat,
      payments: r.payments,
      efd: r.efd,
      qrDataUrl: qr,
      widthMm,
    });
  }

  /** POST /sales/:id/share — viungo vya kushiriki risiti. */
  async share(businessId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, businessId },
      include: {
        items: true,
        shop: { select: { name: true, phone: true } },
        business: { select: { name: true, currency: true } },
      },
    });
    if (!sale) throw new NotFoundException('Mauzo hayapo.');

    const customer = sale.customerId
      ? await this.prisma.customer.findFirst({
          where: { id: sale.customerId, businessId },
          select: { name: true, phone: true },
        })
      : null;

    const text =
      `*${sale.business.name}*\n` +
      `Risiti: ${sale.receiptNo}\n` +
      `Tarehe: ${sale.saleDate.toLocaleString('en-GB')}\n\n` +
      sale.items
        .map(
          (i) =>
            `• ${i.name} x${Number(i.quantity)} = ${sale.business.currency} ${Number(
              i.lineTotal,
            ).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        )
        .join('\n') +
      `\n\n*JUMLA: ${sale.business.currency} ${Number(sale.total).toLocaleString(
        'en-US',
        { minimumFractionDigits: 2 },
      )}*\nAsante kwa kununua!`;

    const phone = customer?.phone?.replace(/\D/g, '') ?? '';
    const waPhone = phone.startsWith('0')
      ? `255${phone.slice(1)}`
      : phone.startsWith('255')
        ? phone
        : phone;

    const base = process.env.PUBLIC_RECEIPT_BASE_URL ?? 'https://myboke.app/r';
    const verifyCode = sale.efdVerificationCode ?? sale.id.slice(-10);

    return {
      receiptNo: sale.receiptNo,
      text,
      links: {
        whatsapp: waPhone
          ? `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`
          : `https://wa.me/?text=${encodeURIComponent(text)}`,
        sms: phone ? `sms:${phone}?body=${encodeURIComponent(text)}` : null,
        publicUrl: `${base}/${sale.id}?v=${verifyCode}`,
      },
      qrPayload: `${base}/${sale.id}?v=${verifyCode}`,
    };
  }

  /** GET /sales/:id/payments — malipo yote ya mauzo. */
  async payments(businessId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id, businessId } });
    if (!sale) throw new NotFoundException('Mauzo hayapo.');
    const data = await this.prisma.payment.findMany({
      where: { saleId: id },
      orderBy: { paidAt: 'asc' },
    });
    const paid = data.reduce((a, p) => a.plus(p.amount), new Prisma.Decimal(0));
    return {
      data,
      paid: paid.toFixed(2),
      balance: sale.total.minus(paid).toFixed(2),
      method: sale.paymentMethod,
    };
  }

  private serialize(
    sale: Record<string, any>,
    vatSettings?: {
      enabled: boolean;
      rate: number;
      isVatRegistered: boolean;
      vatNumber: string | null;
      efdSerial: string | null;
      currency: string;
    },
  ) {
    const total = new Prisma.Decimal(sale.total ?? 0);
    const paid = Array.isArray(sale.payments)
      ? sale.payments.reduce(
          (acc: Prisma.Decimal, p: { amount: Prisma.Decimal.Value }) =>
            acc.plus(p.amount ?? 0),
          new Prisma.Decimal(0),
        )
      : new Prisma.Decimal(0);

    // VAT 18% inclusive — kodi imo ndani ya `total`, sio juu yake.
    const rate = vatSettings?.rate ?? 0;
    const enabled = Boolean(vatSettings?.enabled) && rate > 0;
    const breakdown = splitVat(total, enabled ? rate : 0);

    const out: Record<string, any> = {
      ...sale,
      subtotal: toMoneyString(sale.subtotal),
      discount: toMoneyString(sale.discount),
      total: toMoneyString(sale.total),
      costTotal: toMoneyString(sale.costTotal),
      profit: toMoneyString(sale.profit),
      paid: toMoneyString(paid),
      balance: toMoneyString(total.minus(paid)),
      vat: {
        enabled,
        inclusive: true,
        rate: enabled ? rate : 0,
        ratePercent: enabled ? Number((rate * 100).toFixed(2)) : 0,
        amount: breakdown.vat,
        netTotal: breakdown.net,
        grossTotal: breakdown.gross,
        isVatRegistered: vatSettings?.isVatRegistered ?? false,
        vatNumber: vatSettings?.vatNumber ?? null,
        efdReceiptNo: sale.efdReceiptNo ?? null,
      },
    };
    if (Array.isArray(sale.items)) {
      out.items = sale.items.map((i: any) => ({
        ...i,
        quantity: i.quantity,
        price: toMoneyString(i.price),
        buyingPrice: toMoneyString(i.buyingPrice),
        discount: toMoneyString(i.discount),
        lineTotal: toMoneyString(i.lineTotal),
      }));
    }
    if (Array.isArray(sale.payments)) {
      out.payments = sale.payments.map((p: any) => ({
        ...p,
        amount: toMoneyString(p.amount),
      }));
    }
    return out;
  }
}


function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
