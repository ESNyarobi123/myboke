import { Module } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module';
import { AnalyticsController, DashboardController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [ReportsModule],
  controllers: [AnalyticsController, DashboardController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
