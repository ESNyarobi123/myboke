import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Mama Salma' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: '0712345678' })
  @IsOptional()
  @Matches(/^(\+?255|0)[67]\d{8}$/, { message: 'Namba si sahihi' })
  phone?: string;

  @ApiPropertyOptional({ example: 'salma@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '50000.00', description: 'Kikomo cha deni' })
  @IsOptional()
  @Matches(/^\d{1,15}(\.\d{1,2})?$/)
  creditLimit?: string;

  @ApiPropertyOptional({ example: 'Mteja wa jumla' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: '1990-05-12' })
  @IsOptional()
  @IsString()
  birthday?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}

export class ListCustomersQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}

export class CampaignDto {
  @ApiProperty({
    enum: ['ALL', 'LOYAL', 'NEW', 'LOST', 'DEBTORS', 'CUSTOM'],
    example: 'DEBTORS',
  })
  @IsIn(['ALL', 'LOYAL', 'NEW', 'LOST', 'DEBTORS', 'CUSTOM'])
  segment!: 'ALL' | 'LOYAL' | 'NEW' | 'LOST' | 'DEBTORS' | 'CUSTOM';

  @ApiPropertyOptional({
    type: [String],
    description: 'Inahitajika kama segment = CUSTOM',
  })
  @IsOptional()
  customerIds?: string[];

  @ApiProperty({
    example: 'Habari {jina}! Tunakukumbusha deni lako la {salio} TZS.',
  })
  @IsString()
  @MinLength(3)
  message!: string;
}

export class ListBirthdaysQueryDto {
  @ApiPropertyOptional({ example: '11', description: 'Mwezi 1–12 (default: mwezi huu)' })
  @IsOptional()
  month?: string;

  @ApiPropertyOptional({ example: '30', description: 'Siku zijazo' })
  @IsOptional()
  days?: string;
}
