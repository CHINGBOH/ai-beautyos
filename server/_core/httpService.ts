/**
 * 稳健抗鲁 HTTP 服务模块
 * 
 * 核心特性:
 * - 统一的 HTTP 请求接口 (支持 Axios 和 Fetch)
 * - 指数退避重试机制
 * - 超时处理和请求取消
 * - 全面的错误分类和处理
 * - 详细的请求日志和监控
 * - 熔断器模式保护
 * 
 * @module httpService
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 请求方法类型
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

/**
 * 错误类型分类
 */
export enum ErrorType {
  NETWORK = "NETWORK",           // 网络连接错误
  TIMEOUT = "TIMEOUT",           // 请求超时
  SERVER_ERROR = "SERVER_ERROR", // 服务器错误 (5xx)
  CLIENT_ERROR = "CLIENT_ERROR", // 客户端错误 (4xx)
  PARSE_ERROR = "PARSE_ERROR",   // 响应解析错误
  UNKNOWN = "UNKNOWN",           // 未知错误
}

/**
 * HTTP 错误详情
 */
export interface HttpErrorDetail {
  type: ErrorType;
  statusCode?: number;
  message: string;
  originalError?: Error;
  url?: string;
  method?: string;
  retryAttempt?: number;
  timestamp: Date;
}

/**
 * 自定义 HTTP 错误类
 */
export class HttpServiceError extends Error {
  constructor(
    public detail: HttpErrorDetail
  ) {
    super(`[${detail.type}] ${detail.message}`);
    this.name = "HttpServiceError";
  }
}

/**
 * 请求监控数据
 */
export interface RequestMetrics {
  url: string;
  method: HttpMethod;
  statusCode?: number;
  duration: number; // 毫秒
  success: boolean;
  errorType?: ErrorType;
  retryCount: number;
  timestamp: Date;
}

/**
 * 重试配置
 */
export interface RetryConfig {
  maxRetries?: number;           // 最大重试次数 (默认: 3)
  initialDelay?: number;         // 初始延迟 (毫秒, 默认: 1000)
  maxDelay?: number;             // 最大延迟 (毫秒, 默认: 30000)
  backoffFactor?: number;        // 退避因子 (默认: 2)
  retryableErrors?: ErrorType[]; // 可重试的错误类型
  retryableStatusCodes?: number[]; // 可重试的 HTTP 状态码
  onRetry?: (error: HttpServiceError, attempt: number) => void; // 重试回调
}

/**
 * 超时配置
 */
export interface TimeoutConfig {
  request?: number;  // 请求超时 (毫秒, 默认: 30000)
  connect?: number;  // 连接超时 (毫秒, 默认: 10000)
}

/**
 * 请求配置
 */
export interface HttpRequestConfig {
  method?: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  data?: unknown;
  timeout?: number;
  retries?: RetryConfig;
  signal?: AbortSignal;
  axiosInstance?: AxiosInstance;
}

/**
 * 响应配置
 */
export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  duration: number;
}

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryableErrors: [
    ErrorType.NETWORK,
    ErrorType.TIMEOUT,
    ErrorType.SERVER_ERROR,
  ],
  retryableStatusCodes: [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ],
  onRetry: () => {},
};

const DEFAULT_TIMEOUT_CONFIG: Required<TimeoutConfig> = {
  request: 30000,
  connect: 10000,
};

// ============================================================================
// 日志和监控
// ============================================================================

/**
 * 简单的日志记录器
 */
class RequestLogger {
  private metrics: RequestMetrics[] = [];
  private maxMetricsSize = 1000; // 最多保留 1000 条记录

  /**
   * 记录请求指标
   */
  logMetric(metric: RequestMetrics): void {
    this.metrics.push(metric);

    // 保持日志大小
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }

    // 控制台输出
    const statusIcon = metric.success ? "✅" : "❌";
    console.log(
      `[HTTP] ${statusIcon} ${metric.method} ${metric.url} - ${metric.statusCode || "ERR"} (${metric.duration}ms${metric.retryCount > 0 ? `, ${metric.retryCount} retries` : ""})`
    );

