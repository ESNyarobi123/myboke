import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * §10.11 — ulinzi wa `/auth/*` dhidi ya brute force.
 *
 * Tofauti na throttle ya jumla (100/min kwa kila ombi), hii inahesabu
 * **majaribio yaliyoshindikana** tu (4xx) — mtumiaji aliyeingia vizuri
 * hafungwi kwa sababu ya maombi mengi halali (login → refresh → logout).
 */
@Injectable()
export class AuthAttemptsGuard implements CanActivate {
  private readonly attempts = new Map<string, number[]>();

  private get limit() {
    return Number(process.env.THROTTLE_AUTH_LIMIT ?? 10);
  }

  private get windowMs() {
    return Number(process.env.THROTTLE_TTL_MS ?? 60_000);
  }

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    // Inatumika kwa njia za auth tu.
    if (!req.path.includes('/auth/') && !req.path.endsWith('/auth')) {
      return true;
    }

    const key = this.keyOf(req);

    // Rekodi kosa baada ya jibu (4xx = jaribio lililoshindikana).
    res.on('finish', () => {
      if (res.statusCode >= 400 && res.statusCode < 500 && res.statusCode !== 429) {
        const now = Date.now();
        const list = (this.attempts.get(key) ?? []).filter(
          (t) => now - t < this.windowMs,
        );
        list.push(now);
        this.attempts.set(key, list);
        if (this.attempts.size > 5000) this.cleanup(now);
      }
    });

    const now = Date.now();
    const recent = (this.attempts.get(key) ?? []).filter(
      (t) => now - t < this.windowMs,
    );
    if (recent.length > 0) this.attempts.set(key, recent);

    if (recent.length >= this.limit) {
      const retryAfter = Math.ceil(
        (this.windowMs - (now - recent[0])) / 1000,
      );
      res.setHeader('Retry-After', String(Math.max(1, retryAfter)));
      throw new HttpException(
        {
          code: 'TOO_MANY_AUTH_ATTEMPTS',
          message: `Majaribio mengi yameshindikana. Subiri sekunde ${Math.max(
            1,
            retryAfter,
          )} kisha ujaribu tena.`,
          limit: this.limit,
          windowMs: this.windowMs,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private keyOf(req: Request): string {
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0] ??
      req.ip ??
      'unknown';
    const identifier =
      (req.body as { identifier?: string; phone?: string } | undefined)
        ?.identifier ??
      (req.body as { identifier?: string; phone?: string } | undefined)?.phone;
    // Namba ya simu ni sehemu ya key ili mtu asizuie wateja wengine (NAT).
    return identifier ? `${ip}|${identifier}` : ip;
  }

  private cleanup(now: number) {
    for (const [key, list] of this.attempts) {
      const recent = list.filter((t) => now - t < this.windowMs);
      if (recent.length === 0) this.attempts.delete(key);
      else this.attempts.set(key, recent);
    }
  }
}
