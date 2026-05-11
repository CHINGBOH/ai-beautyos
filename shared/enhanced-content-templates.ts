/**
 * 增强的知识库内容模板
 * 支持专业医学内容、多媒体集成和质量控制
 */

export interface EnhancedContentTemplate {
  id: string;
  title: string;
  description: string;
  category: 'medical' | 'lifestyle' | 'technical' | 'wellness';
  structure: ContentStructure;
  qualityStandards: QualityStandards;
  multimediaRequirements: MultimediaRequirements;
  sources: SourceRequirements;
}

export interface ContentStructure {
  sections: ContentSection[];
  wordCount: {
    min: number;
    max: number;
  };
  readability: {
    minAge: number;
    maxAge: number;
  };
}

export interface ContentSection {
  id: string;
  title: string;
  description: string;
  required: boolean;
  wordCount: {
    min: number;
    max: number;
  };
  format: 'text' | 'json' | 'markdown' | 'html';
  validation: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'json' | 'url' | 'date';
  value?: any;
  message: string;
}

export interface QualityStandards {
  credibility: {
    min: number;
    max: number;
  };
  sources: {
    minCount: number;
    types: SourceType[];
    recency: {
      maxAge: number; // months
    };
  };
  expertReview: boolean;
  medicalDisclaimer: boolean;
}

export interface MultimediaRequirements {
  images: {
    minCount: number;
    maxCount: number;
    formats: string[];
    resolution: {
      min: string;
      max: string;
    };
  };
  videos: {
    minCount: number;
    maxCount: number;
    duration: {
      min: number; // seconds
      max: number; // seconds
    };
    formats: string[];
  };
  audio: {
    minCount: number;
    maxCount: number;
    duration: {
      min: number;
      max: number;
    };
    formats: string[];
  };
}

export interface SourceRequirements {
  primary: SourceType[];
  secondary: SourceType[];
  tertiary: SourceType[];
}

export type SourceType = 
  | 'peer_reviewed'
  | 'clinical_trial'
  | 'medical_journal'
  | 'textbook'
  | 'expert_opinion'
  | 'government_guideline'
  | 'industry_standard'
  | 'case_study'
  | 'news_article'
  | 'website'
  | 'social_media'
  | 'user_testimonial';

/**
 * 医学专业知识模板
 */
