/**
 * 知识库内容生成器
 * 使用LLM生成结构化的知识库内容
 */

import { logger } from "./_core/logger";
import { httpPost, HttpError } from "./_core/http-service";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
if (!DEEPSEEK_API_KEY) {
  throw new Error(
    "DEEPSEEK_API_KEY environment variable is required. Please set it in your .env file."
  );
}

function normalizeDeepSeekUrl(raw?: string): string {
  const base = (raw || "https://api.deepseek.com").trim().replace(/\/+$/, "");
  // 兼容用户传 https://api.deepseek.com 或 https://api.deepseek.com/v1/chat/completions
  if (base.endsWith("/v1/chat/completions")) return base;
  return `${base}/v1/chat/completions`;
}

const DEEPSEEK_CHAT_COMPLETIONS_URL = normalizeDeepSeekUrl(process.env.DEEPSEEK_API_URL);

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type ChatCompletionResponse = {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason?: string;
  }>;
};

export interface KnowledgeGenerationRequest {
  /** 知识点标题 */
  title: string;
  /** 所属模块 */
  module: string;
  /** 层级 */
  level: number;
  /** 上下文信息（父节点内容等） */
  context?: string;
  /** 关键词 */
  keywords?: string[];
}

export interface GeneratedKnowledge {
  title: string;
  summary: string;
  content: string;
  positiveEvidence: Array<{
    source: string;
    title: string;
    content: string;
    data?: string;
  }>;
  negativeEvidence: Array<{
    source: string;
    title: string;
    content: string;
    data?: string;
  }>;
  neutralAnalysis: string;
  practicalGuide: Array<{
    step: number;
    title: string;
    description: string;
    tools?: string;
    duration?: string;
    tips?: string;
  }>;
  caseStudies: Array<{
    title: string;
    description: string;
    before: string;
    after: string;
    duration: string;
    result: string;
    lessons: string;
  }>;
  expertOpinions: Array<{
    expert: string;
    title: string;
    institution?: string;
    content: string;
    source?: string;
  }>;
  tags: string[];
}

const KNOWLEDGE_GENERATION_PROMPT = `你是一位专业的美容健康知识专家。请根据给定的主题生成完整、科学、实用的知识库内容。

# 核心理念
- 美容的基础：健康、睡眠、水分、心情、饮食
- 医美只是技术手段，效果不能固化
- 美容是一个持续的过程，不是一次性消费
- 知识库要让客户有意愿看和了解，让员工学习

# 内容要求

## 1. 科学性
- 有权威来源和研究支撑
- 引用具体的数据和统计
- 标注来源出处

## 2. 全面性
- 正反观点都要有
- 多角度分析问题
- 提供完整信息链

## 3. 实用性
- 给出可操作的方法
- 提供具体案例
- 说明实际效果

## 4. 可读性
- 通俗易懂，避免过于专业的术语
- 结构清晰，层次分明
- 图文并茂（提供图片URL建议）

# 输出格式

请以JSON格式输出，包含以下字段：

重要：必须输出**严格合法 JSON**：
- 只能使用英文半角双引号 \"
- 禁止使用中文引号“”/‘’
- 禁止在 JSON 之外输出任何文字（不要解释、不要 Markdown）

{
  "title": "知识点标题",
  "summary": "简要概述（50-100字）",
  "content": "完整内容（800-1500字，分段描述，包含原理、机制、影响因素等）",
  "positiveEvidence": [
    {
      "source": "研究来源（如：Nature, 2023）",
      "title": "研究标题或观点",
      "content": "支持性证据的详细描述（200-300字）",
      "data": "相关数据或统计（如：临床研究显示90%的患者改善明显）"
    }
  ],
  "negativeEvidence": [
    {
      "source": "来源",
      "title": "质疑或风险",
      "content": "反面论证或风险描述（150-250字）",
      "data": "相关数据"
    }
  ],
  "neutralAnalysis": "客观中立的分析（300-500字，综合正反观点，给出适用条件和注意事项）",
  "practicalGuide": [
    {
      "step": 1,
      "title": "步骤标题",
      "description": "详细描述",
      "tools": "所需工具或产品",
      "duration": "预计时间",
      "tips": "注意事项和小技巧"
    }
  ],
  "caseStudies": [
    {
      "title": "案例标题",
      "description": "案例背景",
      "before": "治疗/改善前的状态",
      "after": "治疗/改善后的状态",
      "duration": "持续时间",
      "result": "最终结果和效果评估",
      "lessons": "经验教训和建议"
    }
  ],
  "expertOpinions": [
    {
      "expert": "专家姓名",
      "title": "专家头衔（如：皮肤科主任医师）",
      "institution": "所在机构",
      "content": "专家观点（200-300字）",
      "source": "来源（如：某医学会议、期刊访谈）"
    }
  ],
  "tags": ["标签1", "标签2", "标签3"]
}

# 注意事项

1. **正面论证**：至少提供2-3条，包含具体研究来源和数据
2. **反面论证**：至少提供1-2条，指出风险、局限性或争议点
3. **中立分析**：客观评价，不偏不倚
4. **实践指导**：至少3-5个步骤，要具体可操作
5. **案例研究**：至少1-2个真实或典型案例
6. **专家观点**：至少1-2位专家的观点
7. **内容深度**：根据层级调整深度，层级越高越具体

请严格按照JSON格式输出，不要添加任何其他文字说明。`;

