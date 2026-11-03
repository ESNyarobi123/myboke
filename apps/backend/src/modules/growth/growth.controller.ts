import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AssistantChatDto,
  CompleteMissionDto,
  CreateDemandDto,
  CreatePosterDto,
  RedeemCoinsDto,
} from './dto/growth.dto';
import { GrowthService } from './growth.service';

@ApiTags('Growth')
@ApiBearerAuth('access-token')
@Controller()
export class GrowthController {
  constructor(private readonly service: GrowthService) {}

  // ── Suggestions + streaks ─────────────────────────────────
  @Get('growth/restock-suggestions')
  @ApiOperation({ summary: 'Mapendekezo ya kuagiza stock (demand + msimu · H11)' })
  restock(
    @CurrentUser('bid') businessId: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.service.restockSuggestions(businessId, shopId);
  }

  @Get('growth/price-suggestions')
  @ApiOperation({ summary: 'Mapendekezo ya bei (margin + mauzo · H12)' })
  prices(
    @CurrentUser('bid') businessId: string,
    @Query('targetMargin') targetMargin?: string,
  ) {
    return this.service.priceSuggestions(
      businessId,
      targetMargin ? Number(targetMargin) : undefined,
    );
  }

  @Get('growth/streaks')
  @ApiOperation({ summary: 'Streaks na badges za mtumiaji (H13)' })
  streaks(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.streaks(businessId, userId);
  }

  // ── Missions ──────────────────────────────────────────────
  @Get('missions/today')
  @ApiOperation({ summary: 'Missions 3 za leo (huzalishwa kutoka data halisi)' })
  today(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.missionsToday(businessId, userId);
  }

  @Get('missions')
  @ApiOperation({ summary: 'Historia ya missions' })
  history(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.missionsHistory(
      businessId,
      userId,
      limit ? Number(limit) : undefined,
    );
  }

  @Post('missions/:id/complete')
  @ApiOperation({ summary: 'Kamilisha mission — hulipa coins' })
  complete(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() _dto: CompleteMissionDto,
  ) {
    return this.service.completeMission(businessId, userId, id);
  }

  @Get('missions/:id/impact')
  @ApiOperation({ summary: 'Impact ya mission baada ya siku 7' })
  impact(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.missionImpact(businessId, userId, id);
  }

  // ── BokeCoins ─────────────────────────────────────────────
  @Get('coins/balance')
  @ApiOperation({ summary: 'Salio la BokeCoins' })
  balance(@CurrentUser('sub') userId: string) {
    return this.service.balance(userId);
  }

  @Get('coins/transactions')
  @ApiOperation({ summary: 'Historia ya coins' })
  transactions(
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.transactions(userId, limit ? Number(limit) : undefined);
  }

  @Post('coins/redeem')
  @ApiOperation({ summary: 'Tumia coins (airtime · voucher · poster)' })
  redeem(@CurrentUser('sub') userId: string, @Body() dto: RedeemCoinsDto) {
    return this.service.redeem(userId, dto);
  }

  // ── Demand ────────────────────────────────────────────────
  @Post('demand')
  @ApiOperation({ summary: 'Rekodi ombi la mteja (+10 coins)' })
  demand(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateDemandDto,
  ) {
    return this.service.createDemand(businessId, userId, dto);
  }

  @Get('demand/report')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Ripoti ya mahitaji + leaderboard ya ward' })
  demandReport(
    @CurrentUser('bid') businessId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.demandReport(businessId, {
      from,
      to,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // ── Posters ───────────────────────────────────────────────
  @Post('posters')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Tengeneza poster (SVG/HTML) — coins 50' })
  poster(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreatePosterDto,
  ) {
    return this.service.createPoster(businessId, userId, dto);
  }

  // ── Recommendations ───────────────────────────────────────
  @Get('recommendations')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Mapendekezo yenye data halisi' })
  recommendations(@CurrentUser('bid') businessId: string) {
    return this.service.recommendations(businessId);
  }

  // ── Assistant ─────────────────────────────────────────────
  @Post('assistant/chat')
  @ApiOperation({ summary: 'Uliza AI kuhusu biashara yako' })
  chat(
    @CurrentUser('bid') businessId: string,
    @Body() dto: AssistantChatDto,
  ) {
    return this.service.chat(businessId, dto);
  }
}
