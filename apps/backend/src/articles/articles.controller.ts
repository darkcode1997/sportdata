import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { QueryArticlesDto } from './dto/query-articles.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get('admin/list')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT)
  findAdmin(@Query() query: QueryArticlesDto) {
    return this.articlesService.findAdmin(query);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT)
  findAdminById(@Param('id') id: string) {
    return this.articlesService.findAdminById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT)
  create(@Body() dto: CreateArticleDto) {
    return this.articlesService.create(dto);
  }

  @Get()
  findPublished(@Query() query: QueryArticlesDto) {
    return this.articlesService.findPublished(query);
  }

  @Get(':slug')
  findPublishedBySlug(@Param('slug') slug: string) {
    return this.articlesService.findPublishedBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT)
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.articlesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.articlesService.remove(id);
  }
}
