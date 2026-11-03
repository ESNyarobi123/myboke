import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export type SyncEntity =
  | 'sale'
  | 'expense'
  | 'debt'
  | 'payment'
  | 'product'
  | 'customer'
  | 'stockMovement'
  | 'shop';

export class SyncOperationDto {
  @ApiProperty({ example: '01JLOCAL0001' })
  @IsString()
  opId!: string;

  @ApiProperty({
    example: 'sale',
    enum: ['sale', 'expense', 'debt', 'payment', 'product', 'customer', 'stockMovement', 'shop'],
  })
  @IsIn(['sale', 'expense', 'debt', 'payment', 'product', 'customer', 'stockMovement', 'shop'])
  entity!: SyncEntity;

  @ApiProperty({ example: 'create', enum: ['create', 'update', 'delete'] })
  @IsIn(['create', 'update', 'delete'])
  action!: 'create' | 'update' | 'delete';

  @ApiPropertyOptional({ example: '2026-11-01T07:00:00.000Z' })
  @IsOptional()
  @IsString()
  clientTs?: string;

  @ApiPropertyOptional({
    example: 7,
    description: 'Version ya mteja — hutumika kugundua conflict',
  })
  @IsOptional()
  @IsInt()
  baseVersion?: number;

  @ApiPropertyOptional({ description: 'ID ya client (ULID) kwa append-only' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiProperty({ example: { total: '12000.00' } })
  @IsObject()
  payload!: Record<string, any>;
}

export class SyncPushDto {
  @ApiProperty({ example: 'pixel-7-abc123' })
  @IsString()
  deviceId!: string;

  @ApiPropertyOptional({ example: 'eyJ0cyI6IjIwMjYtMTEtMDFUMDc6MDA6MDBaIn0' })
  @IsOptional()
  @IsString()
  lastServerCursor?: string;

  @ApiProperty({ type: [SyncOperationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SyncOperationDto)
  operations!: SyncOperationDto[];
}

export class SyncPullQueryDto {
  @ApiPropertyOptional({ description: 'Cursor kutoka pull/push ya mwisho' })
  @IsOptional()
  @IsString()
  since?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;
}
