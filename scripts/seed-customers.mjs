import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { leads } from "../drizzle/schema.ts";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// 姓氏和名字库
const surnames = ["王", "李", "张", "刘", "陈", "杨", "黄", "赵", "吴", "周", "徐", "孙", "马", "朱", "胡", "郭", "何", "林", "高", "罗"];
const givenNames = ["婷", "娜", "丽", "芳", "静", "敏", "莉", "雪", "梅", "玲", "欣", "慧", "洁", "琳", "颖", "萍", "红", "艳", "霞", "倩", "蕾", "薇", "菲", "佳", "晨"];

// 渠道来源
const sources = [
  { name: "小红书", weight: 30 },
  { name: "抖音", weight: 25 },
  { name: "微信朋友圈", weight: 15 },
  { name: "线下门店", weight: 10 },
  { name: "老客转介绍", weight: 10 },
  { name: "百度搜索", weight: 5 },
  { name: "美团点评", weight: 5 },
];

// 年龄段配置
const ageGroups = [
  { range: [18, 25], label: "学生/职场新人", weight: 25 },
  { range: [26, 35], label: "都市白领/新手妈妈", weight: 40 },
  { range: [36, 45], label: "中产精英/企业高管", weight: 25 },
  { range: [46, 55], label: "成熟女性/事业有成", weight: 10 },
];

// 心理类型
const psychologyTypes = [
  {
    type: "恐惧型",
    tags: ["怕老", "怕丑", "怕被比下去", "焦虑衰老", "担心形象"],
    concerns: ["效果持久性", "会不会反弹", "恢复期", "副作用"],
    weight: 30,
  },
  {
    type: "贪婪型",
    tags: ["追求极致", "性价比", "效果最大化", "优惠敏感"],
    concerns: ["价格", "套餐优惠", "效果对比", "性价比"],
    weight: 25,
  },
  {
    type: "安全型",
    tags: ["注重风险", "要权威认证", "谨慎决策", "医生资质"],
    concerns: ["安全性", "资质认证", "案例数量", "医生经验"],
    weight: 25,
  },
  {
    type: "敏感型",
    tags: ["在意评价", "社交压力", "从众心理", "朋友推荐"],
    concerns: ["口碑", "朋友体验", "网红推荐", "评价好坏"],
    weight: 20,
  },
];

// 消费能力
const budgetLevels = [
  { level: "低", range: [2000, 5000], label: "学生党/预算有限", weight: 20 },
  { level: "中", range: [5000, 15000], label: "工薪阶层/理性消费", weight: 50 },
  { level: "高", range: [15000, 50000], label: "高收入/追求品质", weight: 30 },
];

// 兴趣项目
const projects = [
  "超皮秒祛斑",
  "水光针",
  "热玛吉",
  "冷光美白",
  "隐形矫正",
  "玻尿酸填充",
  "肉毒素瘦脸",
  "光子嫩肤",
];

// 客户状态
const statuses = [
  { status: "new", label: "新客户", weight: 30 },
  { status: "contacted", label: "已联系", weight: 25 },
  { status: "interested", label: "有意向", weight: 20 },
  { status: "quoted", label: "已报价", weight: 15 },
  { status: "converted", label: "已成交", weight: 10 },
];

// 加权随机选择
function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) {
      return item;
    }
  }
  
  return items[items.length - 1];
}

// 生成随机手机号
function generatePhone() {
  const prefixes = ["138", "139", "158", "159", "188", "189"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, "0");
  return prefix + suffix;
}

// 生成随机微信号
function generateWechat(name) {
  const patterns = [
    `${name}_${Math.floor(Math.random() * 9999)}`,
    `${name}${Math.floor(Math.random() * 999)}`,
    `wx_${name}_${Math.floor(Math.random() * 99)}`,
  ];
  return patterns[Math.floor(Math.random() * patterns.length)];
}

// 生成客户备注
function generateNotes(psychologyType, ageGroup, source) {
  const notes = [
    `通过${source.name}了解到我们`,
    `${ageGroup.label}，${psychologyType.type}`,
    `主要关注：${psychologyType.concerns.slice(0, 2).join("、")}`,
  ];
  return notes.join("；");
}

