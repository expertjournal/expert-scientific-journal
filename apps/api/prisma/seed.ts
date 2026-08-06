import { PrismaClient, ArticleStatus, IssueStatus, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const db = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
  const editor = await db.user.upsert({
    where: { email: 'editor@expert-journal.uz' },
    update: {},
    create: { email: 'editor@expert-journal.uz', passwordHash, role: Role.EDITOR, profile: { create: { fullName: 'Руслан Абдуллаев', institution: 'Expert Journal', position: 'Главный редактор', country: 'Узбекистан' } } },
  });
  const submittingUser = await db.user.upsert({
    where: { email: 'author@expert-journal.uz' },
    update: {},
    create: { email: 'author@expert-journal.uz', passwordHash, role: Role.AUTHOR, profile: { create: { fullName: 'Ильхом Абдуллаев', institution: 'Ташкентский государственный экономический университет', orcid: '0009-0005-4729-1186', country: 'Узбекистан' } } },
  });
  const journal = await db.journal.upsert({
    where: { name: 'Expert' }, update: {},
    create: { name: 'Expert', description: 'Междисциплинарный международный научный журнал.', issnPrint: '2181-1415', issnOnline: '2181-1423', doiPrefix: '10.1234/expert', publisher: 'Expert Platform', languages: ['RU', 'EN', 'UZ'], frequency: 'Ежеквартально' },
  });
  const issue = await db.issue.upsert({
    where: { journalId_number_year: { journalId: journal.id, number: 7, year: 2026 } }, update: {},
    create: { journalId: journal.id, number: 7, year: 2026, publicationDate: new Date('2026-07-25'), pages: 128, status: IssueStatus.PUBLISHED, description: 'Выпуск по экономике, управлению и цифровым технологиям.' },
  });
  const people = await Promise.all([
    ['Ильхом Абдуллаев', 'Ташкентский государственный экономический университет', 'i.abdullaev@tsue.uz'],
    ['Гульнора Каримова', 'Самаркандский институт экономики и сервиса', 'g.karimova@sies.uz'],
    ['Дилёр Мирзаев', 'Ташкентский технический университет', 'd.mirzaev@tstu.uz'],
  ].map(([fullName, institution, email]) => db.author.upsert({ where: { id: `seed-${email}` }, update: { fullName, institution, email }, create: { id: `seed-${email}`, fullName, institution, email, country: 'Узбекистан' } })));
  const records = [
    ['EXP-2026-001', 'Цифровая трансформация экономики: тенденции и перспективы', ArticleStatus.SUBMITTED, people[0]],
    ['EXP-2026-002', 'Устойчивое развитие региона: экономические аспекты', ArticleStatus.UNDER_REVIEW, people[1]],
    ['EXP-2026-003', 'Искусственный интеллект в управлении финансовыми рисками', ArticleStatus.PUBLISHED, people[2]],
  ] as const;
  for (const [internalId, title, status, author] of records) {
    await db.article.upsert({ where: { internalId }, update: {}, create: { internalId, title, abstract: 'Демонстрационная запись для локальной разработки платформы Expert.', language: 'RU', articleType: 'Research Article', scientificField: 'Economics', status, submittingAuthorId: submittingUser.id, issueId: status === ArticleStatus.PUBLISHED ? issue.id : null, submissionDate: new Date('2026-06-20'), publishedAt: status === ArticleStatus.PUBLISHED ? new Date('2026-07-25') : null, doi: status === ArticleStatus.PUBLISHED ? '10.1234/expert.2026.7.12' : null, authors: { create: { authorId: author.id, position: 1, corresponding: true } }, activities: { create: { actorId: editor.id, action: 'seeded' } } } });
  }
  await db.indexingService.createMany({ data: [{ name: 'Crossref', website: 'https://crossref.org', status: 'active' }, { name: 'Google Scholar', website: 'https://scholar.google.com', status: 'active' }], skipDuplicates: true });
  console.log('Seed complete. Editor: editor@expert-journal.uz · Author: author@expert-journal.uz · Password: ChangeMe123!');
}
main().finally(() => db.$disconnect());
