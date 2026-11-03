import { Module } from '@nestjs/common';
import { GrowthModule } from '../growth/growth.module';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  imports: [GrowthModule],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
