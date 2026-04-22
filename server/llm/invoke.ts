/**
 * LLM 统一调用入口 - 直接调用 DeepSeek API（OpenAI 兼容格式）
 */

import { resolveApiUrl, resolveApiKey } from "./config";
import type {
  Message,
  MessageContent,
  TextContent,
  ImageContent,
  FileContent,
  InvokeParams,
  InvokeResult,
} from "./types";

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") return { type: "text", text: part };
  if (
    part.type === "text" ||
    part.type === "image_url" ||
    part.type === "file_url"
  )
    return part;
  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, content } = message;
  const contentParts = ensureArray(content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return { role, content: contentParts[0].text };
  }
  return {
    role,
    content: contentParts.map(p => (p.type === "text" ? p.text : "")).join(""),
  };
};

/**
 * 直接调用 DeepSeek API（OpenAI 兼容格式）
 * 带降级策略：API故障时返回预设回复
 */
export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const { messages, max_tokens = 1000, temperature = 0.7 } = params;

  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const normalizedMessages = messages.map(normalizeMessage).map(m => ({
    role: m.role,
    content:
      typeof m.content === "string" ? m.content : JSON.stringify(m.content),
  }));

  try {
    const response = await fetch(resolveApiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || "deepseek-chat",
        messages: normalizedMessages,
        temperature,
        max_tokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const model = process.env.LLM_MODEL || "deepseek-chat";
      throw new Error(
        `LLM API error: ${response.status} ${response.statusText} - model=${model} - ${errorText}`
      );
    }

    const data = (await response.json()) as {
      id?: string;
      object?: string;
      created?: number;
      model?: string;
      choices?: Array<{
        index?: number;
        message?: { role?: string; content?: string };
        finish_reason?: string;
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    return {
      id: data.id || `chat-${Date.now()}`,
      object: data.object || "chat.completion",
      created: data.created || Math.floor(Date.now() / 1000),
      model: data.model || process.env.LLM_MODEL || "deepseek-chat",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: data.choices?.[0]?.message?.content || "抱歉，无法获取回复",
          },
          finish_reason: data.choices?.[0]?.finish_reason || "stop",
        },
      ],
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    console.error("[LLM] API调用失败，使用降级策略:", error);
    
    // 降级策略：返回预设的友好回复
    const fallbackContent = getFallbackResponse(normalizedMessages);
    
    return {
      id: `fallback-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "fallback",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: fallbackContent,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }
}

/**
 * 降级策略：根据用户消息返回合适的预设回复
 */
function getFallbackResponse(messages: Array<{ role: string; content: string }>): string {
  const lastMessage = messages[messages.length - 1];
  const content = lastMessage?.content?.toLowerCase() || "";
  
  // 简单的关键词匹配返回预设回复
  if (content.includes("价格") || content.includes("多少钱") || content.includes("费用")) {
    return "抱歉，AI服务暂时不可用。关于价格咨询，建议您点击下方「快速预约」，我们会安排专业顾问为您详细介绍项目价格和优惠活动。";
  }
  
  if (content.includes("预约") || content.includes("咨询")) {
    return "AI助手暂时无法回复，请点击「快速预约」按钮，留下您的联系方式，我们会尽快安排专业顾问与您联系。";
  }
  
  if (content.includes("效果") || content.includes("怎么样")) {
    return "很抱歉AI顾问暂时不可用。建议您预约面诊，我们的专业医生会根据您的具体情况制定个性化方案。";
  }
  
  return "抱歉，AI智能顾问暂时不可用。您可以点击「快速预约」获得人工咨询，或稍后重试。我们会尽快恢复服务。";
}

/**
 * 直接调用 DeepSeek API（供前端 AI 助手使用）
 */
export async function invokeDeepSeekLLM(
  params: InvokeParams
): Promise<InvokeResult> {
  return invokeLLM(params);
}

export async function invokeWithSchema<T>(
  params: InvokeParams & { outputSchema: Record<string, unknown> }
): Promise<T> {
  const result = await invokeLLM(params);
  const content = result.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from LLM");
  if (typeof content !== "string") {
    const textParts = content
      .filter((part): part is TextContent => part.type === "text")
      .map(part => part.text);
    const text = textParts.join(" ");
    return JSON.parse(text) as T;
  }
  return JSON.parse(content) as T;
}
