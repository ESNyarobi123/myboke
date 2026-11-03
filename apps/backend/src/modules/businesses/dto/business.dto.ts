import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

export class CreateBusinessDto {
  @ApiProperty({ example: 'Duka la Salma' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: 'grocery' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'TZS' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Duka Kuu' })
  @IsOptional()
  @IsString()
  shopName?: string;

  @ApiPropertyOptional({ example: 'Kinondoni, Dar es Salaam' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: true, description: 'Anzisha trial ya siku 14' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  withTrial?: boolean;
}

export class UpdateBusinessDto {
  @ApiPropertyOptional({ example: 'Duka la Salma' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'grocery' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'TZS' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: '123-456-789' })
  @IsOptional()
  @IsString()
  tin?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  vatEnabled?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Imeandikishwa VAT (TRA)' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isVatRegistered?: boolean;

  @ApiPropertyOptional({
    example: '0.18',
    description: 'Kiwango cha VAT kama decimal (0.18 = 18%)',
  })
  @IsOptional()
  @Matches(/^0(\.\d{1,4})?$/, { message: 'VAT rate iwe kati ya 0 na 1' })
  vatRate?: string;

  @ApiPropertyOptional({ example: '40012345' })
  @IsOptional()
  @IsString()
  vatNumber?: string;

  @ApiPropertyOptional({ example: 'TZ0001234' })
  @IsOptional()
  @IsString()
  efdSerial?: string;
}

export class InviteMemberDto {
  @ApiProperty({ example: '0712345678' })
  @Matches(/^(\+?255|0)[67]\d{8}$/, { message: 'Namba si sahihi' })
  phone!: string;

  @ApiProperty({ example: 'Juma Hassan' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ enum: Role, example: Role.CASHIER })
  @IsEnum(Role)
  role!: Role;

  @ApiPropertyOptional({ type: [String], description: 'Shop IDs' })
  @IsOptional()
  @IsString({ each: true })
  shopIds?: string[];

  @ApiPropertyOptional({ example: '1234', description: 'PIN ya muuzaji' })
  @IsOptional()
  @Matches(/^\d{4,6}$/, { message: 'PIN iwe tarakimu 4-6' })
  pin?: string;
}

export class UpdateMemberDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsString({ each: true })
  shopIds?: string[];
}
