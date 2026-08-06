import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ArticleStatus } from '@prisma/client';

export interface SearchQueryOptions {
  query?: string;
  journalId?: string;
  year?: number;
  articleType?: string;
  scientificField?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchArticles(options: SearchQueryOptions) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      status: ArticleStatus.PUBLISHED,
      deletedAt: null,
    };

    if (options.journalId && options.journalId.trim()) {
      where.issue = { journalId: options.journalId };
    }

    if (options.year) {
      where.issue = { ...where.issue, year: options.year };
    }

    if (options.articleType) {
      where.articleType = options.articleType;
    }

    if (options.scientificField) {
      where.scientificField = options.scientificField;
    }

    if (options.query && options.query.trim()) {
      const q = options.query.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { abstract: { contains: q, mode: 'insensitive' } },
        { doi: { contains: q, mode: 'insensitive' } },
        { internalId: { contains: q, mode: 'insensitive' } },
        {
          authors: {
            some: {
              author: {
                fullName: { contains: q, mode: 'insensitive' },
              },
            },
          },
        },
        {
          keywords: {
            some: {
              keyword: {
                name: { contains: q, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          issue: { include: { journal: true } },
          authors: { include: { author: true } },
          keywords: { include: { keyword: true } },
          files: { where: { deletedAt: null } },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
