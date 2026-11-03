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
import { CreateCategoryDto } from './dto/product.dto';
import { UpdateCategoryDto } from './dto/product-extra.dto';
import { ProductsService } from './products.service';

@ApiTags('Categories')
@ApiBearerAuth('access-token')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Categories zote za biashara' })
  list(@CurrentUser('bid') businessId: string) {
    return this.service.categories(businessId);
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Ongeza category' })
  create(
    @CurrentUser('bid') businessId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.service.createCategory(businessId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Category moja' })
  async get(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    const all = await this.service.categories(businessId);
    return all.find((c) => c.id === id) ?? null;
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Badilisha category' })
  update(
    @CurrentUser('bid') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.updateCategory(businessId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Futa category' })
  remove(@CurrentUser('bid') businessId: string, @Param('id') id: string) {
    return this.service.deleteCategory(businessId, id);
  }
}
