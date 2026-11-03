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
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateSupplierDto,
  SupplierPaymentDto,
  UpdateSupplierDto,
} from './dto/product-extra.dto';
import { ProductsService } from './products.service';

@ApiTags('Suppliers')
@ApiBearerAuth('access-token')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Wasambazaji wote' })
  list(@CurrentUser('bid') businessId: string, @Query('q') q?: string) {
    return this.service.suppliers(businessId, q);
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Ongeza msambazaji' })
  create(
    @CurrentUser('bid') businessId: string,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.service.createSupplier(businessId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Msambazaji mmoja + bidhaa zake' })
  detail(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.supplier(businessId, id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Badilisha msambazaji' })
  update(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.service.updateSupplier(businessId, id, dto);
  }

  @Post(':id/payments')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Rekodi malipo kwa msambazaji (F13)' })
  pay(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: SupplierPaymentDto,
  ) {
    return this.service.addSupplierPayment(businessId, id, userId, dto);
  }

  @Get(':id/payments')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Malipo yote kwa msambazaji' })
  payments(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.supplierPayments(businessId, id);
  }

  @Get(':id/ledger')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Daftari la msambazaji — tunadaiwa kiasi gani (F13)' })
  ledger(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.supplierLedger(businessId, id);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Futa msambazaji' })
  remove(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.deleteSupplier(businessId, id);
  }
}
