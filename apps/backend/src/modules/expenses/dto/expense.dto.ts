import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

const DEC2 = /^\d{1,15}(\.\d{1,2})?$/;

export class CreateExpenseDto {
  @ApiProperty({ example: 'Umeme wa duka' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: '25000.00' })
  @Matches(DEC2)
  amount!: string;

  @ApiProperty({
    example: 'Bills',
    description: 'Food | Transport | Bills | Shopping | Fees | Others',
  })
  @IsString()
  @MinLength(1)
  category!: string;

  @ApiProperty({ example: '01JSHOP...' })
  @IsString()
  shopId!: string;

  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ example: 'LUKU ya mwezi' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ example: 'monthly' })
  @IsOptional()
  @IsString()
  recurEvery?: string;
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}

export class ListExpensesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-11-30' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}
