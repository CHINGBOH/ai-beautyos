/**
 * 知识库内容标准模板
 * 用于创建标准化的知识库内容
 */

export interface KnowledgeContentTemplate {
  category: string;
  title: string;
  summary: string;
  content: string;
  positiveEvidence: any[];
  negativeEvidence: any[];
  neutralAnalysis: string;
  practicalGuide: any[];
  tags: string[];
}

/**
 * 项目介绍模板
 */
export const PROJECT_INTRO_TEMPLATE: KnowledgeContentTemplate = {
  category: "项目介绍",
  title: "超皮秒祛斑项目介绍",
  summary: "超皮秒激光祛斑是一种先进的色素治疗技术，通过精准击碎色素颗粒，温和祛除各类色斑。",
  content: `超皮秒激光祛斑是一种先进的色素治疗技术，采用皮秒级激光脉冲，精准击碎色素颗粒，由身体自然代谢排出。

**技术原理：**
- 使用皮秒级（10^-12秒）激光脉冲
- 瞬间击碎色素颗粒，不损伤周围组织
- 由身体自然代谢排出

**适用人群：**
- 雀斑、晒斑、老年斑等色素性斑点
- 黄褐斑（需多次治疗）
- 痘印、色素沉着

**治疗效果：**
- 2-3次治疗可见明显改善
- 90%以上客户满意度
- 效果持久，做好防晒不反弹`,
  positiveEvidence: [
    {
      source: "临床研究",
      title: "超皮秒祛斑效果研究",
      content: "根据临床数据显示，90%以上的客户在2-3次治疗后都能看到明显改善。",
      data: "90%以上客户满意度",
    },
  ],
  negativeEvidence: [
    {
      source: "医学文献",
      title: "个体差异说明",
      content: "治疗效果存在个体差异，部分客户可能需要更多次治疗才能达到理想效果。",
      data: "约10%客户需要4次以上治疗",
    },
  ],
  neutralAnalysis: "超皮秒祛斑是一种成熟的技术，效果和安全都有保障。但治疗效果会因个人体质、斑点类型、生活习惯等因素而有所差异。建议在治疗前进行专业面诊，制定个性化治疗方案。",
  practicalGuide: [
    {
      step: 1,
      title: "面诊评估",
      description: "专业医师评估斑点类型、皮肤状况，制定治疗方案",
      tools: "专业医师、皮肤检测仪",
      duration: "30分钟",
      tips: "如实告知医师您的皮肤状况和期望效果",
    },
    {
      step: 2,
      title: "治疗过程",
      description: "清洁皮肤，涂抹麻药，进行激光治疗",
      tools: "超皮秒设备、麻药",
      duration: "30-60分钟",
      tips: "治疗时会有轻微刺痛感，但大部分人都能接受",
    },
    {
      step: 3,
      title: "术后护理",
      description: "24小时内不沾水，3-5天结痂脱落，做好防晒",
      tools: "医用修复产品、防晒霜",
      duration: "5-7天",
      tips: "严格做好防晒，避免色素沉着",
    },
  ],
  tags: ["超皮秒", "祛斑", "激光", "项目介绍"],
};

/**
 * 常见问题标准回答模板
 */
export const FAQ_TEMPLATE: KnowledgeContentTemplate = {
  category: "常见问题",
  title: "超皮秒常见问题FAQ",
  summary: "关于超皮秒祛斑的常见问题及专业回答。",
  content: `**Q1: 超皮秒疼不疼？**
A: 治疗时会有轻微的刺痛感，但大部分人都能接受，就像被橡皮筋弹一下。我们会先涂抹麻药，减轻不适感。

**Q2: 恢复期要多久？**
A: 恢复期很短，3-5天就可以正常化妆了，不影响工作。治疗后24小时内会有轻微红肿，之后会结痂，5-7天痂皮脱落就完全恢复了。

**Q3: 会不会反弹？**
A: 超皮秒是通过激光击碎色素颗粒，由身体自然代谢排出，只要做好防晒，基本不会反弹。但如果长期暴晒，可能会产生新的斑点。

**Q4: 需要做几次？**
A: 一般2-3次治疗就能看到明显改善，具体次数会根据您的斑点类型和严重程度而定。

**Q5: 价格是多少？**
A: 价格会根据您的具体情况和治疗方案来定，一般在5000-15000元之间。建议您先来面诊，我们专业医师会根据您的需求制定最适合的方案。`,
  positiveEvidence: [],
  negativeEvidence: [],
  neutralAnalysis: "以上是超皮秒祛斑的常见问题，如有其他疑问，建议咨询专业医师。",
  practicalGuide: [],
  tags: ["超皮秒", "FAQ", "常见问题"],
};

