/**
 * 统一的日志系统
 * 支持不同日志级别，生产环境禁用 debug 日志
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

class LoggerImpl implements Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
    this.isProduction = process.env.NODE_ENV === "production";
  }

  private shouldLog(level: LogLevel): boolean {
    // 生产环境禁用 debug 日志
    if (level === "debug" && this.isProduction) {
      return false;
    }
    return true;
  }

  private formatMessage(level: LogLevel, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return `${prefix} ${args.map((arg) => 
      typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(" ")}`;
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", ...args));
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", ...args));
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", ...args));
    }
  }

  error(...args: unknown[]): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", ...args));
    }
  }
}

// 导出单例
export const logger = new LoggerImpl();

// 导出类型
export type { Logger, LogLevel };
