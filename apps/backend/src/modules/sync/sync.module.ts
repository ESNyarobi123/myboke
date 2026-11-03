import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { DebtsModule } from '../debts/debts.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { ProductsModule } from '../products/products.module';
import { SalesModule } from '../sales/sales.module';
import { StockModule } from '../stock/stock.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [
    SalesModule,
    ExpensesModule,
    DebtsModule,
    CustomersModule,
    ProductsModule,
    StockModule,
  ],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
