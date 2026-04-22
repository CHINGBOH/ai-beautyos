#!/usr/bin/env tsx

/**
 * 极限测试数据种子脚本
 *
 * 生成 1000 条高度多样化的客户数据，覆盖所有维度组合和边界情况。
 * 同时生成触发器和触发器执行记录，覆盖所有触发类型和动作。
 *
 * 用法：npx tsx scripts/seed-extreme-test.ts
 * 环境变量：
 *   TRUNCATE=1  — 先清空 leads / triggers / trigger_executions 再插入
 */

import "dotenv/config";
import postgres from "postgres";

// ─── 常量 ───────────────────────────────────────────────────────────────────────

const LEAD_COUNT = 1000;
const BATCH_SIZE = 100;

const TIERS = ["A", "B", "C", "D"] as const;
const PSYCHOLOGIES = ["恐惧型", "贪婪型", "安全型", "敏感型"] as const;
const STATUSES = ["new", "contacted", "interested", "quoted", "converted"] as const;
const BUDGET_LEVELS = ["低", "中", "高"] as const;
const SOURCES = [
  "官网落地页", "小红书", "抖音", "朋友圈", "老客转介绍",
  "百度搜索", "门店活动", "预约表单", "chat",
] as const;

const SURNAMES = [
  "张", "王", "李", "赵", "陈", "刘", "杨", "黄", "吴", "周",
  "徐", "孙", "马", "朱", "胡", "郭", "何", "高", "林", "郑",
  "谢", "罗", "梁", "宋", "唐", "许", "韩", "冯", "邓", "曹",
];

const GIVEN_NAMES = [
  "小雅", "欣怡", "子涵", "若曦", "雨桐", "梦琪", "诗涵", "佳怡", "一诺", "静怡",
  "宇轩", "子墨", "子豪", "浩然", "思远", "俊杰", "天宇", "梓涵", "雨辰", "明轩",
  "雅琪", "晓雯", "思琪", "美玲", "淑芬", "志伟", "建国", "丽华", "秀英", "海燕",
];

const SERVICES = [
  "超皮秒祛斑", "水光针", "热玛吉", "光子嫩肤", "玻尿酸填充", "瘦脸针",
  "黄金微针", "隆鼻", "双眼皮", "皮秒美白", "祛痘修复", "抗衰紧致",
  "热拉提", "超声刀", "果酸焕肤", "激光脱毛",
];

const SOURCE_CONTENTS = [
  "短视频引流", "图文种草", "直播咨询", "预约表单", "好友推荐",
  "关键词广告", "KOL推荐", "社群分享", "线下传单", "门店体验",
];

const HOODS = [
  "南山科技园", "福田CBD", "罗湖东门", "宝安西乡", "龙华民治", "龙岗坂田",
  "蛇口", "后海", "前海", "华侨城", "香蜜湖", "车公庙", "华强北", "布吉",
  "南头", "新安", "福永", "沙井", "光明", "坪山", "大浪", "坂田",
];

const HOLIDAYS = [
  "元旦", "情人节", "妇女节", "劳动节", "儿童节", "建军节",
  "教师节", "国庆节", "圣诞节", "母亲节", "父亲节", "春节", "纪念日", "生日",
];

const PHONE_PREFIXES = [
  "130", "131", "132", "155", "156", "157", "158", "186", "187", "188",
  "133", "134", "135", "136", "137", "138", "139", "150", "151", "152",
];

const MESSAGES = [
  "想了解祛斑项目的恢复期和效果。",
  "请问热玛吉做一次多少钱？效果能维持多久？",
  "我皮肤敏感，能做光子嫩肤吗？",
  "看到你们小红书上的案例，想预约面诊。",
  "之前在别家做过水光针，想换你们试试。",
  "想改善法令纹，有什么方案推荐？",
  "预算有限，有没有性价比高的抗衰项目？",
  "朋友推荐来的，想了解一下双眼皮手术。",
  "请问周末可以预约吗？",
  "想先咨询一下，不着急做决定。",
  "有没有适合夏天做的医美项目？",
  "皮肤暗沉严重，想要提亮肤色。",
  "产后皮肤松弛，想做紧致提升。",
  "想了解一下激光脱毛的疗程和价格。",
  "对玻尿酸填充感兴趣，想了解具体方案。",
];

