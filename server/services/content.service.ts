/**
 * Content Service
 * 小红书内容生成业务逻辑；router 只负责鉴权与参数校验。
 */

import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import { invokeLLMWithRetry, invokeLLM } from "../llm";
import {
  getActiveKnowledge,
  createXiaohongshuPost,
  getAllMedicalProjects,
  updateXiaohongshuPost,
} from "../db";
import { generateImage } from "../_core/imageGeneration";
import { contentGenerationLimiter } from "../_core/rateLimiter";
import { validateContent, getContentSuggestions } from "../_core/contentValidator";
import { xiaohongshuContentHistory } from "../../drizzle/schema";
import { getDb } from "../db";
import { logger } from "../_core/logger";
import type { ContentTemplate } from "../../shared/api-types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONTENT_GENERATION_PROMPT = `你是一位专业的小红书医美内容创作者，擅长撰写吸引人的医美项目推广文案。

**写作风格要求：**
1. **标题**：要有吸引力，使用emoji和数字，制造悬念或好奇心
   - 示例："做了3次超皮秒，我的斑终于消失了！✨"
   - 示例："花5000块做的祛斑，值不值得？真实分享"
   - 避免：过于夸张或虚假的标题
   - 长度控制在15-25字之间

2. **正文结构**：
   - 开头：吸引注意（问题、痛点、对比）
   - 中间：详细描述（过程、感受、细节）
   - 结尾：总结+引导互动（欢迎评论、私信等）

3. **语言风格**：
   - 真实、接地气，像朋友分享经验一样
   - 多用emoji增加可读性和亲和力（但不要过度）
   - 使用第一人称，增加真实感
   - 适当使用网络用语，但不要过于低俗
   - 语言要生动，多用形容词和感官词汇

4. **内容要点**：
   - 突出效果、价格、恢复期等关键信息
   - 加入个人感受和细节描写（如疼痛感、恢复过程）
   - 结构清晰，使用分点、分段
   - 添加相关话题标签（#医美 #祛斑 #超皮秒等）
   - 字数控制在300-800字之间

**不同内容类型的详细要求：**

1. **项目体验分享（project）**：
   - 以第一人称叙述，分享真实的治疗过程
   - 包含：为什么选择这个项目、治疗过程、疼痛感、恢复期、效果
   - 重点突出个人感受和真实体验

2. **效果对比（case）**：
   - 重点突出治疗前后的变化
   - 用数据和细节增强说服力
   - 适当使用对比描述（如"之前...现在..."）

3. **价格揭秘（price）**：
   - 透明化价格信息，帮助读者了解市场行情
   - 避免：直接报价或承诺价格

4. **避坑指南（guide）**：
   - 分享选择机构、医生、项目的经验
   - 列出注意事项和常见误区

5. **节日营销（holiday）**：
   - 结合节日主题，制造紧迫感
   - 突出优惠和限时活动，但不要过度营销

6. **新品推荐（new_product）**：
   - 介绍最新医美项目或产品
   - 突出创新点和独特优势，强调安全性和效果

**内容优化要求：**
- 使用至少3种不同类型的emoji
- 每段不超过3行，保持易读性
- 适当使用数字和百分比增加可信度
- 结尾要有明确的互动引导
- 语言要自然流畅，避免AI痕迹

