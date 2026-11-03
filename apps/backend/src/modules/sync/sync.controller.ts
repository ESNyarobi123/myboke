import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SyncPullQueryDto, SyncPushDto } from './dto/sync.dto';
import { SyncService } from './sync.service';

@ApiTags('Sync')
@ApiBearerAuth('access-token')
@Controller('sync')
export class SyncController {
  constructor(private readonly service: SyncService) {}

  @Post('push')
  @ApiOperation({
    summary: 'Tuma operations za offline (idempotent kwa deviceId + opId)',
  })
  push(@CurrentUser() user: JwtPayload, @Body() dto: SyncPushDto) {
    return this.service.push(user, dto);
  }

  @Get('pull')
  @ApiOperation({ summary: 'Chukua mabadiliko mapya tangu cursor' })
  pull(
    @CurrentUser('bid') businessId: string,
    @Query() q: SyncPullQueryDto,
  ) {
    return this.service.pull(businessId, q.since, q.limit ?? 500);
  }

  @Get('state')
  @ApiOperation({ summary: 'Hali ya sync — counts, cursor na migogoro' })
  state(
    @CurrentUser('bid') businessId: string,
    @Query('deviceId') deviceId?: string,
  ) {
    return this.service.state(businessId, deviceId);
  }

  @Get('operations')
  @ApiOperation({ summary: 'Historia ya operations za kifaa' })
  operations(
    @CurrentUser('bid') businessId: string,
    @Query('deviceId') deviceId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.operations(
      businessId,
      deviceId,
      limit ? Number(limit) : undefined,
    );
  }

  @Post('purge')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Safisha operations za siku 30 zilizopita' })
  purge(@CurrentUser('bid') businessId: string) {
    return this.service.purge(businessId);
  }
}
