import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * TOTP (RFC 6238) kwa 2FA ya OWNER — §A12.
 * Base32 (RFC 4648) secret, HMAC-SHA1, dirisha la sekunde 30,
 * uvumilivu wa hatua 1 mbele/nyuma (±30s) kwa clock skew.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateTotpSecret(bytes = 20): string {
  const buf = randomBytes(bytes);
  let bits = 0;
  let value = 0;
  let out = '';

  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(secret: string): Buffer {
  const clean = secret.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];

  for (const char of clean) {
    const idx = ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secret: string, counter: number, digits = 6): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter % 0x100000000, 4);

  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 10 ** digits).toString().padStart(digits, '0');
}

/** Code ya sasa (au ya `at` millis) kwa secret. */
export function totpCode(secret: string, at: number = Date.now()): string {
  return hotp(secret, Math.floor(at / 1000 / 30));
}

/** Thibitisha code kwa uvumilivu wa hatua ±1. */
export function verifyTotp(
  secret: string,
  code: string,
  window = 1,
): boolean {
  const clean = (code ?? '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(clean) || !secret) return false;

  const step = Math.floor(Date.now() / 1000 / 30);
  for (let i = -window; i <= window; i += 1) {
    const expected = hotp(secret, step + i);
    const a = Buffer.from(expected);
    const b = Buffer.from(clean);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

/** otpauth:// URL ya authenticator apps (Google Authenticator, Authy, ...). */
export function totpUri(
  secret: string,
  account: string,
  issuer = 'MyBoke',
): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Backup codes 8 × 6 tarakimu (huhifadhiwa kama hash). */
export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    randomBytes(4).toString('hex').toUpperCase().slice(0, 8),
  );
}
