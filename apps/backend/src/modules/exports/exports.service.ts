import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildCsv, buildXlsx } from '../../infra/files/sheet.util';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateExportDto } from './dto/export.dto';
import { AnalyticsService } from '../analytics/analytics.service';
import { ReportsService } from '../reports/reports.service';

interface Column {
  header: string;
  key: string;
  width?: number;
}

interface Sheet {
  name: string;
  columns: Column[];
  rows: Record<string, unknown>[];
}

@Injectable()
export class ExportsService {
  private readonly dir =
    process.env.EXPORT_DIR ?? join(process.cwd(), 'storage', 'exports');

  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
    private readonly analytics: AnalyticsService,
  ) {}

  private range(dto: CreateExportDto) {
    const to = dto.to ? new Date(dto.to) : new Date();
    const from = dto.from
      ? new Date(dto.from)
      : new Date(to.getTime() - 30 * 86_400_000);
    return { from, to };
  }

  /**
   * §19.2 — export ni ya async: POST inarudisha mara moja (RUNNING/QUEUED),
   * kazi inaendelea nyuma, na `GET /exports/:id` inatoa `status` + `url`.
   */
  async create(businessId: string, dto: CreateExportDto, userId: string) {
    const job = await this.prisma.exportJob.create({
      data: {
        businessId,
        type: dto.type,
        format: dto.format ?? 'xlsx',
        status: 'QUEUED',
        createdBy: userId,
        params: {
          from: dto.from ?? null,
          to: dto.to ?? null,
          shopId: dto.shopId ?? null,
        },
      },
    });

    // Endesha nyuma bila kuzuia ombi la HTTP.
    setImmediate(() => {
      void this.run(job.id, businessId, dto, userId);
    });

    return this.withDownloadUrl(job);
  }

  /** Kazi ya kutengeneza faili — inaendeshwa nyuma (background). */
  private async run(
    jobId: string,
    businessId: string,
    dto: CreateExportDto,
    userId: string,
  ) {
    await this.prisma.exportJob
      .update({ where: { id: jobId }, data: { status: 'RUNNING' } })
      .catch(() => undefined);

    try {
      const sheets = await this.collect(businessId, dto);
      const format = dto.format ?? 'xlsx';
      const filename = `${dto.type}-${Date.now().toString(36)}.${format === 'json' ? 'json' : format}`;

      await mkdir(this.dir, { recursive: true });

      let buffer: Buffer;
      if (format === 'json') {
        buffer = Buffer.from(
          JSON.stringify(
            sheets.map((s) => ({ sheet: s.name, rows: s.rows })),
            null,
            2,
          ),
          'utf8',
        );
      } else if (format === 'csv') {
        buffer = buildCsv(sheets[0].columns, sheets[0].rows);
      } else {
        // XLSX yenye sheets nyingi: tunaunganisha kwa kuandika faili moja kwa
        // sheet ya kwanza, kisha tunaongeza karatasi za ziada.
        buffer = await this.buildMultiSheet(sheets);
      }

      await writeFile(join(this.dir, filename), buffer);

      const rowCount = sheets.reduce((a, s) => a + s.rows.length, 0);

      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: 'DONE',
          progress: 100,
          rowCount,
          fileUrl: `/v1/exports/${jobId}/download`,
          fileName: filename,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Export imeshindikana';
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', error: message, completedAt: new Date() },
      });
      // eslint-disable-next-line no-console
      console.error(`Export ${jobId} imeshindikana (${userId}):`, message);
    }
  }

  /** Ongeza `url` + `expiresAt` (dakika 60) kwenye job iliyokamilika. */
  private withDownloadUrl<T extends { id: string; status: string }>(job: T) {
    if (job.status !== 'DONE') return job;
    const base = process.env.PUBLIC_API_URL ?? 'http://localhost:4000';
    return {
      ...job,
      url: `${base}/v1/exports/${job.id}/download`,
      expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    };
  }

  private async buildMultiSheet(sheets: Sheet[]): Promise<Buffer> {
    if (sheets.length === 1) {
      return buildXlsx(sheets[0].name, sheets[0].columns, sheets[0].rows);
    }

    // exceljs inaweza kuandika sheets nyingi — tunatumia moja kwa moja.
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'MyBoke';

    for (const sheet of sheets) {
      const ws = wb.addWorksheet(sheet.name.slice(0, 31));
      ws.columns = sheet.columns.map((c) => ({
        header: c.header,
        key: c.key,
        width: c.width ?? 18,
      }));
      const header = ws.getRow(1);
      header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      header.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0269E9' },
      };
      for (const row of sheet.rows) ws.addRow(row);
      ws.views = [{ state: 'frozen', ySplit: 1 }];
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  private async collect(businessId: string, dto: CreateExportDto): Promise<Sheet[]> {
    const { from, to } = this.range(dto);
    const type = dto.type;

    const sheets: Sheet[] = [];
    const need = (t: string) => type === t || type === 'all';

    if (need('sales')) sheets.push(await this.salesSheet(businessId, from, to, dto.shopId));
    if (need('products')) sheets.push(await this.productsSheet(businessId));
    if (need('stock')) sheets.push(await this.stockSheet(businessId, dto.shopId));
    if (need('expenses')) sheets.push(await this.expensesSheet(businessId, from, to, dto.shopId));
    if (need('debts')) sheets.push(await this.debtsSheet(businessId));
    if (need('customers')) sheets.push(await this.customersSheet(businessId));
    if (need('shifts')) sheets.push(await this.shiftsSheet(businessId, from, to));

    if (type === 'all') {
      const profit = await this.reports.profitReport(businessId, {
        from: from.toISOString(),
        to: to.toISOString(),
        shopId: dto.shopId,
      });
      const overview = await this.analytics.overview(businessId, {
        from: from.toISOString(),
        to: to.toISOString(),
        shopId: dto.shopId,
      });
      sheets.unshift({
        name: 'Muhtasari',
        columns: [
          { header: 'Kipimo', key: 'k', width: 28 },
          { header: 'Thamani', key: 'v', width: 24 },
        ],
        rows: [
          { k: 'Mauzo (revenue)', v: overview.kpis.revenue },
          { k: 'Faida ghafi', v: overview.kpis.profit },
          { k: 'Matumizi', v: overview.kpis.expenses },
          { k: 'Faida halisi', v: overview.kpis.netProfit },
          { k: 'Idadi ya mauzo', v: overview.kpis.orders },
          { k: 'Wastani kwa risiti', v: overview.kpis.avgTicket },
          { k: 'Madeni yanayodaiwa', v: overview.balanceSheet.receivables },
          { k: 'Thamani ya stock (gharama)', v: overview.balanceSheet.stockCost },
          { k: 'Thamani ya stock (rejareja)', v: overview.balanceSheet.stockRetail },
          {
            k: 'Faida halisi (profit report)',
            v: JSON.stringify(profit).slice(0, 32000),
          },
        ],
      });
    }

    if (sheets.length === 0) {
      throw new BadRequestException('Aina ya export haitambuliki.');
    }

    return sheets;
  }

  private async salesSheet(
    businessId: string,
    from: Date,
    to: Date,
    shopId?: string,
  ): Promise<Sheet> {
    const sales = await this.prisma.sale.findMany({
      where: {
        businessId,
        ...(shopId ? { shopId } : {}),
        saleDate: { gte: from, lte: to },
      },
      orderBy: { saleDate: 'asc' },
      include: {
        items: true,
        shop: { select: { name: true } },
      },
      take: 20_000,
    });

    return {
      name: 'Mauzo',
      columns: [
        { header: 'Risiti', key: 'receiptNo', width: 18 },
        { header: 'Tarehe', key: 'date', width: 20 },
        { header: 'Duka', key: 'shop', width: 18 },
        { header: 'Bidhaa', key: 'items', width: 40 },
        { header: 'Jumla ndogo', key: 'subtotal', width: 16 },
        { header: 'Punguzo', key: 'discount', width: 14 },
        { header: 'Jumla', key: 'total', width: 16 },
        { header: 'Faida', key: 'profit', width: 14 },
        { header: 'Malipo', key: 'method', width: 12 },
        { header: 'Hali', key: 'status', width: 14 },
        { header: 'EFD', key: 'efd', width: 18 },
      ],
      rows: sales.map((s) => ({
        receiptNo: s.receiptNo,
        date: s.saleDate.toISOString(),
        shop: s.shop?.name ?? '',
        items: s.items.map((i) => `${i.name} x${i.quantity}`).join('; '),
        subtotal: s.subtotal.toFixed(2),
        discount: s.discount.toFixed(2),
        total: s.total.toFixed(2),
        profit: s.profit.toFixed(2),
        method: s.paymentMethod,
        status: s.status,
        efd: s.efdReceiptNo ?? '',
      })),
    };
  }

  private async productsSheet(businessId: string): Promise<Sheet> {
    const products = await this.prisma.product.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: 'asc' },
      include: { category: { select: { name: true } } },
    });

    return {
      name: 'Bidhaa',
      columns: [
        { header: 'Jina', key: 'name', width: 32 },
        { header: 'Barcode', key: 'barcode', width: 18 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Bei ya kununua', key: 'buyingPrice', width: 18 },
        { header: 'Bei ya kuuza', key: 'sellingPrice', width: 18 },
        { header: 'Alert', key: 'alertLevel', width: 10 },
      ],
      rows: products.map((p) => ({
        name: p.name,
        barcode: p.barcode ?? '',
        category: p.category?.name ?? '',
        unit: p.unitSymbol,
        buyingPrice: p.buyingPrice.toFixed(2),
        sellingPrice: p.sellingPrice.toFixed(2),
        alertLevel: p.alertLevel,
      })),
    };
  }

  private async stockSheet(businessId: string, shopId?: string): Promise<Sheet> {
    const shops = await this.prisma.shop.findMany({
      where: { businessId, ...(shopId ? { id: shopId } : {}) },
      select: { id: true, name: true },
    });
    const nameById = new Map(shops.map((s) => [s.id, s.name]));

    const levels = await this.prisma.stockLevel.findMany({
      where: { shopId: { in: shops.map((s) => s.id) } },
      include: { product: { select: { name: true, unitSymbol: true, alertLevel: true } } },
      orderBy: { product: { name: 'asc' } },
    });

    return {
      name: 'Stock',
      columns: [
        { header: 'Bidhaa', key: 'product', width: 32 },
        { header: 'Duka', key: 'shop', width: 20 },
        { header: 'Idadi', key: 'quantity', width: 12 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Alert', key: 'alertLevel', width: 10 },
        { header: 'Hali', key: 'state', width: 14 },
      ],
      rows: levels.map((l) => ({
        product: l.product.name,
        shop: nameById.get(l.shopId) ?? '',
        quantity: l.quantity.toString(),
        unit: l.product.unitSymbol,
        alertLevel: l.product.alertLevel,
        state: l.quantity.lessThanOrEqualTo(0)
          ? 'IMEISHA'
          : l.quantity.lessThanOrEqualTo(l.product.alertLevel)
            ? 'NDOGO'
            : 'SAWA',
      })),
    };
  }

  private async expensesSheet(
    businessId: string,
    from: Date,
    to: Date,
    shopId?: string,
  ): Promise<Sheet> {
    const expenses = await this.prisma.expense.findMany({
      where: {
        businessId,
        ...(shopId ? { shopId } : {}),
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'asc' },
      take: 20_000,
    });

    return {
      name: 'Matumizi',
      columns: [
        { header: 'Tarehe', key: 'date', width: 22 },
        { header: 'Jina', key: 'name', width: 32 },
        { header: 'Category', key: 'category', width: 18 },
        { header: 'Kiasi', key: 'amount', width: 16 },
        { header: 'Maelezo', key: 'notes', width: 36 },
      ],
      rows: expenses.map((e) => ({
        date: e.date.toISOString(),
        name: e.name,
        category: e.category,
        amount: e.amount.toFixed(2),
        notes: e.notes ?? '',
      })),
    };
  }

  private async debtsSheet(businessId: string): Promise<Sheet> {
    const debts = await this.prisma.debt.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { name: true, phone: true } } },
    });

    return {
      name: 'Madeni',
      columns: [
        { header: 'Mtu', key: 'personName', width: 26 },
        { header: 'Simu', key: 'phone', width: 16 },
        { header: 'Aina', key: 'type', width: 12 },
        { header: 'Kiasi', key: 'originalAmount', width: 16 },
        { header: 'Iliyolipwa', key: 'paidAmount', width: 16 },
        { header: 'Salio', key: 'remaining', width: 16 },
        { header: 'Hali', key: 'status', width: 14 },
        { header: 'Due', key: 'dueDate', width: 16 },
      ],
      rows: debts.map((d) => ({
        personName: d.customer?.name ?? d.personName,
        phone: d.customer?.phone ?? d.personPhone ?? '',
        type: d.type,
        originalAmount: d.originalAmount.toFixed(2),
        paidAmount: d.paidAmount.toFixed(2),
        remaining: d.originalAmount.minus(d.paidAmount).toFixed(2),
        status: d.status,
        dueDate: d.dueDate?.toISOString().slice(0, 10) ?? '',
      })),
    };
  }

  private async customersSheet(businessId: string): Promise<Sheet> {
    const customers = await this.prisma.customer.findMany({
      where: { businessId },
      orderBy: { name: 'asc' },
      include: { debts: { select: { originalAmount: true, paidAmount: true } } },
    });

    return {
      name: 'Wateja',
      columns: [
        { header: 'Jina', key: 'name', width: 26 },
        { header: 'Simu', key: 'phone', width: 16 },
        { header: 'Email', key: 'email', width: 26 },
        { header: 'Salio la deni', key: 'balance', width: 18 },
        { header: 'Pointi', key: 'points', width: 12 },
        { header: 'Alijiunga', key: 'createdAt', width: 20 },
      ],
      rows: customers.map((c) => ({
        name: c.name,
        phone: c.phone ?? '',
        email: c.email ?? '',
        balance: c.debts
          .reduce(
            (a, d) => a.plus(d.originalAmount).minus(d.paidAmount),
            new Prisma.Decimal(0),
          )
          .toFixed(2),
        points: c.loyaltyPoints,
        createdAt: c.createdAt.toISOString().slice(0, 10),
      })),
    };
  }

  private async shiftsSheet(businessId: string, from: Date, to: Date): Promise<Sheet> {
    const shifts = await this.prisma.shift.findMany({
      where: { businessId, openedAt: { gte: from, lte: to } },
      orderBy: { openedAt: 'desc' },
    });

    return {
      name: 'Shifts',
      columns: [
        { header: 'Shift', key: 'id', width: 26 },
        { header: 'Duka', key: 'shopId', width: 26 },
        { header: 'Hali', key: 'status', width: 12 },
        { header: 'Float', key: 'openingFloat', width: 16 },
        { header: 'Expected', key: 'expectedCash', width: 16 },
        { header: 'Counted', key: 'countedCash', width: 16 },
        { header: 'Tofauti', key: 'difference', width: 14 },
        { header: 'Kufunguliwa', key: 'openedAt', width: 22 },
        { header: 'Kufungwa', key: 'closedAt', width: 22 },
      ],
      rows: shifts.map((s) => ({
        id: s.id,
        shopId: s.shopId,
        status: s.status,
        openingFloat: s.openingFloat.toFixed(2),
        expectedCash: s.expectedCash?.toFixed(2) ?? '',
        countedCash: s.countedCash?.toFixed(2) ?? '',
        difference: s.difference?.toFixed(2) ?? '',
        openedAt: s.openedAt.toISOString(),
        closedAt: s.closedAt?.toISOString() ?? '',
      })),
    };
  }

  async list(businessId: string, limit = 30) {
    const rows = await this.prisma.exportJob.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });
    const data = rows.map((r) => this.withDownloadUrl(r));
    return { data, count: data.length };
  }

  async get(businessId: string, id: string) {
    const job = await this.prisma.exportJob.findFirst({
      where: { id, businessId },
    });
    if (!job) throw new NotFoundException('Export haipo.');
    return this.withDownloadUrl(job);
  }

  async download(businessId: string, id: string) {
    const job = await this.get(businessId, id);
    if (job.status !== 'DONE' || !job.fileUrl) {
      throw new ConflictException(
        `Export bado haijakamilika (hali: ${job.status}, ${job.progress}%).`,
      );
    }

    const fileName = job.fileName;
    if (!fileName) {
      throw new NotFoundException('Faili haipo kwenye storage. Tengeneza upya.');
    }

    let buffer: Buffer;
    try {
      buffer = await readFile(join(this.dir, fileName));
    } catch {
      throw new NotFoundException('Faili haipo kwenye storage. Tengeneza upya.');
    }
    const ext = fileName.split('.').pop() ?? 'xlsx';

    return {
      buffer,
      filename: `${job.type}-${createHash('sha1').update(job.id).digest('hex').slice(0, 8)}.${ext}`,
      contentType:
        ext === 'json'
          ? 'application/json'
          : ext === 'csv'
            ? 'text/csv; charset=utf-8'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}
