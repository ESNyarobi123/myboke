import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CloseShiftDto, OpenShiftDto } from './dto/shift.dto';
import { ShiftsService } from './shifts.service';

@ApiTags('Shifts')
@ApiBearerAuth('access-token')
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly service: ShiftsService) {}

  @Post('open')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER)
  @ApiOperation({ summary: 'Fungua shift (droo) ya mauzo' })
  open(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: OpenShiftDto,
  ) {
    return this.service.open(businessId, userId, dto);
  }

  @Get('current')
  @ApiOperation({ summary: 'Shift iliyo wazi + muhtasari wa sasa' })
  current(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.current(businessId, userId, shopId);
  }

  @Get()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Historia ya shifts' })
  history(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.history(
      businessId,
      shopId,
      limit ? Number(limit) : undefined,
    );
  }

  @Post(':id/close')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER)
  @ApiOperation({ summary: 'Funga shift — hesabu ya droo' })
  close(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: CloseShiftDto,
  ) {
    return this.service.close(businessId, userId, id, dto);
  }

  @Get(':id/z-report')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER)
  @ApiOperation({ summary: 'Z-Report ya shift' })
  zReport(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
  ) {
    return this.service.zReport(businessId, id);
  }
}
