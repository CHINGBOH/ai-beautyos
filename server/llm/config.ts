/**
 * LLM API 配置 - 直接调用 DeepSeek API
 */

import { ENV } from "../_core/env";

const API_URL =
  ENV.deepseekApiUrl || "https://api.deepseek.com/v1/chat/completions";
const API_KEY = ENV.deepseekApiKey || "";

/** @deprecated 火山方舟内容生成已停用，统一走 DeepSeek。保留此函数仅为 content.ts 向后兼容 */
export function useVolcForContent(): boolean {
  return false;
}

export function resolveApiUrl(): string {
  return API_URL;
}

export function resolveApiKey(): string {
  return API_KEY;
}

export function assertApiKey(): void {
  if (!API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }
}

export function useDeepSeek(): boolean {
  return true;
}

export function assertDeepSeekApiKey(): void {
  assertApiKey();
}
