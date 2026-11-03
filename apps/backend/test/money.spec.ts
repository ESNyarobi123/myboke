import { Prisma } from '@prisma/client';
import {
  clampDiscount,
  lineProfit,
  toMoneyString,
} from '../src/common/utils/money.util';
import { efdVerificationCode, splitVat } from '../src/common/utils/vat.util';

describe('money.util', () => {
  it('huonyesha pesa kwa desimali 2 kila wakati', () => {
    expect(toMoneyString(0)).toBe('0.00');
    expect(toMoneyString('12400')).toBe('12400.00');
    expect(toMoneyString(new Prisma.Decimal('7.5'))).toBe('7.50');
    expect(toMoneyString(null)).toBe('0.00');
  });

  it('hesabu ya faida = (bei ya kuuza − kununua) × idadi − punguzo', () => {
    // (1200 - 800) * 3 - 0 = 1200
    expect(lineProfit('1200.00', '800.00', 3).toFixed(2)).toBe('1200.00');

    // (1200 - 800) * 2.5 - 100 = 900
    expect(lineProfit('1200.00', '800.00', '2.5', '100.00').toFixed(2)).toBe(
      '900.00',
    );
  });

  it('faida inaweza kuwa hasi (kuuza chini ya bei ya kununua)', () => {
    expect(lineProfit('700.00', '800.00', 2).toFixed(2)).toBe('-200.00');
  });

  it('punguzo haliwezi kuzidi subtotal', () => {
    expect(clampDiscount('5000', '3000').toFixed(2)).toBe('3000.00');
    expect(clampDiscount('500', '3000').toFixed(2)).toBe('500.00');
    expect(clampDiscount('-100', '3000').toFixed(2)).toBe('0.00');
  });
});

describe('vat.util', () => {
  it('haitoi VAT kama rate ni 0', () => {
    const r = splitVat('472000.00', 0);
    expect(r.vat).toBe('0.00');
    expect(r.net).toBe('472000.00');
    expect(r.gross).toBe('472000.00');
  });

  it('inachambua VAT 18% kutoka bei iliyojumuisha', () => {
    const r = splitVat('472000.00', '0.18');
    expect(r.net).toBe('400000.00');
    expect(r.vat).toBe('72000.00');
    expect(r.gross).toBe('472000.00');
  });

  it('net + vat = gross kila wakati', () => {
    for (const gross of ['1000', '999.99', '12500', '472000']) {
      const r = splitVat(gross, '0.18');
      const sum = new Prisma.Decimal(r.net).plus(r.vat);
      expect(sum.minus(new Prisma.Decimal(gross)).abs().lessThan('0.01')).toBe(
        true,
      );
    }
  });

  it('msimbo wa EFD una herufi 10', () => {
    expect(efdVerificationCode('sale-1:TZ0001')).toHaveLength(10);
    expect(efdVerificationCode('a')).not.toBe(efdVerificationCode('b'));
  });
});
