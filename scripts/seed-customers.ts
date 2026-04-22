import "dotenv/config";
import postgres from "postgres";

type LeadSeed = {
  name: string;
  phone: string;
  wechat?: string;
  age?: number;
  interestedServices?: string[];
  budget?: string;
  budgetLevel?: "低" | "中" | "高";
  message?: string;
  source: string;
  sourceContent?: string;
  status?: "new" | "contacted" | "interested" | "quoted" | "converted";
  psychologyType?: "恐惧型" | "贪婪型" | "安全型" | "敏感型";
  psychologyTags?: string[];
  customerTier?: "A" | "B" | "C" | "D";
  notes?: string;
};

const DEFAULT_COUNT = 200;

const surnames = [
  "张",
  "王",
  "李",
  "赵",
  "陈",
  "刘",
  "杨",
  "黄",
  "吴",
  "周",
  "徐",
  "孙",
  "马",
  "朱",
  "胡",
  "郭",
  "何",
  "高",
  "林",
  "郑",
];

const givenNames = [
  "小雅",
  "欣怡",
  "子涵",
  "若曦",
  "雨桐",
  "梦琪",
  "诗涵",
  "佳怡",
  "一诺",
  "静怡",
  "宇轩",
  "子墨",
  "子豪",
  "浩然",
  "思远",
  "俊杰",
  "天宇",
  "梓涵",
  "雨辰",
  "明轩",
];

const services = [
  "超皮秒祛斑",
  "水光针",
  "热玛吉",
  "光子嫩肤",
  "玻尿酸填充",
  "瘦脸针",
  "黄金微针",
  "隆鼻",
  "双眼皮",
  "皮秒美白",
  "祛痘修复",
  "抗衰紧致",
];

const sources = ["官网落地页", "小红书", "抖音", "朋友圈", "老客转介绍", "百度搜索", "门店活动"];
const sourceContents = ["短视频引流", "图文种草", "直播咨询", "预约表单", "好友推荐", "关键词广告"];
const statuses: LeadSeed["status"][] = ["new", "contacted", "interested", "quoted", "converted"];
const tiers: LeadSeed["customerTier"][] = ["A", "B", "C", "D"];
const psychologies: LeadSeed["psychologyType"][] = ["恐惧型", "贪婪型", "安全型", "敏感型"];
const budgets: LeadSeed["budgetLevel"][] = ["低", "中", "高"];

const randomPick = <T,>(list: T[], indexSeed: number) => list[indexSeed % list.length];
const randomBetween = (min: number, max: number, seed: number) =>
  min + (seed % (max - min + 1));

const buildName = (seed: number) =>
  `${randomPick(surnames, seed)}${randomPick(givenNames, seed + 7)}`;

const buildPhone = (seed: number) => {
  const prefix = ["130", "131", "132", "155", "156", "157", "158", "186", "187", "188"][seed % 10];
  const middle = String(1000 + ((seed * 37) % 8999)).padStart(4, "0");
  const last = String(1000 + ((seed * 91) % 8999)).padStart(4, "0");
  return `${prefix}${middle}${last}`;
};

const buildWechat = (seed: number) => `wx_${seed.toString().padStart(4, "0")}`;

const buildLead = (index: number): LeadSeed => {
  const budgetLevel = randomPick(budgets, index);
  const customerTier = randomPick(tiers, index + 1);
  const psychologyType = randomPick(psychologies, index + 2);
  const service1 = randomPick(services, index);
  const service2 = randomPick(services, index + 3);
  const source = randomPick(sources, index + 4);
  const sourceContent = randomPick(sourceContents, index + 5);
  const status = randomPick(statuses, index + 6);

  return {
    name: buildName(index),
    phone: buildPhone(index),
    wechat: buildWechat(index),
    age: randomBetween(19, 55, index),
    interestedServices: [service1, service2].filter((s, idx, arr) => arr.indexOf(s) === idx),
    budget: budgetLevel === "高" ? "2万以上" : budgetLevel === "中" ? "8k-2万" : "3k-8k",
    budgetLevel,
    message: "希望了解项目效果、恢复期和价格。",
    source,
    sourceContent,
    status,
    psychologyType,
    psychologyTags: ["效果关注", "价格敏感", "安全优先", "口碑驱动"].slice(0, (index % 4) + 1),
    customerTier,
    notes: `客户偏好：${service1}，关注点：${psychologyType}`,
  };
};

async function seedCustomers() {
  const count = Number(process.env.SEED_CUSTOMERS_COUNT || DEFAULT_COUNT);
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL 未配置，无法写入数据");
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { idle_timeout: 5 });

  try {
    const leads: LeadSeed[] = Array.from({ length: count }, (_, i) => buildLead(i + 1));

    await sql.begin(async tx => {
      for (const lead of leads) {
        await tx`
          insert into leads
            (name, phone, wechat, age, interested_services, budget, budget_level, message, source, source_content, status, psychology_type, psychology_tags, customer_tier, notes)
          values
            (${lead.name},
             ${lead.phone},
             ${lead.wechat ?? null},
             ${lead.age ?? null},
             ${lead.interestedServices ? JSON.stringify(lead.interestedServices) : null},
             ${lead.budget ?? null},
             ${lead.budgetLevel ?? null},
             ${lead.message ?? null},
             ${lead.source},
             ${lead.sourceContent ?? null},
             ${lead.status ?? null},
             ${lead.psychologyType ?? null},
             ${lead.psychologyTags ? JSON.stringify(lead.psychologyTags) : null},
             ${lead.customerTier ?? null},
             ${lead.notes ?? null})
        `;
      }
    });

    console.log(`✅ 已生成 ${count} 条客户数据`);
  } catch (error) {
    console.error("❌ 生成客户数据失败:", error);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

seedCustomers();
