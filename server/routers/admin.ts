import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import {
  saveAirtableConfig,
  getAirtableConfig,
  testAirtableConnection,
  setupAirtableTables,
} from "../services/admin.service";

export const adminRouter = router({
  saveAirtableConfig: adminProcedure
    .input(z.object({ token: z.string(), baseId: z.string() }))
    .mutation(({ input }) => saveAirtableConfig(input.token, input.baseId)),

  getAirtableConfig: adminProcedure
    .query(() => getAirtableConfig()),

  testAirtableConnection: adminProcedure
    .input(z.object({ token: z.string(), baseId: z.string() }))
    .mutation(({ input }) => testAirtableConnection(input.token, input.baseId)),

  setupAirtableTables: adminProcedure
    .input(z.object({ token: z.string(), baseId: z.string() }))
    .mutation(({ input }) => setupAirtableTables(input.token, input.baseId)),
});
