import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

const DEC = /^\d{1,15}(\.\d{1,3})?$/;
const DEC2 = /^\d{1,15}(\.\d{1,2})?$/;

export class SaleItemDto {
  @ApiPropertyOptional({
    example: '01JPRODUCT...',
    description: 'Lazima ikiwa hakuna bundleId',
  })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({
    example: '01JBUNDLE...',
    description: 'Uza kifurushi (C15) — stock ya kila kipengele inapunguzwa',
  })
  @IsOptional()
  @IsString()
  bundleId?: string;

  @ApiProperty({ example: '2', description: 'Inaruhusu decimals (0.5 kg)' })
  @Matches(/^\d{1,12}(\.\d{1,3})?$/, { message: 'Kiasi si sahihi' })
  quantity!: string;

  @ApiPropertyOptional({ example: '1200.00', description: 'Default = bei ya bidhaa' })
  @IsOptional()
  @Matches(DEC2)
  price?: string;

  @ApiPropertyOptional({ example: '0' })
  @IsOptional()
  @Matches(DEC2)
  discount?: string;
}

export class SalePaymentSplitDto {
  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.MPESA })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({ example: '2000.00' })
  @Matches(DEC2, { message: 'Kiasi si sahihi' })
  amount!: string;

  @ApiPropertyOptional({ example: 'QGH7Y2LM90' })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreateSaleDto {
  @ApiProperty({ example: '01JSHOP...' })
  @IsString()
  shopId!: string;

  @ApiProperty({ type: [SaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items!: SaleItemDto[];

  @ApiPropertyOptional({ example: '01JCUSTOMER...' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: '500.00', description: 'Punguzo la jumla' })
  @IsOptional()
  @Matches(DEC2)
  discount?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    example: '2000.00',
    description:
      'Malipo ya awali (deposit). CREDIT bila hii = deni lote; MIXED hutumia hii kama sehemu iliyolipwa.',
  })
  @IsOptional()
  @Matches(DEC2)
  paidAmount?: string;

  @ApiPropertyOptional({
    type: [SalePaymentSplitDto],
    description:
      'Split payment (D12) — mf. CASH 2000 + MPESA 2400. Ikitoa hii, paidAmount inapuuzwa.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalePaymentSplitDto)
  payments?: SalePaymentSplitDto[];

  @ApiPropertyOptional({ example: '2026-11-01T09:30:00Z' })
  @IsOptional()
  @IsString()
  saleDate?: string;

  @ApiPropertyOptional({ example: 'Mteja wa kudumu' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    example: 'device-abc:01JBATCH',
    description: 'Kwa offline retry — sale moja haitengenezwi mara mbili',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class ListSalesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

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

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsString()
  limit?: string;
}

export class RefundSaleDto {
  @ApiPropertyOptional({ example: 'Mteja hakuwa radhi na bidhaa' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Rudisha stock? (default true)',
  })
  @IsOptional()
  @ToBoolean()
  restock?: boolean;
}

export class AddSalePaymentDto {
  @ApiProperty({ example: '5000.00' })
  @Matches(DEC2)
  amount!: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.MPESA })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional({ example: 'MP9F2X3K1' })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreateSaleDtoAlias extends CreateSaleDto {}
export const DECIMAL_PATTERN = DEC;

export class UpdateSaleDto {
  @ApiPropertyOptional({ example: 'Mteja alirudisha kifurushi' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: '01JCUSTOMER...' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: '500.00', description: 'Punguzo jipya' })
  @IsOptional()
  @Matches(DEC, { message: 'Punguzo si sahihi' })
  discount?: string;

  @ApiPropertyOptional({ enum: ['CASH', 'MPESA', 'AIRTEL', 'MIXED', 'CREDIT'] })
  @IsOptional()
  @IsIn(['CASH', 'MPESA', 'AIRTEL', 'MIXED', 'CREDIT'])
  paymentMethod?: 'CASH' | 'MPESA' | 'AIRTEL' | 'MIXED' | 'CREDIT';
}

export class HoldSaleDto {
  @ApiProperty({ example: '01JSHOP...' })
  @IsString()
  shopId!: string;

  @ApiProperty({ example: 'Mteja wa meza 3' })
  @IsString()
  label!: string;

  @ApiProperty({
    description: 'Cart kamili (payload ya POS) — itarudishwa kama ilivyo',
    example: { items: [{ productId: '...', quantity: '2' }] },
  })
  @IsObject()
  payload!: Record<string, unknown>;
}
