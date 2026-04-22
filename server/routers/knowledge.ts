import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import {
  createKnowledge,
  getAllKnowledge,
  getKnowledgeById,
  updateKnowledge,
  deleteKnowledge,
  getActiveKnowledge,
  getKnowledgeByParentId,
  getKnowledgeTreeByModule,
  getKnowledgeByPath,
  searchKnowledge,
  incrementKnowledgeView,
} from "../db";
import {
  KNOWLEDGE_MODULES,
  MODULE_NAMES,
  DIFFICULTY_LEVELS,
} from "@shared/types";

export const knowledgeRouter = router({
  /**
   * 获取知识库列表（分页 + 服务端搜索，仅返回轻量列）
   */
  getAll: protectedProcedure
    .input(
      z.object({
        type: z.enum(["customer", "internal"]).optional(),
        module: z.string().optional(),
        limit: z.number().min(1).max(200).optional().default(50),
        offset: z.number().min(0).optional().default(0),
        searchTerm: z.string().max(500).optional(),
      })
    )
    .query(async ({ input }) => {
      return getAllKnowledge({
        type: input.type,
        module: input.module,
        limit: input.limit,
        offset: input.offset,
        searchTerm: input.searchTerm,
      });
    }),

  /**
   * 获取单个知识库详情
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const knowledge = await getKnowledgeById(input.id);
      if (!knowledge) {
        throw new Error("Knowledge not found");
      }
      return knowledge;
    }),

  /**
   * 根据父节点ID获取子节点（支持层级查询）
   */
  getByParentId: publicProcedure
    .input(
      z.object({
        parentId: z.number().nullable(),
      })
    )
    .query(async ({ input }) => {
      const knowledge = await getKnowledgeByParentId(input.parentId);
      return knowledge;
    }),

  /**
   * 获取知识库树形结构 (兼容前端调用)
   */
  getTree: publicProcedure.query(async () => {
    // 默认获取 health_foundation 模块的树
    const tree = await getKnowledgeTreeByModule("health_foundation");
    return tree;
  }),

  /**
   * 根据模块获取知识库树形结构
   */
  getTreeByModule: publicProcedure
    .input(
      z.object({
        module: z.string(),
      })
    )
    .query(async ({ input }) => {
      const tree = await getKnowledgeTreeByModule(input.module);
      return tree;
    }),

  /**
   * 根据路径获取知识库节点
   */
  getByPath: publicProcedure
    .input(
      z.object({
        path: z.string(),
      })
    )
    .query(async ({ input }) => {
      const knowledge = await getKnowledgeByPath(input.path);
      if (!knowledge) {
        throw new Error("Knowledge not found");
      }
      return knowledge;
    }),

  /**
   * 搜索知识库
   */
  search: publicProcedure
    .input(
      z.object({
        keyword: z.string().min(1).max(500),
        module: z.string().optional(),
        type: z.enum(["customer", "internal"]).optional(),
        limit: z.number().min(1).max(100).optional().default(20),
      })
    )
    .query(async ({ input }) => {
      const results = await searchKnowledge(
        input.keyword,
        input.module,
        input.type,
        input.limit
      );
      return results;
    }),

  /**
   * 创建知识库（支持6层嵌套）
   */
  /**
   * 记录知识库查看次数（显式调用，不在 getById 中自动增加）
   */
  incrementView: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await incrementKnowledgeView(input.id);
      return { success: true };
    }),

  create: protectedProcedure
    .input(
      z.object({
        // 层级结构
        parentId: z.number().nullable().optional(),
        level: z.number().min(1).max(6).default(1),
        path: z.string().max(500).optional(),
        order: z.number().default(0),

        // 模块和分类
        module: z.string().min(1).max(100).default("skin_care"),
        category: z.string().max(100).optional(),
        subCategory: z.string().max(100).optional(),

        // 内容
        title: z.string().min(1).max(200),
        summary: z.string().max(10000).optional(),
        content: z.string().min(1).max(100000),

        // 多维度内容（JSON格式）
        positiveEvidence: z.string().max(50000).optional(), // JSON数组
        negativeEvidence: z.string().max(50000).optional(), // JSON数组
        neutralAnalysis: z.string().max(50000).optional(),
        practicalGuide: z.string().max(50000).optional(), // JSON数组
        caseStudies: z.string().max(50000).optional(), // JSON数组
        expertOpinions: z.string().max(50000).optional(), // JSON数组

        // 多媒体
        images: z.string().max(50000).optional(), // JSON数组
        videos: z.string().max(50000).optional(), // JSON数组
        audio: z.string().max(50000).optional(), // JSON数组

        // 元数据
        tags: z.array(z.string().max(100)).optional(),
        sources: z.string().max(50000).optional(), // JSON数组
        credibility: z.number().min(1).max(10).optional().default(5),
        difficulty: z
          .enum(["beginner", "intermediate", "advanced"])
          .optional()
          .default("beginner"),

        // 状态
        type: z.enum(["customer", "internal"]).default("customer"),
        isActive: z.number().optional().default(1),
      })
    )
    .mutation(async ({ input }) => {
      const { tags, ...rest } = input;

      const data: any = {
        ...rest,
        tags: tags ? JSON.stringify(tags) : null,
      };

      await createKnowledge(data);
      return { success: true };
    }),

  /**
   * 更新知识库
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        // 层级结构
        parentId: z.number().nullable().optional(),
        level: z.number().min(1).max(6).optional(),
        path: z.string().max(500).optional(),
        order: z.number().optional(),

        // 模块和分类
        module: z.string().max(100).optional(),
        category: z.string().max(100).optional(),
        subCategory: z.string().max(100).optional(),

        // 内容
        title: z.string().min(1).max(200).optional(),
        summary: z.string().max(10000).optional(),
        content: z.string().min(1).max(100000).optional(),

        // 多维度内容
        positiveEvidence: z.string().max(50000).optional(),
        negativeEvidence: z.string().max(50000).optional(),
        neutralAnalysis: z.string().max(50000).optional(),
        practicalGuide: z.string().max(50000).optional(),
        caseStudies: z.string().max(50000).optional(),
        expertOpinions: z.string().max(50000).optional(),

        // 多媒体
        images: z.string().max(50000).optional(),
        videos: z.string().max(50000).optional(),
        audio: z.string().max(50000).optional(),

        // 元数据
        tags: z.array(z.string().max(100)).optional(),
        sources: z.string().max(50000).optional(),
        credibility: z.number().min(1).max(10).optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),

        // 状态
        type: z.enum(["customer", "internal"]).optional(),
        isActive: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, tags, ...rest } = input;

      const updateData: any = { ...rest };
      if (tags !== undefined) {
        updateData.tags = JSON.stringify(tags);
      }

      await updateKnowledge(id, updateData);
      return { success: true };
    }),

  /**
   * 删除知识库（软删除）
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteKnowledge(input.id);
      return { success: true };
    }),

  /**
   * 获取激活的知识库（用于 AI 检索）
   */
  getActive: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        type: z.enum(["customer", "internal"]).optional(),
        module: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const knowledge = await getActiveKnowledge(
        input.category,
        input.type,
        input.module
      );
      return knowledge;
    }),

  /**
   * 获取所有模块列表
   */
  getModules: publicProcedure.query(async () => {
    return {
      modules: Object.entries(MODULE_NAMES).map(([key, name]) => ({
        key,
        name,
      })),
    };
  }),
});
