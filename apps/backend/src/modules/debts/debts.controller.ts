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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  CreateDebtDto,
  DebtPaymentDto,
  ListDebtsQueryDto,
  UpdateDebtDto,
} from './dto/debt.dto';
import { DebtsService } from './debts.service';

@ApiTags('Debts')
@ApiBearerAuth('access-token')
@Controller('debts')
export class DebtsController {
  constructor(private readonly service: DebtsService) {}

  @Get()
  @ApiOperation({ summary: 'Orodha ya madeni' })
  list(@CurrentUser('bid') businessId: string, @Query() q: ListDebtsQueryDto) {
    return this.service.list(businessId, q);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Jumla: wanaonidai, ninawadai, yaliyochelewa' })
  summary(@CurrentUser('bid') businessId: string) {
    return this.service.summary(businessId);
  }

  @Post()
  @ApiOperation({ summary: 'Ongeza deni' })
  create(@CurrentUser('bid') businessId: string, @Body() dto: CreateDebtDto) {
    return this.service.create(businessId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Deni moja + malipo yake' })
  detail(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.detail(businessId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Badilisha deni' })
  update(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDebtDto,
  ) {
    return this.service.update(businessId, id, dto);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Rekodi malipo ya deni' })
  pay(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: DebtPaymentDto,
  ) {
    return this.service.addPayment(businessId, id, dto, userId);
  }

  @Post(':id/remind')
  @ApiOperation({ summary: 'Tengeneza ujumbe wa WhatsApp wa kumbusho' })
  remind(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.remind(businessId, id);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Futa deni' })
  remove(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.remove(businessId, id);
  }
}
