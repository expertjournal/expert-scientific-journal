/**
 * Enterprise Immutable Audit Log Recorder
 */

export interface AuditLogRecord {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

const auditRegistry: AuditLogRecord[] = [];

export class AuditLoggerEngine {
  public static log(
    action: string,
    entityType: string,
    entityId: string,
    userId?: string,
    oldValue?: any,
    newValue?: any,
    ipAddress = "127.0.0.1",
    userAgent = "Internal Server Process"
  ): AuditLogRecord {
    const record: AuditLogRecord = {
      id: "audit-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      userId,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
    };

    auditRegistry.unshift(record);
    return record;
  }

  public static getLogs(entityType?: string, entityId?: string): AuditLogRecord[] {
    return auditRegistry.filter((r) => {
      if (entityType && r.entityType !== entityType) return false;
      if (entityId && r.entityId !== entityId) return false;
      return true;
    });
  }
}
