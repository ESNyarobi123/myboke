import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthService } from '../auth/auth.service';
import { SetPinDto } from '../auth/dto/auth.dto';
import { BusinessesService } from './businesses.service';
import {
  CreateBusinessDto,
  InviteMemberDto,
  UpdateBusinessDto,
  UpdateMemberDto,
} from './dto/business.dto';

@ApiTags('Businesses')
@ApiBearerAuth('access-token')
@Controller('businesses')
export class BusinessesController {
  constructor(
    private readonly service: BusinessesService,
    private readonly auth: AuthService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tengeneza biashara mpya (tenant)' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateBusinessDto) {
    return this.service.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Biashara zangu zote' })
  listMine(@CurrentUser('sub') userId: string) {
    return this.service.listMine(userId);
  }

  @Get('current')
  @ApiOperation({ summary: 'Biashara ya sasa (kutoka JWT)' })
  current(@CurrentUser('bid') businessId: string) {
    return this.service.current(businessId);
  }

  @Patch('current')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Badilisha biashara ya sasa' })
  updateCurrent(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('role') role: Role,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.service.update(businessId, role, dto);
  }

  @Get('current/members')
  @ApiOperation({ summary: 'Wanachama wa biashara ya sasa' })
  membersCurrent(@CurrentUser('bid') businessId: string) {
    return this.service.members(businessId);
  }

  @Post('current/members/invite')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Ongeza mwanachama' })
  inviteCurrent(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('role') role: Role,
    @Body() dto: InviteMemberDto,
  ) {
    return this.service.invite(businessId, role, dto);
  }

  @Delete('current/members/:memberId')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Ondoa mwanachama (biashara ya sasa)' })
  removeCurrent(
    @CurrentUser('bid') businessId: string,
    @CurrentUser('role') role: Role,
    @Param('memberId') memberId: string,
  ) {
    return this.service.removeMember(businessId, role, memberId);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Biashara kwa ID (lazima uwe mwanachama)' })
  getById(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.service.assertAccess(userId, id);
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Badilisha biashara kwa ID' })
  updateById(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.service.update(id, role, dto, userId);
  }

  @Get(':id/members')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Wanachama wa biashara' })
  members(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.service.members(id, userId);
  }

  @Post(':id/members/invite')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Ongeza mwanachama kwenye biashara' })
  invite(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role,
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.service.invite(id, role, dto, userId);
  }

  @Patch(':id/members/:memberId')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Badilisha mwanachama (role · shops · hali)' })
  updateMember(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.service.updateMember(id, role, memberId, dto, userId);
  }

  @Post(':id/members/:memberId/pin')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Weka PIN ya muuzaji' })
  async setPin(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: SetPinDto,
  ) {
    await this.service.assertAccess(userId, id);
    return this.auth.setPin(id, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Ondoa mwanachama' })
  remove(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: Role,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.service.removeMember(id, role, memberId, userId);
  }
}
