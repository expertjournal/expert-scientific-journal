import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { ArticleStatus, Role } from '@prisma/client';
import { PlatformService } from './platform.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import { CurrentUser } from './auth/current-user.decorator';

class ContactDto {
  @IsNotEmpty() name!: string;
  @IsEmail() email!: string;
  @IsNotEmpty() body!: string;
}

@Controller()
export class PlatformController {
  constructor(private platform: PlatformService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'expert-api' };
  }

  @Get('home')
  home() {
    return this.platform.publicHome();
  }

  @Get('current-issue')
  issue() {
    return this.platform.publicHome();
  }

  @Get('articles')
  articles(@Query('status') status?: ArticleStatus) {
    return this.platform.articles(status);
  }

  @Get('articles/:id')
  article(@Param('id') id: string) {
    return this.platform.article(id);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  editorDashboard() {
    return this.platform.editorDashboard();
  }

  @Get('dashboard/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  stats() {
    return this.platform.editorDashboard();
  }

  @Get('author/:userId/dashboard')
  @UseGuards(JwtAuthGuard)
  author(
    @Param('userId') userId: string,
    @CurrentUser() user: { sub: string; role: Role }
  ) {
    if (user.sub !== userId && user.role !== Role.EDITOR && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Not authorized to view this author dashboard');
    }
    return this.platform.authorDashboard(userId);
  }

  @Post('contact')
  contact(@Body() input: ContactDto) {
    return this.platform.createContact(input);
  }
}
