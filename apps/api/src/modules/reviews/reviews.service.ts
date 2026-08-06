import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { MailService } from '../../mail/mail.service';
import {
  ReviewType,
  ReviewRecommendation,
  Role,
  ArticleStatus,
  InvitationStatus,
  ReminderType,
} from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, IsEmail, IsBoolean } from 'class-validator';
import { randomBytes } from 'crypto';

export class CreateReviewRoundDto {
  @IsNotEmpty() @IsString() articleId!: string;
  @IsOptional() @IsInt() roundNumber?: number;
  @IsOptional() @IsEnum(ReviewType) reviewType?: ReviewType;
  @IsOptional() @IsString() deadline?: string;
}

export class InviteReviewerDto {
  @IsNotEmpty() @IsString() roundId!: string;
  @IsNotEmpty() @IsString() reviewerId!: string;
  @IsOptional() @IsInt() dueDays?: number;
}

export class InviteReviewerByEmailDto {
  @IsNotEmpty() @IsString() articleId!: string;
  @IsNotEmpty() @IsEmail() reviewerEmail!: string;
  @IsOptional() @IsInt() dueDays?: number;
  @IsOptional() @IsString() message?: string;
}

export class AcceptInvitationDto {
  @IsNotEmpty() @IsString() token!: string;
  @IsNotEmpty() @IsBoolean() coiAccepted!: boolean;
}

