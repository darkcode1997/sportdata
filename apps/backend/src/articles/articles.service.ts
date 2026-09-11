import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { QueryArticlesDto } from './dto/query-articles.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateArticleDto) {
    const slug = await this.uniqueSlug(dto.slug || dto.title);
    const isPublished = dto.isPublished ?? false;
    return this.prisma.article.create({
      data: {
        title: dto.title.trim(),
        slug,
        excerpt: this.optional(dto.excerpt),
        content: dto.content.trim(),
        coverImageUrl: this.optional(dto.coverImageUrl),
        isPublished,
        isFeatured: dto.isFeatured ?? false,
        publishedAt: isPublished ? new Date(dto.publishedAt || Date.now()) : null,
      },
    });
  }

  findPublished(query: QueryArticlesDto) {
    return this.findAll({ ...query, isPublished: true });
  }

  findAdmin(query: QueryArticlesDto) {
    return this.findAll(query);
  }

  async findPublishedBySlug(slug: string) {
    const article = await this.prisma.article.findFirst({
      where: { slug, isPublished: true },
    });
    if (!article) throw new NotFoundException('Không tìm thấy bài viết');
    return article;
  }

  async findAdminById(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Không tìm thấy bài viết');
    return article;
  }

  async update(id: string, dto: UpdateArticleDto) {
    const existing = await this.findAdminById(id);
    const isPublished = dto.isPublished ?? existing.isPublished;
    const nextSlug = dto.slug && dto.slug !== existing.slug
      ? await this.uniqueSlug(dto.slug, id)
      : existing.slug;

    return this.prisma.article.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        slug: nextSlug,
        ...(dto.excerpt !== undefined ? { excerpt: this.optional(dto.excerpt) } : {}),
        ...(dto.content !== undefined ? { content: dto.content.trim() } : {}),
        ...(dto.coverImageUrl !== undefined
          ? { coverImageUrl: this.optional(dto.coverImageUrl) }
          : {}),
        isPublished,
        ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
        publishedAt: isPublished
          ? new Date(dto.publishedAt || existing.publishedAt || Date.now())
          : null,
      },
    });
  }

  async remove(id: string) {
    await this.findAdminById(id);
    await this.prisma.article.delete({ where: { id } });
    return { id };
  }

  private async findAll(query: QueryArticlesDto) {
    const page = query.page || 1;
    const limit = query.limit || 12;
    const search = query.search?.trim();
    const where = {
      ...(query.isPublished !== undefined ? { isPublished: query.isPublished } : {}),
      ...(query.isFeatured !== undefined ? { isFeatured: query.isFeatured } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { excerpt: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.article.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private async uniqueSlug(value: string, excludedId?: string) {
    const base = this.slugify(value) || `bai-viet-${Date.now()}`;
    let slug = base;
    let suffix = 2;
    while (await this.prisma.article.findFirst({
      where: { slug, ...(excludedId ? { id: { not: excludedId } } : {}) },
      select: { id: true },
    })) {
      slug = `${base}-${suffix++}`;
    }
    return slug;
  }

  private slugify(value: string) {
    return value
      .trim()
      .toLocaleLowerCase('vi')
      .replace(/đ/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 180);
  }

  private optional(value?: string | null) {
    const normalized = value?.trim();
    return normalized || null;
  }
}
