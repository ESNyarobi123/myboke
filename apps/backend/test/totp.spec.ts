import {
  base32Decode,
  generateBackupCodes,
  generateTotpSecret,
  totpCode,
  totpUri,
  verifyTotp,
} from '../src/common/utils/totp.util';

describe('TOTP (A12)', () => {
  // RFC 6238 test vector: secret "12345678901234567890" → base32
  // GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ
  const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

  it('base32Decode inarudisha bytes za RFC', () => {
    expect(base32Decode(RFC_SECRET).toString()).toBe('12345678901234567890');
  });

  it('totpCode inafuata muda (dirisha la sekunde 30)', () => {
    const at = 59_000; // RFC: 94287082 kwa 8 digits — hapa 6 digits
    const code = totpCode(RFC_SECRET, at);
    expect(code).toMatch(/^\d{6}$/);
    // Counter ya 59s ni sawa na 30s (step 1)
    expect(code).toBe(totpCode(RFC_SECRET, 30_000));
    expect(totpCode(RFC_SECRET, 60_000)).not.toBe(code);
  });

  it('verifyTotp inakubali code ya sasa na ±1 window', () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    expect(verifyTotp(secret, totpCode(secret, now))).toBe(true);
    expect(verifyTotp(secret, totpCode(secret, now - 30_000))).toBe(true);
    // Hatua 4 nyuma iko nje ya window
    expect(verifyTotp(secret, totpCode(secret, now - 120_000))).toBe(false);
  });

  it('verifyTotp inakataa code isiyo sahihi au yenye muundo mbaya', () => {
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, '000000')).toBe(false);
    expect(verifyTotp(secret, 'abc')).toBe(false);
    expect(verifyTotp(secret, '')).toBe(false);
  });

  it('totpUri ina secret + issuer', () => {
    const uri = totpUri('ABC234', '0712345678');
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain('secret=ABC234');
    expect(uri).toContain('issuer=MyBoke');
  });

  it('backup codes ni 8 na hazijirudii', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
  });
});
