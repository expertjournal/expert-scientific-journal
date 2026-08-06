import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class JournalService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentIssue() {
    // Get the most recent published issue
    const currentIssue = await this.prisma.issue.findFirst({
      where: {
        status: 'PUBLISHED',
      },
      orderBy: {
        publicationDate: 'desc',
      },
      include: {
        journal: true,
        articles: {
          where: {
            status: 'PUBLISHED',
          },
          include: {
            authors: {
              include: {
                author: true,
              },
            },
            keywords: {
              include: {
                keyword: true,
              },
            },
          },
        },
      },
    });

    return currentIssue;
  }

  async getAllIssues() {
    // Get all published issues ordered by date
    const issues = await this.prisma.issue.findMany({
      where: {
        status: 'PUBLISHED',
      },
      orderBy: {
        publicationDate: 'desc',
      },
      include: {
        journal: true,
        articles: {
          where: {
            status: 'PUBLISHED',
          },
          select: {
            id: true,
            title: true,
            authors: {
              include: {
                author: true,
              },
            },
          },
        },
      },
    });

    return issues;
  }

  async getAboutInfo() {
    // Get journal information
    const journal = await this.prisma.journal.findFirst({
      include: {
        issues: {
          where: {
            status: 'PUBLISHED',
          },
          orderBy: {
            publicationDate: 'desc',
          },
          take: 1,
        },
      },
    });

    // Get indexing services
    const indexingServices = await this.prisma.indexingService.findMany();

    return {
      journal,
      indexingServices,
    };
  }
}