import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PresignUploadDto {
  @ApiProperty({
    enum: ['avatar', 'product', 'receipt', 'poster', 'document', 'logo'],
    example: 'product',
  })
  @IsIn(['avatar', 'product', 'receipt', 'poster', 'document', 'logo'])
  kind!: 'avatar' | 'product' | 'receipt' | 'poster' | 'document' | 'logo';

  @ApiProperty({ example: 'soda.png' })
  @IsString()
  filename!: string;

  @ApiProperty({ example: 'image/png' })
  @IsString()
  contentType!: string;

  @ApiPropertyOptional({ example: 524288, description: 'Bytes (max 10 MB)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(10 * 1024 * 1024)
  size?: number;
}
