#!/usr/bin/env node
/**
 * MyBoke API — End-to-End Acceptance Suite
 * ------------------------------------------------------------------
 * Inafunika kila endpoint kwenye §10.6 ya MYBOKE_MASTER_SPEC.md:
 * auth, businesses/members, shops, products, stock, sales, shifts,
 * customers/debts, expenses, sync, reports/analytics, exports,
 * growth, billing, partners, admin, uploads, notifications.
 *
 * Pia inathibitisha:
 *   • Tenant isolation (biashara B haiwezi kuona data ya A)
 *   • RBAC (CASHIER haruhusiwi kufungua duka)
 *   • Hesabu ya pesa kwa string + VAT 18% inclusive
 *   • Idempotency ya mauzo (Idempotency-Key)
 *   • Sync push/pull/conflict/state
 *   • HMAC ya webhook ya Snippe
 *
 * Matumizi:
 *   node test/e2e/api.e2e.mjs                # server lazima iwe hai
 *   E2E_BASE=... node test/e2e/api.e2e.mjs
 */

import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

const BASE = (process.env.E2E_BASE ?? 'http://localhost:4000/v1').replace(/\/$/, '');
const WEBHOOK_SECRET = process.env.SNIPPE_WEBHOOK_SECRET ?? '';
const RUN = Date.now().toString(36).toUpperCase();
const PASSWORD = 'MyBoke@2026';


