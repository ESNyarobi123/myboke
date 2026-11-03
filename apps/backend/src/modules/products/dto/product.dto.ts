import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { UnitType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

const DECIMAL_2 = /^\d{1,15}(\.\d{1,2})?$/;

export class CreateProductDto {
  @ApiProperty({ example: 'Soda 500ml' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ example: '5449000000996' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ example: '01JABC...', description: 'Category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: UnitType, default: UnitType.PCS })
  @IsOptional()
  @IsEnum(UnitType)
  unitType?: UnitType;

  @ApiPropertyOptional({ example: 'pcs' })
  @IsOptional()
  @IsString()
  unitSymbol?: string;

  @ApiProperty({ example: '800.00' })
  @Matches(DECIMAL_2, { message: 'Bei ya kununua si sahihi' })
  buyingPrice!: string;

  @ApiProperty({ example: '1200.00' })
  @Matches(DECIMAL_2, { message: 'Bei ya kuuza si sahihi' })
  sellingPrice!: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  alertLevel?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  hasExpiry?: boolean;

  @ApiPropertyOptional({ example: '2027-01-31' })
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiPropertyOptional({ example: 'Bidhaa baridi' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '01JSHOP...' })
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional({ example: '50', description: 'Stock ya kuanzia' })
  @IsOptional()
  @Matches(/^\d{1,12}(\.\d{1,3})?$/)
  initialStock?: string;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class AdjustStockDto {
  @ApiProperty({ example: '01JSHOP...' })
  @IsString()
  shopId!: string;

  @ApiProperty({ example: '-2', description: 'Chanya = ongeza, hasi = punguza' })
  @Matches(/^-?\d{1,12}(\.\d{1,3})?$/)
  quantity!: string;

  @ApiProperty({
    example: 'damage',
    description: 'sale | purchase | transfer | damage | expiry | count | return',
  })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ example: 'Chupa 2 zilivunjika' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'Vinywaji' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ example: 'local_drink' })
  @IsOptional()
  @IsString()
  icon?: string;
}
