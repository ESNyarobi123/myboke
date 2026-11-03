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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ListNotificationsQueryDto,
  RegisterDeviceFullDto,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller()
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('notifications')
  @ApiOperation({ summary: 'Taarifa zangu (unread count ikiwemo)' })
  list(
    @CurrentUser('sub') userId: string,
    @Query() q: ListNotificationsQueryDto,
  ) {
    return this.service.list(userId, q);
  }

  @Patch('notifications/read-all')
  @ApiOperation({ summary: 'Weka zote kama zimesomwa' })
  readAll(@CurrentUser('sub') userId: string) {
    return this.service.markAllRead(userId);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Weka taarifa moja kama imesomwa' })
  read(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.service.markRead(userId, id);
  }

  @Delete('notifications/:id')
  @ApiOperation({ summary: 'Futa taarifa' })
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.service.remove(userId, id);
  }

  @Post('devices')
  @ApiOperation({ summary: 'Sajili kifaa + FCM token' })
  registerDevice(
    @CurrentUser('sub') userId: string,
    @Body() dto: RegisterDeviceFullDto,
  ) {
    return this.service.registerDevice(userId, dto);
  }

  @Get('devices')
  @ApiOperation({ summary: 'Vifaa vyangu' })
  devices(@CurrentUser('sub') userId: string) {
    return this.service.devices(userId);
  }

  @Delete('devices/:id')
  @ApiOperation({ summary: 'Ondoa kifaa' })
  removeDevice(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.service.removeDevice(userId, id);
  }
}