export class KnowledgeGenerator {
  private async callDeepSeek(messages: ChatMessage[], opts?: { temperature?: number; maxTokens?: number }) {
    try {
      const data = await httpPost<ChatCompletionResponse>(
        DEEPSEEK_CHAT_COMPLETIONS_URL,
        {
          model: "deepseek-chat",
          messages,
          temperature: opts?.temperature ?? 0.3,
          max_tokens: opts?.maxTokens ?? 3500,
        },
        {
          headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
          retries: 2,
          retryDelay: 1200,
          timeout: 60000,
        }
      );

      return data.choices?.[0]?.message?.content || "";
    } catch (err) {
      if (err instanceof HttpError) {
        throw new Error(`DeepSeek API错误: ${err.status} - ${err.message}`);
      }
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  private extractJsonCandidate(text: string): string | null {
    const match = text.match(/\{[\s\S]*\}/);
    return match?.[0] ?? null;
  }

  private tryParseGeneratedKnowledge(raw: string): GeneratedKnowledge {
    // 尽量不“改内容”，只做最小修复（智能引号）
    const normalized = raw.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    return JSON.parse(normalized) as GeneratedKnowledge;
  }

  private async repairToStrictJson(candidate: string): Promise<string> {
    const system = `你是一个严格的 JSON 修复器。
你的任务：把用户提供的内容修复为**严格合法 JSON**，且不改变语义。
规则：
- 只输出 JSON（不要任何解释/Markdown/代码围栏）
- 使用英文半角双引号
- 修复中文引号、遗漏的逗号、非法转义、以及其他常见 JSON 语法错误
- 保留原字段结构与字段名，尽量不删内容（必要时可将无法放入 JSON 的片段转为字符串值）
`;
    const user = `把下面内容修复为严格合法 JSON：\n\n${candidate}`;
    const fixed = await this.callDeepSeek(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.1, maxTokens: 3500 }
    );
    return fixed.trim();
  }

  /**
   * 生成知识库内容
   */
  async generate(request: KnowledgeGenerationRequest): Promise<GeneratedKnowledge> {
    logger.info(`[KnowledgeGenerator] 生成知识: ${request.title}`);

    const prompt = this.buildPrompt(request);

    try {
      const content = await this.callDeepSeek(
        [
          { role: "system", content: KNOWLEDGE_GENERATION_PROMPT },
          { role: "user", content: prompt },
        ],
        { temperature: 0.3, maxTokens: 3500 }
      );

      if (!content) {
        throw new Error("未生成内容");
      }

      // 解析 JSON：先直接解析；失败则走“修复JSON”二次调用
      const candidate = this.extractJsonCandidate(content);
      if (!candidate) {
        logger.error("[KnowledgeGenerator] 未找到JSON片段", { contentPreview: content.slice(0, 600) });
        throw new Error("无法解析生成的内容：未找到JSON结构");
      }

      let generated: GeneratedKnowledge | null = null;
      try {
        generated = this.tryParseGeneratedKnowledge(candidate);
      } catch (parseError) {
        logger.warn("[KnowledgeGenerator] JSON解析失败，启动二次修复", {
          error: parseError instanceof Error ? parseError.message : String(parseError),
        });
        const fixed = await this.repairToStrictJson(candidate);
        const fixedCandidate = this.extractJsonCandidate(fixed) ?? fixed;
        generated = this.tryParseGeneratedKnowledge(fixedCandidate);
      }

      logger.info(`[KnowledgeGenerator] 生成成功: ${generated.title}`);

      return generated;
    } catch (error) {
      logger.error("[KnowledgeGenerator] 生成失败", error);
      throw error;
    }
  }

  /**
   * 构建生成提示词
   */
  private buildPrompt(request: KnowledgeGenerationRequest): string {
    let prompt = `请为以下主题生成完整的知识库内容：

主题：${request.title}
所属模块：${request.module}
层级：${request.level}/6（层级越高内容越具体详细）`;

    if (request.context) {
      prompt += `\n上下文：${request.context}`;
    }

    if (request.keywords && request.keywords.length > 0) {
      prompt += `\n关键词：${request.keywords.join("、")}`;
    }

    prompt += `

请生成包含以下所有部分的内容：
1. 简要概述（50-100字）
2. 完整内容（800-1500字）
3. 正面论证（至少2-3条，包含来源和数据）
4. 反面论证（至少1-2条，包含风险和局限性）
5. 中立分析（300-500字）
6. 实践指导（至少3-5个步骤）
7. 案例研究（至少1-2个案例）
8. 专家观点（至少1-2位专家）
9. 标签（3-5个相关标签）

请确保内容科学、全面、实用、易懂。`;

    return prompt;
  }

  /**
   * 批量生成知识内容
   */
  async generateBatch(requests: KnowledgeGenerationRequest[]): Promise<GeneratedKnowledge[]> {
    const results: GeneratedKnowledge[] = [];

    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      logger.info(`[KnowledgeGenerator] 生成进度: ${i + 1}/${requests.length}`);

      try {
        const generated = await this.generate(request);
        results.push(generated);

        // 延迟，避免API限流
        if (i < requests.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        logger.error(`[KnowledgeGenerator] 生成失败: ${request.title}`, error);
      }
    }

    return results;
  }
}
