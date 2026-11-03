/**
 * §10.10 — Push (FCM) adapter. Kwa maendeleo inarekodi log na kurudisha
 * idadi iliyotumwa, hivyo job/notification hazianguki bila FCM key.
 */
import { PushService } from '../src/infra/push/push.service';

describe('PushService', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('haifanyi kazi ya mtandao kwenye dev (provider = console)', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.FCM_SERVER_KEY;
    delete process.env.FCM_ACCESS_TOKEN;

    const push = new PushService();
    expect(push.isDev).toBe(true);
    const result = await push.send(
      ['token-a', 'token-b', 'token-a'],
      'Stock ndogo',
      'Sukari imebaki 2',
      { productId: 'p1' },
    );
    // Token zinazorudufu zinaondolewa.
    expect(result).toEqual({ sent: 2, failed: 0, provider: 'console' });
  });

  it('haitui kitu kama hakuna token', async () => {
    process.env.NODE_ENV = 'development';
    const push = new PushService();
    const result = await push.send([], 'T', 'B');
    expect(result).toEqual({ sent: 0, failed: 0, provider: 'none' });
  });

  it('production bila key haina provider (haitupi error)', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.FCM_SERVER_KEY;
    delete process.env.FCM_ACCESS_TOKEN;

    const push = new PushService();
    expect(push.isDev).toBe(true); // haina key → dev fallback

    process.env.FCM_SERVER_KEY = 'dummy-key';
    expect(push.isDev).toBe(false);
  });
});