const PSYCHOLOGY_TAGS_POOL = [
  "效果关注", "价格敏感", "安全优先", "口碑驱动", "品牌忠诚",
  "冲动消费", "理性对比", "闺蜜推荐", "明星同款", "限时优惠",
  "术后保障", "医生资质", "环境要求", "隐私保护", "售后服务",
];

// ─── 工具函数 ─────────────────────────────────────────────────────────────────────

const pick = <T,>(arr: readonly T[], i: number): T => arr[((i % arr.length) + arr.length) % arr.length];
const between = (min: number, max: number, i: number): number => min + (((i * 7 + 3) % (max - min + 1)));

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Lead 生成 ────────────────────────────────────────────────────────────────────

interface LeadRow {
  name: string;
  phone: string;
  wechat: string | null;
  age: number | null;
  hood: string | null;
  birthday: string | null;
  importantHolidays: string | null;
  interestedServices: string | null;
  budget: string | null;
  budgetLevel: string | null;
  message: string | null;
  source: string;
  sourceContent: string | null;
  status: string;
  psychologyType: string | null;
  psychologyTags: string | null;
  customerTier: string | null;
  notes: string | null;
  followUpDate: string | null;
}

function buildLead(i: number): LeadRow {
  const idx = i + 1; // 1-based

  // --- 基础维度（确定性分布） ---
  const tier = pick(TIERS, idx);
  const psych = pick(PSYCHOLOGIES, idx + 1);
  const status = pick(STATUSES, idx + 2);
  const budgetLevel = pick(BUDGET_LEVELS, idx + 3);
  const source = pick(SOURCES, idx + 4);

  // --- 姓名 ---
  let name: string;
  if (idx >= 71 && idx <= 80) {
    // 特殊字符姓名
    const specials = [
      "张·三", "O'Brien", "李《测试》", "王<script>alert(1)</script>",
      "Robert'); DROP TABLE leads;--", "赵\n换行", "陈\t制表符",
      "黄\u7A7A空字符", "吴\u202E反向", "周\uFEFFBOM",
    ];
    name = specials[idx - 71];
  } else {
    name = `${pick(SURNAMES, idx)}${pick(GIVEN_NAMES, idx + 7)}`;
  }

  // --- 电话 ---
  let phone: string;
  if (idx >= 81 && idx <= 90) {
    // 边界电话格式
    const edgePhones = [
      "13000000000", "19999999999", "13000000001", "18888888888",
      "10000000000", "13012345678", "13000000099", "15500000000",
      "17000000000", "13000000002",
    ];
    phone = edgePhones[idx - 81];
  } else {
    const prefix = pick(PHONE_PREFIXES, idx);
    const mid = String(1000 + ((idx * 37) % 8999)).padStart(4, "0");
    const end = String(1000 + ((idx * 91) % 8999)).padStart(4, "0");
    phone = `${prefix}${mid}${end}`;
  }

  // --- 微信 ---
  let wechat: string | null;
  if (idx >= 101 && idx <= 110) {
    wechat = null; // 无微信
  } else {
    wechat = `wx_${idx.toString().padStart(4, "0")}`;
  }

  // --- 年龄 ---
  let age: number | null;
  if (idx >= 51 && idx <= 60) age = 18;
  else if (idx >= 61 && idx <= 70) age = 70;
  else age = between(19, 65, idx);

  // --- 区域 ---
  let hood: string | null;
  if (idx >= 101 && idx <= 110) hood = null;
  else hood = pick(HOODS, idx + 8);

  // --- 生日 ---
  let birthday: string | null;
  if (idx >= 101 && idx <= 110) {
    birthday = null; // 无生日
  } else if (idx >= 1 && idx <= 50) {
    // 生日 = 今天（触发 birthday_reminder）
    birthday = `${todayISO()}T00:00:00.000Z`;
  } else {
    const month = (idx % 12) + 1;
    const day = (idx % 28) + 1;
    birthday = `2000-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00.000Z`;
  }

  // --- 重要节日 ---
  let importantHolidays: string | null;
  if (idx % 7 === 0) {
    importantHolidays = null;
  } else {
    const count = ((idx % 3) + 1);
    const holidays: string[] = [];
    for (let h = 0; h < count; h++) {
      holidays.push(pick(HOLIDAYS, idx + h * 5));
    }
    importantHolidays = [...new Set(holidays)].join(",");
  }

  // --- 感兴趣的服务 ---
  let interestedServices: string | null;
  if (idx >= 111 && idx <= 120) {
    interestedServices = JSON.stringify([]); // 空数组
  } else {
    const svc1 = pick(SERVICES, idx);
    const svc2 = pick(SERVICES, idx + 5);
    const svc3 = pick(SERVICES, idx + 11);
    const svcSet = [...new Set([svc1, svc2, svc3])];
    interestedServices = JSON.stringify(svcSet);
  }

  // --- 预算 ---
  let budget: string | null;
  if (budgetLevel === "高") budget = "2万以上";
  else if (budgetLevel === "中") budget = "8k-2万";
  else budget = "3k-8k";

  // --- 消息 ---
  let message: string | null;
  if (idx >= 121 && idx <= 130) {
    // emoji 和 HTML 实体
    message = "想做热玛吉  效果好吗？价格多少？<script>alert('xss')</script>&nbsp;恢复期多久？";
  } else {
    message = pick(MESSAGES, idx);
  }

  // --- 心理标签 ---
  const tagCount = (idx % 4) + 1;
  const psychologyTags: string[] = [];
  for (let t = 0; t < tagCount; t++) {
    psychologyTags.push(pick(PSYCHOLOGY_TAGS_POOL, idx + t * 3));
  }

  // --- sourceContent ---
  const sourceContent = pick(SOURCE_CONTENTS, idx + 5);

  // --- notes ---
  let notes: string | null;
  if (idx >= 91 && idx <= 100) {
    // 非常长的 notes
    notes = `客户详细信息：${"这是一个非常详细的备注信息，包含客户的各种偏好和历史记录。".repeat(50)}客户编号：${idx}`;
  } else if (idx >= 101 && idx <= 110) {
    notes = null;
  } else {
    notes = `客户偏好：${pick(SERVICES, idx)}，关注点：${psych}，来源渠道：${source}`;
  }

  // --- followUpDate ---
  let followUpDate: string | null;
  if (idx >= 131 && idx <= 140) {
    // 过去的 followUpDate（流失客户）
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - (idx - 130) * 7);
    followUpDate = pastDate.toISOString();
  } else if (idx >= 141 && idx <= 150) {
    // 未来 3 天内（待跟进）
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + ((idx - 140) % 3) + 1);
    followUpDate = futureDate.toISOString();
  } else {
    followUpDate = null;
  }

  return {
    name,
    phone,
    wechat,
    age,
    hood,
    birthday,
    importantHolidays,
    interestedServices,
    budget,
    budgetLevel,
    message,
    source,
    sourceContent,
    status,
    psychologyType: psych,
    psychologyTags: JSON.stringify(psychologyTags),
    customerTier: tier,
    notes,
    followUpDate,
  };
}

