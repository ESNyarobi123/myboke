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
import { CreateBundleDto, UpdateBundleDto } from './dto/product-extra.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@ApiBearerAuth('access-token')
@Controller('bundles')
export class BundlesController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Bundles / vifurushi (C15)' })
  list(@CurrentUser('bid') businessId: string) {
    return this.service.listBundles(businessId);
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Unda bundle la bidhaa 2+' })
  create(@CurrentUser('bid') businessId: string, @Body() dto: CreateBundleDto) {
    return this.service.createBundle(businessId, dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Badilisha bundle' })
  update(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBundleDto,
  ) {
    return this.service.updateBundle(businessId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Zima bundle' })
  remove(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.deleteBundle(businessId, id);
  }
}
