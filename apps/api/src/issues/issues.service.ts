import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { IssueStatus, ArticleStatus } from '@prisma/client';

import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateIssueDto {
  @IsOptional() @IsString() journalId?: string;
  @IsNotEmpty() @IsInt() number!: number;
  @IsNotEmpty() @IsInt() year!: number;
  @IsOptional() @IsString() description?: string;
}

@Injectable()
export class IssuesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllIssues() {
    return this.prisma.issue.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: { year: 'desc' },
      include: {
        journal: true,
        articles: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            authors: { include: { author: true } },
          },
        },
      },
    });
  }

  async getIssueById(id: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
      include: {
        journal: true,
        articles: {
          where: { deletedAt: null },
          include: {
            authors: { include: { author: true } },
            keywords: { include: { keyword: true } },
          },
        },
      },
    });

    if (!issue || issue.deletedAt) {
      throw new NotFoundException('Issue not found');
    }

    return issue;
  }

  async createIssue(dto: CreateIssueDto) {
    let journalId = dto.journalId;
    if (!journalId) {
      const defaultJournal = await this.prisma.journal.findFirst();
      if (defaultJournal) {
        journalId = defaultJournal.id;
      } else {
        const created = await this.prisma.journal.create({
          data: {
            name: 'Expert Scientific Journal',
            issnOnline: '2712-8490',
            publisher: 'Expert Publishing House',
          },
        });
        journalId = created.id;
      }
    }

    return this.prisma.issue.create({
      data: {
        journalId,
        number: dto.number,
        year: dto.year,
        description: dto.description,
        status: IssueStatus.DRAFT,
      },
    });
  }

  async publishIssue(id: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id },
      include: { articles: true, journal: true },
    });

    if (!issue || issue.deletedAt) {
      throw new NotFoundException('Issue not found');
    }

    const journal = issue.journal || (await this.prisma.journal.findFirst());
    const prefix = journal?.doiPrefix ?? '10.1234/expert';

    return this.prisma.$transaction(async (tx) => {
      const updatedIssue = await tx.issue.update({
        where: { id },
        data: {
          status: IssueStatus.PUBLISHED,
          publicationDate: new Date(),
          version: { increment: 1 },
        },
      });

      const assignedArticles = issue.articles.filter((a) => !a.deletedAt);
      for (const article of assignedArticles) {
        const doi = article.doi || `${prefix}.${new Date().getFullYear()}.${article.id.slice(-6)}`;
        await tx.article.update({
          where: { id: article.id },
          data: {
            status: ArticleStatus.PUBLISHED,
            publishedAt: new Date(),
            doi,
          },
        });
      }

      return updatedIssue;
    });
  }

  async assignArticlesToIssue(issueId: string, articleIds: string[]) {
    const articles = await this.prisma.article.findMany({
      where: { id: { in: articleIds }, deletedAt: null },
    });

    const nonAccepted = articles.filter((a) => a.status !== ArticleStatus.ACCEPTED && a.status !== ArticleStatus.PUBLISHED);
    if (nonAccepted.length > 0) {
      const invalidIds = nonAccepted.map((a) => a.id).join(', ');
      throw new BadRequestException(`Only ACCEPTED articles can be assigned to an issue. Ineligible article IDs: [${invalidIds}]`);
    }

    return this.prisma.article.updateMany({
      where: { id: { in: articleIds } },
      data: { issueId },
    });
  }
}