// ─── Trigger 数据 ─────────────────────────────────────────────────────────────────

interface TriggerRow {
  name: string;
  description: string;
  type: string;
  timeConfig: string | null;
  behaviorConfig: string | null;
  weatherConfig: string | null;
  action: string;
  actionConfig: string;
  targetFilter: string | null;
  isActive: number;
  executionCount: number;
}

function buildTriggers(): TriggerRow[] {
  return [
    // birthday_reminder × send_message (2)
    {
      name: "生日提醒-A/B层客户",
      description: "A/B层客户生日前3天发送祝福和优惠券",
      type: "birthday_reminder",
      timeConfig: JSON.stringify({ daysBefore: 3, time: "10:00", repeat: "yearly" }),
      behaviorConfig: null,
      weatherConfig: null,
      action: "send_message",
      actionConfig: JSON.stringify({ template: "birthday_greeting", channel: "wechat", content: "亲爱的{name}，祝您生日快乐！为您准备了专属生日礼包。" }),
      targetFilter: JSON.stringify({ customerTier: ["A", "B"] }),
      isActive: 1,
      executionCount: 12,
    },
    {
      name: "生日提醒-C/D层客户",
      description: "C/D层客户生日前1天发送简单祝福",
      type: "birthday_reminder",
      timeConfig: JSON.stringify({ daysBefore: 1, time: "09:00", repeat: "yearly" }),
      behaviorConfig: null,
      weatherConfig: null,
      action: "send_message",
      actionConfig: JSON.stringify({ template: "birthday_simple", channel: "wechat", content: "{name}，生日快乐！" }),
      targetFilter: JSON.stringify({ customerTier: ["C", "D"] }),
      isActive: 1,
      executionCount: 8,
    },
    // holiday_reminder × send_message (2)
    {
      name: "大节日营销提醒",
      description: "春节/国庆/情人节等大节日前7天发送优惠",
      type: "holiday_reminder",
      timeConfig: JSON.stringify({ holidays: ["春节", "国庆节", "情人节"], daysBefore: 7, time: "09:00" }),
      behaviorConfig: null,
      weatherConfig: null,
      action: "send_message",
      actionConfig: JSON.stringify({ template: "holiday_promotion", channel: "wechat", content: "{节日}快乐！专属优惠等您来！" }),
      targetFilter: JSON.stringify({ customerTier: ["A", "B", "C"] }),
      isActive: 1,
      executionCount: 5,
    },
    {
      name: "小节日关怀提醒",
      description: "母亲节/父亲节等发送关怀消息",
      type: "holiday_reminder",
      timeConfig: JSON.stringify({ holidays: ["母亲节", "父亲节", "儿童节"], daysBefore: 3, time: "10:00" }),
      behaviorConfig: null,
      weatherConfig: null,
      action: "send_message",
      actionConfig: JSON.stringify({ template: "holiday_care", channel: "wechat", content: "节日快乐！为您准备了小礼物～" }),
      targetFilter: null,
      isActive: 1,
      executionCount: 3,
    },
    // time × create_task (2)
    {
      name: "7天回访任务",
      description: "客户到店7天后创建回访任务",
      type: "time",
      timeConfig: JSON.stringify({ type: "follow_up", daysAfter: 7, time: "14:00", repeat: "once" }),
      behaviorConfig: null,
      weatherConfig: null,
      action: "create_task",
      actionConfig: JSON.stringify({ taskType: "follow_up", title: "7天回访-{name}", priority: "medium" }),
      targetFilter: JSON.stringify({ status: ["converted"] }),
      isActive: 1,
      executionCount: 20,
    },
    {
      name: "30天效果跟进任务",
      description: "治疗30天后创建效果跟进任务",
      type: "time",
      timeConfig: JSON.stringify({ type: "follow_up", daysAfter: 30, time: "15:00", repeat: "once" }),
      behaviorConfig: null,
      weatherConfig: null,
      action: "create_task",
      actionConfig: JSON.stringify({ taskType: "effect_follow_up", title: "30天效果跟进-{name}", priority: "high" }),
      targetFilter: JSON.stringify({ status: ["converted"], services: ["超皮秒", "热玛吉"] }),
      isActive: 1,
      executionCount: 15,
    },
    // time × follow_up (1)
    {
      name: "90天流失预警",
      description: "客户90天未到店，创建召回任务",
      type: "time",
      timeConfig: JSON.stringify({ type: "inactivity", daysInactive: 90, time: "11:00", repeat: "monthly" }),
      behaviorConfig: null,
      weatherConfig: null,
      action: "follow_up",
      actionConfig: JSON.stringify({ template: "recall", channel: "wechat", content: "亲爱的{name}，好久不见！最近有新项目适合您。" }),
      targetFilter: JSON.stringify({ customerTier: ["A", "B"] }),
      isActive: 1,
      executionCount: 7,
    },
    // behavior × send_message (2)
    {
      name: "浏览未咨询提醒",
      description: "客户浏览项目24小时后未咨询，发送提醒",
      type: "behavior",
      timeConfig: null,
      behaviorConfig: JSON.stringify({ event: "browse_no_consult", duration: 24, unit: "hours" }),
      weatherConfig: null,
      action: "send_message",
      actionConfig: JSON.stringify({ template: "browse_reminder", channel: "wechat", content: "看到您对{project}感兴趣，有问题随时问我！" }),
      targetFilter: JSON.stringify({ source: ["官网落地页", "小红书", "抖音"] }),
      isActive: 1,
      executionCount: 25,
    },
    {
      name: "咨询未预约提醒",
      description: "客户咨询48小时未预约，发送优惠促单",
      type: "behavior",
      timeConfig: null,
      behaviorConfig: JSON.stringify({ event: "consult_no_book", duration: 48, unit: "hours" }),
      weatherConfig: null,
      action: "send_message",
      actionConfig: JSON.stringify({ template: "consult_reminder", channel: "wechat", content: "亲爱的{name}，现在预约可享首单8折！" }),
      targetFilter: JSON.stringify({ psychologyType: ["贪婪型"], budgetLevel: ["中", "高"] }),
      isActive: 1,
      executionCount: 18,
    },
    // behavior × create_task (1)
    {
      name: "高价值客户行为任务",
      description: "A层客户有浏览行为时创建跟进任务",
      type: "behavior",
      timeConfig: null,
      behaviorConfig: JSON.stringify({ event: "high_value_browse", duration: 1, unit: "hours" }),
      weatherConfig: null,
      action: "create_task",
      actionConfig: JSON.stringify({ taskType: "vip_follow_up", title: "VIP客户浏览跟进-{name}", priority: "urgent" }),
      targetFilter: JSON.stringify({ customerTier: ["A"] }),
      isActive: 1,
      executionCount: 10,
    },
    // weather × send_message (2)
    {
      name: "晴天防晒提醒",
      description: "晴天高温时发送防晒建议",
      type: "weather",
      timeConfig: null,
      behaviorConfig: null,
      weatherConfig: JSON.stringify({ condition: "sunny", temperature: { min: 28, max: 45 } }),
      action: "send_message",
      actionConfig: JSON.stringify({ template: "weather_sunny", channel: "wechat", content: "今天紫外线强烈，记得做好防晒！推荐：防晒霜+修复面膜。" }),
      targetFilter: JSON.stringify({ customerTier: ["A", "B", "C"] }),
      isActive: 1,
      executionCount: 30,
    },
    {
      name: "雨天补水提醒",
      description: "雨天发送皮肤补水建议",
      type: "weather",
      timeConfig: null,
      behaviorConfig: null,
      weatherConfig: JSON.stringify({ condition: "rainy", temperature: { min: 10, max: 25 } }),
      action: "send_message",
      actionConfig: JSON.stringify({ template: "weather_rainy", channel: "wechat", content: "雨天湿度大，皮肤容易缺水，建议做好补水保湿。" }),
      targetFilter: null,
      isActive: 1,
      executionCount: 12,
    },
    // weather × follow_up (1)
    {
      name: "极端天气关怀",
      description: "极端天气（暴雨/台风）关怀提醒",
      type: "weather",
      timeConfig: null,
      behaviorConfig: null,
      weatherConfig: JSON.stringify({ condition: "extreme", events: ["storm", "typhoon"] }),
      action: "follow_up",
      actionConfig: JSON.stringify({ template: "weather_care", channel: "wechat", content: "{name}，注意安全！极端天气期间门店可能调整营业时间。" }),
      targetFilter: JSON.stringify({ customerTier: ["A"] }),
      isActive: 0, // 停用状态，测试 UI 显示
      executionCount: 2,
    },
  ];
}

