import { Injectable } from '@nestjs/common';

/**
 * §22.4 — vipimo vidogo bila dependency ya nje.
 * Hutoa maandishi ya Prometheus kwenye `GET /v1/metrics`.
 */
interface Bucket {
  le: number;
  count: number;
}

@Injectable()
export class MetricsService {
  private readonly startedAt = Date.now();

  private requests = 0;
  private errors = 0;
  private inFlight = 0;

  private readonly buckets: Bucket[] = [
    { le: 0.05, count: 0 },
    { le: 0.1, count: 0 },
    { le: 0.25, count: 0 },
    { le: 0.5, count: 0 },
    { le: 1, count: 0 },
    { le: 2, count: 0 },
    { le: 5, count: 0 },
    { le: Infinity, count: 0 },
  ];

  private latencySum = 0;

  /** route → { count, errors } */
  private readonly byRoute = new Map<
    string,
    { count: number; errors: number; method: string }
  >();

  startRequest() {
    this.inFlight += 1;
  }

  observe(
    method: string,
    route: string,
    statusCode: number,
    durationMs: number,
  ) {
    this.inFlight = Math.max(0, this.inFlight - 1);
    this.requests += 1;
    this.latencySum += durationMs / 1000;

    const seconds = durationMs / 1000;
    for (const bucket of this.buckets) {
      if (seconds <= bucket.le) bucket.count += 1;
    }

    const key = `${method} ${route}`;
    const row = this.byRoute.get(key) ?? {
      count: 0,
      errors: 0,
      method,
    };
    row.count += 1;
    if (statusCode >= 500) {
      row.errors += 1;
      this.errors += 1;
    }
    this.byRoute.set(key, row);
  }

  snapshot() {
    return {
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      requests: this.requests,
      errors: this.errors,
      inFlight: this.inFlight,
      avgLatencyMs:
        this.requests > 0
          ? Number(((this.latencySum / this.requests) * 1000).toFixed(1))
          : 0,
      p95Ms: this.percentile(0.95),
      p99Ms: this.percentile(0.99),
      routes: [...this.byRoute.entries()]
        .map(([route, v]) => ({ route, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 25),
    };
  }

  private percentile(p: number): number {
    const total = this.buckets[this.buckets.length - 1].count;
    if (total === 0) return 0;
    const target = total * p;
    for (const bucket of this.buckets) {
      if (bucket.count >= target) {
        return bucket.le === Infinity ? 5000 : Math.round(bucket.le * 1000);
      }
    }
    return 5000;
  }

  /** Umbizo la Prometheus text exposition format 0.0.4 */
  render(): string {
    const lines: string[] = [];
    const push = (line: string) => lines.push(line);

    push('# HELP myboke_uptime_seconds Muda API imekuwa hai.');
    push('# TYPE myboke_uptime_seconds gauge');
    push(`myboke_uptime_seconds ${Math.round((Date.now() - this.startedAt) / 1000)}`);

    push('# HELP myboke_http_requests_total Jumla ya maombi ya HTTP.');
    push('# TYPE myboke_http_requests_total counter');
    push(`myboke_http_requests_total ${this.requests}`);

    push('# HELP myboke_http_errors_total Majibu ya 5xx.');
    push('# TYPE myboke_http_errors_total counter');
    push(`myboke_http_errors_total ${this.errors}`);

    push('# HELP myboke_http_in_flight Maombi yanayoendelea.');
    push('# TYPE myboke_http_in_flight gauge');
    push(`myboke_http_in_flight ${this.inFlight}`);

    push('# HELP myboke_http_request_duration_seconds_histogram Muda wa maombi.');
    push('# TYPE myboke_http_request_duration_seconds_histogram gauge');
    for (const bucket of this.buckets) {
      const le = bucket.le === Infinity ? '+Inf' : `${bucket.le}`;
      push(
        `myboke_http_request_duration_seconds_histogram{le="${le}"} ${bucket.count}`,
      );
    }

    push('# HELP myboke_http_requests_by_route Maombi kwa route.');
    push('# TYPE myboke_http_requests_by_route gauge');
    for (const [key, value] of this.byRoute) {
      const [method, ...rest] = key.split(' ');
      const route = rest.join(' ').replace(/"/g, '');
      push(
        `myboke_http_requests_by_route{method="${method}",route="${route}",status="error"} ${value.errors}`,
      );
      push(
        `myboke_http_requests_by_route{method="${method}",route="${route}",status="ok"} ${
          value.count - value.errors
        }`,
      );
    }

    return `${lines.join('\n')}\n`;
  }
}
