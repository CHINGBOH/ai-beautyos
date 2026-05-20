import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { adminAiQuery } from "../services/admin-ai.service";

export const adminAiRouter = router({
  query: adminProcedure
    .input(z.object({ question: z.string().min(1).max(500) }))
    .mutation(({ input }) => adminAiQuery(input.question)),
});