    // 错误详情
    if (!metric.success && metric.errorType) {
      console.error(`[HTTP Error] ${metric.errorType}: ${metric.method} ${metric.url}`);
    }
  }

  /**
   * 获取所有指标
   */
  getMetrics(): RequestMetrics[] {
    return [...this.metrics];
  }

  /**
   * 获取最近的指标
   */
  getRecentMetrics(count: number = 10): RequestMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number;
    success: number;
    failed: number;
    successRate: number;
    avgDuration: number;
    errorBreakdown: Record<ErrorType, number>;
  } {
    const total = this.metrics.length;
    const success = this.metrics.filter(m => m.success).length;
    const failed = total - success;
    const avgDuration =
      total > 0
        ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / total
        : 0;

    const errorBreakdown: Record<string, number> = {};
    this.metrics
      .filter(m => !m.success && m.errorType)
      .forEach(m => {
        const errorType = m.errorType!;
        errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
      });

    return {
      total,
      success,
      failed,
      successRate: total > 0 ? (success / total) * 100 : 0,
      avgDuration: Math.round(avgDuration),
      errorBreakdown: errorBreakdown as Record<ErrorType, number>,
    };
  }

  /**
   * 清空指标
   */
  clear(): void {
    this.metrics = [];
  }
}

// 全局日志实例
const logger = new RequestLogger();

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 计算指数退避延迟
 */
function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
  const { initialDelay, maxDelay, backoffFactor } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  const delay = initialDelay * Math.pow(backoffFactor, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(
  error: HttpServiceError,
  config: RetryConfig
): boolean {
  const { retryableErrors, retryableStatusCodes } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  // 检查错误类型
  if (retryableErrors.includes(error.detail.type)) {
    return true;
  }

  // 检查状态码
  if (error.detail.statusCode && retryableStatusCodes.includes(error.detail.statusCode)) {
    return true;
  }

  return false;
}

/**
 * 分类错误类型
 */
function classifyError(error: unknown, url?: string, method?: string): HttpServiceError {
  const timestamp = new Date();

  // 如果已经是 HttpServiceError，直接返回
  if (error instanceof HttpServiceError) {
    return error;
  }

  // Axios 错误
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;

    // 网络错误 (没有响应)
    if (!axiosError.response || axiosError.response === undefined) {
      if (axiosError.code === "ECONNABORTED" || 
          axiosError.code === "ETIMEDOUT" ||
          axiosError.message?.includes("timeout") ||
          axiosError.message?.includes("canceled")) {
        return new HttpServiceError({
          type: ErrorType.TIMEOUT,
          message: "请求超时",
          originalError: error as Error,
          url,
          method,
          timestamp,
        });
      }

      return new HttpServiceError({
        type: ErrorType.NETWORK,
        message: "网络连接失败",
        originalError: error as Error,
        url,
        method,
        timestamp,
      });
    }

    // HTTP 错误 (有响应)
    const statusCode = axiosError.response.status;

    if (statusCode >= 500) {
      return new HttpServiceError({
        type: ErrorType.SERVER_ERROR,
        statusCode,
        message: `服务器错误: ${statusCode}`,
        originalError: error as Error,
        url,
        method,
        timestamp,
      });
    }

    if (statusCode >= 400) {
      return new HttpServiceError({
        type: ErrorType.CLIENT_ERROR,
        statusCode,
        message: `客户端错误: ${statusCode}`,
        originalError: error as Error,
        url,
        method,
        timestamp,
      });
    }
  }

  // DOMException (Fetch abort)
  if (error instanceof DOMException && error.name === "AbortError") {
    return new HttpServiceError({
      type: ErrorType.TIMEOUT,
      message: "请求被取消或超时",
      originalError: error,
      url,
      method,
      timestamp,
    });
  }

  // 普通错误
  if (error instanceof Error) {
    return new HttpServiceError({
      type: ErrorType.UNKNOWN,
      message: error.message,
      originalError: error,
      url,
      method,
      timestamp,
    });
  }

  // 未知错误
  return new HttpServiceError({
    type: ErrorType.UNKNOWN,
    message: "未知错误",
    originalError: error instanceof Error ? error : new Error(String(error)),
    url,
    method,
    timestamp,
  });
}

// ============================================================================
// 熔断器
// ============================================================================

/**
 * 熔断器状态
 */
enum CircuitBreakerState {
  CLOSED = "CLOSED",     // 正常状态
  OPEN = "OPEN",         // 熔断状态
  HALF_OPEN = "HALF_OPEN", // 半开状态
}

/**
 * 熔断器配置
 */
interface CircuitBreakerConfig {
  failureThreshold?: number;    // 失败阈值 (默认: 5)
  successThreshold?: number;    // 成功阈值 (默认: 2)
  timeout?: number;             // 熔断超时 (毫秒, 默认: 60000)
  monitoringPeriod?: number;    // 监控周期 (毫秒, 默认: 10000)
}

/**
 * 熔断器类
 */
