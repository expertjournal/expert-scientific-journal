/**
 * Enterprise Production-Ready Structured JSON Logger
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  context?: Record<string, any>;
}

export class StructuredLogger {
  private static format(level: LogLevel, message: string, context?: Record<string, any>, correlationId?: string): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: correlationId || `corr_${Math.random().toString(36).substring(2, 8)}`,
      context,
    };
  }

  public static info(message: string, context?: Record<string, any>, correlationId?: string) {
    const entry = this.format("INFO", message, context, correlationId);
    console.log(JSON.stringify(entry));
  }

  public static warn(message: string, context?: Record<string, any>, correlationId?: string) {
    const entry = this.format("WARN", message, context, correlationId);
    console.warn(JSON.stringify(entry));
  }

  public static error(message: string, context?: Record<string, any>, correlationId?: string) {
    const entry = this.format("ERROR", message, context, correlationId);
    console.error(JSON.stringify(entry));
  }

  public static debug(message: string, context?: Record<string, any>, correlationId?: string) {
    if (process.env.NODE_ENV !== "production") {
      const entry = this.format("DEBUG", message, context, correlationId);
      console.log(JSON.stringify(entry));
    }
  }
}
