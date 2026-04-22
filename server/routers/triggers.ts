import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
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

export const triggersRouter = router({
  // 获取所有触发器
  list: protectedProcedure.query(async () => {
    const triggers = await getAllTriggers();
    return triggers;
  }),

  // 获取单个触发器
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const trigger = await getTriggerById(input.id);
      return trigger;
    }),

  // 创建触发器
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().max(200),
        type: z.enum([
          "time",
          "behavior",
          "weather",
          "birthday_reminder",
          "holiday_reminder",
        ]),
        condition: z.string().max(5000).optional(),
        action: z.string().max(5000),
        actionConfig: z.string().max(5000).optional(),
        enabled: z.boolean().default(true),
        timeConfig: z.string().max(5000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { condition, enabled, timeConfig, actionConfig, ...rest } = input;
      const trigger = await dbCreateTrigger({
        ...rest,
        timeConfig: timeConfig ?? condition ?? null,
        actionConfig: actionConfig ?? null,
        isActive: enabled ? 1 : 0,
      } as Parameters<typeof dbCreateTrigger>[0]);
      return trigger;
    }),

  // 更新触发器
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().max(200).optional(),
        type: z
          .enum([
            "time",
            "behavior",
            "weather",
            "birthday_reminder",
            "holiday_reminder",
          ])
          .optional(),
        condition: z.string().max(5000).optional(),
        action: z.string().max(5000).optional(),
        actionConfig: z.string().max(5000).optional(),
        enabled: z.boolean().optional(),
        timeConfig: z.string().max(5000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, enabled, condition, timeConfig, actionConfig, ...rest } =
        input;
      const data: Record<string, unknown> = { ...rest };
      if (enabled !== undefined) data.isActive = enabled ? 1 : 0;
      if (timeConfig !== undefined) data.timeConfig = timeConfig;
      else if (condition !== undefined) data.timeConfig = condition;
      if (actionConfig !== undefined) data.actionConfig = actionConfig;
      const trigger = await dbUpdateTrigger(
        id,
        data as Parameters<typeof dbUpdateTrigger>[1]
      );
      return trigger;
    }),

  // 删除触发器
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await dbDeleteTrigger(input.id);
      return { success: true };
    }),

  // 手动执行触发器
  execute: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const trigger = await getTriggerById(input.id);
      if (!trigger) {
        throw new Error("触发器不存在");
      }

      // 生日/节日提醒：扫描 leads 并执行跟进
      if (
        trigger.type === "birthday_reminder" ||
        trigger.type === "holiday_reminder"
      ) {
        try {
          // 30s 超时保护，防止 DB 慢查询阻塞请求
          const timeoutMs = 30_000;
          const outcome = await Promise.race([
            runBirthdayHolidayTrigger(trigger),
            new Promise<never>((_, reject) =>
              setTimeout(
                () =>
                  reject(new Error(`触发器执行超时（>${timeoutMs / 1000}s）`)),
                timeoutMs
              )
            ),
          ]);
          await createTriggerExecution({
            triggerId: trigger.id,
            executedAt: new Date().toISOString(),
            result: outcome.result,
            status: outcome.success ? "success" : "failed",
          });
          return {
            success: outcome.success,
            result: outcome.result,
            count: outcome.count,
          };
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

      // 解析触发器动作（action 可能是 JSON 字符串或纯类型名如 "create_task"）
      let action: Record<string, unknown> = {};
      const rawAction = trigger.action;
      if (typeof rawAction === "object" && rawAction !== null) {
        action = rawAction as Record<string, unknown>;
      } else if (typeof rawAction === "string") {
        const trimmed = rawAction.trim();
        if (trimmed.startsWith("{")) {
          try {
            action = JSON.parse(trimmed) as Record<string, unknown>;
          } catch {
            action = { type: trimmed || "create_task" };
          }
        } else {
          action = { type: trimmed || "create_task" };
          if (trigger.actionConfig) {
            try {
              const extra = JSON.parse(trigger.actionConfig) as Record<
                string,
                unknown
              >;
              action = { ...action, ...extra };
            } catch {
              // ignore
            }
          }
        }
      }
      // 若未解析出 type，使用默认动作，避免“未知的动作类型”
      if (action.type === undefined || action.type === null) {
        if (trigger.actionConfig) {
          try {
            const a = JSON.parse(trigger.actionConfig) as Record<
              string,
              unknown
            >;
            if (a.type) action.type = a.type;
          } catch {
            // ignore
          }
        }
        if (action.type === undefined || action.type === null)
          action.type = "create_task";
      }
      let result = "";
      let success = true;

      try {
        if (action.type === "send_message") {
          // send_message: 创建消息记录（需后续对接企业微信 API 实际发送）
          const { createWeworkMessage } = await import("../wework-db");
          await createWeworkMessage({
            externalUserId: String(action.target || ""),
            sendUserId: "system",
            msgType: "text",
            content: String(action.message || "触发器自动发送"),
            status: "pending",
          });
          result = `已创建消息记录，目标：${action.target}`;
        } else if (
          action.type === "create_task" ||
          action.type === "follow_up"
        ) {
          // create_task / follow_up: 创建一条跟进记录写入 trigger_executions
          result = `已创建跟进任务${action.taskName ? `：${action.taskName}` : ""}，触发器 ID：${trigger.id}`;
        } else if (action.type === "send_notification") {
          // send_notification: 记录通知内容到执行结果（后续对接 WebSocket/推送）
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
        const msg =
          error instanceof Error ? (error as Error).message : String(error);
        await createTriggerExecution({
          triggerId: trigger.id,
          executedAt: new Date().toISOString(),
          result: msg,
          status: "failed",
        });
        throw error;
      }
    }),

  // 获取触发器执行历史
  executions: protectedProcedure
    .input(z.object({ triggerId: z.number() }))
    .query(async ({ input }) => {
      const executions = await getTriggerExecutions(input.triggerId);
      return executions;
    }),

  // 使用 AI 生成触发器条件
  generateCondition: protectedProcedure
    .input(
      z.object({
        type: z.enum(["time", "behavior", "weather"]),
        description: z.string().max(5000),
      })
    )
    .mutation(async ({ input }) => {
      const prompt = `你是一个医美 CRM 系统的自动化触发器配置助手。根据用户的描述，生成触发器条件的 JSON 配置。

触发器类型：${input.type}
用户描述：${input.description}

请生成符合以下格式的 JSON 配置：

**时间触发器格式：**
{
  "type": "time",
  "schedule": "cron表达式或时间描述",
  "target": "目标客户群体"
}

**行为触发器格式：**
{
  "type": "behavior",
  "event": "触发事件（如：浏览未咨询、咨询未预约）",
  "timeWindow": "时间窗口（如：24小时、7天）",
  "target": "目标客户群体"
}

**天气触发器格式：**
{
  "type": "weather",
  "condition": "天气条件（如：晴天、雨天、温度变化）",
  "location": "地理位置",
  "target": "目标客户群体"
}

只返回 JSON，不要其他内容。`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: prompt,
          },
          {
            role: "user",
            content: input.description,
          },
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
      const condition =
        typeof content === "string" ? content : JSON.stringify(content);

      return {
        condition,
      };
    }),
});
