import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { PrismaModule } from './infra/prisma/prisma.module';
import { PushModule } from './infra/push/push.module';
import { SmsModule } from './infra/sms/sms.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthAttemptsGuard } from './common/guards/auth-attempts.guard';

import { AppConfigModule } from './modules/app-config/app-config.module';
import { ObservabilityModule } from './common/observability/observability.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { ShopsModule } from './modules/shops/shops.module';
import { ProductsModule } from './modules/products/products.module';
import { StockModule } from './modules/stock/stock.module';
import { SalesModule } from './modules/sales/sales.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DebtsModule } from './modules/debts/debts.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { SyncModule } from './modules/sync/sync.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { BackupModule } from './modules/backup/backup.module';
import { ExportsModule } from './modules/exports/exports.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { GrowthModule } from './modules/growth/growth.module';
import { BillingModule } from './modules/billing/billing.module';
import { PartnersModule } from './modules/partners/partners.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { PlatformModule } from './modules/platform/platform.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret_change_me',
        signOptions: {
          expiresIn: (process.env.JWT_ACCESS_TTL ?? '15m') as never,
        },
      }),
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 100),
      },
    ]),
    PrismaModule,
    SmsModule,
    PushModule,
    HealthModule,
    AppConfigModule,
    ObservabilityModule,
    AuthModule,
    BusinessesModule,
    ShopsModule,
    ProductsModule,
    StockModule,
    SalesModule,
    ShiftsModule,
    CustomersModule,
    DebtsModule,
    ExpensesModule,
    SyncModule,
    ReportsModule,
    AnalyticsModule,
    ExportsModule,
    InvoicesModule,
    GrowthModule,
    BackupModule,
    BillingModule,
    PartnersModule,
    AdminModule,
    NotificationsModule,
    UploadsModule,
    PurchaseOrdersModule,
    JobsModule,
    PlatformModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthAttemptsGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