// ─── Trigger Execution 数据 ────────────────────────────────────────────────────────

interface ExecutionRow {
  triggerId: number;
  leadId: number | null;
  executedAt: string;
  status: string;
  result: string | null;
  errorMessage: string | null;
}

function buildExecutions(triggerIds: number[], leadIds: number[]): ExecutionRow[] {
  const executions: ExecutionRow[] = [];
  const execStatuses = ["success", "success", "success", "failed", "pending"] as const;
  const errorMessages = [
    "微信接口超时",
    "客户已删除好友",
    "模板消息发送失败: invalid template id",
    "触发器配置错误: missing actionConfig",
    "网络异常，请稍后重试",
  ];

  let idx = 0;
  for (const triggerId of triggerIds) {
    // 每个触发器生成 3-4 条执行记录
    const count = 3 + (triggerId % 2);
    for (let j = 0; j < count; j++) {
      const status = pick(execStatuses, idx);
      const daysAgo = (idx * 3) % 30;
      const executedAt = new Date();
      executedAt.setDate(executedAt.getDate() - daysAgo);
      executedAt.setHours(8 + (idx % 12), (idx * 7) % 60, 0, 0);

      executions.push({
        triggerId,
        leadId: pick(leadIds, idx),
        executedAt: executedAt.toISOString(),
        status,
        result: status === "success" ? JSON.stringify({ sent: true, channel: "wechat" }) : null,
        errorMessage: status === "failed" ? pick(errorMessages, idx) : null,
      });
      idx++;
    }
  }

  return executions;
}

