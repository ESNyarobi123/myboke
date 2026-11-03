import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';
import { ReportsService } from '../reports/reports.service';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Muhtasari wa Home screen' })
  summary(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.reports.dashboard(businessId, shopId);
  }
}

@ApiTags('Analytics')
@ApiBearerAuth('access-token')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('overview')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'KPIs, ukuaji na mizania' })
  overview(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.overview(businessId, { shopId, from, to });
  }

  @Get('trends')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Mwenendo wa siku kwa siku' })
  trends(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
    @Query('days') days?: string,
    @Query('metric') metric?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.trends(businessId, {
      shopId,
      days: days ? Number(days) : undefined,
      metric,
      from,
      to,
    });
  }

  @Get('compare')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Linganisha vipindi viwili' })
  compare(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
    @Query('periodAFrom') periodAFrom?: string,
    @Query('periodATo') periodATo?: string,
    @Query('periodBFrom') periodBFrom?: string,
    @Query('periodBTo') periodBTo?: string,
  ) {
    return this.service.compare(businessId, {
      shopId,
      periodAFrom,
      periodATo,
      periodBFrom,
      periodBTo,
    });
  }

  @Get('shops')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'D13 — Linganisha maduka yote (shop vs shop)' })
  shops(
    @CurrentUser('bid') businessId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.byShop(businessId, { from, to });
  }

  @Get('categories')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Mchango wa categories kwenye mauzo' })
  categories(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.byCategory(businessId, { shopId, from, to });
  }
}
