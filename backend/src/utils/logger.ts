export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  requestId?: string;
  userId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  [key: string]: any;
}

class Logger {
  private isProduction = process.env.NODE_ENV === "production";
  private isTest = process.env.NODE_ENV === "test";

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();

    if (this.isProduction) {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...context,
      });
    }

    const reqIdStr = context?.requestId ? ` [${context.requestId}]` : "";
    const ctxCopy = { ...context };
    delete ctxCopy.requestId;
    const hasExtra = Object.keys(ctxCopy).length > 0;
    const extraStr = hasExtra ? ` ${JSON.stringify(ctxCopy)}` : "";

    return `[${timestamp}] [${level.toUpperCase()}]${reqIdStr} ${message}${extraStr}`;
  }

  debug(message: string, context?: LogContext) {
    if (this.isTest && !process.env.DEBUG) return;
    console.debug(this.formatMessage("debug", message, context));
  }

  info(message: string, context?: LogContext) {
    if (this.isTest && !process.env.DEBUG) return;
    console.log(this.formatMessage("info", message, context));
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage("warn", message, context));
  }

  error(message: string, context?: LogContext) {
    console.error(this.formatMessage("error", message, context));
  }

  http(req: { method: string; path: string; headers: Record<string, any> }, res: { statusCode: number }, durationMs: number) {
    if (this.isTest && !process.env.DEBUG) return;
    const requestId = (req.headers["x-request-id"] as string) || undefined;
    const level: LogLevel = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    const msg = `${req.method} ${req.path} ${res.statusCode} ${durationMs}ms`;
    if (level === "error") {
      this.error(msg, { requestId, method: req.method, path: req.path, statusCode: res.statusCode, durationMs });
    } else if (level === "warn") {
      this.warn(msg, { requestId, method: req.method, path: req.path, statusCode: res.statusCode, durationMs });
    } else {
      this.info(msg, { requestId, method: req.method, path: req.path, statusCode: res.statusCode, durationMs });
    }
  }
}

export const logger = new Logger();
