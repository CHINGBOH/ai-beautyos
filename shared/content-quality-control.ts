/**
 * 内容质量控制系统
 * 确保知识库内容的专业性、准确性和实用性
 */

import { EnhancedContentTemplate, getTemplateByModule, validateContentQuality } from './enhanced-content-templates';
import { KnowledgeModule } from './knowledge-modules';

export interface QualityMetrics {
  contentCompleteness: number;
  sourceReliability: number;
  expertCredibility: number;
  multimediaRichness: number;
  userEngagement: number;
  overallScore: number;
}

export interface ContentQualityReport {
  contentId: string;
  module: KnowledgeModule;
  metrics: QualityMetrics;
  issues: QualityIssue[];
  recommendations: QualityRecommendation[];
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  reviewedBy?: string;
  reviewedAt?: Date;
}

export interface QualityIssue {
  type: 'error' | 'warning' | 'suggestion';
  category: 'content' | 'sources' | 'multimedia' | 'format' | 'accuracy';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestion?: string;
}

export interface QualityRecommendation {
  type: 'content' | 'sources' | 'multimedia' | 'format';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
}

export interface ExpertReview {
  expertId: string;
  expertName: string;
  credentials: string;
  reviewDate: Date;
  overallRating: number; // 1-10
  comments: string;
  recommendations: string[];
  approved: boolean;
}

/**
 * 内容质量评估器
 */
export class ContentQualityAssessor {
  private medicalKeywords = [
    '治疗', '诊断', '病理', '症状', '病因', '预防', '康复', '药物', '手术', '检查',
    '临床', '研究', '试验', '数据', '统计', '效果', '副作用', '并发症', '禁忌症'
  ];
  
  private credibleSourceDomains = [
    'pubmed.ncbi.nlm.nih.gov',
    'nature.com',
    'science.org',
    'nejm.org',
    'thelancet.com',
    'jama.com',
    'bmj.com',
    'who.int',
    'fda.gov',
    'nhs.uk',
    'mayoclinic.org',
    'webmd.com',
    'medscape.com'
  ];

  /**
   * 评估内容质量
   */
  assessContentQuality(content: any, module: KnowledgeModule): ContentQualityReport {
    const template = getTemplateByModule(module);
    const validation = validateContentQuality(content, template);
    
    const metrics = this.calculateMetrics(content, module);
    const issues = this.identifyIssues(content, module);
    const recommendations = this.generateRecommendations(metrics, issues);
    
    const status = this.determineStatus(validation, metrics);
    
    return {
      contentId: content.id || 'unknown',
      module,
      metrics,
      issues,
      recommendations,
      status
    };
  }

  /**
   * 计算质量指标
   */
  private calculateMetrics(content: any, module: KnowledgeModule): QualityMetrics {
    const completeness = this.calculateCompleteness(content, module);
    const reliability = this.calculateSourceReliability(content);
    const credibility = this.calculateExpertCredibility(content);
    const richness = this.calculateMultimediaRichness(content);
    const engagement = this.estimateUserEngagement(content);
    
    const overallScore = (
      completeness * 0.3 +
      reliability * 0.25 +
      credibility * 0.2 +
      richness * 0.15 +
      engagement * 0.1
    );

    return {
      contentCompleteness: completeness,
      sourceReliability: reliability,
      expertCredibility: credibility,
      multimediaRichness: richness,
      userEngagement: engagement,
      overallScore: Math.round(overallScore * 100) / 100
    };
  }

  /**
   * 计算内容完整性
   */
  private calculateCompleteness(content: any, module: KnowledgeModule): number {
    const template = getTemplateByModule(module);
    let completedSections = 0;
    let totalSections = template.structure.sections.length;

    template.structure.sections.forEach(section => {
      if (content[section.id]) {
        const contentLength = content[section.id].length;
        if (contentLength >= section.wordCount.min) {
          completedSections++;
        }
      }
    });

    return completedSections / totalSections;
  }

  /**
   * 计算来源可靠性
   */
  private calculateSourceReliability(content: any): number {
    if (!content.sources || !Array.isArray(content.sources)) {
      return 0;
    }

    let reliabilityScore = 0;
    const sources = content.sources;

    sources.forEach((source: any) => {
      let score = 0;
      
      // 检查来源类型
      if (source.type === 'peer_reviewed') score += 10;
      else if (source.type === 'clinical_trial') score += 9;
      else if (source.type === 'medical_journal') score += 8;
      else if (source.type === 'textbook') score += 7;
      else if (source.type === 'expert_opinion') score += 6;
      else if (source.type === 'government_guideline') score += 8;
      else if (source.type === 'industry_standard') score += 7;
      else if (source.type === 'case_study') score += 5;
      else if (source.type === 'news_article') score += 4;
      else if (source.type === 'website') score += 3;
      else score += 2;

      // 检查来源域名
      if (source.url) {
        const domain = this.extractDomain(source.url);
        if (this.credibleSourceDomains.includes(domain)) {
          score += 2;
        }
      }

      // 检查时效性
      if (source.date) {
        const sourceDate = new Date(source.date);
        const monthsSince = (Date.now() - sourceDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsSince <= 12) score += 2;
        else if (monthsSince <= 36) score += 1;
      }

      reliabilityScore += Math.min(score, 10);
    });

    return Math.min(reliabilityScore / sources.length, 10) / 10;
  }

