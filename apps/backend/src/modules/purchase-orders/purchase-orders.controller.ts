import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { POStatus, Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from './dto/purchase-order.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@ApiTags('Suppliers')
@ApiBearerAuth('access-token')
@Roles(Role.OWNER, Role.MANAGER)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Orodha ya purchase orders' })
  list(
    @CurrentUser('bid') businessId: string,
    @Query('status') status?: POStatus,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(
      businessId,
      status,
      limit ? Number(limit) : undefined,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Tengeneza purchase order' })
  create(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.service.create(businessId, userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Purchase order moja' })
  get(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.get(businessId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Badilisha purchase order (DRAFT tu)' })
  update(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.service.update(businessId, id, dto);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Tuma kwa msambazaji (WhatsApp/SMS link)' })
  send(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.send(businessId, id);
  }

  @Post(':id/receive')
  @ApiOperation({ summary: 'Pokea bidhaa — huongeza stock' })
  receive(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseOrderDto,
  ) {
    return this.service.receive(businessId, userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Futa / batilisha purchase order' })
  cancel(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.cancel(businessId, id);
  }
}
