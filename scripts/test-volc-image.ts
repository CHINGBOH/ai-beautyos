/**
 * 火山方舟生图测试（Seedream）
 * 需 .env 配置 VOLC_ARK_API_KEY + VOLC_ARK_IMAGE_MODEL，或 AK/SK + VOLC_ARK_MODEL
 * 执行：npx tsx scripts/test-volc-image.ts
 */

import "dotenv/config";

const ARK_IMAGE_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const apiKey = process.env.VOLC_ARK_API_KEY?.trim();
const model = process.env.VOLC_ARK_IMAGE_MODEL?.trim();

async function main() {
  console.log("火山方舟生图测试");
  console.log("VOLC_ARK_API_KEY:", apiKey ? "已设置" : "(未设置)");
  console.log("VOLC_ARK_IMAGE_MODEL:", model || "(未设置)");

  if (!apiKey || !model) {
    console.error("\n请在 .env 中配置 VOLC_ARK_API_KEY、VOLC_ARK_IMAGE_MODEL");
    process.exit(1);
  }

  const body = {
    model,
    prompt: "一只可爱的猫咪在花园里玩耍",
    size: "2K",
    sequential_image_generation: "disabled",
    response_format: "url",
    stream: false,
    watermark: true,
  };

  console.log("\n请求:", ARK_IMAGE_URL);
  const res = await fetch(ARK_IMAGE_URL, {
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
    console.error("响应:", text.slice(0, 500));
    process.exit(1);
  }

  const data = JSON.parse(text) as { data?: Array<{ url?: string }> };
  const url = data?.data?.[0]?.url;
  if (url) {
    console.log("图片 URL:", url);
    console.log("\n火山方舟生图可用。");
  } else {
    console.error("响应中无 url:", text.slice(0, 400));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
