import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';

const BACKUP_VERSION = 1;

export interface CountRow {
  created: number;
  skipped: number;
}

const zero = (): CountRow => ({ created: 0, skipped: 0 });

/**
 * I14 — Backup & Restore.
 * Backup: JSON kamili ya data ya biashara (archival + kuhamisha).
 * Restore: hurejesha master data (maduka, makundi, suppliers, bidhaa + stock,
 * wateja, gharama, madeni) kwa njia ya merge — haigongi data iliyopo.
 * Mauzo hayarejeshwi moja kwa moja (yanahitaji mnyororo wa stock/fedha);
 * yanaripotiwa kama `skipped` ili mtumiaji ajue.
 */
@Injectable()
export class BackupService {
  constructor(private readonly prisma: PrismaService) {}

  async export(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        type: true,
        currency: true,
        country: true,
        tin: true,
        vatEnabled: true,
        vatNumber: true,
        createdAt: true,
      },
    });
    if (!business) throw new NotFoundException('Biashara haipo.');

    const [
      shops,
      categories,
      suppliers,
      products,
      stock,
      customers,
      expenses,
      debts,
      sales,
    ] = await Promise.all([
      this.prisma.shop.findMany({ where: { businessId } }),
      this.prisma.category.findMany({ where: { businessId } }),
      this.prisma.supplier.findMany({ where: { businessId } }),
      this.prisma.product.findMany({ where: { businessId } }),
      this.prisma.stockLevel.findMany({ where: { product: { businessId } } }),
      this.prisma.customer.findMany({ where: { businessId } }),
      this.prisma.expense.findMany({ where: { businessId } }),
      this.prisma.debt.findMany({ where: { businessId } }),
      this.prisma.sale.findMany({
        where: { businessId },
        include: { items: true, payments: true },
        orderBy: { saleDate: 'asc' },
      }),
    ]);

    const shopName = new Map(shops.map((s) => [s.id, s.name]));
    const categoryName = new Map(categories.map((c) => [c.id, c.name]));
    const supplierName = new Map(suppliers.map((s) => [s.id, s.name]));
    const productName = new Map(products.map((p) => [p.id, p.name]));
    const customerName = new Map(customers.map((c) => [c.id, c.name]));
    const stockByProduct = new Map<string, Record<string, number>>();
    for (const level of stock) {
      const row = stockByProduct.get(level.productId) ?? {};
      row[shopName.get(level.shopId) ?? level.shopId] = Number(level.quantity);
      stockByProduct.set(level.productId, row);
    }

    return {
      version: BACKUP_VERSION,
      generatedAt: new Date().toISOString(),
      app: 'MyBoke',
      business,
      counts: {
        shops: shops.length,
        categories: categories.length,
        suppliers: suppliers.length,
        products: products.length,
        customers: customers.length,
        expenses: expenses.length,
        debts: debts.length,
        sales: sales.length,
      },
      shops: shops.map((s) => ({
        name: s.name,
        address: s.address,
        phone: s.phone,
        lat: s.lat,
        lng: s.lng,
        businessHours: s.businessHours,
        isActive: s.isActive,
      })),
      categories: categories.map((c) => ({ name: c.name })),
      suppliers: suppliers.map((s) => ({
        name: s.name,
        phone: s.phone,
        notes: s.notes,
      })),
      products: products.map((p) => ({
        name: p.name,
        barcode: p.barcode,
        sku: p.sku,
        unitType: p.unitType,
        unitSymbol: p.unitSymbol,
        buyingPrice: p.buyingPrice.toFixed(2),
        sellingPrice: p.sellingPrice.toFixed(2),
        alertLevel: p.alertLevel,
        hasExpiry: p.hasExpiry,
        expiryDate: p.expiryDate?.toISOString() ?? null,
        description: p.description,
        imageUrl: p.imageUrl,
        isActive: p.isActive,
        categoryName: p.categoryId ? (categoryName.get(p.categoryId) ?? null) : null,
        supplierName: p.supplierId ? (supplierName.get(p.supplierId) ?? null) : null,
        stock: stockByProduct.get(p.id) ?? {},
        variantLabel: p.variantLabel,
      })),
      customers: customers.map((c) => ({
        name: c.name,
        phone: c.phone,
        email: c.email,
        creditLimit: c.creditLimit?.toFixed(2) ?? null,
        loyaltyPoints: c.loyaltyPoints,
        notes: c.notes,
        birthday: c.birthday?.toISOString() ?? null,
      })),
      expenses: expenses.map((e) => ({
        shopName: shopName.get(e.shopId) ?? null,
        name: e.name,
        amount: e.amount.toFixed(2),
        category: e.category,
        date: e.date.toISOString(),
        notes: e.notes,
        isRecurring: e.isRecurring,
        recurEvery: e.recurEvery,
      })),
      debts: debts.map((d) => ({
        customerName: d.customerId ? (customerName.get(d.customerId) ?? null) : null,
        type: d.type,
        personName: d.personName,
        personPhone: d.personPhone,
        originalAmount: d.originalAmount.toFixed(2),
        paidAmount: d.paidAmount.toFixed(2),
        description: d.description,
        dueDate: d.dueDate?.toISOString() ?? null,
        status: d.status,
      })),
      sales: sales.map((s) => ({
        receiptNo: s.receiptNo,
        saleDate: s.saleDate.toISOString(),
        shopName: shopName.get(s.shopId) ?? null,
        customerName: s.customerId ? (customerName.get(s.customerId) ?? null) : null,
        subtotal: s.subtotal.toFixed(2),
        discount: s.discount.toFixed(2),
        total: s.total.toFixed(2),
        paymentMethod: s.paymentMethod,
        status: s.status,
        items: s.items.map((i) => ({
          productName: i.productId ? (productName.get(i.productId) ?? i.name) : i.name,
          quantity: i.quantity.toString(),
          price: i.price.toFixed(2),
          lineTotal: i.lineTotal.toFixed(2),
        })),
        payments: s.payments.map((p) => ({
          method: p.method,
          amount: p.amount.toFixed(2),
          reference: p.reference,
        })),
      })),
    };
  }

  async restore(
    businessId: string,
    userId: string,
    payload: Record<string, unknown>,
    dryRun = false,
  ) {
    const data = (payload?.data ?? payload) as Record<string, unknown>;
    if (!data || typeof data !== 'object') {
      throw new BadRequestException('Backup si sahihi — `data` inahitajika.');
    }
    if (Number(data.version ?? BACKUP_VERSION) > BACKUP_VERSION) {
      throw new BadRequestException(
        'Backup ni ya toleo jipya kuliko mfumo huu — sasisha app kwanza.',
      );
    }

    const arr = <T>(key: string): T[] =>
      Array.isArray(data[key]) ? (data[key] as T[]) : [];

    const results = {
      shops: zero(),
      categories: zero(),
      suppliers: zero(),
      products: zero(),
      stock: zero(),
      customers: zero(),
      expenses: zero(),
      debts: zero(),
      sales: zero(),
    };

    const run = async (tx: Prisma.TransactionClient) => {
      const existingShops = await tx.shop.findMany({
        where: { businessId },
        select: { id: true, name: true },
      });
      const shopByName = new Map(existingShops.map((s) => [s.name, s.id]));

      for (const shop of arr<{
        name: string;
        address?: string | null;
        phone?: string | null;
        lat?: number | null;
        lng?: number | null;
        businessHours?: unknown;
        isActive?: boolean;
      }>('shops')) {
        if (!shop.name || shopByName.has(shop.name)) {
          results.shops.skipped += 1;
          continue;
        }
        const created = await tx.shop.create({
          data: {
            businessId,
            name: shop.name,
            address: shop.address ?? null,
            phone: shop.phone ?? null,
            lat: shop.lat ?? null,
            lng: shop.lng ?? null,
            businessHours: (shop.businessHours ?? undefined) as
              | Prisma.InputJsonValue
              | undefined,
            isActive: shop.isActive ?? true,
          },
        });
        shopByName.set(created.name, created.id);
        results.shops.created += 1;
      }

      const existingCategories = await tx.category.findMany({
        where: { businessId },
        select: { id: true, name: true },
      });
      const categoryByName = new Map(
        existingCategories.map((c) => [c.name, c.id]),
      );
      for (const cat of arr<{ name: string }>('categories')) {
        if (!cat.name || categoryByName.has(cat.name)) {
          results.categories.skipped += 1;
          continue;
        }
        const created = await tx.category.create({
          data: { businessId, name: cat.name },
        });
        categoryByName.set(created.name, created.id);
        results.categories.created += 1;
      }

      const existingSuppliers = await tx.supplier.findMany({
        where: { businessId },
        select: { id: true, name: true },
      });
      const supplierByName = new Map(
        existingSuppliers.map((s) => [s.name, s.id]),
      );
      for (const sup of arr<{
        name: string;
        phone?: string | null;
        notes?: string | null;
      }>('suppliers')) {
        if (!sup.name || supplierByName.has(sup.name)) {
          results.suppliers.skipped += 1;
          continue;
        }
        const created = await tx.supplier.create({
          data: {
            businessId,
            name: sup.name,
            phone: sup.phone ?? null,
            notes: sup.notes ?? null,
          },
        });
        supplierByName.set(created.name, created.id);
        results.suppliers.created += 1;
      }

      const shops = await tx.shop.findMany({
        where: { businessId, isActive: true },
        select: { id: true, name: true },
      });
      const allShopByName = new Map(shops.map((s) => [s.name, s.id]));
      const defaultShopId =
        allShopByName.values().next().value ?? null;

      const existingProducts = await tx.product.findMany({
        where: { businessId },
        select: { id: true, name: true, barcode: true, sku: true },
      });
      const productKeys = new Set<string>();
      for (const p of existingProducts) {
        if (p.barcode) productKeys.add(`b:${p.barcode}`);
        if (p.sku) productKeys.add(`s:${p.sku}`);
        productKeys.add(`n:${p.name.toLowerCase()}`);
      }

      for (const prod of arr<{
        name: string;
        barcode?: string | null;
        sku?: string | null;
        unitType?: string;
        unitSymbol?: string;
        buyingPrice: string;
        sellingPrice: string;
        alertLevel?: number;
        hasExpiry?: boolean;
        expiryDate?: string | null;
        description?: string | null;
        imageUrl?: string | null;
        isActive?: boolean;
        categoryName?: string | null;
        supplierName?: string | null;
        variantLabel?: string | null;
        stock?: Record<string, number>;
      }>('products')) {
        const keys = [
          prod.barcode ? `b:${prod.barcode}` : null,
          prod.sku ? `s:${prod.sku}` : null,
          prod.name ? `n:${prod.name.toLowerCase()}` : null,
        ].filter(Boolean) as string[];

        if (!prod.name || keys.some((k) => productKeys.has(k))) {
          results.products.skipped += 1;
          continue;
        }

        const created = await tx.product.create({
          data: {
            businessId,
            name: prod.name,
            barcode: prod.barcode ?? null,
            sku: prod.sku ?? null,
            unitType: (prod.unitType as never) ?? 'PCS',
            unitSymbol: prod.unitSymbol ?? 'pcs',
            buyingPrice: new Prisma.Decimal(prod.buyingPrice ?? 0),
            sellingPrice: new Prisma.Decimal(prod.sellingPrice ?? 0),
            alertLevel: prod.alertLevel ?? 5,
            hasExpiry: prod.hasExpiry ?? false,
            expiryDate: prod.expiryDate ? new Date(prod.expiryDate) : null,
            description: prod.description ?? null,
            imageUrl: prod.imageUrl ?? null,
            isActive: prod.isActive ?? true,
            variantLabel: prod.variantLabel ?? null,
            categoryId: prod.categoryName
              ? (categoryByName.get(prod.categoryName) ?? null)
              : null,
            supplierId: prod.supplierName
              ? (supplierByName.get(prod.supplierName) ?? null)
              : null,
          },
        });
        for (const key of keys) productKeys.add(key);
        results.products.created += 1;

        const stock = prod.stock ?? {};
        for (const [shopName, quantity] of Object.entries(stock)) {
          const shopId = allShopByName.get(shopName) ?? defaultShopId;
          if (!shopId) continue;
          await tx.stockLevel.create({
            data: {
              shopId,
              productId: created.id,
              quantity: new Prisma.Decimal(quantity),
            },
          });
          results.stock.created += 1;
        }
      }

      const existingCustomers = await tx.customer.findMany({
        where: { businessId },
        select: { id: true, phone: true, name: true },
      });
      const customerByPhone = new Map(
        existingCustomers
          .filter((c) => c.phone)
          .map((c) => [c.phone as string, c.id]),
      );
      const customerByName = new Map(
        existingCustomers.map((c) => [c.name.toLowerCase(), c.id]),
      );

      for (const cust of arr<{
        name: string;
        phone?: string | null;
        email?: string | null;
        creditLimit?: string | null;
        loyaltyPoints?: number;
        notes?: string | null;
        birthday?: string | null;
      }>('customers')) {
        if (
          !cust.name ||
          (cust.phone && customerByPhone.has(cust.phone)) ||
          (!cust.phone && customerByName.has(cust.name.toLowerCase()))
        ) {
          results.customers.skipped += 1;
          continue;
        }
        const created = await tx.customer.create({
          data: {
            businessId,
            name: cust.name,
            phone: cust.phone ?? null,
            email: cust.email ?? null,
            creditLimit: cust.creditLimit
              ? new Prisma.Decimal(cust.creditLimit)
              : null,
            loyaltyPoints: cust.loyaltyPoints ?? 0,
            notes: cust.notes ?? null,
            birthday: cust.birthday ? new Date(cust.birthday) : null,
          },
        });
        if (created.phone) customerByPhone.set(created.phone, created.id);
        customerByName.set(created.name.toLowerCase(), created.id);
        results.customers.created += 1;
      }

      const shopIdFor = (name?: string | null) =>
        (name ? allShopByName.get(name) : undefined) ?? defaultShopId;

      for (const exp of arr<{
        shopName?: string | null;
        name: string;
        amount: string;
        category: string;
        date?: string;
        notes?: string | null;
        isRecurring?: boolean;
        recurEvery?: string | null;
      }>('expenses')) {
        const shopId = shopIdFor(exp.shopName);
        if (!exp.name || !shopId) {
          results.expenses.skipped += 1;
          continue;
        }
        await tx.expense.create({
          data: {
            businessId,
            shopId,
            name: exp.name,
            amount: new Prisma.Decimal(exp.amount ?? 0),
            category: exp.category ?? 'OTHER',
            date: exp.date ? new Date(exp.date) : new Date(),
            notes: exp.notes ?? null,
            isRecurring: exp.isRecurring ?? false,
            recurEvery: exp.recurEvery ?? null,
            createdBy: userId,
          },
        });
        results.expenses.created += 1;
      }

      for (const debt of arr<{
        customerName?: string | null;
        type?: string;
        personName: string;
        personPhone?: string | null;
        originalAmount: string;
        paidAmount?: string;
        description?: string | null;
        dueDate?: string | null;
        status?: string;
      }>('debts')) {
        if (!debt.personName) {
          results.debts.skipped += 1;
          continue;
        }
        await tx.debt.create({
          data: {
            businessId,
            customerId: debt.customerName
              ? (customerByName.get(debt.customerName.toLowerCase()) ?? null)
              : null,
            type: (debt.type as never) ?? 'OWE_ME',
            personName: debt.personName,
            personPhone: debt.personPhone ?? null,
            originalAmount: new Prisma.Decimal(debt.originalAmount ?? 0),
            paidAmount: new Prisma.Decimal(debt.paidAmount ?? 0),
            description: debt.description ?? null,
            dueDate: debt.dueDate ? new Date(debt.dueDate) : null,
            status: (debt.status as never) ?? 'OPEN',
          },
        });
        results.debts.created += 1;
      }

      // Mauzo: hayarejeshwi (yanahitaji mnyororo kamili wa stock/fedha).
      results.sales.skipped += arr('sales').length;

      return results;
    };

    if (dryRun) {
      // Dry-run: hesabu tu kinachoweza kuingia, bila kuandika.
      const preview = {
        shops: arr('shops').length,
        categories: arr('categories').length,
        suppliers: arr('suppliers').length,
        products: arr('products').length,
        customers: arr('customers').length,
        expenses: arr('expenses').length,
        debts: arr('debts').length,
        sales: arr('sales').length,
      };
      return {
        dryRun: true,
        wouldReceive: preview,
        note: 'Hakuna data iliyoandikwa. Tuma `dryRun: false` ku-restore.',
      };
    }

    const data2 = await this.prisma.$transaction(run, { timeout: 60_000 });

    return {
      dryRun: false,
      ...data2,
      note: 'Mauzo hayarejeshwi kiotomatiki — yanabaki kwenye backup kwa kumbukumbu.',
    };
  }
}
