import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { JobsService } from './jobs.service';

const TZ = 'Africa/Nairobi';

/**
 * Cron jobs za §10.8. Zina-register tu kama `JOBS_ENABLED !== 'false'`
 * ili test/env za CI zisikimbie kazi za usiku.
 */
@Injectable()
export class JobsScheduler {
  private readonly log = new Logger(JobsScheduler.name);
  private readonly enabled = process.env.JOBS_ENABLED !== 'false';

  constructor(private readonly jobs: JobsService) {}

  private async run(name: string, fn: () => Promise<unknown>) {
    if (!this.enabled) return;
    try {
      await fn();
    } catch (error) {
      this.log.error(`job ${name} imeshindikana: ${(error as Error).message}`);
    }
  }

  @Cron('0 1 * * *', { name: 'reports', timeZone: TZ })
  reports() {
    return this.run('reports', () => this.jobs.precomputeReports());
  }

  @Cron('0 2 * * *', { name: 'maintenance', timeZone: TZ })
  maintenance() {
    return this.run('maintenance', () => this.jobs.maintenance());
  }

  @Cron('0 5 * * *', { name: 'growth-missions', timeZone: TZ })
  missions() {
    return this.run('growth-missions', () => this.jobs.generateDailyMissions());
  }

  @Cron('30 5 * * *', { name: 'growth-impact', timeZone: TZ })
  impact() {
    return this.run('growth-impact', () => this.jobs.measureMissionImpact());
  }

  @Cron('30 6 * * *', { name: 'expenses', timeZone: TZ })
  expenses() {
    return this.run('expenses', () => this.jobs.recurringExpenses());
  }

  @Cron('0 6 * * *', { name: 'billing', timeZone: TZ })
  billing() {
    return this.run('billing', async () => {
      const base = await this.jobs.checkSubscriptions();
      const reminders = await this.jobs.sendRenewalReminders();
      return {
        ...base,
        details: { ...base.details, reminders },
      };
    });
  }

  @Cron('30 7 * * *', { name: 'digest', timeZone: TZ })
  digest() {
    return this.run('digest', () => this.jobs.dailyDigest());
  }

  @Cron('0 7 * * *', { name: 'notifications', timeZone: TZ })
  notifications() {
    return this.run('notifications', () => this.jobs.dailyNotifications());
  }
}
