/**
 * 一键爽文接口测试
 * 使用方式：先启动服务（DISABLE_AUTH=1），再执行 npx tsx scripts/test-shuangwen.ts
 * 可选：BASE_URL=http://localhost:3000 npx tsx scripts/test-shuangwen.ts
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";

async function main() {
  const url = `${BASE}/api/trpc/content.generate`;
  const body = {
    type: "project",
    project: "超皮秒祛斑",
    tone: "enthusiastic" as const,
  };

  console.log("请求一键爽文 content.generate ...");
  console.log("URL:", url);
  console.log("Body:", JSON.stringify(body, null, 2));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: body }),
    credentials: "include",
  });

  const text = await res.text();
  console.log("Status:", res.status, res.statusText);
  console.log("Response:", text);

  if (!res.ok) {
    console.error("请求失败");
    process.exit(1);
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("响应不是合法 JSON");
    process.exit(1);
  }

  // tRPC 结果可能在 result.data.json 或 result.data
  const raw = (data as { result?: { data?: unknown } })?.result?.data;
  const result = raw && typeof raw === "object" && "json" in (raw as object)
    ? (raw as { json: unknown }).json
    : raw;
  if (result && typeof result === "object" && "title" in result) {
    const out = result as { title?: string; content?: string; tags?: string[] };
    console.log("\n--- 生成结果 ---");
    console.log("标题:", out.title);
    console.log("正文(前200字):", (out.content ?? "").slice(0, 200) + (out.content && out.content.length > 200 ? "..." : ""));
    console.log("标签:", out.tags);
  } else {
    console.log("\n(未解析到 title/content/tags，完整 result.data 见上方 Response)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
