import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ApiKeyDto,
  DigestDto,
  FeedbackDto,
  WebhookDto,
  UpdateWebhookDto,
} from './dto/platform.dto';
import { PlatformService } from './platform.service';

@ApiTags('Platform')
@ApiBearerAuth('access-token')
@Controller()
export class PlatformController {
  constructor(private readonly service: PlatformService) {}

  // ── Audit log ─────────────────────────────────────────────
  @Get('audit-logs')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Kumbukumbu za mabadiliko ya pesa (I13)' })
  @ApiQuery({ name: 'entity', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  auditLogs(
    @CurrentUser('bid') businessId: string,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.service.auditLogs(businessId, {
      entity,
      action,
      userId,
      from,
      to,
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }

  @Get('audit-logs/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Kumbukumbu moja' })
  auditLog(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.auditLog(businessId, id);
  }

  // ── API keys ──────────────────────────────────────────────
  @Get('api-keys')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'API keys za biashara (I16)' })
  apiKeys(@CurrentUser('bid') businessId: string) {
    return this.service.apiKeys(businessId);
  }

  @Post('api-keys')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Tengeneza API key (inaonyeshwa mara moja)' })
  createApiKey(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ApiKeyDto,
  ) {
    return this.service.createApiKey(businessId, userId, dto);
  }

  @Delete('api-keys/:id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Zima API key' })
  revokeApiKey(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.revokeApiKey(businessId, userId, id);
  }

  // ── Webhooks ──────────────────────────────────────────────
  @Get('webhooks')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Webhooks za biashara (I16)' })
  webhooks(@CurrentUser('bid') businessId: string) {
    return this.service.webhooks(businessId);
  }

  @Post('webhooks')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Ongeza webhook (HMAC secret)' })
  createWebhook(
    @CurrentUser('bid') businessId: string,
    @Body() dto: WebhookDto,
  ) {
    return this.service.createWebhook(businessId, dto);
  }

  @Patch('webhooks/:id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Badilisha webhook' })
  updateWebhook(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.service.updateWebhook(businessId, id, dto);
  }

  @Delete('webhooks/:id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Futa webhook' })
  deleteWebhook(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.deleteWebhook(businessId, id);
  }

  @Get('webhooks/:id/deliveries')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Historia ya deliveries za webhook' })
  deliveries(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.deliveries(businessId, id, limit ? Number(limit) : 50);
  }

  @Post('webhooks/:id/test')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Tuma event ya jaribio' })
  testWebhook(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.testWebhook(businessId, id);
  }

  // ── Feedback ──────────────────────────────────────────────
  @Post('feedback')
  @ApiOperation({ summary: 'Rate us — tathmini ya app (I7)' })
  feedback(
    @CurrentUser('sub') userId: string,
    @CurrentUser('bid') businessId: string | undefined,
    @Body() dto: FeedbackDto,
  ) {
    return this.service.feedback(userId, businessId, dto);
  }

  // ── Daily digest ──────────────────────────────────────────
  @Get('digest')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Usajili wa muhtasari wa kila siku (G11)' })
  digests(@CurrentUser('bid') businessId: string) {
    return this.service.digests(businessId);
  }

  @Post('digest')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Jisajili kupata muhtasari wa kila siku' })
  subscribeDigest(
    @CurrentUser('bid') businessId: string,
    @Body() dto: DigestDto,
  ) {
    return this.service.subscribeDigest(businessId, dto);
  }

  @Delete('digest/:id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Acha kupokea muhtasari' })
  unsubscribe(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
  ) {
    return this.service.unsubscribeDigest(businessId, id);
  }
}
