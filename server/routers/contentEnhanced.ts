import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLMWithRetry } from "../llm";
import {
  getActiveKnowledge,
  createXiaohongshuPost,
  getAllMedicalProjects,
  updateXiaohongshuPost,
} from "../db";
import { generateImage } from "../_core/imageGeneration";
import { contentGenerationLimiter } from "../_core/rateLimiter";
import {
  validateContent,
  getContentSuggestions,
} from "../_core/contentValidator";
import { xiaohongshuContentHistory } from "../../drizzle/schema";
import { getDb } from "../db";
import { eq, desc, sql } from "drizzle-orm";
import { logger } from "../_core/logger";
import type { ContentTemplate } from "../../shared/api-types";

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
   - 示例结构：
     * 开头：介绍自己的问题和需求
     * 过程：选择机构的原因、面诊过程、治疗过程
     * 感受：疼痛感、恢复期体验、注意事项
     * 效果：治疗后的变化、满意度
     * 结尾：建议和互动引导
   - 重点突出个人感受和真实体验

2. **效果对比（case）**：
   - 重点突出治疗前后的变化
   - 用数据和细节增强说服力
   - 可以描述：治疗前的问题、治疗过程、治疗后效果
   - 适当使用对比描述（如"之前...现在..."）
   - 可加入前后对比的时间节点

3. **价格揭秘（price）**：
   - 透明化价格信息，帮助读者了解市场行情
   - 可以包含：项目价格区间、影响因素、如何选择
   - 避免：直接报价或承诺价格
   - 提供性价比分析和选择建议

4. **避坑指南（guide）**：
   - 分享选择机构、医生、项目的经验
   - 列出注意事项和常见误区
   - 帮助读者做出明智选择
   - 可以包含：如何选择机构、如何判断医生资质、项目选择建议
   - 提供实用的判断标准

5. **节日营销（holiday）**：
   - 结合节日主题，制造紧迫感
   - 突出优惠和限时活动
   - 但不要过度营销，保持真实感
   - 结合节日氛围和情感共鸣

6. **新品推荐（new_product）**：
   - 介绍最新医美项目或产品
   - 突出创新点和独特优势
   - 提供适用人群和使用感受
   - 强调安全性和效果

**内容优化要求：**
- 使用至少3种不同类型的emoji
- 每段不超过3行，保持易读性
- 适当使用数字和百分比增加可信度
- 结尾要有明确的互动引导
- 语言要自然流畅，避免AI痕迹