  /**
   * 计算专家可信度
   */
  private calculateExpertCredibility(content: any): number {
    if (!content.expertOpinions || !Array.isArray(content.expertOpinions)) {
      return 0;
    }

    let credibilityScore = 0;
    const opinions = content.expertOpinions;

    opinions.forEach((opinion: any) => {
      let score = 0;
      
      // 检查专家资质
      if (opinion.title) {
        if (opinion.title.includes('教授') || opinion.title.includes('主任医师')) score += 3;
        else if (opinion.title.includes('副主任医师') || opinion.title.includes('副教授')) score += 2;
        else if (opinion.title.includes('医生') || opinion.title.includes('专家')) score += 1;
      }

      // 检查来源机构
      if (opinion.source) {
        if (opinion.source.includes('大学') || opinion.source.includes('医院')) score += 2;
        else if (opinion.source.includes('研究院') || opinion.source.includes('中心')) score += 1;
      }

      // 检查内容质量
      if (opinion.content && opinion.content.length > 100) score += 1;

      credibilityScore += Math.min(score, 5);
    });

    return Math.min(credibilityScore / opinions.length, 5) / 5;
  }

  /**
   * 计算多媒体丰富度
   */
  private calculateMultimediaRichness(content: any): number {
    let richnessScore = 0;
    let maxScore = 0;

    // 图片
    if (content.images && Array.isArray(content.images)) {
      richnessScore += Math.min(content.images.length / 3, 1) * 4;
      maxScore += 4;
    }

    // 视频
    if (content.videos && Array.isArray(content.videos)) {
      richnessScore += Math.min(content.videos.length / 2, 1) * 3;
      maxScore += 3;
    }

    // 音频
    if (content.audio && Array.isArray(content.audio)) {
      richnessScore += Math.min(content.audio.length / 1, 1) * 2;
      maxScore += 2;
    }

    // 图表/数据可视化
    if (content.charts && Array.isArray(content.charts)) {
      richnessScore += Math.min(content.charts.length / 2, 1) * 1;
      maxScore += 1;
    }

    return maxScore > 0 ? richnessScore / maxScore : 0;
  }

  /**
   * 估算用户参与度
   */
  private estimateUserEngagement(content: any): number {
    let engagementScore = 0;

    // 内容长度适中
    if (content.content) {
      const length = content.content.length;
      if (length >= 500 && length <= 2000) engagementScore += 2;
      else if (length >= 300 && length <= 3000) engagementScore += 1;
    }

    // 有实践指导
    if (content.practicalGuide && content.practicalGuide.length > 100) {
      engagementScore += 2;
    }

    // 有案例研究
    if (content.caseStudies && Array.isArray(content.caseStudies) && content.caseStudies.length > 0) {
      engagementScore += 2;
    }

    // 有互动元素
    if (content.interactiveElements || content.quizzes || content.surveys) {
      engagementScore += 2;
    }

    // 内容结构清晰
    if (content.content && this.hasClearStructure(content.content)) {
      engagementScore += 1;
    }

    return Math.min(engagementScore, 10) / 10;
  }

  /**
   * 识别质量问题
   */
  private identifyIssues(content: any, module: KnowledgeModule): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const template = getTemplateByModule(module);

    // 检查必填字段
    template.structure.sections.forEach(section => {
      if (section.required && !content[section.id]) {
        issues.push({
          type: 'error',
          category: 'content',
          severity: 'high',
          title: `缺少${section.title}`,
          description: `${section.title}是必填项，请补充相关内容。`,
          suggestion: `请添加${section.description}`
        });
      }
    });

    // 检查医学内容准确性
    if (this.isMedicalContent(content)) {
      if (!content.medicalDisclaimer) {
        issues.push({
          type: 'warning',
          category: 'accuracy',
          severity: 'medium',
          title: '缺少医学声明',
          description: '医学内容应包含适当的免责声明。',
          suggestion: '添加医学免责声明，建议用户咨询专业医生。'
        });
      }

      if (!content.expertOpinions || content.expertOpinions.length === 0) {
        issues.push({
          type: 'warning',
          category: 'accuracy',
          severity: 'medium',
          title: '缺少专家观点',
          description: '医学内容应有专家观点支持。',
          suggestion: '添加医学专家的专业观点和建议。'
        });
      }
    }

    // 检查来源质量
    if (content.sources && Array.isArray(content.sources)) {
      const credibleSources = content.sources.filter((source: any) => 
        this.isCredibleSource(source)
      ).length;

      if (credibleSources < content.sources.length * 0.5) {
        issues.push({
          type: 'warning',
          category: 'sources',
          severity: 'medium',
          title: '来源质量偏低',
          description: '部分来源可能不够权威。',
          suggestion: '增加同行评议的期刊文章或官方指南作为来源。'
        });
      }
    }

