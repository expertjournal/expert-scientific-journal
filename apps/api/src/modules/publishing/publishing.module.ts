import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { PublishingController } from './publishing.controller';
import { CitationService } from './citation/citation.service';
import { MetadataService } from './metadata/metadata.service';
import { DoiService } from './doi/doi.service';
import {
  MockDoiProviderStrategy,
  CrossrefDoiProviderStrategy,
  DataCiteDoiProviderStrategy,
} from './doi/doi-provider.strategy';

@Module({
  controllers: [PublishingController],
  providers: [
    PrismaService,
    CitationService,
    MetadataService,
    DoiService,
    MockDoiProviderStrategy,
    CrossrefDoiProviderStrategy,
    DataCiteDoiProviderStrategy,
  ],
  exports: [CitationService, MetadataService, DoiService],
})
export class PublishingModule {}
