import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DebtType, PaymentMethod } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';

const DEC2 = /^\d{1,15}(\.\d{1,2})?$/;

export class CreateDebtDto {
  @ApiProperty({ enum: DebtType, example: DebtType.OWE_ME })
  @IsEnum(DebtType)
  type!: DebtType;

  @ApiProperty({ example: 'Juma Hassan' })
  @IsString()
  @MinLength(2)
  personName!: string;

  @ApiPropertyOptional({ example: '0712345678' })
  @IsOptional()
  @IsString()
  personPhone?: string;

  @ApiPropertyOptional({ example: '01JCUSTOMER...' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ example: '25000.00' })
  @Matches(DEC2)
  originalAmount!: string;

  @ApiPropertyOptional({ example: 'Mkopo wa unga' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2026-11-15' })
  @IsOptional()
  @IsString()
  dueDate?: string;
}

export class UpdateDebtDto extends PartialType(CreateDebtDto) {}

export class DebtPaymentDto {
  @ApiProperty({ example: '5000.00' })
  @Matches(DEC2)
  amount!: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional({ example: 'MP9F2X3K1' })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class ListDebtsQueryDto {
  @ApiPropertyOptional({ enum: DebtType })
  @IsOptional()
  @IsEnum(DebtType)
  type?: DebtType;

  @ApiPropertyOptional({ example: 'OPEN' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}
