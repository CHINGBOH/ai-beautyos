import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  listTriggers,
  getTrigger,
  createTrigger,
  updateTrigger,
  deleteTrigger,
  executeTrigger,
  getTriggerExecutionHistory,
  generateTriggerCondition,
} from "../services/triggers.service";

const triggerTypeEnum = z.enum(["time", "behavior", "weather", "birthday_reminder", "holiday_reminder"]);

export const triggersRouter = router({
  list: protectedProcedure
    .query(() => listTriggers()),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getTrigger(input.id)),

  create: protectedProcedure
    .input(z.object({
      name: z.string().max(200),
      type: triggerTypeEnum,
      condition: z.string().max(5000).optional(),
      action: z.string().max(5000),
      actionConfig: z.string().max(5000).optional(),
      enabled: z.boolean().default(true),
      timeConfig: z.string().max(5000).optional(),
    }))
    .mutation(({ input }) => createTrigger(input)),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().max(200).optional(),
      type: triggerTypeEnum.optional(),
      condition: z.string().max(5000).optional(),
      action: z.string().max(5000).optional(),
      actionConfig: z.string().max(5000).optional(),
      enabled: z.boolean().optional(),
      timeConfig: z.string().max(5000).optional(),
    }))
    .mutation(({ input }) => updateTrigger(input)),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteTrigger(input.id)),

  execute: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => executeTrigger(input.id)),

  executions: protectedProcedure
    .input(z.object({ triggerId: z.number() }))
    .query(({ input }) => getTriggerExecutionHistory(input.triggerId)),

  generateCondition: protectedProcedure
    .input(z.object({
      type: z.enum(["time", "behavior", "weather"]),
      description: z.string().max(5000),
    }))
    .mutation(({ input }) => generateTriggerCondition(input)),
});
