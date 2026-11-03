import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PartnersModule } from '../partners/partners.module';
import { PlatformModule } from '../platform/platform.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PartnersModule, PlatformModule, JwtModule.register({})],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
