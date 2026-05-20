/**
 * Triggers Service
 * 自动化触发器业务逻辑；router 只负责鉴权与参数校验。
 */

import {
  getAllTriggers,
  getTriggerById,
  createTrigger as dbCreateTrigger,
  updateTrigger as dbUpdateTrigger,
  deleteTrigger as dbDeleteTrigger,
  getTriggerExecutions,
  createTriggerExecution,
} from "../db";
import { runBirthdayHolidayTrigger } from "../jobs/birthday-holiday";
import { invokeLLM } from "../llm";

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function listTriggers() {
  return getAllTriggers();
}

export async function getTrigger(id: number) {
  return getTriggerById(id);
}

export async function createTrigger(input: {
  name: string;
  type: "time" | "behavior" | "weather" | "birthday_reminder" | "holiday_reminder";
  condition?: string;
  action: string;
  actionConfig?: string;
  enabled: boolean;
  timeConfig?: string;
}) {
  const { condition, enabled, timeConfig, actionConfig, ...rest } = input;
  return dbCreateTrigger({
    ...rest,
    timeConfig: timeConfig ?? condition ?? null,
    actionConfig: actionConfig ?? null,
    isActive: enabled ? 1 : 0,
  } as Parameters<typeof dbCreateTrigger>[0]);
}

export async function updateTrigger(input: {
  id: number;
  name?: string;
  type?: "time" | "behavior" | "weather" | "birthday_reminder" | "holiday_reminder";
  condition?: string;
  action?: string;
  actionConfig?: string;
  enabled?: boolean;
  timeConfig?: string;
}) {
  const { id, enabled, condition, timeConfig, actionConfig, ...rest } = input;
  const data: Record<string, unknown> = { ...rest };
  if (enabled !== undefined) data.isActive = enabled ? 1 : 0;
  if (timeConfig !== undefined) data.timeConfig = timeConfig;
  else if (condition !== undefined) data.timeConfig = condition;
  if (actionConfig !== undefined) data.actionConfig = actionConfig;
  return dbUpdateTrigger(id, data as Parameters<typeof dbUpdateTrigger>[1]);
}

export async function deleteTrigger(id: number) {
  await dbDeleteTrigger(id);
  return { success: true };
}

export async function executeTrigger(id: number) {
  const trigger = await getTriggerById(id);
  if (!trigger) throw new Error("触发器不存在");

  if (trigger.type === "birthday_reminder" || trigger.type === "holiday_reminder") {
    try {
      const outcome = await Promise.race([
        runBirthdayHolidayTrigger(trigger),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("触发器执行超时（>30s）")), 30_000)
        ),
      ]);
      await createTriggerExecution({
        triggerId: trigger.id,
        executedAt: new Date().toISOString(),
        result: outcome.result,
        status: outcome.success ? "success" : "failed",
      });
      return { success: outcome.success, result: outcome.result, count: outcome.count };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      await createTriggerExecution({
        triggerId: trigger.id,
        executedAt: new Date().toISOString(),
        result: msg,
        status: "failed",
      });
      throw error;
    }
  }

  // Parse action
  let action: Record<string, unknown> = {};
  const rawAction = trigger.action;
  if (typeof rawAction === "object" && rawAction !== null) {
    action = rawAction as Record<string, unknown>;
  } else if (typeof rawAction === "string") {
    const trimmed = rawAction.trim();
    if (trimmed.startsWith("{")) {
      try { action = JSON.parse(trimmed); } catch { action = { type: trimmed || "create_task" }; }
    } else {
      action = { type: trimmed || "create_task" };
      if (trigger.actionConfig) {
        try { action = { ...action, ...JSON.parse(trigger.actionConfig) }; } catch { /* ignore */ }
      }
    }
  }

  if (action.type == null) {
    if (trigger.actionConfig) {
      try { const a = JSON.parse(trigger.actionConfig) as Record<string, unknown>; if (a.type) action.type = a.type; } catch { /* ignore */ }
    }
    if (action.type == null) action.type = "create_task";
  }

  let result = "";
  let success = true;

  try {
    if (action.type === "send_message") {
      const { createWeworkMessage } = await import("../wework-db");
      await createWeworkMessage({
        externalUserId: String(action.target || ""),
        sendUserId: "system",
        msgType: "text",
        content: String(action.message || "触发器自动发送"),
        status: "pending",
      });
      result = `已创建消息记录，目标：${action.target}`;
    } else if (action.type === "create_task" || action.type === "follow_up") {
      result = `已创建跟进任务${action.taskName ? `：${action.taskName}` : ""}，触发器 ID：${trigger.id}`;
    } else if (action.type === "send_notification") {
      result = `通知已记录：${action.message}`;
    } else {
      result = `未知的动作类型: ${action.type}`;
      success = false;
    }

    await createTriggerExecution({
      triggerId: trigger.id,
      executedAt: new Date().toISOString(),
      result,
      status: success ? "success" : "failed",
    });

    return { success, result };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    await createTriggerExecution({
      triggerId: trigger.id,
      executedAt: new Date().toISOString(),
      result: msg,
      status: "failed",
    });
    throw error;
  }
}

export async function getTriggerExecutionHistory(triggerId: number) {
  return getTriggerExecutions(triggerId);
}

export async function generateTriggerCondition(input: {
  type: "time" | "behavior" | "weather";
  description: string;
}) {
  const prompt = `你是一个医美 CRM 系统的自动化触发器配置助手。根据用户的描述，生成触发器条件的 JSON 配置。

触发器类型：${input.type}
用户描述：${input.description}

请生成符合以下格式的 JSON 配置：

**时间触发器格式：**
{"type": "time", "schedule": "cron表达式或时间描述", "target": "目标客户群体"}

**行为触发器格式：**
{"type": "behavior", "event": "触发事件", "timeWindow": "时间窗口", "target": "目标客户群体"}

**天气触发器格式：**
{"type": "weather", "condition": "天气条件", "location": "地理位置", "target": "目标客户群体"}

只返回 JSON，不要其他内容。`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: input.description },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "trigger_condition",
        strict: true,
        schema: {
          type: "object",
          properties: {
            type: { type: "string" },
            schedule: { type: "string" },
            event: { type: "string" },
            timeWindow: { type: "string" },
            condition: { type: "string" },
            location: { type: "string" },
            target: { type: "string" },
          },
          required: ["type", "target"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  return { condition: typeof content === "string" ? content : JSON.stringify(content) };
}