export class SubmitReviewReportDto {
  @IsNotEmpty() @IsString() assignmentId!: string;
  @IsNotEmpty() @IsEnum(ReviewRecommendation) recommendation!: ReviewRecommendation;
  @IsOptional() @IsString() commentsToEditor?: string;
  @IsNotEmpty() @IsString() commentsToAuthor!: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) qualityScore?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) noveltyScore?: number;
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async createRound(dto: CreateReviewRoundDto) {
    const article = await this.prisma.article.findUnique({
      where: { id: dto.articleId },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    const roundCount = await this.prisma.reviewRound.count({
      where: { articleId: dto.articleId },
    });

    const roundNumber = dto.roundNumber || roundCount + 1;
    const deadline = dto.deadline ? new Date(dto.deadline) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    return this.prisma.reviewRound.create({
      data: {
        articleId: dto.articleId,
        roundNumber,
        reviewType: dto.reviewType || ReviewType.DOUBLE_BLIND,
        deadline,
      },
    });
  }

  async inviteReviewerByEmail(editorId: string, dto: InviteReviewerByEmailDto) {
    const article = await this.prisma.article.findUnique({
      where: { id: dto.articleId },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    const normalizedEmail = dto.reviewerEmail.trim().toLowerCase();
    let reviewerUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const existingPending = await this.prisma.reviewerInvitation.findFirst({
      where: {
        articleId: dto.articleId,
        reviewerEmail: normalizedEmail,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new BadRequestException('A pending invitation has already been sent to this reviewer email');
    }

    const token = randomBytes(32).toString('hex');
    const dueDays = dto.dueDays || 14;
    const expiresAt = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000);

    return this.prisma.$transaction(async (tx) => {
      const invitation = await tx.reviewerInvitation.create({
        data: {
          articleId: dto.articleId,
          reviewerEmail: normalizedEmail,
          reviewerUserId: reviewerUser?.id || null,
          invitedBy: editorId,
          token,
          expiresAt,
          status: InvitationStatus.PENDING,
        },
      });

      await tx.activityLog.create({
        data: {
          actorId: editorId,
          articleId: dto.articleId,
          action: 'REVIEWER_INVITED',
          metadata: { email: normalizedEmail, token },
        },
      });

      await this.mailService.sendReviewerInvitation(
        normalizedEmail,
        article.title,
        token,
        dueDays
      );

      return invitation;
    });
  }

  async acceptInvitation(dto: AcceptInvitationDto, ipAddress?: string, userAgent?: string) {
    if (!dto.coiAccepted) {
      throw new BadRequestException('You must accept the Conflict of Interest declaration to accept this review invitation');
    }

    const invitation = await this.prisma.reviewerInvitation.findUnique({
      where: { token: dto.token },
      include: { article: true },
    });

    if (!invitation) {
      throw new NotFoundException('Reviewer invitation token is invalid');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(`Invitation is no longer pending (Current status: ${invitation.status})`);
    }

    if (new Date() > invitation.expiresAt) {
      await this.prisma.reviewerInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('Reviewer invitation has expired');
    }

    let reviewerUser = invitation.reviewerUserId
      ? await this.prisma.user.findUnique({ where: { id: invitation.reviewerUserId } })
      : await this.prisma.user.findUnique({ where: { email: invitation.reviewerEmail } });

    if (!reviewerUser) {
      throw new BadRequestException('Reviewer account not found. Please register an account first before accepting.');
    }

    return this.prisma.$transaction(async (tx) => {
      if (reviewerUser.role === Role.READER || reviewerUser.role === Role.AUTHOR) {
        await tx.user.update({
          where: { id: reviewerUser.id },
          data: { role: Role.REVIEWER },
        });
      }

      await tx.reviewerInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          reviewerUserId: reviewerUser.id,
          coiAccepted: true,
          coiAcceptedAt: new Date(),
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });

      await tx.article.update({
        where: { id: invitation.articleId },
        data: { status: ArticleStatus.UNDER_REVIEW },
      });

      let round = await tx.reviewRound.findFirst({
        where: { articleId: invitation.articleId },
        orderBy: { roundNumber: 'desc' },
      });

      if (!round) {
        round = await tx.reviewRound.create({
          data: {
            articleId: invitation.articleId,
            roundNumber: 1,
            reviewType: ReviewType.DOUBLE_BLIND,
            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        });
      }

      const dueAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const assignment = await tx.reviewAssignment.create({
        data: {
          roundId: round.id,
          reviewerId: reviewerUser.id,
          status: 'ACCEPTED',
          assignedAt: new Date(),
          respondedAt: new Date(),
          dueAt,
          coiAccepted: true,
          coiAcceptedAt: new Date(),
        },
      });

      await tx.activityLog.create({
        data: {
          actorId: reviewerUser.id,
          articleId: invitation.articleId,
          action: 'REVIEW_INVITATION_ACCEPTED',
          metadata: { coiAccepted: true, ipAddress },
        },
      });

      await tx.notification.create({
        data: {
          userId: invitation.invitedBy,
          type: 'REVIEW',
          title: 'Приглашение на рецензирование принято',
          body: `Рецензент ${reviewerUser.email} принял приглашение (COI подтвержден) для статьи "${invitation.article.title}"`,
        },
      });

      return { invitation, assignment };
    });
  }

  async declineInvitation(token: string) {
    const invitation = await this.prisma.reviewerInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Reviewer invitation token is invalid');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(`Invitation is no longer pending (Current status: ${invitation.status})`);
    }

    return this.prisma.reviewerInvitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.DECLINED,
        declinedAt: new Date(),
      },
    });
  }

  async getMyAssignedReviews(reviewerId: string) {
    const assignments = await this.prisma.reviewAssignment.findMany({
      where: { reviewerId },
      include: {
        round: {
          include: {
            article: {
              include: {
                files: true,
                authors: { include: { author: true } },
                issue: { include: { journal: true } },
              },
            },
          },
        },
        reports: true,
      },
      orderBy: { invitedAt: 'desc' },
    });

    const now = Date.now();

    return assignments.map((item) => {
      const dueAtTime = item.dueAt ? new Date(item.dueAt).getTime() : now + 14 * 24 * 60 * 60 * 1000;
      const remainingDays = Math.ceil((dueAtTime - now) / (1000 * 60 * 60 * 24));
      const isOverdue = remainingDays < 0 && item.status !== 'COMPLETED';

      return {
        ...item,
        dueDate: item.dueAt ? new Date(item.dueAt).toISOString() : new Date(dueAtTime).toISOString(),
        remainingDays,
        isOverdue,
      };
    });
  }

  async getReviewDetails(assignmentId: string, reviewerId: string) {
    const assignment = await this.prisma.reviewAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        round: {
          include: {
            article: {
              include: {
                files: true,
                authors: { include: { author: true } },
                keywords: { include: { keyword: true } },
              },
            },
          },
        },
        reports: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Review assignment not found');
    }

    if (assignment.reviewerId !== reviewerId) {
      throw new ForbiddenException('Not authorized to access this review assignment');
    }

    const now = Date.now();
    const dueAtTime = assignment.dueAt ? new Date(assignment.dueAt).getTime() : now + 14 * 24 * 60 * 60 * 1000;
    const remainingDays = Math.ceil((dueAtTime - now) / (1000 * 60 * 60 * 24));
    const isOverdue = remainingDays < 0 && assignment.status !== 'COMPLETED';

    return {
      ...assignment,
      dueDate: assignment.dueAt ? new Date(assignment.dueAt).toISOString() : new Date(dueAtTime).toISOString(),
      remainingDays,
      isOverdue,
    };
  }

  async submitReport(reviewerId: string, dto: SubmitReviewReportDto) {
    const assignment = await this.prisma.reviewAssignment.findUnique({
      where: { id: dto.assignmentId },
      include: { round: { include: { article: true } } },
    });

    if (!assignment) {
      throw new NotFoundException('Review assignment not found');
    }

    if (assignment.reviewerId !== reviewerId) {
      throw new ForbiddenException('Not authorized to submit report for this assignment');
    }

    if (assignment.status !== 'ACCEPTED') {
      throw new BadRequestException('Must accept review invitation before submitting report');
    }

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.reviewReport.create({
        data: {
          assignmentId: dto.assignmentId,
          commentsToEditor: dto.commentsToEditor,
          commentsToAuthor: dto.commentsToAuthor,
          qualityScore: dto.qualityScore,
          noveltyScore: dto.noveltyScore,
        },
      });

      await tx.reviewAssignment.update({
        where: { id: dto.assignmentId },
        data: {
          status: 'COMPLETED',
          recommendation: dto.recommendation,
          completedAt: new Date(),
        },
      });

      await tx.article.update({
        where: { id: assignment.round.articleId },
        data: { status: ArticleStatus.EDITOR_ASSIGNMENT },
      });

      await tx.activityLog.create({
        data: {
          actorId: reviewerId,
          articleId: assignment.round.articleId,
          action: 'REVIEW_SUBMITTED',
          metadata: { recommendation: dto.recommendation },
        },
      });

      return report;
    });
  }

  async getReviewerStatistics(reviewerId: string) {
    const assignments = await this.prisma.reviewAssignment.findMany({
      where: { reviewerId },
      include: { reports: true },
    });

    const pendingReviewsCount = assignments.filter((a) => a.status === 'ACCEPTED' || a.status === 'INVITED').length;
    const completedReviewsCount = assignments.filter((a) => a.status === 'COMPLETED').length;
    const activeReviewsCount = assignments.filter((a) => a.status === 'ACCEPTED').length;

    const completedAssignments = assignments.filter((a) => a.status === 'COMPLETED' && a.completedAt && a.assignedAt);
    let totalReviewDays = 0;
    for (const a of completedAssignments) {
      const days = (new Date(a.completedAt!).getTime() - new Date(a.assignedAt).getTime()) / (1000 * 60 * 60 * 24);
      totalReviewDays += Math.max(1, Math.round(days));
    }
    const averageReviewTimeDays = completedAssignments.length > 0 ? Math.round(totalReviewDays / completedAssignments.length) : 0;

    const recommendationDistribution = {
      ACCEPT: assignments.filter((a) => a.recommendation === ReviewRecommendation.ACCEPT).length,
      MINOR_REVISION: assignments.filter((a) => a.recommendation === ReviewRecommendation.MINOR_REVISION).length,
      MAJOR_REVISION: assignments.filter((a) => a.recommendation === ReviewRecommendation.MAJOR_REVISION).length,
      REJECT: assignments.filter((a) => a.recommendation === ReviewRecommendation.REJECT).length,
    };

    return {
      pendingReviewsCount,
      completedReviewsCount,
      activeReviewsCount,
      averageReviewTimeDays,
      recommendationDistribution,
    };
  }

  async getReviewerPerformanceAnalyticsForEditor() {
    const reviewers = await this.prisma.user.findMany({
      where: {
        OR: [{ role: Role.REVIEWER }, { assignedReviews: { some: {} } }],
      },
      include: {
        profile: true,
        assignedReviews: {
          include: { reports: true },
        },
        reviewerInvitations: true,
      },
    });

    const now = Date.now();

    return reviewers.map((rev) => {
      const completed = rev.assignedReviews.filter((a) => a.status === 'COMPLETED');
      const pending = rev.assignedReviews.filter((a) => a.status === 'ACCEPTED' || a.status === 'INVITED');

      let totalDays = 0;
      for (const a of completed) {
        if (a.completedAt && a.assignedAt) {
          totalDays += (new Date(a.completedAt).getTime() - new Date(a.assignedAt).getTime()) / (1000 * 60 * 60 * 24);
        }
      }
      const averageReviewTimeDays = completed.length > 0 ? Math.round(totalDays / completed.length) : 0;

      const totalInvitations = rev.reviewerInvitations.length;
      const acceptedInvitations = rev.reviewerInvitations.filter((i) => i.status === InvitationStatus.ACCEPTED || i.status === InvitationStatus.COMPLETED).length;
      const declinedInvitations = rev.reviewerInvitations.filter((i) => i.status === InvitationStatus.DECLINED).length;

      const acceptanceRate = totalInvitations > 0 ? Math.round((acceptedInvitations / totalInvitations) * 100) : 100;
      const declineRate = totalInvitations > 0 ? Math.round((declinedInvitations / totalInvitations) * 100) : 0;

      const recommendationDistribution = {
        ACCEPT: rev.assignedReviews.filter((a) => a.recommendation === ReviewRecommendation.ACCEPT).length,
        MINOR_REVISION: rev.assignedReviews.filter((a) => a.recommendation === ReviewRecommendation.MINOR_REVISION).length,
        MAJOR_REVISION: rev.assignedReviews.filter((a) => a.recommendation === ReviewRecommendation.MAJOR_REVISION).length,
        REJECT: rev.assignedReviews.filter((a) => a.recommendation === ReviewRecommendation.REJECT).length,
      };

      const lastActive = rev.assignedReviews.map((a) => a.respondedAt || a.completedAt || a.assignedAt).sort((a, b) => (b ? new Date(b).getTime() : 0) - (a ? new Date(a).getTime() : 0))[0];

      return {
        reviewerId: rev.id,
        reviewerName: rev.profile?.fullName || rev.email.split('@')[0],
        reviewerEmail: rev.email,
        institution: rev.profile?.institution || 'Expert Scientific Network',
        completedReviews: completed.length,
        pendingReviews: pending.length,
        averageReviewTimeDays,
        acceptanceRate,
        declineRate,
        recommendationDistribution,
        lastActiveDate: lastActive ? new Date(lastActive).toISOString() : rev.createdAt.toISOString(),
      };
    });
  }

  async checkAndSendReviewReminders() {
    const activeAssignments = await this.prisma.reviewAssignment.findMany({
      where: { status: 'ACCEPTED' },
      include: {
        reviewer: true,
        round: { include: { article: true } },
        reminders: true,
      },
    });

    const now = Date.now();
    let sentCount = 0;

    for (const item of activeAssignments) {
      if (!item.dueAt) continue;

      const dueAtTime = new Date(item.dueAt).getTime();
      const remainingDays = Math.ceil((dueAtTime - now) / (1000 * 60 * 60 * 24));
      const existingReminders = item.reminders.map((r) => r.reminderType);

      let targetType: ReminderType | null = null;
      if (remainingDays === 3 && !existingReminders.includes(ReminderType.THREE_DAYS)) {
        targetType = ReminderType.THREE_DAYS;
      } else if (remainingDays === 1 && !existingReminders.includes(ReminderType.ONE_DAY)) {
        targetType = ReminderType.ONE_DAY;
      } else if (remainingDays <= 0 && !existingReminders.includes(ReminderType.DUE_DATE)) {
        targetType = ReminderType.DUE_DATE;
      }

      if (targetType) {
        await this.prisma.$transaction(async (tx) => {
          await tx.reviewReminderLog.create({
            data: {
              assignmentId: item.id,
              reminderType: targetType!,
            },
          });

          await this.mailService.sendReviewReminder(
            item.reviewer.email,
            item.round.article.title,
            remainingDays,
            targetType!
          );
        });
        sentCount++;
      }
    }

    return { processedAssignments: activeAssignments.length, remindersSent: sentCount };
  }

  async getIncomingReviewsForEditor() {
    const assignments = await this.prisma.reviewAssignment.findMany({
      where: { status: 'COMPLETED' },
      include: {
        reviewer: { include: { profile: true } },
        reports: true,
        round: {
          include: {
            article: {
              include: {
                authors: { include: { author: true } },
              },
            },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });

    const now = Date.now();

    return assignments.map((item) => {
      const dueAtTime = item.dueAt ? new Date(item.dueAt).getTime() : now + 14 * 24 * 60 * 60 * 1000;
      const remainingDays = Math.ceil((dueAtTime - now) / (1000 * 60 * 60 * 24));

      return {
        ...item,
        dueDate: item.dueAt ? new Date(item.dueAt).toISOString() : new Date(dueAtTime).toISOString(),
        remainingDays,
        isOverdue: remainingDays < 0,
      };
    });
  }

  async getEditorReviewDetails(assignmentId: string) {
    const assignment = await this.prisma.reviewAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        reviewer: { include: { profile: true } },
        reports: true,
        round: {
          include: {
            article: {
              include: {
                files: true,
                authors: { include: { author: true } },
              },
            },
          },
        },
      },
    });

    if (!assignment) throw new NotFoundException('Review assignment not found');

    const now = Date.now();
    const dueAtTime = assignment.dueAt ? new Date(assignment.dueAt).getTime() : now + 14 * 24 * 60 * 60 * 1000;
    const remainingDays = Math.ceil((dueAtTime - now) / (1000 * 60 * 60 * 24));

    return {
      ...assignment,
      dueDate: assignment.dueAt ? new Date(assignment.dueAt).toISOString() : new Date(dueAtTime).toISOString(),
      remainingDays,
      isOverdue: remainingDays < 0 && assignment.status !== 'COMPLETED',
    };
  }
}
