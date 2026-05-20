/**
 * 生日/节日提醒任务：扫描 leads 中生日或重要节日匹配的客户，执行跟进动作并记录执行结果。
 */
import {
  getActiveTriggersByTypes,
  getLeadsWithBirthdayInRange,
  getLeadsWithImportantHoliday,
  createTriggerExecution,
  updateLead,
} from "../db";
import { logger } from "../_core/logger";
import { getWeworkCustomerByLeadId } from "../wework-db";
import { sendTextMessage } from "../wework-api";

/**
 * 内存级幂等性缓存（生产环境建议使用Redis）
 * key: `${triggerId}:${leadId}:${date}`, value: executionTimestamp
 */
const executedCache = new Map<string, number>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24小时

const BIRTHDAY_HOLIDAY_TYPES = [
  "birthday_reminder",
  "holiday_reminder",
] as const;

/** 固定日期节日映射（MM-DD 格式） */
const FIXED_HOLIDAYS: Record<string, string[]> = {
  "01-01": ["元旦"],
  "02-14": ["情人节"],
  "03-08": ["妇女节"],
  "05-01": ["劳动节"],
  "06-01": ["儿童节"],
  "08-01": ["建军节"],
  "09-10": ["教师节"],
  "10-01": ["国庆节"],
  "12-25": ["圣诞节"],
  // TODO: 农历节日（春节、中秋节等）需引入农历转换库实现
};

/** 计算某年母亲节日期（5月第二个星期日） */
function getMothersDay(year: number): Date {
  const may1 = new Date(year, 4, 1);
  const dayOfWeek = may1.getDay();
  const firstSunday = dayOfWeek === 0 ? 1 : 7 - dayOfWeek + 1;
  return new Date(year, 4, firstSunday + 7);
}

/** 计算某年父亲节日期（6月第三个星期日） */
function getFathersDay(year: number): Date {
  const june1 = new Date(year, 5, 1);
  const dayOfWeek = june1.getDay();
  const firstSunday = dayOfWeek === 0 ? 1 : 7 - dayOfWeek + 1;
  return new Date(year, 5, firstSunday + 14);
}

