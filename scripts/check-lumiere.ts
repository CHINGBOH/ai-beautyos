/**
 * LUMIÈRE / 落地页 API 自检：默认只测 /api/health（快）。
 * 用法：PORT=3001 npx tsx scripts/check-lumiere.ts
 *       npx tsx scripts/check-lumiere.ts --chat   （可选，会调 LLM，可能较慢）
 */
const port = process.env.PORT || "3000";
// localhost 在部分 Windows 环境比 127.0.0.1 更稳定
const base = `http://localhost:${port}`;
const withChat = process.argv.includes("--chat");

function withTimeout(ms: number): AbortSignal {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

async function main() {
  const healthUrl = `${base}/api/health`;
  const healthRes = await fetch(healthUrl, { signal: withTimeout(25_000) });
  const healthText = await healthRes.text();
  if (!healthRes.ok) {
    console.error("FAIL health HTTP", healthRes.status, healthText.slice(0, 200));
    process.exit(1);
  }
  let healthJson: unknown;
  try {
    healthJson = JSON.parse(healthText);
  } catch {
    console.error("FAIL health 不是 JSON，可能未走 Express 或路径错误:", healthText.slice(0, 120));
    process.exit(1);
  }
  console.log("OK /api/health", healthJson);

  if (!withChat) {
    console.log("（跳过 medical_chat；加参数 --chat 可测对话，依赖 OpenRouter/DeepSeek，可能较慢）");
    return;
  }

  const chatUrl = `${base}/api/medical_chat`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 185_000);
  try {
    const chatRes = await fetch(chatUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hi", history: [] }),
      signal: ctrl.signal,
    });
    const chatText = await chatRes.text();
    if (!chatRes.ok) {
      console.error("FAIL medical_chat HTTP", chatRes.status, chatText.slice(0, 300));
      process.exit(1);
    }
    const chatJson = JSON.parse(chatText) as { reply?: string };
    if (typeof chatJson.reply !== "string" || !chatJson.reply.trim()) {
      console.error("FAIL medical_chat 缺少 reply:", chatText.slice(0, 300));
      process.exit(1);
    }
    console.log("OK /api/medical_chat reply 长度:", chatJson.reply.length);
  } catch (e) {
    console.error("FAIL medical_chat", e instanceof Error ? e.message : e);
    process.exit(1);
  } finally {
    clearTimeout(t);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
