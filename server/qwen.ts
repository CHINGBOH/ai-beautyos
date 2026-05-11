import axios from "axios";

const QWEN_API_URL = process.env.QWEN_API_URL || process.env.BUILT_IN_FORGE_API_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const QWEN_API_KEY = process.env.QWEN_API_KEY || process.env.BUILT_IN_FORGE_API_KEY || "";

export interface QwenMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface QwenResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 调用 Qwen API 进行对话
 * 用于后台管理功能：数据分析、客户画像生成、营销建议等
 */
export async function callQwen(messages: QwenMessage[]): Promise<string> {
  if (!QWEN_API_KEY) {
    throw new Error("QWEN_API_KEY is not configured");
  }

  try {
    const response = await axios.post<QwenResponse>(
      QWEN_API_URL,
      {
        model: "qwen-plus", // 使用 qwen-plus 模型，性能和成本平衡
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${QWEN_API_KEY}`,
        },
        timeout: 60000, // 增加超时时间到60秒
      }
    );

    const content = response.data.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Qwen API");
    }

    return content;
  } catch (error: unknown) {
    const { logger } = await import("./_core/logger");
    const errorMessage = error instanceof Error ? error.message : String(error);
    const axiosError = error as { response?: { data?: { error?: { message?: string } } } };
    
    logger.error("[Qwen API Error]", {
      message: errorMessage,
      responseData: axiosError.response?.data,
    });
    
    throw new Error(
      `Qwen API call failed: ${axiosError.response?.data?.error?.message || errorMessage}`
    );
  }
}

/**
 * 分析线索数据，生成转化率报告
 */
export interface LeadData {
  id?: number;
  name?: string;
  phone?: string;
  source?: string;
  interestedServices?: string[];
  budget?: string;
  [key: string]: unknown;
}

export async function analyzeLeadsData(leadsData: LeadData[]): Promise<string> {
  const prompt = `你是一个专业的医美行业数据分析师。请分析以下线索数据，生成一份详细的转化率报告。

线索数据（JSON格式）：
${JSON.stringify(leadsData, null, 2)}

请分析：
1. 总线索数量和来源渠道分布
2. 各渠道的转化率对比
3. 客户意向项目分布
4. 预算区间分析
5. 优化建议（如何提升转化率）

请用专业、清晰的语言输出报告，使用 Markdown 格式。`;

  return await callQwen([
    {
      role: "system",
      content: "你是一个专业的医美行业数据分析师，擅长分析客户数据并提供商业洞察。",
    },
    {
      role: "user",
      content: prompt,
    },
  ]);
}

/**
 * 基于对话历史生成客户画像
 */
export interface LeadInfo {
  name?: string;
  phone?: string;
  wechat?: string;
  interestedServices?: string[];
  budget?: string;
  [key: string]: unknown;
}

export async function generateCustomerProfile(
  conversationHistory: string,
  leadInfo: LeadInfo
): Promise<string> {
  const prompt = `你是一个专业的医美客户画像分析师。请根据以下信息生成详细的客户画像。

对话历史：
${conversationHistory}

客户基本信息：
${JSON.stringify(leadInfo, null, 2)}

请生成客户画像，包括：
1. 客户需求分析（核心痛点、期望效果）
2. 消费能力评估
3. 决策风格（理性/感性、冲动/谨慎）
4. 推荐项目和话术策略
5. 跟进建议

请用专业、实用的语言输出，使用 Markdown 格式。`;

  return await callQwen([
    {
      role: "system",
      content: "你是一个专业的医美客户画像分析师，擅长理解客户需求并提供精准的营销建议。",
    },
    {
      role: "user",
      content: prompt,
    },
  ]);
}

/**
 * 生成营销建议
 */
export interface PerformanceData {
  totalLeads?: number;
  conversionRate?: number;
  revenue?: number;
  [key: string]: unknown;
}

export async function generateMarketingSuggestions(
  leadsData: LeadData[],
  performanceData: PerformanceData
): Promise<string> {
  const prompt = `你是一个医美行业营销专家。请根据以下数据生成营销优化建议。

线索数据概览：
${JSON.stringify(leadsData.slice(0, 10), null, 2)}

业绩数据：
${JSON.stringify(performanceData, null, 2)}

请提供：
1. 当前营销策略评估
2. 高价值客户特征分析
3. 各渠道优化建议
4. 新的营销活动建议
5. 话术和内容优化方向

请用实用、可执行的语言输出，使用 Markdown 格式。`;

  return await callQwen([
    {
      role: "system",
      content: "你是一个医美行业营销专家，擅长制定数据驱动的营销策略。",
    },
    {
      role: "user",
      content: prompt,
    },
  ]);
}
