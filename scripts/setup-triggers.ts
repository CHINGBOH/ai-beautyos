#!/usr/bin/env tsx

/**
 * 设置自动化触发器脚本
 * 包括生日提醒、回访提醒、行为触发等
 */

import "dotenv/config";
import { getDb } from "../server/db";
import { triggers } from "../drizzle/schema";
import { logger } from "../server/_core/logger";

interface TriggerConfig {
  name: string;
  description: string;
  type: "time" | "behavior" | "weather";
  timeConfig?: any;
  behaviorConfig?: any;
  weatherConfig?: any;
  action: string;
  actionConfig: any;
  targetFilter?: any;
}

class TriggerSetup {
  private defaultTriggers: TriggerConfig[] = [
    // 1. 生日提醒触发器
    {
      name: "客户生日提醒",
      description: "在客户生日前3天发送祝福和优惠券",
      type: "time",
      timeConfig: {
        type: "birthday",
        daysBefore: 3,
        time: "10:00",
        repeat: "yearly"
      },
      action: "send_message",
      actionConfig: {
        template: "birthday_greeting",
        channel: "wechat",
        content: "亲爱的{name}，祝您生日快乐！为您准备了一份专属生日礼包，包含{优惠内容}。期待为您服务！",
        coupon: "BIRTHDAY2024"
      },
      targetFilter: {
        customerTier: ["A", "B", "C"],
        lastVisitDays: 90 // 最近90天内到店的客户
      }
    },

    // 2. 7天回访提醒
    {
      name: "7天回访提醒",
      description: "客户到店7天后进行回访，了解效果和满意度",
      type: "time",
      timeConfig: {
        type: "follow_up",
        daysAfter: 7,
        time: "14:00",
        repeat: "once"
      },
      action: "send_message",
      actionConfig: {
        template: "follow_up_7days",
        channel: "wechat",
        content: "亲爱的{name}，您做完{project}已经7天了，现在感觉怎么样？有什么问题可以随时咨询我们哦！",
        questions: ["效果满意吗？", "有没有不适感？", "需要预约复查吗？"]
      },
      targetFilter: {
        status: "converted",
        projectTypes: ["超皮秒", "热玛吉", "水光针"]
      }
    },

    // 3. 30天效果跟进
    {
      name: "30天效果跟进",
      description: "治疗30天后跟进效果，推荐维护方案",
      type: "time",
      timeConfig: {
        type: "follow_up",
        daysAfter: 30,
        time: "15:00",
        repeat: "once"
      },
      action: "send_message",
      actionConfig: {
        template: "follow_up_30days",
        channel: "wechat",
        content: "亲爱的{name}，您做完{project}已经一个月了，现在是效果最明显的时候！建议{维护建议}，让效果更持久哦！",
        maintenance: "每3个月进行一次维护治疗"
      },
      targetFilter: {
        status: "converted",
        projectTypes: ["超皮秒", "热玛吉"]
      }
    },

    // 4. 浏览未咨询提醒（24小时）
    {
      name: "24小时未咨询提醒",
      description: "客户浏览项目24小时后未咨询，发送提醒消息",
      type: "behavior",
      behaviorConfig: {
        event: "browse_no_consult",
        duration: 24,
        unit: "hours"
      },
      action: "send_message",
      actionConfig: {
        template: "browse_reminder",
        channel: "wechat",
        content: "看到您对{project}感兴趣，有什么问题可以随时问我哦！现在咨询还有{优惠信息}。",
        urgency: "limited_time_offer"
      },
      targetFilter: {
        source: ["web", "xiaohongshu", "douyin"]
      }
    },

    // 5. 咨询未预约提醒（48小时）
    {
      name: "48小时未预约提醒",
      description: "客户咨询后48小时未预约，发送优惠促单",
      type: "behavior",
      behaviorConfig: {
        event: "consult_no_book",
        duration: 48,
        unit: "hours"
      },
      action: "send_message",
      actionConfig: {
        template: "consult_reminder",
        channel: "wechat",
        content: "亲爱的{name}，关于{project}还有什么疑问吗？现在预约可享受{优惠折扣}，名额有限哦！",
        discount: "首单8折"
      },
      targetFilter: {
        psychologyType: ["贪婪型", "犹豫型"],
        budgetLevel: ["medium", "high"]
      }
    },

    // 6. 天气相关营销
    {
      name: "晴天防晒提醒",
      description: "晴天高温时发送防晒和皮肤护理建议",
      type: "weather",
      weatherConfig: {
        condition: "sunny",
        temperature: { min: 28, max: 40 },
        projects: ["防晒", "补水", "修复"]
      },
      action: "send_message",
      actionConfig: {
        template: "weather_sunny",
        channel: "wechat",
        content: "今天天气晴朗，紫外线强烈！提醒您做好防晒哦～我们推荐{防晒产品}，现在购买有{优惠活动}！",
        products: ["防晒霜", "修复面膜", "补水精华"]
      },
      targetFilter: {
        customerTier: ["A", "B", "C"],
        skinType: ["敏感", "干性", "混合性"]
      }
    },

    // 7. 节日营销触发器
    {
      name: "节日优惠活动",
      description: "在重要节日前发送节日祝福和优惠活动",
      type: "time",
      timeConfig: {
        type: "holiday",
        holidays: ["春节", "情人节", "妇女节", "母亲节", "国庆节"],
        daysBefore: 7,
        time: "09:00"
      },
      action: "send_message",
      actionConfig: {
        template: "holiday_promotion",
        channel: "wechat",
        content: "{节日}快乐！为您准备了专属节日礼包{礼包内容}，祝您越来越美丽！",
        gifts: ["体验券", "礼品卡", "专属折扣"]
      },
      targetFilter: {
        customerTier: ["A", "B", "C"],
        lastPurchaseDays: 180 // 最近180天内消费过的客户
      }
    },

    // 8. 客户流失预警
    {
      name: "90天未到店提醒",
      description: "客户90天未到店，发送关怀和召回消息",
      type: "time",
      timeConfig: {
        type: "inactivity",
        daysInactive: 90,
        time: "11:00",
        repeat: "monthly"
      },
      action: "send_message",
      actionConfig: {
        template: "inactivity_reminder",
        channel: "wechat",
        content: "亲爱的{name}，好久不见！我们想念您了～最近推出了{新项目}，特别适合您！预约可享{召回优惠}。",
        recallOffer: "老客户专属7折"
      },
      targetFilter: {
        customerTier: ["A", "B"],
        lastVisitDays: { min: 90, max: 365 }
      }
    }
  ];

