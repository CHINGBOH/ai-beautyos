/**
 * 火山方舟（豆包）API 调用，用于一键爽文等内容生成
 * 文档：https://www.volcengine.com/docs/82379/1399009
 * 支持两种配置：① VOLC_ARK_API_KEY + VOLC_ARK_MODEL  ② VOLC_ACCESS_KEY_ID + VOLC_SECRET_ACCESS_KEY + VOLC_ARK_MODEL（AK/SK 自动换临时 Key）
 */

import { ENV } from "../_core/env";
import { getVolcArkApiKeyWithAKSK } from "../_core/volcSign";
import type { InvokeParams, InvokeResult, Message, ResponseFormat, OutputSchema } from "./types";

const VOLC_ARK_BASE = "https://ark.cn-beijing.volces.com/api/v3";

function assertVolcConfig(): void {
  if (!ENV.volcArkModel?.trim()) {
    throw new Error("一键爽文使用火山方舟时，请在 .env 中配置 VOLC_ARK_MODEL（推理接入点 ID，如 ep-xxx）");
  }
  const hasArkKey = !!ENV.volcArkApiKey?.trim();
  const hasAKSK = !!ENV.volcAccessKeyId?.trim() && !!ENV.volcSecretAccessKey?.trim();
  if (!hasArkKey && !hasAKSK) {
    throw new Error(
      "请在 .env 中配置火山方舟：VOLC_ARK_API_KEY + VOLC_ARK_MODEL，或 VOLC_ACCESS_KEY_ID + VOLC_SECRET_ACCESS_KEY + VOLC_ARK_MODEL"
    );
  }
}

/** 解析当前有效的方舟 API Key（直接配置或 AK/SK 换临时 Key），供生文/生图共用 */
export async function resolveVolcArkApiKey(): Promise<string> {
  if (ENV.volcArkApiKey?.trim()) return ENV.volcArkApiKey.trim();
  return getVolcArkApiKeyWithAKSK(
    ENV.volcAccessKeyId.trim(),
    ENV.volcSecretAccessKey.trim(),
    ENV.volcArkModel.trim()
  );
}

function toVolcMessage(message: Message): { role: string; content: string } {
  const content = message.content;
  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .map((p) => (typeof p === "string" ? p : p.type === "text" ? p.text : ""))
            .join("")
        : "";
  return { role: message.role, content: text };
}

function normalizeResponseFormat(params: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}): ResponseFormat | undefined {
  const fmt = params.responseFormat || params.response_format;
  if (fmt) return fmt;
  const schema = params.outputSchema || params.output_schema;
  if (!schema?.name || !schema?.schema) return undefined;
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
}

/**
 * 使用火山方舟发起一次 Chat Completions 调用，返回与 invokeLLM 一致的 InvokeResult
 */
export async function invokeVolcLLM(params: InvokeParams): Promise<InvokeResult> {
  assertVolcConfig();

  const apiKey = await resolveVolcArkApiKey();
  const model = ENV.volcArkModel.trim();

  const messages = params.messages.map(toVolcMessage);
  const responseFormat = normalizeResponseFormat({
    responseFormat: params.responseFormat,
    response_format: params.response_format,
    outputSchema: params.outputSchema,
    output_schema: params.output_schema,
  });

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: params.max_tokens ?? params.maxTokens ?? 4096,
  };
  if (responseFormat) body.response_format = responseFormat;

  const res = await fetch(`${VOLC_ARK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`火山方舟 API 调用失败: ${res.status} ${res.statusText} – ${text}`);
  }

  const data = (await res.json()) as InvokeResult;
  return data;
}
