#!/usr/bin/env tsx
/**
 * 各板块至少 10 条数据：对话、触发器、小红书、知识库、企业微信
 * 数据与 UI 按钮/下拉选项一致，便于在界面看到并筛选
 * 使用：tsx scripts/seed-all-sections.ts 或 npm run seed:all-sections
 */
import "dotenv/config";
import { getDb } from "../server/db";
import {
  conversations,
  messages,
  triggers,
  xiaohongshuPosts,
  knowledgeBase,
  weworkContactWay,
  weworkCustomers,
} from "../drizzle/schema";
import { getWeworkConfig, saveWeworkConfig } from "../server/wework-db";

const COUNT = 10;

// ---------- 对话（与 UI 对话管理一致：sessionId、visitorName、visitorPhone、source、status、心理学型等）
const conversationSeeds = Array.from({ length: COUNT }, (_, i) => ({
  sessionId: `seed-conv-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
  visitorName: `访客${i + 1}`,
  visitorPhone: `138${String(10000000 + i).slice(0, 8)}`,
  source: ["web", "xiaohongshu", "wework", "chat"][i % 4] as "web" | "xiaohongshu" | "wework" | "chat",
  status: "active" as const,
  psychologyType: ["恐惧型", "贪婪型", "安全型", "敏感型"][i % 4] as "恐惧型" | "贪婪型" | "安全型" | "敏感型",
  budgetLevel: ["低", "中", "高"][i % 3] as "低" | "中" | "高",
  customerTier: ["A", "B", "C", "D"][i % 4] as "A" | "B" | "C" | "D",
}));

// ---------- 触发器（与 UI 一致：生日提醒、节日提醒、时间触发、行为触发、天气触发；执行动作 create_task / follow_up）
const triggerSeeds: Array<{
  name: string;
  type: "birthday_reminder" | "holiday_reminder" | "time" | "behavior" | "weather";
  timeConfig?: string;
  behaviorConfig?: string;
  weatherConfig?: string;
  action: "create_task" | "follow_up";
  actionConfig: string;
}> = [
  { name: "本月生日客户跟进", type: "birthday_reminder", timeConfig: JSON.stringify({ daysAhead: 3 }), action: "create_task", actionConfig: JSON.stringify({ type: "create_task" }) },
  { name: "下周生日客户关怀", type: "birthday_reminder", timeConfig: JSON.stringify({ daysAhead: 7 }), action: "follow_up", actionConfig: JSON.stringify({ type: "follow_up" }) },
  { name: "春节节日营销提醒", type: "holiday_reminder", timeConfig: JSON.stringify({ holidayNames: ["春节", "生日", "纪念日"] }), action: "create_task", actionConfig: JSON.stringify({ type: "create_task" }) },
  { name: "女神节活动触发", type: "holiday_reminder", timeConfig: JSON.stringify({ holidayNames: ["妇女节", "女神节"] }), action: "follow_up", actionConfig: JSON.stringify({ type: "follow_up" }) },
  { name: "每日早班跟进任务", type: "time", timeConfig: JSON.stringify({ schedule: "0 9 * * *", target: "all" }), action: "create_task", actionConfig: JSON.stringify({ type: "create_task" }) },
  { name: "每周一高价值客户回访", type: "time", timeConfig: JSON.stringify({ schedule: "0 10 * * 1", target: "all" }), action: "follow_up", actionConfig: JSON.stringify({ type: "follow_up" }) },
  { name: "新留资 24 小时内触达", type: "behavior", behaviorConfig: JSON.stringify({ event: "new_lead", delayHours: 24 }), action: "create_task", actionConfig: JSON.stringify({ type: "create_task" }) },
  { name: "报价后 3 天未成交跟进", type: "behavior", behaviorConfig: JSON.stringify({ event: "quoted", delayDays: 3 }), action: "follow_up", actionConfig: JSON.stringify({ type: "follow_up" }) },
  { name: "高温天防晒项目推荐", type: "weather", weatherConfig: JSON.stringify({ condition: "hot", tempMin: 35 }), action: "create_task", actionConfig: JSON.stringify({ type: "create_task" }) },
  { name: "换季敏感肌关怀", type: "weather", weatherConfig: JSON.stringify({ condition: "season_change" }), action: "follow_up", actionConfig: JSON.stringify({ type: "follow_up" }) },
];

// ---------- 小红书（与内容管理 UI 一致：contentType=project/case/price/guide/holiday/new_product；status=draft/scheduled/published）
const contentTypes = ["project", "case", "price", "guide", "holiday", "new_product"] as const;
const projects = ["超皮秒祛斑", "水光针", "热玛吉", "光子嫩肤", "玻尿酸填充", "瘦脸针", "黄金微针", "皮秒美白"];
const xiaohongshuSeeds = Array.from({ length: COUNT }, (_, i) => ({
  title: `【医美种草】${projects[i % projects.length]}${["体验分享", "效果对比", "价格参考", "避坑指南", "节日福利", "新品上线"][i % 6]}${i + 1}`,
  content: `这是一条种子内容，用于${contentTypes[i % contentTypes.length]}类型展示。项目：${projects[i % projects.length]}。正文示例：专业机构，安全变美。`,
  contentType: contentTypes[i % contentTypes.length],
  project: projects[i % projects.length],
  status: (["draft", "scheduled", "published"] as const)[i % 3],
  viewCount: i % 3 === 2 ? 1000 + i * 100 : 0,
  likeCount: i % 3 === 2 ? 50 + i * 5 : 0,
  commentCount: i % 3 === 2 ? 10 + i : 0,
  shareCount: 0,
  collectCount: 0,
}));

// ---------- 知识库（与 UI 一致；每条为可读的模板级内容，非单行占位）
const MODULE_NAMES: Record<string, string> = {
  health_foundation: "健康基础",
  skin_care: "皮肤管理",
  aesthetics: "医美技术",
  tcm: "中医养生",
  dental_care: "牙齿护理",
};
function buildKnowledgeContent(category: string, moduleId: string): { summary: string; content: string } {
  const moduleName = MODULE_NAMES[moduleId] || moduleId;
  const summary = `${category}（${moduleName}）：从循证原理、适用边界到可执行要点，供深圳高端医美机构与高认知客户参考。适用与禁忌以专业指南与机构 SOP 为准。`;
  const content = [
    `## 定位与范围`,
    `本条目属于「${moduleName}」模块下的「${category}」类内容，面向深圳及粤港澳顶级医美机构的高认知客户。内容标准为医学正规、科学规范，可追溯至指南与共识。`,
    ``,
    `## 为什么重要`,
    `美容与健康的底层变量包括睡眠、水分、情绪、饮食、运动，以及皮肤/口腔/体态与医美手段。${category}相关知识与${moduleName}紧密相关，影响客户的决策质量与长期效果。`,
    ``,
    `## 关键要点`,
    `- **适用人群与边界**：不同体质、肤质、既往史会有不同适用边界；具体以面诊与机构 SOP 为准。`,
    `- **禁忌与风险**：孕期/哺乳期、正在使用维 A 酸类、过敏史等需在专业评估下决策；出现持续红肿、破溃、色素异常等应转诊。`,
    `- **可执行闭环**：评估 → 目标 → 方案（基础习惯 + 护理/项目）→ 记录与复盘 → 调整。`,
    ``,
    `## 实践建议`,
    `先稳定睡眠、饮水、防晒等基础变量，再在专业机构指导下选择护理或医美方案。效果评估建议以 2–4 周为周期对比，避免单次即下结论。争议与禁忌以最新专家共识与机构 SOP 为准。`,
  ].join("\n");
  return { summary, content };
}
const knowledgeCategoryTitles: Array<{ category: string; module: string; title: string }> = [
  { category: "项目介绍", module: "health_foundation", title: "健康基础与美容的关系" },
  { category: "FAQ", module: "health_foundation", title: "睡眠与皮肤修复常见问题" },
  { category: "注意事项", module: "skin_care", title: "日常护肤与医美项目前后注意事项" },
  { category: "价格政策", module: "aesthetics", title: "医美项目定价与价值说明" },
  { category: "销售话术", module: "aesthetics", title: "高认知客户沟通与需求澄清" },
  { category: "心理分析", module: "skin_care", title: "客户求美动机与决策心理" },
  { category: "异议处理", module: "aesthetics", title: "价格与效果异议的回应要点" },
  { category: "成交技巧", module: "aesthetics", title: "高端客户决策促成与长期维护" },
  { category: "项目介绍", module: "tcm", title: "中医体质与美容调理概述" },
  { category: "FAQ", module: "dental_care", title: "口腔美学与牙齿美白常见问题" },
];
const knowledgeSeeds = knowledgeCategoryTitles.map(({ category, module, title }, i) => {
  const { summary, content } = buildKnowledgeContent(category, module);
  return {
    type: (i % 3 === 0 ? "internal" : "customer") as "internal" | "customer",
    title,
    summary,
    content,
    category,
    module,
    isActive: 1,
    viewCount: 0,
    usedCount: 0,
    credibility: 6,
    difficulty: (i % 3 === 0 ? "beginner" : i % 3 === 1 ? "intermediate" : "advanced") as "beginner" | "intermediate" | "advanced",
    level: 1,
    order: i + 1,
  };
});

// ---------- 企业微信：先保证有一条配置；再 seed 联系我 + 客户（与 UI 展示一致）
async function ensureWeworkConfig() {
  let cfg = await getWeworkConfig();
  if (!cfg) {
    await saveWeworkConfig({ isMockMode: 1 });
    cfg = await getWeworkConfig();
  }
  return cfg;
}

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available. Set DATABASE_URL.");
    process.exit(1);
  }

  console.log("开始写入各板块至少 10 条数据...\n");

  // 1) 对话 + 消息
  const convIds: number[] = [];
  for (let i = 0; i < conversationSeeds.length; i++) {
    const [row] = await db.insert(conversations).values(conversationSeeds[i]).returning({ id: conversations.id });
    if (row) convIds.push(row.id);
  }
  for (const cid of convIds) {
    await db.insert(messages).values([
      { conversationId: cid, role: "user", content: "请问超皮秒大概多少钱？" },
      { conversationId: cid, role: "assistant", content: "您好，超皮秒根据部位和次数，约 3000-8000 元/次，可到店面诊定价。" },
      { conversationId: cid, role: "user", content: "有恢复期吗？" },
      { conversationId: cid, role: "assistant", content: "一般 3-5 天即可正常护肤，具体因人而异。" },
    ]);
  }
  console.log(`  [对话管理] 已写入 ${convIds.length} 条对话，每条 4 条消息`);

  // 2) 触发器
  for (const t of triggerSeeds) {
    const row: Record<string, unknown> = {
      name: t.name,
      type: t.type,
      timeConfig: t.timeConfig ?? null,
      action: t.action,
      actionConfig: t.actionConfig,
      isActive: 1,
      executionCount: 0,
    };
    if ("behaviorConfig" in t && t.behaviorConfig) row.behaviorConfig = t.behaviorConfig;
    if ("weatherConfig" in t && t.weatherConfig) row.weatherConfig = t.weatherConfig;
    await db.insert(triggers).values(row as any);
  }
  console.log(`  [自动化触发器] 已写入 ${triggerSeeds.length} 条触发器`);

  // 3) 小红书
  for (const x of xiaohongshuSeeds) {
    await db.insert(xiaohongshuPosts).values(x);
  }
  console.log(`  [小红书运营] 已写入 ${xiaohongshuSeeds.length} 条笔记`);

  // 4) 知识库
  for (const k of knowledgeSeeds) {
    await db.insert(knowledgeBase).values(k);
  }
  console.log(`  [知识库管理] 已写入 ${knowledgeSeeds.length} 条知识`);

  // 5) 企业微信：配置 + 联系我 + 客户
  await ensureWeworkConfig();
  for (let i = 0; i < COUNT; i++) {
    await db.insert(weworkContactWay).values({
      configId: `seed-cw-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 9)}`,
      type: i % 2 === 0 ? "single" : "multi",
      scene: i % 2 === 0 ? "1" : "2",
      remark: `种子渠道${i + 1}`,
      skipVerify: 1,
      isActive: 1,
    });
  }
  for (let i = 0; i < COUNT; i++) {
    await db.insert(weworkCustomers).values({
      externalUserId: `seed-wx-customer-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 9)}`,
      name: `企微客户${i + 1}`,
      type: "1",
      gender: i % 2 === 0 ? "1" : "2",
      remark: `种子客户${i + 1}`,
      createTime: new Date(Date.now() - i * 86400000).toISOString(),
    });
  }
  console.log(`  [企业微信] 已写入 ${COUNT} 条联系我、${COUNT} 条客户`);

  console.log("\n各板块数据已写入，请在 UI 对应页面查看。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
