/**
 * 初始化知识库层级结构
 * 创建15个模块的基础层级结构
 */

import "dotenv/config";
import { getDb } from "../server/db";
import { knowledgeBase } from "../drizzle/schema";
import { KNOWLEDGE_MODULES, MODULE_NAMES } from "../shared/knowledge-modules";

interface KnowledgeNode {
  title: string;
  summary: string;
  content: string;
  level: number;
  parentId?: number | null;
  path: string;
  order: number;
  module: string;
  category?: string;
  subCategory?: string;
  type: "customer" | "internal";
}

// 健康基础模块的层级结构
const healthFoundationStructure: KnowledgeNode[] = [
  // Level 1: 模块根节点
  {
    title: "健康基础",
    summary: "睡眠、水分、心情、饮食、运动等健康基础，是美容的根本",
    content: "健康基础是美容的根本。良好的睡眠、充足的水分、愉悦的心情、均衡的饮食、适量的运动，这些基础要素共同构成了美丽的基础。",
    level: 1,
    parentId: null,
    path: "1",
    order: 1,
    module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    type: "customer",
  },
  // Level 2: 睡眠管理
  {
    title: "睡眠管理",
    summary: "优质睡眠是皮肤修复和整体健康的关键",
    content: "睡眠管理包括睡眠科学、睡眠环境、睡眠习惯等方面。优质睡眠能够促进皮肤修复、激素分泌平衡、免疫力提升。",
    level: 2,
    path: "1/1",
    order: 1,
    module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    category: "睡眠管理",
    type: "customer",
  },
  // Level 3: 睡眠科学
  {
    title: "睡眠科学",
    summary: "了解睡眠的生理机制和周期",
    content: "睡眠分为多个阶段：浅睡眠、深度睡眠、REM睡眠。每个阶段都有不同的生理功能。深度睡眠是身体修复的关键时期，REM睡眠对记忆巩固和情绪调节很重要。",
    level: 3,
    path: "1/1/1",
    order: 1,
    module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    category: "睡眠管理",
    subCategory: "睡眠科学",
    type: "customer",
  },
  // Level 4: 睡眠周期
  {
    title: "睡眠周期",
    summary: "了解完整的睡眠周期结构",
    content: "一个完整的睡眠周期大约90分钟，包括浅睡眠、深度睡眠和REM睡眠。每晚通常有4-6个睡眠周期。了解睡眠周期有助于优化睡眠质量。",
    level: 4,
    path: "1/1/1/1",
    order: 1,
    module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    category: "睡眠管理",
    subCategory: "睡眠科学",
    type: "customer",
  },
  // Level 5: 深度睡眠
  {
    title: "深度睡眠",
    summary: "深度睡眠是身体修复的黄金时间",
    content: "深度睡眠（慢波睡眠）是睡眠的第三和第四阶段，此时大脑活动最慢，身体修复最活跃。生长激素分泌达到峰值，促进细胞修复和再生。",
    level: 5,
    path: "1/1/1/1/1",
    order: 1,
    module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    category: "睡眠管理",
    subCategory: "睡眠科学",
    type: "customer",
  },
  // Level 6: 如何进入深度睡眠
  {
    title: "如何进入深度睡眠",
    summary: "实用的方法帮助您进入深度睡眠",
    content: "进入深度睡眠的方法包括：1. 建立规律作息；2. 创造适宜的睡眠环境（温度18-22度，黑暗、安静）；3. 睡前放松（冥想、阅读）；4. 避免睡前使用电子设备；5. 适度运动但避免睡前剧烈运动。",
    level: 6,
    path: "1/1/1/1/1/1",
    order: 1,
    module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
    category: "睡眠管理",
    subCategory: "睡眠科学",
    type: "customer",
  },
];