/**
 * 异议处理话术模板
 */
export const OBJECTION_HANDLING_TEMPLATE: KnowledgeContentTemplate = {
  category: "异议处理",
  title: "价格异议处理话术",
  summary: "当客户提出价格异议时的专业话术和应对策略。",
  content: `**异议：价格太贵了**

**应对策略：**

1. **理解并共情**
   "我完全理解您的想法，价格确实是大家都会考虑的因素。"

2. **强调价值**
   "我们的超皮秒采用的是进口设备，由经验丰富的医师操作，效果和安全都有保障。相比其他机构，我们的性价比是最高的。"

3. **提供方案**
   "我们可以先安排一次面诊，根据您的具体情况制定最适合的方案，价格也会更精准。"

4. **引导预约**
   "而且现在预约面诊是免费的，您可以先了解一下，再决定是否治疗。"

**其他常见异议：**
- "担心没效果" → 提供数据、案例证明、效果保障
- "恢复期长" → 具体说明恢复期，提供时间建议
- "安全性担忧" → 强调资质、设备、医师经验`,
  positiveEvidence: [],
  negativeEvidence: [],
  neutralAnalysis: "处理异议时要耐心、专业，不要急于成交，先解决客户的顾虑。",
  practicalGuide: [],
  tags: ["异议处理", "销售话术", "价格"],
};

/**
 * 价格引导话术模板
 */
export const PRICE_GUIDANCE_TEMPLATE: KnowledgeContentTemplate = {
  category: "价格政策",
  title: "价格引导话术",
  summary: "如何专业地引导客户了解价格，并引导预约面诊。",
  content: `**价格引导策略：**

1. **时机选择**
   - 当客户询问价格时
   - 当客户表达意向时
   - 介绍完项目优势后

2. **引导方式**
   - 先提供参考区间："价格会根据您的具体情况和治疗方案来定，一般在5000-15000元之间。"
   - 强调个性化："具体价格需要面诊后根据个人情况确定。"
   - 引导面诊："建议您先来面诊，我们专业医师会根据您的需求制定最适合的方案，价格也会更精准。"

3. **话术示例**
   "价格会根据您的具体情况和治疗方案来定，一般在5000-15000元之间。建议您先来面诊，我们专业医师会根据您的需求制定最适合的方案，价格也会更精准。而且现在预约面诊是免费的，您可以先了解一下。"

**注意事项：**
- 不要直接报价，避免客户因价格过高而流失
- 强调价值而非价格
- 引导面诊，让专业医师来沟通价格`,
  positiveEvidence: [],
  negativeEvidence: [],
  neutralAnalysis: "价格引导要专业、自然，不要过于生硬，重点是引导客户面诊。",
  practicalGuide: [],
  tags: ["价格", "销售话术", "引导"],
};

/**
 * 获取模板
 */
export function getContentTemplate(type: "project" | "faq" | "objection" | "price"): KnowledgeContentTemplate {
  switch (type) {
    case "project":
      return PROJECT_INTRO_TEMPLATE;
    case "faq":
      return FAQ_TEMPLATE;
    case "objection":
      return OBJECTION_HANDLING_TEMPLATE;
    case "price":
      return PRICE_GUIDANCE_TEMPLATE;
    default:
      return PROJECT_INTRO_TEMPLATE;
  }
}
