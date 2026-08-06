/**
 * Enterprise Peer Reviewer System
 * Manages reviewer invitations, double-blind review masking, deadlines, and recommendations.
 */

export type ReviewStatus = "INVITED" | "ACCEPTED" | "DECLINED" | "COMPLETED" | "EXPIRED";
export type ReviewRecommendation = "ACCEPT" | "MINOR_REVISION" | "MAJOR_REVISION" | "REJECT";
export type ReviewMode = "SINGLE_BLIND" | "DOUBLE_BLIND" | "OPEN";

export interface ReviewAssignment {
  id: string;
  articleId: string;
  reviewerId: string;
  reviewerName: string;
  status: ReviewStatus;
  reviewMode: ReviewMode;
  deadline: string;
  createdAt: string;
}

export interface ReviewSubmission {
  id: string;
  assignmentId: string;
  recommendation: ReviewRecommendation;
  commentsForAuthor: string;
  commentsForEditor: string;
  submittedAt: string;
}

const assignments: ReviewAssignment[] = [];
const submissions: ReviewSubmission[] = [];

export class ReviewSystemManager {
  public static assignReviewer(
    articleId: string,
    reviewerId: string,
    reviewerName: string,
    deadlineDays = 14,
    reviewMode: ReviewMode = "DOUBLE_BLIND"
  ): ReviewAssignment {
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + deadlineDays);

    const assignment: ReviewAssignment = {
      id: "rev-as-" + Date.now(),
      articleId,
      reviewerId,
      reviewerName,
      status: "INVITED",
      reviewMode,
      deadline: deadlineDate.toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
    };

    assignments.unshift(assignment);
    return assignment;
  }

  public static submitReview(
    assignmentId: string,
    recommendation: ReviewRecommendation,
    commentsForAuthor: string,
    commentsForEditor: string
  ): ReviewSubmission {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (assignment) {
      assignment.status = "COMPLETED";
    }

    const submission: ReviewSubmission = {
      id: "rev-sub-" + Date.now(),
      assignmentId,
      recommendation,
      commentsForAuthor,
      commentsForEditor,
      submittedAt: new Date().toISOString(),
    };

    submissions.unshift(submission);
    return submission;
  }

  public static getReviewsForArticle(articleId: string, isAuthorView = false): (ReviewSubmission & { reviewerName?: string })[] {
    const articleAssignments = assignments.filter((a) => a.articleId === articleId);
    const assignmentIds = new Set(articleAssignments.map((a) => a.id));

    return submissions
      .filter((s) => assignmentIds.has(s.assignmentId))
      .map((s) => {
        const as = articleAssignments.find((a) => a.id === s.assignmentId);
        if (isAuthorView && as?.reviewMode === "DOUBLE_BLIND") {
          return {
            ...s,
            reviewerName: "Анонимный Рецензент",
            commentsForEditor: "", // Mask internal editor notes
          };
        }
        return {
          ...s,
          reviewerName: as?.reviewerName || "Рецензент",
        };
      });
  }
}
