import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';

@Injectable()
export class MetadataService {
  constructor(private readonly prisma: PrismaService) {}

  async exportCrossrefXml(articleId: string): Promise<string> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: {
        issue: { include: { journal: true } },
        authors: { include: { author: true }, orderBy: { position: 'asc' } },
      },
    });

    if (!article) throw new NotFoundException('Article not found');

    const year = article.publishedAt ? new Date(article.publishedAt).getFullYear() : new Date().getFullYear();
    const journal = article.issue?.journal;

    const contributorsXml = article.authors
      .map(
        (a, idx) => `
        <person_name sequence="${idx === 0 ? 'first' : 'additional'}" contributor_role="author">
          <given_name>${a.author.fullName.split(' ')[0] || ''}</given_name>
          <surname>${a.author.fullName.split(' ').slice(1).join(' ') || a.author.fullName}</surname>
          ${a.author.orcid ? `<ORCID>https://orcid.org/${a.author.orcid}</ORCID>` : ''}
        </person_name>`
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<doi_batch version="4.4.2" xmlns="http://www.crossref.org/schema/4.4.2">
  <head>
    <doi_batch_id>batch_${Date.now()}</doi_batch_id>
    <timestamp>${Date.now()}</timestamp>
    <depositor>
      <depositor_name>Expert Publishing House</depositor_name>
      <email_address>admin@journal-expert.ru</email_address>
    </depositor>
    <registrant>Expert Scientific Journal</registrant>
  </head>
  <body>
    <journal>
      <journal_metadata>
        <full_title>${journal?.name || 'Expert Scientific Journal'}</full_title>
        <issn media_type="electronic">${journal?.issnOnline || '2712-8490'}</issn>
      </journal_metadata>
      <journal_issue>
        <publication_date media_type="online">
          <year>${year}</year>
        </publication_date>
        <journal_volume><volume>${article.issue?.year ? article.issue.year - 2020 : 6}</volume></journal_volume>
        <issue>${article.issue?.number || 1}</issue>
      </journal_issue>
      <journal_article publication_type="full_text">
        <titles><title>${article.title}</title></titles>
        <contributors>${contributorsXml}</contributors>
        <publication_date media_type="online"><year>${year}</year></publication_date>
        <doi_data>
          <doi>${article.doi || '10.1234/expert.' + year + '.' + article.id.slice(-6)}</doi>
          <resource>https://journal.domain/articles/${article.id}</resource>
        </doi_data>
      </journal_article>
    </journal>
  </body>
</doi_batch>`;
  }

  async exportJatsXml(articleId: string): Promise<string> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: {
        authors: { include: { author: true } },
        issue: { include: { journal: true } },
      },
    });

    if (!article) throw new NotFoundException('Article not found');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE article PUBLIC "-//NLM//DTD JATS (Z39.96) Journal Archiving and Interchange DTD v1.2 20190208//EN" "JATS-archivearticle1.dtd">
<article xmlns:xlink="http://www.w3.org/1999/xlink" article-type="research-article">
  <front>
    <journal-meta>
      <journal-title-group><journal-title>${article.issue?.journal?.name || 'Expert Scientific Journal'}</journal-title></journal-title-group>
      <issn pub-type="epub">${article.issue?.journal?.issnOnline || '2712-8490'}</issn>
    </journal-meta>
    <article-meta>
      <article-id pub-id-type="doi">${article.doi || ''}</article-id>
      <title-group><article-title>${article.title}</article-title></title-group>
      <abstract><p>${article.abstract}</p></abstract>
    </article-meta>
  </front>
</article>`;
  }

  async exportSchemaOrgJsonLd(articleId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: { authors: { include: { author: true } } },
    });

    if (!article) throw new NotFoundException('Article not found');

    return {
      '@context': 'https://schema.org',
      '@type': 'ScholarlyArticle',
      headline: article.title,
      description: article.abstract,
      datePublished: article.publishedAt,
      author: article.authors.map((a) => ({
        '@type': 'Person',
        name: a.author.fullName,
        affiliation: a.author.institution,
      })),
      sameAs: article.doi ? `https://doi.org/${article.doi}` : undefined,
    };
  }
}
