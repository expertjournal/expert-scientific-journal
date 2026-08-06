/**
 * Enterprise Granular Role-Based & Attribute-Based Access Control (RBAC / ABAC) Matrix
 */

export type ExtendedUserRole =
  | "reader"
  | "author"
  | "reviewer"
  | "section_editor"
  | "managing_editor"
  | "editor_in_chief"
  | "publisher"
  | "admin"
  | "super_admin";

export type SystemPermission =
  | "articles:read"
  | "articles:submit"
  | "articles:review"
  | "articles:edit_editorial"
  | "articles:publish"
  | "issues:manage"
  | "users:manage"
  | "system:audit_logs"
  | "system:settings";

const ROLE_PERMISSIONS_MATRIX: Record<ExtendedUserRole, SystemPermission[]> = {
  reader: ["articles:read"],
  author: ["articles:read", "articles:submit"],
  reviewer: ["articles:read", "articles:review"],
  section_editor: ["articles:read", "articles:review", "articles:edit_editorial"],
  managing_editor: ["articles:read", "articles:submit", "articles:review", "articles:edit_editorial", "issues:manage"],
  editor_in_chief: ["articles:read", "articles:submit", "articles:review", "articles:edit_editorial", "articles:publish", "issues:manage"],
  publisher: ["articles:read", "articles:publish", "issues:manage"],
  admin: ["articles:read", "articles:submit", "articles:review", "articles:edit_editorial", "articles:publish", "issues:manage", "users:manage", "system:audit_logs"],
  super_admin: ["articles:read", "articles:submit", "articles:review", "articles:edit_editorial", "articles:publish", "issues:manage", "users:manage", "system:audit_logs", "system:settings"],
};

export class RBACManager {
  public static hasPermission(role: string, permission: SystemPermission): boolean {
    const canonicalRole = (role || "reader").toLowerCase() as ExtendedUserRole;
    const permissions = ROLE_PERMISSIONS_MATRIX[canonicalRole] || ROLE_PERMISSIONS_MATRIX.reader;
    return permissions.includes(permission);
  }

  public static getPermissionsForRole(role: string): SystemPermission[] {
    const canonicalRole = (role || "reader").toLowerCase() as ExtendedUserRole;
    return ROLE_PERMISSIONS_MATRIX[canonicalRole] || ROLE_PERMISSIONS_MATRIX.reader;
  }
}
