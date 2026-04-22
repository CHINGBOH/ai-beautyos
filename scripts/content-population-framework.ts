/**
 * 内容填充框架
 * 为三个优先模块（健康基础、皮肤管理、医美技术）提供结构化内容填充
 */

import { KnowledgeModule, KNOWLEDGE_MODULES } from '../shared/knowledge-modules';
import { getEnhancedTemplate } from '../shared/enhanced-content-templates';
import { contentQualityAssessor, ContentQualityReport } from '../shared/content-quality-control';

export interface ContentHierarchy {
  module: KnowledgeModule;
  hierarchy: HierarchyLevel[];
}

export interface HierarchyLevel {
  level: number;
  name: string;
  description: string;
  items: HierarchyItem[];
}

export interface HierarchyItem {
  id: string;
  title: string;
  description: string;
  type: 'category' | 'topic' | 'subtopic' | 'detail';
  children?: HierarchyItem[];
  content?: ContentData;
}

export interface ContentData {
  template: string;
  data: any;
  sources: SourceData[];
  multimedia: MultimediaData;
  metadata: ContentMetadata;
}

export interface SourceData {
  type: string;
  title: string;
  url?: string;
  author?: string;
  date?: string;
  credibility: number;
}

export interface MultimediaData {
  images: MediaItem[];
  videos: MediaItem[];
  audio: MediaItem[];
}

export interface MediaItem {
  url: string;
  title: string;
  description: string;
  format: string;
  size?: string;
}

export interface ContentMetadata {
  difficulty: string;
  tags: string[];
  estimatedReadTime: number;
  lastUpdated: Date;
  version: string;
}

/**
 * 健康基础模块内容结构
 */
export const HEALTH_FOUNDATION_HIERARCHY: ContentHierarchy = {
  module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
  hierarchy: [
    {
      level: 1,
      name: '睡眠管理',
      description: '睡眠对美容和健康的重要影响',
      items: [
        {
          id: 'sleep-basics',
          title: '睡眠基础知识',
          description: '睡眠周期、睡眠阶段、睡眠需求',
          type: 'category',
          children: [
            {
              id: 'sleep-cycles',
              title: '睡眠周期',
              description: '浅睡眠、深睡眠、REM睡眠的规律',
              type: 'topic',
              children: [
                {
                  id: 'deep-sleep',
                  title: '深度睡眠',
                  description: '深度睡眠的特点和作用',
                  type: 'subtopic',
                  children: [
                    {
                      id: 'deep-sleep-benefits',
                      title: '深度睡眠的益处',
                      description: '对皮肤修复、身体恢复的具体作用',
                      type: 'detail'
                    },
                    {
                      id: 'deep-sleep-optimization',
                      title: '深度睡眠优化',
                      description: '如何增加深度睡眠时间',
                      type: 'detail'
                    }
                  ]
                },
                {
                  id: 'rem-sleep',
                  title: 'REM睡眠',
                  description: '快速眼动睡眠的特点',
                  type: 'subtopic',
                  children: [
                    {
                      id: 'rem-sleep-function',
                      title: 'REM睡眠功能',
                      description: '记忆巩固、情绪调节',
                      type: 'detail'
                    }
                  ]
                }
              ]
            },
            {
              id: 'sleep-disorders',
              title: '睡眠障碍',
              description: '常见睡眠问题的识别和解决',
              type: 'topic',
              children: [
                {
                  id: 'insomnia',
                  title: '失眠',
                  description: '失眠的原因和解决方案',
                  type: 'subtopic'
                },
                {
                  id: 'sleep-apnea',
                  title: '睡眠呼吸暂停',
                  description: '症状识别和治疗方法',
                  type: 'subtopic'
                }
              ]
            }
          ]
        },
        {
          id: 'sleep-environment',
          title: '睡眠环境',
          description: '创造理想的睡眠环境',
          type: 'category',
          children: [
            {
              id: 'bedroom-setup',
              title: '卧室布置',
              description: '温度、光线、声音控制',
              type: 'topic'
            },
            {
              id: 'sleep-equipment',
              title: '睡眠设备',
              description: '床垫、枕头、寝具选择',
              type: 'topic'
            }
          ]
        }
      ]
    },
    {
      level: 1,
      name: '水分管理',
      description: '水分对美容和健康的重要性',
      items: [
        {
          id: 'hydration-basics',
          title: '水分基础知识',
          description: '人体水分需求、水分平衡',
          type: 'category',
          children: [
            {
              id: 'daily-water-intake',
              title: '每日水分摄入',
              description: '不同人群的水分需求量',
              type: 'topic'
            },
            {
              id: 'hydration-sources',
              title: '水分来源',
              description: '饮用水、食物水分、其他饮品',
              type: 'topic'
            }
          ]
        },
        {
          id: 'skin-hydration',
          title: '皮肤水分',
          description: '皮肤保湿和水分平衡',
          type: 'category',
          children: [
            {
              id: 'skin-barrier',
              title: '皮肤屏障',
              description: '角质层、天然保湿因子',
              type: 'topic'
            },
            {
              id: 'dehydration-effects',
              title: '脱水对皮肤的影响',
              description: '干燥、细纹、敏感等问题',
              type: 'topic'
            }
          ]
        }
      ]
    },
    {
      level: 1,
      name: '营养基础',
      description: '营养对美容和健康的影响',
      items: [
        {
          id: 'essential-nutrients',
          title: '必需营养素',
          description: '维生素、矿物质、蛋白质等',
          type: 'category'
        },
        {
          id: 'beauty-foods',
          title: '美容食物',
          description: '对皮肤有益的食物',
          type: 'category'
        }
      ]
    },
    {
      level: 1,
      name: '心理健康',
      description: '心理状态对美容的影响',
      items: [
        {
          id: 'stress-management',
          title: '压力管理',
          description: '压力对皮肤和健康的影响',
          type: 'category'
        },
        {
          id: 'emotional-balance',
          title: '情绪平衡',
          description: '情绪调节技巧',
          type: 'category'
        }
      ]
    }
  ]
};

