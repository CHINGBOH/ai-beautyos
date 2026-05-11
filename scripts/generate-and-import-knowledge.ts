/**
 * 生成知识库内容并导入数据库
 * 使用LLM生成结构化的知识内容
 */

import "dotenv/config";
import { KnowledgeGenerator } from "../server/knowledge-generator";
import { getDb } from "../server/db";
import { knowledgeBase } from "../drizzle/schema";
import { KNOWLEDGE_MODULES } from "../shared/knowledge-modules";
import { logger } from "../server/_core/logger";
import { and, eq } from "drizzle-orm";

interface KnowledgeNode {
  title: string;
  module: string;
  level: number;
  parentId?: number;
  path: string;
  order: number;
  category?: string;
  subCategory?: string;
  keywords: string[];
  context?: string;
}

// 定义要生成的知识结构
const knowledgeStructure: KnowledgeNode[] = [
  // === 健康基础模块 ===
  {
    title: "健康基础",
    module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    level: 1,
    path: "1",
    order: 1,
    keywords: ["健康", "基础", "美容", "养生"],
  },
  {
    title: "睡眠管理",
    module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    level: 2,
    path: "1/1",
    order: 1,
    category: "睡眠管理",
    keywords: ["睡眠", "美容", "皮肤修复", "健康"],
  },
  {
    title: "睡眠科学",
    module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    level: 3,
    path: "1/1/1",
    order: 1,
    category: "睡眠管理",
    subCategory: "睡眠科学",
    keywords: ["睡眠周期", "深度睡眠", "REM睡眠"],
  },
  {
    title: "睡眠周期",
    module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    level: 4,
    path: "1/1/1/1",
    order: 1,
    category: "睡眠管理",
    subCategory: "睡眠科学",
    keywords: ["睡眠周期", "90分钟", "睡眠阶段"],
  },
  {
    title: "深度睡眠",
    module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    level: 5,
    path: "1/1/1/1/1",
    order: 1,
    category: "睡眠管理",
    subCategory: "睡眠科学",
    keywords: ["深度睡眠", "慢波睡眠", "生长激素", "皮肤修复"],
  },
  {
    title: "如何进入深度睡眠",
    module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    level: 6,
    path: "1/1/1/1/1/1",
    order: 1,
    category: "睡眠管理",
    subCategory: "睡眠科学",
    keywords: ["深度睡眠", "方法", "技巧", "睡眠质量"],
    context: "深度睡眠是皮肤修复的黄金时间，生长激素分泌达到峰值",
  },
  {
    title: "深度睡眠的美容益处",
    module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    level: 6,
    path: "1/1/1/1/1/2",
    order: 2,
    category: "睡眠管理",
    subCategory: "睡眠科学",
    keywords: ["深度睡眠", "美容", "皮肤修复", "抗衰老"],
    context: "深度睡眠对皮肤修复和整体健康的影响",
  },

  // === 皮肤管理模块 ===
  {
    title: "皮肤管理",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 1,
    path: "2",
    order: 2,
    keywords: ["皮肤", "管理", "护理", "美容"],
  },
  {
    title: "皮肤病理分析",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 2,
    path: "2/1",
    order: 1,
    category: "皮肤病理分析",
    keywords: ["病理", "分析", "诊断", "问题"],
  },
  {
    title: "常见皮肤问题",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 3,
    path: "2/1/1",
    order: 1,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    keywords: ["色斑", "痘痘", "敏感", "老化"],
  },
  {
    title: "色斑问题",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 4,
    path: "2/1/1/1",
    order: 1,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    keywords: ["色斑", "色素", "雀斑", "黄褐斑"],
  },
  {
    title: "色斑成因分析",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 5,
    path: "2/1/1/1/1",
    order: 1,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    keywords: ["色斑", "成因", "遗传", "紫外线", "激素"],
  },
  {
    title: "遗传因素对色斑的影响",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 6,
    path: "2/1/1/1/1/1",
    order: 1,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    keywords: ["遗传", "色斑", "基因", "家族史"],
    context: "遗传因素在色斑形成中起重要作用，某些人天生黑色素细胞活跃",
  },
  {
    title: "紫外线对色斑的影响",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 6,
    path: "2/1/1/1/1/2",
    order: 2,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    keywords: ["紫外线", "色斑", "防晒", "光老化"],
    context: "紫外线是导致色斑形成的主要外部因素",
  },
  {
    title: "激素变化对色斑的影响",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 6,
    path: "2/1/1/1/1/3",
    order: 3,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    keywords: ["激素", "色斑", "内分泌", "黄褐斑"],
    context: "激素变化（孕期、更年期、月经周期）会影响黑色素生成",
  },
  {
    title: "色斑治疗方案",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 5,
    path: "2/1/1/1/2",
    order: 2,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    keywords: ["色斑", "治疗", "医美", "护肤品", "中医"],
  },
  {
    title: "超皮秒激光祛斑",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 6,
    path: "2/1/1/1/2/1",
    order: 1,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    keywords: ["超皮秒", "激光", "祛斑", "医美"],
    context: "超皮秒激光是目前最先进的祛斑技术之一，通过极短脉冲击碎色素",
  },
  {
    title: "护肤品祛斑方案",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 6,
    path: "2/1/1/1/2/2",
    order: 2,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    keywords: ["护肤品", "祛斑", "美白", "成分"],
    context: "使用含有美白成分的护肤品是日常祛斑的重要手段",
  },
  {
    title: "中医调理祛斑",
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    level: 6,
    path: "2/1/1/1/2/3",
    order: 3,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    keywords: ["中医", "祛斑", "食疗", "体质"],
    context: "中医认为色斑与气血、脏腑功能有关，需要内调外养",
  },
];

