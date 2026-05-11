/**
 * 测试脚本：向数据库插入按钮内容
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { websiteContent as websiteContentTable } from "./drizzle/schema";

// 使用环境变量中的数据库URL
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set in environment variables");
  process.exit(1);
}

async function insertButtonContent() {
  try {
    // 创建数据库连接
    const client = postgres(connectionString);
    const db = drizzle(client);

    // 插入首页按钮内容
    const homeButtons = [
      {
        pageKey: "home",
        sectionKey: "button_consultation",
        contentType: "button",
        title: "在线咨询按钮",
        content: "在线咨询",
        linkText: "在线咨询",
        sortOrder: 1,
        isActive: 1,
      },
      {
        pageKey: "home",
        sectionKey: "button_knowledge",
        contentType: "button",
        title: "知识库按钮",
        content: "知识库",
        linkText: "知识库",
        sortOrder: 2,
        isActive: 1,
      },
      {
        pageKey: "home",
        sectionKey: "button_free-consultation",
        contentType: "button",
        title: "免费面诊咨询按钮",
        content: "免费面诊咨询",
        linkText: "免费面诊咨询",
        sortOrder: 3,
        isActive: 1,
      },
      {
        pageKey: "home",
        sectionKey: "button_smart-booking",
        contentType: "button",
        title: "智能预约按钮",
        content: "智能预约",
        linkText: "智能预约",
        sortOrder: 4,
        isActive: 1,
      },
      {
        pageKey: "home",
        sectionKey: "button_ai-consultation",
        contentType: "button",
        title: "AI咨询按钮",
        content: "AI咨询",
        linkText: "AI咨询",
        sortOrder: 5,
        isActive: 1,
      },
      {
        pageKey: "home",
        sectionKey: "button_next-step-demand-analysis",
        contentType: "button",
        title: "下一步需求分析按钮",
        content: "下一步：分析需求",
        linkText: "下一步：分析需求",
        sortOrder: 6,
        isActive: 1,
      },
      {
        pageKey: "home",
        sectionKey: "button_ai-recommendation",
        contentType: "button",
        title: "AI推荐项目按钮",
        content: "AI智能推荐项目",
        linkText: "AI智能推荐项目",
        sortOrder: 7,
        isActive: 1,
      },
      {
        pageKey: "home",
        sectionKey: "button_previous-step",
        contentType: "button",
        title: "上一步按钮",
        content: "上一步",
        linkText: "上一步",
        sortOrder: 8,
        isActive: 1,
      },
      {
        pageKey: "home",
        sectionKey: "button_next-step-select-time",
        contentType: "button",
        title: "下一步选择时间按钮",
        content: "下一步：选择时间",
        linkText: "下一步：选择时间",
        sortOrder: 9,
        isActive: 1,
      },
      {
        pageKey: "home",
        sectionKey: "button_confirm-booking",
        contentType: "button",
        title: "确认预约按钮",
        content: "确认预约",
        linkText: "确认预约",
        sortOrder: 10,
        isActive: 1,
      },
    ];

    // 插入聊天页面按钮内容
    const chatButtons = [
      {
        pageKey: "chat",
        sectionKey: "button_back-to-home",
        contentType: "button",
        title: "返回前台按钮",
        content: "返回前台",
        linkText: "返回前台",
        sortOrder: 1,
        isActive: 1,
      },
      {
        pageKey: "chat",
        sectionKey: "button_admin-panel",
        contentType: "button",
        title: "后台管理按钮",
        content: "后台管理",
        linkText: "后台管理",
        sortOrder: 2,
        isActive: 1,
      },
      {
        pageKey: "chat",
        sectionKey: "button_data-assistant",
        contentType: "button",
        title: "数据助手按钮",
        content: "数据助手",
        linkText: "数据助手",
        sortOrder: 3,
        isActive: 1,
      },
      {
        pageKey: "chat",
        sectionKey: "button_free-consultation",
        contentType: "button",
        title: "免费咨询按钮",
        content: "💝 免费咨询，专业顾问1对1服务",
        linkText: "💝 免费咨询，专业顾问1对1服务",
        sortOrder: 4,
        isActive: 1,
      },
      {
        pageKey: "chat",
        sectionKey: "button_submit-lead",
        contentType: "button",
        title: "提交线索按钮",
        content: "提交",
        linkText: "提交",
        sortOrder: 5,
        isActive: 1,
      },
    ];

    // 插入内容管理页面按钮内容
    const contentButtons = [
      {
        pageKey: "dashboard-content",
        sectionKey: "button_add-keyword",
        contentType: "button",
        title: "添加关键词按钮",
        content: "+",
        linkText: "+",
        sortOrder: 1,
        isActive: 1,
      },
      {
        pageKey: "dashboard-content",
        sectionKey: "button_generate-content",
        contentType: "button",
        title: "生成内容按钮",
        content: "一键生成爽文",
        linkText: "一键生成爽文",
        sortOrder: 2,
        isActive: 1,
      },
      {
        pageKey: "dashboard-content",
        sectionKey: "button_generate-image",
        contentType: "button",
        title: "生成配图按钮",
        content: "生成配图",
        linkText: "生成配图",
        sortOrder: 3,
        isActive: 1,
      },
      {
        pageKey: "dashboard-content",
        sectionKey: "button_copy-all",
        contentType: "button",
        title: "复制全部按钮",
        content: "复制全部",
        linkText: "复制全部",
        sortOrder: 4,
        isActive: 1,
      },
      {
        pageKey: "dashboard-content",
        sectionKey: "button_regenerate",
        contentType: "button",
        title: "重新生成按钮",
        content: "重新生成",
        linkText: "重新生成",
        sortOrder: 5,
        isActive: 1,
      },
    ];

    // 合并所有按钮内容
    const allButtons = [...homeButtons, ...chatButtons, ...contentButtons];

    // 插入到数据库
    for (const button of allButtons) {
      try {
        // 检查是否已存在相同键的记录
        const existing = await db
          .select()
          .from(websiteContentTable)
          .where(
            sql`${websiteContentTable.sectionKey} = ${button.sectionKey} AND ${websiteContentTable.pageKey} = ${button.pageKey}`
          )
          .limit(1);

        if (existing.length === 0) {
          // 如果不存在，则插入新记录
          await db.insert(websiteContentTable).values(button);
          console.log(`Inserted button content: ${button.sectionKey} for page ${button.pageKey}`);
        } else {
          // 如果已存在，则更新记录
          await db
            .update(websiteContentTable)
            .set(button)
            .where(
              sql`${websiteContentTable.sectionKey} = ${button.sectionKey} AND ${websiteContentTable.pageKey} = ${button.pageKey}`
            );
          console.log(`Updated button content: ${button.sectionKey} for page ${button.pageKey}`);
        }
      } catch (error) {
        console.error(`Error inserting/updating button content for ${button.sectionKey}:`, error);
      }
    }

    console.log("Button content insertion/update completed!");
    client.end();
  } catch (error) {
    console.error("Error connecting to database:", error);
    process.exit(1);
  }
}

// 运行函数
insertButtonContent();