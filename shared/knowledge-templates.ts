/**
 * 知识库内容模板
 * 确保每个知识点都包含正反论证、案例、实践指导等完整内容
 */

export interface KnowledgeTemplate {
  title: string;
  description: string;
  structure: {
    summary: string;
    content: string;
    positiveEvidence: string;
    negativeEvidence: string;
    neutralAnalysis: string;
    practicalGuide: string;
    caseStudies: string;
    expertOpinions: string;
  };
  example: any;
}

/**
 * 基础知识点模板
 */
export const BASIC_KNOWLEDGE_TEMPLATE: KnowledgeTemplate = {
  title: "基础知识点模板",
  description: "适用于所有基础知识点",
  structure: {
    summary: "简要概述（50-100字）",
    content: "完整内容（500-2000字）",
    positiveEvidence: `[
  {
    "source": "来源名称",
    "title": "研究/文章标题",
    "content": "支持观点的内容",
    "data": "相关数据或统计",
    "url": "来源链接（可选）"
  }
]`,
    negativeEvidence: `[
  {
    "source": "来源名称",
    "title": "质疑/风险说明",
    "content": "质疑内容或风险描述",
    "data": "相关数据",
    "url": "来源链接（可选）"
  }
]`,
    neutralAnalysis: "客观评价、适用条件、注意事项（200-500字）",
    practicalGuide: `[
  {
    "step": 1,
    "title": "步骤标题",
    "description": "详细描述",
    "tools": "所需工具或资源",
    "duration": "预计时间",
    "tips": "注意事项"
  }
]`,
    caseStudies: `[
  {
    "title": "案例标题",
    "description": "案例描述",
    "before": "之前的状态",
    "after": "之后的状态",
    "duration": "持续时间",
    "result": "结果",
    "lessons": "经验教训"
  }
]`,
    expertOpinions: `[
  {
    "expert": "专家姓名",
    "title": "专家头衔",
    "content": "专家观点",
    "source": "来源",
    "date": "日期"
  }
]`,
  },
  example: {
    title: "深度睡眠的重要性",
    summary: "深度睡眠是睡眠周期中最关键的阶段，对皮肤修复和整体健康至关重要。",
    content: "深度睡眠（慢波睡眠）是睡眠的第三和第四阶段...",
    positiveEvidence: JSON.stringify([
      {
        source: "Nature Sleep Research",
        title: "深度睡眠与皮肤修复的关系",
        content: "研究表明，深度睡眠期间，人体分泌的生长激素达到峰值，促进皮肤细胞修复和再生。",
        data: "生长激素分泌量增加70%",
      },
    ]),
    negativeEvidence: JSON.stringify([
      {
        source: "Sleep Medicine Review",
        title: "过度追求深度睡眠的风险",
        content: "过度关注深度睡眠可能导致睡眠焦虑，反而影响睡眠质量。",
        data: "焦虑人群深度睡眠时间减少15%",
      },
    ]),
    neutralAnalysis: "深度睡眠确实重要，但睡眠质量是整体概念，包括所有睡眠阶段。建议关注整体睡眠质量，而非单一指标。",
    practicalGuide: JSON.stringify([
      {
        step: 1,
        title: "建立规律作息",
        description: "每天固定时间睡觉和起床，帮助身体建立生物钟",
        tools: "闹钟、睡眠追踪APP",
        duration: "2-4周",
        tips: "周末也要保持相同作息",
      },
    ]),
    caseStudies: JSON.stringify([
      {
        title: "李女士改善睡眠后皮肤变化",
        description: "30岁女性，长期熬夜导致皮肤暗沉",
        before: "皮肤暗沉、有细纹",
        after: "皮肤光泽度提升、细纹减少",
        duration: "3个月",
        result: "通过改善睡眠，皮肤状态明显改善",
        lessons: "规律作息比昂贵的护肤品更有效",
      },
    ]),
    expertOpinions: JSON.stringify([
      {
        expert: "张医生",
        title: "皮肤科主任医师",
        content: "深度睡眠是皮肤修复的黄金时间，建议每晚11点前入睡。",
        source: "《皮肤健康指南》",
        date: "2024-01-15",
      },
    ]),
  },
};

/**
 * 问题诊断模板
 */
export const DIAGNOSIS_TEMPLATE: KnowledgeTemplate = {
  title: "问题诊断模板",
  description: "适用于皮肤问题诊断类知识点",
  structure: {
    summary: "问题概述",
    content: "诊断方法、标准、流程",
    positiveEvidence: "诊断方法的有效性研究",
    negativeEvidence: "误诊风险和局限性",
    neutralAnalysis: "诊断的适用条件和注意事项",
    practicalGuide: "诊断步骤和工具使用",
    caseStudies: "典型诊断案例",
    expertOpinions: "专业医生的诊断建议",
  },
  example: null,
};

/**
 * 治疗方案模板
 */
export const TREATMENT_TEMPLATE: KnowledgeTemplate = {
  title: "治疗方案模板",
  description: "适用于治疗方案类知识点",
  structure: {
    summary: "治疗方案概述",
    content: "治疗原理、方法、流程",
    positiveEvidence: "治疗效果的研究和数据",
    negativeEvidence: "治疗风险和副作用",
    neutralAnalysis: "适应症、禁忌症、注意事项",
    practicalGuide: "治疗步骤和术后护理",
    caseStudies: "治疗前后对比案例",
    expertOpinions: "医生的治疗建议",
  },
  example: null,
};

/**
 * 日常护理模板
 */
export const CARE_TEMPLATE: KnowledgeTemplate = {
  title: "日常护理模板",
  description: "适用于日常护理类知识点",
  structure: {
    summary: "护理方法概述",
    content: "护理步骤、产品选择、注意事项",
    positiveEvidence: "护理效果的研究",
    negativeEvidence: "不当护理的风险",
    neutralAnalysis: "适用人群和注意事项",
    practicalGuide: "具体操作步骤",
    caseStudies: "护理效果案例",
    expertOpinions: "专业护理建议",
  },
  example: null,
};

/**
 * 获取模板
 */
export function getTemplate(type: "basic" | "diagnosis" | "treatment" | "care"): KnowledgeTemplate {
  switch (type) {
    case "diagnosis":
      return DIAGNOSIS_TEMPLATE;
    case "treatment":
      return TREATMENT_TEMPLATE;
    case "care":
      return CARE_TEMPLATE;
    default:
      return BASIC_KNOWLEDGE_TEMPLATE;
  }
}

/**
 * 根据知识库分类自动选择模板
 */
export function getTemplateByCategory(category: string): KnowledgeTemplate {
  const lowerCategory = category.toLowerCase();
  
  if (lowerCategory.includes("诊断") || lowerCategory.includes("识别")) {
    return DIAGNOSIS_TEMPLATE;
  }
  if (lowerCategory.includes("治疗") || lowerCategory.includes("方案") || lowerCategory.includes("方法")) {
    return TREATMENT_TEMPLATE;
  }
  if (lowerCategory.includes("护理") || lowerCategory.includes("日常") || lowerCategory.includes("维护")) {
    return CARE_TEMPLATE;
  }
  
  return BASIC_KNOWLEDGE_TEMPLATE;
}
