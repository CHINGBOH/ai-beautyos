import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import {
  getAll,
  getById,
  getByParentId,
  getTree,
  getTreeByModule,
  getByPath,
  search,
  incrementView,
  createKnowledgeEntry,
  updateKnowledgeEntry,
  deleteKnowledgeEntry,
  getActive,
  getModules,
} from "../services/knowledge.service";

const difficultyEnum = z.enum(["beginner", "intermediate", "advanced"]);
const typeEnum = z.enum(["customer", "internal"]);

export const knowledgeRouter = router({
  getAll: protectedProcedure
    .input(z.object({
      type: typeEnum.optional(),
      module: z.string().optional(),
      limit: z.number().min(1).max(200).optional().default(50),
      offset: z.number().min(0).optional().default(0),
      searchTerm: z.string().max(500).optional(),
    }))
    .query(({ input }) => getAll(input)),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getById(input.id)),

  getByParentId: publicProcedure
    .input(z.object({ parentId: z.number().nullable() }))
    .query(({ input }) => getByParentId(input.parentId)),

  getTree: publicProcedure
    .query(() => getTree()),

  getTreeByModule: publicProcedure
    .input(z.object({ module: z.string() }))
    .query(({ input }) => getTreeByModule(input.module)),

  getByPath: publicProcedure
    .input(z.object({ path: z.string() }))
    .query(({ input }) => getByPath(input.path)),

  search: publicProcedure
    .input(z.object({
      keyword: z.string().min(1).max(500),
      module: z.string().optional(),
      type: typeEnum.optional(),
      limit: z.number().min(1).max(100).optional().default(20),
    }))
    .query(({ input }) => search(input.keyword, input.module, input.type, input.limit)),

  incrementView: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => incrementView(input.id)),

  create: protectedProcedure
    .input(z.object({
      parentId: z.number().nullable().optional(),
      level: z.number().min(1).max(6).default(1),
      path: z.string().max(500).optional(),
      order: z.number().default(0),
      module: z.string().min(1).max(100).default("skin_care"),
      category: z.string().max(100).optional(),
      subCategory: z.string().max(100).optional(),
      title: z.string().min(1).max(200),
      summary: z.string().max(10000).optional(),
      content: z.string().min(1).max(100000),
      positiveEvidence: z.string().max(50000).optional(),
      negativeEvidence: z.string().max(50000).optional(),
      neutralAnalysis: z.string().max(50000).optional(),
      practicalGuide: z.string().max(50000).optional(),
      caseStudies: z.string().max(50000).optional(),
      expertOpinions: z.string().max(50000).optional(),
      images: z.string().max(50000).optional(),
      videos: z.string().max(50000).optional(),
      audio: z.string().max(50000).optional(),
      tags: z.array(z.string().max(100)).optional(),
      sources: z.string().max(50000).optional(),
      credibility: z.number().min(1).max(10).optional().default(5),
      difficulty: difficultyEnum.optional().default("beginner"),
      type: typeEnum.default("customer"),
      isActive: z.number().optional().default(1),
    }))
    .mutation(({ input }) => createKnowledgeEntry(input)),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      parentId: z.number().nullable().optional(),
      level: z.number().min(1).max(6).optional(),
      path: z.string().max(500).optional(),
      order: z.number().optional(),
      module: z.string().max(100).optional(),
      category: z.string().max(100).optional(),
      subCategory: z.string().max(100).optional(),
      title: z.string().min(1).max(200).optional(),
      summary: z.string().max(10000).optional(),
      content: z.string().min(1).max(100000).optional(),
      positiveEvidence: z.string().max(50000).optional(),
      negativeEvidence: z.string().max(50000).optional(),
      neutralAnalysis: z.string().max(50000).optional(),
      practicalGuide: z.string().max(50000).optional(),
      caseStudies: z.string().max(50000).optional(),
      expertOpinions: z.string().max(50000).optional(),
      images: z.string().max(50000).optional(),
      videos: z.string().max(50000).optional(),
      audio: z.string().max(50000).optional(),
      tags: z.array(z.string().max(100)).optional(),
      sources: z.string().max(50000).optional(),
      credibility: z.number().min(1).max(10).optional(),
      difficulty: difficultyEnum.optional(),
      type: typeEnum.optional(),
      isActive: z.number().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...rest } = input;
      return updateKnowledgeEntry(id, rest);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteKnowledgeEntry(input.id)),

  getActive: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      type: typeEnum.optional(),
      module: z.string().optional(),
    }))
    .query(({ input }) => getActive(input.category, input.type, input.module)),

  getModules: publicProcedure
    .query(() => getModules()),
});
