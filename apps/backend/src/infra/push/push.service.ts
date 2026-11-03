import { Injectable, Logger } from '@nestjs/common';

/**
 * PushService — FCM kwa arifa za push (§10.10).
 *
 * - Kwa maendeleo (`NODE_ENV !== production` au hakuna key): inarekodi log.
 * - Uzalishaji: FCM HTTP v1 (`FCM_PROJECT_ID` + `FCM_ACCESS_TOKEN`) au
 *   legacy key (`FCM_SERVER_KEY`).
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger('PUSH');

  get isDev(): boolean {
    return (
      process.env.NODE_ENV !== 'production' ||
      (!process.env.FCM_SERVER_KEY && !process.env.FCM_ACCESS_TOKEN)
    );
  }

  async send(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<{ sent: number; failed: number; provider: string }> {
    const clean = [...new Set(tokens.filter(Boolean))];
    if (clean.length === 0) return { sent: 0, failed: 0, provider: 'none' };

    if (this.isDev) {
      this.logger.log(
        `[console] → ${clean.length} device(s): ${title} — ${body}`,
      );
      return { sent: clean.length, failed: 0, provider: 'console' };
    }

    // FCM legacy (rahisi, inafanya kazi na key ya server)
    if (process.env.FCM_SERVER_KEY) {
      try {
        const res = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `key ${process.env.FCM_SERVER_KEY}`,
          },
          body: JSON.stringify({
            registration_ids: clean,
            notification: { title, body },
            data: data ?? {},
            priority: 'high',
          }),
        });
        if (!res.ok) {
          this.logger.error(`FCM imeshindikana (${res.status})`);
          return { sent: 0, failed: clean.length, provider: 'fcm-legacy' };
        }
        return { sent: clean.length, failed: 0, provider: 'fcm-legacy' };
      } catch (error) {
        this.logger.error(`FCM error: ${(error as Error).message}`);
        return { sent: 0, failed: clean.length, provider: 'fcm-legacy' };
      }
    }

    // FCM HTTP v1
    const projectId = process.env.FCM_PROJECT_ID;
    const accessToken = process.env.FCM_ACCESS_TOKEN;
    if (!projectId || !accessToken) {
      this.logger.warn('FCM haijawekwa — push imerukwa.');
      return { sent: 0, failed: clean.length, provider: 'none' };
    }

    let sent = 0;
    let failed = 0;
    for (const token of clean) {
      try {
        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              message: {
                token,
                notification: { title, body },
                data: Object.fromEntries(
                  Object.entries(data ?? {}).map(([k, v]) => [k, String(v)]),
                ),
              },
            }),
          },
        );
        if (res.ok) sent += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
    return { sent, failed, provider: 'fcm-v1' };
  }
}
