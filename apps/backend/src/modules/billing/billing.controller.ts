import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BillingService } from './billing.service';
import {
  CancelSubscriptionDto,
  CheckoutDto,
  SnippeWebhookDto,
} from './dto/billing.dto';

@ApiTags('Billing')
@Controller()
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Plans zote na punguzo za muda mrefu' })
  plans() {
    return this.service.plans();
  }

  @Get('subscriptions/current')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Subscription ya sasa + matumizi na mipaka' })
  current(@CurrentUser('bid') businessId: string) {
    return this.service.current(businessId);
  }

  @Post('subscriptions/checkout')
  @Roles(Role.OWNER)
  @ApiBearerAuth('access-token')
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Zuia malipo ya mara mbili',
  })
  @ApiOperation({ summary: 'Anzisha malipo ya subscription (Snippe)' })
  checkout(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CheckoutDto,
  ) {
    return this.service.checkout(businessId, userId, dto);
  }

  @Get('subscriptions/checkout/:ref')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Hali ya malipo (poll baada ya checkout)' })
  checkoutStatus(
    @CurrentUser('bid') businessId: string,
    @Param('ref') ref: string,
  ) {
    return this.service.checkoutStatus(businessId, ref);
  }

  @Post('subscriptions/cancel')
  @Roles(Role.OWNER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Zima auto-renew' })
  cancel(
    @CurrentUser('bid') businessId: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.service.cancel(businessId, dto);
  }

  // `/billing/invoices` — `/invoices` ni ya ankara za mauzo (InvoicesController).
  @Get('billing/invoices')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Invoices za biashara' })
  invoices(
    @CurrentUser('bid') businessId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.invoices(businessId, limit ? Number(limit) : undefined);
  }

  @Public()
  @Post('webhooks/snippe')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Webhook ya Snippe — HMAC + idempotent kwa paymentKey',
  })
  webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-snippe-signature') signature: string | undefined,
    @Body() payload: SnippeWebhookDto,
  ) {
    const rawBody = req.rawBody?.toString('utf8');
    return this.service.handleWebhook(rawBody, signature, payload);
  }
}