function formatDateMMDD(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getTodayHolidayNames(): string[] {
  const now = new Date();
  const key = formatDateMMDD(now);
  const holidays = [...(FIXED_HOLIDAYS[key] || [])];

  // 母亲节：5月第二个星期日
  if (formatDateMMDD(getMothersDay(now.getFullYear())) === key) {
    holidays.push("母亲节");
  }
  // 父亲节：6月第三个星期日
  if (formatDateMMDD(getFathersDay(now.getFullYear())) === key) {
    holidays.push("父亲节");
  }

  return holidays;
}

/** timeConfig 示例: { "daysAhead": 3 } 或 { "daysAhead": 0, "holidayNames": ["春节","生日"] } */
function parseTimeConfig(timeConfig: string | null): {
  daysAhead: number;
  holidayNames?: string[];
} {
  const def = { daysAhead: 0, holidayNames: [] as string[] };
  if (!timeConfig || !timeConfig.trim()) return def;
  try {
    const o = JSON.parse(timeConfig) as Record<string, unknown>;
    const daysAhead = typeof o.daysAhead === "number" ? o.daysAhead : 0;
    const holidayNames = Array.isArray(o.holidayNames)
      ? (o.holidayNames as string[])
      : def.holidayNames;
    return { daysAhead, holidayNames };
  } catch {
    return def;
  }
}

/** 执行单个生日/节日触发器的扫描与动作 */
export async function runBirthdayHolidayTrigger(trigger: {
  id: number;
  name: string;
  type: string;
  timeConfig: string | null;
  action: string;
  actionConfig: string | null;
}): Promise<{ success: boolean; result: string; count: number }> {
  const config = parseTimeConfig(trigger.timeConfig);
  const now = new Date();
  let leads:
    | Awaited<ReturnType<typeof getLeadsWithBirthdayInRange>>
    | Awaited<ReturnType<typeof getLeadsWithImportantHoliday>> = [];
  let reason = "";

  if (trigger.type === "birthday_reminder") {
    const end = new Date(now);
    end.setDate(end.getDate() + config.daysAhead);
    leads = await getLeadsWithBirthdayInRange(now, end);
    reason = `生日在今日至${config.daysAhead}天内`;
  } else if (trigger.type === "holiday_reminder") {
    const holidayNames = config.holidayNames?.length
      ? config.holidayNames
      : getTodayHolidayNames();
    const seen = new Set<number>();
    const leadList: Awaited<ReturnType<typeof getLeadsWithImportantHoliday>> =
      [];
    for (const name of holidayNames) {
      const list = await getLeadsWithImportantHoliday(name);
      for (const l of list) {
        if (!seen.has(l.id)) {
          seen.add(l.id);
          leadList.push(l);
        }
      }
    }
    leads = leadList;
    reason = `重要节日：${holidayNames.join("、") || "今日节日"}`;
  } else {
    return { success: false, result: "不支持的触发器类型", count: 0 };
  }

  const count = leads.length;
  const actionType =
    (trigger.actionConfig &&
      (() => {
        try {
          const a = JSON.parse(trigger.actionConfig) as Record<string, unknown>;
          return (a.type as string) || "create_task";
        } catch {
          return "create_task";
        }
      })()) ||
    "create_task";

  // 生成今天的日期键用于幂等性检查
  const todayKey = formatDateMMDD(new Date());

  for (const lead of leads) {
    // 幂等性检查：确保今天不会重复处理同一客户
    const cacheKey = `${trigger.id}:${lead.id}:${todayKey}`;
    const lastExecuted = executedCache.get(cacheKey);
    const now = Date.now();

    if (lastExecuted && now - lastExecuted < CACHE_TTL_MS) {
      logger.info(
        `[birthday-holiday] Skipping lead ${lead.id} - already processed today`
      );
      continue;
    }

    try {
      if (actionType === "create_task" || actionType === "follow_up") {
        const followUp = new Date();
        followUp.setDate(followUp.getDate() + 1);
        await updateLead(lead.id, { followUpDate: followUp.toISOString() });

        // 尝试通过企业微信发送提醒消息
        try {
          const weworkCustomer = await getWeworkCustomerByLeadId(lead.id);
          if (weworkCustomer?.externalUserId) {
            const msgContent = trigger.type === "birthday_reminder"
              ? `您好 ${lead.name}～生日快乐！🎂 感谢一直以来的信任，我们为您准备了专属生日惊喜，方便的话来店里让我们为您庆生吧！`
              : `您好 ${lead.name}，节日快乐！🌸 ${reason}，特别想到您，希望您和家人一切都好。有任何肌肤护理的需要欢迎随时联系我～`;
            await sendTextMessage(weworkCustomer.externalUserId, msgContent);
            logger.info(`[birthday-holiday] 已发送企业微信消息给 ${lead.name} (leadId=${lead.id})`);
          }
        } catch (msgErr) {
          logger.warn("[birthday-holiday] 企业微信消息发送失败（不影响任务创建）", {
            leadId: lead.id,
            error: msgErr instanceof Error ? msgErr.message : String(msgErr),
          });
        }

        // 标记为已执行
        executedCache.set(cacheKey, now);
      }
    } catch (e) {
      logger.warn("[birthday-holiday] updateLead failed", {
        leadId: lead.id,
        error: e,
      });
    }
  }

  // 清理过期缓存（简单清理策略）
  if (Math.random() < 0.1) {
    // 10%概率执行清理
    cleanupExpiredCache();
  }

  const result = `已处理 ${count} 位客户（${reason}），动作为 ${actionType}`;
  return { success: true, result, count };
}

/** 清理过期缓存 */
function cleanupExpiredCache(): void {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, timestamp] of executedCache.entries()) {
    if (now - timestamp > CACHE_TTL_MS) {
      executedCache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    logger.info(`[birthday-holiday] Cleaned ${cleaned} expired cache entries`);
  }
}

/** 运行所有活跃的生日/节日提醒触发器 */
export async function runBirthdayHolidayReminders(): Promise<
  { triggerId: number; success: boolean; result: string; count: number }[]
> {
  const triggers = await getActiveTriggersByTypes([...BIRTHDAY_HOLIDAY_TYPES]);
  const outcomes: {
    triggerId: number;
    success: boolean;
    result: string;
    count: number;
  }[] = [];

  for (const trigger of triggers) {
    try {
      const outcome = await runBirthdayHolidayTrigger(trigger);
      outcomes.push({ triggerId: trigger.id, ...outcome });
      await createTriggerExecution({
        triggerId: trigger.id,
        executedAt: new Date().toISOString(),
        result: outcome.result,
        status: outcome.success ? "success" : "failed",
      });
    } catch (e) {
      logger.error("[birthday-holiday] trigger run failed", {
        triggerId: trigger.id,
        error: e,
      });
      outcomes.push({
        triggerId: trigger.id,
        success: false,
        result: String((e as Error).message),
        count: 0,
      });
      await createTriggerExecution({
        triggerId: trigger.id,
        executedAt: new Date().toISOString(),
        result: String((e as Error).message),
        status: "failed",
      });
    }
  }

  return outcomes;
}