/**
 * 皮肤管理模块内容结构
 */
export const SKIN_CARE_HIERARCHY: ContentHierarchy = {
  module: KNOWLEDGE_MODULES.SKIN_CARE,
  hierarchy: [
    {
      level: 1,
      name: '皮肤生理学',
      description: '皮肤结构和功能的基础知识',
      items: [
        {
          id: 'skin-structure',
          title: '皮肤结构',
          description: '表皮、真皮、皮下组织',
          type: 'category',
          children: [
            {
              id: 'epidermis',
              title: '表皮层',
              description: '角质层、颗粒层、棘层、基底层',
              type: 'topic'
            },
            {
              id: 'dermis',
              title: '真皮层',
              description: '胶原纤维、弹力纤维、基质',
              type: 'topic'
            }
          ]
        },
        {
          id: 'skin-functions',
          title: '皮肤功能',
          description: '保护、调节、分泌等功能',
          type: 'category'
        }
      ]
    },
    {
      level: 1,
      name: '皮肤病理分析',
      description: '常见皮肤问题的病理机制',
      items: [
        {
          id: 'pigmentation-issues',
          title: '色素问题',
          description: '色斑、黄褐斑、雀斑等',
          type: 'category',
          children: [
            {
              id: 'melasma',
              title: '黄褐斑',
              description: '黄褐斑的成因和特点',
              type: 'topic',
              children: [
                {
                  id: 'melasma-causes',
                  title: '黄褐斑成因',
                  description: '激素、紫外线、遗传等因素',
                  type: 'subtopic'
                },
                {
                  id: 'melasma-types',
                  title: '黄褐斑类型',
                  description: '表皮型、真皮型、混合型',
                  type: 'subtopic'
                }
              ]
            },
            {
              id: 'freckles',
              title: '雀斑',
              description: '雀斑的特点和遗传因素',
              type: 'topic'
            },
            {
              id: 'age-spots',
              title: '老年斑',
              description: '光老化和年龄相关色素沉着',
              type: 'topic'
            }
          ]
        },
        {
          id: 'acne-issues',
          title: '痤疮问题',
          description: '粉刺、痘痘、痘印等',
          type: 'category'
        },
        {
          id: 'sensitivity-issues',
          title: '敏感问题',
          description: '敏感肌肤的成因和护理',
          type: 'category'
        }
      ]
    },
    {
      level: 1,
      name: '护理方案',
      description: '针对不同皮肤问题的护理方案',
      items: [
        {
          id: 'daily-care',
          title: '日常护理',
          description: '清洁、保湿、防晒基础步骤',
          type: 'category'
        },
        {
          id: 'targeted-treatment',
          title: '针对性治疗',
          description: '特定问题的解决方案',
          type: 'category'
        }
      ]
    }
  ]
};