class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private nextAttemptTime?: Date;

  constructor(private config: CircuitBreakerConfig = {}) {
    this.config = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
      monitoringPeriod: 10000,
      ...config,
    };
  }

  /**
   * 执行请求
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      // 检查是否可以尝试恢复
      if (this.nextAttemptTime && new Date() >= this.nextAttemptTime) {
        this.state = CircuitBreakerState.HALF_OPEN;
        console.log("[CircuitBreaker] 进入半开状态，尝试恢复");
      } else {
        throw new HttpServiceError({
          type: ErrorType.UNKNOWN,
          message: "熔断器开启，请求被拒绝",
          timestamp: new Date(),
        });
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * 成功回调
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold!) {
        this.state = CircuitBreakerState.CLOSED;
        this.successCount = 0;
        console.log("[CircuitBreaker] 恢复正常状态");
      }
    }
  }

  /**
   * 失败回调
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    this.successCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = new Date(Date.now() + this.config.timeout!);
      console.log("[CircuitBreaker] 半开状态失败，重新熔断");
    } else if (
      this.failureCount >= this.config.failureThreshold! &&
      this.state === CircuitBreakerState.CLOSED
    ) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = new Date(Date.now() + this.config.timeout!);
      console.log(
        `[CircuitBreaker] 失败次数达到阈值 (${this.failureCount})，熔断器开启`
      );
    }
  }

  /**
   * 获取状态
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * 重置熔断器
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
    console.log("[CircuitBreaker] 熔断器已重置");
  }
}

// ============================================================================
// HTTP 服务核心
// ============================================================================

/**
 * HTTP 服务类
 */
