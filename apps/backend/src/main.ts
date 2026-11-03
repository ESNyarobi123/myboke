import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DecimalSerializerInterceptor } from './common/interceptors/decimal-serializer.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  const config = app.get(ConfigService);
  const logger = new Logger('MyBoke');

  const prefix = config.get<string>('API_PREFIX', 'v1');
  app.setGlobalPrefix(prefix);

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.enableCors({
    origin: config.get<string>('CORS_ORIGINS', '*').split(','),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      // `enableImplicitConversion` imezimwa kwa makusudi: inabadilisha
      // `"false"` kuwa `true` (Boolean('false') === true) na kuvunja
      // booleans za multipart/query. DTOs zinatumia @Type()/@ToBoolean().
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new DecimalSerializerInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('MyBoke API')
    .setDescription(
      [
        'MyBoke — Business OS kwa wafanyabiashara wa Afrika Mashariki.',
        '',
        '**Kanuni:**',
        '- Pesa ni `string` (`"12400.00"`) — kamwe sio JSON float.',
        '- Tarehe ni ISO-8601 UTC.',
        '- POST za pesa zinahitaji `Idempotency-Key` header.',
        '- Tenant (`businessId`) inatoka kwenye JWT — haipitwi kwenye URL.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('Auth', 'Usajili, kuingia, token refresh')
    .addTag('Businesses', 'Biashara (tenant) na wanachama')
    .addTag('Shops', 'Maduka')
    .addTag('Products', 'Bidhaa na categories')
    .addTag('Stock', 'Stock levels na movements')
    .addTag('Sales', 'Mauzo, risiti na refunds')
    .addTag('Customers', 'Wateja')
    .addTag('Debts', 'Madeni na malipo')
    .addTag('Expenses', 'Gharama')
    .addTag('Categories', 'Categories za bidhaa')
    .addTag('Suppliers', 'Wasambazaji na purchase orders')
    .addTag('Shifts', 'Shifts na cash drawer')
    .addTag('Reports', 'Ripoti na dashboard')
    .addTag('Analytics', 'Uchambuzi wa data')
    .addTag('Dashboard', 'Muhtasari wa Home')
    .addTag('Exports', 'Export Excel / CSV / JSON')
    .addTag('Sync', 'Offline sync push/pull')
    .addTag('Growth', 'Missions, BokeCoins, demand, posters, assistant')
    .addTag('Billing', 'Plans, subscriptions na invoices')
    .addTag('Partners', 'Programu ya mawakala na commission')
    .addTag('Admin', 'Udhibiti wa jukwaa (SUPER_ADMIN)')
    .addTag('Notifications', 'Taarifa na vifaa (FCM)')
    .addTag('Uploads', 'Presigned uploads kwa S3')
    .addTag('Health', 'Health checks')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha' },
    customSiteTitle: 'MyBoke API Docs',
  });

  const port = config.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');

  logger.log(`MyBoke API inaendesha: http://localhost:${port}/${prefix}`);
  logger.log(`Swagger:            http://localhost:${port}/docs`);
}

void bootstrap();
