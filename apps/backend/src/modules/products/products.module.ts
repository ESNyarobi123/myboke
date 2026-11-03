import { Module } from '@nestjs/common';
import { BundlesController } from './bundles.controller';
import { CategoriesController } from './categories.controller';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { SuppliersController } from './suppliers.controller';

@Module({
  controllers: [
    ProductsController,
    CategoriesController,
    SuppliersController,
    BundlesController,
  ],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
