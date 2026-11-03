import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreatePartnerDto {
  @ApiProperty({ example: 'Juma Mshauri' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: '0712345678' })
  @Matches(/^(\+?255|0)[67]\d{8}$/, { message: 'Namba si sahihi' })
  phone!: string;

  @ApiPropertyOptional({ example: 'SALMA2026', description: 'Code maalum' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'AGENT', enum: ['AGENT', 'RESELLER', 'AFFILIATE'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: '12.5', description: 'Asilimia ya commission' })
  @IsOptional()
  @IsString()
  commissionRate?: string;
}

export class SettleCommissionDto {
  @ApiPropertyOptional({
    enum: CommissionStatus,
    example: CommissionStatus.PAID,
  })
  @IsOptional()
  @IsIn(['APPROVED', 'PAID', 'REJECTED'])
  status?: 'APPROVED' | 'PAID' | 'REJECTED';

  @ApiPropertyOptional({ example: 'Malipo kupitia M-Pesa 0712345678' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ValidateReferralDto {
  @ApiProperty({ example: 'SALMA2026' })
  @IsString()
  @MinLength(3)
  code!: string;
}

export class UpdatePartnerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '10' })
  @IsOptional()
  @IsString()
  commissionRate?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: boolean;
}

export class ListAdminQueryDto {
  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Tafuta kwa jina au simu' })
  @IsOptional()
  @IsString()
  q?: string;
}
