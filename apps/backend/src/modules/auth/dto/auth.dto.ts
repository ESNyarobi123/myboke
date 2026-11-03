import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Salma Ally' })
  @IsString()
  @MinLength(2, { message: 'Jina liwe na herufi 2 au zaidi' })
  name!: string;

  @ApiProperty({ example: '0712345678', description: 'Namba ya simu (TZ)' })
  @Matches(/^(\+?255|0)[67]\d{8}$/, {
    message: 'Namba ya simu si sahihi (mf. 0712345678)',
  })
  phone!: string;

  @ApiPropertyOptional({ example: 'salma@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Nguvu2026', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password iwe na herufi 8 au zaidi' })
  password!: string;

  @ApiProperty({ example: 'Duka la Salma' })
  @IsString()
  @MinLength(2, { message: 'Jina la biashara liwe na herufi 2 au zaidi' })
  businessName!: string;

  @ApiPropertyOptional({ example: 'grocery' })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional({ example: 'Kinondoni' })
  @IsOptional()
  @IsString()
  shopName?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Ridhaa ya PDPA (lazima true kwa uzalishaji)',
  })
  @IsOptional()
  acceptsTerms?: boolean;
}

export class LoginDto {
  @ApiProperty({
    example: '0712345678',
    description: 'Namba ya simu AU email',
  })
  @IsString()
  identifier!: string;

  @ApiProperty({ example: 'Nguvu2026' })
  @IsString()
  @MinLength(1)
  password!: string;

  @ApiPropertyOptional({ example: 'pixel-7-abc123' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({
    example: '123456',
    description: 'A12 — code ya 2FA/TOTP (inahitajika kama 2FA imewaka)',
  })
  @IsOptional()
  @IsString()
  totp?: string;
}

export class TwoFactorSetupDto {
  @ApiProperty({ example: 'Nguvu2026', description: 'Password ya sasa' })
  @IsString()
  @MinLength(1)
  password!: string;
}

export class TwoFactorCodeDto {
  @ApiProperty({ example: '123456', description: 'Code ya authenticator app' })
  @IsString()
  @Length(6, 8)
  code!: string;
}

export class TwoFactorPasswordDto {
  @ApiProperty({ example: 'Nguvu2026' })
  @IsString()
  @MinLength(1)
  password!: string;
}

export class PinLoginDto {
  @ApiPropertyOptional({
    example: '0712345678',
    description: 'Simu ya muuzaji (au tumia memberId)',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Mwanachama ID (mbadala wa simu)' })
  @IsOptional()
  @IsString()
  memberId?: string;

  @ApiProperty({ example: '1234' })
  @Matches(/^\d{4,6}$/, { message: 'PIN iwe tarakimu 4-6' })
  pin!: string;

  @ApiPropertyOptional({ example: 'pixel-7-abc123' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class SendOtpDto {
  @ApiProperty({ example: '0712345678' })
  @Matches(/^(\+?255|0)[67]\d{8}$/, { message: 'Namba si sahihi' })
  phone!: string;

  @ApiPropertyOptional({
    enum: ['LOGIN', 'REGISTER', 'RESET'],
    default: 'LOGIN',
  })
  @IsOptional()
  @IsIn(['LOGIN', 'REGISTER', 'RESET'])
  purpose?: 'LOGIN' | 'REGISTER' | 'RESET';
}

export class VerifyOtpDto {
  @ApiProperty({ example: '0712345678' })
  @Matches(/^(\+?255|0)[67]\d{8}$/, { message: 'Namba si sahihi' })
  phone!: string;

  @ApiProperty({ example: '482913' })
  @Matches(/^\d{6}$/, { message: 'OTP ni tarakimu 6' })
  code!: string;

  @ApiPropertyOptional({
    enum: ['LOGIN', 'REGISTER', 'RESET'],
    default: 'LOGIN',
  })
  @IsOptional()
  @IsIn(['LOGIN', 'REGISTER', 'RESET'])
  purpose?: 'LOGIN' | 'REGISTER' | 'RESET';

  @ApiPropertyOptional({ example: 'Salma Ally', description: 'Kwa usajili mpya' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: '0712345678', description: 'Simu au email' })
  @IsString()
  identifier!: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Msimbo wa herufi 8 uliotumwa kwa SMS/email',
    example: 'K7M2PQ9X',
  })
  @IsString()
  @Length(6, 64)
  token!: string;

  @ApiProperty({ example: 'Nguvu2027', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class LogoutDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class SetPinDto {
  @ApiProperty({ example: '1234' })
  @Matches(/^\d{4,6}$/, { message: 'PIN iwe tarakimu 4-6' })
  pin!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  shopIds?: string[];

  @ApiPropertyOptional({ example: 'MANAGER', enum: ['MANAGER', 'CASHIER'] })
  @IsOptional()
  @IsIn(['MANAGER', 'CASHIER'])
  role?: 'MANAGER' | 'CASHIER';
}

export const SUPPORTED_LOCALES = ['sw', 'en', 'es', 'fr', 'ar'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export class UpdateLocaleDto {
  @ApiProperty({ example: 'en', enum: SUPPORTED_LOCALES })
  @IsIn(SUPPORTED_LOCALES as unknown as string[])
  locale!: SupportedLocale;
}

export class ListDevicesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  platform?: string;
}

export class RegisterDeviceDto {
  @ApiProperty({ example: 'pixel-7-abc123' })
  @IsString()
  deviceId!: string;

  @ApiProperty({ example: 'android', enum: ['android', 'ios', 'desktop'] })
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
}

export class VerifyPhoneDto {
  @ApiProperty({ example: '0712345678' })
  @Matches(/^(\+?255|0)[67]\d{8}$/, { message: 'Namba si sahihi' })
  phone!: string;

  @ApiProperty({ example: '482913' })
  @Matches(/^\d{6}$/)
  code!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  placeholder?: number;
}
