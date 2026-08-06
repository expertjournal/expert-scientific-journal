import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';

export interface CitationFormats {
  apa: string;
  mla: string;
  chicago: string;
  harvard: string;
  ieee: string;
  vancouver: string;
  bibtex: string;
  ris: string;
}

@Injectable()
export class CitationService {
  constructor(private readonly prisma: PrismaService) {}

  async generateCitations(articleId: string): Promise<CitationFormats> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: {
        issue: { include: { journal: true } },
        authors: { include: { author: true }, orderBy: { position: 'asc' } },
      },
    });

    if (!article) throw new NotFoundException('Article not found');

    const authorsList = article.authors.map((a) => a.author.fullName);
    const primaryAuthor = authorsList[0] || 'Anonymous';
    const authorsFormatted = authorsList.length > 1 ? authorsList.join(', ') : primaryAuthor;
    const year = article.publishedAt ? new Date(article.publishedAt).getFullYear() : new Date().getFullYear();
    const journalName = article.issue?.journal?.name || 'Expert Scientific Journal';
    const vol = article.issue?.year ? article.issue.year - 2020 : 6;
    const issueNum = article.issue?.number || 1;
    const doiStr = article.doi ? ` https://doi.org/${article.doi}` : '';

    return {
      apa: `${authorsFormatted} (${year}). ${article.title}. ${journalName}, ${vol}(${issueNum}).${doiStr}`,
      mla: `${primaryAuthor}, et al. "${article.title}." ${journalName}, vol. ${vol}, no. ${issueNum}, ${year}.${doiStr}`,
      chicago: `${authorsFormatted}. "${article.title}." ${journalName} ${vol}, no. ${issueNum} (${year}).${doiStr}`,
      harvard: `${authorsFormatted}, ${year}. ${article.title}. ${journalName}, ${vol}(${issueNum}).${doiStr}`,
      ieee: `${authorsFormatted}, "${article.title}," ${journalName}, vol. ${vol}, no. ${issueNum}, ${year}.${doiStr}`,
      vancouver: `${authorsFormatted}. ${article.title}. ${journalName}. ${year};${vol}(${issueNum}).${doiStr}`,
      bibtex: `@article{article_${article.id.slice(-6)},\n  author = {${authorsList.join(' and ')}},\n  title = {${article.title}},\n  journal = {${journalName}},\n  year = {${year}},\n  volume = {${vol}},\n  number = {${issueNum}},\n  doi = {${article.doi || ''}}\n}`,
      ris: `TY  - JOUR\nAU  - ${authorsList.join('\nAU  - ')}\nTI  - ${article.title}\nJO  - ${journalName}\nPY  - ${year}\nVL  - ${vol}\nIS  - ${issueNum}\nDO  - ${article.doi || ''}\nER  -`,
    };
  }
}
