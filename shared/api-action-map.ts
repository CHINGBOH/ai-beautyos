/**
 * 前后端「一一调用」配对字典：每个前端操作 ↔ 唯一后端 API（procedure）
 * 通过 actionId 与 hash 在前后端统一识别，便于追溯、打点、校验。
 */

/** 单条配对：API 路径 ↔ actionId ↔ hash */
export type ApiActionEntry = {
  /** tRPC 路径，如 "content.generate" */
  apiPath: string;
  /** 短标识，如 "content-generate"，前后端共用 */
  actionId: string;
  /** 8 位十六进制哈希，由 apiPath 确定生成，前后端一致 */
  hash: string;
  /** 可选：前端用途描述（如按钮/页面） */
  description?: string;
};

/** 确定性字符串哈希（仅用做稳定标识，非加密），前后端结果一致 */
function stableHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h = (h << 5) - h + c;
    h = h & h;
  }
  return ((h >>> 0) % 0xffffffff).toString(16).slice(0, 8);
}

/** 所有 API 与 action 的配对表（与 server/routers 一一对应） */
const ENTRIES: ApiActionEntry[] = [
  { apiPath: "system.health", actionId: "system-health", hash: stableHash("system.health"), description: "健康检查" },
  { apiPath: "system.notifyOwner", actionId: "system-notify-owner", hash: stableHash("system.notifyOwner"), description: "通知管理员" },
  { apiPath: "auth.me", actionId: "auth-me", hash: stableHash("auth.me"), description: "当前用户" },
  { apiPath: "auth.logout", actionId: "auth-logout", hash: stableHash("auth.logout"), description: "登出" },
  { apiPath: "chat.createSession", actionId: "chat-create-session", hash: stableHash("chat.createSession"), description: "创建会话" },
  { apiPath: "chat.sendMessage", actionId: "chat-send-message", hash: stableHash("chat.sendMessage"), description: "发送消息" },
  { apiPath: "chat.getHistory", actionId: "chat-get-history", hash: stableHash("chat.getHistory"), description: "对话历史" },
  { apiPath: "chat.getConversations", actionId: "chat-get-conversations", hash: stableHash("chat.getConversations"), description: "会话列表" },
  { apiPath: "chat.getMessages", actionId: "chat-get-messages", hash: stableHash("chat.getMessages"), description: "消息列表" },
  { apiPath: "chat.convertToLead", actionId: "chat-convert-to-lead", hash: stableHash("chat.convertToLead"), description: "转为线索" },
  { apiPath: "admin.saveAirtableConfig", actionId: "admin-save-airtable-config", hash: stableHash("admin.saveAirtableConfig"), description: "保存 Airtable 配置" },
  { apiPath: "admin.getAirtableConfig", actionId: "admin-get-airtable-config", hash: stableHash("admin.getAirtableConfig"), description: "获取 Airtable 配置" },
  { apiPath: "admin.testAirtableConnection", actionId: "admin-test-airtable-connection", hash: stableHash("admin.testAirtableConnection"), description: "测试 Airtable 连接" },
  { apiPath: "admin.setupAirtableTables", actionId: "admin-setup-airtable-tables", hash: stableHash("admin.setupAirtableTables"), description: "初始化 Airtable 表" },
  { apiPath: "analytics.generateLeadsReport", actionId: "analytics-generate-leads-report", hash: stableHash("analytics.generateLeadsReport"), description: "生成线索报告" },
  { apiPath: "analytics.generateCustomerProfile", actionId: "analytics-generate-customer-profile", hash: stableHash("analytics.generateCustomerProfile"), description: "生成客户画像" },
  { apiPath: "analytics.generateMarketingSuggestions", actionId: "analytics-generate-marketing-suggestions", hash: stableHash("analytics.generateMarketingSuggestions"), description: "营销建议" },
  { apiPath: "analytics.getOverview", actionId: "analytics-get-overview", hash: stableHash("analytics.getOverview"), description: "概览数据" },
  { apiPath: "knowledge.getAll", actionId: "knowledge-get-all", hash: stableHash("knowledge.getAll"), description: "知识库列表" },
  { apiPath: "knowledge.getById", actionId: "knowledge-get-by-id", hash: stableHash("knowledge.getById"), description: "知识详情" },
  { apiPath: "knowledge.getByParentId", actionId: "knowledge-get-by-parent-id", hash: stableHash("knowledge.getByParentId"), description: "按父节点查" },
  { apiPath: "knowledge.getTreeByModule", actionId: "knowledge-get-tree-by-module", hash: stableHash("knowledge.getTreeByModule"), description: "模块知识树" },
  { apiPath: "knowledge.getByPath", actionId: "knowledge-get-by-path", hash: stableHash("knowledge.getByPath"), description: "按路径查" },
  { apiPath: "knowledge.search", actionId: "knowledge-search", hash: stableHash("knowledge.search"), description: "知识搜索" },
  { apiPath: "knowledge.create", actionId: "knowledge-create", hash: stableHash("knowledge.create"), description: "创建知识" },
  { apiPath: "knowledge.update", actionId: "knowledge-update", hash: stableHash("knowledge.update"), description: "更新知识" },
  { apiPath: "knowledge.delete", actionId: "knowledge-delete", hash: stableHash("knowledge.delete"), description: "删除知识" },
  { apiPath: "knowledge.getActive", actionId: "knowledge-get-active", hash: stableHash("knowledge.getActive"), description: "启用知识" },
  { apiPath: "knowledge.getModules", actionId: "knowledge-get-modules", hash: stableHash("knowledge.getModules"), description: "知识模块" },
  { apiPath: "learningPath.generateByQuestion", actionId: "learning-path-generate-by-question", hash: stableHash("learningPath.generateByQuestion"), description: "按问题生成学习路径" },
  { apiPath: "learningPath.generateByGoal", actionId: "learning-path-generate-by-goal", hash: stableHash("learningPath.generateByGoal"), description: "按目标生成" },
  { apiPath: "learningPath.getRecommendedPaths", actionId: "learning-path-get-recommended-paths", hash: stableHash("learningPath.getRecommendedPaths"), description: "推荐路径" },
  { apiPath: "vectorSearch.capability", actionId: "vector-search-capability", hash: stableHash("vectorSearch.capability"), description: "向量能力" },
  { apiPath: "vectorSearch.search", actionId: "vector-search-search", hash: stableHash("vectorSearch.search"), description: "向量搜索" },
  { apiPath: "vectorSearch.indexContent", actionId: "vector-search-index-content", hash: stableHash("vectorSearch.indexContent"), description: "索引内容" },
  { apiPath: "vectorSearch.batchIndex", actionId: "vector-search-batch-index", hash: stableHash("vectorSearch.batchIndex"), description: "批量索引" },
  { apiPath: "vectorSearch.getStats", actionId: "vector-search-get-stats", hash: stableHash("vectorSearch.getStats"), description: "向量统计" },
  { apiPath: "adaptiveLearning.generatePath", actionId: "adaptive-learning-generate-path", hash: stableHash("adaptiveLearning.generatePath"), description: "生成学习路径" },
  { apiPath: "adaptiveLearning.trackProgress", actionId: "adaptive-learning-track-progress", hash: stableHash("adaptiveLearning.trackProgress"), description: "记录进度" },
  { apiPath: "adaptiveLearning.getProgressStats", actionId: "adaptive-learning-get-progress-stats", hash: stableHash("adaptiveLearning.getProgressStats"), description: "进度统计" },
  { apiPath: "adaptiveLearning.updatePreferences", actionId: "adaptive-learning-update-preferences", hash: stableHash("adaptiveLearning.updatePreferences"), description: "更新偏好" },
  { apiPath: "adaptiveLearning.getRecommendations", actionId: "adaptive-learning-get-recommendations", hash: stableHash("adaptiveLearning.getRecommendations"), description: "推荐内容" },
  { apiPath: "adaptiveLearning.getAnalytics", actionId: "adaptive-learning-get-analytics", hash: stableHash("adaptiveLearning.getAnalytics"), description: "学习分析" },
  { apiPath: "content.generate", actionId: "content-generate", hash: stableHash("content.generate"), description: "生成文案" },
  { apiPath: "content.generateImage", actionId: "content-generate-image", hash: stableHash("content.generateImage"), description: "生成配图" },
  { apiPath: "contentEnhanced.getProjects", actionId: "content-enhanced-get-projects", hash: stableHash("contentEnhanced.getProjects"), description: "内容项目列表" },
  { apiPath: "contentEnhanced.generate", actionId: "content-enhanced-generate", hash: stableHash("contentEnhanced.generate"), description: "增强生成文案" },
  { apiPath: "contentEnhanced.generateImage", actionId: "content-enhanced-generate-image", hash: stableHash("contentEnhanced.generateImage"), description: "增强生成配图" },
  { apiPath: "contentEnhanced.getHistory", actionId: "content-enhanced-get-history", hash: stableHash("contentEnhanced.getHistory"), description: "内容历史" },
  { apiPath: "contentEnhanced.analyzeQuality", actionId: "content-enhanced-analyze-quality", hash: stableHash("contentEnhanced.analyzeQuality"), description: "内容质量分析" },
  { apiPath: "contentEnhanced.getWritingTips", actionId: "content-enhanced-get-writing-tips", hash: stableHash("contentEnhanced.getWritingTips"), description: "写作建议" },
  { apiPath: "contentEnhanced.getTemplates", actionId: "content-enhanced-get-templates", hash: stableHash("contentEnhanced.getTemplates"), description: "内容模板" },
  { apiPath: "contentEnhanced.generateFromTemplate", actionId: "content-enhanced-generate-from-template", hash: stableHash("contentEnhanced.generateFromTemplate"), description: "从模板生成" },
  { apiPath: "contentEnhanced.bulkGenerate", actionId: "content-enhanced-bulk-generate", hash: stableHash("contentEnhanced.bulkGenerate"), description: "批量生成" },
  { apiPath: "contentEnhanced.schedulePost", actionId: "content-enhanced-schedule-post", hash: stableHash("contentEnhanced.schedulePost"), description: "预约发布" },
  { apiPath: "customers.list", actionId: "customers-list", hash: stableHash("customers.list"), description: "客户列表" },
  { apiPath: "customers.getById", actionId: "customers-get-by-id", hash: stableHash("customers.getById"), description: "客户详情" },
  { apiPath: "customers.stats", actionId: "customers-stats", hash: stableHash("customers.stats"), description: "客户统计" },
  { apiPath: "xiaohongshu.getPosts", actionId: "xiaohongshu-get-posts", hash: stableHash("xiaohongshu.getPosts"), description: "小红书帖子列表" },
  { apiPath: "xiaohongshu.getPost", actionId: "xiaohongshu-get-post", hash: stableHash("xiaohongshu.getPost"), description: "单帖详情" },
  { apiPath: "xiaohongshu.createPost", actionId: "xiaohongshu-create-post", hash: stableHash("xiaohongshu.createPost"), description: "创建帖子" },
  { apiPath: "xiaohongshu.updatePost", actionId: "xiaohongshu-update-post", hash: stableHash("xiaohongshu.updatePost"), description: "更新帖子" },
  { apiPath: "xiaohongshu.deletePost", actionId: "xiaohongshu-delete-post", hash: stableHash("xiaohongshu.deletePost"), description: "删除帖子" },
  { apiPath: "xiaohongshu.updatePostStats", actionId: "xiaohongshu-update-post-stats", hash: stableHash("xiaohongshu.updatePostStats"), description: "更新帖子统计" },
  { apiPath: "xiaohongshu.getComments", actionId: "xiaohongshu-get-comments", hash: stableHash("xiaohongshu.getComments"), description: "帖子评论" },
  { apiPath: "xiaohongshu.replyComment", actionId: "xiaohongshu-reply-comment", hash: stableHash("xiaohongshu.replyComment"), description: "回复评论" },
  { apiPath: "xiaohongshu.getStats", actionId: "xiaohongshu-get-stats", hash: stableHash("xiaohongshu.getStats"), description: "小红书统计" },
  { apiPath: "adminAi.query", actionId: "admin-ai-query", hash: stableHash("adminAi.query"), description: "管理端 AI 问答" },
  { apiPath: "adminAi.getHistory", actionId: "admin-ai-get-history", hash: stableHash("adminAi.getHistory"), description: "AI 对话历史" },
  { apiPath: "triggers.list", actionId: "triggers-list", hash: stableHash("triggers.list"), description: "触发器列表" },
  { apiPath: "triggers.get", actionId: "triggers-get", hash: stableHash("triggers.get"), description: "触发器详情" },
  { apiPath: "triggers.create", actionId: "triggers-create", hash: stableHash("triggers.create"), description: "创建触发器" },
  { apiPath: "triggers.update", actionId: "triggers-update", hash: stableHash("triggers.update"), description: "更新触发器" },
  { apiPath: "triggers.delete", actionId: "triggers-delete", hash: stableHash("triggers.delete"), description: "删除触发器" },
  { apiPath: "triggers.execute", actionId: "triggers-execute", hash: stableHash("triggers.execute"), description: "执行触发器" },
  { apiPath: "triggers.executions", actionId: "triggers-executions", hash: stableHash("triggers.executions"), description: "执行记录" },
  { apiPath: "triggers.generateCondition", actionId: "triggers-generate-condition", hash: stableHash("triggers.generateCondition"), description: "生成条件" },
  { apiPath: "wework.testConnection", actionId: "wework-test-connection", hash: stableHash("wework.testConnection"), description: "企微测连" },
  { apiPath: "wework.getConfig", actionId: "wework-get-config", hash: stableHash("wework.getConfig"), description: "企微配置" },
  { apiPath: "wework.saveConfig", actionId: "wework-save-config", hash: stableHash("wework.saveConfig"), description: "保存企微配置" },
  { apiPath: "wework.createContactWay", actionId: "wework-create-contact-way", hash: stableHash("wework.createContactWay"), description: "创建联系渠道" },
  { apiPath: "wework.listContactWays", actionId: "wework-list-contact-ways", hash: stableHash("wework.listContactWays"), description: "联系渠道列表" },
  { apiPath: "wework.deleteContactWay", actionId: "wework-delete-contact-way", hash: stableHash("wework.deleteContactWay"), description: "删除联系渠道" },
  { apiPath: "wework.mockAddCustomer", actionId: "wework-mock-add-customer", hash: stableHash("wework.mockAddCustomer"), description: "模拟加客" },
  { apiPath: "wework.listCustomers", actionId: "wework-list-customers", hash: stableHash("wework.listCustomers"), description: "企微客户列表" },
  { apiPath: "wework.getCustomer", actionId: "wework-get-customer", hash: stableHash("wework.getCustomer"), description: "企微客户详情" },
  { apiPath: "wework.sendMessage", actionId: "wework-send-message", hash: stableHash("wework.sendMessage"), description: "企微发消息" },
  { apiPath: "wework.listMessages", actionId: "wework-list-messages", hash: stableHash("wework.listMessages"), description: "企微消息列表" },
  { apiPath: "crawler.crawlHtml", actionId: "crawler-crawl-html", hash: stableHash("crawler.crawlHtml"), description: "爬取 HTML" },
  { apiPath: "crawler.crawlHtmlBatch", actionId: "crawler-crawl-html-batch", hash: stableHash("crawler.crawlHtmlBatch"), description: "批量爬 HTML" },
  { apiPath: "crawler.searchPubMed", actionId: "crawler-search-pubmed", hash: stableHash("crawler.searchPubMed"), description: "检索 PubMed" },
  { apiPath: "crawler.crawlPubMed", actionId: "crawler-crawl-pubmed", hash: stableHash("crawler.crawlPubMed"), description: "爬取 PubMed" },
  { apiPath: "crawler.searchCNKI", actionId: "crawler-search-cnki", hash: stableHash("crawler.searchCNKI"), description: "检索知网" },
  { apiPath: "crawler.crawlCNKI", actionId: "crawler-crawl-cnki", hash: stableHash("crawler.crawlCNKI"), description: "爬取知网" },
  { apiPath: "crawler.crawlMedicalBeautyProject", actionId: "crawler-crawl-medical-beauty-project", hash: stableHash("crawler.crawlMedicalBeautyProject"), description: "爬医美项目" },
  { apiPath: "crawler.crawlMedicalBeautyCase", actionId: "crawler-crawl-medical-beauty-case", hash: stableHash("crawler.crawlMedicalBeautyCase"), description: "爬医美案例" },
  { apiPath: "crawler.crawlJsonApi", actionId: "crawler-crawl-json-api", hash: stableHash("crawler.crawlJsonApi"), description: "爬 JSON API" },
  { apiPath: "website.getPageContent", actionId: "website-get-page-content", hash: stableHash("website.getPageContent"), description: "页面内容" },
  { apiPath: "website.getContentById", actionId: "website-get-content-by-id", hash: stableHash("website.getContentById"), description: "按 ID 取内容" },
  { apiPath: "website.createContent", actionId: "website-create-content", hash: stableHash("website.createContent"), description: "创建内容" },
  { apiPath: "website.updateContent", actionId: "website-update-content", hash: stableHash("website.updateContent"), description: "更新内容" },
  { apiPath: "website.deleteContent", actionId: "website-delete-content", hash: stableHash("website.deleteContent"), description: "删除内容" },
  { apiPath: "website.getButtonContent", actionId: "website-get-button-content", hash: stableHash("website.getButtonContent"), description: "按钮文案" },
  { apiPath: "website.getEffectShowcaseImage", actionId: "website-get-effect-showcase-image", hash: stableHash("website.getEffectShowcaseImage"), description: "超皮秒效果展示图（火山文生图）" },
  { apiPath: "website.getNavigation", actionId: "website-get-navigation", hash: stableHash("website.getNavigation"), description: "导航列表" },
  { apiPath: "website.getNavigationByNavKey", actionId: "website-get-navigation-by-nav-key", hash: stableHash("website.getNavigationByNavKey"), description: "按 key 取导航" },
  { apiPath: "website.createNavigation", actionId: "website-create-navigation", hash: stableHash("website.createNavigation"), description: "创建导航" },
  { apiPath: "website.updateNavigation", actionId: "website-update-navigation", hash: stableHash("website.updateNavigation"), description: "更新导航" },
  { apiPath: "website.deleteNavigation", actionId: "website-delete-navigation", hash: stableHash("website.deleteNavigation"), description: "删除导航" },
];

