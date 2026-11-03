import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  PinLoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
  SendOtpDto,
  TwoFactorCodeDto,
  TwoFactorPasswordDto,
  TwoFactorSetupDto,
  UpdateLocaleDto,
  VerifyOtpDto,
} from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Usajili — hutengeneza business, duka na OWNER' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('otp/send')
  @HttpCode(200)
  @ApiOperation({ summary: 'Tuma OTP kwa SMS (LOGIN · REGISTER · RESET)' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.auth.sendOtp(dto);
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Thibitisha OTP — hutengeneza akaunti kama ni mpya',
  })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  @Public()
  @Post('demo')
  @HttpCode(201)
  @ApiOperation({
    summary: 'A10 — Demo mode: tenant ya mfano yenye data (siku 1, bila usajili)',
  })
  demo() {
    return this.auth.demoSession();
  }

  // ─── 2FA (A12) ─────────────────────────────────────────────
  @Get('2fa/status')
  @ApiOperation({ summary: 'A12 — Hali ya 2FA' })
  twoFactorStatus(@CurrentUser('sub') userId: string) {
    return this.auth.twoFactorStatus(userId);
  }

  @Post('2fa/setup')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'A12 — Tengeneza secret + otpauth URL' })
  twoFactorSetup(
    @CurrentUser('sub') userId: string,
    @Body() dto: TwoFactorSetupDto,
  ) {
    return this.auth.twoFactorSetup(userId, dto.password);
  }

  @Post('2fa/enable')
  @Roles(Role.OWNER)
  @HttpCode(200)
  @ApiOperation({ summary: 'A12 — Washa 2FA (toa code) + backup codes' })
  twoFactorEnable(
    @CurrentUser('sub') userId: string,
    @Body() dto: TwoFactorCodeDto,
  ) {
    return this.auth.twoFactorEnable(userId, dto.code);
  }

  @Post('2fa/disable')
  @Roles(Role.OWNER)
  @HttpCode(200)
  @ApiOperation({ summary: 'A12 — Zima 2FA (password)' })
  twoFactorDisable(
    @CurrentUser('sub') userId: string,
    @Body() dto: TwoFactorPasswordDto,
  ) {
    return this.auth.twoFactorDisable(userId, dto.password);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Ingia kwa simu/email + password' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('login/pin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Ingia kwa PIN (muuzaji)' })
  loginPin(@Body() dto: PinLoginDto) {
    return this.auth.loginWithPin(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Badilisha refresh token (rotation)' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Ondoka — revoke refresh token' })
  logout(@Body() dto: LogoutDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @Post('logout/all')
  @ApiBearerAuth('access-token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Ondoka kwenye vifaa vyote' })
  logoutAll(@CurrentUser('sub') userId: string) {
    return this.auth.logoutAll(userId);
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(200)
  @ApiOperation({ summary: 'Omba token ya kubadilisha password' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(200)
  @ApiOperation({ summary: 'Badilisha password kwa token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Post('password/change')
  @ApiBearerAuth('access-token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Badilisha password (umeingia)' })
  changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(userId, dto);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Profaili ya mtumiaji aliyeingia' })
  me(@CurrentUser('sub') userId: string) {
    return this.auth.me(userId);
  }

  @Patch('me/locale')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Badilisha lugha (sw · en)' })
  updateLocale(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateLocaleDto,
  ) {
    return this.auth.updateLocale(userId, dto.locale);
  }

  @Get('me/export')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'PDPA — pakua data yako yote (JSON, au PDF kwa ?format=pdf)',
  })
  async exportMyData(
    @CurrentUser('sub') userId: string,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ) {
    const data = await this.auth.exportMyData(userId);
    if (format !== 'pdf') {
      res.json(data);
      return;
    }

    const pdf = await this.auth.exportMyDataPdf(data);
    res
      .status(200)
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="myboke-data-${new Date()
          .toISOString()
          .slice(0, 10)}.pdf"`,
      })
      .send(pdf);
  }

  @Delete('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'PDPA — futa akaunti' })
  deleteAccount(@CurrentUser('sub') userId: string) {
    return this.auth.deleteAccount(userId);
  }
}