    // 检查多媒体内容
    if (!content.images || content.images.length === 0) {
      issues.push({
        type: 'suggestion',
        category: 'multimedia',
        severity: 'low',
        title: '缺少图片',
        description: '添加图片可以提高内容的可理解性。',
        suggestion: '添加相关的图片、图表或示意图。'
      });
    }

    return issues;
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(metrics: QualityMetrics, issues: QualityIssue[]): QualityRecommendation[] {
    const recommendations: QualityRecommendation[] = [];

    // 基于指标的建议
    if (metrics.contentCompleteness < 0.8) {
      recommendations.push({
        type: 'content',
        priority: 'high',
        title: '完善内容结构',
        description: '内容完整性有待提升，建议补充缺失的部分。',
        actionItems: [
          '检查并补充所有必填字段',
          '确保每个部分达到最小字数要求',
          '增加详细的解释和说明'
        ]
      });
    }

    if (metrics.sourceReliability < 0.7) {
      recommendations.push({
        type: 'sources',
        priority: 'high',
        title: '提升来源质量',
        description: '来源可靠性需要改善，建议添加更权威的来源。',
        actionItems: [
          '增加同行评议的期刊文章',
          '添加官方医学指南',
          '引用最新的临床研究',
          '确保来源时效性（5年内）'
        ]
      });
    }

    if (metrics.multimediaRichness < 0.5) {
      recommendations.push({
        type: 'multimedia',
        priority: 'medium',
        title: '丰富多媒体内容',
        description: '添加多媒体元素可以提升用户体验。',
        actionItems: [
          '添加相关的图片和图表',
          '制作教学视频',
          '录制专家访谈音频',
          '创建互动式图表'
        ]
      });
    }

    // 基于问题的建议
    const highPriorityIssues = issues.filter(issue => issue.severity === 'high');
    if (highPriorityIssues.length > 0) {
      recommendations.push({
        type: 'content',
        priority: 'high',
        title: '解决关键问题',
        description: '存在高优先级问题需要立即解决。',
        actionItems: highPriorityIssues.map(issue => issue.description)
      });
    }

    return recommendations;
  }

  /**
   * 确定内容状态
   */
  private determineStatus(validation: any, metrics: QualityMetrics): 'pending' | 'approved' | 'rejected' | 'needs_revision' {
    if (!validation.isValid) {
      return 'rejected';
    }

    if (metrics.overallScore >= 0.8) {
      return 'approved';
    } else if (metrics.overallScore >= 0.6) {
      return 'needs_revision';
    } else {
      return 'rejected';
    }
  }

  /**
   * 工具方法
   */
  private extractDomain(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return '';
    }
  }

  private isCredibleSource(source: any): boolean {
    if (!source.url) return false;
    
    const domain = this.extractDomain(source.url);
    return this.credibleSourceDomains.includes(domain);
  }

  private isMedicalContent(content: any): boolean {
    const text = `${content.title} ${content.content} ${content.summary}`.toLowerCase();
    return this.medicalKeywords.some(keyword => text.includes(keyword));
  }

  private hasClearStructure(content: string): boolean {
    // 检查是否有标题、列表、分段等结构元素
    const hasHeadings = /^#+\s/.test(content) || /^<h[1-6]>/i.test(content);
    const hasLists = /^\s*[-*+]\s/.test(content) || /^\s*\d+\.\s/.test(content) || /<ul|<ol/i.test(content);
    const hasParagraphs = /\n\s*\n/.test(content) || /<p>/i.test(content);
    
    return hasHeadings || hasLists || hasParagraphs;
  }
}

/**
 * 专家审核系统
 */
export class ExpertReviewSystem {
  private reviews: Map<string, ExpertReview[]> = new Map();

  /**
   * 提交专家审核
   */
  submitReview(contentId: string, review: ExpertReview): void {
    if (!this.reviews.has(contentId)) {
      this.reviews.set(contentId, []);
    }
    this.reviews.get(contentId)!.push(review);
  }

  /**
   * 获取内容的专家审核
   */
  getReviews(contentId: string): ExpertReview[] {
    return this.reviews.get(contentId) || [];
  }

  /**
   * 计算专家审核平均分
   */
  getAverageRating(contentId: string): number {
    const reviews = this.getReviews(contentId);
    if (reviews.length === 0) return 0;
    
    const total = reviews.reduce((sum, review) => sum + review.overallRating, 0);
    return total / reviews.length;
  }

  /**
   * 检查是否通过专家审核
   */
  isApprovedByExperts(contentId: string): boolean {
    const reviews = this.getReviews(contentId);
    if (reviews.length === 0) return false;
    
    const approvedCount = reviews.filter(review => review.approved).length;
    return approvedCount >= Math.ceil(reviews.length * 0.6); // 至少60%专家同意
  }
}

// 导出单例实例
export const contentQualityAssessor = new ContentQualityAssessor();
export const expertReviewSystem = new ExpertReviewSystem();