// 生成100位客户数据
function generateCustomers(count = 100) {
  const customers = [];
  
  for (let i = 0; i < count; i++) {
    // 随机选择姓名
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];
    const name = surname + givenName;
    
    // 随机选择年龄段
    const ageGroup = weightedRandom(ageGroups);
    const age = Math.floor(Math.random() * (ageGroup.range[1] - ageGroup.range[0] + 1)) + ageGroup.range[0];
    
    // 随机选择心理类型
    const psychologyType = weightedRandom(psychologyTypes);
    
    // 随机选择消费能力
    const budgetLevel = weightedRandom(budgetLevels);
    const budget = Math.floor(Math.random() * (budgetLevel.range[1] - budgetLevel.range[0] + 1)) + budgetLevel.range[0];
    
    // 随机选择渠道来源
    const source = weightedRandom(sources);
    
    // 随机选择兴趣项目（1-3个）
    const projectCount = Math.floor(Math.random() * 3) + 1;
    const interestedProjects = [];
    const shuffledProjects = [...projects].sort(() => Math.random() - 0.5);
    for (let j = 0; j < projectCount; j++) {
      interestedProjects.push(shuffledProjects[j]);
    }
    
    // 随机选择客户状态
    const status = weightedRandom(statuses);
    
    // 计算客户分层（基于消费能力和心理类型）
    let customerTier;
    if (budgetLevel.level === "高" && (psychologyType.type === "贪婪型" || psychologyType.type === "敏感型")) {
      customerTier = "A"; // 高消费 + 容易被影响 = A级
    } else if (budgetLevel.level === "高" || (budgetLevel.level === "中" && psychologyType.type !== "安全型")) {
      customerTier = "B"; // 高消费或中消费且非安全型 = B级
    } else if (budgetLevel.level === "中" || (budgetLevel.level === "低" && psychologyType.type === "贪婪型")) {
      customerTier = "C"; // 中消费或低消费但贪婪型 = C级
    } else {
      customerTier = "D"; // 其他 = D级
    }
    
    // 生成客户数据
    const customer = {
      name,
      phone: generatePhone(),
      wechat: generateWechat(name),
      age,
      source: source.name,
      interestedServices: JSON.stringify(interestedProjects),
      budget: budget.toString(),
      psychologyType: psychologyType.type,
      psychologyTags: JSON.stringify(psychologyType.tags.slice(0, 3)),
      budgetLevel: budgetLevel.level,
      customerTier,
      status: status.status,
      notes: generateNotes(psychologyType, ageGroup, source),
      followUpDate: new Date(Date.now() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
    };
    
    customers.push(customer);
  }
  
  return customers;
}

// 主函数
async function main() {
  console.log("开始生成客户数据...");
  
  const customers = generateCustomers(100);
  
  console.log(`\n生成了 ${customers.length} 位客户数据`);
  console.log("\n数据统计：");
  
  // 统计渠道分布
  const sourceStats = {};
  customers.forEach(c => {
    sourceStats[c.source] = (sourceStats[c.source] || 0) + 1;
  });
  console.log("\n渠道分布：");
  Object.entries(sourceStats).forEach(([source, count]) => {
    console.log(`  ${source}: ${count}人`);
  });
  
  // 统计年龄分布
  const ageStats = {
    "18-25岁": 0,
    "26-35岁": 0,
    "36-45岁": 0,
    "46-55岁": 0,
  };
  customers.forEach(c => {
    if (c.age >= 18 && c.age <= 25) ageStats["18-25岁"]++;
    else if (c.age >= 26 && c.age <= 35) ageStats["26-35岁"]++;
    else if (c.age >= 36 && c.age <= 45) ageStats["36-45岁"]++;
    else if (c.age >= 46 && c.age <= 55) ageStats["46-55岁"]++;
  });
  console.log("\n年龄分布：");
  Object.entries(ageStats).forEach(([range, count]) => {
    console.log(`  ${range}: ${count}人`);
  });
  
  // 统计心理类型分布
  const psychologyStats = {};
  customers.forEach(c => {
    psychologyStats[c.psychologyType] = (psychologyStats[c.psychologyType] || 0) + 1;
  });
  console.log("\n心理类型分布：");
  Object.entries(psychologyStats).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}人`);
  });
  
  // 统计消费能力分布
  const budgetStats = {};
  customers.forEach(c => {
    budgetStats[c.budgetLevel] = (budgetStats[c.budgetLevel] || 0) + 1;
  });
  console.log("\n消费能力分布：");
  Object.entries(budgetStats).forEach(([level, count]) => {
    console.log(`  ${level}: ${count}人`);
  });
  
  // 导入数据库
  console.log("\n开始导入数据库...");
  
  for (const customer of customers) {
    await db.insert(leads).values(customer);
  }
  
  console.log("\n✅ 客户数据导入完成！");
  
  await connection.end();
}

main().catch(console.error);
