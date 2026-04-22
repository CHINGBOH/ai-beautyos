/**
 * 统一的日志系统
 * 支持不同日志级别，生产环境输出结构化 JSON，开发环境输出可读格式
 */

import crypto from "crypto";

type LogLevel = "debug" | "info" | "warn" | "error";

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  /** 创建带请求 ID 的子日志器 */
  withRequestId(requestId?: string): Logger;
}

class LoggerImpl implements Logger {
  private isProduction: boolean;
  private requestId: string | null;

  constructor(requestId?: string) {
    this.isProduction = process.env.NODE_ENV === "production";
    this.requestId = requestId ?? null;
  }

  /** 生成短随机请求 ID */
  static generateRequestId(): string {
    return crypto.randomBytes(6).toString("hex");
  }

  private shouldLog(level: LogLevel): boolean {
    if (level === "debug" && this.isProduction) {
      return false;
    }
    return true;
  }

  private write(level: LogLevel, ...args: unknown[]): void {
    if (!this.shouldLog(level)) return;

    const fn = level === "error" ? console.error
      : level === "warn" ? console.warn
      : level === "debug" ? console.debug
      : console.info;

    if (this.isProduction) {
      // 生产环境：结构化 JSON，便于日志采集
      const record: Record<string, unknown> = {
        ts: new Date().toISOString(),
        level,
        msg: args.map(a => typeof a === "object" ? a : String(a)).join(" "),
      };
      if (this.requestId) record.requestId = this.requestId;
      // 如果第一个参数是对象（如 error detail），合并到 record
      if (args.length === 1 && typeof args[0] === "object" && args[0] !== null) {
        Object.assign(record, args[0]);
      }
      fn(JSON.stringify(record));
    } else {
      // 开发环境：可读格式
      const ts = new Date().toISOString();
      const rid = this.requestId ? ` [${this.requestId}]` : "";
      const prefix = `[${ts}] [${level.toUpperCase()}]${rid}`;
      fn(`${prefix} ${args.map(a =>
        typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)
      ).join(" ")}`);
    }
  }

  debug(...args: unknown[]): void { this.write("debug", ...args); }
  info(...args: unknown[]): void { this.write("info", ...args); }
  warn(...args: unknown[]): void { this.write("warn", ...args); }
  error(...args: unknown[]): void { this.write("error", ...args); }

  withRequestId(requestId: string): Logger {
    return new LoggerImpl(requestId);
  }
}

// 导出单例
export const logger = new LoggerImpl();

// 导出类型
export type { Logger, LogLevel };
