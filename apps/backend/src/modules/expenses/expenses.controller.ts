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
  CreateExpenseDto,
  ListExpensesQueryDto,
  UpdateExpenseDto,
} from './dto/expense.dto';
import { ExpensesService } from './expenses.service';

@ApiTags('Expenses')
@ApiBearerAuth('access-token')
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @Get()
  @ApiOperation({ summary: 'Orodha ya gharama' })
  list(@CurrentUser('bid') businessId: string, @Query() q: ListExpensesQueryDto) {
    return this.service.list(businessId, q);
  }

  @Get('summary')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Jumla ya gharama kwa category' })
  summary(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.summary(businessId, shopId, from, to);
  }

  @Get('recurring')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Gharama zinazorudi (kodi, umeme, mshahara · F9)' })
  recurring(@CurrentUser('bid') businessId: string) {
    return this.service.recurring(businessId);
  }

  @Post('recurring/run')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Tengeneza gharama zinazorudi zilizofika muda' })
  runRecurring(@CurrentUser('bid') businessId: string) {
    return this.service.generateRecurring(businessId);
  }

  @Post()
  @ApiOperation({ summary: 'Ongeza gharama' })
  create(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.service.create(businessId, dto, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Gharama moja' })
  detail(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.detail(businessId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Badilisha gharama' })
  update(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.service.update(businessId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Futa gharama' })
  remove(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.remove(businessId, id);
  }
}
