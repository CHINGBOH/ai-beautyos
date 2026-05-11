/**
 * Content quality validation and moderation
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-100
}

export interface ContentMetrics {
  titleLength: number;
  contentLength: number;
  emojiCount: number;
  hashtagCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
}

/**
 * Sensitive words that should be filtered out
 */
const SENSITIVE_WORDS = [
  // Medical claims
  '100%有效', '永久', '保证', '绝对', '根治', '完全治愈',
  // Exaggerated claims
  '奇迹', '神效', '瞬间', '立刻', '马上', '一夜之间',
  // Competitive attacks
  '垃圾', '骗子', '坑人', '最差', '千万别去',
  // Inappropriate content
  '涉黄', '暴力', '赌博', '毒品',
];

/**
 * Basic content metrics calculation
 */
function calculateMetrics(title: string, content: string, tags: string[]): ContentMetrics {
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  
  const emojiCount = (title + content).match(emojiRegex)?.length || 0;
  const hashtagCount = tags.filter(tag => tag.startsWith('#')).length;
  
  const sentences = content.split(/[。！？\n]/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length;
  const avgSentenceLength = sentenceCount > 0 
    ? sentences.reduce((sum, s) => sum + s.length, 0) / sentenceCount 
    : 0;

  return {
    titleLength: title.length,
    contentLength: content.length,
    emojiCount,
    hashtagCount,
    sentenceCount,
    avgSentenceLength,
  };
}

/**
 * Validate title
 */
function validateTitle(title: string): { errors: string[]; warnings: string[]; score: number } {
  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  // Length validation
  if (title.length === 0) {
    errors.push('标题不能为空');
    score -= 50;
  } else if (title.length < 10) {
    warnings.push('标题过短，建议10-30字');
    score -= 10;
  } else if (title.length > 50) {
    warnings.push('标题过长，建议10-30字');
    score -= 10;
  }

  // Emoji check
  const hasEmoji = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu.test(title);
  if (!hasEmoji) {
    warnings.push('建议在标题中使用emoji增加吸引力');
    score -= 5;
  }

  // Sensitive words check
  for (const word of SENSITIVE_WORDS) {
    if (title.includes(word)) {
      errors.push(`标题包含敏感词: ${word}`);
      score -= 30;
    }
  }

  return { errors, warnings, score };
}

/**
 * Validate content
 */
function validateContent(content: string): { errors: string[]; warnings: string[]; score: number } {
  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  // Length validation
  if (content.length === 0) {
    errors.push('内容不能为空');
    score -= 50;
  } else if (content.length < 100) {
    warnings.push('内容过短，建议100-800字');
    score -= 15;
  } else if (content.length > 1000) {
    warnings.push('内容过长，建议100-800字');
    score -= 15;
  }

  // Structure validation
  const hasIntro = /^.{10,}/.test(content);
  const hasDetail = content.length > 200;
  const hasConclusion = content.includes('总结') || content.includes('建议') || content.includes('私信');

  if (!hasIntro) {
    warnings.push('建议在开头添加吸引人的引言');
    score -= 5;
  }
  if (!hasDetail) {
    warnings.push('内容细节不足，建议添加更多描述');
    score -= 10;
  }
  if (!hasConclusion) {
    warnings.push('建议在结尾添加总结或互动引导');
    score -= 5;
  }

  // Sensitive words check
  for (const word of SENSITIVE_WORDS) {
    if (content.includes(word)) {
      errors.push(`内容包含敏感词: ${word}`);
      score -= 30;
    }
  }

  // Emoji balance check
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojiCount = (content.match(emojiRegex) || []).length;
  if (emojiCount === 0) {
    warnings.push('建议在内容中使用emoji增加可读性');
    score -= 5;
  } else if (emojiCount > 15) {
    warnings.push('emoji使用过多，建议控制在10个以内');
    score -= 10;
  }

  return { errors, warnings, score };
}

/**
 * Validate tags
 */
function validateTags(tags: string[]): { errors: string[]; warnings: string[]; score: number } {
  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  if (tags.length === 0) {
    warnings.push('建议添加话题标签增加曝光');
    score -= 15;
  } else if (tags.length < 3) {
    warnings.push('建议添加3-5个话题标签');
    score -= 10;
  } else if (tags.length > 8) {
    warnings.push('话题标签过多，建议3-5个');
    score -= 10;
  }

  // Check hashtag format
  const invalidTags = tags.filter(tag => !tag.startsWith('#'));
  if (invalidTags.length > 0) {
    errors.push('话题标签必须以#开头');
    score -= 20;
  }

  return { errors, warnings, score };
}

/**
 * Main validation function
 */
export function validateContent(
  title: string,
  content: string,
  tags: string[]
): ValidationResult {
  const titleValidation = validateTitle(title);
  const contentValidation = validateContent(content);
  const tagsValidation = validateTags(tags);
  const metrics = calculateMetrics(title, content, tags);

  const errors = [
    ...titleValidation.errors,
    ...contentValidation.errors,
    ...tagsValidation.errors,
  ];

  const warnings = [
    ...titleValidation.warnings,
    ...contentValidation.warnings,
    ...tagsValidation.warnings,
  ];

  // Calculate overall score
  const avgScore = (titleValidation.score + contentValidation.score + tagsValidation.score) / 3;

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: Math.round(avgScore),
  };
}

/**
 * Moderate content - check for inappropriate content
 */
export function moderateContent(content: string): { isSafe: boolean; flaggedWords: string[] } {
  const flaggedWords: string[] = [];

  for (const word of SENSITIVE_WORDS) {
    if (content.includes(word)) {
      flaggedWords.push(word);
    }
  }

  return {
    isSafe: flaggedWords.length === 0,
    flaggedWords,
  };
}

/**
 * Get content suggestions for improvement
 */
export function getContentSuggestions(
  title: string,
  content: string,
  tags: string[]
): string[] {
  const suggestions: string[] = [];
  const validation = validateContent(title, content, tags);

  if (validation.warnings.length > 0) {
    suggestions.push(...validation.warnings);
  }

  // Additional suggestions
  if (!content.includes('价格') && !content.includes('元')) {
    suggestions.push('考虑添加价格信息增加透明度');
  }

  if (!content.includes('恢复') && !content.includes('效果')) {
    suggestions.push('建议添加恢复期和效果描述');
  }

  if (!content.includes('注意') && !content.includes('提醒')) {
    suggestions.push('建议添加注意事项或提醒');
  }

  return suggestions;
}
