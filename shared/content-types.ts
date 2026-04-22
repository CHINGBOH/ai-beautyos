/**
 * 小红书/内容管理：内容类型与语气风格
 * 与 content.generate / contentEnhanced 的 input 保持一致
 */

export const CONTENT_TYPES = {
  PROJECT: "project",
  CASE: "case",
  PRICE: "price",
  GUIDE: "guide",
  HOLIDAY: "holiday",
  NEW_PRODUCT: "new_product",
} as const;

export type ContentType = (typeof CONTENT_TYPES)[keyof typeof CONTENT_TYPES];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  [CONTENT_TYPES.PROJECT]: "项目体验分享",
  [CONTENT_TYPES.CASE]: "效果对比展示",
  [CONTENT_TYPES.PRICE]: "价格揭秘",
  [CONTENT_TYPES.GUIDE]: "避坑指南",
  [CONTENT_TYPES.HOLIDAY]: "节日营销",
  [CONTENT_TYPES.NEW_PRODUCT]: "新品推荐",
};

export const TONE_TYPES = {
  ENTHUSIASTIC: "enthusiastic",
  PROFESSIONAL: "professional",
  CASUAL: "casual",
} as const;

export type ToneType = (typeof TONE_TYPES)[keyof typeof TONE_TYPES];

export const TONE_TYPE_LABELS: Record<ToneType, string> = {
  [TONE_TYPES.ENTHUSIASTIC]: "热情洋溢",
  [TONE_TYPES.PROFESSIONAL]: "专业严谨",
  [TONE_TYPES.CASUAL]: "轻松随意",
};
