import { Prisma } from '@prisma/client';

/**
 * Pesa ZOTE ni DECIMAL(18,2) kwenye DB na `string` kwenye API.
 * Kamwe usitumie float kwa pesa.
 */
export const money = (v: Prisma.Decimal.Value): Prisma.Decimal =>
  new Prisma.Decimal(v);

export const ZERO = new Prisma.Decimal(0);

/** `"12400.00"` — muundo unaotumika kwenye API responses. */
export const toMoneyString = (
  v: Prisma.Decimal.Value | null | undefined,
): string => {
  if (v === null || v === undefined) return '0.00';
  return money(v).toFixed(2);
};

/** Hesabu ya faida: (selling - buying) * qty - discount */
export const lineProfit = (
  sellingPrice: Prisma.Decimal.Value,
  buyingPrice: Prisma.Decimal.Value,
  quantity: Prisma.Decimal.Value,
  discount: Prisma.Decimal.Value = 0,
): Prisma.Decimal =>
  money(sellingPrice)
    .minus(money(buyingPrice))
    .mul(money(quantity))
    .minus(money(discount));

/** Punguzo kamwe lisizidi subtotal (kinga ya `discountTooHigh`). */
export const clampDiscount = (
  requested: Prisma.Decimal.Value,
  subtotal: Prisma.Decimal.Value,
): Prisma.Decimal => {
  const d = money(requested);
  const s = money(subtotal);
  if (d.lessThan(0)) return ZERO;
  return d.greaterThan(s) ? s : d;
};
