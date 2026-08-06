import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { ArticleStatus, DoiProvider, DoiStatus } from '@prisma/client';
import {
  CrossrefDoiProviderStrategy,
  DataCiteDoiProviderStrategy,
  MockDoiProviderStrategy,
  IDoiProviderStrategy,
} from './doi-provider.strategy';

@Injectable()
export class DoiService {
  private readonly strategies: Map<DoiProvider, IDoiProviderStrategy>;

  constructor(
    private readonly prisma: PrismaService,
    mockStrategy: MockDoiProviderStrategy,
    crossrefStrategy: CrossrefDoiProviderStrategy,
    dataciteStrategy: DataCiteDoiProviderStrategy,
  ) {
    this.strategies = new Map<DoiProvider, IDoiProviderStrategy>([
      [DoiProvider.MOCK, mockStrategy],
      [DoiProvider.CROSSREF, crossrefStrategy],
      [DoiProvider.DATACITE, dataciteStrategy],
    ]);
  }

  getStrategy(provider: DoiProvider = DoiProvider.MOCK): IDoiProviderStrategy {
    return this.strategies.get(provider) || this.strategies.get(DoiProvider.MOCK)!;
  }

  async reserveDoi(articleId: string): Promise<string> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: { issue: { include: { journal: true } } },
    });

    if (!article) throw new NotFoundException('Article not found');
    if (article.status !== ArticleStatus.PUBLISHED && article.status !== ArticleStatus.ACCEPTED) {
      throw new BadRequestException('DOI can only be reserved for ACCEPTED or PUBLISHED articles');
    }

    const journal = article.issue?.journal || (await this.prisma.journal.findFirst());
    const doiPrefix = journal?.doiPrefix || '10.1234/expert';
    const strategy = this.getStrategy(article.doiProvider);

    const doi = strategy.reserveDoi({
      articleId: article.id,
      title: article.title,
      abstract: article.abstract,
      authors: [],
      publicationDate: article.publishedAt || new Date(),
      doiPrefix,
      landingUrl: `https://journal.domain/articles/${article.id}`,
    });

    await this.prisma.article.update({
      where: { id: articleId },
      data: { doi, doiStatus: DoiStatus.DRAFT },
    });

    return doi;
  }

  async registerDoi(articleId: string, provider?: DoiProvider): Promise<{ doi: string; status: DoiStatus }> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: {
        issue: { include: { journal: true } },
        authors: { include: { author: true } },
      },
    });

    if (!article) throw new NotFoundException('Article not found');
    if (article.status !== ArticleStatus.PUBLISHED) {
      throw new BadRequestException('DOI registration is only permitted for PUBLISHED articles');
    }

    const targetProvider = provider || article.doiProvider || DoiProvider.MOCK;
    const strategy = this.getStrategy(targetProvider);
    const journal = article.issue?.journal || (await this.prisma.journal.findFirst());
    const doiPrefix = journal?.doiPrefix || '10.1234/expert';

    const result = await strategy.registerDoi({
      articleId: article.id,
      title: article.title,
      abstract: article.abstract,
      authors: article.authors.map((a) => ({ fullName: a.author.fullName, orcid: a.author.orcid || undefined })),
      publicationDate: article.publishedAt || new Date(),
      doiPrefix,
      landingUrl: `https://journal.domain/articles/${article.id}`,
    });

    await this.prisma.article.update({
      where: { id: articleId },
      data: {
        doi: result.doi,
        doiStatus: result.status,
        doiProvider: result.provider,
        doiRegisteredAt: result.registeredAt || new Date(),
      },
    });

    return { doi: result.doi, status: result.status };
  }
}
