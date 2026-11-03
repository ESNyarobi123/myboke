import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

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

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @IsString()
  unread?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class RegisterDeviceFullDto {
  @ApiProperty({ example: 'pixel-7-abc123' })
  @IsString()
  deviceId!: string;

  @ApiProperty({ enum: ['android', 'ios', 'desktop'], example: 'android' })
  @IsIn(['android', 'ios', 'desktop'])
  platform!: string;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiPropertyOptional({ description: 'FCM registration token' })
  @IsOptional()
  @IsString()
  fcmToken?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  notificationsEnabled?: boolean;
}