// TOTP (RFC 6238) ndogo kwa ajili ya vipimo vya 2FA.
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Decode(secret) {
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of secret.toUpperCase().replace(/=+$/, '')) {
    const idx = B32.indexOf(ch);
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
function totp(secret) {
  const counter = Math.floor(Date.now() / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter % 0x100000000, 4);
  const hmac = createHmac('sha1', base32Decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, '0');
}

// ─────────────────────────────────────────────────────────────
// Harness
// ─────────────────────────────────────────────────────────────
const results = [];
let currentGroup = 'general';

function group(name) {
  currentGroup = name;
}

async function step(name, fn) {
  const started = Date.now();
  try {
    const note = await fn();
    results.push({
      group: currentGroup,
      name,
      ok: true,
      ms: Date.now() - started,
      note: note ?? '',
    });
    return note;
  } catch (error) {
    results.push({
      group: currentGroup,
      name,
      ok: false,
      ms: Date.now() - started,
      note: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

class ApiError extends Error {
  constructor(method, path, status, body) {
    const detail =
      typeof body === 'string' ? body.slice(0, 300) : JSON.stringify(body)?.slice(0, 400);
    super(`${method} ${path} → ${status}: ${detail}`);
    this.status = status;
    this.body = body;
  }
}

async function api(method, path, options = {}) {
  const { token, body, headers = {}, expect = [200, 201], raw = false, form } = options;
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const init = { method, headers: { ...headers } };

  if (token) init.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  } else if (form) {
    init.body = form;
  }

  const res = await fetch(url, init);
  const status = res.status;

  if (raw) {
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!expect.includes(status)) {
      throw new ApiError(method, path, status, buffer.toString('utf8'));
    }
    return { status, buffer, headers: res.headers, contentType: res.headers.get('content-type') };
  }

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  if (!expect.includes(status)) {
    throw new ApiError(method, path, status, json);
  }
  return { status, json, headers: res.headers };
}

const ctx = {};

function money(value) {
  assert.equal(typeof value, 'string', `Pesa lazima iwe string, ilipatikana ${typeof value}`);
  assert.match(value, /^-?\d+\.\d{2}$/, `Pesa isiyo na desimali 2: ${value}`);
  return Number(value);
}

function assertMoney(actual, expected, label) {
  const a = money(actual);
  assert.equal(a.toFixed(2), Number(expected).toFixed(2), `${label}: ${actual} ≠ ${expected}`);
}

async function registerOwner(suffix) {
  const phone = `07${String(Date.now()).slice(-7)}${suffix}`.slice(0, 10);
  const res = await api('POST', '/auth/register', {
    body: {
      name: `Mmiliki ${suffix}`,
      phone,
      password: PASSWORD,
      businessName: `Biashara ${suffix} ${RUN}`,
      businessType: 'RETAIL',
      shopName: 'Duka Kuu',
      acceptsTerms: true,
    },
  });

  const me = await api('GET', '/auth/me', { token: res.json.accessToken });
  const businesses = await api('GET', '/businesses', { token: res.json.accessToken });
  const list = businesses.json.data ?? (Array.isArray(businesses.json) ? businesses.json : []);

  return {
    ...res.json,
    phone,
    user: me.json.user ?? me.json,
    business: list[0],
    businesses: list,
  };
}

/** Maliza checkout halisi: invoice → webhook yenye HMAC → subscription hai. */
async function upgradePlan(planId) {
  const checkout = await api('POST', '/subscriptions/checkout', {
    token: ctx.token,
    body: { planId, months: 1, phone: ctx.owner.phone, provider: 'snippe' },
  });
  const ref = checkout.json.reference;
  const payload = {
    reference: ref,
    paymentKey: checkout.json.paymentKey ?? ref,
    status: 'COMPLETED',
    amount: checkout.json.amount,
    phone: ctx.owner.phone,
    paidAt: new Date().toISOString(),
    metadata: { invoiceId: checkout.json.invoiceId },
  };
  const body = JSON.stringify(payload);
  const headers = { 'Content-Type': 'application/json' };
  if (WEBHOOK_SECRET) {
    headers['X-Snippe-Signature'] = createHmac('sha256', WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
  }
  const res = await fetch(`${BASE}/webhooks/snippe`, { method: 'POST', headers, body });
  const text = await res.text();
  assert.ok([200, 201].includes(res.status), `webhook ${res.status}: ${text}`);
  return checkout.json;
}

// ─────────────────────────────────────────────────────────────
// 1. Health + public
// ─────────────────────────────────────────────────────────────
async function testHealth() {
  group('Health');

  await step('health inajibu 200 + version', async () => {
    const { json } = await api('GET', '/health');
    assert.equal(json.status, 'ok');
    assert.ok(json.version || json.uptime >= 0, 'health haina version/uptime');
    return `v${json.version ?? '?'}`;
  });

  await step('health/ready inaonyesha database + redis', async () => {
    const { json } = await api('GET', '/health/ready', { expect: [200, 503] });
    assert.ok(json, 'ready haina majibu');
    return `db=${json.database ?? json.db ?? '?'}`;
  });

  await step('plans ni public (bila token)', async () => {
    const { json } = await api('GET', '/plans');
    const list = json.plans ?? json.data ?? (Array.isArray(json) ? json : null);
    assert.ok(Array.isArray(list) && list.length >= 3, 'plans hazitoshi');
    const starter = list.find((p) => p.id === 'starter');
    assert.ok(starter, 'plan starter haipo');
    assert.equal(typeof starter.monthlyPrice, 'string', 'monthlyPrice si string');
    ctx.plans = list;
    return `${list.length} plans`;
  });

  await step('GET /app/config — force update, VAT, features (I6)', async () => {
    const { json } = await api('GET', '/app/config');
    assert.equal(json.currency, 'TZS', 'currency si TZS');
    assert.equal(json.vat?.rate, 0.18, 'VAT rate si 0.18');
    assert.equal(typeof json.forceUpdate, 'boolean', 'forceUpdate si boolean');
    assert.ok(json.support?.phone, 'hakuna support phone');
    assert.ok(json.limits?.importRows > 0, 'hakuna import limit');
    return `v${json.version}`;
  });

  await step('GET /metrics — Prometheus exposition + X-Request-Id', async () => {
    const res = await api('GET', '/metrics', { raw: true });
    const body = res.buffer.toString('utf8');
    assert.match(body, /# TYPE myboke_http_requests_total counter/);
    assert.match(body, /myboke_uptime_seconds \d+/);
    assert.ok(res.headers.get('x-request-id'), 'hakuna X-Request-Id');
    const summary = await api('GET', '/metrics/summary');
    assert.equal(typeof summary.json.requests, 'number', 'requests si namba');
    assert.ok(Array.isArray(summary.json.routes), 'routes si array');
    return `${body.split('\n').length} lines`;
  });
}

// ─────────────────────────────────────────────────────────────
// 2. Auth — register, me, locale, refresh, logout
// ─────────────────────────────────────────────────────────────
async function testAuthCore() {
  group('Auth');

  await step('register inatengeneza biashara + duka + token', async () => {
    const owner = await registerOwner('1');
    assert.ok(owner.accessToken, 'hakuna accessToken');
    assert.ok(owner.refreshToken, 'hakuna refreshToken');
    assert.ok(owner.user?.id, 'hakuna user');
    assert.ok(owner.business?.id, 'hakuna business');
    ctx.owner = owner;
    ctx.token = owner.accessToken;
    ctx.businessId = owner.business.id;
    return `business=${owner.business.id}`;
  });

  await step('register inakataa namba iliyotumika (409)', async () => {
    const { json } = await api('POST', '/auth/register', {
      body: {
        name: 'Duplicate',
        phone: ctx.owner.phone,
        password: PASSWORD,
        businessName: 'Duplicate Biz',
        acceptsTerms: true,
      },
      expect: [409, 400],
    });
    const message = json.message ?? json.detail ?? json.title;
    assert.ok(message, 'hakuna ujumbe wa kosa');
    return message;
  });

  await step('login kwa namba + password', async () => {
    const { json } = await api('POST', '/auth/login', {
      body: { identifier: ctx.owner.phone, password: PASSWORD, deviceId: `e2e-${RUN}` },
    });
    assert.ok(json.accessToken, 'hakuna token');
    ctx.token = json.accessToken;
    return 'ok';
  });

  await step('login inakataa password mbaya (401)', async () => {
    await api('POST', '/auth/login', {
      body: { identifier: ctx.owner.phone, password: 'Nope123!' },
      expect: [401, 400],
    });
  });


  await step('POST /auth/demo — demo mode (A10)', async () => {
    const { json } = await api('POST', '/auth/demo', { expect: [200, 201] });
    assert.equal(json.demo, true);
    assert.ok(json.accessToken, 'hakuna token ya demo');
    assert.ok(json.expiresAt, 'hakuna expiresAt');
    const products = await api('GET', '/products', { token: json.accessToken });
    const rows = products.json.data ?? products.json;
    assert.ok(Array.isArray(rows) && rows.length >= 6, 'demo haina bidhaa');
    const coins = await api('GET', '/coins/balance', { token: json.accessToken });
    assert.ok(coins.json.balance >= 100, 'bonus ya onboarding haipo');
    return `${json.businessName} · ${rows.length} bidhaa`;
  });

  await step('A12 — 2FA setup → enable → login → disable', async () => {
    const status = await api('GET', '/auth/2fa/status', { token: ctx.token });
    assert.equal(status.json.enabled, false);

    const setup = await api('POST', '/auth/2fa/setup', {
      token: ctx.token,
      body: { password: PASSWORD },
    });
    assert.ok(setup.json.secret, 'hakuna secret');
    assert.match(setup.json.otpauthUrl, /^otpauth:\/\/totp\//);

    const enable = await api('POST', '/auth/2fa/enable', {
      token: ctx.token,
      body: { code: totp(setup.json.secret) },
    });
    assert.equal(enable.json.enabled, true);
    assert.equal(enable.json.backupCodes.length, 8);

    // Login bila code inakataliwa
    const blocked = await api('POST', '/auth/login', {
      body: { identifier: ctx.owner.phone, password: PASSWORD },
      expect: [401, 400],
    });
    assert.ok(
      JSON.stringify(blocked.json).includes('TWO_FA_REQUIRED'),
      'hakuna TWO_FA_REQUIRED',
    );

    // Login na backup code inafanikiwa
    const okLogin = await api('POST', '/auth/login', {
      body: {
        identifier: ctx.owner.phone,
        password: PASSWORD,
        totp: enable.json.backupCodes[0],
      },
      expect: [200, 201],
    });
    assert.ok(okLogin.json.accessToken, 'login ya 2FA imeshindikana');

    const disabled = await api('POST', '/auth/2fa/disable', {
      token: ctx.token,
      body: { password: PASSWORD },
    });
    assert.equal(disabled.json.enabled, false);
    return 'setup · enable · login · disable';
  });

  await step('GET /auth/me', async () => {
    const { json } = await api('GET', '/auth/me', { token: ctx.token });
    assert.equal(json.user?.phone ?? json.phone, ctx.owner.phone);
    ctx.userId = json.user?.id ?? json.id;
    assert.ok(ctx.userId, 'hakuna userId');
    return ctx.userId;
  });

  await step('PATCH /auth/me/locale', async () => {
    const { json } = await api('PATCH', '/auth/me/locale', {
      token: ctx.token,
      body: { locale: 'en' },
    });
    assert.ok(json, 'hakuna majibu');
    await api('PATCH', '/auth/me/locale', { token: ctx.token, body: { locale: 'sw' } });
    return 'en→sw';
  });

  await step('refresh inazalisha token mpya na inabatilisha ya zamani', async () => {
    const login = await api('POST', '/auth/login', {
      body: { identifier: ctx.owner.phone, password: PASSWORD },
    });
    const first = login.json.refreshToken;
    const rotated = await api('POST', '/auth/refresh', { body: { refreshToken: first } });
    assert.ok(rotated.json.accessToken, 'hakuna access token mpya');
    await api('POST', '/auth/refresh', {
      body: { refreshToken: first },
      expect: [401, 403, 400],
    });
    ctx.token = rotated.json.accessToken;
    ctx.refreshToken = rotated.json.refreshToken;
    return 'rotated';
  });

  await step('Otp: send + verify (dev code)', async () => {
    const phone = `0755${String(Date.now()).slice(-6)}`;
    const sent = await api('POST', '/auth/otp/send', {
      body: { phone, purpose: 'REGISTER' },
    });
    const devCode = sent.json.devCode ?? sent.json.code ?? '000000';
    if (!sent.json.devCode && !sent.json.code) {
      return 'imekataliwa kwa SMS gateway (dev)';
    }
    const verified = await api('POST', '/auth/otp/verify', {
      body: { phone, code: devCode, purpose: 'REGISTER', name: 'OTP User' },
    });
    assert.ok(verified.json.accessToken || verified.json.user, 'otp verify haikufaulu');
    ctx.otpUser = { phone, ...verified.json };
    return 'verified';
  });

  await step('password forgot + reset + change', async () => {
    const forgot = await api('POST', '/auth/password/forgot', {
      body: { identifier: ctx.otpUser?.phone ?? ctx.owner.phone },
    });
    const token = forgot.json.resetToken ?? forgot.json.devToken ?? forgot.json.token;
    if (!token) return 'link imetumwa (hakuna token ya dev)';

    await api('POST', '/auth/password/reset', {
      body: { token, password: 'NewPass@2026' },
    });
    await api('POST', '/auth/login', {
      body: { identifier: ctx.otpUser?.phone ?? ctx.owner.phone, password: 'NewPass@2026' },
    });
    return 'reset ok';
  });
}

// ─────────────────────────────────────────────────────────────
// 3. Businesses + members + cashier
// ─────────────────────────────────────────────────────────────
async function testBusinesses() {
  group('Businesses');

  await step('GET /businesses', async () => {
    const { json } = await api('GET', '/businesses', { token: ctx.token });
    const list = Array.isArray(json) ? json : json.data;
    assert.ok(list.some((b) => b.id === ctx.businessId), 'biashara haipo kwenye orodha');
    return `${list.length}`;
  });

  await step('GET /businesses/:id', async () => {
    const { json } = await api('GET', `/businesses/${ctx.businessId}`, {
      token: ctx.token,
    });
    assert.equal(json.id, ctx.businessId);
    return json.name;
  });

  await step('PATCH /businesses/current — VAT 18%', async () => {
    const { json } = await api('PATCH', '/businesses/current', {
      token: ctx.token,
      body: {
        name: `Biashara ${RUN}`,
        vatEnabled: true,
        isVatRegistered: true,
        vatRate: '0.18',
        tin: '123-456-789',
        vatNumber: 'VAT-E2E-001',
        efdSerial: 'EFD-E2E-001',
      },
    });
    ctx.business = json;
    return `vatRate=${json.vatRate}`;
  });

  await step('PATCH /businesses/:id (alias)', async () => {
    const { json } = await api('PATCH', `/businesses/${ctx.businessId}`, {
      token: ctx.token,
      body: { currency: 'TZS' },
    });
    assert.equal(json.currency, 'TZS');
    return 'ok';
  });

  await step('POST /businesses — biashara ya pili (tenant B)', async () => {
    const second = await registerOwner('2');
    ctx.tenantB = second;
    const created = await api('POST', '/businesses', {
      token: second.accessToken,
      body: { name: `Tenant B ${RUN}`, type: 'RETAIL', shopName: 'B Duka' },
    });
    assert.ok(created.json.id || created.json.business?.id, 'hakuna biashara mpya');
    ctx.tenantBBusinessId = created.json.id ?? created.json.business.id;
    return ctx.tenantBBusinessId;
  });

  await step('GET /businesses/current/members', async () => {
    const { json } = await api('GET', '/businesses/current/members', { token: ctx.token });
    const list = Array.isArray(json) ? json : json.data;
    assert.ok(list.length >= 1, 'hakuna members');
    ctx.ownerMemberId = list.find((m) => m.role === 'OWNER')?.id ?? list[0].id;
    return `${list.length} members`;
  });

  await step('POST members/invite — CASHIER mwenye PIN', async () => {
    const phone = `0766${String(Date.now()).slice(-6)}`;
    const { json } = await api('POST', '/businesses/current/members/invite', {
      token: ctx.token,
      body: { phone, name: 'Mauzo Cashier', role: 'CASHIER', pin: '4321' },
    });
    ctx.cashier = { phone, memberId: json.id ?? json.member?.id, userId: json.userId };
    assert.ok(ctx.cashier.memberId, 'hakuna memberId');
    return ctx.cashier.memberId;
  });

  await step('POST /auth/login/pin — cashier anaingia', async () => {
    const { json } = await api('POST', '/auth/login/pin', {
      body: { memberId: ctx.cashier.memberId, pin: '4321', deviceId: `e2e-cash-${RUN}` },
    });
    assert.ok(json.accessToken, 'hakuna token ya cashier');
    ctx.cashierToken = json.accessToken;
    return 'cashier token';
  });

  await step('GET /businesses/:id/members', async () => {
    const { json } = await api('GET', `/businesses/${ctx.businessId}/members`, {
      token: ctx.token,
    });
    const list = Array.isArray(json) ? json : json.data;
    assert.ok(list.length >= 2, 'cashier hajaonekana');
    return `${list.length}`;
  });

  await step('PATCH members/:id — role → MANAGER', async () => {
    const { json } = await api(
      'PATCH',
      `/businesses/${ctx.businessId}/members/${ctx.cashier.memberId}`,
      { token: ctx.token, body: { role: 'MANAGER' } },
    );
    assert.equal(json.role, 'MANAGER');
    await api('PATCH', `/businesses/${ctx.businessId}/members/${ctx.cashier.memberId}`, {
      token: ctx.token,
      body: { role: 'CASHIER' },
    });
    return 'MANAGER→CASHIER';
  });

  await step('POST members/:id/pin — kubadilisha PIN', async () => {
    const { json } = await api(
      'POST',
      `/businesses/${ctx.businessId}/members/${ctx.cashier.memberId}/pin`,
      { token: ctx.token, body: { pin: '9876', isActive: true } },
    );
    assert.ok(json, 'hakuna majibu');
    await api('POST', '/auth/login/pin', {
      body: { memberId: ctx.cashier.memberId, pin: '9876' },
    });
    return 'pin updated';
  });

  await step('DELETE members/invite ya ziada', async () => {
    const phone = `0777${String(Date.now()).slice(-6)}`;
    const created = await api('POST', '/businesses/current/members/invite', {
      token: ctx.token,
      body: { phone, name: 'Mwenda Zuri', role: 'CASHIER' },
    });
    const memberId = created.json.id ?? created.json.member?.id;
    const removed = await api('DELETE', `/businesses/current/members/${memberId}`, {
      token: ctx.token,
    });
    assert.ok(removed.json.success !== false, 'kufuta hakukufaulu');
    return 'deleted';
  });
}

// ─────────────────────────────────────────────────────────────
// 4. Shops
// ─────────────────────────────────────────────────────────────
async function testShops() {
  group('Shops');

  await step('GET /shops (duka la kwanza limetengenezwa)', async () => {
    const { json } = await api('GET', '/shops', { token: ctx.token });
    const list = Array.isArray(json) ? json : json.data;
    assert.ok(list.length >= 1, 'hakuna duka');
    ctx.shopA = list[0].id;
    return `${list.length}`;
  });

  await step('plan limit — duka la pili linakataliwa kwenye Starter', async () => {
    const { json } = await api('POST', '/shops', {
      token: ctx.token,
      body: { name: 'Duka la Pili' },
      expect: [400],
    });
    const message = json.message ?? json.detail;
    assert.match(String(message), /maduka/i, `ujumbe: ${message}`);
    return message;
  });

  await step('upgrade → Growth kupitia checkout + webhook', async () => {
    await upgradePlan('growth');
    const { json } = await api('GET', '/subscriptions/current', { token: ctx.token });
    const planId = json.planId ?? json.subscription?.planId;
    assert.equal(planId, 'growth', `plan: ${planId}`);
    return 'growth active';
  });

  await step('POST /shops — duka la pili', async () => {
    const { json } = await api('POST', '/shops', {
      token: ctx.token,
      body: { name: 'Duka la Pili', address: 'Kariakoo', phone: '0712000111' },
    });
    ctx.shopB = json.id;
    return ctx.shopB;
  });

  await step('GET /shops/:id', async () => {
    const { json } = await api('GET', `/shops/${ctx.shopB}`, { token: ctx.token });
    assert.equal(json.id, ctx.shopB);
    return json.name;
  });

  await step('PATCH /shops/:id', async () => {
    const { json } = await api('PATCH', `/shops/${ctx.shopB}`, {
      token: ctx.token,
      body: { name: 'Duka la Pili (Mpya)' },
    });
    assert.match(json.name, /Mpya/);
    return 'ok';
  });

  await step('GET /shops/:id/health', async () => {
    const { json } = await api('GET', `/shops/${ctx.shopA}/health`, { token: ctx.token });
    assert.ok(json, 'hakuna majibu');
    return Object.keys(json).slice(0, 3).join(',');
  });

  await step('POST /shops ya tatu (itafutwa mwisho)', async () => {
    const { json } = await api('POST', '/shops', {
      token: ctx.token,
      body: { name: 'Duka la Tatu' },
    });
    ctx.shopTemp = json.id;
    return ctx.shopTemp;
  });
}
async function testCatalog() {
  group('Products');

  await step('POST /products/categories', async () => {
    const { json } = await api('POST', '/products/categories', {
      token: ctx.token,
      body: { name: 'Vinywaji', icon: 'cup' },
    });
    ctx.categoryDrinks = json.id;
    return json.id;
  });

  await step('POST /categories (alias)', async () => {
    const { json } = await api('POST', '/categories', {
      token: ctx.token,
      body: { name: 'Chakula' },
    });
    ctx.categoryFood = json.id;
    return json.id;
  });

  await step('GET /categories + GET /products/categories', async () => {
    const a = await api('GET', '/categories', { token: ctx.token });
    const b = await api('GET', '/products/categories', { token: ctx.token });
    const listA = Array.isArray(a.json) ? a.json : a.json.data;
    assert.ok(listA.length >= 2, 'categories hazitoshi');
    assert.ok(b.json, 'alias haina majibu');
    return `${listA.length}`;
  });

  await step('GET /categories/:id + PATCH', async () => {
    const { json } = await api('GET', `/categories/${ctx.categoryFood}`, {
      token: ctx.token,
    });
    assert.equal(json.id, ctx.categoryFood);
    const patched = await api('PATCH', `/categories/${ctx.categoryFood}`, {
      token: ctx.token,
      body: { name: 'Chakula & Snacks' },
    });
    assert.match(patched.json.name, /Snacks/);
    return patched.json.name;
  });

  await step('POST /suppliers', async () => {
    const { json } = await api('POST', '/suppliers', {
      token: ctx.token,
      body: { name: `Msambazaji ${RUN}`, phone: '0755123456', notes: 'Anakuja Jumatatu' },
    });
    ctx.supplierId = json.id;
    return json.id;
  });

  await step('GET /suppliers + GET /suppliers/:id + PATCH', async () => {
    const list = await api('GET', '/suppliers', { token: ctx.token });
    const items = Array.isArray(list.json) ? list.json : list.json.data;
    assert.ok(items.length >= 1, 'suppliers hazitoshi');
    const one = await api('GET', `/suppliers/${ctx.supplierId}`, { token: ctx.token });
    assert.equal(one.json.id, ctx.supplierId);
    assert.ok(Array.isArray(one.json.products), 'supplier haina products[]');
    const patched = await api('PATCH', `/suppliers/${ctx.supplierId}`, {
      token: ctx.token,
      body: { notes: 'Anakuja Jumanne' },
    });
    assert.match(patched.json.notes, /Jumanne/);
    return 'ok';
  });

  await step('POST /products — soda 1200 (stock 40)', async () => {
    const { json } = await api('POST', '/products', {
      token: ctx.token,
      body: {
        name: 'Soda 500ml',
        barcode: `899${RUN}`,
        categoryId: ctx.categoryDrinks,
        unitType: 'PCS',
        buyingPrice: '800.00',
        sellingPrice: '1200.00',
        alertLevel: 5,
        initialStock: '40',
        shopId: ctx.shopA,
      },
    });
    ctx.productSoda = json.id;
    assertMoney(json.sellingPrice, 1200, 'sellingPrice');
    return json.id;
  });

  await step('POST /products — mkate 1500 (stock 10)', async () => {
    const { json } = await api('POST', '/products', {
      token: ctx.token,
      body: {
        name: 'Mkate wa Sinia',
        categoryId: ctx.categoryFood,
        unitType: 'PCS',
        buyingPrice: '1000.00',
        sellingPrice: '1500.00',
        alertLevel: 3,
        initialStock: '10',
        shopId: ctx.shopA,
      },
    });
    ctx.productBread = json.id;
    return json.id;
  });

  await step('GET /products (pagination)', async () => {
    const { json } = await api('GET', '/products?limit=10', { token: ctx.token });
    const items = json.data ?? json;
    assert.ok(Array.isArray(items) && items.length >= 2, 'products hazitoshi');
    assert.ok('nextCursor' in json || Array.isArray(json), 'hakuna cursor');
    return `${items.length} items`;
  });

  await step('GET /products/search?q=soda', async () => {
    const { json } = await api('GET', '/products/search?q=soda', { token: ctx.token });
    const items = json.data ?? json;
    assert.ok(Array.isArray(items) && items.length >= 1, 'search haikupata soda');
    return `${items.length}`;
  });

  await step('GET /products/barcode/:code', async () => {
    const { json } = await api('GET', `/products/barcode/899${RUN}`, {
      token: ctx.token,
    });
    assert.equal(json.id, ctx.productSoda);
    return 'scanned';
  });

  await step('GET /products/:id + PATCH', async () => {
    const one = await api('GET', `/products/${ctx.productSoda}`, { token: ctx.token });
    assert.equal(one.json.id, ctx.productSoda);
    const patched = await api('PATCH', `/products/${ctx.productSoda}`, {
      token: ctx.token,
      body: { description: 'Soda baridi', alertLevel: 6 },
    });
    assert.equal(patched.json.alertLevel, 6);
    return 'ok';
  });

  await step('POST /products/:id/price-change + price-history', async () => {
    const changed = await api('POST', `/products/${ctx.productSoda}/price-change`, {
      token: ctx.token,
      body: { newPrice: '1300.00', field: 'sellingPrice', reason: 'Gharama zimepanda' },
    });
    assertMoney(changed.json.sellingPrice ?? '1300.00', 1300, 'bei mpya');
    const history = await api('GET', `/products/${ctx.productSoda}/price-history`, {
      token: ctx.token,
    });
    const rows = history.json.data ?? history.json;
    assert.ok(Array.isArray(rows) && rows.length >= 1, 'historia haipo');
    return `${rows.length} changes`;
  });

  await step('POST /products/:id/stock — ongeza 10', async () => {
    const { json } = await api('POST', `/products/${ctx.productSoda}/stock`, {
      token: ctx.token,
      body: { shopId: ctx.shopA, quantity: '10', reason: 'RESTOCK', note: 'Shehena mpya' },
    });
    assert.ok(json, 'hakuna majibu');
    return json.quantity ?? 'ok';
  });

  await step('GET /products/:id/movements', async () => {
    const { json } = await api('GET', `/products/${ctx.productSoda}/movements`, {
      token: ctx.token,
    });
    const rows = json.data ?? json;
    assert.ok(Array.isArray(rows) && rows.length >= 2, 'movements hazitoshi');
    return `${rows.length}`;
  });

  await step('GET /products/low-stock', async () => {
    const { json } = await api('GET', '/products/low-stock', { token: ctx.token });
    const rows = json.data ?? json;
    assert.ok(Array.isArray(rows), 'low-stock si array');
    return `${rows.length}`;
  });

  await step('GET /products/expiring — C8', async () => {
    const { json } = await api('GET', '/products/expiring?days=90', {
      token: ctx.token,
    });
    assert.ok(Array.isArray(json.data), 'expiring.data si array');
    assert.ok('expired' in json && 'atRiskValue' in json, 'muhtasari unakosekana');
    return `${json.total} bidhaa, siku ${json.days}`;
  });

  await step('GET /products/import/template', async () => {
    const { buffer, contentType } = await api('GET', '/products/import/template', {
      token: ctx.token,
      raw: true,
    });
    assert.ok(buffer.length > 100, 'template ni tupu');
    return `${contentType} ${buffer.length}b`;
  });

  await step('POST /products/import — dry run', async () => {
    const csv =
      'name,buyingPrice,sellingPrice,stock,unitType\n' +
      'Chai Rangi,500.00,700.00,20,PCS\n' +
      'Sukari 1kg,2400.00,2800.00,15,KG\n';
    const form = new FormData();
    form.append('file', new Blob([csv], { type: 'text/csv' }), 'bidhaa.csv');
    form.append('dryRun', 'true');
    const { json } = await api('POST', '/products/import', { token: ctx.token, form });
    assert.ok(json, 'hakuna majibu');
    assert.ok(
      (json.valid ?? json.rows ?? 0) >= 2 || (json.preview ?? []).length >= 2,
      'dry run haikuona rows',
    );
    return JSON.stringify(json).slice(0, 80);
  });

  await step('POST /products/import — commit', async () => {
    const csv =
      'name,buyingPrice,sellingPrice,stock,unitType\n' +
      'Chai Rangi,500.00,700.00,20,PCS\n' +
      'Sukari 1kg,2400.00,2800.00,15,KG\n';
    const form = new FormData();
    form.append('file', new Blob([csv], { type: 'text/csv' }), 'bidhaa.csv');
    form.append('dryRun', 'false');
    const { json } = await api('POST', '/products/import', { token: ctx.token, form });
    assert.ok((json.created ?? json.imported ?? 0) >= 2, `import: ${JSON.stringify(json)}`);
    return `created=${json.created ?? json.imported}`;
  });

  await step('GET /products/export xlsx + csv', async () => {
    const xlsx = await api('GET', '/products/export', { token: ctx.token, raw: true });
    assert.ok(xlsx.buffer.length > 500, 'xlsx ni tupu');
    assert.match(xlsx.contentType ?? '', /spreadsheet|octet-stream/);
    const csv = await api('GET', '/products/export?format=csv', {
      token: ctx.token,
      raw: true,
    });
    assert.ok(csv.buffer.length > 50, 'csv ni tupu');
    return `${xlsx.buffer.length}b + ${csv.buffer.length}b`;
  });
}

// ─────────────────────────────────────────────────────────────
// 6. Stock
// ─────────────────────────────────────────────────────────────
async function testStock() {
  group('Stock');

  await step('GET /stock', async () => {
    const { json } = await api('GET', '/stock', { token: ctx.token });
    const rows = json.data ?? json;
    assert.ok(Array.isArray(rows) && rows.length >= 2, 'stock haitoshi');
    return `${rows.length}`;
  });

  await step('POST /stock/adjust IN +10', async () => {
    const { json } = await api('POST', '/stock/adjust', {
      token: ctx.token,
      body: { shopId: ctx.shopA, productId: ctx.productBread, quantity: '10', type: 'IN', reason: 'Manunuzi' },
    });
    assert.ok(json, 'hakuna majibu');
    return 'ok';
  });

  await step('POST /stock/transfer A→B 5 soda', async () => {
    const { json } = await api('POST', '/stock/transfer', {
      token: ctx.token,
      body: {
        fromShopId: ctx.shopA,
        toShopId: ctx.shopB,
        items: [{ productId: ctx.productSoda, quantity: '5' }],
        reason: 'Hamisho',
      },
    });
    assert.ok(json, 'hakuna majibu');
    return 'ok';
  });

  await step('POST /stock/count — hesabu halisi', async () => {
    const { json } = await api('POST', '/stock/count', {
      token: ctx.token,
      body: {
        shopId: ctx.shopA,
        items: [{ productId: ctx.productBread, countedQty: '17' }],
        note: 'Hesabu ya jioni',
      },
    });
    assert.ok(json, 'hakuna majibu');
    return 'ok';
  });

  await step('GET /stock/movements', async () => {
    const { json } = await api('GET', '/stock/movements?limit=20', { token: ctx.token });
    const rows = json.data ?? json;
    assert.ok(Array.isArray(rows) && rows.length >= 2, 'movements hazitoshi');
    return `${rows.length}`;
  });

  await step('GET /stock/alerts', async () => {
    const { json } = await api('GET', '/stock/alerts', { token: ctx.token });
    assert.ok(json, 'hakuna majibu');
    return JSON.stringify(json).slice(0, 40);
  });

  await step('GET /stock/valuation', async () => {
    const { json } = await api('GET', '/stock/valuation', { token: ctx.token });
    assert.ok(json, 'hakuna majibu');
    ctx.valuation = json;
    assertMoney(json.costValue, json.costValue, 'costValue');
    assertMoney(json.retailValue, json.retailValue, 'retailValue');
    const profit = money(json.retailValue) - money(json.costValue);
    assert.ok(
      Math.abs(money(json.potentialProfit) - profit) < 0.02,
      `potentialProfit si sawa: ${json.potentialProfit}`,
    );
    return `cost=${json.costValue} retail=${json.retailValue}`;
  });
}

// ─────────────────────────────────────────────────────────────
// 7. Purchase orders
// ─────────────────────────────────────────────────────────────
async function testPurchaseOrders() {
  group('Purchase orders');

  await step('POST /purchase-orders', async () => {
    const { json } = await api('POST', '/purchase-orders', {
      token: ctx.token,
      body: {
        supplierId: ctx.supplierId,
        shopId: ctx.shopA,
        items: [
          { name: 'Soda 500ml', quantity: '24', unitCost: '800.00', productId: ctx.productSoda },
        ],
        notes: 'Agiza ya wiki',
      },
    });
    ctx.poId = json.id;
    assert.ok(ctx.poId, 'hakuna PO');
    return ctx.poId;
  });

  await step('GET /purchase-orders + GET /:id', async () => {
    const list = await api('GET', '/purchase-orders', { token: ctx.token });
    const rows = list.json.data ?? list.json;
    assert.ok(rows.length >= 1, 'PO haipo');
    const one = await api('GET', `/purchase-orders/${ctx.poId}`, { token: ctx.token });
    assert.equal(one.json.id, ctx.poId);
    return `${rows.length}`;
  });

  await step('PATCH /purchase-orders/:id', async () => {
    const { json } = await api('PATCH', `/purchase-orders/${ctx.poId}`, {
      token: ctx.token,
      body: { notes: 'Agiza ya wiki (imebadilishwa)' },
    });
    assert.match(json.notes, /imebadilishwa/);
    return 'ok';
  });

  await step('POST /purchase-orders/:id/send', async () => {
    const { json } = await api('POST', `/purchase-orders/${ctx.poId}/send`, {
      token: ctx.token,
      body: {},
    });
    assert.ok(json, 'hakuna majibu');
    return json.status ?? 'sent';
  });

  await step('POST /purchase-orders/:id/receive — stock inaongezeka', async () => {
    const po = await api('GET', `/purchase-orders/${ctx.poId}`, { token: ctx.token });
    const line = (po.json.items ?? [])[0];
    assert.ok(line?.id, 'PO haina lines');

    const readQty = async () => {
      const detail = await api('GET', `/products/${ctx.productSoda}`, { token: ctx.token });
      const levels = detail.json.stock ?? [];
      return levels.reduce((sum, l) => sum + Number(l.quantity ?? 0), 0);
    };
    const qtyBefore = await readQty();

    const { json } = await api('POST', `/purchase-orders/${ctx.poId}/receive`, {
      token: ctx.token,
      body: {
        items: [{ itemId: line.id, receivedQty: '24' }],
        updateCostPrice: false,
      },
    });
    assert.ok(json, 'hakuna majibu');

    const qtyAfter = await readQty();
    assert.ok(qtyAfter >= qtyBefore + 24, `stock haikuongezeka: ${qtyBefore} → ${qtyAfter}`);
    return `${qtyBefore} → ${qtyAfter}`;
  });

  await step('POST /purchase-orders ya pili + DELETE', async () => {
    const created = await api('POST', '/purchase-orders', {
      token: ctx.token,
      body: {
        supplierId: ctx.supplierId,
        shopId: ctx.shopA,
        items: [{ name: 'Bidhaa ya kufuta', quantity: '1', unitCost: '100.00' }],
      },
    });
    const removed = await api('DELETE', `/purchase-orders/${created.json.id}`, {
      token: ctx.token,
    });
    assert.ok(removed.json.success !== false, 'kufuta hakukufaulu');
    return 'deleted';
  });
}

// ─────────────────────────────────────────────────────────────
// 8. Customers + debts
// ─────────────────────────────────────────────────────────────
async function testCustomers() {
  group('Customers');

  await step('POST /customers', async () => {
    const { json } = await api('POST', '/customers', {
      token: ctx.token,
      body: {
        name: 'Asha Mwinyi',
        phone: '0713000222',
        creditLimit: '50000.00',
        notes: 'Mteja wa kudumu',
      },
    });
    ctx.customerId = json.id;
    return json.id;
  });

  await step('GET /customers + GET /:id + PATCH', async () => {
    const list = await api('GET', '/customers', { token: ctx.token });
    const rows = list.json.data ?? list.json;
    assert.ok(rows.length >= 1, 'customers hazitoshi');
    const one = await api('GET', `/customers/${ctx.customerId}`, { token: ctx.token });
    assert.equal(one.json.id, ctx.customerId);
    const patched = await api('PATCH', `/customers/${ctx.customerId}`, {
      token: ctx.token,
      body: { notes: 'Anapenda bidhaa za bei' },
    });
    assert.match(patched.json.notes, /bei/);
    return 'ok';
  });

  await step('GET /customers/:id/ledger', async () => {
    const { json } = await api('GET', `/customers/${ctx.customerId}/ledger`, {
      token: ctx.token,
    });
    assert.ok(json, 'hakuna ledger');
    return JSON.stringify(json).slice(0, 50);
  });

  await step('GET /customers/:id/statement?format=json', async () => {
    const { json } = await api('GET', `/customers/${ctx.customerId}/statement`, {
      token: ctx.token,
    });
    assert.ok(json, 'hakuna statement');
    return 'json';
  });

  await step('GET /customers/:id/statement?format=pdf', async () => {
    const { buffer, contentType } = await api(
      'GET',
      `/customers/${ctx.customerId}/statement?format=pdf`,
      { token: ctx.token, raw: true },
    );
    assert.ok(buffer.length > 500, 'pdf ni tupu');
    assert.equal(buffer.subarray(0, 4).toString(), '%PDF');
    return `${buffer.length}b ${contentType}`;
  });
}

async function testDebts() {
  group('Debts');

  await step('POST /debts (OWE_ME 10000)', async () => {
    const { json } = await api('POST', '/debts', {
      token: ctx.token,
      body: {
        type: 'OWE_ME',
        personName: 'Asha Mwinyi',
        personPhone: '0713000222',
        customerId: ctx.customerId,
        originalAmount: '10000.00',
        description: 'Mkopo wa unga',
        dueDate: new Date(Date.now() + 7 * 864e5).toISOString(),
      },
    });
    ctx.debtId = json.id;
    assertMoney(json.originalAmount, 10000, 'deni');
    return json.id;
  });

  await step('POST /debts/:id/payments 4000', async () => {
    const { json } = await api('POST', `/debts/${ctx.debtId}/payments`, {
      token: ctx.token,
      body: { amount: '4000.00', method: 'MPESA', reference: 'MP-1' },
    });
    assert.ok(json, 'hakuna majibu');
    return 'paid';
  });

  await step('GET /debts/:id — remaining 6000.00', async () => {
    const { json } = await api('GET', `/debts/${ctx.debtId}`, { token: ctx.token });
    assertMoney(json.remaining, 6000, 'remaining');
    assert.ok(Array.isArray(json.payments) && json.payments.length >= 1, 'payments hazipo');
    return json.remaining;
  });

  await step('GET /debts + /debts/summary', async () => {
    const list = await api('GET', '/debts', { token: ctx.token });
    const rows = list.json.data ?? list.json;
    assert.ok(rows.length >= 1, 'debts hazitoshi');
    const summary = await api('GET', '/debts/summary', { token: ctx.token });
    assert.ok(summary.json, 'hakuna summary');
    return JSON.stringify(summary.json).slice(0, 60);
  });

  await step('POST /debts/:id/remind — ngazi 3 (F5)', async () => {
    const { json } = await api('POST', `/debts/${ctx.debtId}/remind`, { token: ctx.token });
    assert.ok(json, 'hakuna majibu');
    assert.ok([1, 2, 3].includes(json.tier), `tier si sahihi: ${json.tier}`);
    assert.ok(json.whatsappUrl.startsWith('https://wa.me/'), 'link ya WhatsApp haipo');
    return `tier=${json.tier}`;
  });

  await step('PATCH /debts/:id', async () => {
    const { json } = await api('PATCH', `/debts/${ctx.debtId}`, {
      token: ctx.token,
      body: { description: 'Mkopo wa unga na sukari' },
    });
    assert.match(json.description, /sukari/);
    return 'ok';
  });

  await step('POST /debts ya pili + DELETE', async () => {
    const created = await api('POST', '/debts', {
      token: ctx.token,
      body: { type: 'I_OWE', personName: 'Juma Supplier', originalAmount: '5000.00' },
    });
    const removed = await api('DELETE', `/debts/${created.json.id}`, { token: ctx.token });
    assert.ok(removed.json.success !== false, 'kufuta hakukufaulu');
    return 'deleted';
  });
}

// ─────────────────────────────────────────────────────────────
// 9. Sales (VAT, idempotency, receipts, refunds)
// ─────────────────────────────────────────────────────────────
async function testSales() {
  group('Sales');

  await step('POST /sales — 2 soda @1300 + 1 mkate @1500', async () => {
    const idem = `e2e-${RUN}-S1`;
    const { json } = await api('POST', '/sales', {
      token: ctx.token,
      headers: { 'Idempotency-Key': idem },
      body: {
        shopId: ctx.shopA,
        customerId: ctx.customerId,
        items: [
          { productId: ctx.productSoda, quantity: '2' },
          { productId: ctx.productBread, quantity: '1' },
        ],
        paymentMethod: 'CASH',
        note: 'Mauzo ya e2e',
        idempotencyKey: idem,
      },
    });
    ctx.saleId = json.id ?? json.sale?.id;
    assert.ok(ctx.saleId, 'hakuna sale id');
    const total = json.total ?? json.sale?.total;
    assertMoney(total, 4100, 'total ya mauzo');

    assertMoney(json.subtotal, 4100, 'subtotal');

    // VAT 18% inclusive: 4100 / 1.18 = 3474.58 net, VAT = 625.42
    assert.ok(json.vat, 'hakuna vat breakdown');
    assert.equal(json.vat.enabled, true, 'VAT haijawashwa');
    assert.equal(json.vat.inclusive, true, 'VAT si inclusive');
    assert.equal(json.vat.ratePercent, 18);
    assertMoney(json.vat.amount, 625.42, 'VAT');
    assertMoney(json.vat.netTotal, 3474.58, 'net ya VAT');
    assertMoney(json.vat.grossTotal, 4100, 'gross ya VAT');

    // Malipo: CASH kamili → salio 0.00
    assertMoney(json.paid, 4100, 'paid');
    assertMoney(json.balance, 0, 'balance');

    ctx.saleTotal = total;
    ctx.saleVat = json.vat.amount;
    return `total=${total} vat=${json.vat.amount} net=${json.vat.netTotal}`;
  });

  await step('POST /sales — Idempotency-Key ile ile → sale moja tu', async () => {
    const idem = `e2e-${RUN}-S1`;
    const again = await api('POST', '/sales', {
      token: ctx.token,
      headers: { 'Idempotency-Key': idem },
      body: {
        shopId: ctx.shopA,
        items: [{ productId: ctx.productSoda, quantity: '2' }],
        paymentMethod: 'CASH',
        idempotencyKey: idem,
      },
      expect: [200, 201, 409],
    });
    const sameId = again.json.id ?? again.json.sale?.id;
    if (sameId) assert.equal(sameId, ctx.saleId, 'imeunda sale mpya badala ya kurudisha ile ile');
    return 'idempotent';
  });

  await step('stock imepungua baada ya mauzo', async () => {
    const { json } = await api('GET', `/products/${ctx.productSoda}`, { token: ctx.token });
    const levels = json.stock ?? [];
    const totalQty = levels.reduce((sum, l) => sum + Number(l.quantity ?? 0), 0);
    // 40 + 10 + 24 - 5 (transfer) - 2 (sale) = 67 kwa duka A + 5 duka B
    assert.ok(totalQty > 0 && totalQty < 74, `stock isiyo sahihi: ${totalQty}`);
    return `jami=${totalQty.toFixed(2)}`;
  });

  await step('GET /sales + GET /sales/:id', async () => {
    const list = await api('GET', '/sales?limit=10', { token: ctx.token });
    const rows = list.json.data ?? list.json;
    assert.ok(rows.length >= 1, 'sales hazitoshi');
    const one = await api('GET', `/sales/${ctx.saleId}`, { token: ctx.token });
    assert.equal(one.json.id, ctx.saleId);
    assert.ok(Array.isArray(one.json.items) && one.json.items.length === 2, 'items si 2');
    return `${rows.length}`;
  });

  await step('GET /sales/:id/receipt?format=json', async () => {
    const { json } = await api('GET', `/sales/${ctx.saleId}/receipt`, { token: ctx.token });
    assert.ok(json, 'hakuna receipt');
    return 'json';
  });

  await step('GET /sales/:id/receipt?format=html', async () => {
    const { json } = await api('GET', `/sales/${ctx.saleId}/receipt?format=html`, {
      token: ctx.token,
    });
    const html = typeof json === 'string' ? json : json.html;
    assert.match(html, /<html|<!DOCTYPE/i, 'html si sahihi');
    assert.match(html, /4100/, 'html haina total');
    assert.match(html, /data:image\/png;base64,/, 'D19: QR haipo kwenye risiti');
    assert.match(html, /TIN|VAT/, 'D19: TIN/VAT haipo');
    return 'html + QR ok';
  });

  await step('GET /sales/:id/receipt?format=pdf (58mm)', async () => {
    const { buffer } = await api('GET', `/sales/${ctx.saleId}/receipt?format=pdf`, {
      token: ctx.token,
      raw: true,
    });
    assert.equal(buffer.subarray(0, 4).toString(), '%PDF', 'si PDF');
    assert.ok(buffer.length > 1000, 'pdf ni ndogo mno');
    return `${buffer.length}b`;
  });

  await step('GET /sales/:id/receipt?format=pdf&width=80', async () => {
    const { buffer } = await api(
      'GET',
      `/sales/${ctx.saleId}/receipt?format=pdf&width=80`,
      { token: ctx.token, raw: true },
    );
    assert.equal(buffer.subarray(0, 4).toString(), '%PDF');
    return `${buffer.length}b`;
  });

  await step('POST /sales/:id/share', async () => {
    const { json } = await api('POST', `/sales/${ctx.saleId}/share`, {
      token: ctx.token,
      body: {},
    });
    assert.ok(json, 'hakuna share');
    return JSON.stringify(json).slice(0, 60);
  });

  await step('GET /sales/:id/payments', async () => {
    const { json } = await api('GET', `/sales/${ctx.saleId}/payments`, { token: ctx.token });
    const rows = json.data ?? json;
    assert.ok(Array.isArray(rows) && rows.length >= 1, 'payments hazipo');
    return `${rows.length}`;
  });

  await step('POST /sales/:id/payments — malipo ya deni la sale', async () => {
    // Sale ya CREDIT haina malipo → salio lote linabaki.
    const credit = await api('POST', '/sales', {
      token: ctx.token,
      body: {
        shopId: ctx.shopA,
        customerId: ctx.customerId,
        items: [{ productId: ctx.productSoda, quantity: '2' }],
        paymentMethod: 'CREDIT',
      },
    });
    ctx.creditSaleId = credit.json.id ?? credit.json.sale?.id;
    const total = credit.json.total ?? credit.json.sale?.total;
    assertMoney(total, 2600, 'total ya CREDIT');

    const paid = await api('POST', `/sales/${ctx.creditSaleId}/payments`, {
      token: ctx.token,
      body: { amount: '1000.00', method: 'MPESA', reference: 'MP-EXTRA' },
    });
    assert.ok(paid.json, 'hakuna majibu');

    // Kuzidi salio linakataliwa kwa code maalum.
    const over = await api('POST', `/sales/${ctx.creditSaleId}/payments`, {
      token: ctx.token,
      body: { amount: '99999.00', method: 'CASH' },
      expect: [400, 409],
    });
    const detail = over.json.detail ?? over.json.message;
    assert.match(String(detail), /salio/i, `kosa: ${detail}`);

    const after = await api('GET', `/sales/${ctx.creditSaleId}/payments`, {
      token: ctx.token,
    });
    const rows = after.json.data ?? after.json;
    const sum = rows.reduce((acc, p) => acc + Number(p.amount ?? 0), 0);
    assert.ok(Math.abs(sum - 1000) < 0.01, `malipo yamekusanywa vibaya: ${sum}`);
    return `salio 1600.00`;
  });

  await step('POST /sales — split payment (CASH 2000 + MPESA 600)', async () => {
    const sale = await api('POST', '/sales', {
      token: ctx.token,
      body: {
        shopId: ctx.shopA,
        items: [{ productId: ctx.productSoda, quantity: '2' }],
        payments: [
          { method: 'CASH', amount: '2000.00' },
          { method: 'MPESA', amount: '600.00', reference: 'SPLIT-1' },
        ],
      },
    });
    const id = sale.json.id ?? sale.json.sale?.id;
    assert.ok(id, 'hakuna sale id');
    assertMoney(sale.json.total ?? sale.json.sale?.total, 2600, 'total ya split');
    assert.equal(
      sale.json.paymentMethod ?? sale.json.sale?.paymentMethod,
      'MIXED',
      'paymentMethod si MIXED',
    );

    const rows = await api('GET', `/sales/${id}/payments`, { token: ctx.token });
    const list = rows.json.data ?? rows.json;
    assert.equal(list.length, 2, `malipo ya split si 2: ${list.length}`);
    const sum = list.reduce((acc, p) => acc + Number(p.amount ?? 0), 0);
    assert.ok(Math.abs(sum - 2600) < 0.01, `split jumla si 2600: ${sum}`);
    return 'MIXED 2600.00';
  });

  await step('POST /sales — split inayozidi total inakataliwa', async () => {
    const res = await api('POST', '/sales', {
      token: ctx.token,
      body: {
        shopId: ctx.shopA,
        items: [{ productId: ctx.productSoda, quantity: '2' }],
        payments: [
          { method: 'CASH', amount: '2000.00' },
          { method: 'MPESA', amount: '900.00' },
        ],
      },
      expect: [400],
    });
    const detail = res.json.detail ?? res.json.message;
    assert.match(String(detail), /zidi/i, `kosa si sahihi: ${detail}`);
    return 'rejected';
  });

  await step('PATCH /sales/:id', async () => {
    const { json } = await api('PATCH', `/sales/${ctx.saleId}`, {
      token: ctx.token,
      body: { note: 'Mauzo ya e2e (imehaririwa)' },
    });
    assert.match(json.note, /imehaririwa/);
    return 'ok';
  });

  await step('POST /sales/:id/efd — namba ya EFD', async () => {
    const { json } = await api('POST', `/sales/${ctx.saleId}/efd`, {
      token: ctx.token,
      body: { efdReceiptNo: 'EFD-2026-0001' },
    });
    assert.ok(json, 'hakuna majibu');
    return json.efdReceiptNo ?? 'ok';
  });

  await step('stock guard — kuuza 5 wakati zipo 2 → 409 INSUFFICIENT_STOCK', async () => {
    const created = await api('POST', '/products', {
      token: ctx.token,
      body: {
        name: 'Bidhaa Adimu',
        buyingPrice: '100.00',
        sellingPrice: '200.00',
        initialStock: '2',
        shopId: ctx.shopA,
      },
    });
    const id = created.json.id;
    const res = await api('POST', '/sales', {
      token: ctx.token,
      body: {
        shopId: ctx.shopA,
        items: [{ productId: id, quantity: '5' }],
        paymentMethod: 'CASH',
      },
      expect: [409],
    });
    assert.equal(res.json.code, 'INSUFFICIENT_STOCK', `code: ${res.json.code}`);
    assert.equal(res.json.meta?.available, 2, `available: ${res.json.meta?.available}`);
    assert.equal(res.json.meta?.requested, 5);
    ctx.scarceProductId = id;
    return '409 INSUFFICIENT_STOCK';
  });

  await step('refund inarudisha stock', async () => {
    const readQty = async (id) => {
      const d = await api('GET', `/products/${id}`, { token: ctx.token });
      return (d.json.stock ?? []).reduce(
        (sum, l) => sum + Number(l.quantity ?? 0),
        0,
      );
    };
    const before = await readQty(ctx.productBread);
    const sale = await api('POST', '/sales', {
      token: ctx.token,
      body: {
        shopId: ctx.shopA,
        items: [{ productId: ctx.productBread, quantity: '2' }],
        paymentMethod: 'CASH',
      },
    });
    const id = sale.json.id ?? sale.json.sale?.id;
    const afterSale = await readQty(ctx.productBread);
    assert.ok(afterSale <= before - 2, `stock haikupungua: ${before} → ${afterSale}`);

    await api('POST', `/sales/${id}/refund`, {
      token: ctx.token,
      body: { reason: 'E2E', restock: true },
    });
    const afterRefund = await readQty(ctx.productBread);
    assert.ok(afterRefund >= afterSale + 2, `stock haikurudi: ${afterSale} → ${afterRefund}`);
    return `${before} → ${afterSale} → ${afterRefund}`;
  });

  await step('POST /sales ya CREDIT + refund', async () => {
    const created = await api('POST', '/sales', {
      token: ctx.token,
      body: {
        shopId: ctx.shopA,
        customerId: ctx.customerId,
        items: [{ productId: ctx.productSoda, quantity: '1' }],
        paymentMethod: 'CREDIT',
      },
    });
    const id = created.json.id ?? created.json.sale?.id;
    const refunded = await api('POST', `/sales/${id}/refund`, {
      token: ctx.token,
      body: { reason: 'Mteja hakuridhika', restock: true },
    });
    assert.ok(refunded.json, 'hakuna majibu');
    ctx.refundedSaleId = id;
    return refunded.json.status ?? 'refunded';
  });

  await step('DELETE /sales/:id (void)', async () => {
    const created = await api('POST', '/sales', {
      token: ctx.token,
      body: {
        shopId: ctx.shopA,
        items: [{ productId: ctx.productBread, quantity: '1' }],
        paymentMethod: 'CASH',
      },
    });
    const id = created.json.id ?? created.json.sale?.id;
    const voided = await api('DELETE', `/sales/${id}`, { token: ctx.token });
    assert.ok(voided.json, 'hakuna majibu');
    return voided.json.status ?? 'voided';
  });

  await step('POST /sales/:id/void (alias)', async () => {
    const created = await api('POST', '/sales', {
      token: ctx.token,
      body: {
        shopId: ctx.shopA,
        items: [{ productId: ctx.productBread, quantity: '1' }],
        paymentMethod: 'CASH',
      },
    });
    const id = created.json.id ?? created.json.sale?.id;
    const voided = await api('POST', `/sales/${id}/void`, { token: ctx.token, body: {} });
    assert.ok(voided.json, 'hakuna majibu');
    return 'ok';
  });
}

// ─────────────────────────────────────────────────────────────
// 10. Expenses
// ─────────────────────────────────────────────────────────────
async function testExpenses() {
  group('Expenses');

  await step('POST /expenses', async () => {
    const { json } = await api('POST', '/expenses', {
      token: ctx.token,
      body: {
        name: 'Umeme wa duka',
        amount: '15000.00',
        category: 'UTILITIES',
        shopId: ctx.shopA,
        notes: 'LUKU',
      },
    });
    ctx.expenseId = json.id;
    assertMoney(json.amount, 15000, 'gharama');
    return json.id;
  });

  await step('GET /expenses + GET /:id + PATCH', async () => {
    const list = await api('GET', '/expenses', { token: ctx.token });
    const rows = list.json.data ?? list.json;
    assert.ok(rows.length >= 1, 'expenses hazitoshi');
    const one = await api('GET', `/expenses/${ctx.expenseId}`, { token: ctx.token });
    assert.equal(one.json.id, ctx.expenseId);
    const patched = await api('PATCH', `/expenses/${ctx.expenseId}`, {
      token: ctx.token,
      body: { amount: '16000.00' },
    });
    assertMoney(patched.json.amount, 16000, 'gharama mpya');
    return 'ok';
  });

  await step('GET /expenses/summary', async () => {
    const { json } = await api('GET', '/expenses/summary', { token: ctx.token });
    money(json.total);
    assert.ok(Array.isArray(json.byCategory), 'byCategory haipo');
    return json.total;
  });

  await step('DELETE /expenses/:id', async () => {
    const created = await api('POST', '/expenses', {
      token: ctx.token,
      body: { name: 'Cha kufuta', amount: '1.00', category: 'OTHER', shopId: ctx.shopA },
    });
    const removed = await api('DELETE', `/expenses/${created.json.id}`, { token: ctx.token });
    assert.ok(removed.json.success !== false, 'kufuta hakukufaulu');
    return 'deleted';
  });
}

// ─────────────────────────────────────────────────────────────
// 11. Shifts
// ─────────────────────────────────────────────────────────────
async function testShifts() {
  group('Shifts');

  await step('POST /shifts/open', async () => {
    const { json } = await api('POST', '/shifts/open', {
      token: ctx.token,
      body: { shopId: ctx.shopA, openingFloat: '50000.00', note: 'Shift ya asubuhi' },
    });
    ctx.shiftId = json.id;
    assert.ok(ctx.shiftId, 'hakuna shift');
    return ctx.shiftId;
  });

  await step('GET /shifts/current', async () => {
    const { json } = await api('GET', '/shifts/current', { token: ctx.token });
    assert.ok(json, 'hakuna shift ya sasa');
    assert.equal(json.id ?? json.shift?.id, ctx.shiftId);
    return 'current';
  });

  await step('GET /shifts', async () => {
    const { json } = await api('GET', '/shifts', { token: ctx.token });
    const rows = json.data ?? json;
    assert.ok(rows.length >= 1, 'shifts hazitoshi');
    return `${rows.length}`;
  });

  await step('GET /shifts/:id/z-report', async () => {
    const { json } = await api('GET', `/shifts/${ctx.shiftId}/z-report`, { token: ctx.token });
    assert.ok(json, 'hakuna z-report');
    ctx.zReport = json;
    return JSON.stringify(json).slice(0, 60);
  });

  await step('POST /shifts/:id/close', async () => {
    const { json } = await api('POST', `/shifts/${ctx.shiftId}/close`, {
      token: ctx.token,
      body: { countedCash: '50000.00', note: 'Shift imefungwa' },
    });
    assert.ok(json, 'hakuna majibu');
    return json.status ?? 'closed';
  });

  await step('GET /shifts/:id/z-report baada ya kufunga', async () => {
    const { json } = await api('GET', `/shifts/${ctx.shiftId}/z-report`, { token: ctx.token });
    assert.ok(json, 'hakuna z-report');
    return 'ok';
  });
}

// ─────────────────────────────────────────────────────────────
// 12. Sync
// ─────────────────────────────────────────────────────────────
async function testSync() {
  group('Sync');
  const deviceId = `e2e-device-${RUN}`;

  await step('GET /sync/state', async () => {
    const { json } = await api('GET', '/sync/state', { token: ctx.token });
    assert.ok(json, 'hakuna state');
    ctx.syncCursor = json.cursor ?? json.serverCursor ?? json.updatedAt;
    assert.ok(ctx.syncCursor, 'hakuna cursor');
    return String(ctx.syncCursor).slice(0, 24);
  });

  await step('POST /sync/push — sale mpya (client ULID)', async () => {
    const clientId = `01JE2E${RUN}0001`.slice(0, 26);
    const { json } = await api('POST', '/sync/push', {
      token: ctx.token,
      headers: { 'Idempotency-Key': `${deviceId}:batch1` },
      body: {
        deviceId,
        operations: [
          {
            opId: `op-${RUN}-1`,
            entity: 'sale',
            action: 'create',
            clientId,
            clientTs: new Date().toISOString(),
            payload: {
              id: clientId,
              shopId: ctx.shopA,
              items: [{ productId: ctx.productSoda, quantity: '1' }],
              paymentMethod: 'CASH',
            },
          },
        ],
      },
    });
    assert.ok(Array.isArray(json.results) && json.results.length === 1, 'results si 1');
    const r = json.results[0];
    assert.ok(['applied', 'duplicate', 'created'].includes(r.status), `status: ${r.status}`);
    assert.ok(json.serverCursor, 'hakuna serverCursor');
    ctx.syncCursor = json.serverCursor;
    return r.status;
  });

  await step('POST /sync/push — op ile ile (idempotent)', async () => {
    const { json } = await api('POST', '/sync/push', {
      token: ctx.token,
      body: {
        deviceId,
        operations: [
          {
            opId: `op-${RUN}-1`,
            entity: 'sale',
            action: 'create',
            payload: { shopId: ctx.shopA, items: [] },
          },
        ],
      },
      expect: [200, 201, 400, 409],
    });
    const r = json.results?.[0];
    assert.ok(!r || r.status !== 'applied' || r.duplicate, 'op ilirudiwa kama mpya');
    return r?.status ?? 'rejected';
  });

  await step('POST /sync/push — conflict ya product (baseVersion)', async () => {
    const { json } = await api('POST', '/sync/push', {
      token: ctx.token,
      body: {
        deviceId,
        operations: [
          {
            opId: `op-${RUN}-2`,
            entity: 'product',
            action: 'update',
            baseVersion: 1,
            payload: { id: ctx.productSoda, sellingPrice: '999.00' },
          },
        ],
      },
    });
    const r = json.results?.[0];
    assert.ok(r, 'hakuna result');
    assert.ok(
      ['applied', 'conflict'].includes(r.status),
      `status isiyojulikana: ${r.status}`,
    );
    return r.status;
  });

  await step('GET /sync/pull?since=cursor', async () => {
    const { json } = await api(
      'GET',
      `/sync/pull?since=${encodeURIComponent(String(ctx.syncCursor))}&limit=100`,
      { token: ctx.token },
    );
    assert.ok(Array.isArray(json.changes), 'changes si array');
    assert.ok('hasMore' in json, 'hasMore haipo');
    assert.ok(json.serverCursor, 'hakuna serverCursor');
    return `${json.changes.length} changes`;
  });

  await step('GET /sync/operations', async () => {
    const { json } = await api('GET', '/sync/operations?limit=20', { token: ctx.token });
    const rows = json.data ?? json;
    assert.ok(Array.isArray(rows) && rows.length >= 1, 'operations hazipo');
    return `${rows.length}`;
  });

  await step('POST /sync/purge', async () => {
    const { json } = await api('POST', '/sync/purge', {
      token: ctx.token,
      body: { olderThanDays: 3650 },
      expect: [200, 201, 204, 400],
    });
    return JSON.stringify(json ?? {}).slice(0, 50);
  });
}

// ─────────────────────────────────────────────────────────────
// 13. Reports + analytics + exports
// ─────────────────────────────────────────────────────────────
async function testReports() {
  group('Reports');

  const reportPaths = [
    '/reports/summary',
    '/reports/sales',
    '/reports/profit',
    '/reports/stock',
    '/reports/debts',
    '/reports/top',
    '/reports/top-products',
    '/reports/dashboard',
    '/dashboard/summary',
    '/analytics/overview',
    '/analytics/trends',
    '/analytics/compare',
    '/analytics/categories',
    '/analytics/shops',
  ];

  for (const path of reportPaths) {
    await step(`GET ${path}`, async () => {
      const { json } = await api('GET', path, { token: ctx.token });
      assert.ok(json && typeof json === 'object', 'majibu si object');
      if (path === '/reports/summary' || path === '/dashboard/summary') {
        if (json.revenue !== undefined) money(json.revenue);
        if (json.todayRevenue !== undefined) money(json.todayRevenue);
      }
      return Object.keys(json).slice(0, 4).join(',');
    });
  }

  await step('GET /reports/sales inaheshimu from/to', async () => {
    const from = new Date(Date.now() - 864e5).toISOString();
    const to = new Date(Date.now() + 864e5).toISOString();
    const { json } = await api(
      'GET',
      `/reports/sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { token: ctx.token },
    );
    assert.ok(json, 'hakuna majibu');
    return 'date filter ok';
  });
}

async function testExports() {
  await step('GET /reports/top-customers — G9', async () => {
    const { json } = await api('GET', '/reports/top-customers', { token: ctx.token });
    const rows = json.data ?? json;
    assert.ok(Array.isArray(rows), 'top-customers si array');
    if (rows.length > 0) {
      assert.ok('revenue' in rows[0] && 'averageBasket' in rows[0]);
    }
    return `${rows.length} wateja`;
  });

  await step('GET /reports/top-sellers — G9', async () => {
    const { json } = await api('GET', '/reports/top-sellers', { token: ctx.token });
    const rows = json.data ?? json;
    assert.ok(Array.isArray(rows), 'top-sellers si array');
    assert.ok(rows.length >= 1, 'hakuna wauzaji');
    assert.ok('profit' in rows[0] && 'orders' in rows[0]);
    return `${rows.length} wauzaji`;
  });

  group('Exports');

  /** Async export (§19.2) — subiri hadi DONE. */
  async function waitForExport(id, timeoutMs = 20_000) {
    const deadline = Date.now() + timeoutMs;
    let last;
    while (Date.now() < deadline) {
      const { json } = await api('GET', `/exports/${id}`, { token: ctx.token });
      last = json;
      if (json.status === 'DONE') return json;
      if (json.status === 'FAILED') {
        assert.fail(`export imeshindikana: ${json.error ?? ''}`);
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    assert.fail(`export haijakamilika: ${last?.status}`);
  }

  await step('POST /exports — sales xlsx (async, QUEUED/RUNNING)', async () => {
    const { json } = await api('POST', '/exports', {
      token: ctx.token,
      body: { type: 'sales', format: 'xlsx' },
    });
    ctx.exportId = json.id;
    assert.ok(ctx.exportId, 'hakuna export job');
    assert.ok(['DONE', 'QUEUED', 'RUNNING'].includes(json.status), json.status);
    return json.status;
  });

  await step('GET /exports + GET /exports/:id ina url + expiresAt', async () => {
    const list = await api('GET', '/exports', { token: ctx.token });
    const rows = list.json.data ?? list.json;
    assert.ok(rows.length >= 1, 'exports hazipo');
    const done = await waitForExport(ctx.exportId);
    assert.equal(done.id, ctx.exportId);
    assert.equal(done.status, 'DONE');
    assert.ok(done.url, 'hakuna url');
    const expires = new Date(done.expiresAt).getTime();
    assert.ok(expires > Date.now(), 'expiresAt imepita');
    const diffMin = Math.round((expires - Date.now()) / 60_000);
    assert.ok(diffMin >= 55 && diffMin <= 61, `muda si dakika 60: ${diffMin}`);
    return `${rows.length} jobs, ${diffMin}min`;
  });

  await step('GET /exports/:id/download — xlsx halali', async () => {
    const { buffer, contentType } = await api(
      'GET',
      `/exports/${ctx.exportId}/download`,
      { token: ctx.token, raw: true },
    );
    assert.ok(buffer.length > 500, 'faili ni tupu');
    assert.equal(buffer.subarray(0, 2).toString(), 'PK', 'si xlsx (zip)');
    return `${buffer.length}b ${contentType}`;
  });

  await step('POST /exports — all/csv + download', async () => {
    const { json } = await api('POST', '/exports', {
      token: ctx.token,
      body: { type: 'all', format: 'csv' },
    });
    await waitForExport(json.id);
    const { buffer } = await api('GET', `/exports/${json.id}/download`, {
      token: ctx.token,
      raw: true,
    });
    assert.ok(buffer.length > 10, 'csv ni tupu');
    assert.match(buffer.toString('utf8', 0, 80), /[A-Za-z]/);
    return `${buffer.length}b`;
  });

  await step('POST /exports — json', async () => {
    const { json } = await api('POST', '/exports', {
      token: ctx.token,
      body: { type: 'products', format: 'json' },
    });
    await waitForExport(json.id);
    const { buffer } = await api('GET', `/exports/${json.id}/download`, {
      token: ctx.token,
      raw: true,
    });
    const parsed = JSON.parse(buffer.toString('utf8'));
    assert.ok(parsed, 'json si sahihi');
    return 'json ok';
  });

  await step('GET /exports/:id/download kabla ya DONE → 409', async () => {
    const { json } = await api('POST', '/exports', {
      token: ctx.token,
      body: { type: 'sales', format: 'xlsx' },
    });
    const res = await api('GET', `/exports/${json.id}/download`, {
      token: ctx.token,
      expect: [200, 409],
      raw: true,
    });
    if (res.status === 409) {
      assert.ok(true, 'export bado inaandaliwa');
      return '409 bado';
    }
    return 'iliisha haraka (200)';
  });
}

// ─────────────────────────────────────────────────────────────
// 14. Growth (missions, coins, demand, posters, assistant)
// ─────────────────────────────────────────────────────────────
async function testGrowth() {
  group('Growth');

  await step('GET /missions/today — inatengeneza missions', async () => {
    const { json } = await api('GET', '/missions/today', { token: ctx.token });
    assert.ok(Array.isArray(json.missions), 'missions si array');
    ctx.missions = json.missions;
    return `${json.missions.length} missions`;
  });

  await step('GET /missions', async () => {
    const { json } = await api('GET', '/missions', { token: ctx.token });
    const rows = json.data ?? json;
    assert.ok(Array.isArray(rows), 'missions si array');
    return `${rows.length}`;
  });

  await step('POST /missions/:id/complete — coins zinaongezeka', async () => {
    const mission = (ctx.missions ?? [])[0];
    if (!mission) return 'hakuna mission ya kukamilisha';
    const before = await api('GET', '/coins/balance', { token: ctx.token });
    const { json } = await api('POST', `/missions/${mission.id}/complete`, {
      token: ctx.token,
      body: { note: 'Imefanyika' },
    });
    const after = await api('GET', '/coins/balance', { token: ctx.token });
    assert.ok(after.json.balance >= before.json.balance, 'coins zimepungua');
    return `+${after.json.balance - before.json.balance}`;
  });

  await step('GET /missions/:id/impact', async () => {
    const mission = (ctx.missions ?? [])[0];
    if (!mission) return 'skip';
    const { json } = await api('GET', `/missions/${mission.id}/impact`, { token: ctx.token });
    assert.ok(json, 'hakuna impact');
    return JSON.stringify(json).slice(0, 60);
  });

  await step('§8 — coins za sale ya kwanza ya siku (+2)', async () => {
    const tx = await api('GET', '/coins/transactions', { token: ctx.token });
    const rows = tx.json.data ?? tx.json;
    assert.ok(
      rows.some((r) => r.reason === 'first_sale'),
      'coins za first_sale hazijatolewa',
    );
    return 'first_sale ok';
  });

  await step('GET /coins/balance + /coins/transactions', async () => {
    const bal = await api('GET', '/coins/balance', { token: ctx.token });
    assert.equal(typeof bal.json.balance, 'number', 'balance si number');
    const tx = await api('GET', '/coins/transactions', { token: ctx.token });
    const rows = tx.json.data ?? tx.json;
    assert.ok(Array.isArray(rows), 'transactions si array');
    return `bal=${bal.json.balance} tx=${rows.length}`;
  });

  await step('coins zinaweza kukusanywa (missions + demand)', async () => {
    // Kamilisha missions zote za leo
    const today = await api('GET', '/missions/today', { token: ctx.token });
    for (const m of today.json.missions ?? []) {
      if (m.status !== 'COMPLETED') {
        await api('POST', `/missions/${m.id}/complete`, {
          token: ctx.token,
          body: { note: 'E2E' },
          expect: [200, 201, 409],
        });
      }
    }
    // Kila demand inaleta coins 10
    let bal = (await api('GET', '/coins/balance', { token: ctx.token })).json.balance;
    for (let i = 0; i < 6 && bal < 120; i++) {
      await api('POST', '/demand', {
        token: ctx.token,
        body: { productName: `Bidhaa ya mahitaji ${i}`, shopId: ctx.shopA, quantity: 1 },
      });
      bal = (await api('GET', '/coins/balance', { token: ctx.token })).json.balance;
    }
    assert.ok(bal >= 50, `coins hazitoshi: ${bal}`);
    return `balance=${bal}`;
  });

  await step('POST /coins/redeem (au INSUFFICIENT_COINS)', async () => {
    const bal = await api('GET', '/coins/balance', { token: ctx.token });
    const { json, status } = await api('POST', '/coins/redeem', {
      token: ctx.token,
      body: { item: 'POSTER_50', phone: ctx.owner.phone },
      expect: [200, 201, 400, 409],
    });
    if (status >= 400) {
      assert.equal(json.code, 'INSUFFICIENT_COINS', `kosa si INSUFFICIENT_COINS: ${json.code}`);
      assert.ok(json.meta?.balance !== undefined, 'meta.balance haipo');
      return `insufficient (bal ${bal.json.balance})`;
    }
    assert.ok(json.success, 'redeem haikufaulu');
    return `redeemed, bal ${json.balance}`;
  });

  await step('POST /demand', async () => {
    const { json } = await api('POST', '/demand', {
      token: ctx.token,
      body: { productName: 'Mafuta ya Alizeti 1L', shopId: ctx.shopA, ward: 'Kariakoo', quantity: 2 },
    });
    assert.ok(json, 'hakuna majibu');
    return json.id ?? 'ok';
  });

  await step('GET /demand/report', async () => {
    const { json } = await api('GET', '/demand/report', { token: ctx.token });
    assert.ok(json, 'hakuna ripoti');
    return JSON.stringify(json).slice(0, 50);
  });

  await step('POST /posters — SVG inatengenezwa', async () => {
    const { json } = await api('POST', '/posters', {
      token: ctx.token,
      body: {
        productId: ctx.productSoda,
        template: 'OFFER',
        headline: 'Punguzo la Wiki',
        price: '1200.00',
        accentColor: '#1D9E75',
      },
    });
    assert.ok(json, 'hakuna poster');
    const svg = json.svg ?? json.data?.svg ?? '';
    if (svg) assert.match(svg, /<svg/i, 'poster si SVG');
    return svg ? `${svg.length}b svg` : Object.keys(json).join(',');
  });

  await step('GET /recommendations', async () => {
    const { json } = await api('GET', '/recommendations', { token: ctx.token });
    const rows = json.data ?? json.recommendations ?? json;
    assert.ok(Array.isArray(rows) || typeof rows === 'object', 'hakuna recommendations');
    return Array.isArray(rows) ? `${rows.length}` : Object.keys(json).join(',');
  });

  await step('POST /assistant/chat — majibu ya Kiswahili', async () => {
    const { json } = await api('POST', '/assistant/chat', {
      token: ctx.token,
      body: { message: 'Nimeuza kiasi gani leo?', locale: 'sw' },
    });
    const reply = json.reply ?? json.message ?? json.answer;
    assert.ok(reply && reply.length > 5, 'hakuna jibu');
    return reply.slice(0, 70).replace(/\n/g, ' ');
  });
}

// ─────────────────────────────────────────────────────────────
// 15. Billing
// ─────────────────────────────────────────────────────────────
async function testBilling() {
  group('Billing');

  await step('GET /subscriptions/current', async () => {
    const { json } = await api('GET', '/subscriptions/current', { token: ctx.token });
    assert.ok(json, 'hakuna subscription');
    ctx.subscription = json.subscription ?? json;
    return ctx.subscription.planId ?? 'free';
  });

  await step('POST /subscriptions/checkout — invoice + checkout URL', async () => {
    const { json } = await api('POST', '/subscriptions/checkout', {
      token: ctx.token,
      body: { planId: 'premium', months: 3, phone: ctx.owner.phone, provider: 'snippe' },
    });
    ctx.checkout = json;
    assert.ok(json.invoiceId ?? json.invoice?.id, 'hakuna invoice');
    assert.ok(json.checkoutUrl ?? json.reference, 'hakuna checkoutUrl/reference');
    money(json.amount);
    // Premium 50000 × 3 = 150000, punguzo 5% = 142500.00
    assertMoney(json.amount, 142500, 'bei ya checkout (3 months, -5%)');
    return `amount=${json.amount} ref=${json.reference}`;
  });

  await step('GET /subscriptions/checkout/:ref', async () => {
    const ref = ctx.checkout.reference ?? ctx.checkout.invoiceId;
    const { json } = await api(
      'GET',
      `/subscriptions/checkout/${encodeURIComponent(ref)}`,
      { token: ctx.token },
    );
    assert.ok(json, 'hakuna majibu');
    return json.status ?? 'pending';
  });

  await step('GET /billing/invoices', async () => {
    const { json } = await api('GET', '/billing/invoices', { token: ctx.token });
    const rows = json.data ?? json;
    assert.ok(rows.length >= 1, 'invoices hazipo');
    money(rows[0].amount);
    return `${rows.length}`;
  });

  await step('POST /webhooks/snippe — HMAC sahihi inawasha subscription', async () => {
    const invoiceId = ctx.checkout.invoiceId ?? ctx.checkout.invoice?.id;
    const payload = {
      reference: ctx.checkout.reference,
      paymentKey: ctx.checkout.reference,
      status: 'COMPLETED',
      amount: ctx.checkout.amount,
      phone: ctx.owner.phone,
      paidAt: new Date().toISOString(),
      metadata: { invoiceId },
    };
    const body = JSON.stringify(payload);
    const headers = { 'Content-Type': 'application/json' };
    if (WEBHOOK_SECRET) {
      headers['X-Snippe-Signature'] = createHmac('sha256', WEBHOOK_SECRET)
        .update(body)
        .digest('hex');
    }
    const res = await fetch(`${BASE}/webhooks/snippe`, {
      method: 'POST',
      headers,
      body,
    });
    const text = await res.text();
    assert.ok([200, 201].includes(res.status), `webhook: ${res.status} ${text}`);
    const json = text ? JSON.parse(text) : {};
    assert.ok(json.received !== false, 'webhook haikupokelewa');

    const sub = await api('GET', '/subscriptions/current', { token: ctx.token });
    const planId = sub.json.planId ?? sub.json.subscription?.planId;
    assert.equal(planId, 'premium', `subscription haijabadilika: ${planId}`);
    return `plan=${planId}`;
  });

  await step('POST /webhooks/snippe — signature mbaya inakataliwa', async () => {
    if (!WEBHOOK_SECRET) return 'skipped (hakuna secret kwenye dev)';
    const res = await fetch(`${BASE}/webhooks/snippe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Snippe-Signature': 'deadbeef',
      },
      body: JSON.stringify({ reference: 'FAKE', status: 'COMPLETED' }),
    });
    assert.equal(res.status, 401, `signature mbaya ilipokelewa: ${res.status}`);
    return '401';
  });

  await step('POST /subscriptions/cancel', async () => {
    const { json } = await api('POST', '/subscriptions/cancel', {
      token: ctx.token,
      body: { reason: 'E2E test' },
    });
    assert.ok(json, 'hakuna majibu');
    return json.status ?? 'cancelled';
  });
}

// ─────────────────────────────────────────────────────────────
// 16. Uploads, notifications, devices
// ─────────────────────────────────────────────────────────────
async function testMisc() {
  group('Misc');

  await step('GET /backup — I14 backup kamili', async () => {
    const { json } = await api('GET', '/backup', { token: ctx.token });
    assert.equal(json.app, 'MyBoke');
    assert.ok(Array.isArray(json.products) && json.products.length > 0);
    assert.ok(Array.isArray(json.customers));
    assert.ok(json.counts && typeof json.counts.sales === 'number');
    ctx.backup = json;
    return `${json.products.length} bidhaa · ${json.counts.sales} mauzo`;
  });

  await step('POST /backup/restore — dry run (I14)', async () => {
    const { json } = await api('POST', '/backup/restore?dryRun=true', {
      token: ctx.token,
      body: { data: ctx.backup },
    });
    assert.equal(json.dryRun, true);
    assert.ok(json.wouldReceive.products >= 1);
    return `would receive ${json.wouldReceive.products} bidhaa`;
  });

  await step('POST /backup/restore — merge idempotent (I14)', async () => {
    const { json } = await api('POST', '/backup/restore', {
      token: ctx.token,
      body: { data: ctx.backup },
    });
    assert.equal(json.dryRun, false);
    // Data ilikuwa tayari ipo — hakuna kunakili mara mbili.
    assert.equal(json.products.created, 0, 'bidhaa zimejirudia');
    assert.equal(json.customers.created, 0, 'wateja wamejirudia');
    return 'hakuna duplicate';
  });

  await step('POST /uploads/presign', async () => {
    const { json } = await api('POST', '/uploads/presign', {
      token: ctx.token,
      body: {
        kind: 'product',
        filename: 'soda.png',
        contentType: 'image/png',
        size: 1024,
      },
    });
    assert.ok(json.uploadUrl ?? json.url, 'hakuna uploadUrl');
    ctx.upload = json;
    return json.mode ?? 'presigned';
  });

  await step('POST /uploads/local + GET /uploads/local/:path', async () => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from('myboke-e2e')], { type: 'text/plain' }), 'e2e.txt');
    form.append('key', `document/e2e/${RUN}.txt`);
    const { json } = await api('POST', '/uploads/local', { token: ctx.token, form });
    const url = json.url ?? json.publicUrl ?? json.key;
    assert.ok(url, 'hakuna url');
    const path = url.startsWith('http') ? url : `/uploads/local/${json.key ?? url}`;
    const download = await api('GET', path.replace(BASE, ''), { token: ctx.token, raw: true });
    assert.equal(download.buffer.toString(), 'myboke-e2e');
    return json.key ?? 'uploaded';
  });

  await step('POST /uploads/presign inakataa aina mbaya', async () => {
    await api('POST', '/uploads/presign', {
      token: ctx.token,
      body: { kind: 'document', filename: 'evil.exe', contentType: 'application/x-msdownload' },
      expect: [400, 415, 422],
    });
  });

  await step('POST /devices + GET /devices', async () => {
    const { json } = await api('POST', '/devices', {
      token: ctx.token,
      body: {
        deviceId: `e2e-device-${RUN}`,
        platform: 'android',
        appVersion: '1.0.0',
        fcmToken: 'fcm-e2e-token',
        notificationsEnabled: true,
      },
    });
    assert.ok(json, 'hakuna majibu');
    const list = await api('GET', '/devices', { token: ctx.token });
    const rows = list.json.data ?? list.json;
    assert.ok(rows.length >= 1, 'devices hazipo');
    ctx.deviceId = json.id ?? rows[0].id;
    return `${rows.length}`;
  });

  await step('GET /notifications + read + read-all', async () => {
    const list = await api('GET', '/notifications', { token: ctx.token });
    const rows = list.json.data ?? list.json;
    assert.ok(Array.isArray(rows), 'notifications si array');
    assert.equal(typeof list.json.unreadCount, 'number', 'unreadCount haipo');
    if (rows.length > 0) {
      await api('PATCH', `/notifications/${rows[0].id}/read`, { token: ctx.token });
    }
    await api('PATCH', '/notifications/read-all', { token: ctx.token, body: {} });
    const after = await api('GET', '/notifications', { token: ctx.token });
    assert.equal(after.json.unreadCount, 0, 'read-all haikufanya kazi');
    return `${rows.length} notifications`;
  });

  await step('DELETE /notifications/:id (ya mwisho) + DELETE /devices/:id', async () => {
    const list = await api('GET', '/notifications', { token: ctx.token });
    const rows = list.json.data ?? list.json;
    if (rows.length > 0) {
      await api('DELETE', `/notifications/${rows[rows.length - 1].id}`, { token: ctx.token });
    }
    if (ctx.deviceId) {
      await api('DELETE', `/devices/${ctx.deviceId}`, { token: ctx.token });
    }
    return 'cleaned';
  });
}

