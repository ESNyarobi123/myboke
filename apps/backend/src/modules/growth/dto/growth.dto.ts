import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateDemandDto {
  @ApiProperty({ example: 'Cement 50kg' })
  @IsString()
  @MinLength(2)
  productName!: string;

  @ApiPropertyOptional({ example: '01JSHOP...' })
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional({ example: 'Mbagala' })
  @IsOptional()
  @IsString()
  ward?: string;

  @ApiPropertyOptional({ example: '3' })
  @IsOptional()
  @IsInt()
  quantity?: number;
}

export class RedeemCoinsDto {
  @ApiProperty({
    enum: ['AIRTIME_1000', 'VOUCHER_300', 'POSTER_50'],
    example: 'AIRTIME_1000',
  })
  @IsIn(['AIRTIME_1000', 'VOUCHER_300', 'POSTER_50'])
  item!: 'AIRTIME_1000' | 'VOUCHER_300' | 'POSTER_50';

  @ApiPropertyOptional({ example: '0712345678', description: 'Kwa airtime' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreatePosterDto {
  @ApiPropertyOptional({ example: '01JPRODUCT...' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({
    enum: ['OFFER', 'NEW_STOCK', 'DISCOUNT', 'OPENING', 'CUSTOM'],
    example: 'OFFER',
  })
  @IsIn(['OFFER', 'NEW_STOCK', 'DISCOUNT', 'OPENING', 'CUSTOM'])
  template!: 'OFFER' | 'NEW_STOCK' | 'DISCOUNT' | 'OPENING' | 'CUSTOM';

  @ApiPropertyOptional({ example: 'Punguzo la 10% leo tu!' })
  @IsOptional()
  @IsString()
  headline?: string;

  @ApiPropertyOptional({ example: '1200.00' })
  @IsOptional()
  @Matches(/^\d{1,15}(\.\d{1,2})?$/)
  price?: string;

  @ApiPropertyOptional({ example: '#0269E9' })
  @IsOptional()
  @IsString()
  accentColor?: string;
}

export class AssistantChatDto {
  @ApiProperty({ example: 'Faida yangu wiki hii ni ngapi?' })
  @IsString()
  @MinLength(1)
  message!: string;

  @ApiPropertyOptional({ enum: ['sw', 'en'], default: 'sw' })
  @IsOptional()
  @IsIn(['sw', 'en'])
  locale?: 'sw' | 'en';
}

export class CompleteMissionDto {
  @ApiPropertyOptional({ example: 'Nilimaliza hesabu ya stock' })
  @IsOptional()
  @IsString()
  note?: string;
}
