import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { reportPdf } from '../../infra/files/pdf.util';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  CampaignDto,
  CreateCustomerDto,
  ListBirthdaysQueryDto,
  ListCustomersQueryDto,
  UpdateCustomerDto,
} from './dto/customer.dto';
import { CustomersService } from './customers.service';

@ApiTags('Customers')
@ApiBearerAuth('access-token')
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Orodha ya wateja pamoja na salio la deni' })
  list(
    @CurrentUser('bid') businessId: string,
    @Query() q: ListCustomersQueryDto,
  ) {
    return this.service.list(businessId, q);
  }

  @Post()
  @ApiOperation({ summary: 'Ongeza mteja' })
  create(
    @CurrentUser('bid') businessId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.service.create(businessId, dto);
  }

  @Get('segments')
  @ApiOperation({ summary: 'Makundi ya wateja — wapya, waaminifu, waliopotea (E9)' })
  segments(@CurrentUser('bid') businessId: string) {
    return this.service.segments(businessId);
  }

  @Get('birthdays')
  @ApiOperation({ summary: 'Siku za kuzaliwa zinazokuja (E12)' })
  birthdays(
    @CurrentUser('bid') businessId: string,
    @Query() q: ListBirthdaysQueryDto,
  ) {
    return this.service.birthdays(businessId, q.month, q.days);
  }

  @Post('campaigns')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Kampeni ya WhatsApp kwa kundi (E10)' })
  campaign(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CampaignDto,
  ) {
    return this.service.campaign(businessId, userId, dto);
  }

  @Get(':id/loyalty')
  @ApiOperation({ summary: 'Pointi za uaminifu za mteja (E8)' })
  loyalty(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.loyalty(businessId, id);
  }

  @Get(':id/ledger')
  @ApiOperation({ summary: 'Daftari la mteja (debit · credit · salio)' })
  ledger(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.ledger(businessId, id, from, to);
  }

  @Get(':id/statement')
  @ApiOperation({ summary: 'Taarifa ya mteja — JSON, HTML au PDF' })
  async statement(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Query('format') format: 'json' | 'html' | 'pdf' = 'json',
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.service.statement(businessId, id, from, to);

    if (format === 'pdf') {
      const pdf = await reportPdf({
        title: 'Taarifa ya Mteja',
        businessName: data.business?.name ?? 'MyBoke',
        period: data.periodLabel,
        columns: [
          { header: 'Tarehe', key: 'date', width: 1.4 },
          { header: 'Maelezo', key: 'description', width: 3 },
          { header: 'Deni', key: 'debit', width: 1.2, align: 'right' },
          { header: 'Malipo', key: 'credit', width: 1.2, align: 'right' },
          { header: 'Salio', key: 'balance', width: 1.2, align: 'right' },
        ],
        rows: data.entries.map((e) => ({
          date: new Date(e.date).toLocaleDateString('en-GB'),
          description: e.description,
          debit: e.debit,
          credit: e.credit,
          balance: e.balance,
        })),
        summary: [
          { label: 'Mteja', value: data.customer?.name ?? '-' },
          { label: 'Jumla ya deni', value: data.totalDebit },
          { label: 'Jumla ya malipo', value: data.totalCredit },
          { label: 'Salio la mwisho', value: data.closingBalance },
        ],
      });
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="taarifa-${id}.pdf"`,
      });
      // Buffer haiwezi kurudishwa moja kwa moja — Express ingeifunga kama JSON.
      return new StreamableFile(pdf);
    }

    return data;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mteja mmoja na historia' })
  get(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.get(businessId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Badilisha mteja' })
  update(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.service.update(businessId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Futa mteja' })
  remove(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.remove(businessId, id);
  }
}
