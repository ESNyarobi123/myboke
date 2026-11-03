import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AdjustStockDto,
  CreateCategoryDto,
  CreateProductDto,
  UpdateProductDto,
} from './dto/product.dto';
import {
  CreateVariantDto,
  ImportProductsDto,
  PriceChangeDto,
  UpdateCategoryDto,
} from './dto/product-extra.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@ApiBearerAuth('access-token')
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Orodha ya bidhaa (cursor pagination)' })
  @ApiQuery({ name: 'shopId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  list(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('q') q?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(businessId, {
      shopId,
      categoryId,
      q,
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Tafuta bidhaa kwa jina, barcode au SKU' })
  search(
    @CurrentUser('bid') businessId: string,
    @Query('q') q: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.search(businessId, q, shopId);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Bidhaa zenye stock ndogo au zimeisha' })
  lowStock(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.lowStock(businessId, shopId);
  }

  @Get('expiring')
  @ApiOperation({
    summary: 'C8 — Bidhaa zinazoisha muda (expiry alerts, siku 30 kwa default)',
  })
  @ApiQuery({ name: 'days', required: false, example: 30 })
  expiring(
    @CurrentUser('bid') businessId: string,
    @Query('days') days?: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.expiring(
      businessId,
      days ? Number(days) : 30,
      shopId,
    );
  }

  @Get('import/template')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Pakua template ya Excel ya kuimport bidhaa' })
  async template(@Res() res: Response) {
    const buffer = await this.service.importTemplate();
    res
      .set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="myboke-bidhaa-template.xlsx"',
        'Content-Length': buffer.length.toString(),
      })
      .send(buffer);
  }

  @Get('export')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Pakua bidhaa zote (xlsx · csv)' })
  async export(
    @CurrentUser('bid') businessId: string,
    @Query('format') format: 'xlsx' | 'csv' = 'xlsx',
    @Query('shopId') shopId: string | undefined,
    @Res() res: Response,
  ) {
    const file = await this.service.export(businessId, format, shopId);
    res
      .set({
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Content-Length': file.buffer.length.toString(),
      })
      .send(file.buffer);
  }

  @Post('import')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        dryRun: { type: 'boolean' },
        onDuplicate: { type: 'string', enum: ['skip', 'update'] },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import bidhaa kutoka Excel/CSV (dry-run ipo)' })
  import(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; size: number },
    @Body() dto: ImportProductsDto,
  ) {
    return this.service.importSpreadsheet(
      businessId,
      file.buffer,
      file.originalname,
      {
        dryRun: String(dto.dryRun) === 'true' || (dto.dryRun as unknown) === true,
        onDuplicate: dto.onDuplicate ?? 'skip',
        shopId: dto.shopId,
      },
      userId,
    );
  }

  @Get('labels')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Chapisha lebo za barcode (PDF · §18.2)' })
  @ApiQuery({ name: 'ids', required: false, description: 'IDs zilizotenganishwa kwa koma' })
  @ApiQuery({ name: 'shopId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'size', required: false, enum: ['40x30', '50x25', '38x25'] })
  @ApiQuery({ name: 'format', required: false, enum: ['code128', 'ean13', 'qrcode'] })
  @ApiQuery({ name: 'copies', required: false })
  async labels(
    @CurrentUser('bid') businessId: string,
    @Query('ids') ids: string | undefined,
    @Query('shopId') shopId: string | undefined,
    @Query('categoryId') categoryId: string | undefined,
    @Query('size') size: '40x30' | '50x25' | '38x25' | undefined,
    @Query('format') format: 'code128' | 'ean13' | 'qrcode' | undefined,
    @Query('copies') copies: string | undefined,
    @Res() res: Response,
  ) {
    const file = await this.service.labels(businessId, {
      ids,
      shopId,
      categoryId,
      size,
      format,
      copies: copies ? Number(copies) : undefined,
    });
    res
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Content-Length': file.buffer.length.toString(),
      })
      .send(file.buffer);
  }

  @Get('quick-keys')
  @ApiOperation({ summary: 'Quick keys za POS — bidhaa 8 zinazouzwa zaidi' })
  @ApiQuery({ name: 'shopId', required: false })
  quickKeys(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.quickKeys(businessId, shopId);
  }

  @Get('import/:jobId')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Maendeleo ya import job (§19.1)' })
  importJob(
    @CurrentUser('bid') businessId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.service.importJob(businessId, jobId);
  }

  @Post('import/dry-run')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        onDuplicate: { type: 'string', enum: ['skip', 'update'] },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Dry-run ya import — hakuna kuandika (§19.1)' })
  importDryRun(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; size: number },
    @Body() dto: ImportProductsDto,
  ) {
    return this.service.importSpreadsheet(
      businessId,
      file.buffer,
      file.originalname,
      { dryRun: true, onDuplicate: dto.onDuplicate ?? 'skip', shopId: dto.shopId },
      userId,
    );
  }

  @Get('categories')
  @ApiOperation({ summary: 'Categories za biashara' })
  categories(@CurrentUser('bid') businessId: string) {
    return this.service.categories(businessId);
  }

  @Post('categories')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Ongeza category' })
  createCategory(
    @CurrentUser('bid') businessId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.service.createCategory(businessId, dto);
  }

  @Patch('categories/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Badilisha category' })
  updateCategory(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.updateCategory(businessId, id, dto);
  }

  @Delete('categories/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Futa category' })
  deleteCategory(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
  ) {
    return this.service.deleteCategory(businessId, id);
  }

  @Get('barcode/:code')
  @ApiOperation({ summary: 'Tafuta bidhaa kwa barcode' })
  byBarcode(
    @CurrentUser('bid') businessId: string,
    @Param('code') code: string,
  ) {
    return this.service.findByBarcode(businessId, code);
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Ongeza bidhaa' })
  create(
    @CurrentUser('bid') businessId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.service.create(businessId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bidhaa moja' })
  get(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.get(businessId, id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Badilisha bidhaa (inarekodi price history)' })
  update(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.service.update(businessId, id, dto, userId);
  }

  @Post(':id/stock')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Rekebisha stock (hasara, uharibifu, hesabu)' })
  adjustStock(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.service.adjustStock(businessId, id, dto, userId);
  }

  @Post(':id/price-change')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Badilisha bei (na historia + category)' })
  priceChange(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: PriceChangeDto,
  ) {
    return this.service.priceChange(businessId, id, dto, userId);
  }

  @Get(':id/price-history')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Historia ya mabadiliko ya bei' })
  priceHistory(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
  ) {
    return this.service.priceHistory(businessId, id);
  }

  @Post(':id/variants')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Ongeza variant ya bidhaa (size/color · C14)' })
  createVariant(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.service.createVariant(businessId, id, dto);
  }

  @Get(':id/variants')
  @ApiOperation({ summary: 'Variants za bidhaa (C14)' })
  variants(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.variants(businessId, id);
  }

  @Get(':id/movements')
  @ApiOperation({ summary: 'Historia ya stock movements' })
  movements(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.movements(businessId, id, shopId);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Futa bidhaa (soft delete)' })
  remove(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.remove(businessId, id);
  }
}