const byPath = new Map<string, ApiActionEntry>();
const byActionId = new Map<string, ApiActionEntry>();
const byHash = new Map<string, ApiActionEntry>();
for (const e of ENTRIES) {
  byPath.set(e.apiPath, e);
  byActionId.set(e.actionId, e);
  byHash.set(e.hash, e);
}

/** 按 tRPC 路径取配对信息 */
export function getByApiPath(apiPath: string): ApiActionEntry | undefined {
  return byPath.get(apiPath);
}

/** 按 actionId 取配对信息 */
export function getByActionId(actionId: string): ApiActionEntry | undefined {
  return byActionId.get(actionId);
}

/** 按 hash 取配对信息 */
export function getByHash(hash: string): ApiActionEntry | undefined {
  return byHash.get(hash);
}

/** 当前字典中所有配对（只读） */
export function getAllApiActionEntries(): ReadonlyArray<ApiActionEntry> {
  return ENTRIES;
}

/** 为任意 apiPath 生成与字典一致的 hash（用于未收录的 procedure） */
export function computeHash(apiPath: string): string {
  let h = 0;
  for (let i = 0; i < apiPath.length; i++) {
    const c = apiPath.charCodeAt(i);
    h = (h << 5) - h + c;
    h = h & h;
  }
  return ((h >>> 0) % 0xffffffff).toString(16).slice(0, 8);
}
