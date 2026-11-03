import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommissionStatus, Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreatePartnerDto,
  UpdatePartnerDto,
  ValidateReferralDto,
} from './dto/partner.dto';
import { PartnersService } from './partners.service';

@ApiTags('Partners')
@Controller()
export class PartnersController {
  constructor(private readonly service: PartnersService) {}

  @Get('partners/me')
  @ApiBearerAuth('access-token')
  @Roles(Role.PARTNER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Profaili ya wakala + takwimu za commission' })
  me(@CurrentUser('sub') userId: string) {
    return this.service.me(userId);
  }

  @Get('partners/me/commissions')
  @ApiBearerAuth('access-token')
  @Roles(Role.PARTNER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Commission zangu' })
  myCommissions(
    @CurrentUser('sub') userId: string,
    @Query('status') status?: CommissionStatus,
  ) {
    return this.service.myCommissions(userId, status);
  }

  @Public()
  @Post('referrals/validate')
  @ApiOperation({ summary: 'Thibitisha code ya referral' })
  validate(@Body() dto: ValidateReferralDto) {
    return this.service.validateReferral(dto.code);
  }

  // ── Owner-side registry ───────────────────────────────────
  @Get('partners')
  @ApiBearerAuth('access-token')
  @Roles(Role.OWNER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Orodha ya mawakala' })
  list(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({
      q,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('partners')
  @ApiBearerAuth('access-token')
  @Roles(Role.OWNER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Sajili wakala mpya' })
  create(
    @CurrentUser('bid') businessId: string,
    @Body() dto: CreatePartnerDto,
  ) {
    return this.service.create(dto, businessId);
  }

  @Patch('partners/:id')
  @ApiBearerAuth('access-token')
  @Roles(Role.OWNER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Badilisha wakala' })
  update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    return this.service.update(id, dto);
  }
}
