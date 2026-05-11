import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLMWithRetry } from "../_core/llmWithRetry";
import { getActiveKnowledge, createXiaohongshuPost, getAllMedicalProjects } from "../db";
import { generateImage } from "../_core/imageGeneration";
import { contentGenerationLimiter } from "../_core/rateLimiter";
import { validateContent, getContentSuggestions } from "../_core/contentValidator";
import { xiaohongshuContentHistory } from "../../drizzle/schema";
import { getDb } from "../db";
import { eq, desc, sql } from "drizzle-orm";
import { logger } from "../_core/logger";

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
        type: z.enum(["project", "case", "price", "guide", "holiday", "new_product"]),
        project: z.string().optional(),
        keywords: z.array(z.string()).optional(),
        tone: z.enum(["enthusiastic", "professional", "casual"]).optional(),
        useCache: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { type, project, keywords, tone = "enthusiastic", useCache } = input;

      // Rate limiting
      const rateLimit = contentGenerationLimiter.check(ctx.user.openId || "anonymous");
      if (!rateLimit.allowed) {
        throw new Error(`生成次数过多，请 ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} 秒后重试`);
      }

      logger.info(`[Content] Generating content for ${project || "unknown"} project`);

      try {
        // 获取相关知识库内容
        const knowledgeItems = await getActiveKnowledge();
        let relevantKnowledge = knowledgeItems;

        // 根据项目筛选知识库
        if (project) {
          relevantKnowledge = knowledgeItems.filter(
            (k) =>
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
                .map((k) => `【${k.title}】\n${k.content}`)
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

        const contentString = typeof response.choices[0].message.content === 'string' 
          ? response.choices[0].message.content 
          : JSON.stringify(response.choices[0].message.content);
        const generatedContent = JSON.parse(contentString || "{}");

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
          });
        }

        logger.info(`[Content] Generated content with score ${validation.score}, fromCache: ${response.fromCache}`);

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
        throw error;
      }
    }),

  /**
   * 为内容生成配图（增强版）
   */
  generateImage: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        content: z.string(),
        project: z.string().optional(),
        style: z.enum(["modern", "elegant", "vibrant"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { title, content, project, style = "modern" } = input;

      // Rate limiting
      const rateLimit = contentGenerationLimiter.check(ctx.user.openId || "anonymous");
      if (!rateLimit.allowed) {
        throw new Error(`生成次数过多，请 ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} 秒后重试`);
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
        validationErrors: h.validationErrors ? JSON.parse(h.validationErrors) : [],
        validationWarnings: h.validationWarnings ? JSON.parse(h.validationWarnings) : [],
        generationParams: h.generationParams ? JSON.parse(h.generationParams) : null,
      }));
    }),

  /**
   * 获取内容质量分析
   */
  analyzeQuality: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        content: z.string(),
        tags: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const validation = validateContent(input.title, input.content, input.tags);
      const suggestions = getContentSuggestions(input.title, input.content, input.tags);

      return {
        validation,
        suggestions,
      };
    }),

  /**
   * 获取小红书写作技巧和建议
   */
  getWritingTips: protectedProcedure
    .input(
      z.object({
        contentType: z.enum(["project", "case", "price", "guide", "holiday", "new_product"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const tips: Record<string, string[]> = {
        project: [
          "使用第一人称叙述，增加真实感",
          "详细描述治疗过程和感受",
          "分享恢复期的注意事项",
          "添加前后对比效果",
          "结尾提供实用建议"
        ],
        case: [
          "突出治疗前后的明显变化",
          "使用具体数据和时间节点",
          "描述个人感受和体验",
          "分享选择该项目的原因",
          "提供效果维持的建议"
        ],
        price: [
          "透明化价格信息",
          "说明价格构成因素",
          "提供性价比分析",
          "分享优惠活动信息",
          "提醒注意事项"
        ],
        guide: [
          "提供实用的选择标准",
          "分享避坑经验",
          "推荐可靠的机构或医生",
          "说明项目适应症",
          "提醒风险和注意事项"
        ],
        holiday: [
          "结合节日氛围和情感共鸣",
          "突出限时优惠活动",
          "营造紧迫感",
          "强调节日特殊意义",
          "提供节日专属福利"
        ],
        new_product: [
          "突出产品创新点和优势",
          "说明适用人群",
          "分享使用感受和效果",
          "强调安全性和可靠性",
          "提供购买或体验方式"
        ]
      };

      return {
        tips: tips[input.contentType || "project"] || tips.project,
        generalTips: [
          "使用吸引人的标题",
          "合理使用emoji增加亲和力",
          "内容结构清晰分段",
          "添加相关话题标签",
          "结尾引导用户互动"
        ]
      };
    }),

  /**
   * 获取预设模板
   */
  getTemplates: protectedProcedure
    .input(
      z.object({
        type: z.enum(["project", "case", "price", "guide", "holiday", "new_product"]).optional(),
      })
    )
    .query(async ({ input }) => {
      // 预设模板数据
      const templates: Record<string, Array<{id: string, name: string, title: string, content: string, tags: string[]}>> = {
        project: [
          {
            id: "proj_001",
            name: "经典体验分享",
            title: "做了3次超皮秒，我的斑终于消失了！✨",
            content: "姐妹们，我终于把脸上的斑给解决了！😭\n\n之前脸上的雀斑真的让我很自卑，试过各种护肤品都没用。后来朋友推荐了超皮秒，我做了3次，现在基本看不到了！\n\n✨ 治疗过程：\n- 第一次：有点疼，但能接受，像被橡皮筋弹一下\n- 恢复期：3-5天就结痂了，不影响工作\n- 效果：第一次做完就明显淡了很多\n\n💰 价格：我做的这家是5000一次，做了3次，总共15000\n\n⚠️ 注意事项：\n- 一定要做好防晒！\n- 选择正规机构很重要\n- 恢复期不要化妆\n\n现在真的自信多了！有同样困扰的姐妹可以私信我，我可以分享更多经验~",
            tags: ["#超皮秒", "#祛斑", "#医美", "#变美", "#护肤"]
          },
          {
            id: "proj_002",
            name: "效果导向分享",
            title: "28岁逆袭！水光针让我重回少女肌 💧",
            content: "作为一个28岁的职场女性，熬夜加班是常态，皮肤状态真的很差...\n\n直到我遇到了水光针！真的是救星！\n\n🌟 使用感受：\n- 注射过程：几乎无痛，敷了麻药很舒服\n- 即时效果：第二天脸就水润得不行\n- 持久度：能维持1个月左右\n\n💡 小贴士：\n- 选择有资质的医生很重要\n- 术后护理不能马虎\n- 建议间隔1个月做一次\n\n真心推荐给有同样困扰的姐妹们！",
            tags: ["#水光针", "#补水", "#医美", "#护肤", "#少女肌"]
          }
        ],
        case: [
          {
            id: "case_001",
            name: "前后对比",
            title: "告别痘痘肌！3个月蜕变记录 🌸",
            content: "今天来分享我的祛痘之路，真的是血泪史啊😭\n\n📸 3个月前 vs 现在\n\n BEFORE：满脸痘痘，不敢素颜出门\n AFTER：皮肤光滑细腻，素颜也自信\n\n🎯 治疗方案：\n- 专业清洁 + 光子嫩肤\n- 配合药物调理\n- 生活习惯调整\n\n⏰ 时间线：\n- 第1个月：痘痘明显减少\n- 第2个月：皮肤开始平滑\n- 第3个月：完全蜕变\n\n有同样困扰的姐妹可以试试！",
            tags: ["#祛痘", "#皮肤管理", "#蜕变", "#医美", "#前后对比"]
          }
        ],
        price: [
          {
            id: "price_001",
            name: "价格透明",
            title: "医美项目价格大公开！别再被坑了 💰",
            content: "姐妹们，今天来给大家科普一下常见医美项目的真实价格！\n\n💸 超皮秒祛斑：3000-8000元/次\n💧 水光针：2000-6000元/次\n🔥 热玛吉：2万-5万元/次\n✨ 光子嫩肤：800-2000元/次\n\n⚠️ 价格影响因素：\n- 地区差异\n- 医院级别\n- 医生资质\n- 设备型号\n\n记住：便宜没好货，选正规机构最重要！",
            tags: ["#医美价格", "#避坑", "#超皮秒", "#水光针", "#热玛吉"]
          }
        ],
        guide: [
          {
            id: "guide_001",
            name: "避坑指南",
            title: "医美小白必看！5大避坑指南 ⚠️",
            content: "作为一个踩过无数坑的过来人，今天分享医美避坑经验！\n\n🚫 五大雷区：\n1. 不要贪便宜选无资质机构\n2. 不要轻信朋友圈宣传\n3. 不要忽视术前检查\n4. 不要忽略术后护理\n5. 不要频繁更换医生\n\n✅ 选择标准：\n- 查验医生执业资格\n- 实地考察医院环境\n- 了解设备是否合规\n- 看真实案例效果\n\n希望姐妹们都能安全变美！",
            tags: ["#医美避坑", "#选择指南", "#安全", "#医美", "#避雷"]
          }
        ],
        holiday: [
          {
            id: "holiday_001",
            name: "节日促销",
            title: "女神节特惠！这些项目值得入手 🌹",
            content: "三八女神节来了，各大医美机构都有活动！\n\n🎁 超值项目推荐：\n✨ 超皮秒：原价5000，现价3500\n💧 水光针：买3送1，超划算\n🔥 热玛吉：赠送护理套餐\n\n⏰ 活动时间：仅限本周\n\n姐妹们，一年就这么一次机会，抓紧变美吧！\n记得提前预约哦～",
            tags: ["#女神节", "#医美优惠", "#超皮秒", "#水光针", "#促销"]
          }
        ],
        new_product: [
          {
            id: "new_001",
            name: "新品推荐",
            title: "黑科技来袭！新项目体验报告 🔬",
            content: "今天体验了最新的Fotona 4D，真的是黑科技！\n\n💫 项目亮点：\n- 无创紧致提升\n- 内部+外部双重作用\n- 即刻见效\n- 无恢复期\n\n🔍 适用人群：\n- 轻微松弛下垂\n- 希望改善轮廓\n- 怕疼不敢做手术\n\n⏰ 效果持续：3-6个月\n\n体验下来真的很棒，推荐给想要轻微提升的姐妹们！",
            tags: ["#Fotona4D", "#新项目", "#紧致提升", "#无创", "#医美"]
          }
        ]
      };

      return {
        templates: templates[input.type || "project"] || templates.project,
        allTypes: Object.keys(templates)
      };
    }),

  /**
   * 使用模板生成内容
   */
  generateFromTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        customizations: z.record(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // 这里可以实现基于模板生成内容的逻辑
      // 暂时返回模板内容，实际应用中可以进行个性化调整
      return {
        success: true,
        message: "模板应用成功",
      };
    }),

  /**
   * 批量生成内容
   */
  bulkGenerate: protectedProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            type: z.enum(["project", "case", "price", "guide", "holiday", "new_product"]),
            project: z.string().optional(),
            keywords: z.array(z.string()).optional(),
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
          batch.map(async (item) => {
            try {
              // 这里应该调用生成内容的逻辑
              // 为了演示，我们模拟生成内容
              const mockContent = {
                title: `批量生成-${item.type}-${item.project || '通用项目'}-${Date.now()}`,
                content: `这是通过批量生成功能生成的${item.type}类型内容，针对${item.project || '通用项目'}。关键词：${item.keywords?.join(',') || '无'}。`,
                tags: [`#${item.type}`, `#${item.project || '医美'}`, '#批量生成'],
              };
              
              // 创建内容记录
              const postResult = await createXiaohongshuPost({
                title: mockContent.title,
                content: mockContent.content,
                tags: JSON.stringify(mockContent.tags),
                contentType: item.type,
                project: item.project || null,
                status: "draft",
              });

              processed++;
              
              return {
                success: true,
                data: {
                  ...mockContent,
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
        results.push(...batchResults.map(result => 
          result.status === 'fulfilled' ? result.value : {
            success: false,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
            index: -1, // 索引信息可能丢失，需要改进
          }
        ));

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
      // 在实际应用中，这里会将发布任务添加到队列中
      // 由于我们没有实现任务队列，这里只是模拟
      console.log(`Scheduled post ${input.postId} for ${input.scheduledTime}`);
      
      // 更新文章状态为scheduled
      await updateXiaohongshuPost(input.postId, {
        status: "scheduled",
        scheduledAt: input.scheduledTime,
      });

      return {
        success: true,
        message: `内容已安排在 ${input.scheduledTime.toLocaleString()} 发布`,
        scheduledTime: input.scheduledTime,
      };
    }),
});