export const MEDICAL_KNOWLEDGE_TEMPLATE: EnhancedContentTemplate = {
  id: 'medical_knowledge',
  title: '医学专业知识模板',
  description: '适用于医学基础知识、疾病诊断、治疗方案等专业内容',
  category: 'medical',
  structure: {
    sections: [
      {
        id: 'summary',
        title: '概述',
        description: '简要概述该知识点，50-100字',
        required: true,
        wordCount: { min: 50, max: 100 },
        format: 'text',
        validation: [
          { type: 'required', message: '概述为必填项' },
          { type: 'minLength', value: 50, message: '概述至少50字' },
          { type: 'maxLength', value: 100, message: '概述不超过100字' }
        ]
      },
      {
        id: 'content',
        title: '详细内容',
        description: '完整的医学知识内容，500-2000字',
        required: true,
        wordCount: { min: 500, max: 2000 },
        format: 'markdown',
        validation: [
          { type: 'required', message: '详细内容为必填项' },
          { type: 'minLength', value: 500, message: '详细内容至少500字' }
        ]
      },
      {
        id: 'positiveEvidence',
        title: '正面论证',
        description: '支持该医学观点的研究和证据，JSON格式',
        required: true,
        wordCount: { min: 100, max: 1000 },
        format: 'json',
        validation: [
          { type: 'required', message: '正面论证为必填项' },
          { type: 'json', message: '正面论证必须是有效的JSON格式' }
        ]
      },
      {
        id: 'negativeEvidence',
        title: '反面论证',
        description: '质疑或风险说明，JSON格式',
        required: true,
        wordCount: { min: 100, max: 1000 },
        format: 'json',
        validation: [
          { type: 'required', message: '反面论证为必填项' },
          { type: 'json', message: '反面论证必须是有效的JSON格式' }
        ]
      },
      {
        id: 'neutralAnalysis',
        title: '中立分析',
        description: '客观评价、适用条件、注意事项',
        required: true,
        wordCount: { min: 200, max: 500 },
        format: 'text',
        validation: [
          { type: 'required', message: '中立分析为必填项' },
          { type: 'minLength', value: 200, message: '中立分析至少200字' }
        ]
      },
      {
        id: 'practicalGuide',
        title: '实践指导',
        description: '具体的操作步骤和指导，JSON格式',
        required: true,
        wordCount: { min: 200, max: 1000 },
        format: 'json',
        validation: [
          { type: 'required', message: '实践指导为必填项' },
          { type: 'json', message: '实践指导必须是有效的JSON格式' }
        ]
      },
      {
        id: 'caseStudies',
        title: '案例研究',
        description: '典型临床案例，JSON格式',
        required: false,
        wordCount: { min: 300, max: 1500 },
        format: 'json',
        validation: [
          { type: 'json', message: '案例研究必须是有效的JSON格式' }
        ]
      },
      {
        id: 'expertOpinions',
        title: '专家观点',
        description: '医学专家的专业观点，JSON格式',
        required: true,
        wordCount: { min: 200, max: 800 },
        format: 'json',
        validation: [
          { type: 'required', message: '专家观点为必填项' },
          { type: 'json', message: '专家观点必须是有效的JSON格式' }
        ]
      },
      {
        id: 'references',
        title: '参考文献',
        description: '学术引用和参考资料，JSON格式',
        required: true,
        wordCount: { min: 100, max: 500 },
        format: 'json',
        validation: [
          { type: 'required', message: '参考文献为必填项' },
          { type: 'json', message: '参考文献必须是有效的JSON格式' }
        ]
      }
    ],
    wordCount: { min: 1500, max: 8000 },
    readability: { minAge: 18, maxAge: 65 }
  },
  qualityStandards: {
    credibility: { min: 7, max: 10 },
    sources: {
      minCount: 3,
      types: ['peer_reviewed', 'clinical_trial', 'medical_journal', 'textbook', 'expert_opinion'],
      recency: { maxAge: 60 } // 5年内
    },
    expertReview: true,
    medicalDisclaimer: true
  },
  multimediaRequirements: {
    images: {
      minCount: 2,
      maxCount: 8,
      formats: ['jpg', 'png', 'webp'],
      resolution: { min: '800x600', max: '1920x1080' }
    },
    videos: {
      minCount: 0,
      maxCount: 3,
      duration: { min: 30, max: 300 },
      formats: ['mp4', 'webm']
    },
    audio: {
      minCount: 0,
      maxCount: 2,
      duration: { min: 60, max: 600 },
      formats: ['mp3', 'wav']
    }
  },
  sources: {
    primary: ['peer_reviewed', 'clinical_trial', 'medical_journal'],
    secondary: ['textbook', 'expert_opinion', 'government_guideline'],
    tertiary: ['case_study', 'industry_standard']
  }
};

/**
 * 生活方式知识模板
 */
export const LIFESTYLE_KNOWLEDGE_TEMPLATE: EnhancedContentTemplate = {
  id: 'lifestyle_knowledge',
  title: '生活方式知识模板',
  description: '适用于日常护理、健康习惯、生活方式等内容',
  category: 'lifestyle',
  structure: {
    sections: [
      {
        id: 'summary',
        title: '概述',
        description: '简要概述该生活方式知识点，50-100字',
        required: true,
        wordCount: { min: 50, max: 100 },
        format: 'text',
        validation: [
          { type: 'required', message: '概述为必填项' },
          { type: 'minLength', value: 50, message: '概述至少50字' }
        ]
      },
      {
        id: 'content',
        title: '详细内容',
        description: '完整的生活方式指导，300-1500字',
        required: true,
        wordCount: { min: 300, max: 1500 },
        format: 'markdown',
        validation: [
          { type: 'required', message: '详细内容为必填项' },
          { type: 'minLength', value: 300, message: '详细内容至少300字' }
        ]
      },
      {
        id: 'positiveEvidence',
        title: '支持证据',
        description: '支持该生活方式的研究和证据',
        required: true,
        wordCount: { min: 100, max: 500 },
        format: 'json',
        validation: [
          { type: 'required', message: '支持证据为必填项' },
          { type: 'json', message: '支持证据必须是有效的JSON格式' }
        ]
      },
      {
        id: 'negativeEvidence',
        title: '注意事项',
        description: '潜在的风险和注意事项',
        required: true,
        wordCount: { min: 100, max: 500 },
        format: 'json',
        validation: [
          { type: 'required', message: '注意事项为必填项' },
          { type: 'json', message: '注意事项必须是有效的JSON格式' }
        ]
      },
      {
        id: 'practicalGuide',
        title: '实践指导',
        description: '具体的操作步骤和建议',
        required: true,
        wordCount: { min: 200, max: 800 },
        format: 'json',
        validation: [
          { type: 'required', message: '实践指导为必填项' },
          { type: 'json', message: '实践指导必须是有效的JSON格式' }
        ]
      },
      {
        id: 'expertOpinions',
        title: '专家建议',
        description: '相关专家的建议和观点',
        required: false,
        wordCount: { min: 100, max: 400 },
        format: 'json',
        validation: [
          { type: 'json', message: '专家建议必须是有效的JSON格式' }
        ]
      }
    ],
    wordCount: { min: 800, max: 4000 },
    readability: { minAge: 16, maxAge: 50 }
  },
  qualityStandards: {
    credibility: { min: 5, max: 8 },
    sources: {
      minCount: 2,
      types: ['expert_opinion', 'case_study', 'news_article', 'website'],
      recency: { maxAge: 24 } // 2年内
    },
    expertReview: false,
    medicalDisclaimer: false
  },
  multimediaRequirements: {
    images: {
      minCount: 1,
      maxCount: 5,
      formats: ['jpg', 'png', 'webp'],
      resolution: { min: '600x400', max: '1200x800' }
    },
    videos: {
      minCount: 0,
      maxCount: 2,
      duration: { min: 30, max: 180 },
      formats: ['mp4', 'webm']
    },
    audio: {
      minCount: 0,
      maxCount: 1,
      duration: { min: 60, max: 300 },
      formats: ['mp3']
    }
  },
  sources: {
    primary: ['expert_opinion', 'case_study'],
    secondary: ['news_article', 'website', 'industry_standard'],
    tertiary: ['user_testimonial', 'social_media']
  }
};