**禁止事项（具体表现）：**
- ❌ 不要过度夸张：如"100%有效"、"永久不反弹"等绝对化表述
- ❌ 不要虚假宣传：如夸大效果、编造案例
- ❌ 不要使用过多医疗术语：如"黑色素细胞"、"真皮层"等，要用通俗语言
- ❌ 不要直接打广告：避免"快来我们机构"等直接推销
- ❌ 不要承诺100%效果：要客观描述，说明个体差异
- ❌ 不要贬低竞争对手：保持专业和客观
- ❌ 不要使用过于低俗的语言：保持专业和优雅
- ❌ 不要出现明显的AI生成痕迹：如重复性表述、机械化语言`;

export const contentRouterEnhanced = router({
  /**
   * 获取医美项目列表
   */
  getProjects: protectedProcedure.query(async () => {
    const projects = await getAllMedicalProjects(true);
    return projects.map(p => ({
      ...p,
      keywords: p.keywords ? JSON.parse(p.keywords) : [],
    }));
  }),

  /**
   * 生成小红书爽文（增强版）
   */
  generate: protectedProcedure
    .input(
      z.object({
        type: z.enum([
          "project",
          "case",
          "price",
          "guide",
          "holiday",
          "new_product",
        ]),
        project: z.string().max(200).optional(),
        keywords: z.array(z.string().max(100)).optional(),
        tone: z.enum(["enthusiastic", "professional", "casual"]).optional(),
        useCache: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const {
        type,
        project,
        keywords,
        tone = "enthusiastic",
        useCache,
      } = input;

      // Rate limiting
      const rateLimit = contentGenerationLimiter.check(
        ctx.user.openId || "anonymous"
      );
      if (!rateLimit.allowed) {
        throw new Error(
          `生成次数过多，请 ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} 秒后重试`
        );
      }

      logger.info(
        `[Content] Generating content for ${project || "unknown"} project`
      );

      try {
        // 获取相关知识库内容
        const knowledgeItems = await getActiveKnowledge();
        let relevantKnowledge = knowledgeItems;

        // 根据项目筛选知识库
        if (project) {
          relevantKnowledge = knowledgeItems.filter(
            k =>
              k.title.includes(project) ||
              k.content.includes(project) ||
              (k.tags && k.tags.includes(project))
          );
        }

        // 构建知识库上下文
        const knowledgeContext =
          relevantKnowledge.length > 0
            ? "\n\n参考知识库：\n" +
              relevantKnowledge
                .slice(0, 5)
                .map(k => `【${k.title}】\n${k.content}`)
                .join("\n\n")
            : "";

        // 根据类型构建提示词
        let typePrompt = "";
        switch (type) {
          case "project":
            typePrompt = `请生成一篇关于"${project || "医美项目"}"的体验分享文案。以第一人称叙述，分享真实的治疗过程、效果和感受。`;
            break;
          case "case":
            typePrompt = `请生成一篇关于"${project || "医美项目"}"的效果对比文案。重点突出治疗前后的变化，用数据和细节增强说服力。`;
            break;
          case "price":
            typePrompt = `请生成一篇关于"${project || "医美项目"}"的价格揭秘文案。透明化价格信息，帮助读者了解市场行情，避免被坑。`;
            break;
          case "guide":
            typePrompt = `请生成一篇关于"${project || "医美项目"}"的避坑指南文案。分享选择机构、医生、项目的经验和注意事项。`;
            break;
          case "holiday":
            typePrompt = `请生成一篇节日营销文案，结合"${project || "医美项目"}"，制造紧迫感和优惠吸引力。`;
            break;
          case "new_product":
            typePrompt = `请生成一篇关于"${project || "医美项目"}"的新品推荐文案。介绍最新医美项目或产品的创新点和独特优势，提供适用人群和使用感受，强调安全性和效果。`;
            break;
        }

        // 添加关键词
        if (keywords && keywords.length > 0) {
          typePrompt += `\n\n必须包含以下关键词：${keywords.join("、")}`;
        }

        // 添加语气要求
        const toneMap = {
          enthusiastic: "语气要热情洋溢，充满激情",
          professional: "语气要专业严谨，值得信赖",
          casual: "语气要轻松随意，像朋友聊天",
        };
        typePrompt += `\n\n${toneMap[tone]}。`;

        // 调用增强版 LLM（带缓存和重试）
        const response = await invokeLLMWithRetry(
          {
            messages: [
              {
                role: "system",
                content: CONTENT_GENERATION_PROMPT + knowledgeContext,
              },
              {
                role: "user",
                content: typePrompt,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "xiaohongshu_content",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    title: {
                      type: "string",
                      description: "小红书标题，需要吸引眼球，包含emoji",
                    },
                    content: {
                      type: "string",
                      description: "正文内容，结构清晰，包含emoji",
                    },
                    tags: {
                      type: "array",
                      description: "话题标签，以#开头",
                      items: {
                        type: "string",
                      },
                    },
                  },
                  required: ["title", "content", "tags"],
                  additionalProperties: false,
                },
              },
            },
          },
          {
            enableCache: useCache,
            maxRetries: 3,
            retryDelay: 1000,
          }
        );

        const choice = response?.choices?.[0];
        if (!choice?.message?.content) {
          throw new Error(
            "一键爽文生成失败：模型未返回内容。请检查 .env 中 VOLC_ARK_* 或 DEEPSEEK_API_KEY / Forge 是否配置正确。"
          );
        }
        const contentString =
          typeof choice.message.content === "string"
            ? choice.message.content
            : JSON.stringify(choice.message.content);
        let generatedContent: {
          title?: string;
          content?: string;
          tags?: string[];
        };
        try {
          generatedContent = JSON.parse(contentString || "{}");
        } catch {
          throw new Error(
            `一键爽文生成失败：模型返回不是合法 JSON。请重试或更换模型。`
          );
        }
        if (
          typeof generatedContent.title !== "string" ||
          typeof generatedContent.content !== "string" ||
          !Array.isArray(generatedContent.tags)
        ) {
          throw new Error(
            "一键爽文生成失败：返回缺少 title/content/tags。请重试。"
          );
        }

        // 验证内容质量
        const validation = validateContent(
          generatedContent.title,
          generatedContent.content,
          generatedContent.tags
        );

        // 获取改进建议
        const suggestions = getContentSuggestions(
          generatedContent.title,
          generatedContent.content,
          generatedContent.tags
        );

        // 创建内容记录
        const postResult = await createXiaohongshuPost({
          title: generatedContent.title,
          content: generatedContent.content,
          tags: JSON.stringify(generatedContent.tags),
          contentType: type,
          project: project || null,
          status: "draft",
        });

        // 保存到历史记录
        const db = await getDb();
        if (db && postResult.id) {
          await db.insert(xiaohongshuContentHistory).values({
            postId: postResult.id,
            version: 1,
            title: generatedContent.title,
            content: generatedContent.content,
            tags: JSON.stringify(generatedContent.tags),
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

        logger.info(
          `[Content] Generated content with score ${validation.score}, fromCache: ${response.fromCache}`
        );

        return {
          title: generatedContent.title,
          content: generatedContent.content,
          tags: generatedContent.tags,
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
          throw new Error(
            `一键爽文生成失败：${msg}。请检查 .env 中 VOLC_ARK_* 或 DEEPSEEK_API_KEY / Forge。`
          );
        }
        throw error;
      }
    }),

  /**
   * 为内容生成配图（增强版）
   */
  generateImage: protectedProcedure
    .input(
      z.object({
        title: z.string().max(200),
        content: z.string().max(10000),
        project: z.string().max(200).optional(),
        style: z.enum(["modern", "elegant", "vibrant"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { title, content, project, style = "modern" } = input;

      // Rate limiting
      const rateLimit = contentGenerationLimiter.check(
        ctx.user.openId || "anonymous"
      );
      if (!rateLimit.allowed) {
        throw new Error(
          `生成次数过多，请 ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} 秒后重试`
        );
      }

      logger.info(`[Content] Generating image for ${title}`);

      // 构建图片生成 prompt
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
        const result = await generateImage({
          prompt: imagePrompt,
        });

        logger.info(`[Content] Image generated successfully`);
        return {
          url: result.url,
        };
      } catch (error) {
        logger.error("[Content] Image generation failed:", error);
        throw new Error("图片生成失败，请稍后重试");
      }
    }),

  /**
   * 获取内容历史记录
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        postId: z.number(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const history = await db
        .select()
        .from(xiaohongshuContentHistory)
        .where(eq(xiaohongshuContentHistory.postId, input.postId))
        .orderBy(desc(xiaohongshuContentHistory.createdAt))
        .limit(input.limit);

      return history.map(h => ({
        ...h,
        tags: h.tags ? JSON.parse(h.tags) : [],
        validationErrors: h.validationErrors
          ? JSON.parse(h.validationErrors)
          : [],
        validationWarnings: h.validationWarnings
          ? JSON.parse(h.validationWarnings)
          : [],
        generationParams: h.generationParams
          ? JSON.parse(h.generationParams)
          : null,
      }));
    }),

  /**
   * 获取内容质量分析
   */
  analyzeQuality: protectedProcedure
    .input(
      z.object({
        title: z.string().max(200),
        content: z.string().max(10000),
        tags: z.array(z.string().max(100)),
      })
    )
    .mutation(async ({ input }) => {
      const validation = validateContent(
        input.title,
        input.content,
        input.tags
      );
      const suggestions = getContentSuggestions(
        input.title,
        input.content,
        input.tags
      );

      return {
        validation,
        suggestions,
      };
    }),

  /**
   * 获取小红书写作技巧和建议
   * TODO: 将写作技巧数据迁移到数据库，支持动态配置
   */
  getWritingTips: protectedProcedure.query(async () => {
    return {
      tips: [],
      generalTips: [],
      message: "写作技巧数据尚未配置，请联系管理员添加",
    };
  }),

  /**
   * 获取预设模板
   * TODO: 将模板数据迁移到数据库，支持用户自定义模板
   */
  getTemplates: protectedProcedure.query(async () => {
    return {
      templates: [] as ContentTemplate[],
      allTypes: ["project", "case", "price", "guide", "holiday", "new_product"],
      message: "模板数据尚未配置，请使用「一键爽文」功能自动生成内容",
    };
  }),

  /**
   * 使用模板生成内容
   */
  generateFromTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        customizations: z.record(z.string(), z.string().max(1000)).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: 基于模板生成内容 — 需要模板库表和 LLM 填充逻辑
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "模板生成功能尚未实现，请使用「一键爽文」功能生成内容",
      });
    }),

  /**
   * 批量生成内容
   */
  bulkGenerate: protectedProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            type: z.enum([
              "project",
              "case",
              "price",
              "guide",
              "holiday",
              "new_product",
            ]),
            project: z.string().max(200).optional(),
            keywords: z.array(z.string().max(100)).optional(),
            tone: z.enum(["enthusiastic", "professional", "casual"]).optional(),
          })
        ),
        batchSize: z.number().default(5), // 每批处理的数量
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { items, batchSize } = input;
      const results = [];
      let processed = 0;
      const total = items.length;

      // 分批处理
      for (let i = 0; i < total; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        // 并行处理当前批次
        const batchResults = await Promise.allSettled(
          batch.map(async item => {
            try {
              // 获取相关知识库内容
              const knowledgeItems = await getActiveKnowledge();
              let relevantKnowledge = knowledgeItems;
              if (item.project) {
                relevantKnowledge = knowledgeItems.filter(
                  k =>
                    k.title.includes(item.project!) ||
                    k.content.includes(item.project!) ||
                    (k.tags && k.tags.includes(item.project!))
                );
              }
              const knowledgeContext =
                relevantKnowledge.length > 0
                  ? "\n\n参考知识库：\n" +
                    relevantKnowledge
                      .slice(0, 3)
                      .map(k => `【${k.title}】\n${k.content}`)
                      .join("\n\n")
                  : "";

              // 根据类型构建提示词
              const typePromptMap: Record<string, string> = {
                project: `请生成一篇关于"${item.project || "医美项目"}"的体验分享文案。`,
                case: `请生成一篇关于"${item.project || "医美项目"}"的效果对比文案。`,
                price: `请生成一篇关于"${item.project || "医美项目"}"的价格揭秘文案。`,
                guide: `请生成一篇关于"${item.project || "医美项目"}"的避坑指南文案。`,
                holiday: `请生成一篇节日营销文案，结合"${item.project || "医美项目"}"。`,
                new_product: `请生成一篇关于"${item.project || "医美项目"}"的新品推荐文案。`,
              };
              let typePrompt =
                typePromptMap[item.type] || typePromptMap.project;
              if (item.keywords && item.keywords.length > 0) {
                typePrompt += `\n\n必须包含以下关键词：${item.keywords.join("、")}`;
              }

              // 调用 LLM 生成内容
              const response = await invokeLLMWithRetry(
                {
                  messages: [
                    {
                      role: "system",
                      content: CONTENT_GENERATION_PROMPT + knowledgeContext,
                    },
                    { role: "user", content: typePrompt },
                  ],
                  response_format: {
                    type: "json_schema",
                    json_schema: {
                      name: "xiaohongshu_content",
                      strict: true,
                      schema: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          content: { type: "string" },
                          tags: { type: "array", items: { type: "string" } },
                        },
                        required: ["title", "content", "tags"],
                        additionalProperties: false,
                      },
                    },
                  },
                },
                { enableCache: true, maxRetries: 3, retryDelay: 1000 }
              );

              const choice = response?.choices?.[0];
              if (!choice?.message?.content) {
                throw new Error("批量生成失败：模型未返回内容");
              }
              const contentString =
                typeof choice.message.content === "string"
                  ? choice.message.content
                  : JSON.stringify(choice.message.content);
              const generated = JSON.parse(contentString || "{}");
              if (
                typeof generated.title !== "string" ||
                typeof generated.content !== "string" ||
                !Array.isArray(generated.tags)
              ) {
                throw new Error("批量生成失败：返回缺少 title/content/tags");
              }

              // 保存到数据库
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
                data: {
                  title: generated.title,
                  content: generated.content,
                  tags: generated.tags,
                  postId: postResult.id,
                },
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

        // 添加批次结果到总结果
        results.push(
          ...batchResults.map(result =>
            result.status === "fulfilled"
              ? result.value
              : {
                  success: false,
                  error:
                    result.reason instanceof Error
                      ? result.reason.message
                      : String(result.reason),
                  index: -1, // 索引信息可能丢失，需要改进
                }
          )
        );

        // 添加延迟以避免API限制
        if (i + batchSize < total) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒延迟
        }
      }

      return {
        success: true,
        total: total,
        processed,
        results,
        message: `批量生成完成，共处理 ${processed}/${total} 个项目`,
      };
    }),

  /**
   * 定时发布内容
   */
  schedulePost: protectedProcedure
    .input(
      z.object({
        postId: z.number(),
        scheduledTime: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      // 更新文章状态为 scheduled
      // 注意：自动发布需要任务队列（如 BullMQ / node-cron），当前需手动发布
      await updateXiaohongshuPost(input.postId, {
        status: "scheduled",
        scheduledAt: input.scheduledTime.toISOString(),
      });

      return {
        success: true,
        message: `内容已安排在 ${input.scheduledTime.toLocaleString()} 发布（需手动触发或配置定时任务队列）`,
        scheduledTime: input.scheduledTime,
        autoPublishEnabled: false,
      };
    }),
});