**禁止事项（具体表现）：**
- ❌ 不要过度夸张：如"100%有效"、"永久不反弹"等绝对化表述
- ❌ 不要虚假宣传：如夸大效果、编造案例
- ❌ 不要使用过多医疗术语：要用通俗语言
- ❌ 不要直接打广告：避免"快来我们机构"等直接推销
- ❌ 不要承诺100%效果：要客观描述，说明个体差异
- ❌ 不要贬低竞争对手：保持专业和客观
- ❌ 不要出现明显的AI生成痕迹：如重复性表述、机械化语言`;

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  {
    id: "tpl_project_intro",
    name: "项目介绍模板",
    type: "project" as any,
    description: "适合介绍单个医美项目，包含原理、适应症、效果",
    structure: "【标题】项目名称 + 核心效果\n【开场】痛点共鸣\n【正文】项目原理 + 适合人群 + 效果说明\n【结尾】预约/咨询引导",
    example: "28天淡斑实测！超皮秒真的有用吗？\n...",
  },
  {
    id: "tpl_case_story",
    name: "客户案例模板",
    type: "case" as any,
    description: "真实客户改善案例，前后对比，增强可信度",
    structure: "【标题】改善效果 + 时间周期\n【背景】客户肤质问题\n【过程】治疗方案和次数\n【效果】具体数据化描述\n【结尾】同类问题欢迎咨询",
    example: "油皮痘印3个月消退80%！记录我的超皮秒修复之旅\n...",
  },
  {
    id: "tpl_holiday_promo",
    name: "节日促销模板",
    type: "holiday" as any,
    description: "节日限定套餐推广，制造稀缺感和情感共鸣",
    structure: "【标题】节日 + 专属优惠\n【情感】节日祝福和情感共鸣\n【内容】套餐详情和优惠力度\n【结尾】限时提醒 + 私信咨询",
    example: "母亲节专属丨送妈妈最好的礼物，就是让她变美\n...",
  },
  {
    id: "tpl_science_guide",
    name: "科普指南模板",
    type: "guide" as any,
    description: "专业知识科普，建立权威形象，吸引精准客户",
    structure: "【标题】问题/误区 + 正确答案\n【误区点】常见错误认知\n【正解】专业解释\n【建议】实操指南\n【总结】收藏备用引导",
    example: "玻尿酸≠无限补水！皮肤科医生揭秘4个注射误区\n...",
  },
  {
    id: "tpl_price_reveal",
    name: "价格揭秘模板",
    type: "price" as any,
    description: "透明化价格，结合价值说明，降低咨询门槛",
    structure: "【标题】项目名称 + 价格区间\n【说明】影响价格的因素\n【对比】市场均价 vs 机构价格\n【建议】如何选择适合自己的方案\n【结尾】预约面诊了解个性化方案",
    example: "热玛吉到底多少钱？全面拆解价格背后的秘密\n...",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildKnowledgeContext(knowledgeItems: any[], project: string | undefined, maxItems = 5): string {
  let relevant = knowledgeItems;
  if (project) {
    relevant = knowledgeItems.filter(
      k => k.title.includes(project) || k.content.includes(project) || (k.tags && k.tags.includes(project))
    );
  }
  if (relevant.length === 0) return "";
  return "\n\n参考知识库：\n" + relevant.slice(0, maxItems).map(k => `【${k.title}】\n${k.content}`).join("\n\n");
}

function buildTypePrompt(
  type: "project" | "case" | "price" | "guide" | "holiday" | "new_product",
  project: string | undefined,
  keywords: string[] | undefined,
  tone: "enthusiastic" | "professional" | "casual"
): string {
  const projectLabel = project || "医美项目";
  const typePromptMap: Record<string, string> = {
    project: `请生成一篇关于"${projectLabel}"的体验分享文案。以第一人称叙述，分享真实的治疗过程、效果和感受。`,
    case: `请生成一篇关于"${projectLabel}"的效果对比文案。重点突出治疗前后的变化，用数据和细节增强说服力。`,
    price: `请生成一篇关于"${projectLabel}"的价格揭秘文案。透明化价格信息，帮助读者了解市场行情，避免被坑。`,
    guide: `请生成一篇关于"${projectLabel}"的避坑指南文案。分享选择机构、医生、项目的经验和注意事项。`,
    holiday: `请生成一篇节日营销文案，结合"${projectLabel}"，制造紧迫感和优惠吸引力。`,
    new_product: `请生成一篇关于"${projectLabel}"的新品推荐文案。介绍最新医美项目或产品的创新点和独特优势，提供适用人群和使用感受，强调安全性和效果。`,
  };
  let prompt = typePromptMap[type];
  if (keywords && keywords.length > 0) {
    prompt += `\n\n必须包含以下关键词：${keywords.join("、")}`;
  }
  const toneMap = {
    enthusiastic: "语气要热情洋溢，充满激情",
    professional: "语气要专业严谨，值得信赖",
    casual: "语气要轻松随意，像朋友聊天",
  };
  prompt += `\n\n${toneMap[tone]}。`;
  return prompt;
}

const JSON_SCHEMA_XIAOHONGSHU = {
  type: "json_schema" as const,
  json_schema: {
    name: "xiaohongshu_content",
    strict: true,
    schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "小红书标题，需要吸引眼球，包含emoji" },
        content: { type: "string", description: "正文内容，结构清晰，包含emoji" },
        tags: { type: "array", description: "话题标签，以#开头", items: { type: "string" } },
      },
      required: ["title", "content", "tags"],
      additionalProperties: false,
    },
  },
};

function checkRateLimit(userId: string) {
  const rateLimit = contentGenerationLimiter.check(userId);
  if (!rateLimit.allowed) {
    throw new Error(`生成次数过多，请 ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} 秒后重试`);
  }
}

function parseLLMContent(contentString: string, errorPrefix: string): { title: string; content: string; tags: string[] } {
  let parsed: { title?: string; content?: string; tags?: string[] };
  try {
    parsed = JSON.parse(contentString || "{}");
  } catch {
    throw new Error(`${errorPrefix}：模型返回不是合法 JSON。请重试或更换模型。`);
  }
  if (typeof parsed.title !== "string" || typeof parsed.content !== "string" || !Array.isArray(parsed.tags)) {
    throw new Error(`${errorPrefix}：返回缺少 title/content/tags。请重试。`);
  }
  return { title: parsed.title, content: parsed.content, tags: parsed.tags };
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function getProjects() {
  const projects = await getAllMedicalProjects(true);
  return projects.map(p => ({
    ...p,
    keywords: p.keywords ? JSON.parse(p.keywords) : [],
  }));
}

export async function generateContent(
  input: {
    type: "project" | "case" | "price" | "guide" | "holiday" | "new_product";
    project?: string;
    keywords?: string[];
    tone?: "enthusiastic" | "professional" | "casual";
    useCache: boolean;
  },
  userId: string
) {
  const { type, project, keywords, tone = "enthusiastic", useCache } = input;

  checkRateLimit(userId);
  logger.info(`[Content] Generating content for ${project || "unknown"} project`);

  try {
    const knowledgeItems = await getActiveKnowledge();
    const knowledgeContext = buildKnowledgeContext(knowledgeItems, project);
    const typePrompt = buildTypePrompt(type, project, keywords, tone);

    const response = await invokeLLMWithRetry(
      {
        messages: [
          { role: "system", content: CONTENT_GENERATION_PROMPT + knowledgeContext },
          { role: "user", content: typePrompt },
        ],
        response_format: JSON_SCHEMA_XIAOHONGSHU,
      },
      { enableCache: useCache, maxRetries: 3, retryDelay: 1000 }
    );

    const choice = response?.choices?.[0];
    if (!choice?.message?.content) {
      throw new Error("一键爽文生成失败：模型未返回内容。请检查 .env 中 VOLC_ARK_* 或 DEEPSEEK_API_KEY / Forge 是否配置正确。");
    }
    const contentString = typeof choice.message.content === "string"
      ? choice.message.content
      : JSON.stringify(choice.message.content);

    const generated = parseLLMContent(contentString, "一键爽文生成失败");

    const validation = validateContent(generated.title, generated.content, generated.tags);
    const suggestions = getContentSuggestions(generated.title, generated.content, generated.tags);

    const postResult = await createXiaohongshuPost({
      title: generated.title,
      content: generated.content,
      tags: JSON.stringify(generated.tags),
      contentType: type,
      project: project || null,
      status: "draft",
    });

    const db = await getDb();
    if (db && postResult.id) {
      await db.insert(xiaohongshuContentHistory).values({
        postId: postResult.id,
        version: 1,
        title: generated.title,
        content: generated.content,
        tags: JSON.stringify(generated.tags),
        contentType: type,
        project: project || null,
        qualityScore: validation.score,
        validationErrors: JSON.stringify(validation.errors),
        validationWarnings: JSON.stringify(validation.warnings),
        generatedBy: "ai",
        generationParams: JSON.stringify(input),
        fromCache: response.fromCache ? 1 : 0,
      } as any);
    }

    logger.info(`[Content] Generated content with score ${validation.score}, fromCache: ${response.fromCache}`);

    return {
      title: generated.title,
      content: generated.content,
      tags: generated.tags,
      validation,
      suggestions,
      fromCache: response.fromCache,
      retryCount: response.retryCount,
      postId: postResult.id,
    };
  } catch (error) {
    logger.error("[Content] Generation failed:", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes("一键爽文")) {
      throw new Error(`一键爽文生成失败：${msg}。请检查 .env 中 VOLC_ARK_* 或 DEEPSEEK_API_KEY / Forge。`);
    }
    throw error;
  }
}

export async function generateContentImage(
  input: { title: string; content: string; project?: string; style?: "modern" | "elegant" | "vibrant" },
  userId: string
) {
  const { title, project, style = "modern" } = input;

  checkRateLimit(userId);
  logger.info(`[Content] Generating image for ${title}`);

  const styleMap = {
    modern: "现代简约风格，干净清爽的背景，柔和的色调",
    elegant: "优雅高级风格，奢华质感，金色或粉色调",
    vibrant: "活力鲜艳风格，明亮色彩，年轻时尚",
  };

  const imagePrompt = `Create a professional medical beauty promotional image for Xiaohongshu (Little Red Book).