// ─── 主逻辑 ───────────────────────────────────────────────────────────────────────

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL 未配置");
    process.exit(1);
  }

  const truncate = process.env.TRUNCATE === "1" || process.argv.includes("--truncate");
  const sql = postgres(databaseUrl, { idle_timeout: 5 });

  try {
    // ── 清空 ──
    if (truncate) {
      console.log("  清空 trigger_executions / triggers / leads ...");
      await sql`TRUNCATE TABLE trigger_executions RESTART IDENTITY CASCADE`;
      await sql`TRUNCATE TABLE triggers RESTART IDENTITY CASCADE`;
      await sql`TRUNCATE TABLE leads RESTART IDENTITY CASCADE`;
      console.log("✅ 已清空");
    }

    // ── 1. 生成 1000 条 leads（分批插入） ──
    console.log("\n  生成 1000 条客户数据 ...");
    const allLeads = Array.from({ length: LEAD_COUNT }, (_, i) => buildLead(i));

    for (let batch = 0; batch < LEAD_COUNT / BATCH_SIZE; batch++) {
      const slice = allLeads.slice(batch * BATCH_SIZE, (batch + 1) * BATCH_SIZE);
      await sql.begin(async (tx) => {
        for (const lead of slice) {
          await tx`
            INSERT INTO leads
              (name, phone, wechat, age, hood, birthday, important_holidays,
               interested_services, budget, budget_level, message, source,
               source_content, status, psychology_type, psychology_tags,
               customer_tier, notes, follow_up_date)
            VALUES
              (${lead.name}, ${lead.phone}, ${lead.wechat}, ${lead.age},
               ${lead.hood}, ${lead.birthday}, ${lead.importantHolidays},
               ${lead.interestedServices}, ${lead.budget}, ${lead.budgetLevel},
               ${lead.message}, ${lead.source}, ${lead.sourceContent},
               ${lead.status}, ${lead.psychologyType}, ${lead.psychologyTags},
               ${lead.customerTier}, ${lead.notes}, ${lead.followUpDate})
          `;
        }
      });
      console.log(`   批次 ${batch + 1}/${LEAD_COUNT / BATCH_SIZE} 完成 (${slice.length} 条)`);
    }
    console.log(`✅ 已插入 ${LEAD_COUNT} 条客户数据`);

    // ── 2. 生成 triggers ──
    console.log("\n  生成触发器数据 ...");
    const triggerRows = buildTriggers();
    const triggerIds: number[] = [];

    for (const trigger of triggerRows) {
      const [row] = await sql`
        INSERT INTO triggers
          (name, description, type, time_config, behavior_config, weather_config,
           action, action_config, target_filter, is_active, execution_count)
        VALUES
          (${trigger.name}, ${trigger.description}, ${trigger.type},
           ${trigger.timeConfig}, ${trigger.behaviorConfig}, ${trigger.weatherConfig},
           ${trigger.action}, ${trigger.actionConfig}, ${trigger.targetFilter},
           ${trigger.isActive}, ${trigger.executionCount})
        RETURNING id
      `;
      triggerIds.push(row.id);
      console.log(`   ✅ ${trigger.name} (id=${row.id})`);
    }
    console.log(`✅ 已插入 ${triggerRows.length} 条触发器`);

    // ── 3. 生成 trigger executions ──
    console.log("\n  生成触发器执行记录 ...");

    // 获取部分 lead IDs
    const leadRows = await sql`SELECT id FROM leads ORDER BY id LIMIT 100`;
    const leadIds = leadRows.map((r: any) => r.id);

    const executions = buildExecutions(triggerIds, leadIds);
    await sql.begin(async (tx) => {
      for (const exec of executions) {
        await tx`
          INSERT INTO trigger_executions
            (trigger_id, lead_id, executed_at, status, result, error_message)
          VALUES
            (${exec.triggerId}, ${exec.leadId}, ${exec.executedAt},
             ${exec.status}, ${exec.result}, ${exec.errorMessage})
        `;
      }
    });
    console.log(`✅ 已插入 ${executions.length} 条执行记录`);

    // ── 汇总 ──
    console.log("\n" + "=".repeat(50));
    console.log("  极限测试数据生成完成！");
    console.log("=".repeat(50));
    console.log(`   客户数据: ${LEAD_COUNT} 条`);
    console.log(`   触发器:   ${triggerRows.length} 条`);
    console.log(`   执行记录: ${executions.length} 条`);
    console.log("\n  维度覆盖:");
    console.log(`   客户层级: ${[...TIERS].join("/")}`);
    console.log(`   心理类型: ${[...PSYCHOLOGIES].join("/")}`);
    console.log(`   客户状态: ${[...STATUSES].join("/")}`);
    console.log(`   预算等级: ${[...BUDGET_LEVELS].join("/")}`);
    console.log(`   来源渠道: ${SOURCES.length} 种`);
    console.log(`   重要节日: ${HOLIDAYS.length} 种`);
    console.log(`   触发类型: birthday_reminder / holiday_reminder / time / behavior / weather`);
    console.log(`   触发动作: send_message / create_task / follow_up`);
    console.log("\n  边界情况:");
    console.log("   50 条生日=今天（生日提醒触发）");
    console.log("   10 条 age=18（最小年龄边界）");
    console.log("   10 条 age=70（最大年龄边界）");
    console.log("   10 条特殊字符姓名（含 XSS/SQL 注入测试）");
    console.log("   10 条超长 notes（2000+ 字符）");
    console.log("   10 条部分字段为 null");
    console.log("   10 条空 interestedServices");
    console.log("   10 条 emoji/HTML 消息");
    console.log("   10 条流失客户（followUpDate 过期）");
    console.log("   10 条待跟进客户（followUpDate 近期）");
  } catch (error) {
    console.error("❌ 生成失败:", error);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main();
