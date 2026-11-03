import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsBoolean, IsObject, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BackupService } from './backup.service';

class RestoreBackupDto {
  @ApiPropertyOptional({
    description: 'Tuma tu kuona kitakachorejeshwa (bila kuandika)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiProperty({
    description: 'JSON iliyopakuliwa kutoka GET /v1/backup (au `data` yake)',
  })
  @IsObject()
  data!: Record<string, unknown>;
}

@ApiTags('Platform')
@ApiBearerAuth()
@Controller('backup')
export class BackupController {
  constructor(private readonly service: BackupService) {}

  @Get()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'I14 — Backup kamili (JSON) ya data ya biashara' })
  export(@CurrentUser('bid') businessId: string) {
    return this.service.export(businessId);
  }

  @Post('restore')
  @Roles(Role.OWNER)
  @ApiOperation({
    summary: 'I14 — Restore (merge) ya master data kutoka backup',
  })
  @ApiQuery({ name: 'dryRun', required: false, type: Boolean })
  restore(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: RestoreBackupDto,
    @Query('dryRun') dryRun?: string,
  ) {
    const flag =
      dto.dryRun ?? (dryRun === undefined ? false : dryRun !== 'false');
    return this.service.restore(businessId, userId, dto.data, flag);
  }
}
