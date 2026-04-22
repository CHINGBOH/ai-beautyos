import type { Request, Response } from "express";
import { MEDICAL_BEAUTY_SYSTEM_PROMPT } from "../llm/medical-beauty-prompt";

const UPSTREAM = (process.env.LANGCHAIN_BACKEND_URL || "http://127.0.0.1:8000").replace(
  /\/$/,
  ""
);

const FRIENDLY_OFFLINE_REPLY =
  "抱歉，智能顾问服务暂时不可用。请点击下方「快速预约」留下联系方式，我们会安排顾问尽快与您联系。";

function normalizeLlmUrl(raw?: string): string {
  const base = (raw || "https://openrouter.ai/api").trim().replace(/\/+$/, "");
  if (base.endsWith("/v1/chat/completions")) return base;
  return `${base}/v1/chat/completions`;
}

type ChatBody = {
  message?: string;
  history?: Array<{ role?: string; content?: string }>;
};

async function forwardToPython(body: unknown): Promise<globalThis.Response | null> {
  try {
    return await fetch(`${UPSTREAM}/api/medical_chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return null;
  }
}

async function pipeUpstreamJson(
  res: Response,
  upstreamFetch: globalThis.Response
): Promise<void> {
  const buf = await upstreamFetch.arrayBuffer();
  res.status(upstreamFetch.status);
  const ct = upstreamFetch.headers.get("content-type");
  if (ct) res.setHeader("Content-Type", ct);
  res.send(Buffer.from(buf));
}

async function replyViaLlm(body: ChatBody): Promise<string | null> {
  const apiKey = (process.env.OPENROUTER_API_KEY || process.env.DEEPSEEK_API_KEY)?.trim();
  if (!apiKey) return null;

  const userMessage = typeof body.message === "string" ? body.message.trim() : "";
  if (!userMessage) return null;

  const history = Array.isArray(body.history) ? body.history : [];
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: MEDICAL_BEAUTY_SYSTEM_PROMPT },
  ];

  for (const turn of history) {
    const role = String(turn?.role || "").toLowerCase();
    const content = String(turn?.content || "").trim();
    if (!content) continue;
    if (role === "user") messages.push({ role: "user", content });
    else if (role === "assistant") messages.push({ role: "assistant", content });
  }
  messages.push({ role: "user", content: userMessage });

  const url = normalizeLlmUrl(process.env.OPENROUTER_API_URL || process.env.DEEPSEEK_API_URL);
  const model = (process.env.LLM_MODEL || process.env.DEEPSEEK_MODEL || "stepfun/step-3.5-flash:free").trim();

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  const raw = await upstream.text();
  let data: { choices?: Array<{ message?: { content?: string } }> } = {};
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    return null;
  }

  const text = data?.choices?.[0]?.message?.content;
  if (!upstream.ok || typeof text !== "string" || !text.trim()) {
    console.error("[medical-chat] LLM error:", upstream.status, raw.slice(0, 500));
    return null;
  }
  return text.trim();
}

/**
 * 预约咨询 AI：优先走 Python/OpenRouter；不可用时使用 DeepSeek；再失败返回 200 + 友好文案（避免前端进 catch）
 */
export async function handleMedicalChat(req: Request, res: Response): Promise<void> {
  const body = (req.body || {}) as ChatBody;

  const upstream = await forwardToPython(body);
  if (upstream && upstream.ok) {
    await pipeUpstreamJson(res, upstream);
    return;
  }

  if (upstream && !upstream.ok) {
    const errSnippet = await upstream.text().catch(() => "");
    console.warn(
      "[medical-chat] Python upstream not ok:",
      upstream.status,
      errSnippet.slice(0, 300)
    );
  } else {
    console.warn("[medical-chat] Python upstream unreachable:", UPSTREAM);
  }

  const deepseekReply = await replyViaLlm(body);
  if (deepseekReply) {
    res.status(200).json({ reply: deepseekReply });
    return;
  }

  res.status(200).json({ reply: FRIENDLY_OFFLINE_REPLY });
}
