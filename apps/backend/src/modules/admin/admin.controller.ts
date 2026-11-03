import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreatePartnerDto,
  SettleCommissionDto,
} from '../partners/dto/partner.dto';
import { PartnersService } from '../partners/partners.service';
import { PlatformService } from '../platform/platform.service';
import { AdminService } from './admin.service';

export class ImpersonateDto {
  @ApiPropertyOptional({ example: 'Msaada wa simu — mteja hawezi kuingia' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Shop ya kuanzia' })
  @IsOptional()
  @IsString()
  shopId?: string;
}

export class ExtendSubscriptionDto {
  @ApiProperty({ example: 7, minimum: -90, maximum: 90 })
  @IsInt()
  @Min(-90)
  @Max(90)
  days!: number;

  @ApiPropertyOptional({ example: 'Goodwill — downtime ya jana' })
  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@Roles(Role.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly service: AdminService,
    private readonly partners: PartnersService,
    private readonly platform: PlatformService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Takwimu za jukwaa zima' })
  overview() {
    return this.service.overview();
  }

  @Get('businesses')
  @ApiOperation({ summary: 'Biashara zote (cursor pagination)' })
  businesses(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.service.businesses({
      q,
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }

  @Get('businesses/:id')
  @ApiOperation({ summary: 'Undani wa biashara moja' })
  business(@Param('id') id: string) {
    return this.service.businessDetail(id);
  }

  @Post('businesses/:id/impersonate')
  @ApiOperation({
    summary: 'Ingia kama mmiliki wa biashara (audit-logged, saa 1)',
  })
  impersonate(
    @Param('id') id: string,
    @CurrentUser('sub') actorId: string,
    @Body() dto: ImpersonateDto,
    @Req() req: { ip?: string },
  ) {
    return this.service.impersonate(id, actorId, {
      reason: dto.reason,
      ip: req.ip,
      shopId: dto.shopId,
    });
  }

  @Post('subscriptions/:id/extend')
  @ApiOperation({ summary: 'Ongeza siku kwenye subscription' })
  extendSubscription(
    @Param('id') id: string,
    @CurrentUser('sub') actorId: string,
    @Body() dto: ExtendSubscriptionDto,
  ) {
    return this.service.extendSubscription(id, dto.days, actorId, {
      reason: dto.reason,
    });
  }

  @Get('sync-issues')
  @ApiOperation({ summary: 'Migongano ya sync inayojirudia' })
  syncIssues(
    @Query('limit') limit?: string,
    @Query('deviceId') deviceId?: string,
    @Query('entity') entity?: string,
  ) {
    return this.service.syncIssues({
      limit: limit ? Number(limit) : undefined,
      deviceId,
      entity,
    });
  }

  @Get('partners')
  @ApiOperation({ summary: 'Mawakala wote' })
  partnerList(@Query('q') q?: string) {
    return this.partners.list({ q });
  }

  @Post('partners')
  @ApiOperation({ summary: 'Sajili wakala' })
  createPartner(@Body() dto: CreatePartnerDto) {
    return this.partners.create(dto);
  }

  @Post('commissions/:id/settle')
  @ApiOperation({ summary: 'Lipa / kubali commission ya wakala' })
  settle(
    @Param('id') id: string,
    @Body() dto: SettleCommissionDto,
  ) {
    return this.partners.settle(id, dto.status ?? 'PAID', dto.note);
  }

  @Get('demand/report')
  @ApiOperation({ summary: 'Ripoti ya mahitaji ya jukwaa zima (B2B)' })
  demandReport(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.demandReport({ from, to });
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Subscriptions zote' })
  subscriptions(@Query('limit') limit?: string) {
    return this.service.subscriptions(limit ? Number(limit) : undefined);
  }

  /** Kujua ni wewe mwenyewe (helper kwa client ya admin). */
  @Get('feedback')
  @ApiOperation({ summary: 'Tathmini za app (rate us · I7)' })
  feedback() {
    return this.platform.feedbackSummary();
  }

  @Get('me')
  @ApiOperation({ summary: 'Thibitisha uko SUPER_ADMIN na uone tenant' })
  me(@CurrentUser('sub') userId: string, @CurrentUser('bid') businessId: string) {
    return { userId, businessId, role: 'SUPER_ADMIN' };
  }
}
