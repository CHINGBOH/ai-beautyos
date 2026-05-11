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
import { KNOWLEDGE_MODULES, MODULE_NAMES, DIFFICULTY_LEVELS } from "@shared/types";

export const knowledgeRouter = router({
  /**
   * 获取所有知识库（支持按类型、模块筛选）
   */
  getAll: protectedProcedure
    .input(
      z.object({
        type: z.enum(["customer", "internal"]).optional(),
        module: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const knowledge = await getAllKnowledge(input.type, input.module);
      return knowledge;
    }),

  /**
   * 获取单个知识库详情
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const knowledge = await getKnowledgeById(input.id);
      if (!knowledge) {
        throw new Error("Knowledge not found");
      }
      // 增加查看次数
      await incrementKnowledgeView(input.id);
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
        keyword: z.string().min(1),
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
  create: protectedProcedure
    .input(
      z.object({
        // 层级结构
        parentId: z.number().nullable().optional(),
        level: z.number().min(1).max(6).default(1),
        path: z.string().optional(),
        order: z.number().default(0),
        
        // 模块和分类
        module: z.string().min(1),
        category: z.string().optional(),
        subCategory: z.string().optional(),
        
        // 内容
        title: z.string().min(1),
        summary: z.string().optional(),
        content: z.string().min(1),
        
        // 多维度内容（JSON格式）
        positiveEvidence: z.string().optional(), // JSON数组
        negativeEvidence: z.string().optional(), // JSON数组
        neutralAnalysis: z.string().optional(),
        practicalGuide: z.string().optional(), // JSON数组
        caseStudies: z.string().optional(), // JSON数组
        expertOpinions: z.string().optional(), // JSON数组
        
        // 多媒体
        images: z.string().optional(), // JSON数组
        videos: z.string().optional(), // JSON数组
        audio: z.string().optional(), // JSON数组
        
        // 元数据
        tags: z.array(z.string()).optional(),
        sources: z.string().optional(), // JSON数组
        credibility: z.number().min(1).max(10).optional().default(5),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional().default("beginner"),
        
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
        path: z.string().optional(),
        order: z.number().optional(),
        
        // 模块和分类
        module: z.string().optional(),
        category: z.string().optional(),
        subCategory: z.string().optional(),
        
        // 内容
        title: z.string().min(1).optional(),
        summary: z.string().optional(),
        content: z.string().min(1).optional(),
        
        // 多维度内容
        positiveEvidence: z.string().optional(),
        negativeEvidence: z.string().optional(),
        neutralAnalysis: z.string().optional(),
        practicalGuide: z.string().optional(),
        caseStudies: z.string().optional(),
        expertOpinions: z.string().optional(),
        
        // 多媒体
        images: z.string().optional(),
        videos: z.string().optional(),
        audio: z.string().optional(),
        
        // 元数据
        tags: z.array(z.string()).optional(),
        sources: z.string().optional(),
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
      const knowledge = await getActiveKnowledge(input.category, input.type, input.module);
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
