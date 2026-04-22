#!/usr/bin/env tsx

/**
 * Seed medical projects data
 */

import "dotenv/config";
import { getDb } from "../server/db";
import { medicalProjects } from "../drizzle/schema";

const projects = [
  {
    name: "超皮秒祛斑",
    displayName: "超皮秒祛斑",
    category: "laser",
    description: "利用超短脉冲激光精准击碎黑色素，有效祛除雀斑、晒斑、老年斑等各类色斑",
    priceRange: "3000-8000元/次",
    recoveryTime: "3-5天",
    keywords: JSON.stringify(["皮秒", "祛斑", "雀斑", "晒斑", "激光", "色素", "淡斑"]),
    isActive: 1,
    sortOrder: 1,
  },
  {
    name: "热玛吉",
    displayName: "热玛吉射频紧肤",
    category: "laser",
    description: "利用单极射频技术加热真皮层，刺激胶原蛋白再生，达到紧肤除皱效果",
    priceRange: "15000-30000元/次",
    recoveryTime: "无恢复期",
    keywords: JSON.stringify(["热玛吉", "射频", "紧肤", "抗衰", "除皱", "提升", "胶原"]),
    isActive: 1,
    sortOrder: 2,
  },
  {
    name: "水光针",
    displayName: "水光针补水",
    category: "injection",
    description: "将玻尿酸等营养成分直接注入真皮层，达到深层补水、改善细纹的效果",
    priceRange: "1000-3000元/次",
    recoveryTime: "1-2天",
    keywords: JSON.stringify(["水光针", "补水", "玻尿酸", "保湿", "细纹", "水润"]),
    isActive: 1,
    sortOrder: 3,
  },
  {
    name: "光子嫩肤",
    displayName: "光子嫩肤",
    category: "laser",
    description: "利用强脉冲光改善肤色不均、红血丝、毛孔粗大等肌肤问题",
    priceRange: "800-2000元/次",
    recoveryTime: "无恢复期",
    keywords: JSON.stringify(["光子", "嫩肤", "美白", "红血丝", "毛孔", "肤色"]),
    isActive: 1,
    sortOrder: 4,
  },
  {
    name: "冷光美白",
    displayName: "冷光牙齿美白",
    category: "skincare",
    description: "使用冷光技术配合美白剂，快速美白牙齿，效果显著",
    priceRange: "2000-5000元/次",
    recoveryTime: "无恢复期",
    keywords: JSON.stringify(["美白", "牙齿", "冷光", "洁白", "齿科", "笑容"]),
    isActive: 1,
    sortOrder: 5,
  },
  {
    name: "隐形矫正",
    displayName: "隐形牙齿矫正",
    category: "surgery",
    description: "使用透明牙套进行牙齿矫正，美观舒适，不影响日常生活",
    priceRange: "20000-50000元/套",
    recoveryTime: "无恢复期",
    keywords: JSON.stringify(["矫正", "牙齿", "隐形", "牙套", "整齐", "口腔"]),
    isActive: 1,
    sortOrder: 6,
  },
  {
    name: "肉毒素",
    displayName: "肉毒素除皱",
    category: "injection",
    description: "注射肉毒素放松面部肌肉，消除动态皱纹，如鱼尾纹、抬头纹等",
    priceRange: "500-2000元/部位",
    recoveryTime: "无恢复期",
    keywords: JSON.stringify(["肉毒素", "除皱", "鱼尾纹", "抬头纹", "瘦脸", "抗衰"]),
    isActive: 1,
    sortOrder: 7,
  },
  {
    name: "玻尿酸填充",
    displayName: "玻尿酸填充",
    category: "injection",
    description: "注射玻尿酸填充面部凹陷部位，如法令纹、太阳穴、下巴等",
    priceRange: "2000-10000元/部位",
    recoveryTime: "3-7天",
    keywords: JSON.stringify(["玻尿酸", "填充", "法令纹", "太阳穴", "下巴", "塑形"]),
    isActive: 1,
    sortOrder: 8,
  },
];

async function main() {
  try {
    console.log("🌱 开始导入医美项目数据...\n");

    const db = await getDb();
    if (!db) {
      throw new Error("数据库未初始化");
    }

    // Clear existing projects
    console.log("🗑️  清空现有项目...");
    await db.delete(medicalProjects);

    // Insert new projects
    console.log("📥 导入新项目...");
    for (const project of projects) {
      await db.insert(medicalProjects).values(project);
      console.log(`  ✓ ${project.displayName}`);
    }

    console.log("\n✅ 医美项目导入完成！");
    console.log(`📊 共导入 ${projects.length} 个项目\n`);

    // Display summary
    console.log("📋 项目列表：");
    console.log("-".repeat(60));
    projects.forEach((p, index) => {
      console.log(`${index + 1}. ${p.displayName} - ${p.priceRange}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ 导入失败:", error);
    process.exit(1);
  }
}

main();
