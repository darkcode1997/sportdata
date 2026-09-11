import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { CreateDivisionDto } from './dto/create-division.dto';
import { UpdateDivisionDto } from './dto/update-division.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories with filters' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  findAll(@Query() query: QueryCategoriesDto) {
    return this.categoriesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category found' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update category by ID' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete category by ID' })
  @ApiResponse({ status: 204, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }

  @Post(':categoryId/divisions')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create a division under a category' })
  @ApiResponse({ status: 201, description: 'Division created successfully' })
  createDivision(
    @Param('categoryId') categoryId: string,
    @Body() createDivisionDto: CreateDivisionDto,
  ) {
    return this.categoriesService.createDivision({
      ...createDivisionDto,
      categoryId,
    });
  }

  @Get(':categoryId/divisions')
  @ApiOperation({ summary: 'Get all divisions for a category' })
  @ApiResponse({ status: 200, description: 'Divisions retrieved successfully' })
  findDivisions(@Param('categoryId') categoryId: string) {
    return this.categoriesService.findDivisionsByCategory(categoryId);
  }
}

@ApiTags('divisions')
@Controller('divisions')
export class DivisionsController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get division by ID' })
  @ApiResponse({ status: 200, description: 'Division found' })
  @ApiResponse({ status: 404, description: 'Division not found' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOneDivision(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update division by ID' })
  @ApiResponse({ status: 200, description: 'Division updated successfully' })
  @ApiResponse({ status: 404, description: 'Division not found' })
  update(
    @Param('id') id: string,
    @Body() updateDivisionDto: UpdateDivisionDto,
  ) {
    return this.categoriesService.updateDivision(id, updateDivisionDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete division by ID' })
  @ApiResponse({ status: 204, description: 'Division deleted successfully' })
  @ApiResponse({ status: 404, description: 'Division not found' })
  remove(@Param('id') id: string) {
    return this.categoriesService.removeDivision(id);
  }
}