/**
 * 技术知识模板
 */
export const TECHNICAL_KNOWLEDGE_TEMPLATE: EnhancedContentTemplate = {
  id: 'technical_knowledge',
  title: '技术知识模板',
  description: '适用于医美技术、设备原理、技术参数等内容',
  category: 'technical',
  structure: {
    sections: [
      {
        id: 'summary',
        title: '技术概述',
        description: '技术原理和应用的简要概述',
        required: true,
        wordCount: { min: 50, max: 100 },
        format: 'text',
        validation: [
          { type: 'required', message: '技术概述为必填项' }
        ]
      },
      {
        id: 'content',
        title: '技术详情',
        description: '完整的技术原理、参数、应用等',
        required: true,
        wordCount: { min: 500, max: 2500 },
        format: 'markdown',
        validation: [
          { type: 'required', message: '技术详情为必填项' }
        ]
      },
      {
        id: 'technicalSpecs',
        title: '技术参数',
        description: '详细的技术规格和参数，JSON格式',
        required: true,
        wordCount: { min: 100, max: 800 },
        format: 'json',
        validation: [
          { type: 'required', message: '技术参数为必填项' },
          { type: 'json', message: '技术参数必须是有效的JSON格式' }
        ]
      },
      {
        id: 'positiveEvidence',
        title: '有效性证据',
        description: '技术有效性的研究和数据',
        required: true,
        wordCount: { min: 200, max: 800 },
        format: 'json',
        validation: [
          { type: 'required', message: '有效性证据为必填项' },
          { type: 'json', message: '有效性证据必须是有效的JSON格式' }
        ]
      },
      {
        id: 'negativeEvidence',
        title: '风险和限制',
        description: '技术风险和局限性',
        required: true,
        wordCount: { min: 200, max: 800 },
        format: 'json',
        validation: [
          { type: 'required', message: '风险和限制为必填项' },
          { type: 'json', message: '风险和限制必须是有效的JSON格式' }
        ]
      },
      {
        id: 'practicalGuide',
        title: '操作指南',
        description: '技术操作的具体步骤',
        required: true,
        wordCount: { min: 300, max: 1200 },
        format: 'json',
        validation: [
          { type: 'required', message: '操作指南为必填项' },
          { type: 'json', message: '操作指南必须是有效的JSON格式' }
        ]
      }
    ],
    wordCount: { min: 1200, max: 6000 },
    readability: { minAge: 18, maxAge: 60 }
  },
  qualityStandards: {
    credibility: { min: 6, max: 9 },
    sources: {
      minCount: 3,
      types: ['clinical_trial', 'medical_journal', 'industry_standard', 'textbook'],
      recency: { maxAge: 36 } // 3年内
    },
    expertReview: true,
    medicalDisclaimer: true
  },
  multimediaRequirements: {
    images: {
      minCount: 3,
      maxCount: 10,
      formats: ['jpg', 'png', 'svg', 'webp'],
      resolution: { min: '800x600', max: '1920x1080' }
    },
    videos: {
      minCount: 1,
      maxCount: 5,
      duration: { min: 60, max: 600 },
      formats: ['mp4', 'webm']
    },
    audio: {
      minCount: 0,
      maxCount: 2,
      duration: { min: 60, max: 300 },
      formats: ['mp3', 'wav']
    }
  },
  sources: {
    primary: ['clinical_trial', 'medical_journal', 'industry_standard'],
    secondary: ['textbook', 'expert_opinion'],
    tertiary: ['case_study', 'website']
  }
};