/**
 * 医美技术模块内容结构
 */
export const AESTHETICS_HIERARCHY: ContentHierarchy = {
  module: KNOWLEDGE_MODULES.AESTHETICS,
  hierarchy: [
    {
      level: 1,
      name: '激光技术',
      description: '各种激光美容技术的原理和应用',
      items: [
        {
          id: 'pico-laser',
          title: '超皮秒激光',
          description: '超皮秒技术的原理和效果',
          type: 'category',
          children: [
            {
              id: 'pico-principle',
              title: '超皮秒原理',
              description: '皮秒级脉冲、光声效应',
              type: 'topic'
            },
            {
              id: 'pico-applications',
              title: '超皮秒应用',
              description: '祛斑、嫩肤、纹身去除',
              type: 'topic'
            }
          ]
        },
        {
          id: 'co2-laser',
          title: 'CO2点阵激光',
          description: '点阵激光的紧肤和嫩肤效果',
          type: 'category'
        }
      ]
    },
    {
      level: 1,
      name: '注射美容',
      description: '各类注射美容技术',
      items: [
        {
          id: 'botulinum-toxin',
          title: '肉毒素注射',
          description: '除皱、瘦脸等应用',
          type: 'category'
        },
        {
          id: 'hyaluronic-acid',
          title: '透明质酸填充',
          description: '填充、塑形等应用',
          type: 'category'
        }
      ]
    },
    {
      level: 1,
      name: '术后护理',
      description: '医美治疗后的护理指导',
      items: [
        {
          id: 'immediate-care',
          title: '即时护理',
          description: '治疗后的24-72小时护理',
          type: 'category'
        },
        {
          id: 'long-term-care',
          title: '长期护理',
          description: '效果维持和预防措施',
          type: 'category'
        }
      ]
    }
  ]
};

/**
 * 内容填充器
 */
export class ContentPopulator {
  private hierarchies: Map<KnowledgeModule, ContentHierarchy> = new Map();

  constructor() {
    this.hierarchies.set(KNOWLEDGE_MODULES.HEALTH_FOUNDATION, HEALTH_FOUNDATION_HIERARCHY);
    this.hierarchies.set(KNOWLEDGE_MODULES.SKIN_CARE, SKIN_CARE_HIERARCHY);
    this.hierarchies.set(KNOWLEDGE_MODULES.AESTHETICS, AESTHETICS_HIERARCHY);
  }

  /**
   * 获取模块的内容结构
   */
  getModuleHierarchy(module: KnowledgeModule): ContentHierarchy | undefined {
    return this.hierarchies.get(module);
  }

  /**
   * 生成内容数据
   */
  generateContentData(item: HierarchyItem, module: KnowledgeModule): ContentData {
    const template = getEnhancedTemplate(this.getCategoryByModule(module));
    
    return {
      template: template.id,
      data: this.generateContentByTemplate(item, template),
      sources: this.generateSources(item, module),
      multimedia: this.generateMultimedia(item),
      metadata: this.generateMetadata(item)
    };
  }

  /**
   * 批量生成模块内容
   */
  generateModuleContent(module: KnowledgeModule): Map<string, ContentData> {
    const hierarchy = this.getModuleHierarchy(module);
    if (!hierarchy) {
      throw new Error(`Module ${module} hierarchy not found`);
    }

    const contentMap = new Map<string, ContentData>();
    
    hierarchy.hierarchy.forEach(level => {
      level.items.forEach(item => {
        this.processHierarchyItem(item, module, contentMap);
      });
    });

    return contentMap;
  }