  /**
   * 设置所有默认触发器
   */
  async setupAllTriggers(): Promise<void> {
    console.log("🚀 开始设置自动化触发器...\n");

    const db = await getDb();
    if (!db) {
      throw new Error("数据库连接失败");
    }

    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const triggerConfig of this.defaultTriggers) {
      try {
        // 检查是否已存在同名触发器
        const existing = await db
          .select()
          .from(triggers)
          .where(eq(triggers.name, triggerConfig.name))
          .limit(1);

        const triggerData = {
          name: triggerConfig.name,
          description: triggerConfig.description,
          type: triggerConfig.type,
          timeConfig: triggerConfig.timeConfig ? JSON.stringify(triggerConfig.timeConfig) : null,
          behaviorConfig: triggerConfig.behaviorConfig ? JSON.stringify(triggerConfig.behaviorConfig) : null,
          weatherConfig: triggerConfig.weatherConfig ? JSON.stringify(triggerConfig.weatherConfig) : null,
          action: triggerConfig.action,
          actionConfig: JSON.stringify(triggerConfig.actionConfig),
          targetFilter: triggerConfig.targetFilter ? JSON.stringify(triggerConfig.targetFilter) : null,
          isActive: 1,
          executionCount: 0,
          lastExecutedAt: null
        };

        if (existing.length > 0) {
          // 更新现有触发器
          await db
            .update(triggers)
            .set(triggerData)
            .where(eq(triggers.id, existing[0].id));
          
          updatedCount++;
          console.log(`   🔄 更新触发器: ${triggerConfig.name}`);
        } else {
          // 创建新触发器
          await db.insert(triggers).values(triggerData);
          createdCount++;
          console.log(`   ✅ 创建触发器: ${triggerConfig.name}`);
        }

      } catch (error) {
        errorCount++;
        console.error(`   ❌ 设置失败: ${triggerConfig.name}`, error instanceof Error ? error.message : String(error));
      }
    }

    console.log(`\n📊 触发器设置完成:`);
    console.log(`   ✅ 创建: ${createdCount} 个`);
    console.log(`   🔄 更新: ${updatedCount} 个`);
    console.log(`   ❌ 失败: ${errorCount} 个`);
    console.log(`   📋 总计: ${this.defaultTriggers.length} 个触发器`);