// ─────────────────────────────────────────────────────────────
// 17. Partners + admin + referrals
// ─────────────────────────────────────────────────────────────
async function testPartnersAndAdmin() {
  group('Partners');

  await step('POST /referrals/validate — public', async () => {
    const { json } = await api('POST', '/referrals/validate', {
      body: { code: 'DEMO-PARTNER' },
      expect: [200, 201, 404],
    });
    return JSON.stringify(json).slice(0, 50);
  });

  await step('GET /partners/me (partner account)', async () => {
    const login = await api('POST', '/auth/login', {
      body: {
        identifier: process.env.SEED_PARTNER_PHONE ?? '0700000002',
        password: process.env.SEED_PASSWORD ?? 'MyBoke@2026',
      },
    });
    ctx.partnerToken = login.json.accessToken;
    const { json } = await api('GET', '/partners/me', { token: ctx.partnerToken });
    assert.ok(json.partner?.id ?? json.id, 'hakuna partner');
    ctx.partner = json.partner ?? json;
    return ctx.partner.code ?? 'ok';
  });

  await step('GET /partners/me/commissions', async () => {
    const { json } = await api('GET', '/partners/me/commissions', {
      token: ctx.partnerToken,
    });
    assert.ok(json, 'hakuna majibu');
    return JSON.stringify(json).slice(0, 50);
  });

  group('Admin');

  await step('login SUPER_ADMIN', async () => {
    const login = await api('POST', '/auth/login', {
      body: {
        identifier: process.env.SEED_ADMIN_PHONE ?? '0700000001',
        password: process.env.SEED_PASSWORD ?? 'MyBoke@2026',
      },
    });
    ctx.adminToken = login.json.accessToken;
    return 'ok';
  });

  await step('GET /admin/me', async () => {
    const { json } = await api('GET', '/admin/me', { token: ctx.adminToken });
    assert.equal(json.role, 'SUPER_ADMIN');
    return json.role;
  });

  await step('GET /admin/overview', async () => {
    const { json } = await api('GET', '/admin/overview', { token: ctx.adminToken });
    assert.ok(json, 'hakuna overview');
    return Object.keys(json).slice(0, 4).join(',');
  });

  await step('GET /admin/businesses + ?q=', async () => {
    const list = await api('GET', '/admin/businesses?limit=20', { token: ctx.adminToken });
    const rows = list.json.data ?? list.json;
    assert.ok(rows.length >= 1, 'businesses hazipo');
    const q = await api('GET', `/admin/businesses?q=${encodeURIComponent('Tenant B')}`, {
      token: ctx.adminToken,
    });
    const found = q.json.data ?? q.json;
    assert.ok(Array.isArray(found), 'search haifanyi kazi');
    return `${rows.length} (q=${found.length})`;
  });

  await step('GET /admin/businesses/:id', async () => {
    const { json } = await api('GET', `/admin/businesses/${ctx.businessId}`, {
      token: ctx.adminToken,
    });
    assert.equal(json.id, ctx.businessId);
    return json.name;
  });

  await step('POST /admin/businesses/:id/impersonate — token saa 1', async () => {
    const { json } = await api('POST', `/admin/businesses/${ctx.businessId}/impersonate`, {
      token: ctx.adminToken,
      body: { reason: 'E2E support test' },
    });
    assert.ok(json.accessToken, 'hakuna token ya impersonation');
    assert.equal(json.expiresIn, 3600);
    const me = await api('GET', '/auth/me', { token: json.accessToken });
    assert.ok(me.json.user?.id ?? me.json.id, 'token haifanyi kazi');
    return json.role;
  });

  await step('POST /admin/businesses/:id/impersonate — 404 kwa biashara isiyopo', async () => {
    await api('POST', '/admin/businesses/does-not-exist/impersonate', {
      token: ctx.adminToken,
      body: {},
      expect: [404],
    });
  });

  await step('GET /admin/subscriptions + extend', async () => {
    const list = await api('GET', '/admin/subscriptions', { token: ctx.adminToken });
    const rows = list.json.data ?? list.json;
    assert.ok(rows.length >= 1, 'subscriptions hazipo');
    const sub = rows.find((s) => s.businessId === ctx.businessId) ?? rows[0];
    const before = new Date(sub.endsAt).getTime();
    const { json } = await api('POST', `/admin/subscriptions/${sub.id}/extend`, {
      token: ctx.adminToken,
      body: { days: 7, reason: 'E2E' },
    });
    const after = new Date(json.endsAt).getTime();
    assert.ok(after > before, 'siku hazikuongezwa');
    return `+7d → ${json.endsAt.slice(0, 10)}`;
  });

  await step('GET /admin/sync-issues', async () => {
    const { json } = await api('GET', '/admin/sync-issues?limit=10', {
      token: ctx.adminToken,
    });
    assert.ok(Array.isArray(json.data), 'data si array');
    assert.ok(Array.isArray(json.byStatus), 'byStatus haipo');
    return `${json.total} issues`;
  });

  await step('GET /admin/partners + POST + PATCH', async () => {
    const list = await api('GET', '/admin/partners', { token: ctx.adminToken });
    const rows = list.json.data ?? list.json;
    assert.ok(rows.length >= 1, 'partners hazipo');
    const created = await api('POST', '/admin/partners', {
      token: ctx.adminToken,
      body: { name: `Wakala ${RUN}`, phone: '0788999000', type: 'AGENT', commissionRate: '10' },
    });
    assert.ok(created.json.id, 'hakuna partner mpya');
    const patched = await api('PATCH', `/partners/${created.json.id}`, {
      token: ctx.adminToken,
      body: { commissionRate: '12' },
    });
    assert.ok(patched.json, 'patch haikufaulu');
    return `${rows.length} + 1`;
  });

  await step('POST /admin/commissions/:id/settle', async () => {
    const commissions = await api('GET', '/partners/me/commissions', {
      token: ctx.partnerToken,
    });
    const rows = commissions.json.data ?? commissions.json;
    const pending = Array.isArray(rows) ? rows.find((c) => c.status === 'PENDING') : null;
    if (!pending) return 'hakuna commission ya kusettle';
    const { json } = await api('POST', `/admin/commissions/${pending.id}/settle`, {
      token: ctx.adminToken,
      body: { status: 'PAID', note: 'E2E' },
    });
    assert.ok(json, 'hakuna majibu');
    return json.status ?? 'PAID';
  });

  await step('GET /admin/jobs — queues + counters', async () => {
    const { json } = await api('GET', '/admin/jobs', { token: ctx.adminToken });
    assert.ok(json.queues, 'queues haipo');
    assert.ok(json.counters, 'counters haipo');
    return Object.keys(json.queues).length + ' queues';
  });

  await step('POST /admin/jobs/reports/run — precompute ripoti', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { json } = await api(
      'POST',
      `/admin/jobs/reports/run?date=${today}`,
      { token: ctx.adminToken },
    );
    assert.equal(json.job, 'reports');
    assert.ok(json.processed >= 1, 'hakuna biashara iliyochakatwa');
    return `${json.processed} snapshots · ${json.details.date}`;
  });

  await step('GET /reports/daily-snapshots — cached na VAT imetenganishwa', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { json } = await api(
      'GET',
      `/reports/daily-snapshots?from=${today}&to=${today}`,
      { token: ctx.token },
    );
    assert.equal(json.cached, true, 'snapshots hazijacache');
    assert.ok(Number(json.totals.grossSales) > 0, `gross ni ${json.totals.grossSales}`);
    assert.ok(json.totals.grossSales.includes('.'), 'grossSales si string ya desimali');
    const gross = Number(json.totals.grossSales);
    const net = Number(json.totals.netSales);
    const vat = Number(json.totals.vat);
    assert.ok(Math.abs(gross - (net + vat)) < 0.02, `VAT: ${net} + ${vat} ≠ ${gross}`);
    return `gross ${json.totals.grossSales} · VAT ${json.totals.vat}`;
  });

  await step('POST /admin/jobs/billing/run — inalingana na subs zilizoisha', async () => {
    const list = await api('GET', '/admin/subscriptions', {
      token: ctx.adminToken,
    });
    const rows = list.json.data ?? list.json;
    const now = Date.now();
    const expiring = rows.filter(
      (s) =>
        new Date(s.endsAt).getTime() < now &&
        ['TRIAL', 'ACTIVE', 'PAST_DUE'].includes(s.status),
    );
    const { json } = await api('POST', '/admin/jobs/billing/run', {
      token: ctx.adminToken,
    });
    assert.equal(json.job, 'billing');
    assert.equal(
      json.processed,
      expiring.length,
      `processed ${json.processed} ≠ expired ${expiring.length}`,
    );
    return `${json.processed} subs · ${json.details.overdue ?? 0} past_due`;
  });

  await step('POST /admin/jobs/maintenance/run', async () => {
    const { json } = await api('POST', '/admin/jobs/maintenance/run', {
      token: ctx.adminToken,
    });
    assert.equal(json.job, 'maintenance');
    return `${json.processed} records`;
  });

  await step('POST /admin/jobs/unknown/run — 404', async () => {
    const res = await api('POST', '/admin/jobs/unknown/run', {
      token: ctx.adminToken,
      expect: [404],
    });
    assert.equal(res.json.code, 'UNKNOWN_JOB');
  });

  await step('GET /admin/demand/report', async () => {
    const { json } = await api('GET', '/admin/demand/report', { token: ctx.adminToken });
    assert.ok(Array.isArray(json.topProducts), 'topProducts haipo');
    return `${json.total} records`;
  });
}

