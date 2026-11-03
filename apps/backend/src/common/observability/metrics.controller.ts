import {
  Controller,
  Get,
  Header,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { MetricsService } from './metrics.service';

@ApiTags('Health')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Public()
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Prometheus metrics (§22.4)' })
  scrape(@Headers('authorization') authorization?: string) {
    const token = process.env.METRICS_TOKEN;
    if (token && authorization !== `Bearer ${token}`) {
      throw new UnauthorizedException('Token ya metrics si sahihi.');
    }
    return this.metrics.render();
  }

  @Public()
  @Get('summary')
  @ApiOperation({ summary: 'Muhtasari wa vipimo kwa JSON (§22.4)' })
  summary(@Headers('authorization') authorization?: string) {
    const token = process.env.METRICS_TOKEN;
    if (token && authorization !== `Bearer ${token}`) {
      throw new UnauthorizedException('Token ya metrics si sahihi.');
    }
    return this.metrics.snapshot();
  }
}
