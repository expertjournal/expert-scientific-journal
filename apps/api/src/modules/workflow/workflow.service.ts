import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ArticleStatus, Role } from '@prisma/client';

export interface WorkflowTransitionRule {
  from: ArticleStatus;
  to: ArticleStatus[];
  allowedRoles: Role[];
}

@Injectable()
export class WorkflowService {
  private readonly rules: WorkflowTransitionRule[] = [
    // Draft to Submitted by Author
    { from: ArticleStatus.DRAFT, to: [ArticleStatus.SUBMITTED], allowedRoles: [Role.AUTHOR, Role.ADMIN] },
    
    // Submitted to Screening or Assignment by Editor/Admin
    {
      from: ArticleStatus.SUBMITTED,
      to: [ArticleStatus.INITIAL_SCREENING, ArticleStatus.EDITOR_ASSIGNMENT, ArticleStatus.REJECTED, ArticleStatus.WITHDRAWN],
      allowedRoles: [Role.EDITOR, Role.ADMIN],
    },
    
    // Initial Screening to Assignment
    {
      from: ArticleStatus.INITIAL_SCREENING,
      to: [ArticleStatus.EDITOR_ASSIGNMENT, ArticleStatus.REJECTED],
      allowedRoles: [Role.EDITOR, Role.ADMIN],
    },

    // Editor Assignment to Reviewer Invitation
    {
      from: ArticleStatus.EDITOR_ASSIGNMENT,
      to: [ArticleStatus.REVIEWER_INVITATION, ArticleStatus.REJECTED],
      allowedRoles: [Role.EDITOR, Role.ADMIN],
    },

    // Reviewer Invitation to Under Review
    {
      from: ArticleStatus.REVIEWER_INVITATION,
      to: [ArticleStatus.REVIEWER_ACCEPTED, ArticleStatus.UNDER_REVIEW],
      allowedRoles: [Role.EDITOR, Role.ADMIN],
    },

    {
      from: ArticleStatus.REVIEWER_ACCEPTED,
      to: [ArticleStatus.UNDER_REVIEW],
      allowedRoles: [Role.EDITOR, Role.ADMIN, Role.REVIEWER],
    },

    // Under Review decisions
    {
      from: ArticleStatus.UNDER_REVIEW,
      to: [ArticleStatus.REVISION_REQUIRED, ArticleStatus.ACCEPTED, ArticleStatus.REJECTED],
      allowedRoles: [Role.EDITOR, Role.ADMIN],
    },

    // Revision Required to Submitted (Resubmission by Author)
    {
      from: ArticleStatus.REVISION_REQUIRED,
      to: [ArticleStatus.SUBMITTED, ArticleStatus.UNDER_REVIEW],
      allowedRoles: [Role.AUTHOR, Role.ADMIN],
    },

    // Accepted to Post-Production stages
    {
      from: ArticleStatus.ACCEPTED,
      to: [ArticleStatus.COPY_EDITING, ArticleStatus.TYPESETTING],
      allowedRoles: [Role.EDITOR, Role.ADMIN],
    },

    {
      from: ArticleStatus.COPY_EDITING,
      to: [ArticleStatus.PROOFREADING, ArticleStatus.TYPESETTING],
      allowedRoles: [Role.EDITOR, Role.ADMIN],
    },

    {
      from: ArticleStatus.PROOFREADING,
      to: [ArticleStatus.TYPESETTING, ArticleStatus.AUTHOR_APPROVAL],
      allowedRoles: [Role.EDITOR, Role.ADMIN],
    },

    {
      from: ArticleStatus.TYPESETTING,
      to: [ArticleStatus.AUTHOR_APPROVAL, ArticleStatus.PUBLISHED],
      allowedRoles: [Role.EDITOR, Role.ADMIN],
    },

    {
      from: ArticleStatus.AUTHOR_APPROVAL,
      to: [ArticleStatus.PUBLISHED],
      allowedRoles: [Role.EDITOR, Role.ADMIN, Role.AUTHOR],
    },

    {
      from: ArticleStatus.PUBLISHED,
      to: [ArticleStatus.INDEXING, ArticleStatus.ARCHIVED, ArticleStatus.WITHDRAWN],
      allowedRoles: [Role.EDITOR, Role.ADMIN],
    },

    {
      from: ArticleStatus.INDEXING,
      to: [ArticleStatus.ARCHIVED],
      allowedRoles: [Role.EDITOR, Role.ADMIN],
    },
  ];

  validateTransition(currentStatus: ArticleStatus, targetStatus: ArticleStatus, userRole: Role): boolean {
    const rule = this.rules.find((r) => r.from === currentStatus);

    if (!rule) {
      throw new BadRequestException(`No transition rules defined for status '${currentStatus}'`);
    }

    if (!rule.to.includes(targetStatus)) {
      throw new BadRequestException(
        `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed target statuses: [${rule.to.join(', ')}]`
      );
    }

    if (!rule.allowedRoles.includes(userRole) && userRole !== Role.ADMIN) {
      throw new ForbiddenException(
        `Role '${userRole}' is not authorized to transition article from '${currentStatus}' to '${targetStatus}'`
      );
    }

    return true;
  }
}
