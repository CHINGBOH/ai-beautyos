/**
 * 火山方舟 API 连通性测试
 * 在项目根目录执行：npx tsx scripts/test-volc-api.ts
 * 支持：① VOLC_ARK_API_KEY + VOLC_ARK_MODEL  ② VOLC_ACCESS_KEY_ID + VOLC_SECRET_ACCESS_KEY + VOLC_ARK_MODEL
 */

import "dotenv/config";
import { getVolcArkApiKeyWithAKSK } from "../server/_core/volcSign";

const VOLC_ARK_BASE = "https://ark.cn-beijing.volces.com/api/v3";
const model = process.env.VOLC_ARK_MODEL?.trim();
const arkKey = process.env.VOLC_ARK_API_KEY?.trim();
const accessKeyId = process.env.VOLC_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.VOLC_SECRET_ACCESS_KEY?.trim();

async function main() {
  console.log("火山方舟 API 测试");
  console.log("VOLC_ARK_MODEL:", model ? `${model.slice(0, 14)}...` : "(未设置)");
  console.log("VOLC_ARK_API_KEY:", arkKey ? "已设置" : "(未设置)");
  console.log("AK/SK:", accessKeyId && secretAccessKey ? "已设置" : "(未设置)");

  let apiKey: string;
  if (arkKey) {
    apiKey = arkKey;
  } else if (accessKeyId && secretAccessKey && model) {
    console.log("\n使用 AK/SK 获取临时 API Key...");
    apiKey = await getVolcArkApiKeyWithAKSK(accessKeyId, secretAccessKey, model);
    console.log("临时 Key 获取成功");
  } else {
    console.error("\n请配置：VOLC_ARK_API_KEY + VOLC_ARK_MODEL，或 VOLC_ACCESS_KEY_ID + VOLC_SECRET_ACCESS_KEY + VOLC_ARK_MODEL");
    process.exit(1);
  }

  if (!model) {
    console.error("\nVOLC_ARK_MODEL（推理接入点 ID）必填");
    process.exit(1);
  }

  const url = `${VOLC_ARK_BASE}/chat/completions`;
  const body = {
    model,
    messages: [
      { role: "user", content: "只说一句话：你好，我是豆包。" },
    ],
    max_tokens: 64,
  };

  console.log("\n请求:", url);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log("状态:", res.status, res.statusText);

  if (!res.ok) {
    console.error("响应:", text);
    process.exit(1);
  }

  let data: { choices?: Array<{ message?: { content?: string } }> };
  try {
    data = JSON.parse(text);
  } catch {
    console.error("响应不是 JSON:", text.slice(0, 300));
    process.exit(1);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (content) {
    console.log("回复:", content);
    console.log("\n火山 API 可用。");
  } else {
    console.error("响应中无 content:", JSON.stringify(data).slice(0, 400));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