/**
 * 获取增强模板
 */
export function getEnhancedTemplate(category: 'medical' | 'lifestyle' | 'technical' | 'wellness'): EnhancedContentTemplate {
  switch (category) {
    case 'medical':
      return MEDICAL_KNOWLEDGE_TEMPLATE;
    case 'lifestyle':
      return LIFESTYLE_KNOWLEDGE_TEMPLATE;
    case 'technical':
      return TECHNICAL_KNOWLEDGE_TEMPLATE;
    case 'wellness':
      return LIFESTYLE_KNOWLEDGE_TEMPLATE; // 暂时使用生活方式模板
    default:
      return LIFESTYLE_KNOWLEDGE_TEMPLATE;
  }
}

/**
 * 根据知识模块自动选择模板
 */
export function getTemplateByModule(module: string): EnhancedContentTemplate {
  const medicalModules = ['health_foundation', 'skin_care', 'dental_care', 'tcm', 'aesthetics'];
  const technicalModules = ['tech_beauty'];
  const lifestyleModules = ['posture', 'hair', 'styling', 'makeup', 'fragrance', 'mental_health', 'etiquette', 'time_management', 'environment'];
  
  if (medicalModules.includes(module)) {
    return MEDICAL_KNOWLEDGE_TEMPLATE;
  } else if (technicalModules.includes(module)) {
    return TECHNICAL_KNOWLEDGE_TEMPLATE;
  } else if (lifestyleModules.includes(module)) {
    return LIFESTYLE_KNOWLEDGE_TEMPLATE;
  }
  
  return LIFESTYLE_KNOWLEDGE_TEMPLATE;
}

/**
 * 内容质量验证函数
 */
export function validateContentQuality(content: any, template: EnhancedContentTemplate): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 验证必填字段
  template.structure.sections.forEach(section => {
    if (section.required && !content[section.id]) {
      errors.push(`${section.title}为必填项`);
    }
    
    if (content[section.id]) {
      const contentLength = content[section.id].length;
      if (contentLength < section.wordCount.min) {
        errors.push(`${section.title}内容长度不足，至少需要${section.wordCount.min}字`);
      }
      if (contentLength > section.wordCount.max) {
        warnings.push(`${section.title}内容过长，建议不超过${section.wordCount.max}字`);
      }
    }
  });
  
  // 验证来源数量
  if (content.sources && Array.isArray(content.sources)) {
    if (content.sources.length < template.qualityStandards.sources.minCount) {
      errors.push(`参考文献数量不足，至少需要${template.qualityStandards.sources.minCount}个`);
    }
  }
  
  // 验证可信度
  if (content.credibility < template.qualityStandards.credibility.min) {
    warnings.push(`内容可信度偏低，建议提升到${template.qualityStandards.credibility.min}以上`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: calculateQualityScore(content, template)
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

function calculateQualityScore(content: any, template: EnhancedContentTemplate): number {
  let score = 0;
  const maxScore = 100;
  
  // 内容完整性 (40分)
  const completedSections = template.structure.sections.filter(section => 
    content[section.id] && content[section.id].length >= section.wordCount.min
  ).length;
  score += (completedSections / template.structure.sections.length) * 40;
  
  // 来源质量 (30分)
  if (content.sources && Array.isArray(content.sources)) {
    const primarySources = content.sources.filter((source: any) => 
      template.sources.primary.includes(source.type)
    ).length;
    score += Math.min(primarySources / template.qualityStandards.sources.minCount, 1) * 30;
  }
  
  // 多媒体丰富度 (20分)
  let mediaScore = 0;
  if (content.images && Array.isArray(content.images)) {
    mediaScore += Math.min(content.images.length / template.multimediaRequirements.images.minCount, 1) * 10;
  }
  if (content.videos && Array.isArray(content.videos)) {
    mediaScore += Math.min(content.videos.length / template.multimediaRequirements.videos.minCount, 1) * 10;
  }
  score += mediaScore;
  
  // 专家审核 (10分)
  if (content.expertOpinions && Array.isArray(content.expertOpinions) && content.expertOpinions.length > 0) {
    score += 10;
  }
  
  return Math.round(score);
}
