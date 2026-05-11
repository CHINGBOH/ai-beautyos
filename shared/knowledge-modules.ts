/**
 * 知识库模块定义
 * 支持15个主要模块，每个模块支持6层嵌套
 */

export const KNOWLEDGE_MODULES = {
  // 五大核心模块
  HEALTH_FOUNDATION: "health_foundation", // 健康基础
  SKIN_CARE: "skin_care", // 皮肤管理
  DENTAL_CARE: "dental_care", // 牙齿护理
  TCM: "tcm", // 中医养生
  AESTHETICS: "aesthetics", // 医美技术
  
  // 新增模块
  POSTURE: "posture", // 体态管理
  HAIR: "hair", // 发型造型
  STYLING: "styling", // 服装搭配
  MAKEUP: "makeup", // 妆容技巧
  FRAGRANCE: "fragrance", // 香水香氛
  MENTAL_HEALTH: "mental_health", // 心理健康
  ETIQUETTE: "etiquette", // 社交礼仪
  TIME_MANAGEMENT: "time_management", // 时间管理
  ENVIRONMENT: "environment", // 环境美学
  TECH_BEAUTY: "tech_beauty", // 科技美容
} as const;

export type KnowledgeModule = typeof KNOWLEDGE_MODULES[keyof typeof KNOWLEDGE_MODULES];

export const MODULE_NAMES: Record<KnowledgeModule, string> = {
  [KNOWLEDGE_MODULES.HEALTH_FOUNDATION]: "健康基础",
  [KNOWLEDGE_MODULES.SKIN_CARE]: "皮肤管理",
  [KNOWLEDGE_MODULES.DENTAL_CARE]: "牙齿护理",
  [KNOWLEDGE_MODULES.TCM]: "中医养生",
  [KNOWLEDGE_MODULES.AESTHETICS]: "医美技术",
  [KNOWLEDGE_MODULES.POSTURE]: "体态管理",
  [KNOWLEDGE_MODULES.HAIR]: "发型造型",
  [KNOWLEDGE_MODULES.STYLING]: "服装搭配",
  [KNOWLEDGE_MODULES.MAKEUP]: "妆容技巧",
  [KNOWLEDGE_MODULES.FRAGRANCE]: "香水香氛",
  [KNOWLEDGE_MODULES.MENTAL_HEALTH]: "心理健康",
  [KNOWLEDGE_MODULES.ETIQUETTE]: "社交礼仪",
  [KNOWLEDGE_MODULES.TIME_MANAGEMENT]: "时间管理",
  [KNOWLEDGE_MODULES.ENVIRONMENT]: "环境美学",
  [KNOWLEDGE_MODULES.TECH_BEAUTY]: "科技美容",
};

export const MODULE_DESCRIPTIONS: Record<KnowledgeModule, string> = {
  [KNOWLEDGE_MODULES.HEALTH_FOUNDATION]: "睡眠、水分、心情、饮食、运动等健康基础，是美容的根本",
  [KNOWLEDGE_MODULES.SKIN_CARE]: "皮肤生理学、病理分析、问题诊断、日常护理方案",
  [KNOWLEDGE_MODULES.DENTAL_CARE]: "口腔健康、牙齿美白、疾病预防、正畸知识、日常护理",
  [KNOWLEDGE_MODULES.TCM]: "中医美容理论、体质辨识、食疗养生、经络调理、四季养生",
  [KNOWLEDGE_MODULES.AESTHETICS]: "激光、射频、注射、手术等医美技术手段的原理、效果与风险",
  [KNOWLEDGE_MODULES.POSTURE]: "体态评估、问题矫正、体态与气质、不同年龄段的体态管理",
  [KNOWLEDGE_MODULES.HAIR]: "发型设计、发质护理、造型技巧、色彩搭配、季节性造型",
  [KNOWLEDGE_MODULES.STYLING]: "色彩理论、体型分析、风格定位、场合穿搭、季节性搭配",
  [KNOWLEDGE_MODULES.MAKEUP]: "底妆、眼妆、唇妆、修容、不同场合妆容技巧",
  [KNOWLEDGE_MODULES.FRAGRANCE]: "香调分类、香水选择、使用方法、香氛与情绪、香氛产品",
  [KNOWLEDGE_MODULES.MENTAL_HEALTH]: "自信建设、压力管理、情绪调节、人际关系、心理障碍识别",
  [KNOWLEDGE_MODULES.ETIQUETTE]: "基本礼仪、商务礼仪、社交场合、国际礼仪、形象管理",
  [KNOWLEDGE_MODULES.TIME_MANAGEMENT]: "时间规划、效率提升、工作生活平衡、习惯养成、时间与美容",
  [KNOWLEDGE_MODULES.ENVIRONMENT]: "居住环境、工作环境、自然环境、环境与健康、环境与美容",
  [KNOWLEDGE_MODULES.TECH_BEAUTY]: "美容仪器、智能设备、美容APP、虚拟试妆、科技趋势",
};

/**
 * 知识库层级结构定义
 * 每个模块都有6层嵌套结构
 */
export interface KnowledgeHierarchy {
  module: KnowledgeModule;
  level1: string; // 一级分类
  level2?: string; // 二级分类
  level3?: string; // 三级分类
  level4?: string; // 四级分类
  level5?: string; // 五级分类
  level6?: string; // 六级分类
}

/**
 * 难度级别
 */
export const DIFFICULTY_LEVELS = {
  BEGINNER: "beginner", // 入门
  INTERMEDIATE: "intermediate", // 进阶
  ADVANCED: "advanced", // 专业
} as const;

export type DifficultyLevel = typeof DIFFICULTY_LEVELS[keyof typeof DIFFICULTY_LEVELS];

export const DIFFICULTY_NAMES: Record<DifficultyLevel, string> = {
  [DIFFICULTY_LEVELS.BEGINNER]: "入门",
  [DIFFICULTY_LEVELS.INTERMEDIATE]: "进阶",
  [DIFFICULTY_LEVELS.ADVANCED]: "专业",
};

/**
 * 内容类型
 */
export const CONTENT_TYPES = {
  ARTICLE: "article", // 深度文章
  CARD: "card", // 知识卡片
  VIDEO: "video", // 视频
  AUDIO: "audio", // 音频
  TOOL: "tool", // 工具
  CASE: "case", // 案例
  COMPARISON: "comparison", // 对比
} as const;

export type ContentType = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];
