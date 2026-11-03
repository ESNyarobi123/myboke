import { Module } from '@nestjs/common';
import { GrowthModule } from '../growth/growth.module';
import { PlatformModule } from '../platform/platform.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [PlatformModule, GrowthModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
