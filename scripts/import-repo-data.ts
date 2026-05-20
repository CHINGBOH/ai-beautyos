import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import postgres from "postgres";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const DATA_DIR = join(process.cwd(), "data");
const DEFAULT_LEAD_COUNT = 200;
const MARKDOWN_EXCLUDE_DIRS = new Set([
  ".git",
  ".pnpm-store",
  "dist",
  "node_modules",
  ".pytest_cache",
]);

type Sql = ReturnType<typeof postgres>;
type JsonRow = Record<string, unknown>;

async function readRows(fileName: string): Promise<JsonRow[]> {
  try {
    const content = await readFile(join(DATA_DIR, fileName), "utf8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ENOENT")) return [];
    throw error;
  }
}

async function countRows(sql: Sql, table: string): Promise<number> {
  const rows = await sql.unsafe(`select count(*)::int as count from ${table}`);
  return rows[0]?.count ?? 0;
}

async function findMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".github") {
      continue;
    }

    const fullPath = join(dir, entry.name);
    const relativePath = relative(process.cwd(), fullPath);
    const parts = relativePath.split("/");
    if (parts.some(part => MARKDOWN_EXCLUDE_DIRS.has(part))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...await findMarkdownFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

function markdownCategory(relativePath: string): string {
  if (relativePath.startsWith("docs/architecture/")) return "架构文档";
  if (relativePath.startsWith("docs/deployment/")) return "部署文档";
  if (relativePath.startsWith("docs/")) return "项目文档";
  if (relativePath.startsWith("config/")) return "配置文档";
  if (/BUSINESS|PRODUCT|SAAS|ROADMAP|POSITIONING|MODEL/.test(relativePath)) return "业务资料";
  if (/README|USAGE|SCREENSHOT|DEMO/.test(relativePath)) return "使用说明";
  return "仓库文档";
}

function markdownTitle(relativePath: string, content: string): string {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = heading ? `${relativePath}: ${heading}` : relativePath;
  return title.length > 255 ? title.slice(0, 252) + "..." : title;
}

function markdownSummary(content: string): string {
  const cleaned = content
    .replace(/^```[\s\S]*?```/gm, "")
    .replace(/^#+\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("|") && !line.startsWith("---"))
    .join(" ");
  return cleaned.slice(0, 500);
}

async function importMarkdownDocuments(sql: Sql): Promise<number> {
  const files = await findMarkdownFiles(process.cwd());
  let imported = 0;
  for (const filePath of files) {
    const relativePath = relative(process.cwd(), filePath);
    if (relativePath === "server/.pytest_cache/README.md") continue;

    const content = (await readFile(filePath, "utf8")).trim();
    if (content.length < 120) continue;

    const title = markdownTitle(relativePath, content);
    const existing = await sql`
      select id from knowledge_base
      where module = 'repo_docs' and title = ${title}
      limit 1
    `;
    if (existing.length > 0) continue;

    await sql`
      insert into knowledge_base (
        title, summary, content, category, module, type, tags, is_active,
        view_count, used_count, credibility, difficulty, level, "order", sources, tenant_id
      )
      values (
        ${title},
        ${markdownSummary(content)},
        ${content.slice(0, 50000)},
        ${markdownCategory(relativePath)},
        'repo_docs',
        'internal',
        ${relativePath},
        1,
        0,
        0,
        6,
        'intermediate',
        1,
        ${10000 + imported},
        ${JSON.stringify([{ type: "markdown", path: relativePath }])},
        ${DEFAULT_TENANT_ID}
      )
    `;
    imported++;
  }
  return imported;
}

async function importSystemConfig(sql: Sql): Promise<number> {
  const rows = await readRows("system_config.json");
  let imported = 0;
  for (const row of rows) {
    if (!row.config_key) continue;
    await sql`
      insert into system_config (config_key, config_value, description, is_active, created_at, updated_at)
      values (
        ${row.config_key as string},
        ${row.config_value as string | null},
        ${row.description as string | null},
        ${Number(row.is_active ?? 1)},
        ${String(row.created_at ?? new Date().toISOString())},
        ${String(row.updated_at ?? new Date().toISOString())}
      )
      on conflict (config_key) do update set
        config_value = excluded.config_value,
        description = excluded.description,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at
    `;
    imported++;
  }
  return imported;
}

async function importKnowledge(sql: Sql): Promise<number> {
  const rows = await readRows("knowledge_base.json");
  let imported = 0;
  for (const row of rows) {
    const title = String(row.title ?? "").trim();
    if (!title || !row.content || !row.category) continue;
    const module = String(row.module ?? "skin_care");
    const existing = await sql`
      select id from knowledge_base
      where title = ${title} and module = ${module}
      limit 1
    `;
    if (existing.length > 0) continue;

    await sql`
      insert into knowledge_base (
        title, content, category, module, tags, quality_score, is_active, used_count,
        positive_evidence, negative_evidence, created_at, updated_at, tenant_id
      )
      values (
        ${title},
        ${String(row.content)},
        ${String(row.category)},
        ${module},
        ${row.tags as string | null},
        ${String(row.quality_score ?? "0.00")},
        ${Number(row.is_active ?? 1)},
        ${Number(row.used_count ?? 0)},
        ${row.positive_evidence as string | null},
        ${row.negative_evidence as string | null},
        ${String(row.created_at ?? new Date().toISOString())},
        ${String(row.updated_at ?? new Date().toISOString())},
        ${String(row.tenant_id ?? DEFAULT_TENANT_ID)}
      )
    `;
    imported++;
  }
  return imported;
}

async function importConversations(sql: Sql): Promise<Map<number, number>> {
  const rows = await readRows("conversations.json");
  const idMap = new Map<number, number>();
  for (const row of rows) {
    const oldId = Number(row.id);
    const sessionId = String(row.session_id ?? "");
    if (!oldId || !sessionId) continue;
    const inserted = await sql`
      insert into conversations (
        session_id, visitor_name, visitor_phone, visitor_wechat, source, status,
        lead_id, psychology_type, psychology_tags, budget_level, customer_tier,
        created_at, updated_at, tenant_id
      )
      values (
        ${sessionId},
        ${row.visitor_name as string | null},
        ${row.visitor_phone as string | null},
        ${row.visitor_wechat as string | null},
        ${String(row.source ?? "web")},
        ${String(row.status ?? "active")},
        ${row.lead_id as string | null},
        ${row.psychology_type as string | null},
        ${row.psychology_tags as string | null},
        ${row.budget_level as string | null},
        ${row.customer_tier as string | null},
        ${String(row.created_at ?? new Date().toISOString())},
        ${String(row.updated_at ?? new Date().toISOString())},
        ${String(row.tenant_id ?? DEFAULT_TENANT_ID)}
      )
      on conflict (session_id) do update set
        updated_at = excluded.updated_at
      returning id
    `;
    idMap.set(oldId, inserted[0].id);
  }
  return idMap;
}

async function importMessages(sql: Sql, conversationIdMap: Map<number, number>): Promise<number> {
  const rows = await readRows("messages.json");
  let imported = 0;
  for (const row of rows) {
    const oldConversationId = Number(row.conversation_id);
    const conversationId = conversationIdMap.get(oldConversationId) ?? oldConversationId;
    if (!conversationId || !row.role || !row.content) continue;

    const inserted = await sql`
      insert into messages (conversation_id, role, content, knowledge_used, extracted_info, created_at, tenant_id)
      select
        ${conversationId},
        ${String(row.role)},
        ${String(row.content)},
        ${row.knowledge_used as string | null},
        ${row.extracted_info as string | null},
        ${String(row.created_at ?? new Date().toISOString())},
        ${String(row.tenant_id ?? DEFAULT_TENANT_ID)}
      where not exists (
        select 1 from messages
        where conversation_id = ${conversationId}
          and role = ${String(row.role)}
          and content = ${String(row.content)}
          and created_at = ${String(row.created_at ?? new Date().toISOString())}
      )
      returning id
    `;
    imported += inserted.length;
  }
  return imported;
}

const medicalProjects = [
  ["超皮秒祛斑", "超皮秒祛斑", "laser", "利用超短脉冲激光精准击碎黑色素，有效祛除雀斑、晒斑、老年斑等各类色斑", "3000-8000元/次", "3-5天", ["皮秒", "祛斑", "雀斑", "晒斑", "激光", "色素", "淡斑"]],
  ["热玛吉", "热玛吉射频紧肤", "laser", "利用单极射频技术加热真皮层，刺激胶原蛋白再生，达到紧肤除皱效果", "15000-30000元/次", "无恢复期", ["热玛吉", "射频", "紧肤", "抗衰", "除皱", "提升", "胶原"]],
  ["水光针", "水光针补水", "injection", "将玻尿酸等营养成分直接注入真皮层，达到深层补水、改善细纹的效果", "1000-3000元/次", "1-2天", ["水光针", "补水", "玻尿酸", "保湿", "细纹", "水润"]],
  ["光子嫩肤", "光子嫩肤", "laser", "利用强脉冲光改善肤色不均、红血丝、毛孔粗大等肌肤问题", "800-2000元/次", "无恢复期", ["光子", "嫩肤", "美白", "红血丝", "毛孔", "肤色"]],
  ["冷光美白", "冷光牙齿美白", "skincare", "使用冷光技术配合美白剂，快速美白牙齿，效果显著", "2000-5000元/次", "无恢复期", ["美白", "牙齿", "冷光", "洁白", "齿科", "笑容"]],
  ["隐形矫正", "隐形牙齿矫正", "surgery", "使用透明牙套进行牙齿矫正，美观舒适，不影响日常生活", "20000-50000元/套", "无恢复期", ["矫正", "牙齿", "隐形", "牙套", "整齐", "口腔"]],
  ["肉毒素", "肉毒素除皱", "injection", "注射肉毒素放松面部肌肉，消除动态皱纹，如鱼尾纹、抬头纹等", "500-2000元/部位", "无恢复期", ["肉毒素", "除皱", "鱼尾纹", "抬头纹", "瘦脸", "抗衰"]],
  ["玻尿酸填充", "玻尿酸填充", "injection", "注射玻尿酸填充面部凹陷部位，如法令纹、太阳穴、下巴等", "2000-10000元/部位", "3-7天", ["玻尿酸", "填充", "法令纹", "太阳穴", "下巴", "塑形"]],
] as const;

async function seedMedicalProjectsIfEmpty(sql: Sql): Promise<number> {
  if (await countRows(sql, "medical_projects") > 0) return 0;
  let imported = 0;
  for (const [name, displayName, category, description, priceRange, recoveryTime, keywords] of medicalProjects) {
    await sql`
      insert into medical_projects (
        name, display_name, category, description, price_range, recovery_time,
        keywords, is_active, sort_order, tenant_id
      )
      values (
        ${name}, ${displayName}, ${category}, ${description}, ${priceRange}, ${recoveryTime},
        ${JSON.stringify(keywords)}, 1, ${imported + 1}, ${DEFAULT_TENANT_ID}
      )
    `;
    imported++;
  }
  return imported;
}

const surnames = ["张", "王", "李", "赵", "陈", "刘", "杨", "黄", "吴", "周", "徐", "孙", "马", "朱", "胡", "郭", "何", "高", "林", "郑"];
const givenNames = ["小雅", "欣怡", "子涵", "若曦", "雨桐", "梦琪", "诗涵", "佳怡", "一诺", "静怡", "宇轩", "子墨", "子豪", "浩然", "思远", "俊杰", "天宇", "梓涵", "雨辰", "明轩"];
const services = ["超皮秒祛斑", "水光针", "热玛吉", "光子嫩肤", "玻尿酸填充", "瘦脸针", "黄金微针", "隆鼻", "双眼皮", "皮秒美白", "祛痘修复", "抗衰紧致"];
const sources = ["官网落地页", "小红书", "抖音", "朋友圈", "老客转介绍", "百度搜索", "门店活动", "预约表单", "chat"];
const sourceContents = ["短视频引流", "图文种草", "直播咨询", "预约表单", "好友推荐", "关键词广告"];
const statuses = ["new", "contacted", "interested", "quoted", "converted"] as const;
const tiers = ["A", "B", "C", "D"] as const;
const psychologies = ["恐惧型", "贪婪型", "安全型", "敏感型"] as const;
const budgets = ["低", "中", "高"] as const;
const hoods = ["南山科技园", "福田CBD", "罗湖东门", "宝安西乡", "龙华民治", "龙岗坂田", "蛇口", "后海", "前海", "华侨城", "香蜜湖", "车公庙", "华强北", "布吉", "南头", "新安", "福永", "沙井", "光明", "坪山"];
const holidayOptions = ["春节", "生日", "纪念日", "情人节", "妇女节", "母亲节", "父亲节", "国庆节", "圣诞节"];

function pick<T>(list: readonly T[], index: number): T {
  return list[index % list.length];
}

function phone(seed: number): string {
  const prefix = pick(["130", "131", "132", "155", "156", "157", "158", "186", "187", "188"], seed);
  const middle = String(1000 + ((seed * 37) % 8999)).padStart(4, "0");
  const last = String(1000 + ((seed * 91) % 8999)).padStart(4, "0");
  return `${prefix}${middle}${last}`;
}

async function seedLeadsIfEmpty(sql: Sql): Promise<number> {
  if (await countRows(sql, "leads") > 0) return 0;
  const count = Number(process.env.REPO_SEED_LEADS_COUNT || DEFAULT_LEAD_COUNT);
  for (let i = 1; i <= count; i++) {
    const budgetLevel = pick(budgets, i);
    const service1 = pick(services, i);
    const service2 = pick(services, i + 3);
    const holidayCount = (i % 3) + 1;
    const holidays = Array.from({ length: holidayCount }, (_, index) => pick(holidayOptions, i + index * 11));
    await sql`
      insert into leads (
        name, phone, wechat, age, hood, birthday, important_holidays,
        interested_services, budget, budget_level, message, source, source_content,
        status, psychology_type, psychology_tags, customer_tier, notes, tenant_id
      )
      values (
        ${`${pick(surnames, i)}${pick(givenNames, i + 7)}`},
        ${phone(i)},
        ${`wx_${String(i).padStart(4, "0")}`},
        ${19 + (i % 37)},
        ${pick(hoods, i + 8)},
        ${i % 5 === 0 ? null : `2000-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}T00:00:00.000Z`},
        ${i % 4 === 0 ? null : [...new Set(holidays)].join(",")},
        ${JSON.stringify([service1, service2].filter((service, index, array) => array.indexOf(service) === index))},
        ${budgetLevel === "高" ? "2万以上" : budgetLevel === "中" ? "8k-2万" : "3k-8k"},
        ${budgetLevel},
        ${"希望了解项目效果、恢复期和价格。"},
        ${pick(sources, i + 4)},
        ${pick(sourceContents, i + 5)},
        ${pick(statuses, i + 6)},
        ${pick(psychologies, i + 2)},
        ${JSON.stringify(["效果关注", "价格敏感", "安全优先", "口碑驱动"].slice(0, (i % 4) + 1))},
        ${pick(tiers, i + 1)},
        ${`客户偏好：${service1}，关注点：${pick(psychologies, i + 2)}`},
        ${DEFAULT_TENANT_ID}
      )
    `;
  }
  return count;
}

async function seedTriggersIfEmpty(sql: Sql): Promise<number> {
  if (await countRows(sql, "triggers") > 0) return 0;
  const rows = [
    ["本月生日客户跟进", "birthday_reminder", JSON.stringify({ daysAhead: 3 }), null, null, "create_task"],
    ["春节节日营销提醒", "holiday_reminder", JSON.stringify({ holidayNames: ["春节", "生日", "纪念日"] }), null, null, "follow_up"],
    ["新留资 24 小时内触达", "behavior", null, JSON.stringify({ event: "new_lead", delayHours: 24 }), null, "create_task"],
    ["高温天防晒项目推荐", "weather", null, null, JSON.stringify({ condition: "hot", tempMin: 35 }), "follow_up"],
  ] as const;
  for (const [name, type, timeConfig, behaviorConfig, weatherConfig, action] of rows) {
    await sql`
      insert into triggers (
        name, type, time_config, behavior_config, weather_config,
        action, action_config, is_active, execution_count, tenant_id
      )
      values (
        ${name}, ${type}, ${timeConfig}, ${behaviorConfig}, ${weatherConfig},
        ${action}, ${JSON.stringify({ type: action })}, 1, 0, ${DEFAULT_TENANT_ID}
      )
    `;
  }
  return rows.length;
}

async function seedXiaohongshuIfEmpty(sql: Sql): Promise<number> {
  if (await countRows(sql, "xiaohongshu_posts") > 0) return 0;
  const contentTypes = ["project", "case", "price", "guide", "holiday", "new_product"] as const;
  for (let i = 0; i < 12; i++) {
    const project = pick(services, i);
    const status = pick(["draft", "scheduled", "published"] as const, i);
    await sql`
      insert into xiaohongshu_posts (
        title, content, content_type, project, status,
        view_count, like_count, comment_count, share_count, collect_count, tenant_id
      )
      values (
        ${`【医美种草】${project}${["体验分享", "效果对比", "价格参考", "避坑指南"][i % 4]}`},
        ${`这是一条仓库种子内容，用于 dashboard 内容运营展示。项目：${project}。`},
        ${pick(contentTypes, i)},
        ${project},
        ${status},
        ${status === "published" ? 1000 + i * 100 : 0},
        ${status === "published" ? 50 + i * 5 : 0},
        ${status === "published" ? 10 + i : 0},
        0,
        0,
        ${DEFAULT_TENANT_ID}
      )
    `;
  }
  return 12;
}

async function seedWeworkIfEmpty(sql: Sql): Promise<number> {
  const contactCount = await countRows(sql, "wework_contact_way");
  const customerCount = await countRows(sql, "wework_customers");
  let inserted = 0;

  if (contactCount === 0) {
    for (let i = 1; i <= 6; i++) {
      await sql`
        insert into wework_contact_way (
          config_id, type, scene, remark, skip_verify, is_active, tenant_id
        )
        values (
          ${`repo-cw-${i}`}, ${i % 2 === 0 ? "multi" : "single"}, ${i % 2 === 0 ? "2" : "1"},
          ${`仓库渠道${i}`}, 1, 1, ${DEFAULT_TENANT_ID}
        )
        on conflict (config_id) do nothing
      `;
      inserted++;
    }
  }

  if (customerCount === 0) {
    for (let i = 1; i <= 12; i++) {
      await sql`
        insert into wework_customers (
          external_user_id, name, type, gender, remark, create_time, tenant_id
        )
        values (
          ${`repo-wx-customer-${i}`}, ${`企微客户${i}`}, '1', ${i % 2 === 0 ? "2" : "1"},
          ${`仓库客户${i}`}, ${new Date(Date.now() - i * 86400000).toISOString()}, ${DEFAULT_TENANT_ID}
        )
        on conflict (external_user_id) do nothing
      `;
      inserted++;
    }
  }

  return inserted;
}

async function importRepoData(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  const sql = postgres(databaseUrl, { max: 1, idle_timeout: 5 });
  try {
    const results: Record<string, number> = {};
    results.system_config = await importSystemConfig(sql);
    results.knowledge_base = await importKnowledge(sql);
    results.repo_markdown = await importMarkdownDocuments(sql);
    const conversationMap = await importConversations(sql);
    results.conversations = conversationMap.size;
    results.messages = await importMessages(sql, conversationMap);
    results.medical_projects = await seedMedicalProjectsIfEmpty(sql);
    results.leads = await seedLeadsIfEmpty(sql);
    results.triggers = await seedTriggersIfEmpty(sql);
    results.xiaohongshu_posts = await seedXiaohongshuIfEmpty(sql);
    results.wework = await seedWeworkIfEmpty(sql);

    await sql`
      select setval(pg_get_serial_sequence('knowledge_base','id'), coalesce((select max(id) from knowledge_base), 1), true)
    `;
    await sql`
      select setval(pg_get_serial_sequence('conversations','id'), coalesce((select max(id) from conversations), 1), true)
    `;
    await sql`
      select setval(pg_get_serial_sequence('messages','id'), coalesce((select max(id) from messages), 1), true)
    `;

    console.table(results);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

importRepoData().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
