import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

export class CreateShopDto {
  @ApiProperty({ example: 'Duka la Kariakoo' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: 'Kariakoo, Dar es Salaam' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '0712345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: -6.8161, description: 'GPS latitude (B8)' })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 39.2803, description: 'GPS longitude (B8)' })
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({
    example: {
      mon: { open: '08:00', close: '20:00' },
      sun: { closed: true },
    },
    description: 'Saa za kazi za duka kwa siku (B7)',
  })
  @IsOptional()
  @IsObject()
  businessHours?: Record<string, { open?: string; close?: string; closed?: boolean }>;
}

export class UpdateShopDto extends PartialType(CreateShopDto) {}

export class ShopHolidayDto {
  @ApiProperty({ example: '2026-12-25' })
  @IsString()
  date!: string;

  @ApiPropertyOptional({ example: 'Krismasi' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ShopQueryDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  includeInactive?: boolean;
}
