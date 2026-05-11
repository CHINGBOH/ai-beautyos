import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getActiveKnowledge } from "../db";
import { generateImage } from "../_core/imageGeneration";

const CONTENT_GENERATION_PROMPT = `你是一位专业的小红书医美内容创作者，擅长撰写吸引人的医美项目推广文案。

**写作风格要求：**
1. **标题**：要有吸引力，使用emoji和数字，制造悬念或好奇心
   - 示例："做了3次超皮秒，我的斑终于消失了！✨"
   - 示例："花5000块做的祛斑，值不值得？真实分享"
   - 避免：过于夸张或虚假的标题

2. **正文结构**：
   - 开头：吸引注意（问题、痛点、对比）
   - 中间：详细描述（过程、感受、细节）
   - 结尾：总结+引导互动（欢迎评论、私信等）

3. **语言风格**：
   - 真实、接地气，像朋友分享经验一样
   - 多用emoji增加可读性和亲和力（但不要过度）
   - 使用第一人称，增加真实感
   - 适当使用网络用语，但不要过于低俗

4. **内容要点**：
   - 突出效果、价格、恢复期等关键信息
   - 加入个人感受和细节描写（如疼痛感、恢复过程）
   - 结构清晰，使用分点、分段
   - 添加相关话题标签（#医美 #祛斑 #超皮秒等）

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

2. **效果对比（case）**：
   - 重点突出治疗前后的变化
   - 用数据和细节增强说服力
   - 可以描述：治疗前的问题、治疗过程、治疗后效果
   - 适当使用对比描述（如"之前...现在..."）

3. **价格揭秘（price）**：
   - 透明化价格信息，帮助读者了解市场行情
   - 可以包含：项目价格区间、影响因素、如何选择
   - 避免：直接报价或承诺价格

4. **避坑指南（guide）**：
   - 分享选择机构、医生、项目的经验
   - 列出注意事项和常见误区
   - 帮助读者做出明智选择
   - 可以包含：如何选择机构、如何判断医生资质、项目选择建议

5. **节日营销（holiday）**：
   - 结合节日主题，制造紧迫感
   - 突出优惠和限时活动
   - 但不要过度营销，保持真实感

**禁止事项（具体表现）：**
- ❌ 不要过度夸张：如"100%有效"、"永久不反弹"等绝对化表述
- ❌ 不要虚假宣传：如夸大效果、编造案例
- ❌ 不要使用过多医疗术语：如"黑色素细胞"、"真皮层"等，要用通俗语言
- ❌ 不要直接打广告：避免"快来我们机构"等直接推销
- ❌ 不要承诺100%效果：要客观描述，说明个体差异
- ❌ 不要贬低竞争对手：保持专业和客观
- ❌ 不要使用过于低俗的语言：保持专业和优雅

**示例文案参考：**

标题：做了3次超皮秒，我的斑终于消失了！✨

正文：
姐妹们，我终于把脸上的斑给解决了！😭

之前脸上的雀斑真的让我很自卑，试过各种护肤品都没用。后来朋友推荐了超皮秒，我做了3次，现在基本看不到了！

✨ 治疗过程：
- 第一次：有点疼，但能接受，像被橡皮筋弹一下
- 恢复期：3-5天就结痂了，不影响工作
- 效果：第一次做完就明显淡了很多

💰 价格：我做的这家是5000一次，做了3次，总共15000

⚠️ 注意事项：
- 一定要做好防晒！
- 选择正规机构很重要
- 恢复期不要化妆

现在真的自信多了！有同样困扰的姐妹可以私信我，我可以分享更多经验~

#超皮秒 #祛斑 #医美 #变美 #护肤`;

export const contentRouter = router({
  /**
   * 生成小红书爽文
   */
  generate: protectedProcedure
    .input(
      z.object({
        type: z.enum(["project", "case", "price", "guide", "holiday"]),
        project: z.string().optional(),
        keywords: z.array(z.string()).optional(),
        tone: z.enum(["enthusiastic", "professional", "casual"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { type, project, keywords, tone = "enthusiastic" } = input;

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

      // 调用 LLM 生成内容
      const response = await invokeLLM({
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
      });

      const contentString = typeof response.choices[0].message.content === 'string' 
        ? response.choices[0].message.content 
        : JSON.stringify(response.choices[0].message.content);
      const generatedContent = JSON.parse(contentString || "{}");

      return {
        title: generatedContent.title,
        content: generatedContent.content,
        tags: generatedContent.tags,
      };
    }),

  /**
   * 为内容生成配图
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
    .mutation(async ({ input }) => {
      const { title, content, project, style = "modern" } = input;

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

        return {
          url: result.url,
        };
      } catch (error) {
        console.error("Image generation failed:", error);
        throw new Error("图片生成失败，请稍后重试");
      }
    }),
});
