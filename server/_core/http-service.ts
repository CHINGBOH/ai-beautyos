/**
 * 统一的 HTTP 服务模块
 * 提供重试机制和统一错误处理
 */

import { logger } from "./logger";

export interface HttpRequestOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response?: Response
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * 统一的 HTTP 请求函数
 * 支持重试、超时和统一错误处理
 */
export async function httpRequest(
  url: string,
  options: HttpRequestOptions = {}
): Promise<Response> {
  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 30000,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // 创建带超时的请求
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new HttpError(
          `HTTP ${response.status}: ${errorText || response.statusText}`,
          response.status,
          response
        );
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 如果是最后一次尝试，抛出错误
      if (attempt === retries) {
        break;
      }

      // 如果是超时或网络错误，进行重试
      if (
        error instanceof Error &&
        (error.name === "AbortError" || error.message.includes("fetch"))
      ) {
        logger.warn(
          `[HTTP] Request failed (attempt ${attempt + 1}/${retries + 1}), retrying...`,
          { url, error: lastError.message }
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }

      // 其他错误直接抛出
      throw lastError;
    }
  }

  throw lastError || new Error("Request failed after retries");
}

/**
 * JSON 请求辅助函数
 */
export async function httpJson<T = unknown>(
  url: string,
  options: HttpRequestOptions = {}
): Promise<T> {
  const response = await httpRequest(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  return response.json() as Promise<T>;
}

/**
 * POST JSON 请求
 */
export async function httpPost<T = unknown>(
  url: string,
  data: unknown,
  options: HttpRequestOptions = {}
): Promise<T> {
  const response = await httpRequest(url, {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: JSON.stringify(data),
  });

  return response.json() as Promise<T>;
}
