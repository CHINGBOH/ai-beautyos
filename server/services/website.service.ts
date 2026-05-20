/**
 * Website Service
 * 网站内容与导航管理业务逻辑；router 只负责鉴权与参数校验。
 */

import { eq } from "drizzle-orm";
import {
  getDb,
  getWebsiteContent,
  getWebsiteContentById,
  createWebsiteContent,
  updateWebsiteContent,
  deleteWebsiteContent,
  getWebsiteNavigation,
  getWebsiteNavigationByNavKey,
  createWebsiteNavigation,
  updateWebsiteNavigation,
  deleteWebsiteNavigation,
} from "../db";
import { systemConfig } from "../../drizzle/schema";
import { generateImage } from "../_core/imageGeneration";

const EFFECT_SHOWCASE_CONFIG_KEY = "effect_showcase_image";
const FALLBACK_EFFECT_IMAGE_URL =
  process.env.FALLBACK_EFFECT_IMAGE_URL ??
  "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80";

// ---------------------------------------------------------------------------
// Effect showcase image
// ---------------------------------------------------------------------------

export async function getEffectShowcaseImage(): Promise<{ url: string }> {
  const db = await getDb();
  if (db) {
    const rows = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, EFFECT_SHOWCASE_CONFIG_KEY))
      .limit(1);
    if (rows[0]?.configValue) {
      try {
        const data = JSON.parse(rows[0].configValue) as { url?: string };
        if (data.url) return { url: data.url };
      } catch {
        // ignore parse error, regenerate
      }
    }
  }

  const prompt = `专业医美宣传图，超皮秒祛斑效果展示。柔和光线，干净背景，体现皮肤透亮与斑点淡化效果。高端、可信赖的视觉风格，无文字无 Logo。`;
  try {
    const result = await generateImage({ prompt });
    if (result.url && db) {
      const configValue = JSON.stringify({ url: result.url, generatedAt: new Date().toISOString() });
      const existing = await db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.configKey, EFFECT_SHOWCASE_CONFIG_KEY))
        .limit(1);
      if (existing[0]) {
        await db
          .update(systemConfig)
          .set({ configValue, updatedAt: new Date().toISOString() })
          .where(eq(systemConfig.configKey, EFFECT_SHOWCASE_CONFIG_KEY));
      } else {
        await db.insert(systemConfig).values({
          configKey: EFFECT_SHOWCASE_CONFIG_KEY,
          configValue,
          description: "落地页超皮秒祛斑效果展示图（火山文生图）",
        });
      }
      return { url: result.url };
    }
    if (result.url) return { url: result.url };
  } catch (e) {
    console.warn("[website] getEffectShowcaseImage failed, using fallback image instead:", e);
  }
  return { url: FALLBACK_EFFECT_IMAGE_URL };
}

// ---------------------------------------------------------------------------
// Content management
// ---------------------------------------------------------------------------

function parseMetadata(raw: string | null | undefined): unknown {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function getPageContent(pageKey: string, sectionKey?: string) {
  const content = await getWebsiteContent(pageKey, sectionKey);
  return content.map(item => ({ ...item, metadata: parseMetadata(item.metadata as string | null) }));
}

export async function getContentById(id: number) {
  const content = await getWebsiteContentById(id);
  if (content?.metadata) {
    (content as any).metadata = parseMetadata(content.metadata as string | null);
  }
  return content;
}

export async function createContent(input: {
  pageKey: string;
  sectionKey?: string;
  contentType: string;
  title?: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  linkText?: string;
  sortOrder: number;
  metadata?: Record<string, unknown>;
}) {
  return createWebsiteContent({
    ...input,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
  });
}

export async function updateContent(id: number, updates: {
  title?: string;
  content?: string;
  imageUrl?: string;
  linkUrl?: string;
  linkText?: string;
  sortOrder?: number;
  isActive?: number;
  metadata?: Record<string, unknown>;
}) {
  const updateData: Record<string, unknown> = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.content !== undefined) updateData.content = updates.content;
  if (updates.imageUrl !== undefined) updateData.imageUrl = updates.imageUrl;
  if (updates.linkUrl !== undefined) updateData.linkUrl = updates.linkUrl;
  if (updates.linkText !== undefined) updateData.linkText = updates.linkText;
  if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;
  if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
  if (updates.metadata !== undefined) updateData.metadata = JSON.stringify(updates.metadata);
  return updateWebsiteContent(id, updateData);
}

export async function deleteContent(id: number) {
  return deleteWebsiteContent(id);
}

export async function getButtonContent(pageKey: string, buttonKey: string) {
  const content = await getWebsiteContent(pageKey, `button_${buttonKey}`);
  if (!content || content.length === 0) {
    return {
      id: null,
      pageKey,
      sectionKey: `button_${buttonKey}`,
      contentType: "button",
      title: "",
      content: buttonKey,
      imageUrl: null,
      linkUrl: null,
      linkText: buttonKey,
      sortOrder: 0,
      isActive: 1,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  const item = content[0];
  return { ...item, metadata: parseMetadata(item.metadata as string | null) };
}

// ---------------------------------------------------------------------------
// Navigation management
// ---------------------------------------------------------------------------

export async function getNavigation(parentKey?: string) {
  return getWebsiteNavigation(parentKey);
}

export async function getNavigationByNavKey(navKey: string) {
  return getWebsiteNavigationByNavKey(navKey);
}

export async function createNavigation(input: {
  parentKey?: string;
  navKey: string;
  title: string;
  link?: string;
  icon?: string;
  description?: string;
  sortOrder: number;
  isExternal: number;
  openInNewTab: number;
}) {
  return createWebsiteNavigation(input);
}

export async function updateNavigation(id: number, updates: {
  title?: string;
  link?: string;
  icon?: string;
  description?: string;
  sortOrder?: number;
  isActive?: number;
  isExternal?: number;
  openInNewTab?: number;
}) {
  return updateWebsiteNavigation(id, updates);
}

export async function deleteNavigation(id: number) {
  return deleteWebsiteNavigation(id);
}