  /**
   * 处理层级项目
   */
  private processHierarchyItem(item: HierarchyItem, module: KnowledgeModule, contentMap: Map<string, ContentData>): void {
    // 为当前项目生成内容
    const contentData = this.generateContentData(item, module);
    contentMap.set(item.id, contentData);

    // 递归处理子项目
    if (item.children) {
      item.children.forEach(child => {
        this.processHierarchyItem(child, module, contentMap);
      });
    }
  }

  /**
   * 根据模板生成内容
   */
  private generateContentByTemplate(item: HierarchyItem, template: any): any {
    const content: any = {
      title: item.title,
      summary: this.generateSummary(item),
      content: this.generateDetailedContent(item)
    };

    // 根据模板结构生成各部分内容
    template.structure.sections.forEach((section: any) => {
      switch (section.id) {
        case 'positiveEvidence':
          content.positiveEvidence = this.generatePositiveEvidence(item);
          break;
        case 'negativeEvidence':
          content.negativeEvidence = this.generateNegativeEvidence(item);
          break;
        case 'neutralAnalysis':
          content.neutralAnalysis = this.generateNeutralAnalysis(item);
          break;
        case 'practicalGuide':
          content.practicalGuide = this.generatePracticalGuide(item);
          break;
        case 'caseStudies':
          content.caseStudies = this.generateCaseStudies(item);
          break;
        case 'expertOpinions':
          content.expertOpinions = this.generateExpertOpinions(item);
          break;
        case 'references':
          content.references = this.generateReferences(item);
          break;
        case 'technicalSpecs':
          content.technicalSpecs = this.generateTechnicalSpecs(item);
          break;
      }
    });

    return content;
  }

  /**
   * 生成摘要
   */
  private generateSummary(item: HierarchyItem): string {
    const summaries: Record<string, string> = {
      'deep-sleep': '深度睡眠是睡眠周期中最关键的修复阶段，对皮肤细胞再生和整体健康恢复具有重要作用。',
      'melasma': '黄褐斑是一种常见的色素沉着疾病，主要表现为面部对称分布的褐色斑块，与激素变化和紫外线暴露密切相关。',
      'pico-laser': '超皮秒激光是一种先进的激光美容技术，通过皮秒级超短脉冲产生光声效应，能够有效祛除色素沉着并刺激胶原再生。'
    };

    return summaries[item.id] || `${item.description}，本文将详细介绍相关知识和实践指导。`;
  }

  /**
   * 生成详细内容
   */
  private generateDetailedContent(item: HierarchyItem): string {
    // 这里可以集成AI生成内容或使用预定义内容模板
    return `# ${item.title}

## 概述

${item.description}

## 详细说明

这里是${item.title}的详细内容说明。根据不同的知识点类型，这里会包含相应的专业信息、科学依据、实践指导等内容。

## 相关知识

与${item.title}相关的其他知识点包括...

## 注意事项

在使用相关知识时需要注意...

## 总结

${item.title}是美容健康管理中的重要组成部分，正确理解和应用相关知识对于达到理想的美容效果至关重要。`;
  }

  /**
   * 生成正面论证
   */
  private generatePositiveEvidence(item: HierarchyItem): string {
    return JSON.stringify([
      {
        source: "科学研究",
        title: `${item.title}的相关研究`,
        content: `研究表明${item.title}具有显著的效果和科学依据。`,
        data: "有效率85%以上",
        url: "https://example.com/research"
      }
    ]);
  }

  /**
   * 生成反面论证
   */
  private generateNegativeEvidence(item: HierarchyItem): string {
    return JSON.stringify([
      {
        source: "风险分析",
        title: `${item.title}的潜在风险`,
        content: `${item.title}可能存在一些风险和局限性，需要注意。`,
        data: "风险发生率<5%",
        url: "https://example.com/risks"
      }
    ]);
  }

  /**
   * 生成中立分析
   */
  private generateNeutralAnalysis(item: HierarchyItem): string {
    return `${item.title}在美容健康管理中具有重要价值，但需要根据个人情况合理应用。建议在专业指导下进行，并注意相关风险和注意事项。`;
  }

