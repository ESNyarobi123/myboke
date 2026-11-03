import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class ApiKeyDto {
  @ApiProperty({ example: 'POS Integration' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ type: [String], example: ['read', 'write'] })
  @IsOptional()
  @IsArray()
  scopes?: string[];
}

export class WebhookDto {
  @ApiProperty({ example: 'https://example.com/myboke/hook' })
  @Matches(/^https?:\/\/.+/, { message: 'URL si sahihi' })
  url!: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['sale.created', 'payment.received'],
  })
  @IsOptional()
  @IsArray()
  events?: string[];
}

export class UpdateWebhookDto {
  @ApiPropertyOptional({ example: 'https://example.com/hook' })
  @IsOptional()
  @Matches(/^https?:\/\/.+/, { message: 'URL si sahihi' })
  url?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  events?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: boolean;
}

export class FeedbackDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: 'App ni rahisi sana kutumia!' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class DigestDto {
  @ApiPropertyOptional({ enum: ['WHATSAPP', 'EMAIL'], default: 'WHATSAPP' })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiProperty({ example: '0712345678' })
  @IsString()
  @MinLength(5)
  destination!: string;
}

export class ApiKeyScopesDto {
  @ApiProperty({ type: [String], example: ['read'] })
  @IsArray()
  @ArrayMinSize(1)
  scopes!: string[];
}