Project: ${project || "medical beauty"}
Title: ${title}

Style: ${styleMap[style]}

Requirements:
- Clean, professional medical aesthetics
- Include subtle medical beauty elements (like skincare products, treatment equipment)
- Warm, inviting atmosphere
- High-end, trustworthy visual style
- Suitable for social media sharing
- No text or Chinese characters in the image
- Focus on beauty, health, and confidence

Color palette: Soft pinks, whites, golds, or pastels depending on the style.`;

  try {
    const result = await generateImage({ prompt: imagePrompt });
    const FALLBACK_URL = "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9";
    const imageUrl = result.url ?? FALLBACK_URL;
    const isFallback = imageUrl.startsWith(FALLBACK_URL);
    logger.info(`[Content] Image generated, fallback=${isFallback}`);
    return {
      url: imageUrl,
      isFallback,
      fallbackReason: isFallback
        ? "未配置图片生成服务（VOLC_IMAGE_API），使用了占位图。请配置环境变量启用真实图片生成。"
        : undefined,
    };
  } catch (error) {
    logger.error("[Content] Image generation failed:", error);
    throw new Error("图片生成失败，请稍后重试");
  }
}

export async function getContentHistory(postId: number, limit: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const history = await db
    .select()
    .from(xiaohongshuContentHistory)
    .where(eq(xiaohongshuContentHistory.postId, postId))
    .orderBy(desc(xiaohongshuContentHistory.createdAt))
    .limit(limit);

  return history.map(h => ({
    ...h,
    tags: h.tags ? JSON.parse(h.tags) : [],
    validationErrors: h.validationErrors ? JSON.parse(h.validationErrors) : [],
    validationWarnings: h.validationWarnings ? JSON.parse(h.validationWarnings) : [],
    generationParams: h.generationParams ? JSON.parse(h.generationParams) : null,
  }));
}

export function analyzeContentQuality(title: string, content: string, tags: string[]) {
  return {
    validation: validateContent(title, content, tags),
    suggestions: getContentSuggestions(title, content, tags),
  };
}

export function getWritingTips() {
  const tips: Record<string, string[]> = {
    project: [
      "标题用数字增强可信度：「28天改善肤色」比「改善肤色」更有吸引力",
      "开头3秒留住读者：用痛点提问或意外结论开场",
      "正文结构：痛点 → 解决方案 → 效果展示 → 行动召唤",
      "用「我」的视角代入感更强，避免纯广告语气",
      "结尾加互动引导：「你们有同样烦恼吗？评论区聊聊」",
    ],
    case: [
      "前后对比图最吸睛，确保光线、角度、妆容一致",
      "真实客户故事比营销文字更有说服力",
      "说明改善周期和次数，增加可参考性",
      "提及客户的具体肤质问题，让读者产生共鸣",
      "用数据量化效果：「3次疗程后毛孔缩小约40%」",
    ],
    price: [
      "不要直接说价格，先说价值，再说优惠",
      "锚定高价参考：「市场价通常8000-12000，活动价4800」",
      "限时/限量制造紧迫感，但要真实可信",
      "套餐组合比单项更能提高客单价",
      "结尾引导私信咨询，不要在评论区公开详细价格",
    ],
    guide: [
      "步骤清晰，用数字列表，方便读者收藏",
      "加入专业名词解释，体现权威性",
      "穿插自身经验，增强亲和力",
      "提示常见误区，帮读者避坑",
      "末尾加总结和推荐，提供行动指引",
    ],
    holiday: [
      "节日内容要提前7-10天发布，趁流量高峰",
      "结合节日情感诉求，比如母亲节主打「送给妈妈的礼物」",
      "限定礼盒/套餐设计，增强节日仪式感",
      "节日祝福文案真诚，不要太商业化",
      "配合节日色系配图，提升视觉一致性",
    ],
    new_product: [
      "新品发布要制造期待感，可以提前预告",
      "说清楚「新在哪里」：成分升级、技术迭代、使用体验",
      "对比旧方案，突出改进点",
      "邀请粉丝体验官，用UGC增加可信度",
      "首发优惠吸引早期用户，形成口碑传播",
    ],
  };

  const generalTips = [
    "封面图决定点击率，文字不超过10个字",
    "标签选择精准 > 热门，覆盖3-5个垂直标签",
    "发布时间：工作日晚7-9点，周末早10-11点流量最高",
    "前5条评论的互动决定算法推荐力度，发布后及时回复",
    "图片9张优先，视频笔记完播率影响推荐",
  ];

  return { tips: tips.project, generalTips };
}

export function getContentTemplates() {
  return {
    templates: CONTENT_TEMPLATES,
    allTypes: ["project", "case", "price", "guide", "holiday", "new_product"],
  };
}

export async function generateFromTemplate(
  templateId: string,
  customizations: Record<string, string> | undefined,
  userId: string
) {
  const tpl = CONTENT_TEMPLATES.find(t => t.id === templateId);
  if (!tpl) throw new TRPCError({ code: "NOT_FOUND", message: "模板不存在" });

  checkRateLimit(userId);

  const customText = customizations
    ? Object.entries(customizations).map(([k, v]) => `${k}: ${v}`).join("\n")
    : "";

  const prompt = `你是小红书医美内容创作专家。请根据以下模板结构生成一篇完整的小红书笔记。

