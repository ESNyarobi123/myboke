import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Kanuni ya MyBoke: pesa na desimali zinatumwa kama `string`.
 *
 * Prisma `Decimal` ina `toJSON()` inayorudisha `"1200"` (bila desimali)
 * — hii inavunja kanuni ya `"1200.00"` na inafanya hesabu za client
 * zisiyo sahihi. Interceptor hii inabadilisha kila `Decimal` kuwa string:
 *
 *   • desimali 0–2  → `"1200.00"`, `"0.18"`, `"625.42"`
 *   • desimali > 2  → zinaachwa kama zilivyo (`"0.1234"`, `"2.375"`)
 *
 * Hii inafanya kazi kwa JSON yote (pamoja na nested items), lakini
 * haiathiri `Date`, `Buffer`, `StreamableFile` wala streams.
 */
@Injectable()
export class DecimalSerializerInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => serializeDecimals(data, 0)));
  }
}

const MAX_DEPTH = 12;

function serializeDecimals(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return value;
  if (depth > MAX_DEPTH) return value;

  if (Prisma.Decimal.isDecimal(value)) {
    const decimal = value as Prisma.Decimal;
    const places = decimal.decimalPlaces();
    return decimal.toFixed(places <= 2 ? 2 : places);
  }

  if (typeof value !== 'object') return value;

  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  if (typeof (value as { pipe?: unknown }).pipe === 'function') return value;

  if (Array.isArray(value)) {
    return value.map((item) => serializeDecimals(item, depth + 1));
  }

  const proto = Object.getPrototypeOf(value);
  // Tu plain objects (JSON) — sio StreamableFile, Url, n.k.
  if (proto !== Object.prototype && proto !== null) return value;

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = serializeDecimals(item, depth + 1);
  }
  return out;
}
