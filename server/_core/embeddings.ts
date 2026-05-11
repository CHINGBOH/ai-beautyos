import OpenAI from "openai";

export type EmbeddingProvider = "qwen" | "openai";

export interface EmbeddingProviderConfig {
  provider: EmbeddingProvider;
  apiKey: string;
  baseURL?: string;
  model: string;
}

function normalizeBaseUrlFromCompletions(url: string): string {
  // 兼容用户传：
  // - https://dashscope.aliyuncs.com/compatible-mode/v1
  // - https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
  // - https://api.openai.com/v1
  const trimmed = url.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) {
    return trimmed.slice(0, -"/chat/completions".length);
  }
  return trimmed;
}

export function resolveEmbeddingProvider(): EmbeddingProviderConfig | null {
  const prefer = (process.env.EMBEDDING_PROVIDER || "auto").toLowerCase();

  const qwenKey = process.env.QWEN_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  const qwenBase =
    process.env.QWEN_BASE_URL?.trim() ||
    process.env.QWEN_EMBEDDING_BASE_URL?.trim() ||
    (process.env.QWEN_API_URL ? normalizeBaseUrlFromCompletions(process.env.QWEN_API_URL) : "") ||
    "https://dashscope.aliyuncs.com/compatible-mode/v1";

  const openaiBase = process.env.OPENAI_BASE_URL?.trim();

  // 兼容模式下官方最常见的是 text-embedding-v1（/compatible-mode/v1/embeddings）
  // text-embedding-v2 在不同账号/区域/版本上支持情况不一致，因此默认先用 v1，用户可通过环境变量覆盖
  const qwenModel = (process.env.QWEN_EMBEDDING_MODEL || process.env.EMBEDDING_MODEL || "text-embedding-v1").trim();
  const openaiModel = (process.env.OPENAI_EMBEDDING_MODEL || process.env.EMBEDDING_MODEL || "text-embedding-3-small").trim();

  const canQwen = Boolean(qwenKey);
  const canOpenAI = Boolean(openaiKey);

  if (prefer === "qwen") {
    if (!canQwen) return null;
    return { provider: "qwen", apiKey: qwenKey!, baseURL: qwenBase, model: qwenModel };
  }
  if (prefer === "openai") {
    if (!canOpenAI) return null;
    return { provider: "openai", apiKey: openaiKey!, baseURL: openaiBase, model: openaiModel };
  }

  // auto
  if (canQwen) return { provider: "qwen", apiKey: qwenKey!, baseURL: qwenBase, model: qwenModel };
  if (canOpenAI) return { provider: "openai", apiKey: openaiKey!, baseURL: openaiBase, model: openaiModel };
  return null;
}

export function createEmbeddingClient(cfg: EmbeddingProviderConfig): OpenAI {
  return new OpenAI({
    apiKey: cfg.apiKey,
    ...(cfg.baseURL ? { baseURL: cfg.baseURL } : {}),
  });
}

export async function generateEmbedding(text: string): Promise<{ embedding: number[]; provider: EmbeddingProvider; model: string }> {
  const cfg = resolveEmbeddingProvider();
  if (!cfg) {
    throw new Error("未配置 embedding 提供方：请设置 QWEN_API_KEY 或 OPENAI_API_KEY");
  }

  const client = createEmbeddingClient(cfg);
  const input = text.replace(/\n/g, " ").slice(0, 8191);

  const tryModels =
    cfg.provider === "qwen" && cfg.model === "text-embedding-v2"
      ? ["text-embedding-v2", "text-embedding-v1"]
      : [cfg.model];

  let lastErr: unknown = null;
  for (const model of tryModels) {
    try {
      const resp = await client.embeddings.create({
        model,
        input,
      });
      return { embedding: resp.data[0]!.embedding, provider: cfg.provider, model };
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

