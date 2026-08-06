import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ReviewsService,
  CreateReviewRoundDto,
  InviteReviewerByEmailDto,
  AcceptInvitationDto,
  SubmitReviewReportDto,
} from './reviews.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { IsNotEmpty, IsString } from 'class-validator';

class TokenActionDto {
  @IsNotEmpty()
  @IsString()
  token!: string;
}

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('reviews/invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  inviteByEmail(
    @CurrentUser('sub') editorId: string,
    @Body() dto: InviteReviewerByEmailDto
  ) {
    return this.reviewsService.inviteReviewerByEmail(editorId, dto);
  }

  @Post('reviews/accept')
  acceptInvitation(
    @Body() dto: AcceptInvitationDto,
    @Req() req: Request
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || undefined;
    const userAgent = req.headers['user-agent'] || undefined;
    return this.reviewsService.acceptInvitation(dto, ipAddress, userAgent);
  }

  @Post('reviews/decline')
  declineInvitation(@Body() dto: TokenActionDto) {
    return this.reviewsService.declineInvitation(dto.token);
  }

  @Get('reviews/my')
  @UseGuards(JwtAuthGuard)
  getMyReviews(@CurrentUser('sub') reviewerId: string) {
    return this.reviewsService.getMyAssignedReviews(reviewerId);
  }

  @Get('reviews/stats')
  @UseGuards(JwtAuthGuard)
  getMyStatistics(@CurrentUser('sub') reviewerId: string) {
    return this.reviewsService.getReviewerStatistics(reviewerId);
  }

  @Get('reviews/:id')
  @UseGuards(JwtAuthGuard)
  getReviewDetails(
    @Param('id') assignmentId: string,
    @CurrentUser('sub') reviewerId: string
  ) {
    return this.reviewsService.getReviewDetails(assignmentId, reviewerId);
  }

  @Post('reviews/:id/submit')
  @UseGuards(JwtAuthGuard)
  submitReport(
    @Param('id') assignmentId: string,
    @CurrentUser('sub') reviewerId: string,
    @Body() dto: SubmitReviewReportDto
  ) {
    dto.assignmentId = assignmentId;
    return this.reviewsService.submitReport(reviewerId, dto);
  }

  @Get('editor/reviews')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  getEditorReviews() {
    return this.reviewsService.getIncomingReviewsForEditor();
  }

  @Get('editor/reviews/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  getEditorReviewDetails(@Param('id') assignmentId: string) {
    return this.reviewsService.getEditorReviewDetails(assignmentId);
  }

  @Get('editor/reviewers/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  getReviewerAnalytics() {
    return this.reviewsService.getReviewerPerformanceAnalyticsForEditor();
  }

  @Post('editor/reviews/reminders/trigger')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  triggerReminders() {
    return this.reviewsService.checkAndSendReviewReminders();
  }
}
