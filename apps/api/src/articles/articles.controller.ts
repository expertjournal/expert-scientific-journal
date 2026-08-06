import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ArticlesService, CreateArticleDto } from './articles.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ArticleStatus, FileKind, Role } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

class TransitionStatusDto {
  @IsNotEmpty()
  @IsEnum(ArticleStatus)
  status!: ArticleStatus;

  @IsOptional()
  note?: string;
}

@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  getMyArticles(@CurrentUser('sub') userId: string) {
    return this.articlesService.getMyArticles(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  createArticle(
    @CurrentUser('sub') userId: string,
    @Body() body: CreateArticleDto
  ) {
    return this.articlesService.createArticle(userId, body);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  submitArticle(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.articlesService.submitArticle(id, userId);
  }

  @Post(':id/transition')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  transitionStatusPost(
    @Param('id') id: string,
    @CurrentUser('sub') editorId: string,
    @Body() body: TransitionStatusDto
  ) {
    return this.articlesService.transitionStatus(id, body.status, editorId, body.note);
  }

  @Post(':id/files')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Файл обязателен для загрузки');
    }

    // Max size: 25MB (26,214,400 bytes)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('Размер файла не должен превышать 25 MB');
    }

    const ALLOWED_MIME_TYPES = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream',
    ];

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Допустимы только файлы форматов PDF и Word (.doc, .docx)');
    }

    // Validate actual Magic Bytes (PDF / DOC / DOCX) to prevent spoofed Content-Type headers
    const buf = file.buffer;
    const isPdf = buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // %PDF
    const isDoc = buf.length >= 4 && buf[0] === 0xD0 && buf[1] === 0xCF && buf[2] === 0x11 && buf[3] === 0xE0; // DOC
    const isDocx = buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04; // PK (DOCX zip container)

    if (!isPdf && !isDoc && !isDocx) {
      throw new BadRequestException('Содержимое файла не соответствует допустимому формату (PDF или Word)');
    }

    return this.articlesService.attachFile(
      id,
      userId,
      file.buffer,
      file.originalname,
      file.mimetype,
      FileKind.MANUSCRIPT
    );
  }
}
