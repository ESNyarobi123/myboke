import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JobsService } from './jobs.service';

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Controller('admin/jobs')
export class JobsController {
  constructor(private readonly service: JobsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Hali ya queues na counters za jobs (§10.8)' })
  status() {
    return this.service.status();
  }

  @Post(':name/run')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Endesha job kwa mkono (reports · billing · growth · notifications · maintenance)',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'reports: siku ya EAT (YYYY-MM-DD), default jana',
  })
  run(@Param('name') name: string, @Query('date') date?: string) {
    return this.service.run(name, date);
  }
}
