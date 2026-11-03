import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdjustStockDtoV2 {
  @ApiProperty({ example: '01JSHOP...' })
  @IsString()
  shopId!: string;

  @ApiProperty({ example: '01JPRODUCT...' })
  @IsString()
  productId!: string;

  @ApiProperty({
    example: '10',
    description: 'Idadi (chanya). ADJUST hutumia hii kama idadi mpya.',
  })
  @Matches(/^-?\d{1,15}(\.\d{1,3})?$/, { message: 'Idadi si sahihi' })
  quantity!: string;

  @ApiProperty({
    enum: ['IN', 'OUT', 'ADJUST'],
    example: 'IN',
    description: 'IN=ongeza · OUT=toa · ADJUST=weka idadi mpya',
  })
  @IsIn(['IN', 'OUT', 'ADJUST'])
  type!: 'IN' | 'OUT' | 'ADJUST';

  @ApiPropertyOptional({ example: 'Bidhaa zilizoharibika' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class TransferItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty({ example: '5' })
  @Matches(/^\d{1,15}(\.\d{1,3})?$/, { message: 'Idadi si sahihi' })
  quantity!: string;
}

export class TransferStockDto {
  @ApiProperty()
  @IsString()
  fromShopId!: string;

  @ApiProperty()
  @IsString()
  toShopId!: string;

  @ApiProperty({ type: [TransferItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items!: TransferItemDto[];

  @ApiPropertyOptional({ example: 'Hamisha kwa duka la pili' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CountItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty({ example: '42', description: 'Idadi iliyohesabiwa kwa mkono' })
  @Matches(/^\d{1,15}(\.\d{1,3})?$/, { message: 'Idadi si sahihi' })
  countedQty!: string;
}

export class CountStockDto {
  @ApiProperty()
  @IsString()
  shopId!: string;

  @ApiProperty({ type: [CountItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CountItemDto)
  items!: CountItemDto[];

  @ApiPropertyOptional({ example: 'Hesabu ya mwezi' })
  @IsOptional()
  @IsString()
  note?: string;
}