  /**
   * 生成实践指导
   */
  private generatePracticalGuide(item: HierarchyItem): string {
    return JSON.stringify([
      {
        step: 1,
        title: "评估需求",
        description: "首先评估个人需求和适合程度",
        tools: "评估工具、专业咨询",
        duration: "30分钟",
        tips: "建议寻求专业意见"
      },
      {
        step: 2,
        title: "制定计划",
        description: "根据评估结果制定个性化计划",
        tools: "计划表、记录工具",
        duration: "1小时",
        tips: "计划要切实可行"
      }
    ]);
  }

  /**
   * 生成案例研究
   */
  private generateCaseStudies(item: HierarchyItem): string {
    return JSON.stringify([
      {
        title: `${item.title}应用案例`,
        description: "实际应用${item.title}的典型案例",
        before: "应用前的状态",
        after: "应用后的改善",
        duration: "3个月",
        result: "取得显著效果",
        lessons: "关键成功因素"
      }
    ]);
  }

  /**
   * 生成专家观点
   */
  private generateExpertOpinions(item: HierarchyItem): string {
    return JSON.stringify([
      {
        expert: "专家姓名",
        title: "专业头衔",
        content: `${item.title}在专业领域具有重要价值，建议科学合理应用。`,
        source: "专业机构",
        date: new Date().toISOString().split('T')[0]
      }
    ]);
  }

  /**
   * 生成参考文献
   */
  private generateReferences(item: HierarchyItem): string {
    return JSON.stringify([
      {
        type: "medical_journal",
        title: `${item.title}相关研究`,
        url: "https://example.com/journal",
        author: "研究者姓名",
        date: "2024-01-01",
        credibility: 9
      }
    ]);
  }

  /**
   * 生成技术规格
   */
  private generateTechnicalSpecs(item: HierarchyItem): string {
    return JSON.stringify({
      category: item.type,
      complexity: "中等",
      requirements: ["基础知识", "专业指导"],
      duration: "根据具体情况而定",
      frequency: "按需进行"
    });
  }

  /**
   * 生成来源数据
   */
  private generateSources(item: HierarchyItem, module: KnowledgeModule): SourceData[] {
    return [
      {
        type: "medical_journal",
        title: `${item.title}专业文献`,
        url: "https://pubmed.ncbi.nlm.nih.gov/",
        author: "医学研究者",
        date: "2024-01-01",
        credibility: 9
      }
    ];
  }

  /**
   * 生成多媒体数据
   */
  private generateMultimedia(item: HierarchyItem): MultimediaData {
    return {
      images: [
        {
          url: `/images/${item.id}-1.jpg`,
          title: `${item.title}示意图`,
          description: `${item.title}的相关图片`,
          format: "jpg",
          size: "800x600"
        }
      ],
      videos: [],
      audio: []
    };
  }

  /**
   * 生成元数据
   */
  private generateMetadata(item: HierarchyItem): ContentMetadata {
    return {
      difficulty: "beginner",
      tags: [item.title, item.type, "美容", "健康"],
      estimatedReadTime: 5,
      lastUpdated: new Date(),
      version: "1.0"
    };
  }

  /**
   * 根据模块获取内容类别
   */
  private getCategoryByModule(module: KnowledgeModule): 'medical' | 'lifestyle' | 'technical' | 'wellness' {
    const medicalModules = [
      KNOWLEDGE_MODULES.HEALTH_FOUNDATION, 
      KNOWLEDGE_MODULES.SKIN_CARE, 
      KNOWLEDGE_MODULES.DENTAL_CARE,
      KNOWLEDGE_MODULES.TCM,
      KNOWLEDGE_MODULES.AESTHETICS
    ];
    const technicalModules = [KNOWLEDGE_MODULES.TECH_BEAUTY];
    
    if (medicalModules.includes(module as any)) return 'medical';
    if (technicalModules.includes(module as any)) return 'technical';
    return 'lifestyle';
  }

  /**
   * 验证生成的内容质量
   */
  validateGeneratedContent(contentData: ContentData, module: KnowledgeModule): ContentQualityReport {
    return contentQualityAssessor.assessContentQuality(contentData.data, module);
  }
}

// 导出实例
export const contentPopulator = new ContentPopulator();
