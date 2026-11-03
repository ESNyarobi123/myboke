import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Matches, Min, Max } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({ example: 'growth', enum: ['starter', 'growth', 'premium'] })
  @IsString()
  planId!: string;

  @ApiProperty({ example: 3, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  months!: number;

  @ApiProperty({ example: '0712345678', description: 'Namba ya malipo' })
  @Matches(/^(\+?255|0)[67]\d{8}$/, { message: 'Namba ya simu si sahihi' })
  phone!: string;

  @ApiPropertyOptional({ example: 'SALMA2026', description: 'Code ya wakala' })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @ApiPropertyOptional({ enum: ['snippe', 'mpesa', 'airtel'], default: 'snippe' })
  @IsOptional()
  @IsIn(['snippe', 'mpesa', 'airtel'])
  provider?: 'snippe' | 'mpesa' | 'airtel';
}

export class SnippeWebhookDto {
  @ApiPropertyOptional({ example: 'pi_01J...' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'PAY-01JABC123' })
  @IsOptional()
  @IsString()
  paymentKey?: string;

  @ApiPropertyOptional({ example: 'COMPLETED' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: '25000.00' })
  @IsOptional()
  @IsString()
  amount?: string;

  @ApiPropertyOptional({ example: '0712345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '2026-11-01T10:00:00Z' })
  @IsOptional()
  @IsString()
  paidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ example: 'Nabadilisha plan' })
  @IsOptional()
  @IsString()
  reason?: string;
}
