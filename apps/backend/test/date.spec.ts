/**
 * §21.2 — mipaka ya tarehe kwa saa za Afrika Mashariki (EAT, UTC+3).
 * 23:59 EAT bado ni siku hiyo hiyo; 00:01 EAT ni siku mpya.
 */
import {
  addDays,
  endOfDayEAT,
  receiptNo,
  startOfDayEAT,
  startOfMonthEAT,
} from '../src/common/utils/date.util';

describe('date.util (EAT = UTC+3)', () => {
  it('startOfDayEAT kwa 23:59 EAT inarudi 00:00 EAT ya siku hiyo', () => {
    // 2026-11-01 23:59 EAT = 2026-11-01T20:59:00Z
    const d = new Date('2026-11-01T20:59:00.000Z');
    expect(startOfDayEAT(d).toISOString()).toBe('2026-10-31T21:00:00.000Z');
    // 00:00 EAT == 21:00 UTC ya siku iliyopita
  });

  it('startOfDayEAT kwa 00:01 EAT inarudi 00:00 EAT ya siku mpya', () => {
    // 2026-11-02 00:01 EAT = 2026-11-01T21:01:00Z
    const d = new Date('2026-11-01T21:01:00.000Z');
    expect(startOfDayEAT(d).toISOString()).toBe('2026-11-01T21:00:00.000Z');
  });

  it('startOfDayEAT bado ni siku moja kwa 23:59 na 00:01 za siku tofauti', () => {
    const late = new Date('2026-11-01T20:59:00.000Z'); // 23:59 EAT Jumapili
    const early = new Date('2026-11-01T21:01:00.000Z'); // 00:01 EAT Jumatatu
    const diff =
      startOfDayEAT(early).getTime() - startOfDayEAT(late).getTime();
    expect(diff).toBe(24 * 60 * 60 * 1000);
  });

  it('endOfDayEAT ni 23:59:59.999 EAT ya siku hiyo', () => {
    const d = new Date('2026-11-01T10:00:00.000Z');
    const end = endOfDayEAT(d);
    expect(end.toISOString()).toBe('2026-11-01T20:59:59.999Z');
    expect(end.getTime() - startOfDayEAT(d).getTime()).toBe(
      24 * 60 * 60 * 1000 - 1,
    );
  });

  it('startOfMonthEAT inarudi 00:00 EAT ya siku ya kwanza', () => {
    const d = new Date('2026-11-15T09:30:00.000Z');
    expect(startOfMonthEAT(d).toISOString()).toBe('2026-10-31T21:00:00.000Z');
  });

  it('addDays inahesabu siku kamili', () => {
    const d = new Date('2026-11-01T21:00:00.000Z');
    expect(addDays(d, 7).toISOString()).toBe('2026-11-08T21:00:00.000Z');
  });

  it('receiptNo inatumia tarehe ya EAT, sio UTC', () => {
    // 2026-11-01 01:00 EAT = 2026-10-31T22:00:00Z → risiti ya 1 Nov
    expect(receiptNo(7, new Date('2026-10-31T22:00:00.000Z'))).toBe(
      'MB-20261101-0007',
    );
    // 2026-11-01 23:59 EAT = 2026-11-01T20:59:00Z → bado 1 Nov
    expect(receiptNo(42, new Date('2026-11-01T20:59:00.000Z'))).toBe(
      'MB-20261101-0042',
    );
  });

  it('receiptNo ina namba ya mlolongo yenye tarakimu 4', () => {
    const d = new Date('2026-01-05T09:00:00.000Z');
    expect(receiptNo(1, d)).toBe('MB-20260105-0001');
    expect(receiptNo(12345, d)).toBe('MB-20260105-12345');
  });
});
