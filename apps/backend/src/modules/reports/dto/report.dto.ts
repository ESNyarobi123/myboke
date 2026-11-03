import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpsertBudgetDto {
  @ApiProperty({ example: 'Usafiri' })
  @IsString()
  @MinLength(1)
  category!: string;

  @ApiProperty({ example: '150000.00' })
  @Matches(/^\d{1,15}(\.\d{1,2})?$/, { message: 'Kiasi si sahihi' })
  amount!: string;

  @ApiPropertyOptional({ example: '2026-11', description: 'Default: mwezi huu' })
  @IsOptional()
  @IsString()
  month?: string;
}

export class UpdateBudgetDto {
  @ApiPropertyOptional({ example: '150000.00' })
  @IsOptional()
  @Matches(/^\d{1,15}(\.\d{1,2})?$/, { message: 'Kiasi si sahihi' })
  amount?: string;

  @ApiPropertyOptional({ example: 'Usafiri' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: '2026-11' })
  @IsOptional()
  @IsString()
  month?: string;
}
