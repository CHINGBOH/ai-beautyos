/**
 * Image generation: 支持两种火山生图 + Forge
 * 方式一：智能绘图（VOLC_IMAGE_API=visual，AK/SK）→ visual.volcengineapi.com CVProcess
 * 方式二：方舟 Seedream（默认，VOLC_IMAGE_API=ark）→ ark.cn-beijing.volces.com/images/generations
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";
import { resolveVolcArkApiKey } from "../llm";
import { visualCVProcessT2I } from "./volcSign";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

const VOLC_ARK_IMAGE_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const FALLBACK_IMAGE_URL =
  // 允许通过环境变量覆写默认占位图
  process.env.FALLBACK_EFFECT_IMAGE_URL ??
  "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80";

function useVolcVisualImage(): boolean {
  return (
    ENV.volcImageApi === "visual" &&
    !!ENV.volcAccessKeyId?.trim() &&
    !!ENV.volcSecretAccessKey?.trim()
  );
}

function useVolcArkImage(): boolean {
  if (ENV.volcImageApi !== "ark") return false;
  if (!ENV.volcArkImageModel?.trim()) return false;
  if (ENV.volcArkApiKey?.trim()) return true;
  return !!(ENV.volcAccessKeyId?.trim() && ENV.volcSecretAccessKey?.trim() && ENV.volcArkModel?.trim());
}

/** 方式一：智能绘图服务 CVProcess（仅 AK/SK） */
async function generateImageVolcVisual(prompt: string): Promise<GenerateImageResponse> {
  const b64 = await visualCVProcessT2I(
    ENV.volcAccessKeyId.trim(),
    ENV.volcSecretAccessKey.trim(),
    prompt,
    { width: 512, height: 512, seed: -1, scale: 5.5, ddim_steps: 25 }
  );
  const buffer = Buffer.from(b64, "base64");
  const { url } = await storagePut(`generated/${Date.now()}.png`, buffer, "image/png");
  return { url };
}

/** 方式二：方舟 Seedream */
async function generateImageVolcArk(prompt: string): Promise<GenerateImageResponse> {
  const apiKey = await resolveVolcArkApiKey();
  const res = await fetch(VOLC_ARK_IMAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: ENV.volcArkImageModel.trim(),
      prompt,
      size: "2K",
      sequential_image_generation: "disabled",
      response_format: "url",
      stream: false,
      watermark: true,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`火山方舟生图失败: ${res.status} – ${text}`);
  }
  const data = (await res.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
    images?: Array<{ b64_json?: string; url?: string }>;
  };
  const list = data.data ?? data.images ?? [];
  const first = list[0];
  if (!first?.b64_json && !first?.url) {
    throw new Error("火山方舟生图返回无图片数据");
  }
  if (first.b64_json) {
    const buffer = Buffer.from(first.b64_json, "base64");
    const { url } = await storagePut(`generated/${Date.now()}.png`, buffer, "image/png");
    return { url };
  }
  return { url: first.url };
}

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  if (useVolcVisualImage()) {
    return generateImageVolcVisual(options.prompt);
  }
  if (useVolcArkImage()) {
    return generateImageVolcArk(options.prompt);
  }

  // 未配置任何生图服务时，退化为固定占位图，并仍然让上层缓存 URL（行为上接近“生成一次并永存”）
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    console.warn(
      "[imageGeneration] No image generation provider configured, using fallback image URL instead."
    );
    return { url: FALLBACK_IMAGE_URL };
  }

  const baseUrl = ENV.forgeApiUrl.endsWith("/")
    ? ENV.forgeApiUrl
    : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL(
    "images.v1.ImageService/GenerateImage",
    baseUrl
  ).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      prompt: options.prompt,
      original_images: options.originalImages || [],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Image generation request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as {
    image: {
      b64Json: string;
      mimeType: string;
    };
  };
  const base64Data = result.image.b64Json;
  const buffer = Buffer.from(base64Data, "base64");

  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    result.image.mimeType
  );
  return {
    url,
  };
}
