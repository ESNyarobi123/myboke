import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { MovementType, Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CountStockDto, AdjustStockDtoV2, TransferStockDto } from './dto/stock.dto';
import { StockService } from './stock.service';

@ApiTags('Stock')
@ApiBearerAuth('access-token')
@Controller('stock')
export class StockController {
  constructor(private readonly service: StockService) {}

  @Get()
  @ApiOperation({ summary: 'Stock ya bidhaa kwa kila duka' })
  @ApiQuery({ name: 'shopId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'low', required: false, type: Boolean })
  list(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('q') q?: string,
    @Query('low') low?: string,
  ) {
    return this.service.list(businessId, {
      shopId,
      categoryId,
      q,
      low: low === 'true' || low === '1',
    });
  }

  @Get('movements')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Historia ya mienendo ya stock' })
  movements(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
    @Query('productId') productId?: string,
    @Query('type') type?: MovementType,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.movements(businessId, {
      shopId,
      productId,
      type,
      from,
      to,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Tahadhari za stock ndogo / zilizoisha' })
  alerts(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.alerts(businessId, shopId);
  }

  @Get('valuation')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Thamani ya stock (gharama vs rejareja)' })
  valuation(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.valuation(businessId, shopId);
  }

  @Post('adjust')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Rekebisha stock (IN · OUT · ADJUST)' })
  adjust(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: AdjustStockDtoV2,
  ) {
    return this.service.adjust(businessId, userId, dto);
  }

  @Post('transfer')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Hamisha stock kati ya maduka' })
  transfer(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: TransferStockDto,
  ) {
    return this.service.transfer(businessId, userId, dto);
  }

  @Post('count')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Hesabu ya stock (stock take)' })
  count(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CountStockDto,
  ) {
    return this.service.count(businessId, userId, dto);
  }
}
