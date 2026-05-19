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

export async function generateEmbedding(text: string): Promise<{ embedding: number[]; provider: EmbeddingProvider | "local-hash"; model: string }> {
  const cfg = resolveEmbeddingProvider();
  if (!cfg) {
    // Offline fallback: deterministic 1536-dim hash embedding. Not
    // semantically meaningful but lets the RAG pipeline run end-to-end
    // in dev / CI without burning provider credits. Use a real provider
    // (QWEN_API_KEY / OPENAI_API_KEY) in production.
    return {
      embedding: localHashEmbedding(text, 1536),
      provider: "local-hash",
      model: "hash-djb2-1536",
    };
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

/**
 * Deterministic hash embedding. Tokenises on whitespace + punctuation,
 * spreads each token's djb2 hash across `dim` buckets, then L2-normalises.
 * Same input always returns the same vector. Semantic quality is poor
 * (it's basically bag-of-tokens with hashing) — use for offline tests.
 */
function localHashEmbedding(text: string, dim: number): number[] {
  const out = new Float64Array(dim);
  const tokens = text.toLowerCase().split(/[^a-z0-9\u4e00-\u9fa5]+/u).filter(Boolean);
  for (const tok of tokens) {
    let h = 5381;
    for (let i = 0; i < tok.length; i++) {
      h = ((h << 5) + h + tok.charCodeAt(i)) | 0;
    }
    const idx = ((h % dim) + dim) % dim;
    const sign = (h & 1) === 0 ? 1 : -1;
    out[idx] += sign;
  }
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += out[i] * out[i];
  norm = Math.sqrt(norm) || 1;
  const arr: number[] = new Array(dim);
  for (let i = 0; i < dim; i++) arr[i] = out[i] / norm;
  return arr;
}

