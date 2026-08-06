import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('q') query?: string,
    @Query('journalId') journalId?: string,
    @Query('year') year?: number,
    @Query('articleType') articleType?: string,
    @Query('scientificField') scientificField?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.searchService.searchArticles({
      query,
      journalId,
      year: year ? Number(year) : undefined,
      articleType,
      scientificField,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }
}