模板名称：${tpl.name}
模板结构：
${tpl.structure}

${customText ? `用户自定义信息：\n${customText}\n` : ""}要求：
- 语气自然、真实，不要太商业化
- 标题吸引人，正文500-800字
- 结尾加3-5个相关话题标签
- 返回格式：{"title": "标题", "content": "正文内容（不含标题）", "tags": ["标签1", "标签2"]}

只返回JSON，不要有其他内容。`;

  const raw = await invokeLLM({ messages: [{ role: "user" as const, content: prompt }] });
  const text = typeof raw === "string" ? raw : (raw as any).content || "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "生成内容解析失败" });

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    title: parsed.title || "",
    content: parsed.content || "",
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
  };
}

export async function bulkGenerateContent(
  items: Array<{
    type: "project" | "case" | "price" | "guide" | "holiday" | "new_product";
    project?: string;
    keywords?: string[];
    tone?: "enthusiastic" | "professional" | "casual";
  }>,
  batchSize: number,
  userId: string
) {
  const results: any[] = [];
  let processed = 0;
  const total = items.length;

  for (let i = 0; i < total; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map(async item => {
        try {
          checkRateLimit(userId);

          const knowledgeItems = await getActiveKnowledge();
          const knowledgeContext = buildKnowledgeContext(knowledgeItems, item.project, 3);
          const typePrompt = buildTypePrompt(item.type, item.project, item.keywords, item.tone || "enthusiastic");

          const response = await invokeLLMWithRetry(
            {
              messages: [
                { role: "system", content: CONTENT_GENERATION_PROMPT + knowledgeContext },
                { role: "user", content: typePrompt },
              ],
              response_format: JSON_SCHEMA_XIAOHONGSHU,
            },
            { enableCache: true, maxRetries: 3, retryDelay: 1000 }
          );

          const choice = response?.choices?.[0];
          if (!choice?.message?.content) throw new Error("批量生成失败：模型未返回内容");

          const contentString = typeof choice.message.content === "string"
            ? choice.message.content
            : JSON.stringify(choice.message.content);
          const generated = parseLLMContent(contentString, "批量生成失败");

          const postResult = await createXiaohongshuPost({
            title: generated.title,
            content: generated.content,
            tags: JSON.stringify(generated.tags),
            contentType: item.type,
            project: item.project || null,
            status: "draft",
          });

          processed++;

          return {
            success: true,
            data: { title: generated.title, content: generated.content, tags: generated.tags, postId: postResult.id },
            index: i + batch.indexOf(item),
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            index: i + batch.indexOf(item),
          };
        }
      })
    );

    results.push(
      ...batchResults.map(result =>
        result.status === "fulfilled"
          ? result.value
          : { success: false, error: result.reason instanceof Error ? result.reason.message : String(result.reason), index: -1 }
      )
    );

    if (i + batchSize < total) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return {
    success: true,
    total,
    processed,
    results,
    message: `批量生成完成，共处理 ${processed}/${total} 个项目`,
  };
}

export async function schedulePost(postId: number, scheduledTime: Date) {
  await updateXiaohongshuPost(postId, {
    status: "scheduled",
    scheduledAt: scheduledTime.toISOString(),
  });

  return {
    success: true,
    message: `内容已安排在 ${scheduledTime.toLocaleString()} 发布（需手动触发或配置定时任务队列）`,
    scheduledTime,
    autoPublishEnabled: false,
  };
}
