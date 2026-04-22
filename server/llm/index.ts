/**
 * LLM 统一入口
 * 助手、客服、职能、内容生成等均使用此目录下的同一套 LLM 实现
 */

export * from "./types";
export { resolveApiUrl, resolveApiKey, assertApiKey, useDeepSeek, useVolcForContent } from "./config";
export { invokeLLM, invokeDeepSeekLLM } from "./invoke";
export { resolveVolcArkApiKey } from "./volc";
export {
  invokeLLMWithRetry,
  clearLLMCache,
  getLLMCacheStats,
  type LLMOptions,
  type LLMResult,
} from "./withRetry";
export {
  generateChatResponse,
  MEDICAL_BEAUTY_SYSTEM_PROMPT,
  extractCustomerInfo,
  stripCustomerInfoJson,
  type ChatMessage,
} from "./chat";
