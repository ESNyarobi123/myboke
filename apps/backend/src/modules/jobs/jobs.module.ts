import { Module } from '@nestjs/common';
import { ExpensesModule } from '../expenses/expenses.module';
import { GrowthModule } from '../growth/growth.module';
import { PlatformModule } from '../platform/platform.module';
import { JobsController } from './jobs.controller';
import { JobsScheduler } from './jobs.scheduler';
import { JobsService } from './jobs.service';

@Module({
  imports: [GrowthModule, ExpensesModule, PlatformModule],
  controllers: [JobsController],
  providers: [JobsService, JobsScheduler],
  exports: [JobsService],
})
export class JobsModule {}
