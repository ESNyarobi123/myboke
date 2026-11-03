import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

export class PurchaseOrderItemDto {
  @ApiPropertyOptional({ example: '01JPRODUCT...' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ example: 'Soda 500ml' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '100' })
  @Matches(/^\d{1,15}(\.\d{1,3})?$/, { message: 'Idadi si sahihi' })
  quantity!: string;

  @ApiProperty({ example: '800.00' })
  @Matches(/^\d{1,15}(\.\d{1,2})?$/, { message: 'Bei si sahihi' })
  unitCost!: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ example: '01JSUPPLIER...' })
  @IsString()
  supplierId!: string;

  @ApiProperty({ example: '01JSHOP...' })
  @IsString()
  shopId!: string;

  @ApiProperty({ type: [PurchaseOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items!: PurchaseOrderItemDto[];

  @ApiPropertyOptional({ example: 'Agiza ya wiki' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional({ example: 'Agiza ya wiki' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'SENT', 'CANCELLED'] })
  @IsOptional()
  @IsIn(['DRAFT', 'SENT', 'CANCELLED'])
  status?: 'DRAFT' | 'SENT' | 'CANCELLED';

  @ApiPropertyOptional({ type: [PurchaseOrderItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items?: PurchaseOrderItemDto[];
}

export class ReceiveItemDto {
  @ApiProperty({ example: '01JPOITEM...' })
  @IsString()
  itemId!: string;

  @ApiProperty({ example: '98' })
  @Matches(/^\d{1,15}(\.\d{1,3})?$/, { message: 'Idadi si sahihi' })
  receivedQty!: string;
}

export class ReceivePurchaseOrderDto {
  @ApiPropertyOptional({
    type: [ReceiveItemDto],
    description: 'Ikikosekana, yote yanapokelewa kwa idadi iliyoagizwa',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items?: ReceiveItemDto[];

  @ApiPropertyOptional({
    example: true,
    description: 'Sasisha bei ya kununua ya bidhaa kwa unitCost mpya',
  })
  @IsOptional()
  @ToBoolean()
  updateCostPrice?: boolean;
}
