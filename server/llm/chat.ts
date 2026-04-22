/**
 * 客服/助手对话：统一使用 llm invoke，与职能助手同一套 LLM
 */

import type { Message } from "./types";
import { invokeLLM } from "./invoke";
import { assertApiKey } from "./config";
import { MEDICAL_BEAUTY_SYSTEM_PROMPT as MEDICAL_PROMPT_FROM_FILE } from "./medical-beauty-prompt";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * 调用 LLM 生成对话回复（与职能助手同一实现）
 */
export async function generateChatResponse(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<string> {
  assertApiKey();
  const body: Message[] = messages.map((m) => ({ role: m.role, content: m.content }));
  const result = await invokeLLM({
    messages: body,
    max_tokens: 1000,
  });
  const content = result.choices[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const text = content.find((c) => c && (c as { type?: string }).type === "text");
    return (text as { text?: string })?.text ?? "";
  }
  return "";
}

/** 医美客服系统 Prompt（与 medical-beauty-prompt.ts 同源，供助手/客服共用） */
export const MEDICAL_BEAUTY_SYSTEM_PROMPT = MEDICAL_PROMPT_FROM_FILE;

/**
 * 从 AI 回复中提取客户信息（JSON 标注格式）
 */
export function extractCustomerInfo(content: string): {
  name?: string;
  phone?: string;
  wechat?: string;
  services?: string[];
  budget?: string;
} | null {
  const jsonMatch = content.match(/\{[^}]*"(name|phone|wechat|services|budget)"[^}]*\}/g);
  if (!jsonMatch) return null;
  const extracted: Record<string, unknown> = {};
  for (const match of jsonMatch) {
    try {
      Object.assign(extracted, JSON.parse(match));
    } catch {
      // ignore
    }
  }
  return Object.keys(extracted).length > 0 ? (extracted as ReturnType<typeof extractCustomerInfo>) : null;
}

/**
 * 从 AI 回复中剥离嵌入的客户信息 JSON 标注，返回纯净的对话文本
 * 系统提示要求 LLM 在回复中嵌入 {"name":"..."} 等标注，此函数负责清理它们
 */
export function stripCustomerInfoJson(content: string): string {
  // 匹配所有包含 name/phone/wechat/services/budget 键的 JSON 对象（含多键合并格式）
  return content
    .replace(/\{[^{}]*?"(?:name|phone|wechat|services|budget)"[^{}]*?\}/g, "")
    .replace(/\n{3,}/g, "\n\n")  // 合并多余空行
    .trim();
}
