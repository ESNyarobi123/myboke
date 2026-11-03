import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AddSalePaymentDto,
  CreateSaleDto,
  HoldSaleDto,
  ListSalesQueryDto,
  RefundSaleDto,
  UpdateSaleDto,
} from './dto/sale.dto';
import { SalesService } from './sales.service';

@ApiTags('Sales')
@ApiBearerAuth('access-token')
@Controller('sales')
export class SalesController {
  constructor(private readonly service: SalesService) {}

  @Post()
  @ApiOperation({ summary: 'Hifadhi mauzo (idempotent kwa Idempotency-Key)' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Zuia duplicate kwa offline retry',
  })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSaleDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.service.create(user, {
      ...dto,
      idempotencyKey: dto.idempotencyKey ?? idempotencyKey,
    });
  }

  @Post('hold')
  @ApiOperation({ summary: 'Hifadhi mauzo yaliyosimamishwa (D13)' })
  hold(@CurrentUser() user: JwtPayload, @Body() dto: HoldSaleDto) {
    return this.service.hold(user, dto);
  }

  @Get('held')
  @ApiOperation({ summary: 'Orodha ya mauzo yaliyosimamishwa (D13)' })
  held(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.heldList(businessId, shopId);
  }

  @Get('held/:id')
  @ApiOperation({ summary: 'Mauzo yaliyosimamishwa — cart kamili' })
  heldGet(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.heldGet(businessId, id);
  }

  @Delete('held/:id')
  @ApiOperation({ summary: 'Ondoa / washa mauzo yaliyosimamishwa' })
  heldDelete(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.heldDelete(businessId, id);
  }

  @Get()
  @ApiOperation({ summary: 'Orodha ya mauzo' })
  list(@CurrentUser('bid') businessId: string, @Query() q: ListSalesQueryDto) {
    return this.service.list(businessId, q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mauzo moja' })
  get(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.get(businessId, id);
  }

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Risiti — JSON, HTML au PDF (?format=pdf|html)' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'html', 'pdf'] })
  @ApiQuery({ name: 'width', required: false, enum: ['58', '80'] })
  async receipt(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Query('format') format: 'json' | 'html' | 'pdf' = 'json',
    @Query('width') width: '58' | '80' = '80',
    @Res({ passthrough: true }) res: Response,
  ) {
    if (format === 'html') {
      const html = await this.service.receiptHtml(businessId, id);
      res.set({ 'Content-Type': 'text/html; charset=utf-8' });
      return html;
    }

    if (format === 'pdf') {
      const pdf = await this.service.receiptPdf(
        businessId,
        id,
        width === '58' ? 58 : 80,
      );
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="risiti-${id}.pdf"`,
      });
      // Buffer haiwezi kurudishwa moja kwa moja — Express ingeifunga kama JSON.
      return new StreamableFile(pdf);
    }

    return this.service.receipt(businessId, id);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Viungo vya kushiriki risiti (WhatsApp · SMS · QR)' })
  share(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.share(businessId, id);
  }

  @Get(':id/payments')
  @ApiOperation({ summary: 'Malipo yote ya mauzo + salio' })
  payments(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.payments(businessId, id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Rekebisha mauzo (note · mteja · punguzo)' })
  update(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSaleDto,
  ) {
    return this.service.update(businessId, id, dto, userId);
  }

  @Post(':id/efd')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Ambatisha namba ya EFD risiti (awamu ya MVP)' })
  attachEfd(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Body('efdReceiptNo') efdReceiptNo: string,
  ) {
    return this.service.attachEfd(businessId, id, efdReceiptNo);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Ongeza malipo kwa mauzo (mkopo / split)' })
  addPayment(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: AddSalePaymentDto,
  ) {
    return this.service.addPayment(businessId, id, dto, userId);
  }

  @Post(':id/refund')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Rudisha mauzo (refund) na kurudisha stock' })
  refund(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: RefundSaleDto,
  ) {
    return this.service.refund(businessId, userId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Batilisha mauzo (void) na kurudisha stock' })
  voidSale(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.void(businessId, userId, id);
  }

  @Post(':id/void')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Batilisha mauzo (alias ya DELETE)' })
  voidAlias(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.void(businessId, userId, id);
  }
}
