import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateExportDto } from './dto/export.dto';
import { ExportsService } from './exports.service';

@ApiTags('Exports')
@ApiBearerAuth('access-token')
@Controller('exports')
export class ExportsController {
  constructor(private readonly service: ExportsService) {}

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({
    summary: 'Tengeneza export (sales · products · stock · expenses · debts · all)',
  })
  create(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateExportDto,
  ) {
    return this.service.create(businessId, dto, userId);
  }

  @Get()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Orodha ya exports' })
  list(
    @CurrentUser('bid') businessId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(businessId, limit ? Number(limit) : undefined);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Hali ya export' })
  get(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.get(businessId, id);
  }

  @Get(':id/download')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Pakua faili ya export' })
  async download(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const file = await this.service.download(businessId, id);
    res
      .set({
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Content-Length': file.buffer.length.toString(),
      })
      .send(file.buffer);
  }
}
