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
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateShopDto, ShopHolidayDto, UpdateShopDto } from './dto/shop.dto';
import { ShopsService } from './shops.service';

@ApiTags('Shops')
@ApiBearerAuth('access-token')
@Controller('shops')
export class ShopsController {
  constructor(private readonly service: ShopsService) {}

  @Get()
  @ApiOperation({ summary: 'Maduka ya biashara' })
  list(@CurrentUser('bid') businessId: string) {
    return this.service.list(businessId);
  }

  @Post()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Ongeza duka jipya' })
  create(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('role') role: Role,
    @Body() dto: CreateShopDto,
  ) {
    return this.service.create(businessId, role, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Duka moja' })
  get(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.get(businessId, id);
  }

  @Get(':id/health')
  @ApiOperation({ summary: 'Afya ya stock ya duka' })
  health(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.health(businessId, id);
  }

  @Get(':id/schedule')
  @ApiOperation({ summary: 'Saa za kazi, likizo na hali ya kufunguka (B7)' })
  schedule(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.schedule(businessId, id);
  }

  @Get(':id/holidays')
  @ApiOperation({ summary: 'Likizo za duka (B7)' })
  holidays(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.holidays(businessId, id);
  }

  @Post(':id/holidays')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Ongeza likizo ya duka' })
  addHoliday(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Body() dto: ShopHolidayDto,
  ) {
    return this.service.addHoliday(businessId, id, dto.date, dto.reason);
  }

  @Delete(':id/holidays/:holidayId')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Ondoa likizo' })
  removeHoliday(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Param('holidayId') holidayId: string,
  ) {
    return this.service.removeHoliday(businessId, id, holidayId);
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'QR ya duka (JSON au ?format=png · B8)' })
  async qr(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Query('format') format: 'json' | 'png' = 'json',
    @Res({ passthrough: true }) res: any,
  ) {
    const out = await this.service.qr(businessId, id);
    if (format === 'png') {
      res.set({
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="duka-${id}.png"`,
      });
      return new StreamableFile(out.png);
    }
    const { png, ...rest } = out;
    void png;
    return rest;
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Badilisha duka' })
  update(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('role') role: Role,
    @Param('id') id: string,
    @Body() dto: UpdateShopDto,
  ) {
    return this.service.update(businessId, role, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Futa duka (soft delete)' })
  remove(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('role') role: Role,
    @Param('id') id: string,
  ) {
    return this.service.remove(businessId, role, id);
  }
}
