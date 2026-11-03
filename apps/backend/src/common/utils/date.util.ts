import { Prisma } from '@prisma/client';

/** Taratibu za tarehe kwa saa za Afrika Mashariki (EAT, UTC+3). */
const EAT_OFFSET_MINUTES = 180;

export function startOfDayEAT(date: Date = new Date()): Date {
  const shifted = new Date(date.getTime() + EAT_OFFSET_MINUTES * 60_000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - EAT_OFFSET_MINUTES * 60_000);
}

export function endOfDayEAT(date: Date = new Date()): Date {
  const start = startOfDayEAT(date);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Mwanzo wa kipindi. `YYYY-MM-DD` inachukuliwa kama siku kamili kwa saa za
 * EAT, siyo `00:00 UTC` — vinginevyo rekodi za jioni zinaanguka nje ya ripoti.
 */
export function rangeStart(value: string): Date {
  return value.length === 10 ? new Date(`${value}T00:00:00.000+03:00`) : new Date(value);
}

/** Mwisho wa kipindi — siku iliyotajwa inahesabiwa yote (hadi 23:59:59.999 EAT). */
export function rangeEnd(value: string): Date {
  return value.length === 10 ? new Date(`${value}T23:59:59.999+03:00`) : new Date(value);
}

export function startOfMonthEAT(date: Date = new Date()): Date {
  const shifted = new Date(date.getTime() + EAT_OFFSET_MINUTES * 60_000);
  shifted.setUTCDate(1);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - EAT_OFFSET_MINUTES * 60_000);
}

/** Tengeneza namba ya risiti: `MB-20261101-0007` (tarehe kwa saa za EAT). */
export function receiptNo(sequence: number, date: Date = new Date()): string {
  const eat = new Date(date.getTime() + EAT_OFFSET_MINUTES * 60_000);
  const y = eat.getUTCFullYear();
  const m = `${eat.getUTCMonth() + 1}`.padStart(2, '0');
  const d = `${eat.getUTCDate()}`.padStart(2, '0');
  return `MB-${y}${m}${d}-${`${sequence}`.padStart(4, '0')}`;
}

/** Rectify decimals kutoka string/number kwenda Prisma.Decimal. */
export const dec = (v: Prisma.Decimal.Value | number): Prisma.Decimal =>
  new Prisma.Decimal(v as Prisma.Decimal.Value);
