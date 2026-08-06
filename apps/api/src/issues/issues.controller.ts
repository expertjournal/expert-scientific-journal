import { Body, Controller, Get, Param, Post, Patch, UseGuards } from '@nestjs/common';
import { IssuesService, CreateIssueDto } from './issues.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

import { IsArray, IsString } from 'class-validator';

export class AssignArticlesDto {
  @IsArray()
  @IsString({ each: true })
  articleIds!: string[];
}

@Controller('issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Get()
  getAllIssues() {
    return this.issuesService.getAllIssues();
  }

  @Get(':id')
  getIssueById(@Param('id') id: string) {
    return this.issuesService.getIssueById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  createIssue(@Body() dto: CreateIssueDto) {
    return this.issuesService.createIssue(dto);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  publishIssuePatch(@Param('id') id: string) {
    return this.issuesService.publishIssue(id);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  publishIssuePost(@Param('id') id: string) {
    return this.issuesService.publishIssue(id);
  }

  @Post(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  assignArticles(@Param('id') id: string, @Body() body: AssignArticlesDto) {
    return this.issuesService.assignArticlesToIssue(id, body.articleIds || []);
  }
}
