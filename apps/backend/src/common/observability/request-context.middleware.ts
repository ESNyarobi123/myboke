import {
  Injectable,
  Logger,
  NestMiddleware,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service';

/**
 * §22.4 — `requestId` kwa kila ombi + log ya JSON (structured).
 * Pia hurekodi vipimo vya Prometheus.
 */
@Injectable()
export class RequestContextMiddleware
  implements NestMiddleware, OnModuleDestroy
{
  private readonly log = new Logger('HTTP');
  private readonly slowMs = Number(process.env.SLOW_REQUEST_MS ?? 800);
  private readonly timer: NodeJS.Timeout;

  constructor(private readonly metrics: MetricsService) {
    // Kila dakika 5: onyesha muhtasari mfupi kwenye log (bila PII).
    this.timer = setInterval(() => {
      const s = this.metrics.snapshot();
      this.log.log(
        JSON.stringify({
          event: 'metrics_snapshot',
          requests: s.requests,
          errors: s.errors,
          avgLatencyMs: s.avgLatencyMs,
          p95Ms: s.p95Ms,
          inFlight: s.inFlight,
        }),
      );
    }, 5 * 60_000);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.headers['x-request-id'];
    const requestId =
      typeof incoming === 'string' && incoming.length <= 100
        ? incoming
        : randomUUID();

    res.setHeader('X-Request-Id', requestId);
    (req as Request & { requestId?: string }).requestId = requestId;

    const startedAt = process.hrtime.bigint();
    this.metrics.startRequest();

    res.on('finish', () => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      // Route pattern (sio URL halisi) ili cardinality isipande.
      const route =
        (req.route?.path as string | undefined) ??
        req.baseUrl ??
        req.originalUrl.split('?')[0];

      this.metrics.observe(req.method, route, res.statusCode, durationMs);

      // PII haijaandikwa: hakuna body, hakuna query values, hakuna simu.
      const line = JSON.stringify({
        event: 'http_request',
        requestId,
        method: req.method,
        route,
        status: res.statusCode,
        durationMs: Number(durationMs.toFixed(1)),
        level: res.statusCode >= 500 ? 'error' : 'info',
        slow: durationMs >= this.slowMs,
        userId:
          (req as Request & { user?: { sub?: string } }).user?.sub ?? null,
      });

      if (res.statusCode >= 500) this.log.error(line);
      else if (process.env.HTTP_LOG === 'silent') return;
      else this.log.log(line);
    });

    next();
  }
}
