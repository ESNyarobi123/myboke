import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceDocStatus, Prisma } from '@prisma/client';
import { invoicePdf, InvoiceTemplate } from '../../infra/files/invoice.util';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  CreateInvoiceDto,
  InvoiceItemDto,
  ListInvoicesQueryDto,
  UpdateInvoiceDto,
} from './dto/invoice.dto';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ────────────────────────────────────────────────

  private computeTotals(
    items: InvoiceItemDto[],
    discount = 0,
    taxRate = 0,
  ) {
    const lines = items.map((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      return {
        productId: item.productId ?? null,
        description: item.description,
        quantity,
        unitPrice,
        lineTotal: round2(quantity * unitPrice),
      };
    });

    const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
    const disc = Math.min(round2(discount), subtotal);
    const taxable = round2(subtotal - disc);
    const taxAmount = round2((taxable * Number(taxRate)) / 100);
    const total = round2(taxable + taxAmount);
    return { lines, subtotal, discount: disc, taxAmount, total };
  }

  private async nextNumber(businessId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const last = await this.prisma.salesInvoice.findFirst({
      where: { businessId, number: { startsWith: prefix } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const seq = last ? Number(last.number.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  private effectiveStatus(invoice: {
    status: InvoiceDocStatus;
    dueDate: Date | null;
    amountPaid: Prisma.Decimal;
    total: Prisma.Decimal;
  }): InvoiceDocStatus {
    if (invoice.status === 'PAID' || invoice.status === 'VOID') {
      return invoice.status;
    }
    if (Number(invoice.amountPaid) >= Number(invoice.total)) return 'PAID';
    // Rasimu (DRAFT) haijatumwa kwa mteja — haichukuliwi kama imechelewa.
    if (invoice.status === 'DRAFT') return 'DRAFT';
    if (invoice.dueDate) {
      // Tarehe ya malipo ni siku nzima: kuchelewa huanza siku inayofuata.
      const endOfDueDay = new Date(invoice.dueDate);
      endOfDueDay.setHours(23, 59, 59, 999);
      if (endOfDueDay.getTime() < Date.now()) return 'OVERDUE';
    }
    return invoice.status;
  }

  private shape(invoice: any) {
    return {
      ...invoice,
      status: this.effectiveStatus(invoice),
      balance: round2(Number(invoice.total) - Number(invoice.amountPaid)),
    };
  }

  // ─── CRUD ───────────────────────────────────────────────────

  async list(businessId: string, query: ListInvoicesQueryDto) {
    const where: Prisma.SalesInvoiceWhereInput = { businessId };
    if (query.q) {
      where.OR = [
        { number: { contains: query.q, mode: 'insensitive' } },
        { customerName: { contains: query.q, mode: 'insensitive' } },
        { customerPhone: { contains: query.q } },
      ];
    }
    if (query.from || query.to) {
      where.issueDate = {};
      if (query.from) where.issueDate.gte = new Date(query.from);
      if (query.to) where.issueDate.lte = new Date(query.to);
    }

    const rows = await this.prisma.salesInvoice.findMany({
      where,
      orderBy: { issueDate: 'desc' },
      take: Math.min(query.limit ?? 50, 200),
      include: { items: { orderBy: { position: 'asc' } } },
    });

    const shaped = rows
      .map((r) => this.shape(r))
      // Kichujio cha hali hutumia hali inayoonekana (efektivu), si ile ya DB —
      // OVERDUE huhesabiwa kutokana na tarehe ya malipo, si column ya status.
      .filter((r) => !query.status || r.status === query.status);
    const outstanding = shaped
      .filter((r) => r.status !== 'PAID' && r.status !== 'VOID')
      .reduce((s, r) => s + r.balance, 0);

    return {
      data: shaped,
      meta: {
        count: shaped.length,
        outstanding: round2(outstanding),
        overdue: shaped.filter((r) => r.status === 'OVERDUE').length,
      },
    };
  }

  async detail(businessId: string, id: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id, businessId },
      include: {
        items: { orderBy: { position: 'asc' } },
        business: {
          select: {
            name: true,
            currency: true,
            tin: true,
            vatNumber: true,
            shops: { select: { phone: true, address: true }, take: 1 },
          },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Ankara haipo.');
    return this.shape(invoice);
  }

  async create(businessId: string, dto: CreateInvoiceDto, userId?: string) {
    if (!dto.items?.length) {
      throw new BadRequestException('Ankara inahitaji kitu kimoja au zaidi.');
    }
    const totals = this.computeTotals(dto.items, dto.discount, dto.taxRate);
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { currency: true },
    });

    for (let attempt = 0; attempt < 5; attempt++) {
      const number = await this.nextNumber(businessId);
      try {
        const invoice = await this.prisma.salesInvoice.create({
          data: {
            businessId,
            shopId: dto.shopId ?? null,
            customerId: dto.customerId ?? null,
            number,
            customerName: dto.customerName,
            customerPhone: dto.customerPhone ?? null,
            customerAddress: dto.customerAddress ?? null,
            template: dto.template ?? 'modern',
            issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
            subtotal: totals.subtotal,
            discount: totals.discount,
            taxRate: Number(dto.taxRate ?? 0),
            taxAmount: totals.taxAmount,
            total: totals.total,
            currency: business?.currency ?? 'TZS',
            notes: dto.notes ?? null,
            terms: dto.terms ?? null,
            createdBy: userId ?? null,
            items: {
              create: totals.lines.map((line, index) => ({
                ...line,
                position: index,
              })),
            },
          },
          include: { items: { orderBy: { position: 'asc' } } },
        });
        return this.shape(invoice);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new BadRequestException('Imeshindikana kutengeneza namba ya ankara.');
  }

  async update(businessId: string, id: string, dto: UpdateInvoiceDto) {
    const existing = await this.prisma.salesInvoice.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Ankara haipo.');
    if (existing.status === 'PAID') {
      throw new BadRequestException('Ankara iliyolipwa haiwezi kubadilishwa.');
    }

    const items = dto.items?.length ? dto.items : null;
    const totals = items
      ? this.computeTotals(
          items,
          dto.discount ?? Number(existing.discount),
          dto.taxRate ?? Number(existing.taxRate),
        )
      : null;

    const invoice = await this.prisma.$transaction(async (tx) => {
      if (items && totals) {
        await tx.salesInvoiceItem.deleteMany({ where: { invoiceId: id } });
        await tx.salesInvoiceItem.createMany({
          data: totals.lines.map((line, index) => ({
            invoiceId: id,
            ...line,
            position: index,
          })),
        });
      }
      return tx.salesInvoice.update({
        where: { id },
        data: {
          customerName: dto.customerName ?? undefined,
          customerPhone: dto.customerPhone ?? undefined,
          customerAddress: dto.customerAddress ?? undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          status: (dto.status as InvoiceDocStatus) ?? undefined,
          template: dto.template ?? undefined,
          notes: dto.notes ?? undefined,
          terms: dto.terms ?? undefined,
          ...(totals
            ? {
                subtotal: totals.subtotal,
                discount: totals.discount,
                taxRate: Number(dto.taxRate ?? existing.taxRate),
                taxAmount: totals.taxAmount,
                total: totals.total,
              }
            : {}),
        },
        include: { items: { orderBy: { position: 'asc' } } },
      });
    });

    return this.shape(invoice);
  }

  async remove(businessId: string, id: string) {
    const existing = await this.prisma.salesInvoice.findFirst({
      where: { id, businessId },
    });
    if (!existing) throw new NotFoundException('Ankara haipo.');
    if (existing.status === 'PAID') {
      throw new BadRequestException('Ankara iliyolipwa haiwezi kufutwa.');
    }
    await this.prisma.salesInvoice.delete({ where: { id } });
    return { deleted: true };
  }

  async send(businessId: string, id: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id, businessId },
    });
    if (!invoice) throw new NotFoundException('Ankara haipo.');
    const updated = await this.prisma.salesInvoice.update({
      where: { id },
      data: {
        status: invoice.status === 'DRAFT' ? 'SENT' : invoice.status,
        sentAt: new Date(),
      },
      include: { items: { orderBy: { position: 'asc' } } },
    });
    return this.shape(updated);
  }

  async pay(businessId: string, id: string, amount: number) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id, businessId },
    });
    if (!invoice) throw new NotFoundException('Ankara haipo.');
    if (invoice.status === 'VOID') {
      throw new BadRequestException('Ankara iliyobatilishwa haiwezi kulipwa.');
    }

    const paid = round2(Number(invoice.amountPaid) + Number(amount));
    const total = Number(invoice.total);
    const status: InvoiceDocStatus = paid >= total ? 'PAID' : 'PARTIAL';

    const updated = await this.prisma.salesInvoice.update({
      where: { id },
      data: {
        amountPaid: Math.min(paid, total),
        status,
        paidAt: status === 'PAID' ? new Date() : null,
      },
      include: { items: { orderBy: { position: 'asc' } } },
    });
    return this.shape(updated);
  }

  async voidInvoice(businessId: string, id: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id, businessId },
    });
    if (!invoice) throw new NotFoundException('Ankara haipo.');
    const updated = await this.prisma.salesInvoice.update({
      where: { id },
      data: { status: 'VOID' },
      include: { items: { orderBy: { position: 'asc' } } },
    });
    return this.shape(updated);
  }

  /** Ankara kutoka mauzo yaliyokwisha (moja-click). */
  async fromSale(businessId: string, saleId: string, userId?: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, businessId },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException('Mauzo hayo hayapo.');

    const customer = sale.customerId
      ? await this.prisma.customer.findFirst({
          where: { id: sale.customerId },
          select: { id: true, name: true, phone: true },
        })
      : null;

    return this.create(
      businessId,
      {
        customerId: customer?.id,
        customerName: customer?.name ?? 'Mteja wa dukani',
        customerPhone: customer?.phone ?? undefined,
        shopId: sale.shopId,
        items: sale.items.map((item) => ({
          productId: item.productId ?? undefined,
          description: item.name,
          quantity: Number(item.quantity),
          unitPrice: Number(item.price),
        })),
        discount: Number(sale.discount),
      },
      userId,
    );
  }

  async pdf(businessId: string, id: string, template?: string) {
    const invoice = await this.detail(businessId, id);
    const shop = (invoice as any).business?.shops?.[0];
    const buffer = await invoicePdf({
      businessName: invoice.business?.name ?? 'MyBoke',
      businessAddress: shop?.address ?? null,
      businessPhone: shop?.phone ?? null,
      tin: invoice.business?.tin ?? null,
      vatNumber: invoice.business?.vatNumber ?? null,
      number: invoice.number,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      customerAddress: invoice.customerAddress,
      items: invoice.items.map((item: any) => ({
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
        lineTotal: String(item.lineTotal),
      })),
      subtotal: String(invoice.subtotal),
      discount: String(invoice.discount),
      taxRate: String(invoice.taxRate),
      taxAmount: String(invoice.taxAmount),
      total: String(invoice.total),
      amountPaid: String(invoice.amountPaid),
      currency: invoice.currency,
      notes: invoice.notes,
      terms: invoice.terms,
      template: (template ?? invoice.template) as InvoiceTemplate,
    });

    return { buffer, filename: `ankara-${invoice.number}.pdf` };
  }

  async summary(businessId: string) {
    const rows = await this.prisma.salesInvoice.findMany({
      where: { businessId },
      select: { status: true, total: true, amountPaid: true, dueDate: true },
    });
    let outstanding = 0;
    let overdue = 0;
    let paid = 0;
    let draft = 0;
    for (const r of rows) {
      const status = this.effectiveStatus(r as any);
      if (status === 'PAID') paid += Number(r.total);
      else if (status === 'VOID') continue;
      else {
        outstanding += Number(r.total) - Number(r.amountPaid);
        if (status === 'OVERDUE') overdue += Number(r.total) - Number(r.amountPaid);
      }
      if (r.status === 'DRAFT') draft += 1;
    }
    return {
      count: rows.length,
      outstanding: round2(outstanding),
      overdue: round2(overdue),
      paid: round2(paid),
      draft,
    };
  }
}
