/**
 * 心理标签自动识别模块
 * 使用 LLM 分析客户对话内容，自动识别客户的心理动机和决策类型
 */

import { invokeLLM } from "./_core/llm";

export interface PsychologyAnalysisResult {
  psychologyType: "恐惧型" | "贪婪型" | "安全型" | "敏感型";
  psychologyTags: string[];
  confidence: number; // 0-1之间，表示识别的置信度
  reasoning: string; // 分析推理过程
  budgetLevel?: "低" | "中" | "高";
  customerTier?: "A" | "B" | "C" | "D";
}

const PSYCHOLOGY_ANALYSIS_PROMPT = `你是一位专业的医美行业客户心理分析师。请根据客户的对话内容，分析客户的心理类型和决策动机。

**心理类型定义：**

1. **恐惧型**：害怕变老、变丑、被比下去，担心失去吸引力
   - 关键词：怕、担心、焦虑、衰老、皱纹、斑点、下垂、老了、不好看、没自信
   - 典型对话示例：
     * "我脸上的斑越来越多了，好担心"
     * "我是不是老了？皮肤越来越差"
     * "再不做就来不及了"
     * "我朋友都说我显老"
   - 行为特征：急于改善现状，容易被"再不做就晚了"打动，关注紧迫性

2. **贪婪型**：追求极致效果和性价比，希望花最少的钱达到最好的效果
   - 关键词：效果、性价比、优惠、套餐、对比、最好、划算、便宜、打折、活动
   - 典型对话示例：
     * "有没有优惠？"
     * "价格能不能便宜点？"
     * "其他家多少钱？"
     * "效果怎么样？值不值？"
     * "有没有套餐？"
   - 行为特征：会货比三家，关注优惠活动，追求高性价比，喜欢讨价还价

3. **安全型**：注重风险和安全性，要权威认证和保障
   - 关键词：安全、风险、副作用、恢复期、资质、认证、医生、设备、保障、会不会
   - 典型对话示例：
     * "安全吗？有没有副作用？"
     * "医生有资质吗？"
     * "设备是正规的吗？"
     * "会不会有风险？"
     * "恢复期要多久？"
     * "有什么保障吗？"
   - 行为特征：谨慎决策，需要大量信息支持，重视医生资质和设备认证

4. **敏感型**：在意他人评价和社交压力，希望获得认可
   - 关键词：别人、朋友、同事、评价、羡慕、自信、好看、漂亮、被夸
   - 典型对话示例：
     * "我朋友做了效果很好"
     * "同事都说我皮肤不好"
     * "想变得更好看"
     * "希望别人夸我"
     * "想变得更自信"
   - 行为特征：容易被社交证明影响，关注他人反馈，希望获得认可

**消费能力判断标准：**

- **低**（2K-5K）：
  - 触发词：便宜、优惠、打折、活动、预算有限、经济实惠
  - 语境：明确表示预算有限，询问优惠活动，对比价格
  - 示例："有没有便宜点的？"、"预算不多"、"有没有活动？"

- **中**（5K-15K）：
  - 触发词：适中、合理、可以接受、考虑一下
  - 语境：对价格有一定接受度，关注效果和安全的平衡
  - 示例："价格还可以"、"效果好的话可以考虑"、"性价比怎么样？"

- **高**（15K-50K）：
  - 触发词：不在乎价格、只要效果好、最好的、品质
  - 语境：不太在意价格，更关注效果和品质
  - 示例："价格不是问题"、"要最好的"、"效果最重要"

**边界情况处理：**

- 如果对话信息不足，无法明确判断：
  - 心理类型：优先选择"贪婪型"（最常见）
  - 消费能力：优先选择"中"（中等水平）
  - 客户分层：优先选择"C级"（中等价值）
  - confidence设置为0.3-0.5（低置信度）

- 如果客户同时表现出多种心理特征：
  - 选择最明显的特征作为主要类型
  - 在psychologyTags中包含所有相关标签
  - 在reasoning中说明多重特征

**客户分层判断：**

- **A级**：高消费 + 容易被影响（贪婪型/敏感型）= 高价值高转化
  - 条件：budgetLevel="高" AND (psychologyType="贪婪型" OR psychologyType="敏感型")
  
- **B级**：高消费或中消费且非安全型 = 中高价值
  - 条件：(budgetLevel="高" OR budgetLevel="中") AND psychologyType!="安全型"
  
- **C级**：中消费或低消费但贪婪型 = 中等价值
  - 条件：(budgetLevel="中" OR budgetLevel="低") AND psychologyType="贪婪型"
  
- **D级**：其他 = 低价值
  - 条件：不满足以上条件的情况

请分析以下对话内容，返回 JSON 格式的分析结果。`;

/**
 * 分析客户心理类型
 */
export async function analyzePsychology(
  conversationMessages: Array<{ role: string; content: string }>
): Promise<PsychologyAnalysisResult> {
  // 构建对话摘要
  const conversationSummary = conversationMessages
    .map((m) => `${m.role === "user" ? "客户" : "客服"}：${m.content}`)
    .join("\n");

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: PSYCHOLOGY_ANALYSIS_PROMPT },
        {
          role: "user",
          content: `请分析以下对话内容：\n\n${conversationSummary}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "psychology_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              psychologyType: {
                type: "string",
                enum: ["恐惧型", "贪婪型", "安全型", "敏感型"],
                description: "客户的心理类型",
              },
              psychologyTags: {
                type: "array",
                items: { type: "string" },
                description: "客户的心理标签（3-5个关键词）",
              },
              confidence: {
                type: "number",
                description: "识别置信度（0-1之间）",
              },
              reasoning: {
                type: "string",
                description: "分析推理过程",
              },
              budgetLevel: {
                type: "string",
                enum: ["低", "中", "高"],
                description: "消费能力判断",
              },
              customerTier: {
                type: "string",
                enum: ["A", "B", "C", "D"],
                description: "客户分层",
              },
            },
            required: [
              "psychologyType",
              "psychologyTags",
              "confidence",
              "reasoning",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("No response from LLM");
    }

    const result = JSON.parse(content) as PsychologyAnalysisResult;
    return result;
  } catch (error) {
    console.error("[Psychology Analyzer] Analysis failed:", error);
    // 返回默认值
    return {
      psychologyType: "贪婪型",
      psychologyTags: ["待分析"],
      confidence: 0,
      reasoning: "分析失败，使用默认值",
    };
  }
}

/**
 * 判断是否需要更新心理标签
 * 当对话消息数量达到一定阈值时，触发心理分析
 */
export function shouldAnalyzePsychology(messageCount: number): boolean {
  // 第5条消息时首次分析
  // 之后每10条消息重新分析一次
  return messageCount === 5 || (messageCount > 5 && messageCount % 10 === 0);
}