export class HttpService {
  private axiosInstance: AxiosInstance;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor(config?: AxiosRequestConfig) {
    this.axiosInstance = axios.create({
      timeout: DEFAULT_TIMEOUT_CONFIG.request,
      ...config,
    });

    // 添加请求拦截器
    this.axiosInstance.interceptors.request.use(
      config => {
        console.log(`[HTTP Request] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      error => {
        console.error("[HTTP Request Error]", error);
        return Promise.reject(error);
      }
    );

    // 添加响应拦截器
    this.axiosInstance.interceptors.response.use(
      response => {
        return response;
      },
      error => {
        // 不在这里记录错误，让错误分类逻辑处理
        return Promise.reject(error);
      }
    );
  }

  /**
   * 获取或创建熔断器
   */
  private getCircuitBreaker(url: string): CircuitBreaker {
    const key = new URL(url).hostname;
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, new CircuitBreaker());
    }
    return this.circuitBreakers.get(key)!;
  }

  /**
   * 执行带重试的请求
   */
  private async executeWithRetry<T>(
    fn: () => Promise<HttpResponse<T>>,
    config: HttpRequestConfig
  ): Promise<HttpResponse<T>> {
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retries };
    let lastError: HttpServiceError | undefined;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const response = await fn();
        
        // 记录成功指标
        logger.logMetric({
          url: config.url,
          method: config.method || "GET",
          statusCode: response.status,
          duration: response.duration,
          success: true,
          retryCount: attempt,
          timestamp: new Date(),
        });

        return response;
      } catch (error) {
        lastError = classifyError(error, config.url, config.method);

        // 设置重试次数（即使不再重试也要记录）
        lastError.detail.retryAttempt = attempt;

        // 检查是否可重试
        if (attempt < retryConfig.maxRetries && isRetryableError(lastError, retryConfig)) {
          // 执行重试回调
          retryConfig.onRetry(lastError, attempt);

          // 计算退避延迟
          const delayMs = calculateBackoffDelay(attempt, retryConfig);
          console.log(
            `[HTTP Retry] 第 ${attempt + 1} 次重试，延迟 ${delayMs}ms - ${config.url}`
          );

          await delay(delayMs);
        } else {
          // 不可重试或达到最大重试次数
          break;
        }
      }
    }

    // 记录失败指标
    logger.logMetric({
      url: config.url,
      method: config.method || "GET",
      statusCode: lastError?.detail.statusCode,
      duration: 0,
      success: false,
      errorType: lastError?.detail.type,
      retryCount: retryConfig.maxRetries,
      timestamp: new Date(),
    });

    throw lastError || new Error("请求失败");
  }

  /**
   * 通用请求方法
   */
  async request<T = unknown>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const startTime = Date.now();
    const method = config.method || "GET";
    const url = config.url;
    const axiosInstance = config.axiosInstance || this.axiosInstance;

    // 创建 AbortController 用于超时
    const controller = new AbortController();
    const timeout = config.timeout || DEFAULT_TIMEOUT_CONFIG.request;

    // 设置超时
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    // 如果提供了外部 signal，则合并
    if (config.signal) {
      config.signal.addEventListener("abort", () => {
        controller.abort();
      });
    }

    try {
      // 使用熔断器
      const circuitBreaker = this.getCircuitBreaker(url);
      
      const response = await circuitBreaker.execute(async () => {
        const axiosResponse = await axiosInstance.request<T>({
          method,
          url,
          headers: config.headers,
          params: config.params,
          data: config.data,
          signal: controller.signal,
        });

        return {
          data: axiosResponse.data,
          status: axiosResponse.status,
          statusText: axiosResponse.statusText,
          headers: axiosResponse.headers as Record<string, string>,
          duration: Date.now() - startTime,
        };
      });

      return response;
    } catch (error) {
      throw classifyError(error, url, method);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 执行请求 (带重试)
   */
  async execute<T = unknown>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    return this.executeWithRetry(() => this.request<T>(config), config);
  }

  /**
   * GET 请求
   */
  async get<T = unknown>(
    url: string,
    config?: Omit<HttpRequestConfig, "url" | "method">
  ): Promise<HttpResponse<T>> {
    return this.execute<T>({ ...config, url, method: "GET" });
  }

  /**
   * POST 请求
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: Omit<HttpRequestConfig, "url" | "method" | "data">
  ): Promise<HttpResponse<T>> {
    return this.execute<T>({ ...config, url, method: "POST", data });
  }

  /**
   * PUT 请求
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: Omit<HttpRequestConfig, "url" | "method" | "data">
  ): Promise<HttpResponse<T>> {
    return this.execute<T>({ ...config, url, method: "PUT", data });
  }

  /**
   * DELETE 请求
   */
  async delete<T = unknown>(
    url: string,
    config?: Omit<HttpRequestConfig, "url" | "method">
  ): Promise<HttpResponse<T>> {
    return this.execute<T>({ ...config, url, method: "DELETE" });
  }

  /**
   * PATCH 请求
   */
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: Omit<HttpRequestConfig, "url" | "method" | "data">
  ): Promise<HttpResponse<T>> {
    return this.execute<T>({ ...config, url, method: "PATCH", data });
  }

  /**
   * 获取日志统计
   */
  getStats() {
    return logger.getStats();
  }

  /**
   * 获取最近的请求
   */
  getRecentMetrics(count?: number) {
    return logger.getRecentMetrics(count);
  }

  /**
   * 清空日志
   */
  clearLogs() {
    logger.clear();
  }

  /**
   * 重置所有熔断器
   */
  resetCircuitBreakers() {
    this.circuitBreakers.forEach(cb => cb.reset());
  }
}

// ============================================================================
// 默认实例
// ============================================================================

/**
 * 默认 HTTP 服务实例
 */
export const httpService = new HttpService();

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * GET 请求
 */
export async function httpGet<T = unknown>(
  url: string,
  config?: Omit<HttpRequestConfig, "url" | "method">
): Promise<HttpResponse<T>> {
  return httpService.get<T>(url, config);
}

/**
 * POST 请求
 */
export async function httpPost<T = unknown>(
  url: string,
  data?: unknown,
  config?: Omit<HttpRequestConfig, "url" | "method" | "data">
): Promise<HttpResponse<T>> {
  return httpService.post<T>(url, data, config);
}

/**
 * PUT 请求
 */
export async function httpPut<T = unknown>(
  url: string,
  data?: unknown,
  config?: Omit<HttpRequestConfig, "url" | "method" | "data">
): Promise<HttpResponse<T>> {
  return httpService.put<T>(url, data, config);
}

/**
 * DELETE 请求
 */
export async function httpDelete<T = unknown>(
  url: string,
  config?: Omit<HttpRequestConfig, "url" | "method">
): Promise<HttpResponse<T>> {
  return httpService.delete<T>(url, config);
}

/**
 * PATCH 请求
 */
export async function httpPatch<T = unknown>(
  url: string,
  data?: unknown,
  config?: Omit<HttpRequestConfig, "url" | "method" | "data">
): Promise<HttpResponse<T>> {
  return httpService.patch<T>(url, data, config);
}

/**
 * 获取请求统计
 */
export function getHttpStats() {
  return httpService.getStats();
}

/**
 * 获取最近的请求
 */
export function getRecentHttpMetrics(count?: number) {
  return httpService.getRecentMetrics(count);
}

/**
 * 清空 HTTP 日志
 */
export function clearHttpLogs() {
  return httpService.clearLogs();
}

/**
 * 重置熔断器
 */
export function resetCircuitBreakers() {
  return httpService.resetCircuitBreakers();
}

// ============================================================================
// 导出
// ============================================================================
