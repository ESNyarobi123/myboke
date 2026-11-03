import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

export class PriceChangeDto {
  @ApiProperty({ example: '1500.00' })
  @Matches(/^\d{1,15}(\.\d{1,2})?$/, { message: 'Bei si sahihi' })
  newPrice!: string;

  @ApiProperty({ example: 'sellingPrice', enum: ['buyingPrice', 'sellingPrice'] })
  @IsIn(['buyingPrice', 'sellingPrice'])
  field!: 'buyingPrice' | 'sellingPrice';

  @ApiPropertyOptional({ example: 'Bei ya supplier imepanda' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Sasisha bidhaa zote za category hii',
  })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  applyToCategory?: boolean;
}

export class ImportProductsDto {
  @ApiPropertyOptional({
    example: false,
    description: 'true = hakuna kuandika, onyesha tu matokeo',
  })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  dryRun?: boolean;

  @ApiPropertyOptional({
    example: 'skip',
    enum: ['skip', 'update'],
    description: 'Barcode iliyopo: iruke au isasishwe',
  })
  @IsOptional()
  @IsIn(['skip', 'update'])
  onDuplicate?: 'skip' | 'update';

  @ApiPropertyOptional({ example: '01JSHOP...' })
  @IsOptional()
  @IsString()
  shopId?: string;
}

export class UpdateCategoryDto {
  @ApiProperty({ example: 'Vinywaji' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ example: 'local_drink' })
  @IsOptional()
  @IsString()
  icon?: string;
}

export class CreateSupplierDto {
  @ApiProperty({ example: 'Mkulima Mkuu Ltd' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: '0712345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Anatoa punguzo la 5%' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSupplierDto {
  @ApiPropertyOptional({ example: 'Mkulima Mkuu Ltd' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '0712345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListSuppliersQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;
}

export class ExportProductsQueryDto {
  @ApiPropertyOptional({ enum: ['xlsx', 'csv'], default: 'xlsx' })
  @IsOptional()
  @IsIn(['xlsx', 'csv'])
  format?: 'xlsx' | 'csv';
}

export class CreateVariantDto {
  @ApiProperty({ example: 'Kubwa · Nyekundu' })
  @IsString()
  @MinLength(1)
  variantLabel!: string;

  @ApiPropertyOptional({ example: '6001234567891' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ example: '1400.00' })
  @IsOptional()
  @Matches(/^\d{1,15}(\.\d{1,2})?$/, { message: 'Bei ya kununua si sahihi' })
  buyingPrice?: string;

  @ApiPropertyOptional({ example: '2000.00' })
  @IsOptional()
  @Matches(/^\d{1,15}(\.\d{1,2})?$/, { message: 'Bei ya kuuza si sahihi' })
  sellingPrice?: string;

  @ApiPropertyOptional({ example: '10' })
  @IsOptional()
  @Matches(/^-?\d{1,15}(\.\d{1,3})?$/, { message: 'Stock si sahihi' })
  initialStock?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;
}

export class BundleItemDto {
  @ApiProperty({ example: '01JPRODUCT...' })
  @IsString()
  productId!: string;

  @ApiProperty({ example: '2' })
  @Matches(/^\d{1,15}(\.\d{1,3})?$/, { message: 'Idadi si sahihi' })
  quantity!: string;
}

export class CreateBundleDto {
  @ApiProperty({ example: 'Kifurushi cha Breakfast' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: '4500.00' })
  @Matches(/^\d{1,15}(\.\d{1,2})?$/, { message: 'Bei si sahihi' })
  sellingPrice!: string;

  @ApiProperty({ type: [BundleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BundleItemDto)
  items!: BundleItemDto[];
}

export class UpdateBundleDto {
  @ApiPropertyOptional({ example: 'Kifurushi cha Breakfast' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: '4500.00' })
  @IsOptional()
  @Matches(/^\d{1,15}(\.\d{1,2})?$/, { message: 'Bei si sahihi' })
  sellingPrice?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [BundleItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleItemDto)
  items?: BundleItemDto[];
}

export class SupplierPaymentDto {
  @ApiProperty({ example: '50000.00' })
  @Matches(/^\d{1,15}(\.\d{1,2})?$/, { message: 'Kiasi si sahihi' })
  amount!: string;

  @ApiPropertyOptional({
    enum: ['CASH', 'MPESA', 'AIRTEL', 'BANK'],
    default: 'CASH',
  })
  @IsOptional()
  @IsIn(['CASH', 'MPESA', 'AIRTEL', 'BANK'])
  method?: string;

  @ApiPropertyOptional({ example: 'TXN-8891' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'Malipo ya mzigo wa Oktoba' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: '2026-11-01T10:00:00Z' })
  @IsOptional()
  @IsString()
  paidAt?: string;
}
