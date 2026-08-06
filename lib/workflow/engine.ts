/**
 * OJS-Grade Editorial Review Workflow Engine
 * Manages 15 distinct publication state transitions with validation & audit trail.
 */

export type EditorialState =
  | "DRAFT"
  | "SUBMITTED"
  | "EDITORIAL_CHECK"
  | "EDITOR_ASSIGNED"
  | "REVIEWER_ASSIGNED"
  | "UNDER_REVIEW"
  | "MINOR_REVISION"
  | "MAJOR_REVISION"
  | "REVISION_REQUIRED"
  | "ACCEPTED"
  | "COPYEDITING"
  | "TYPESETTING"
  | "PROOFREADING"
  | "PUBLISHED"
  | "REJECTED"
  | "WITHDRAWN"
  | "ARCHIVED";

export interface WorkflowTransitionRecord {
  id: string;
  articleId: string;
  fromState: EditorialState;
  toState: EditorialState;
  changedBy: string;
  comment?: string;
  timestamp: string;
}

// Valid transition graph matrix
const VALID_TRANSITIONS: Record<EditorialState, EditorialState[]> = {
  DRAFT: ["SUBMITTED", "WITHDRAWN"],
  SUBMITTED: ["EDITORIAL_CHECK", "REJECTED", "WITHDRAWN"],
  EDITORIAL_CHECK: ["EDITOR_ASSIGNED", "REJECTED", "REVISION_REQUIRED"],
  EDITOR_ASSIGNED: ["REVIEWER_ASSIGNED", "UNDER_REVIEW", "REJECTED"],
  REVIEWER_ASSIGNED: ["UNDER_REVIEW", "REVISION_REQUIRED"],
  UNDER_REVIEW: ["MINOR_REVISION", "MAJOR_REVISION", "REVISION_REQUIRED", "ACCEPTED", "REJECTED"],
  MINOR_REVISION: ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED"],
  MAJOR_REVISION: ["SUBMITTED", "UNDER_REVIEW", "REJECTED"],
  REVISION_REQUIRED: ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED"],
  ACCEPTED: ["COPYEDITING", "TYPESETTING"],
  COPYEDITING: ["TYPESETTING", "PROOFREADING"],
  TYPESETTING: ["PROOFREADING", "PUBLISHED"],
  PROOFREADING: ["PUBLISHED", "REVISION_REQUIRED"],
  PUBLISHED: ["ARCHIVED", "WITHDRAWN"],
  REJECTED: ["ARCHIVED"],
  WITHDRAWN: ["ARCHIVED"],
  ARCHIVED: [],
};

const historyLog: WorkflowTransitionRecord[] = [];

export class EditorialWorkflowEngine {
  public static canTransition(from: EditorialState, to: EditorialState): boolean {
    if (from === to) return true;
    const allowed = VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  public static transition(
    articleId: string,
    fromState: EditorialState,
    toState: EditorialState,
    changedBy: string,
    comment?: string
  ): WorkflowTransitionRecord {
    if (!this.canTransition(fromState, toState)) {
      throw new Error(`Invalid editorial transition from ${fromState} to ${toState}`);
    }

    const record: WorkflowTransitionRecord = {
      id: "tr-" + Date.now(),
      articleId,
      fromState,
      toState,
      changedBy,
      comment,
      timestamp: new Date().toISOString(),
    };

    historyLog.unshift(record);
    return record;
  }

  public static getHistory(articleId: string): WorkflowTransitionRecord[] {
    return historyLog.filter((h) => h.articleId === articleId);
  }
}
