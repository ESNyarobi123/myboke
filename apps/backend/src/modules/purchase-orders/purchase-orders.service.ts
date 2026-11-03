import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, POStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  CreatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from './dto/purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private async nextNumber(businessId: string): Promise<string> {
    const count = await this.prisma.purchaseOrder.count({ where: { businessId } });
    const year = new Date().getFullYear();
    return `PO-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  private computeTotal(
    items: { quantity: string; unitCost: string }[],
  ): Prisma.Decimal {
    return items.reduce(
      (acc, i) => acc.plus(new Prisma.Decimal(i.quantity).mul(i.unitCost)),
      new Prisma.Decimal(0),
    );
  }

  async list(businessId: string, status?: POStatus, limit = 50) {
    const data = await this.prisma.purchaseOrder.findMany({
      where: { businessId, ...(status ? { status } : {}) },
      orderBy: { orderedAt: 'desc' },
      take: Math.min(limit, 200),
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        items: true,
      },
    });

    return {
      count: data.length,
      data: data.map((o) => ({
        ...o,
        total: o.total.toFixed(2),
        items: o.items.map((i) => ({
          ...i,
          quantity: i.quantity.toString(),
          receivedQty: i.receivedQty.toString(),
          unitCost: i.unitCost.toFixed(2),
          lineTotal: i.quantity.mul(i.unitCost).toFixed(2),
        })),
      })),
    };
  }

  async get(businessId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, businessId },
      include: {
        supplier: true,
        items: true,
      },
    });
    if (!order) throw new NotFoundException('Purchase order haipo.');

    return {
      ...order,
      total: order.total.toFixed(2),
      items: order.items.map((i) => ({
        ...i,
        quantity: i.quantity.toString(),
        receivedQty: i.receivedQty.toString(),
        unitCost: i.unitCost.toFixed(2),
        lineTotal: i.quantity.mul(i.unitCost).toFixed(2),
      })),
    };
  }

  async create(
    businessId: string,
    userId: string,
    dto: CreatePurchaseOrderDto,
  ) {
    const [supplier, shop] = await Promise.all([
      this.prisma.supplier.findFirst({ where: { id: dto.supplierId, businessId } }),
      this.prisma.shop.findFirst({ where: { id: dto.shopId, businessId } }),
    ]);
    if (!supplier) throw new NotFoundException('Msambazaji haipo.');
    if (!shop) throw new NotFoundException('Duka haipo.');

    const total = this.computeTotal(dto.items);
    const number = await this.nextNumber(businessId);

    return this.prisma.purchaseOrder.create({
      data: {
        number,
        businessId,
        supplierId: dto.supplierId,
        shopId: dto.shopId,
        status: POStatus.DRAFT,
        total,
        notes: dto.notes,
        createdBy: userId,
        items: {
          create: dto.items.map((i) => ({
            productId: i.productId,
            name: i.name,
            quantity: i.quantity,
            unitCost: i.unitCost,
          })),
        },
      },
      include: { items: true, supplier: true },
    });
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdatePurchaseOrderDto,
  ) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, businessId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Purchase order haipo.');
    if (order.status === POStatus.RECEIVED) {
      throw new BadRequestException('Order iliyopokelewa haiwezi kubadilishwa.');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.items && dto.items.length > 0) {
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
        await tx.purchaseOrderItem.createMany({
          data: dto.items.map((i) => ({
            purchaseOrderId: id,
            productId: i.productId,
            name: i.name,
            quantity: i.quantity,
            unitCost: i.unitCost,
          })),
        });
      }

      const total = dto.items ? this.computeTotal(dto.items) : order.total;

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
          ...(dto.status ? { status: dto.status as POStatus } : {}),
          total,
        },
        include: { items: true, supplier: true },
      });
    });
  }

  async send(businessId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, businessId },
      include: { items: true, supplier: true },
    });
    if (!order) throw new NotFoundException('Purchase order haipo.');
    if (order.status !== POStatus.DRAFT) {
      throw new BadRequestException('Order hii si DRAFT.');
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: POStatus.SENT },
    });

    const text = [
      `Habari ${order.supplier.name},`,
      `Tunataka kuagiza yafuatayo (${order.number}):`,
      ...order.items.map(
        (i) =>
          `• ${i.name} — ${i.quantity.toString()} x ${i.unitCost.toFixed(2)} = ${i.quantity.mul(i.unitCost).toFixed(2)}`,
      ),
      `JUMLA: ${order.total.toFixed(2)}`,
      '',
      'Asante.',
    ].join('\n');

    const phone = order.supplier.phone?.replace(/\D/g, '') ?? '';
    const waPhone = phone.startsWith('0') ? `255${phone.slice(1)}` : phone;

    return {
      order: { ...updated, total: updated.total.toFixed(2) },
      share: {
        text,
        whatsapp: `https://wa.me/${waPhone || ''}?text=${encodeURIComponent(text)}`,
        sms: phone ? `sms:${phone}?body=${encodeURIComponent(text)}` : null,
      },
    };
  }

  /** Pokea bidhaa → ongeza stock na (hiari) sasisha bei ya kununua. */
  async receive(
    businessId: string,
    userId: string,
    id: string,
    dto: ReceivePurchaseOrderDto,
  ) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, businessId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Purchase order haipo.');
    if (order.status === POStatus.RECEIVED) {
      throw new BadRequestException('Order hii imepokelewa tayari.');
    }
    if (order.status === POStatus.CANCELLED) {
      throw new BadRequestException('Order hii imefutwa.');
    }

    const qtyByItem = new Map(
      (dto.items ?? []).map((i) => [i.itemId, new Prisma.Decimal(i.receivedQty)]),
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const received: {
        itemId: string;
        productId: string | null;
        name: string;
        quantity: string;
      }[] = [];

      for (const item of order.items) {
        const qty = qtyByItem.get(item.id) ?? item.quantity;
        if (qty.lessThanOrEqualTo(0)) continue;

        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { receivedQty: item.receivedQty.plus(qty) },
        });

        if (item.productId) {
          await tx.stockLevel.upsert({
            where: {
              shopId_productId: {
                shopId: order.shopId,
                productId: item.productId,
              },
            },
            create: {
              shopId: order.shopId,
              productId: item.productId,
              quantity: qty,
            },
            update: { quantity: { increment: qty } },
          });

          await tx.stockMovement.create({
            data: {
              shopId: order.shopId,
              productId: item.productId,
              type: MovementType.IN,
              quantity: qty,
              reason: `purchase:${order.number}`,
              refType: 'purchase_order',
              refId: order.id,
              userId,
            },
          });

          if (dto.updateCostPrice !== false) {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
            });
            if (product && !product.buyingPrice.equals(item.unitCost)) {
              await tx.priceHistory.create({
                data: {
                  productId: item.productId,
                  field: 'buyingPrice',
                  oldValue: product.buyingPrice,
                  newValue: item.unitCost,
                  reason: `purchase:${order.number}`,
                  changedBy: userId,
                },
              });
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  buyingPrice: item.unitCost,
                  version: { increment: 1 },
                },
              });
            }
          }
        }

        received.push({
          itemId: item.id,
          productId: item.productId,
          name: item.name,
          quantity: qty.toString(),
        });
      }

      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: { status: POStatus.RECEIVED, receivedAt: new Date() },
      });

      return { order: updated, received };
    });

    return {
      order: { ...result.order, total: result.order.total.toFixed(2) },
      received: result.received,
      stockUpdated: result.received.filter((r) => r.productId).length,
    };
  }

  async cancel(businessId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, businessId },
    });
    if (!order) throw new NotFoundException('Purchase order haipo.');
    if (order.status === POStatus.RECEIVED) {
      throw new BadRequestException('Order iliyopokelewa haiwezi kufutwa.');
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: POStatus.CANCELLED },
    });
    return { success: true, status: updated.status };
  }
}