    // 显示设置结果
    await this.displayTriggerStatus();
  }

  /**
   * 显示触发器状态
   */
  private async displayTriggerStatus(): Promise<void> {
    const db = await getDb();
    if (!db) return;

    console.log("\n📋 已设置的触发器列表:");
    console.log("=" .repeat(80));

    const allTriggers = await db
      .select({
        id: triggers.id,
        name: triggers.name,
        type: triggers.type,
        action: triggers.action,
        isActive: triggers.isActive,
        executionCount: triggers.executionCount,
        lastExecutedAt: triggers.lastExecutedAt
      })
      .from(triggers)
      .orderBy(triggers.id);

    allTriggers.forEach(trigger => {
      const status = trigger.isActive === 1 ? "✅ 启用" : "❌ 停用";
      const lastExec = trigger.lastExecutedAt 
        ? new Date(trigger.lastExecutedAt).toLocaleDateString('zh-CN')
        : "从未执行";
      
      console.log(`${trigger.id}. ${trigger.name}`);
      console.log(`   类型: ${trigger.type} | 动作: ${trigger.action}`);
      console.log(`   状态: ${status} | 执行次数: ${trigger.executionCount} | 最后执行: ${lastExec}`);
      console.log();
    });

    // 触发器分类统计
    console.log("📈 触发器分类统计:");
    console.log("-" .repeat(40));

    const stats = await db
      .select({
        type: triggers.type,
        count: sql<number>`COUNT(*)`.as("count"),
        active: sql<number>`COUNT(CASE WHEN ${triggers.isActive} = 1 THEN 1 END)`.as("active")
      })
      .from(triggers)
      .groupBy(triggers.type);

    stats.forEach(stat => {
      console.log(`   ${stat.type}: ${stat.count} 个 (${stat.active} 个启用)`);
    });

    // 执行建议
    console.log("\n🎯 触发器执行建议:");
    console.log("-" .repeat(40));
    console.log("1. 时间触发器 - 需要定时任务调度器");
    console.log("   - 建议使用 node-cron 或类似库");
    console.log("   - 每天检查生日、回访等时间条件");
    console.log("\n2. 行为触发器 - 需要事件监听器");
    console.log("   - 在用户行为发生时触发");
    console.log("   - 如：浏览后24小时未咨询");
    console.log("\n3. 天气触发器 - 需要天气API集成");
    console.log("   - 定时获取天气数据");
    console.log("   - 根据天气条件触发营销");
  }

  /**
   * 测试触发器执行
   */
  async testTriggerExecution(): Promise<void> {
    console.log("\n🧪 测试触发器执行逻辑...");

    const testScenarios = [
      {
        name: "生日提醒测试",
        condition: "客户生日前3天",
        action: "发送微信祝福+优惠券",
        testData: { name: "测试客户", birthday: "1990-01-01" }
      },
      {
        name: "7天回访测试",
        condition: "到店后第7天",
        action: "发送效果跟进消息",
        testData: { name: "测试客户", project: "超皮秒", visitDate: "2024-01-01" }
      },
      {
        name: "行为触发测试",
        condition: "浏览后24小时未咨询",
        action: "发送提醒消息",
        testData: { name: "测试客户", browseTime: "2024-01-01 10:00", project: "热玛吉" }
      }
    ];

    for (const scenario of testScenarios) {
      console.log(`\n📝 测试: ${scenario.name}`);
      console.log(`   条件: ${scenario.condition}`);
      console.log(`   动作: ${scenario.action}`);
      
      // 模拟触发器逻辑
      const shouldTrigger = this.evaluateTriggerCondition(scenario);
      console.log(`   结果: ${shouldTrigger ? "✅ 应该触发" : "❌ 不触发"}`);
      
      if (shouldTrigger) {
        const message = this.generateTriggerMessage(scenario);
        console.log(`   消息: ${message}`);
      }
    }
  }

  /**
   * 评估触发器条件
   */
  private evaluateTriggerCondition(scenario: any): boolean {
    // 简化版的触发器条件评估
    // 实际应该根据数据库中的具体条件进行评估
    
    switch (scenario.name) {
      case "生日提醒测试":
        // 模拟生日前3天
        return true;
      case "7天回访测试":
        // 模拟到店后第7天
        return true;
      case "行为触发测试":
        // 模拟浏览后24小时
        return true;
      default:
        return false;
    }
  }

  /**
   * 生成触发器消息
   */
  private generateTriggerMessage(scenario: any): string {
    switch (scenario.name) {
      case "生日提醒测试":
        return `亲爱的${scenario.testData.name}，祝您生日快乐！为您准备了专属生日礼包。`;
      case "7天回访测试":
        return `亲爱的${scenario.testData.name}，您做完${scenario.testData.project}已经7天了，现在感觉怎么样？`;
      case "行为触发测试":
        return `看到您对${scenario.testData.project}感兴趣，有什么问题可以随时问我哦！`;
      default:
        return "默认消息";
    }
  }
}

// 导入必要的依赖
import { eq, sql } from "drizzle-orm";

// 主函数
async function main() {
  try {
    const setup = new TriggerSetup();
    
    console.log("🎯 医美CRM自动化触发器设置");
    console.log("=" .repeat(50));
    
    // 1. 设置所有触发器
    await setup.setupAllTriggers();
    
    // 2. 测试触发器执行逻辑
    await setup.testTriggerExecution();
    
    console.log("\n🚀 触发器设置完成！");
    console.log("\n📋 下一步操作：");
    console.log("1. 启动定时任务调度器");
    console.log("2. 配置消息发送渠道（微信、短信等）");
    console.log("3. 测试真实触发器执行");
    console.log("4. 监控触发器执行日志");
    
  } catch (error) {
    console.error("❌ 设置失败:", error);
    process.exit(1);
  }
}

main();