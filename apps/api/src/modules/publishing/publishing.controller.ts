import { Controller, Get, Param, Post, Body, UseGuards } from '@nestjs/common';
import { CitationService } from './citation/citation.service';
import { MetadataService } from './metadata/metadata.service';
import { DoiService } from './doi/doi.service';
import { DoiProvider, Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('publishing')
export class PublishingController {
  constructor(
    private readonly citationService: CitationService,
    private readonly metadataService: MetadataService,
    private readonly doiService: DoiService,
  ) {}

  @Get('articles/:id/citations')
  getCitations(@Param('id') id: string) {
    return this.citationService.generateCitations(id);
  }

  @Get('articles/:id/crossref.xml')
  getCrossrefXml(@Param('id') id: string) {
    return this.metadataService.exportCrossrefXml(id);
  }

  @Get('articles/:id/jats.xml')
  getJatsXml(@Param('id') id: string) {
    return this.metadataService.exportJatsXml(id);
  }

  @Get('articles/:id/schema.json')
  getSchemaOrgJsonLd(@Param('id') id: string) {
    return this.metadataService.exportSchemaOrgJsonLd(id);
  }

  @Post('articles/:id/doi/reserve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  reserveDoi(@Param('id') id: string) {
    return this.doiService.reserveDoi(id);
  }

  @Post('articles/:id/doi/register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  registerDoi(@Param('id') id: string, @Body('provider') provider?: DoiProvider) {
    return this.doiService.registerDoi(id, provider);
  }
}