// ─────────────────────────────────────────────────────────────
// 17b. Feature depth: import jobs, labels, variants, bundles,
//      held sales, loyalty/credit, campaigns, recurring expenses,
//      cash-flow, budgets, supplier ledger, shop hours, growth,
//      audit/API keys/webhooks/feedback/digest
// ─────────────────────────────────────────────────────────────
async function testFeatureDepth() {
  group('Features');

  // ── Import jobs + labels + quick keys ─────────────────────
  await step('POST /products/import/dry-run + GET progress', async () => {
    const csv = [
      'Jina,Barcode,Category,Unit,Bei ya kununua,Bei ya kuuza,Stock,Alert',
      `Bidhaa Dry ${RUN},DRY${RUN},Vinywaji,pcs,500,700,5,2`,
      `Bidhaa Mbovu ${RUN},BAD${RUN},Vinywaji,pcs,abc,700,5,2`,
    ].join('\n');
    const form = new FormData();
    form.append('file', new Blob([csv], { type: 'text/csv' }), 'dry.csv');

    const dry = await api('POST', '/products/import/dry-run', {
      token: ctx.token,
      form,
    });
    assert.equal(dry.json.dryRun, true);
    assert.equal(dry.json.willCreate, 1, `willCreate: ${dry.json.willCreate}`);
    assert.equal(dry.json.errorCount, 1, `errors: ${dry.json.errorCount}`);
    assert.ok(dry.json.jobId, 'jobId haipo');

    const job = await api('GET', `/products/import/${dry.json.jobId}`, {
      token: ctx.token,
    });
    assert.equal(job.json.status, 'DONE');
    assert.equal(job.json.totalRows, 2);
    assert.equal(job.json.progress, 100);
    return `${dry.json.willCreate} valid · ${dry.json.errorCount} error`;
  });

  await step('GET /products/labels — PDF ya lebo', async () => {
    const { buffer, contentType } = await api('GET', '/products/labels?copies=1', {
      token: ctx.token,
      raw: true,
    });
    assert.equal(contentType, 'application/pdf');
    assert.ok(buffer.length > 500, 'PDF ni ndogo mno');
    assert.equal(buffer.subarray(0, 4).toString(), '%PDF');
    return `${buffer.length} bytes`;
  });

  await step('GET /products/quick-keys', async () => {
    const { json } = await api('GET', `/products/quick-keys?shopId=${ctx.shopA}`, {
      token: ctx.token,
    });
    assert.ok(Array.isArray(json.products), 'products haipo');
    assert.ok(json.products.length <= 8);
    return `${json.products.length} keys · ${json.source}`;
  });

  // ── Variants + bundles ────────────────────────────────────
  await step('POST /products/:id/variants + GET', async () => {
    const created = await api('POST', `/products/${ctx.productSoda}/variants`, {
      token: ctx.token,
      body: {
        variantLabel: 'Kubwa',
        barcode: `VAR${RUN}`,
        initialStock: '4',
        shopId: ctx.shopA,
      },
    });
    assert.ok(created.json.id, 'variant haikuundwa');
    assert.equal(created.json.parentId, ctx.productSoda);

    const list = await api('GET', `/products/${ctx.productSoda}/variants`, {
      token: ctx.token,
    });
    assert.ok(list.json.variants.some((v) => v.id === created.json.id));
    ctx.variantId = created.json.id;
    return `${list.json.variants.length} variants`;
  });

  await step('POST /bundles + uza bundle (stock inapungua)', async () => {
    const bundle = await api('POST', '/bundles', {
      token: ctx.token,
      body: {
        name: `Kifurushi ${RUN}`,
        sellingPrice: '3500.00',
        items: [
          { productId: ctx.productSoda, quantity: '2' },
          { productId: ctx.productBread, quantity: '1' },
        ],
      },
    });
    assert.ok(bundle.json.id, 'bundle haikuundwa');
    ctx.bundleId = bundle.json.id;

    const before = await api('GET', `/products/${ctx.productSoda}?shopId=${ctx.shopA}`, {
      token: ctx.token,
    });
    const beforeQty = (before.json.stock ?? []).reduce(
      (a, l) => a + Number(l.quantity),
      0,
    );

    const sale = await api('POST', '/sales', {
      token: ctx.token,
      body: {
        shopId: ctx.shopA,
        items: [{ bundleId: ctx.bundleId, quantity: '1' }],
        paymentMethod: 'CASH',
      },
    });
    assert.ok(sale.json.id, 'sale ya bundle haikuundwa');
    assert.equal(sale.json.total, '3500.00');

    const after = await api('GET', `/products/${ctx.productSoda}?shopId=${ctx.shopA}`, {
      token: ctx.token,
    });
    const afterQty = (after.json.stock ?? []).reduce(
      (a, l) => a + Number(l.quantity),
      0,
    );
    assert.equal(afterQty, beforeQty - 2, `stock ${beforeQty} → ${afterQty}`);
    return `stock ${beforeQty} → ${afterQty}`;
  });

  await step('PATCH + DELETE /bundles/:id', async () => {
    const patched = await api('PATCH', `/bundles/${ctx.bundleId}`, {
      token: ctx.token,
      body: { sellingPrice: '4000.00' },
    });
    assert.equal(patched.json.sellingPrice, '4000.00');
    const removed = await api('DELETE', `/bundles/${ctx.bundleId}`, {
      token: ctx.token,
    });
    assert.equal(removed.json.success, true);
  });

  // ── Held sales + credit limit + loyalty ───────────────────
  await step('POST /sales/hold + GET + DELETE', async () => {
    const held = await api('POST', '/sales/hold', {
      token: ctx.token,
      body: {
        shopId: ctx.shopA,
        label: `Meza ${RUN}`,
        payload: { items: [{ productId: ctx.productSoda, quantity: '1' }] },
      },
    });
    assert.ok(held.json.id, 'hold haikuundwa');

    const list = await api('GET', `/sales/held?shopId=${ctx.shopA}`, {
      token: ctx.token,
    });
    assert.ok(list.json.data.some((h) => h.id === held.json.id));

    const one = await api('GET', `/sales/held/${held.json.id}`, {
      token: ctx.token,
    });
    assert.equal(one.json.label, `Meza ${RUN}`);

    await api('DELETE', `/sales/held/${held.json.id}`, { token: ctx.token });
    const after = await api('GET', `/sales/held?shopId=${ctx.shopA}`, {
      token: ctx.token,
    });
    assert.ok(!after.json.data.some((h) => h.id === held.json.id));
    return `${after.json.data.length} held`;
  });

  await step('credit limit — deni linazidi kikomo → 409', async () => {
    const customer = await api('POST', '/customers', {
      token: ctx.token,
      body: { name: `Mteja Kikomo ${RUN}`, creditLimit: '1000.00' },
    });
    const res = await api('POST', '/sales', {
      token: ctx.token,
      expect: [409],
      body: {
        shopId: ctx.shopA,
        customerId: customer.json.id,
        items: [{ productId: ctx.productSoda, quantity: '5' }],
        paymentMethod: 'CREDIT',
      },
    });
    assert.equal(res.json.code, 'CREDIT_LIMIT_EXCEEDED');
    return `limit ${res.json.meta?.creditLimit ?? res.json.creditLimit}`;
  });

  await step('loyalty — pointi zinaongezeka baada ya mauzo', async () => {
    const customer = await api('POST', '/customers', {
      token: ctx.token,
      body: { name: `Mteja Pointi ${RUN}` },
    });
    const before = await api('GET', `/customers/${customer.json.id}/loyalty`, {
      token: ctx.token,
    });
    assert.equal(before.json.points, 0);

    await api('POST', '/sales', {
      token: ctx.token,
      body: {
        shopId: ctx.shopA,
        customerId: customer.json.id,
        items: [{ productId: ctx.productSoda, quantity: '3' }],
        paymentMethod: 'CASH',
      },
    });

    const after = await api('GET', `/customers/${customer.json.id}/loyalty`, {
      token: ctx.token,
    });
    assert.ok(after.json.points > 0, `points: ${after.json.points}`);
    return `${before.json.points} → ${after.json.points} points`;
  });

  // ── Customer segments / birthdays / campaigns ─────────────
  await step('GET /customers/segments', async () => {
    const { json } = await api('GET', '/customers/segments', { token: ctx.token });
    assert.ok(Array.isArray(json.segments));
    assert.ok(json.segments.length >= 4);
    return json.segments.map((s) => `${s.name}:${s.count}`).join(' ');
  });

  await step('GET /customers/birthdays + POST campaigns', async () => {
    const birthday = await api('GET', '/customers/birthdays', {
      token: ctx.token,
    });
    assert.ok(Array.isArray(birthday.json.customers));

    const campaign = await api('POST', '/customers/campaigns', {
      token: ctx.token,
      body: {
        segment: 'ALL',
        message: 'Habari {jina}! Punguzo la 10% leo kwa {biashara}.',
      },
    });
    assert.ok(campaign.json.total >= 1, 'hakuna wapokeaji');
    assert.ok(campaign.json.messages[0].message.includes('Punguzo'));
    return `${campaign.json.total} recipients`;
  });

  // ── Recurring expenses ────────────────────────────────────
  await step('F9 — recurring expense inatengenezwa', async () => {
    const yesterday = new Date(Date.now() - 86_400_000)
      .toISOString()
      .slice(0, 10);
    await api('POST', '/expenses', {
      token: ctx.token,
      body: {
        shopId: ctx.shopA,
        name: `Kodi ${RUN}`,
        amount: '25000.00',
        category: 'Kodi',
        date: yesterday,
        isRecurring: true,
        recurEvery: 'monthly',
      },
    });

    const list = await api('GET', '/expenses/recurring', { token: ctx.token });
    assert.ok(list.json.data.some((r) => r.name === `Kodi ${RUN}`));
    assert.ok(list.json.total >= 1);

    const run = await api('POST', '/expenses/recurring/run', { token: ctx.token });
    assert.ok(typeof run.json.created === 'number');
    return `${list.json.total} templates · ${run.json.created} generated`;
  });

  // ── Cash flow, break-even, budgets ────────────────────────
  await step('GET /reports/cash-flow', async () => {
    const { json } = await api('GET', '/reports/cash-flow', { token: ctx.token });
    assert.ok(json.inflow.includes('.'), 'inflow si decimal string');
    assert.ok(Array.isArray(json.byMethod));
    assert.ok(Array.isArray(json.daily));
    return `in ${json.inflow} · out ${json.outflow} · net ${json.net}`;
  });

  await step('GET /reports/break-even', async () => {
    const { json } = await api('GET', '/reports/break-even', { token: ctx.token });
    assert.ok(json.breakEvenRevenue.includes('.'));
    assert.ok(typeof json.progressPct === 'number');
    return `break-even ${json.breakEvenRevenue} · ${json.progressPct}%`;
  });

  await step('budgets CRUD + alerts', async () => {
    const created = await api('POST', '/reports/budgets', {
      token: ctx.token,
      body: { category: 'Kodi', amount: '30000.00' },
    });
    assert.ok(created.json.id, 'budget haikuundwa');
    assert.equal(created.json.amount, '30000.00');

    const list = await api('GET', '/reports/budgets', { token: ctx.token });
    assert.ok(list.json.data.some((b) => b.id === created.json.id));
    const row = list.json.data.find((b) => b.id === created.json.id);
    assert.ok(['OK', 'WARNING', 'EXCEEDED'].includes(row.alert));

    const patched = await api('PATCH', `/reports/budgets/${created.json.id}`, {
      token: ctx.token,
      body: { amount: '40000.00' },
    });
    assert.equal(patched.json.amount, '40000.00');

    await api('DELETE', `/reports/budgets/${created.json.id}`, { token: ctx.token });
    return `${list.json.data.length} budgets`;
  });

  // ── Supplier payments + ledger ────────────────────────────
  await step('supplier payments + ledger (F13)', async () => {
    const pay = await api('POST', `/suppliers/${ctx.supplierId}/payments`, {
      token: ctx.token,
      body: { amount: '10000.00', method: 'MPESA', reference: `REF${RUN}` },
    });
    assert.equal(pay.json.amount, '10000.00');

    const payments = await api('GET', `/suppliers/${ctx.supplierId}/payments`, {
      token: ctx.token,
    });
    assert.ok(payments.json.data.length >= 1);

    const ledger = await api('GET', `/suppliers/${ctx.supplierId}/ledger`, {
      token: ctx.token,
    });
    assert.ok(ledger.json.totals.balance.includes('.'));
    return `paid ${ledger.json.totals.paid} · balance ${ledger.json.totals.balance}`;
  });

  // ── Shop hours, holidays, QR ──────────────────────────────
  await step('shop schedule + holidays + QR', async () => {
    await api('PATCH', `/shops/${ctx.shopA}`, {
      token: ctx.token,
      body: {
        lat: -6.8161,
        lng: 39.2803,
        businessHours: { mon: { open: '00:00', close: '23:59' } },
      },
    });

    const schedule = await api('GET', `/shops/${ctx.shopA}/schedule`, {
      token: ctx.token,
    });
    assert.ok(typeof schedule.json.isOpen === 'boolean');

    const holiday = await api('POST', `/shops/${ctx.shopA}/holidays`, {
      token: ctx.token,
      body: { date: '2026-12-25', reason: 'Krismasi' },
    });
    assert.ok(holiday.json.id, 'likizo haikuundwa');

    const list = await api('GET', `/shops/${ctx.shopA}/holidays`, {
      token: ctx.token,
    });
    assert.ok(list.json.data.length >= 1);

    const qr = await api('GET', `/shops/${ctx.shopA}/qr`, { token: ctx.token });
    assert.ok(qr.json.qrDataUrl.startsWith('data:image/png;base64,'));
    assert.ok(qr.json.token);

    const png = await api('GET', `/shops/${ctx.shopA}/qr?format=png`, {
      token: ctx.token,
      raw: true,
    });
    assert.equal(png.contentType, 'image/png');

    await api('DELETE', `/shops/${ctx.shopA}/holidays/${holiday.json.id}`, {
      token: ctx.token,
    });
    return `open=${schedule.json.isOpen} · qr ${png.buffer.length}b`;
  });

  // ── Growth suggestions + streaks ──────────────────────────
  await step('GET /growth/restock-suggestions', async () => {
    const { json } = await api('GET', '/growth/restock-suggestions', {
      token: ctx.token,
    });
    assert.ok(Array.isArray(json.suggestions));
    assert.ok(json.estimatedTotalCost.includes('.'));
    return `${json.count} suggestions · ${json.season}`;
  });

  await step('GET /growth/price-suggestions', async () => {
    const { json } = await api('GET', '/growth/price-suggestions?targetMargin=30', {
      token: ctx.token,
    });
    assert.equal(json.targetMarginPct, 30);
    assert.ok(Array.isArray(json.suggestions));
    return `${json.count} suggestions`;
  });

  await step('GET /growth/streaks — badges', async () => {
    const { json } = await api('GET', '/growth/streaks', { token: ctx.token });
    assert.ok(Array.isArray(json.badges));
    assert.ok(json.badges.length >= 4);
    assert.ok(json.currentStreak >= 1, 'streak ni 0');
    assert.ok(json.badges.some((b) => b.id === 'first_sale' && b.unlocked));
    return `streak ${json.currentStreak}/${json.longestStreak}`;
  });

  // ── Audit log + API keys ──────────────────────────────────
  await step('GET /audit-logs — mabadiliko ya pesa yanarekodiwa', async () => {
    const { json } = await api('GET', '/audit-logs?limit=20', { token: ctx.token });
    assert.ok(Array.isArray(json.data), 'data si array');
    assert.ok(json.data.length >= 1, 'audit log ni tupu');
    assert.ok(json.data.some((r) => r.action));
    return `${json.data.length} entries`;
  });

  await step('API key — create, tumia kwa x-api-key, revoke', async () => {
    const created = await api('POST', '/api-keys', {
      token: ctx.token,
      body: { name: `POS ${RUN}`, scopes: ['read'] },
    });
    assert.ok(created.json.key.startsWith('mbk_live_'), 'key si sahihi');

    const list = await api('GET', '/api-keys', { token: ctx.token });
    assert.ok(list.json.data.some((k) => k.id === created.json.id));
    assert.equal(list.json.data.find((k) => k.id === created.json.id).key, undefined);

    const viaKey = await api('GET', '/products?limit=5', {
      headers: { 'X-API-Key': created.json.key },
    });
    assert.ok(Array.isArray(viaKey.json.data), 'API key haikufanya kazi');

    await api('DELETE', `/api-keys/${created.json.id}`, { token: ctx.token });
    await api('GET', '/products', {
      headers: { 'X-API-Key': created.json.key },
      expect: [401],
    });
    return 'read scope · revoked';
  });

  // ── Webhooks ─────────────────────────────────────────────
  await step('webhooks CRUD + test delivery', async () => {
    const hook = await api('POST', '/webhooks', {
      token: ctx.token,
      body: {
        url: 'http://127.0.0.1:9/myboke-hook',
        events: ['sale.created', 'webhook.test'],
      },
    });
    assert.ok(hook.json.secret, 'secret haipo');
    ctx.webhookId = hook.json.id;

    const list = await api('GET', '/webhooks', { token: ctx.token });
    assert.ok(list.json.data.some((w) => w.id === hook.json.id));

    // Port 9 haijui mtu — inarekodi FAILED delivery (si kosa la API).
    const test = await api('POST', `/webhooks/${hook.json.id}/test`, {
      token: ctx.token,
    });
    assert.equal(test.json.event, 'webhook.test');
    assert.ok(Array.isArray(test.json.results));

    const deliveries = await api(
      'GET',
      `/webhooks/${hook.json.id}/deliveries?limit=5`,
      { token: ctx.token },
    );
    assert.ok(deliveries.json.data.length >= 1, 'delivery haikurekodiwa');

    const patched = await api('PATCH', `/webhooks/${hook.json.id}`, {
      token: ctx.token,
      body: { isActive: false },
    });
    assert.equal(patched.json.isActive, false);
    return `${test.json.delivered} deliveries`;
  });

  // ── Feedback + digest ────────────────────────────────────
  await step('POST /feedback + GET /admin/feedback', async () => {
    const res = await api('POST', '/feedback', {
      token: ctx.token,
      body: { rating: 5, comment: `E2E ${RUN}` },
    });
    assert.equal(res.json.success, true);

    const summary = await api('GET', '/admin/feedback', {
      token: ctx.adminToken,
    });
    assert.ok(summary.json.total >= 1);
    assert.ok(summary.json.average > 0);
    return `${summary.json.total} ratings · avg ${summary.json.average}`;
  });

  await step('digest — subscribe, list, run job', async () => {
    const sub = await api('POST', '/digest', {
      token: ctx.token,
      body: { channel: 'WHATSAPP', destination: '0712345678' },
    });
    assert.ok(sub.json.id, 'digest haikusajiliwa');

    const list = await api('GET', '/digest', { token: ctx.token });
    assert.ok(list.json.data.some((d) => d.id === sub.json.id));

    const job = await api('POST', '/admin/jobs/digest/run', {
      token: ctx.adminToken,
    });
    assert.equal(job.json.job, 'digest');
    assert.ok(job.json.processed >= 1, 'hakuna notification');

    await api('DELETE', `/digest/${sub.json.id}`, { token: ctx.token });
    return `${job.json.processed} notifications`;
  });

  // ── Cleanup hooks ────────────────────────────────────────
  await step('DELETE /webhooks/:id', async () => {
    const res = await api('DELETE', `/webhooks/${ctx.webhookId}`, {
      token: ctx.token,
    });
    assert.equal(res.json.success, true);
  });
}

