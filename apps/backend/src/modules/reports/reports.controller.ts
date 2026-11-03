import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateBudgetDto, UpsertBudgetDto } from './dto/report.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard ya Home — mauzo, faida, madeni, tahadhari' })
  @ApiQuery({ name: 'shopId', required: false })
  dashboard(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.dashboard(businessId, shopId);
  }

  @Get('daily-snapshots')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({
    summary: 'Ripoti za siku zilizoprecompute (reports job · §10.8)',
  })
  @ApiQuery({ name: 'shopId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  snapshots(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.dailySnapshots(businessId, { shopId, from, to });
  }

  @Get('summary')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Muhtasari wa biashara (dashboard ya mmiliki)' })
  summary(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.summary(businessId, shopId);
  }

  @Get('debts')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Ripoti ya madeni + aging buckets' })
  debts(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.debtsReport(businessId, shopId);
  }

  @Get('top')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Bidhaa zinazoongoza (alias ya top-products)' })
  top(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.topProducts(businessId, { shopId, from, to });
  }

  @Get('top-customers')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'G9 — Wateja wanaonunua zaidi (revenue + orders)' })
  topCustomers(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.topCustomers(businessId, { shopId, from, to });
  }

  @Get('top-sellers')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'G9 — Wauzaji wanaouza zaidi (mauzo + faida)' })
  topSellers(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.topSellers(businessId, { shopId, from, to });
  }

  @Get('sales')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Ripoti ya mauzo kwa kipindi' })
  sales(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.salesReport(businessId, { shopId, from, to });
  }

  @Get('profit')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Faida: gross, expenses, net' })
  profit(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.profitReport(businessId, { shopId, from, to });
  }

  @Get('top-products')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Bidhaa 10 zinazoongoza kwa mauzo' })
  topProducts(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.topProducts(businessId, { shopId, from, to });
  }

  @Get('cash-flow')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({
    summary: 'Cash flow — fedha iliyoingia vs iliyotoka (F10)',
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  cashFlow(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.cashFlow(businessId, { shopId, from, to });
  }

  @Get('break-even')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Break-even analysis (F11)' })
  breakEven(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.breakEven(businessId, { shopId, from, to });
  }

  @Get('budgets')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Bajeti za gharama kwa category (F12)' })
  @ApiQuery({ name: 'month', required: false, example: '2026-11' })
  budgets(
    @CurrentUser('bid') businessId: string,
    @Query('month') month?: string,
  ) {
    return this.service.budgets(businessId, month);
  }

  @Post('budgets')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Weka bajeti ya category (upsert)' })
  upsertBudget(
    @CurrentUser('bid') businessId: string,
    @Body() dto: UpsertBudgetDto,
  ) {
    return this.service.upsertBudget(businessId, dto);
  }

  @Patch('budgets/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Badilisha bajeti' })
  updateBudget(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.service.updateBudget(businessId, id, dto);
  }

  @Delete('budgets/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Futa bajeti' })
  deleteBudget(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
  ) {
    return this.service.deleteBudget(businessId, id);
  }

  @Get('stock')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Thamani ya stock na afya yake' })
  stock(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.stockReport(businessId, shopId);
  }
}
