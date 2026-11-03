import { Prisma } from '@prisma/client';

/**
 * VAT ya Tanzania: bei za dukani ni ZILIZOJUMUISHA VAT.
 * Kwa hivyo hatuongezi VAT juu — tunaichambua kutoka ndani.
 *
 *   netOfVat  = gross / (1 + rate)
 *   vatAmount = gross − netOfVat
 */
export interface VatBreakdown {
  rate: number;
  gross: string;
  net: string;
  vat: string;
}

export function splitVat(
  grossInclusive: Prisma.Decimal.Value,
  rate: Prisma.Decimal.Value | number,
): VatBreakdown {
  const gross = new Prisma.Decimal(grossInclusive);
  const r = new Prisma.Decimal(rate);

  if (r.lessThanOrEqualTo(0)) {
    return {
      rate: 0,
      gross: gross.toFixed(2),
      net: gross.toFixed(2),
      vat: '0.00',
    };
  }

  const net = gross.dividedBy(r.plus(1));
  const vat = gross.minus(net);

  return {
    rate: Number(r),
    gross: gross.toFixed(2),
    net: net.toFixed(2),
    vat: vat.toFixed(2),
  };
}

/** Muundo wa msimbo wa uthibitisho wa EFD (kiolezo — mtoa huduma atatoa kanuni halisi). */
export function efdVerificationCode(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 0xffffffff;
  }
  return hash.toString(16).toUpperCase().padStart(10, '0').slice(0, 10);
}