// 皮肤管理模块的基础结构
const skinCareStructure: KnowledgeNode[] = [
  {
    title: "皮肤管理",
    summary: "皮肤生理学、病理分析、问题诊断、日常护理",
    content: "皮肤管理是美容的核心。了解皮肤的结构、功能、问题，掌握科学的护理方法，是保持健康美丽肌肤的基础。",
    level: 1,
    parentId: null,
    path: "2",
    order: 2,
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    type: "customer",
  },
  {
    title: "皮肤病理分析",
    summary: "常见皮肤问题的分析和诊断",
    content: "皮肤病理分析包括色斑、痘痘、敏感、老化等常见问题的成因、症状、发展阶段的分析。",
    level: 2,
    path: "2/1",
    order: 1,
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    category: "皮肤病理分析",
    type: "customer",
  },
  {
    title: "常见皮肤问题",
    summary: "色斑、痘痘、敏感、老化等常见问题",
    content: "常见皮肤问题包括色斑、痘痘、敏感、老化等。每种问题都有其特定的成因、症状和解决方案。",
    level: 3,
    path: "2/1/1",
    order: 1,
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    type: "customer",
  },
  {
    title: "色斑",
    summary: "色斑问题的全面分析",
    content: "色斑是常见的皮肤问题，包括雀斑、晒斑、黄褐斑、老年斑等。成因包括遗传、激素、紫外线、年龄等因素。",
    level: 4,
    path: "2/1/1/1",
    order: 1,
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    type: "customer",
  },
  {
    title: "色斑成因分析",
    summary: "色斑形成的内因和外因",
    content: "色斑的成因分为内因和外因。内因包括遗传因素、激素变化、年龄增长、疾病等。外因包括紫外线照射、环境污染、不良生活方式等。",
    level: 5,
    path: "2/1/1/1/1",
    order: 1,
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    type: "customer",
  },
  {
    title: "内因：遗传因素",
    summary: "遗传对色斑形成的影响",
    content: "遗传因素在色斑形成中起重要作用。某些人天生黑色素细胞活跃，更容易形成色斑。家族中有色斑史的人，后代出现色斑的概率更高。",
    level: 6,
    path: "2/1/1/1/1/1",
    order: 1,
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    category: "皮肤病理分析",
    subCategory: "常见皮肤问题",
    type: "customer",
  },
];

async function seedKnowledgeHierarchy() {
  const db = await getDb();
  if (!db) {
    console.error("数据库连接失败");
    process.exit(1);
  }

  console.log("开始初始化知识库层级结构...\n");

  // 合并所有结构
  const allStructures = [
    ...healthFoundationStructure,
    ...skinCareStructure,
  ];

  // 按层级和顺序排序
  allStructures.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.order - b.order;
  });

  const createdNodes = new Map<number, number>(); // path -> id

  for (const node of allStructures) {
    // 确定parentId
    let parentId: number | null = null;
    if (node.path.includes("/")) {
      const parentPath = node.path.split("/").slice(0, -1).join("/");
      parentId = createdNodes.get(parseInt(parentPath.replace(/\//g, ""))) || null;
    }

    try {
      const result = await db.insert(knowledgeBase).values({
        ...node,
        parentId,
        tags: JSON.stringify([node.module, node.category].filter(Boolean)),
        isActive: 1,
        credibility: 7,
        difficulty: node.level <= 2 ? "beginner" : node.level <= 4 ? "intermediate" : "advanced",
      }).returning({ id: knowledgeBase.id });

      const nodeId = result[0]?.id;
      if (nodeId) {
        const pathKey = parseInt(node.path.replace(/\//g, ""));
        createdNodes.set(pathKey, nodeId);
        console.log(`✅ 创建: ${"  ".repeat(node.level - 1)}${node.title} (L${node.level})`);
      }
    } catch (error: any) {
      console.error(`❌ 创建失败: ${node.title}`, error.message);
    }
  }

  console.log(`\n✅ 完成！共创建 ${createdNodes.size} 个知识节点`);
}

seedKnowledgeHierarchy().catch(console.error);
