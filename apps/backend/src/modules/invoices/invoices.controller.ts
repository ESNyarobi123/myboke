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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateInvoiceDto,
  INVOICE_TEMPLATES,
  InvoicePaymentDto,
  ListInvoicesQueryDto,
  UpdateInvoiceDto,
} from './dto/invoice.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('Invoices')
@ApiBearerAuth('access-token')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Orodha ya ankara + jumla ya madeni ya wateja' })
  list(@CurrentUser('bid') businessId: string, @Query() q: ListInvoicesQueryDto) {
    return this.service.list(businessId, q);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Muhtasari: zilizolipwa, zinazodaiwa, zilizochelewa' })
  summary(@CurrentUser('bid') businessId: string) {
    return this.service.summary(businessId);
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER)
  @ApiOperation({ summary: 'Tengeneza ankara mpya' })
  create(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.service.create(businessId, dto, userId);
  }

  @Post('from-sale/:saleId')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER)
  @ApiOperation({ summary: 'Tengeneza ankara kutoka mauzo' })
  fromSale(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Param('saleId') saleId: string,
  ) {
    return this.service.fromSale(businessId, saleId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ankara moja' })
  detail(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.detail(businessId, id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Badilisha ankara' })
  update(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.service.update(businessId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Futa ankara (isiyolipwa)' })
  remove(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.remove(businessId, id);
  }

  @Post(':id/send')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Weka alama kuwa ankara imetumwa' })
  send(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.send(businessId, id);
  }

  @Post(':id/payments')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER)
  @ApiOperation({ summary: 'Rekodi malipo ya ankara' })
  pay(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Body() dto: InvoicePaymentDto,
  ) {
    return this.service.pay(businessId, id, dto.amount);
  }

  @Post(':id/void')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Batilisha ankara' })
  void(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.voidInvoice(businessId, id);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Pakua ankara — PDF (template: modern|classic|minimal)' })
  @ApiQuery({ name: 'template', required: false, enum: INVOICE_TEMPLATES })
  async pdf(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
    @Query('template') template?: string,
  ) {
    const file = await this.service.pdf(businessId, id, template);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${file.filename}"`,
      'Content-Length': file.buffer.length.toString(),
    });
    return new StreamableFile(file.buffer);
  }
}