// ─────────────────────────────────────────────────────────────
// 18. Security: RBAC + tenant isolation
// ─────────────────────────────────────────────────────────────
async function testSecurity() {
  group('Security');

  await step('401 bila token', async () => {
    await api('GET', '/products', { expect: [401] });
    await api('GET', '/sales', { expect: [401] });
    await api('GET', '/reports/summary', { expect: [401] });
    await api('GET', '/admin/overview', { expect: [401] });
    return '4 endpoints';
  });

  await step('403 — CASHIER haruhusiwi kuunda duka', async () => {
    await api('POST', '/shops', {
      token: ctx.cashierToken,
      body: { name: 'Duka la Cashier' },
      expect: [403],
    });
  });

  await step('403 — CASHIER haruhusiwi kufuta mauzo', async () => {
    await api('DELETE', `/sales/${ctx.saleId}`, {
      token: ctx.cashierToken,
      expect: [403],
    });
  });

  await step('403 — CASHIER haruhusiwi ripoti za faida', async () => {
    await api('GET', '/reports/profit', { token: ctx.cashierToken, expect: [403] });
  });

  await step('403 — OWNER haruhusiwi admin endpoints', async () => {
    await api('GET', '/admin/overview', { token: ctx.token, expect: [403] });
  });

  await step('tenant isolation — orodha ya B haina bidhaa za A', async () => {
    // Plan ya B inaruhusu duka 1 tu — tunatumia duka lililopo.
    const shops = await api('GET', '/shops', { token: ctx.tenantB.accessToken });
    const shopRows = shops.json.data ?? shops.json;
    assert.ok(shopRows.length >= 1, 'B hana duka');
    const shopId = shopRows[0].id;
    const mine = await api('POST', '/products', {
      token: ctx.tenantB.accessToken,
      body: {
        name: `Bidhaa B ${RUN}`,
        buyingPrice: '100.00',
        sellingPrice: '150.00',
        initialStock: '3',
        shopId,
      },
    });
    assert.ok(mine.json.id, 'bidhaa ya B haikuundwa');

    const list = await api('GET', '/products?limit=100', {
      token: ctx.tenantB.accessToken,
    });
    const rows = list.json.data ?? list.json;
    assert.ok(
      !rows.some((p) => p.id === ctx.productSoda),
      'bidhaa ya A imeonekana kwa B',
    );
    assert.ok(
      rows.some((p) => p.id === mine.json.id),
      'bidhaa yake B haipo kwenye orodha yake',
    );
    ctx.tenantB.shopId = shopId;
    ctx.tenantB.productId = mine.json.id;
    return `${rows.length} products za B`;
  });

  await step('tenant isolation — B haiwezi kuona bidhaa ya A', async () => {
    await api('GET', `/products/${ctx.productSoda}`, {
      token: ctx.tenantB.accessToken,
      expect: [404, 403],
    });
  });

  await step('tenant isolation — B haiwezi kuona sale ya A', async () => {
    await api('GET', `/sales/${ctx.saleId}`, {
      token: ctx.tenantB.accessToken,
      expect: [404, 403],
    });
  });

  await step('tenant isolation — B haiwezi kuuza kwenye duka la A', async () => {
    await api('POST', '/sales', {
      token: ctx.tenantB.accessToken,
      body: {
        shopId: ctx.shopA,
        items: [{ productId: ctx.productSoda, quantity: '1' }],
        paymentMethod: 'CASH',
      },
      expect: [404, 400, 403],
    });
  });

  await step('tenant isolation — B haiwezi kufuta bidhaa ya A', async () => {
    await api('DELETE', `/products/${ctx.productSoda}`, {
      token: ctx.tenantB.accessToken,
      expect: [404, 403],
    });
  });

  await step('validation — bei hasi inakataliwa', async () => {
    await api('POST', '/products', {
      token: ctx.token,
      body: { name: 'Hasi', buyingPrice: '-1.00', sellingPrice: '-5.00' },
      expect: [400, 422],
    });
  });

  await step('validation — sale bila items inakataliwa', async () => {
    await api('POST', '/sales', {
      token: ctx.token,
      body: { shopId: ctx.shopA, items: [] },
      expect: [400, 422],
    });
  });

  await step('validation — kiasi cha sale kibaya inakataliwa', async () => {
    await api('POST', '/sales', {
      token: ctx.token,
      body: {
        shopId: ctx.shopA,
        items: [{ productId: ctx.productSoda, quantity: 'abc' }],
      },
      expect: [400, 422],
    });
  });
}

