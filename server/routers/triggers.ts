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
import { invokeLLM } from "../_core/llm";

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
        name: z.string(),
        type: z.enum(["time", "behavior", "weather"]),
        condition: z.string(),
        action: z.string(),
        enabled: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const trigger = await dbCreateTrigger(input);
      return trigger;
    }),

  // 更新触发器
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        type: z.enum(["time", "behavior", "weather"]).optional(),
        condition: z.string().optional(),
        action: z.string().optional(),
        enabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const trigger = await dbUpdateTrigger(id, data);
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

      // 解析触发器动作
      const action = JSON.parse(trigger.action);

      let result = "";
      let success = true;

      try {
        // 根据动作类型执行不同的操作
        if (action.type === "send_message") {
          // 发送消息（这里简化处理，实际应该调用消息发送 API）
          result = `已向 ${action.target} 发送消息：${action.message}`;
        } else if (action.type === "create_task") {
          // 创建任务
          result = `已创建任务：${action.taskName}`;
        } else if (action.type === "send_notification") {
          // 发送通知
          result = `已发送通知：${action.message}`;
        } else {
          result = "未知的动作类型";
          success = false;
        }

        // 记录执行历史
        await createTriggerExecution({
          triggerId: trigger.id,
          executedAt: new Date(),
          result,
          success,
        });

        return {
          success,
          result,
        };
      } catch (error: any) {
        // 记录执行失败
        await createTriggerExecution({
          triggerId: trigger.id,
          executedAt: new Date(),
          result: error.message,
          success: false,
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
        description: z.string(),
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
      const condition = typeof content === "string" ? content : JSON.stringify(content);

      return {
        condition,
      };
    }),
});
