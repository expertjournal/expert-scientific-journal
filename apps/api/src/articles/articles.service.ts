import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ArticleStatus, FileKind, Role } from '@prisma/client';
import { LocalStorageService } from '../storage/local-storage.service';

import { WorkflowService } from '../modules/workflow/workflow.service';

import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateArticleDto {
  @IsNotEmpty() @IsString() title!: string;
  @IsNotEmpty() @IsString() abstract!: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() articleType?: string;
  @IsOptional() @IsString() scientificField?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) keywords?: string[];
}

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageService,
    private readonly workflow: WorkflowService
  ) {}

  async getMyArticles(userId: string) {
    return this.prisma.article.findMany({
      where: {
        submittingAuthorId: userId,
        deletedAt: null,
      },
      include: {
        authors: { include: { author: true } },
        keywords: { include: { keyword: true } },
        files: true,
        revisions: true,
      },
      orderBy: { lastUpdated: 'desc' },
    });
  }

  async createArticle(userId: string, dto: CreateArticleDto) {
    const internalId = `ART-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    return this.prisma.$transaction(async (tx) => {
      const article = await tx.article.create({
        data: {
          internalId,
          title: dto.title,
          abstract: dto.abstract,
          language: dto.language || 'ru',
          articleType: dto.articleType || 'Original Research',
          scientificField: dto.scientificField || 'General Science',
          status: ArticleStatus.DRAFT,
          submittingAuthorId: userId,
        },
      });

      // Handle keywords if provided
      if (dto.keywords && dto.keywords.length > 0) {
        for (const kwName of dto.keywords) {
          const keyword = await tx.keyword.upsert({
            where: { name: kwName.trim().toLowerCase() },
            update: {},
            create: { name: kwName.trim().toLowerCase() },
          });

          await tx.articleKeyword.create({
            data: {
              articleId: article.id,
              keywordId: keyword.id,
            },
          });
        }
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          actorId: userId,
          articleId: article.id,
          action: 'ARTICLE_CREATED_DRAFT',
          metadata: { title: dto.title },
        },
      });

      return article;
    });
  }

  async submitArticle(articleId: string, userId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article || article.deletedAt) {
      throw new NotFoundException('Article not found');
    }

    if (article.submittingAuthorId !== userId) {
      throw new ForbiddenException('Not authorized to submit this article');
    }

    if (article.status !== ArticleStatus.DRAFT && article.status !== ArticleStatus.REVISION_REQUIRED) {
      throw new BadRequestException(`Cannot submit article currently in ${article.status} state`);
    }

    const nextStatus = ArticleStatus.SUBMITTED;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.article.update({
        where: { id: articleId },
        data: {
          status: nextStatus,
          submissionDate: new Date(),
          version: { increment: 1 },
        },
      });

      await tx.articleRevision.create({
        data: {
          articleId,
          version: updated.version,
          status: nextStatus,
          note: 'Submitted by author for editorial screening',
          createdById: userId,
        },
      });

      await tx.activityLog.create({
        data: {
          actorId: userId,
          articleId,
          action: 'ARTICLE_SUBMITTED',
        },
      });

      return updated;
    });
  }

  async transitionStatus(
    articleId: string,
    targetStatus: ArticleStatus,
    editorId: string,
    note?: string
  ) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article || article.deletedAt) {
      throw new NotFoundException('Article not found');
    }

    const editor = await this.prisma.user.findUnique({ where: { id: editorId } });
    const editorRole = editor?.role || Role.EDITOR;

    // Assert workflow transition is valid for caller's role
    this.workflow.validateTransition(article.status, targetStatus, editorRole);

    return this.prisma.$transaction(async (tx) => {
      let doi = article.doi;
      if (targetStatus === ArticleStatus.PUBLISHED && !doi) {
        const journal = await tx.journal.findFirst();
        const prefix = journal?.doiPrefix ?? '10.1234/expert';
        doi = `${prefix}.${new Date().getFullYear()}.${article.id.slice(-6)}`;
      }

      const updated = await tx.article.update({
        where: { id: articleId },
        data: {
          status: targetStatus,
          doi,
          publishedAt: targetStatus === ArticleStatus.PUBLISHED ? new Date() : article.publishedAt,
          version: { increment: 1 },
        },
      });

      await tx.articleRevision.create({
        data: {
          articleId,
          version: updated.version,
          status: targetStatus,
          note: note || `Status transitioned to ${targetStatus}`,
          createdById: editorId,
        },
      });

      await tx.activityLog.create({
        data: {
          actorId: editorId,
          articleId,
          action: `ARTICLE_STATUS_CHANGED_${targetStatus}`,
          metadata: { note },
        },
      });

      return updated;
    });
  }

  async attachFile(
    articleId: string,
    userId: string,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    kind: FileKind = FileKind.MANUSCRIPT
  ) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article || article.deletedAt) {
      throw new NotFoundException('Article not found');
    }

    const { objectKey, checksum, size, virusScanStatus } =
      await this.storage.saveFile(fileBuffer, originalName);

    const fileVersion = (await this.prisma.articleFile.count({ where: { articleId } })) + 1;

    return this.prisma.articleFile.create({
      data: {
        articleId,
        uploadedById: userId,
        version: fileVersion,
        kind,
        objectKey,
        originalName,
        mimeType,
        size,
        checksum,
        virusScanStatus,
      },
    });
  }
}