type GeneratedKnowledgeLike = {
  title: string;
  summary: string;
  content: string;
  positiveEvidence: Array<{ source: string; title: string; content: string; data?: string }>;
  negativeEvidence: Array<{ source: string; title: string; content: string; data?: string }>;
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
};

function getMode(): "local" | "llm" {
  const arg = process.argv.find((a) => a.startsWith("--mode="));
  const fromArg = arg?.split("=")?.[1]?.trim();
  const fromEnv = process.env.KNOWLEDGE_GEN_MODE?.trim();
  const mode = (fromArg || fromEnv || "local").toLowerCase();
  return mode === "llm" ? "llm" : "local";
}

function localGenerate(node: KnowledgeNode): GeneratedKnowledgeLike {
  const keywords = node.keywords?.length ? node.keywords.join("、") : node.title;
  const levelHint =
    node.level <= 2 ? "基础认知" : node.level <= 4 ? "进阶理解" : "深度实操";

  const summary = `${node.title}（${levelHint}）：围绕${keywords}，从原理、影响因素、风险争议到可执行方案，给出可复用的学习与实践框架。`;

  const content = [
    `## 这是什么`,
    `“${node.title}”是${node.module}模块下的知识点，当前层级 L${node.level}，目标是让客户能看懂、员工能拿来做标准化训练。`,
    ``,
    `## 为什么和“变美”有关（从底层出发）`,
    `我们把变美拆成底层变量：睡眠/水分/情绪/饮食/运动 + 皮肤/口腔/体态/医美手段。${node.title}会影响其中的关键环节（屏障、炎症、代谢、激素、行为习惯等）。`,
    ``,
    `## 关键机制（用人话解释）`,
    `- 机制1：刺激/修复的平衡 —— 做得太猛会“过度刺激”，做得太轻又“没效果”。`,
    `- 机制2：短期效果 vs 长期稳定 —— 长期稳定依赖基础习惯，而不是一次手段。`,
    `- 机制3：个体差异 —— 体质、肤质、作息、环境、既往史会显著影响结果。`,
    ``,
    `## 常见误区`,
    `- 只看单一手段，不做基础：只做项目不管睡眠/防晒/饮食，容易反复。`,
    `- 追求“立刻见效”：忽略周期（代谢、修复、炎症消退都需要时间）。`,
    `- 不评估风险：忽略禁忌症/敏感期/用药史。`,
    ``,
    `## 适用边界（什么时候该找专业人士）`,
    `- 出现持续性红肿、疼痛、破溃、渗出、明显色素异常等，需要皮肤科/口腔科/正规机构评估。`,
    `- 孕期/哺乳期/正在服用维A酸类等特殊情况，谨慎处理。`,
    ``,
    `## 可执行的最小闭环（可被训练/复盘）`,
    `1) 评估：问题是什么？严重程度？触发因素？`,
    `2) 目标：想改善什么？可接受的时间成本/预算？`,
    `3) 方案：基础习惯 + 护理/产品 + 必要时的医美/治疗`,
    `4) 记录：每周对比（照片/感受/指标）`,
    `5) 调整：有效就保持，无效就回到评估重做假设`,
    ``,
    node.context ? `> 上下文：${node.context}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const positiveEvidence = [
    {
      source: "内部知识模板（待补充权威来源）",
      title: "机制一致性（逻辑证据）",
      content: `从机制角度，${node.title}通常与“屏障-炎症-修复-行为习惯”链条相关。只要把基础变量（睡眠/水分/情绪/饮食）稳定下来，往往更容易获得长期稳定的改善。`,
      data: "待补充：指南/综述/统计",
    },
    {
      source: "门店训练共识（待外部验证）",
      title: "可操作性与可复盘性",
      content: `将${node.title}拆解成“评估→目标→方案→记录→调整”的闭环，便于员工标准化执行与复盘，也更易让客户形成长期习惯。`,
      data: "待补充：内部SOP效果数据",
    },
  ];

  const negativeEvidence = [
    {
      source: "风险提示（模板）",
      title: "个体差异与过度干预风险",
      content: `${node.title}相关的干预如果过度（频率/剂量/强度过高）可能引发刺激、炎症加重、屏障受损或反复。对于敏感/屏障薄弱人群尤其需要分级策略。`,
      data: "待补充：不良反应发生率/常见诱因",
    },
  ];

  const neutralAnalysis =
    `当前内容为“快速入库的结构化占位稿”，用于先把 6 层知识树跑通与训练SOP落地。` +
    `后续会基于爬虫/人工整理补齐：权威指南、系统综述、RCT/队列研究、真实案例与可核验数据；同时对争议点给出条件化结论与禁忌清单。`;

  const practicalGuide = [
    {
      step: 1,
      title: "做一次可复盘的评估",
      description: "记录现状、触发因素、近期作息饮食、护肤/项目史，明确主诉与优先级。",
      tools: "手机记录/照片、问诊表",
      duration: "10-20分钟",
      tips: "先别急着买产品/上项目，先把问题定义清楚。",
    },
    {
      step: 2,
      title: "先稳定底层变量",
      description: "睡眠、饮水、情绪压力、饮食结构、运动，选择最容易坚持的两项先做。",
      tools: "睡眠/饮水提醒、简易运动计划",
      duration: "2周起",
      tips: "追求“可坚持”，而不是“一次做到完美”。",
    },
    {
      step: 3,
      title: "低刺激地试方案",
      description: "从低频率/低强度开始，观察 3-7 天的反应，再逐步加量或升级。",
      tools: "基础护理用品（按模块由门店SOP补齐）",
      duration: "1-4周",
      tips: "任何不适加重都应立即降级或暂停。",
    },
    {
      step: 4,
      title: "建立对比与复盘",
      description: "每周固定光线拍照，对比“红/痒/油/干/痛”等主观评分，记录变化。",
      tools: "固定拍照点位、评分表",
      duration: "每周5分钟",
      tips: "用数据帮助决策，避免情绪化加码。",
    },
  ];

  const caseStudies = [
    {
      title: `${node.title}：从反复到稳定的典型路径`,
      description: "以“先稳定底层变量，再做分级干预”为主线的典型复盘案例（占位稿）。",
      before: "问题反复、护理随意、缺少记录与边界意识。",
      after: "形成可执行闭环，反复频率下降，状态更稳定。",
      duration: "4-8周",
      result: "稳定性提升，复发/波动降低（待补充量化指标）。",
      lessons: "先把基础做到位，再谈更强的手段；记录和复盘决定长期效果。",
    },
  ];

  const expertOpinions = [
    {
      expert: "内部审核专家（占位）",
      title: "内容审核/训练负责人",
      institution: "门店/机构内部",
      content:
        `对于“${node.title}”，建议使用分级策略：先评估风险与底层变量，再选择低刺激方案；` +
        `若出现异常症状或持续恶化，优先转诊/面诊，避免自行加码。`,
      source: "内部SOP（待补充）",
    },
  ];

  const tags = Array.from(new Set([...(node.keywords || []), node.module, `L${node.level}`])).slice(0, 8);

  return {
    title: node.title,
    summary,
    content,
    positiveEvidence,
    negativeEvidence,
    neutralAnalysis,
    practicalGuide,
    caseStudies,
    expertOpinions,
    tags,
  };
}

async function generateAndImport() {
  const db = await getDb();
  if (!db) {
    console.error("❌ 数据库连接失败");
    process.exit(1);
  }

  const mode = getMode();
  const generator = mode === "llm" ? new KnowledgeGenerator() : null;
  const createdNodes = new Map<string, number>(); // path -> id

  console.log(`\n🚀 开始生成并导入知识库内容...\n`);
  console.log(`总共需要生成 ${knowledgeStructure.length} 个知识点\n`);
  console.log(`生成模式: ${mode === "llm" ? "LLM（DeepSeek）" : "本地模板（快速入库）"}\n`);

  for (let i = 0; i < knowledgeStructure.length; i++) {
    const node = knowledgeStructure[i];
    console.log(`\n${"=".repeat(60)}`);
    console.log(`进度: ${i + 1}/${knowledgeStructure.length}`);
    console.log(`正在生成: ${"  ".repeat(node.level - 1)}${node.title} (L${node.level})`);
    console.log(`${"=".repeat(60)}\n`);

    try {
      // 跳过已存在（按 module+path 判断）
      const existed = await db
        .select({ id: knowledgeBase.id })
        .from(knowledgeBase)
        .where(and(eq(knowledgeBase.module, node.module), eq(knowledgeBase.path, node.path)))
        .limit(1);
      if (existed[0]?.id) {
        createdNodes.set(node.path, existed[0].id);
        console.log(`⏭️  已存在，跳过 (ID: ${existed[0].id})`);
        continue;
      }

      // 生成内容（优先本地模板，速度最快；需要时可切换 LLM）
      const generated: GeneratedKnowledgeLike =
        mode === "llm" && generator
          ? await generator.generate({
              title: node.title,
              module: node.module,
              level: node.level,
              context: node.context,
              keywords: node.keywords,
            })
          : localGenerate(node);

      // 确定parentId
      let parentId: number | null = null;
      if (node.path.includes("/")) {
        const parentPath = node.path.split("/").slice(0, -1).join("/");
        parentId = createdNodes.get(parentPath) || null;
      }

      // 插入数据库
      const result = await db.insert(knowledgeBase).values({
        parentId,
        level: node.level,
        path: node.path,
        order: node.order,
        module: node.module,
        // 兼容旧库：category 可能是 NOT NULL
        category: node.category ?? node.subCategory ?? node.module ?? "默认分类",
        subCategory: node.subCategory,
        title: generated.title,
        summary: generated.summary,
        content: generated.content,
        positiveEvidence: JSON.stringify(generated.positiveEvidence),
        negativeEvidence: JSON.stringify(generated.negativeEvidence),
        neutralAnalysis: generated.neutralAnalysis,
        practicalGuide: JSON.stringify(generated.practicalGuide),
        caseStudies: JSON.stringify(generated.caseStudies),
        expertOpinions: JSON.stringify(generated.expertOpinions),
        tags: JSON.stringify(generated.tags),
        sources: JSON.stringify([
          {
            type: mode === "llm" ? "llm_generated" : "local_generated",
            generator: mode === "llm" ? "deepseek-chat" : "template-v1",
            date: new Date().toISOString(),
          },
        ]),
        credibility: mode === "llm" ? 7 : 4,
        difficulty: node.level <= 2 ? "beginner" : node.level <= 4 ? "intermediate" : "advanced",
        type: "customer",
        isActive: 1,
      }).returning({ id: knowledgeBase.id });

      const nodeId = result[0]?.id;
      if (nodeId) {
        createdNodes.set(node.path, nodeId);
        console.log(`✅ 已导入数据库 (ID: ${nodeId})`);
        console.log(`   摘要: ${generated.summary.substring(0, 80)}...`);
        console.log(`   正面论证: ${generated.positiveEvidence.length} 条`);
        console.log(`   反面论证: ${generated.negativeEvidence.length} 条`);
        console.log(`   实践指导: ${generated.practicalGuide.length} 个步骤`);
        console.log(`   案例研究: ${generated.caseStudies.length} 个案例`);
      }
    } catch (error) {
      console.error(`❌ 处理失败: ${node.title}`);
      console.error(error);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`✅ 完成！共生成并导入 ${createdNodes.size} 个知识点`);
  console.log(`${"=".repeat(60)}\n`);
}

generateAndImport().catch((error) => {
  logger.error("生成和导入失败", error);
  process.exit(1);
});
