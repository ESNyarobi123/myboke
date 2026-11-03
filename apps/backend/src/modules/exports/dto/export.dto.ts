import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export const EXPORT_TYPES = [
  'sales',
  'products',
  'stock',
  'expenses',
  'debts',
  'customers',
  'shifts',
  'all',
] as const;

export type ExportType = (typeof EXPORT_TYPES)[number];

export class CreateExportDto {
  @ApiProperty({ enum: EXPORT_TYPES, example: 'sales' })
  @IsIn(EXPORT_TYPES as unknown as string[])
  type!: ExportType;

  @ApiPropertyOptional({ enum: ['xlsx', 'csv', 'json'], default: 'xlsx' })
  @IsOptional()
  @IsIn(['xlsx', 'csv', 'json'])
  format?: 'xlsx' | 'csv' | 'json';

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;
}