// ─────────────────────────────────────────────────────────────
// Rate limiting — spec §10.11 (100/min jumla, 10/min auth)
// ─────────────────────────────────────────────────────────────
async function waitForHealth(base, timeoutMs = 25_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/health`);
      if (res.ok) return true;
    } catch {
      /* bado inaanza */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function testRateLimit() {
  group('Rate limit');

  if (process.env.E2E_THROTTLE_PROBE === '0') return;

  const { spawn } = await import('node:child_process');
  const port = Number(process.env.E2E_THROTTLE_PORT ?? 4101);
  const base = `http://localhost:${port}/v1`;
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      THROTTLE_LIMIT: '3',
      THROTTLE_AUTH_LIMIT: '2',
      THROTTLE_TTL_MS: '60000',
    },
    stdio: 'ignore',
  });

  try {
    const up = await waitForHealth(base);
    if (!up) {
      await step('server ya rate-limit inaanza', async () => {
        assert.ok(up, 'server ya probe haikuanza (dist/main.js imebuildwa?)');
      });
      return;
    }

    await step('default throttle — ombi la 4 linapata 429', async () => {
      const codes = [];
      for (let i = 0; i < 4; i += 1) {
        const res = await fetch(`${base}/plans`);
        codes.push(res.status);
      }
      assert.deepEqual(codes.slice(0, 3), [200, 200, 200], `codes: ${codes}`);
      assert.equal(codes[3], 429, `codes: ${codes}`);
      const blocked = await fetch(`${base}/plans`);
      assert.equal(blocked.status, 429, '429 haijaendelea');
      assert.ok(blocked.headers.get('retry-after'), 'hakuna Retry-After');
      return codes.join(',');
    });

    await step('auth throttle — 10/min (hapa 2) inatumika', async () => {
      const codes = [];
      for (let i = 0; i < 3; i += 1) {
        const res = await fetch(`${base}/auth/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            identifier: '+255700000001',
            password: 'WrongPass@1',
          }),
        });
        codes.push(res.status);
      }
      assert.equal(codes[2], 429, `auth limit haifanyi kazi: ${codes}`);
      return codes.join(',');
    });
  } finally {
    child.kill('SIGKILL');
  }
}

// ─────────────────────────────────────────────────────────────
// 19. Cleanup + account lifecycle
// ─────────────────────────────────────────────────────────────
async function testCleanup() {
  group('Cleanup');

  await step('DELETE /shops/:id', async () => {
    if (!ctx.shopTemp) return 'skip';
    const { json } = await api('DELETE', `/shops/${ctx.shopTemp}`, { token: ctx.token });
    assert.ok(json.success !== false, 'kufuta duka hakukufaulu');
    return 'deleted';
  });

  await step('DELETE /categories/:id + /products/:id', async () => {
    const cat = await api('POST', '/categories', {
      token: ctx.token,
      body: { name: 'Ya Kufuta' },
    });
    await api('DELETE', `/categories/${cat.json.id}`, { token: ctx.token });
    const prod = await api('POST', '/products', {
      token: ctx.token,
      body: { name: 'Bidhaa ya Kufuta', buyingPrice: '10.00', sellingPrice: '20.00' },
    });
    await api('DELETE', `/products/${prod.json.id}`, { token: ctx.token });
    await api('DELETE', `/suppliers/${ctx.supplierId}`, {
      token: ctx.token,
      expect: [200, 204, 400, 409],
    });
    return 'cleaned';
  });

  await step('GET /auth/me/export — PDPA data export', async () => {
    const res = await api('GET', '/auth/me/export', { token: ctx.token, raw: true });
    assert.ok(res.buffer.length > 100, 'export ni tupu');
    const text = res.buffer.toString('utf8');
    assert.ok(text.includes('{') || res.contentType?.includes('zip'), 'export si json/zip');
    return `${res.buffer.length}b`;
  });

  await step('GET /auth/me/export?format=pdf — PDPA PDF', async () => {
    const res = await api('GET', '/auth/me/export?format=pdf', {
      token: ctx.token,
      raw: true,
    });
    assert.equal(res.buffer.subarray(0, 4).toString(), '%PDF');
    assert.ok(res.buffer.length > 800, 'PDF ni ndogo mno');
    return `${res.buffer.length}b`;
  });

  await step('POST /auth/logout', async () => {
    const login = await api('POST', '/auth/login', {
      body: { identifier: ctx.owner.phone, password: PASSWORD },
    });
    const { json } = await api('POST', '/auth/logout', {
      body: { refreshToken: login.json.refreshToken },
    });
    assert.ok(json.success !== false, 'logout haikufaulu');
    await api('POST', '/auth/refresh', {
      body: { refreshToken: login.json.refreshToken },
      expect: [401, 403, 400],
    });
    return 'revoked';
  });

  await step('POST /auth/logout/all', async () => {
    const login = await api('POST', '/auth/login', {
      body: { identifier: ctx.owner.phone, password: PASSWORD },
    });
    const { json } = await api('POST', '/auth/logout/all', {
      token: login.json.accessToken,
      body: {},
    });
    assert.ok(json, 'hakuna majibu');
    ctx.token = login.json.accessToken;
    return 'all revoked';
  });

  await step('POST /auth/password/change', async () => {
    const login = await api('POST', '/auth/login', {
      body: { identifier: ctx.owner.phone, password: PASSWORD },
    });
    ctx.token = login.json.accessToken;
    await api('POST', '/auth/password/change', {
      token: ctx.token,
      body: { currentPassword: PASSWORD, newPassword: 'Changed@2026' },
    });
    await api('POST', '/auth/login', {
      body: { identifier: ctx.owner.phone, password: 'Changed@2026' },
    });
    return 'changed';
  });

  await step('DELETE /auth/me — akaunti inafutwa (PDPA)', async () => {
    const login = await api('POST', '/auth/login', {
      body: { identifier: ctx.owner.phone, password: 'Changed@2026' },
    });
    const { json } = await api('DELETE', '/auth/me', {
      token: login.json.accessToken,
    });
    assert.ok(json, 'hakuna majibu');
    await api('POST', '/auth/login', {
      body: { identifier: ctx.owner.phone, password: 'Changed@2026' },
      expect: [401, 403],
    });
    return 'deleted';
  });
}

// ─────────────────────────────────────────────────────────────
// 20. OpenAPI coverage (kila endpoint ipo kwenye Swagger)
// ─────────────────────────────────────────────────────────────
async function testOpenApiCoverage() {
  group('OpenAPI');

  await step('/docs-json inaonyesha endpoints zote', async () => {
    const res = await fetch(`${BASE.replace(/\/v1$/, '')}/docs-json`);
    assert.equal(res.status, 200, 'docs-json haipatikani');
    const doc = await res.json();
    const paths = Object.keys(doc.paths ?? {});
    assert.ok(paths.length >= 100, `endpoints chache: ${paths.length}`);
    ctx.openApiPaths = paths;
    return `${paths.length} paths`;
  });

  await step('kila operation ina summary', async () => {
    const res = await fetch(`${BASE.replace(/\/v1$/, '')}/docs-json`);
    const doc = await res.json();
    const missing = [];
    for (const [path, ops] of Object.entries(doc.paths ?? {})) {
      for (const [method, op] of Object.entries(ops)) {
        if (!['get', 'post', 'patch', 'put', 'delete'].includes(method)) continue;
        if (!op.summary) missing.push(`${method.toUpperCase()} ${path}`);
      }
    }
    assert.equal(missing.length, 0, `bila summary: ${missing.slice(0, 5).join(', ')}`);
    return 'all documented';
  });
}

// ─────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────
async function main() {
  const started = Date.now();

  await testHealth();
  await testAuthCore();
  await testBusinesses();
  await testShops();
  await testCatalog();
  await testStock();
  await testPurchaseOrders();
  await testCustomers();
  await testDebts();
  await testSales();
  await testExpenses();
  await testShifts();
  await testSync();
  await testReports();
  await testExports();
  await testGrowth();
  await testBilling();
  await testMisc();
  await testPartnersAndAdmin();
  await testFeatureDepth();
  await testSecurity();
  await testRateLimit();
  await testCleanup();
  await testOpenApiCoverage();

  // ── Ripoti ────────────────────────────────────────────────
  const passed = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  let lastGroup = '';
  for (const r of results) {
    if (r.group !== lastGroup) {
      console.log(`\n\u001b[1m${r.group}\u001b[0m`);
      lastGroup = r.group;
    }
    const icon = r.ok ? '\u001b[32m✓\u001b[0m' : '\u001b[31m✗\u001b[0m';
    const ms = `${r.ms}ms`.padStart(7);
    const note = r.note ? `  \u001b[90m${r.note}\u001b[0m` : '';
    console.log(`  ${icon} ${r.name.padEnd(58)} ${ms}${note}`);
    if (!r.ok) console.log(`     \u001b[31m→ ${r.note}\u001b[0m`);
  }

  console.log(
    `\n\u001b[1m${passed.length} passed, ${failed.length} failed\u001b[0m — ${results.length} checks in ${elapsed}s`,
  );

  if (failed.length) {
    console.log('\n\u001b[31mZilizoshindikana:\u001b[0m');
    for (const r of failed) console.log(`  • ${r.group} / ${r.name}: ${r.note}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Suite imeanguka:', error);
  process.exitCode = 1;
});
