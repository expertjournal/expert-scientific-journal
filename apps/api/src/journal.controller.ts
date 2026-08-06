import { Controller, Get } from '@nestjs/common';
import { JournalService } from './journal.service';

@Controller('journal')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Get('current')
  getCurrentIssue() {
    return this.journalService.getCurrentIssue();
  }

  @Get('issues')
  getAllIssues() {
    return this.journalService.getAllIssues();
  }

  @Get('about')
  getAboutInfo() {
    return this.journalService.getAboutInfo();
  }
}