import {
  pgTable,
  check,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  numeric,
  unique,
  index,
  foreignKey,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

export const knowledgeBase = pgTable(
  "knowledge_base",
  {
    id: serial().primaryKey().notNull(),
    type: varchar({ length: 20 }).default("customer").notNull(),
    title: varchar({ length: 255 }).notNull(),
    content: text().notNull(),
    category: varchar({ length: 100 }).notNull(),
    tags: text(),
    embedding: text(),
    viewCount: integer("view_count").default(0).notNull(),
    usedCount: integer("used_count").default(0).notNull(),
    isActive: integer("is_active").default(1).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    embeddingJson: text("embedding_json"),
    qualityScore: numeric("quality_score", { precision: 3, scale: 2 }).default(
      "0.00"
    ),
    estimatedReadTime: integer("estimated_read_time").default(5),
    version: varchar({ length: 20 }).default("1.0"),
    lastReviewedAt: timestamp("last_reviewed_at", { mode: "string" }),
    parentId: integer("parent_id"),
    level: integer().default(1).notNull(),
    path: text(),
    order: integer().default(0).notNull(),
    module: varchar({ length: 50 }).default("skin_care").notNull(),
    subCategory: varchar("sub_category", { length: 100 }),
    summary: text(),
    positiveEvidence: text("positive_evidence"),
    negativeEvidence: text("negative_evidence"),
    neutralAnalysis: text("neutral_analysis"),
    practicalGuide: text("practical_guide"),
    caseStudies: text("case_studies"),
    expertOpinions: text("expert_opinions"),
    images: text(),
    videos: text(),
    audio: text(),
    sources: text(),
    credibility: integer().default(5).notNull(),
    difficulty: varchar({ length: 20 }).default("beginner"),
    likeCount: integer("like_count").default(0).notNull(),
    shareCount: integer("share_count").default(0).notNull(),
  },
  table => [
    index("idx_knowledge_base_module_is_active").using(
      "btree",
      table.module.asc().nullsLast().op("varchar_ops"),
      table.isActive.asc().nullsLast().op("int4_ops")
    ),
    index("idx_knowledge_base_type_is_active").using(
      "btree",
      table.type.asc().nullsLast().op("varchar_ops"),
      table.isActive.asc().nullsLast().op("int4_ops")
    ),
    index("idx_knowledge_base_parent_id").using(
      "btree",
      table.parentId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_knowledge_base_path").using(
      "btree",
      table.path.asc().nullsLast().op("text_ops")
    ),
    index("idx_knowledge_base_module_is_active_level_order").using(
      "btree",
      table.module.asc().nullsLast().op("varchar_ops"),
      table.isActive.asc().nullsLast().op("int4_ops"),
      table.level.asc().nullsLast().op("int4_ops"),
      table.order.asc().nullsLast().op("int4_ops")
    ),
    check("knowledge_base_id_not_null", sql`NOT NULL id`),
    check("knowledge_base_type_not_null", sql`NOT NULL type`),
    check("knowledge_base_title_not_null", sql`NOT NULL title`),
    check("knowledge_base_content_not_null", sql`NOT NULL content`),
    check("knowledge_base_category_not_null", sql`NOT NULL category`),
    check("knowledge_base_view_count_not_null", sql`NOT NULL view_count`),
    check("knowledge_base_used_count_not_null", sql`NOT NULL used_count`),
    check("knowledge_base_is_active_not_null", sql`NOT NULL is_active`),
    check("knowledge_base_created_at_not_null", sql`NOT NULL created_at`),
    check("knowledge_base_updated_at_not_null", sql`NOT NULL updated_at`),
    check("knowledge_base_level_not_null", sql`NOT NULL level`),
    check("knowledge_base_order_not_null", sql`NOT NULL "order"`),
    check("knowledge_base_module_not_null", sql`NOT NULL module`),
    check("knowledge_base_credibility_not_null", sql`NOT NULL credibility`),
    check("knowledge_base_like_count_not_null", sql`NOT NULL like_count`),
    check("knowledge_base_share_count_not_null", sql`NOT NULL share_count`),
  ]
);

export const triggerExecutions = pgTable(
  "trigger_executions",
  {
    id: serial().primaryKey().notNull(),
    triggerId: integer("trigger_id").notNull(),
    leadId: integer("lead_id"),
    executedAt: timestamp("executed_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    status: varchar({ length: 20 }).notNull(),
    result: text(),
    errorMessage: text("error_message"),
  },
  table => [
    index("idx_trigger_executions_trigger_id_executed_at").using(
      "btree",
      table.triggerId.asc().nullsLast().op("int4_ops"),
      table.executedAt.desc().nullsLast().op("timestamp_ops")
    ),
    check("trigger_executions_id_not_null", sql`NOT NULL id`),
    check("trigger_executions_trigger_id_not_null", sql`NOT NULL trigger_id`),
    check("trigger_executions_executed_at_not_null", sql`NOT NULL executed_at`),
    check("trigger_executions_status_not_null", sql`NOT NULL status`),
  ]
);

export const weworkContactWay = pgTable(
  "wework_contact_way",
  {
    id: serial().primaryKey().notNull(),
    configId: varchar("config_id", { length: 100 }).notNull(),
    type: varchar({ length: 10 }).default("single").notNull(),
    scene: varchar({ length: 10 }).default("1").notNull(),
    qrCode: text("qr_code"),
    remark: varchar({ length: 255 }),
    skipVerify: integer("skip_verify").default(1).notNull(),
    state: varchar({ length: 100 }),
    userIds: text("user_ids"),
    isActive: integer("is_active").default(1).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    unique("wework_contact_way_config_id_key").on(table.configId),
    check("wework_contact_way_id_not_null", sql`NOT NULL id`),
    check("wework_contact_way_config_id_not_null", sql`NOT NULL config_id`),
    check("wework_contact_way_type_not_null", sql`NOT NULL type`),
    check("wework_contact_way_scene_not_null", sql`NOT NULL scene`),
    check("wework_contact_way_skip_verify_not_null", sql`NOT NULL skip_verify`),
    check("wework_contact_way_is_active_not_null", sql`NOT NULL is_active`),
    check("wework_contact_way_created_at_not_null", sql`NOT NULL created_at`),
    check("wework_contact_way_updated_at_not_null", sql`NOT NULL updated_at`),
  ]
);

export const weworkMessages = pgTable(
  "wework_messages",
  {
    id: serial().primaryKey().notNull(),
    externalUserId: varchar("external_user_id", { length: 100 }).notNull(),
    sendUserId: varchar("send_user_id", { length: 100 }).notNull(),
    msgType: varchar("msg_type", { length: 20 }).notNull(),
    content: text().notNull(),
    status: varchar({ length: 20 }).default("pending").notNull(),
    errorMsg: text("error_msg"),
    sentAt: timestamp("sent_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    check("wework_messages_id_not_null", sql`NOT NULL id`),
    check(
      "wework_messages_external_user_id_not_null",
      sql`NOT NULL external_user_id`
    ),
    check("wework_messages_send_user_id_not_null", sql`NOT NULL send_user_id`),
    check("wework_messages_msg_type_not_null", sql`NOT NULL msg_type`),
    check("wework_messages_content_not_null", sql`NOT NULL content`),
    check("wework_messages_status_not_null", sql`NOT NULL status`),
    check("wework_messages_created_at_not_null", sql`NOT NULL created_at`),
  ]
);

export const systemConfig = pgTable(
  "system_config",
  {
    id: serial().primaryKey().notNull(),
    configKey: varchar("config_key", { length: 100 }).notNull(),
    configValue: text("config_value"),
    description: text(),
    isActive: integer("is_active").default(1).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    unique("system_config_config_key_key").on(table.configKey),
    check("system_config_id_not_null", sql`NOT NULL id`),
    check("system_config_config_key_not_null", sql`NOT NULL config_key`),
    check("system_config_is_active_not_null", sql`NOT NULL is_active`),
    check("system_config_created_at_not_null", sql`NOT NULL created_at`),
    check("system_config_updated_at_not_null", sql`NOT NULL updated_at`),
  ]
);

export const xiaohongshuPosts = pgTable(
  "xiaohongshu_posts",
  {
    id: serial().primaryKey().notNull(),
    title: varchar({ length: 255 }).notNull(),
    content: text().notNull(),
    images: text(),
    tags: text(),
    contentType: varchar("content_type", { length: 50 }).notNull(),
    project: varchar({ length: 100 }),
    status: varchar({ length: 20 }).default("draft").notNull(),
    publishedAt: timestamp("published_at", { mode: "string" }),
    scheduledAt: timestamp("scheduled_at", { mode: "string" }),
    viewCount: integer("view_count").default(0).notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    commentCount: integer("comment_count").default(0).notNull(),
    shareCount: integer("share_count").default(0).notNull(),
    collectCount: integer("collect_count").default(0).notNull(),
    lastSyncedAt: timestamp("last_synced_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    index("idx_xiaohongshu_posts_status_created_at").using(
      "btree",
      table.status.asc().nullsLast().op("varchar_ops"),
      table.createdAt.desc().nullsLast().op("timestamp_ops")
    ),
    check("xiaohongshu_posts_id_not_null", sql`NOT NULL id`),
    check("xiaohongshu_posts_title_not_null", sql`NOT NULL title`),
    check("xiaohongshu_posts_content_not_null", sql`NOT NULL content`),
    check(
      "xiaohongshu_posts_content_type_not_null",
      sql`NOT NULL content_type`
    ),
    check("xiaohongshu_posts_status_not_null", sql`NOT NULL status`),
    check("xiaohongshu_posts_view_count_not_null", sql`NOT NULL view_count`),
    check("xiaohongshu_posts_like_count_not_null", sql`NOT NULL like_count`),
    check(
      "xiaohongshu_posts_comment_count_not_null",
      sql`NOT NULL comment_count`
    ),
    check("xiaohongshu_posts_share_count_not_null", sql`NOT NULL share_count`),
    check(
      "xiaohongshu_posts_collect_count_not_null",
      sql`NOT NULL collect_count`
    ),
    check("xiaohongshu_posts_created_at_not_null", sql`NOT NULL created_at`),
    check("xiaohongshu_posts_updated_at_not_null", sql`NOT NULL updated_at`),
  ]
);

export const xiaohongshuContentHistory = pgTable(
  "xiaohongshu_content_history",
  {
    id: serial().primaryKey().notNull(),
    postId: integer("post_id").notNull(),
    version: integer().default(1).notNull(),
    title: varchar({ length: 255 }).notNull(),
    content: text().notNull(),
    tags: text(),
    contentType: varchar("content_type", { length: 50 }).notNull(),
    project: varchar({ length: 100 }),
    qualityScore: numeric("quality_score", { precision: 5, scale: 2 }),
    validationErrors: text("validation_errors"),
    validationWarnings: text("validation_warnings"),
    generatedBy: varchar("generated_by", { length: 50 })
      .default("ai")
      .notNull(),
    generationParams: text("generation_params"),
    fromCache: integer("from_cache").default(0).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    foreignKey({
      columns: [table.postId],
      foreignColumns: [xiaohongshuPosts.id],
      name: "xiaohongshu_content_history_post_id_fkey",
    }).onDelete("cascade"),
    index("idx_xiaohongshu_content_history_post_id_created_at").using(
      "btree",
      table.postId.asc().nullsLast().op("int4_ops"),
      table.createdAt.desc().nullsLast().op("timestamp_ops")
    ),
    check("xiaohongshu_content_history_id_not_null", sql`NOT NULL id`),
    check(
      "xiaohongshu_content_history_post_id_not_null",
      sql`NOT NULL post_id`
    ),
    check(
      "xiaohongshu_content_history_version_not_null",
      sql`NOT NULL version`
    ),
    check("xiaohongshu_content_history_title_not_null", sql`NOT NULL title`),
    check(
      "xiaohongshu_content_history_content_not_null",
      sql`NOT NULL content`
    ),
    check(
      "xiaohongshu_content_history_content_type_not_null",
      sql`NOT NULL content_type`
    ),
    check(
      "xiaohongshu_content_history_generated_by_not_null",
      sql`NOT NULL generated_by`
    ),
    check(
      "xiaohongshu_content_history_from_cache_not_null",
      sql`NOT NULL from_cache`
    ),
    check(
      "xiaohongshu_content_history_created_at_not_null",
      sql`NOT NULL created_at`
    ),
  ]
);

export const weworkCustomers = pgTable(
  "wework_customers",
  {
    id: serial().primaryKey().notNull(),
    externalUserId: varchar("external_user_id", { length: 100 }).notNull(),
    name: varchar({ length: 100 }),
    avatar: text(),
    type: varchar({ length: 10 }).default("1").notNull(),
    gender: varchar({ length: 10 }).default("0").notNull(),
    unionId: varchar("union_id", { length: 100 }),
    position: varchar({ length: 100 }),
    corpName: varchar("corp_name", { length: 200 }),
    corpFullName: varchar("corp_full_name", { length: 200 }),
    externalProfile: text("external_profile"),
    followUserId: varchar("follow_user_id", { length: 100 }),
    remark: varchar({ length: 255 }),
    description: text(),
    createTime: timestamp("create_time", { mode: "string" }),
    tags: text(),
    state: varchar({ length: 100 }),
    conversationId: integer("conversation_id"),
    leadId: varchar("lead_id", { length: 100 }),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    unique("wework_customers_external_user_id_key").on(table.externalUserId),
    check("wework_customers_id_not_null", sql`NOT NULL id`),
    check(
      "wework_customers_external_user_id_not_null",
      sql`NOT NULL external_user_id`
    ),
    check("wework_customers_type_not_null", sql`NOT NULL type`),
    check("wework_customers_gender_not_null", sql`NOT NULL gender`),
    check("wework_customers_created_at_not_null", sql`NOT NULL created_at`),
    check("wework_customers_updated_at_not_null", sql`NOT NULL updated_at`),
  ]
);

export const conversations = pgTable(
  "conversations",
  {
    id: serial().primaryKey().notNull(),
    sessionId: varchar("session_id", { length: 64 }).notNull(),
    visitorName: varchar("visitor_name", { length: 100 }),
    visitorPhone: varchar("visitor_phone", { length: 20 }),
    visitorWechat: varchar("visitor_wechat", { length: 100 }),
    source: varchar({ length: 50 }).default("web").notNull(),
    status: varchar({ length: 20 }).default("active").notNull(),
    leadId: varchar("lead_id", { length: 100 }),
    psychologyType: varchar("psychology_type", { length: 20 }),
    psychologyTags: text("psychology_tags"),
    budgetLevel: varchar("budget_level", { length: 20 }),
    customerTier: varchar("customer_tier", { length: 10 }),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    index("idx_conversations_created_at").using(
      "btree",
      table.createdAt.desc().nullsLast().op("timestamp_ops")
    ),
    unique("conversations_session_id_key").on(table.sessionId),
    check("conversations_id_not_null", sql`NOT NULL id`),
    check("conversations_session_id_not_null", sql`NOT NULL session_id`),
    check("conversations_source_not_null", sql`NOT NULL source`),
    check("conversations_status_not_null", sql`NOT NULL status`),
    check("conversations_created_at_not_null", sql`NOT NULL created_at`),
    check("conversations_updated_at_not_null", sql`NOT NULL updated_at`),
  ]
);

export const leads = pgTable(
  "leads",
  {
    id: serial().primaryKey().notNull(),
    airtableId: varchar("airtable_id", { length: 100 }),
    name: varchar({ length: 100 }).notNull(),
    phone: varchar({ length: 20 }).notNull(),
    wechat: varchar({ length: 100 }),
    age: integer(),
    hood: varchar({ length: 200 }),
    birthday: timestamp("birthday", { mode: "string" }),
    importantHolidays: text("important_holidays"),
    interestedServices: text("interested_services"),
    budget: varchar({ length: 50 }),
    budgetLevel: varchar("budget_level", { length: 20 }),
    message: text(),
    source: varchar({ length: 50 }).notNull(),
    sourceContent: varchar("source_content", { length: 255 }),
    status: varchar({ length: 50 }).default("new").notNull(),
    psychologyType: varchar("psychology_type", { length: 50 }),
    psychologyTags: text("psychology_tags"),
    customerTier: varchar("customer_tier", { length: 10 }),
    notes: text(),
    followUpDate: timestamp("follow_up_date", { mode: "string" }),
    conversationId: integer("conversation_id"),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    syncedAt: timestamp("synced_at", { mode: "string" }),
    convertedAt: timestamp("converted_at", { mode: "string" }),
    convertedToCustomerId: integer("converted_to_customer_id"),
  },
  table => [
    index("idx_leads_created_at").using(
      "btree",
      table.createdAt.desc().nullsLast().op("timestamp_ops")
    ),
    index("idx_leads_phone").using(
      "btree",
      table.phone.asc().nullsLast().op("varchar_ops")
    ),
    index("idx_leads_birthday").using(
      "btree",
      table.birthday.asc().nullsLast().op("timestamp_ops")
    ),
    unique("leads_airtable_id_key").on(table.airtableId),
    check("leads_id_not_null", sql`NOT NULL id`),
    check("leads_name_not_null", sql`NOT NULL name`),
    check("leads_phone_not_null", sql`NOT NULL phone`),
    check("leads_source_not_null", sql`NOT NULL source`),
    check("leads_status_not_null", sql`NOT NULL status`),
    check("leads_created_at_not_null", sql`NOT NULL created_at`),
    check("leads_updated_at_not_null", sql`NOT NULL updated_at`),
  ]
);

// 客户档案表
export const customers = pgTable(
  "customers",
  {
    id: serial().primaryKey().notNull(),
    name: varchar({ length: 100 }).notNull(),
    phone: varchar({ length: 20 }).notNull(),
    wechat: varchar({ length: 100 }),
    gender: varchar({ length: 10 }).default("0"),
    birthday: timestamp("birthday", { mode: "string" }),
    age: integer(),
    occupation: varchar({ length: 100 }),
    tier: varchar({ length: 20 }).default("normal"),
    totalSpent: integer("total_spent").default(0),
    source: varchar({ length: 50 }),
    notes: text(),
    tags: text(),
    consultantId: integer("consultant_id").references(() => users.id),
    status: varchar({ length: 20 }).default("active"),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    index("idx_customers_phone").using(
      "btree",
      table.phone.asc().nullsLast().op("varchar_ops")
    ),
    index("idx_customers_tier").using(
      "btree",
      table.tier.asc().nullsLast().op("varchar_ops")
    ),
    index("idx_customers_status").using(
      "btree",
      table.status.asc().nullsLast().op("varchar_ops")
    ),
    unique("customers_phone_key").on(table.phone),
  ]
);

// 预约表
export const appointments = pgTable(
  "appointments",
  {
    id: serial().primaryKey().notNull(),
    customerId: integer("customer_id").references(() => customers.id),
    leadId: integer("lead_id").references(() => leads.id),
    serviceDetailId: integer("service_detail_id").references(
      () => serviceDetails.id
    ),
    appointmentTime: timestamp("appointment_time", {
      mode: "string",
    }).notNull(),
    duration: integer(),
    type: varchar({ length: 20 }).default("consultation"),
    status: varchar({ length: 20 }).default("pending"),
    cancelReason: text("cancel_reason"),
    notes: text(),
    doctorId: integer("doctor_id").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    index("idx_appointments_customer_id").using(
      "btree",
      table.customerId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_appointments_lead_id").using(
      "btree",
      table.leadId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_appointments_appointment_time").using(
      "btree",
      table.appointmentTime.asc().nullsLast().op("timestamp_ops")
    ),
    index("idx_appointments_status").using(
      "btree",
      table.status.asc().nullsLast().op("varchar_ops")
    ),
  ]
);

// 订单表
export const orders = pgTable(
  "orders",
  {
    id: serial().primaryKey().notNull(),
    customerId: integer("customer_id")
      .references(() => customers.id)
      .notNull(),
    appointmentId: integer("appointment_id").references(() => appointments.id),
    orderNo: varchar("order_no", { length: 50 }).notNull(),
    totalAmount: integer("total_amount").notNull(),
    discountAmount: integer("discount_amount").default(0),
    finalAmount: integer("final_amount").notNull(),
    paymentStatus: varchar("payment_status", { length: 20 }).default("pending"),
    paymentMethod: varchar("payment_method", { length: 20 }),
    paidAt: timestamp("paid_at", { mode: "string" }),
    status: varchar({ length: 20 }).default("active"),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    index("idx_orders_customer_id").using(
      "btree",
      table.customerId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_orders_order_no").using(
      "btree",
      table.orderNo.asc().nullsLast().op("varchar_ops")
    ),
    index("idx_orders_payment_status").using(
      "btree",
      table.paymentStatus.asc().nullsLast().op("varchar_ops")
    ),
    unique("orders_order_no_key").on(table.orderNo),
  ]
);

export const triggers = pgTable(
  "triggers",
  {
    id: serial().primaryKey().notNull(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    type: varchar({ length: 20 }).notNull(),
    timeConfig: text("time_config"),
    behaviorConfig: text("behavior_config"),
    weatherConfig: text("weather_config"),
    action: varchar({ length: 30 }).notNull(),
    actionConfig: text("action_config"),
    targetFilter: text("target_filter"),
    isActive: integer("is_active").default(1).notNull(),
    executionCount: integer("execution_count").default(0).notNull(),
    lastExecutedAt: timestamp("last_executed_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    index("idx_triggers_created_at").using(
      "btree",
      table.createdAt.desc().nullsLast().op("timestamp_ops")
    ),
    index("idx_triggers_is_active_type").using(
      "btree",
      table.isActive.asc().nullsLast().op("int4_ops"),
      table.type.asc().nullsLast().op("varchar_ops")
    ),
    check("triggers_id_not_null", sql`NOT NULL id`),
    check("triggers_name_not_null", sql`NOT NULL name`),
    check("triggers_type_not_null", sql`NOT NULL type`),
    check("triggers_action_not_null", sql`NOT NULL action`),
    check("triggers_is_active_not_null", sql`NOT NULL is_active`),
    check("triggers_execution_count_not_null", sql`NOT NULL execution_count`),
    check("triggers_created_at_not_null", sql`NOT NULL created_at`),
    check("triggers_updated_at_not_null", sql`NOT NULL updated_at`),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: serial().primaryKey().notNull(),
    conversationId: integer("conversation_id").notNull(),
    role: varchar({ length: 20 }).notNull(),
    content: text().notNull(),
    knowledgeUsed: text("knowledge_used"),
    extractedInfo: text("extracted_info"),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    index("idx_messages_conversation_id_created_at").using(
      "btree",
      table.conversationId.asc().nullsLast().op("int4_ops"),
      table.createdAt.asc().nullsLast().op("timestamp_ops")
    ),
    check("messages_id_not_null", sql`NOT NULL id`),
    check("messages_conversation_id_not_null", sql`NOT NULL conversation_id`),
    check("messages_role_not_null", sql`NOT NULL role`),
    check("messages_content_not_null", sql`NOT NULL content`),
    check("messages_created_at_not_null", sql`NOT NULL created_at`),
  ]
);

export const users = pgTable(
  "users",
  {
    id: serial().primaryKey().notNull(),
    openId: varchar({ length: 64 }).notNull(),
    name: text(),
    email: varchar({ length: 320 }),
    loginMethod: varchar({ length: 64 }),
    role: varchar({ length: 20 }).default("user").notNull(),
    createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
    lastSignedIn: timestamp({ mode: "string" }).defaultNow().notNull(),
  },
  table => [
    unique("users_openId_key").on(table.openId),
    check("users_id_not_null", sql`NOT NULL id`),
    check("users_openId_not_null", sql`NOT NULL "openId"`),
    check("users_role_not_null", sql`NOT NULL role`),
    check("users_createdAt_not_null", sql`NOT NULL "createdAt"`),
    check("users_updatedAt_not_null", sql`NOT NULL "updatedAt"`),
    check("users_lastSignedIn_not_null", sql`NOT NULL "lastSignedIn"`),
  ]
);

export const weworkConfig = pgTable(
  "wework_config",
  {
    id: serial().primaryKey().notNull(),
    corpId: varchar("corp_id", { length: 100 }),
    corpSecret: varchar("corp_secret", { length: 200 }),
    agentId: integer("agent_id"),
    token: varchar({ length: 100 }),
    encodingAesKey: varchar("encoding_aes_key", { length: 200 }),
    accessToken: text("access_token"),
    tokenExpiresAt: timestamp("token_expires_at", { mode: "string" }),
    isActive: integer("is_active").default(1).notNull(),
    isMockMode: integer("is_mock_mode").default(1).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    check("wework_config_id_not_null", sql`NOT NULL id`),
    check("wework_config_is_active_not_null", sql`NOT NULL is_active`),
    check("wework_config_is_mock_mode_not_null", sql`NOT NULL is_mock_mode`),
    check("wework_config_created_at_not_null", sql`NOT NULL created_at`),
    check("wework_config_updated_at_not_null", sql`NOT NULL updated_at`),
  ]
);

export const xiaohongshuComments = pgTable(
  "xiaohongshu_comments",
  {
    id: serial().primaryKey().notNull(),
    postId: integer("post_id").notNull(),
    authorName: varchar("author_name", { length: 100 }).notNull(),
    authorAvatar: varchar("author_avatar", { length: 500 }),
    content: text().notNull(),
    replyContent: text("reply_content"),
    replyStatus: varchar("reply_status", { length: 20 })
      .default("pending")
      .notNull(),
    sentiment: varchar({ length: 20 }),
    isFiltered: integer("is_filtered").default(0).notNull(),
    commentedAt: timestamp("commented_at", { mode: "string" }).notNull(),
    repliedAt: timestamp("replied_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    index("idx_xiaohongshu_comments_post_id_commented_at").using(
      "btree",
      table.postId.asc().nullsLast().op("int4_ops"),
      table.commentedAt.desc().nullsLast().op("timestamp_ops")
    ),
    check("xiaohongshu_comments_id_not_null", sql`NOT NULL id`),
    check("xiaohongshu_comments_post_id_not_null", sql`NOT NULL post_id`),
    check(
      "xiaohongshu_comments_author_name_not_null",
      sql`NOT NULL author_name`
    ),
    check("xiaohongshu_comments_content_not_null", sql`NOT NULL content`),
    check(
      "xiaohongshu_comments_reply_status_not_null",
      sql`NOT NULL reply_status`
    ),
    check(
      "xiaohongshu_comments_is_filtered_not_null",
      sql`NOT NULL is_filtered`
    ),
    check(
      "xiaohongshu_comments_commented_at_not_null",
      sql`NOT NULL commented_at`
    ),
    check("xiaohongshu_comments_created_at_not_null", sql`NOT NULL created_at`),
  ]
);

export const userLearningProgress = pgTable(
  "user_learning_progress",
  {
    id: serial().primaryKey().notNull(),
    userId: integer("user_id").notNull(),
    contentId: integer("content_id").notNull(),
    status: varchar({ length: 20 }).default("started").notNull(),
    timeSpent: integer("time_spent").default(0),
    rating: integer(),
    feedback: text(),
    startedAt: timestamp("started_at", { mode: "string" }).defaultNow(),
    completedAt: timestamp("completed_at", { mode: "string" }),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  table => [
    index("idx_user_learning_progress_content_id").using(
      "btree",
      table.contentId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_user_learning_progress_status").using(
      "btree",
      table.status.asc().nullsLast().op("text_ops")
    ),
    index("idx_user_learning_progress_user_id").using(
      "btree",
      table.userId.asc().nullsLast().op("int4_ops")
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "user_learning_progress_user_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.contentId],
      foreignColumns: [knowledgeBase.id],
      name: "user_learning_progress_content_id_fkey",
    }).onDelete("cascade"),
    unique("user_learning_progress_user_id_content_id_key").on(
      table.userId,
      table.contentId
    ),
    check(
      "user_learning_progress_status_check",
      sql`(status)::text = ANY ((ARRAY['started'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'skipped'::character varying])::text[])`
    ),
    check(
      "user_learning_progress_rating_check",
      sql`(rating >= 1) AND (rating <= 5)`
    ),
    check("user_learning_progress_id_not_null", sql`NOT NULL id`),
    check("user_learning_progress_user_id_not_null", sql`NOT NULL user_id`),
    check(
      "user_learning_progress_content_id_not_null",
      sql`NOT NULL content_id`
    ),
    check("user_learning_progress_status_not_null", sql`NOT NULL status`),
  ]
);

export const expertReviews = pgTable(
  "expert_reviews",
  {
    id: serial().primaryKey().notNull(),
    contentId: integer("content_id").notNull(),
    expertId: varchar("expert_id", { length: 100 }).notNull(),
    expertName: varchar("expert_name", { length: 200 }).notNull(),
    credentials: text(),
    reviewDate: timestamp("review_date", { mode: "string" }).defaultNow(),
    overallRating: integer("overall_rating").notNull(),
    comments: text(),
    recommendations: text().array(),
    approved: boolean().default(false),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  table => [
    index("idx_expert_reviews_approved").using(
      "btree",
      table.approved.asc().nullsLast().op("bool_ops")
    ),
    index("idx_expert_reviews_content_id").using(
      "btree",
      table.contentId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_expert_reviews_expert_id").using(
      "btree",
      table.expertId.asc().nullsLast().op("text_ops")
    ),
    foreignKey({
      columns: [table.contentId],
      foreignColumns: [knowledgeBase.id],
      name: "expert_reviews_content_id_fkey",
    }).onDelete("cascade"),
    check(
      "expert_reviews_overall_rating_check",
      sql`(overall_rating >= 1) AND (overall_rating <= 10)`
    ),
    check("expert_reviews_id_not_null", sql`NOT NULL id`),
    check("expert_reviews_content_id_not_null", sql`NOT NULL content_id`),
    check("expert_reviews_expert_id_not_null", sql`NOT NULL expert_id`),
    check("expert_reviews_expert_name_not_null", sql`NOT NULL expert_name`),
    check(
      "expert_reviews_overall_rating_not_null",
      sql`NOT NULL overall_rating`
    ),
  ]
);

export const contentQualityMetrics = pgTable(
  "content_quality_metrics",
  {
    id: serial().primaryKey().notNull(),
    contentId: integer("content_id").notNull(),
    completenessScore: numeric("completeness_score", {
      precision: 3,
      scale: 2,
    }).default("0.00"),
    reliabilityScore: numeric("reliability_score", {
      precision: 3,
      scale: 2,
    }).default("0.00"),
    credibilityScore: numeric("credibility_score", {
      precision: 3,
      scale: 2,
    }).default("0.00"),
    richnessScore: numeric("richness_score", {
      precision: 3,
      scale: 2,
    }).default("0.00"),
    engagementScore: numeric("engagement_score", {
      precision: 3,
      scale: 2,
    }).default("0.00"),
    overallScore: numeric("overall_score", { precision: 3, scale: 2 }).default(
      "0.00"
    ),
    issues: jsonb().default([]),
    recommendations: jsonb().default([]),
    status: varchar({ length: 20 }).default("pending"),
    reviewedBy: varchar("reviewed_by", { length: 100 }),
    reviewedAt: timestamp("reviewed_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  table => [
    index("idx_content_quality_metrics_content_id").using(
      "btree",
      table.contentId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_content_quality_metrics_overall_score").using(
      "btree",
      table.overallScore.asc().nullsLast().op("numeric_ops")
    ),
    index("idx_content_quality_metrics_status").using(
      "btree",
      table.status.asc().nullsLast().op("text_ops")
    ),
    foreignKey({
      columns: [table.contentId],
      foreignColumns: [knowledgeBase.id],
      name: "content_quality_metrics_content_id_fkey",
    }).onDelete("cascade"),
    unique("content_quality_metrics_content_id_key").on(table.contentId),
    check(
      "content_quality_metrics_completeness_score_check",
      sql`(completeness_score >= (0)::numeric) AND (completeness_score <= (1)::numeric)`
    ),
    check(
      "content_quality_metrics_reliability_score_check",
      sql`(reliability_score >= (0)::numeric) AND (reliability_score <= (1)::numeric)`
    ),
    check(
      "content_quality_metrics_credibility_score_check",
      sql`(credibility_score >= (0)::numeric) AND (credibility_score <= (1)::numeric)`
    ),
    check(
      "content_quality_metrics_richness_score_check",
      sql`(richness_score >= (0)::numeric) AND (richness_score <= (1)::numeric)`
    ),
    check(
      "content_quality_metrics_engagement_score_check",
      sql`(engagement_score >= (0)::numeric) AND (engagement_score <= (1)::numeric)`
    ),
    check(
      "content_quality_metrics_overall_score_check",
      sql`(overall_score >= (0)::numeric) AND (overall_score <= (1)::numeric)`
    ),
    check(
      "content_quality_metrics_status_check",
      sql`(status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'needs_revision'::character varying])::text[])`
    ),
    check("content_quality_metrics_id_not_null", sql`NOT NULL id`),
    check(
      "content_quality_metrics_content_id_not_null",
      sql`NOT NULL content_id`
    ),
  ]
);

export const userLearningPreferences = pgTable(
  "user_learning_preferences",
  {
    id: serial().primaryKey().notNull(),
    userId: integer("user_id").notNull(),
    preferredDifficulty: varchar("preferred_difficulty", {
      length: 20,
    }).default("beginner"),
    preferredContentTypes: text("preferred_content_types").array(),
    learningGoals: text("learning_goals").array(),
    timePreference: varchar("time_preference", { length: 20 }).default(
      "medium"
    ),
    interests: text().array(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  },
  table => [
    index("idx_user_learning_preferences_user_id").using(
      "btree",
      table.userId.asc().nullsLast().op("int4_ops")
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "user_learning_preferences_user_id_fkey",
    }).onDelete("cascade"),
    unique("user_learning_preferences_user_id_key").on(table.userId),
    check(
      "user_learning_preferences_preferred_difficulty_check",
      sql`(preferred_difficulty)::text = ANY ((ARRAY['beginner'::character varying, 'intermediate'::character varying, 'advanced'::character varying])::text[])`
    ),
    check(
      "user_learning_preferences_time_preference_check",
      sql`(time_preference)::text = ANY ((ARRAY['short'::character varying, 'medium'::character varying, 'long'::character varying])::text[])`
    ),
    check("user_learning_preferences_id_not_null", sql`NOT NULL id`),
    check("user_learning_preferences_user_id_not_null", sql`NOT NULL user_id`),
  ]
);

export const learningAnalytics = pgTable(
  "learning_analytics",
  {
    id: serial().primaryKey().notNull(),
    userId: integer("user_id").notNull(),
    eventType: varchar("event_type", { length: 50 }).notNull(),
    contentId: integer("content_id"),
    sessionId: varchar("session_id", { length: 100 }),
    metadata: jsonb().default({}),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  },
  table => [
    index("idx_learning_analytics_content_id").using(
      "btree",
      table.contentId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_learning_analytics_created_at").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamp_ops")
    ),
    index("idx_learning_analytics_event_type").using(
      "btree",
      table.eventType.asc().nullsLast().op("text_ops")
    ),
    index("idx_learning_analytics_user_id").using(
      "btree",
      table.userId.asc().nullsLast().op("int4_ops")
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "learning_analytics_user_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.contentId],
      foreignColumns: [knowledgeBase.id],
      name: "learning_analytics_content_id_fkey",
    }).onDelete("set null"),
    check("learning_analytics_id_not_null", sql`NOT NULL id`),
    check("learning_analytics_user_id_not_null", sql`NOT NULL user_id`),
    check("learning_analytics_event_type_not_null", sql`NOT NULL event_type`),
  ]
);

export const websiteContent = pgTable(
  "website_content",
  {
    id: serial("id").primaryKey(),
    pageKey: varchar("page_key", { length: 100 }).notNull(),
    sectionKey: varchar("section_key", { length: 100 }),
    contentType: varchar("content_type", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }),
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    linkUrl: text("link_url"),
    linkText: varchar("link_text", { length: 255 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: integer("is_active").default(1).notNull(),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [
    index("idx_website_content_page_key_is_active_sort_order").using(
      "btree",
      table.pageKey.asc().nullsLast().op("varchar_ops"),
      table.isActive.asc().nullsLast().op("int4_ops"),
      table.sortOrder.asc().nullsLast().op("int4_ops")
    ),
  ]
);

export const medicalProjects = pgTable(
  "medical_projects",
  {
    id: serial().primaryKey().notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    displayName: varchar("display_name", { length: 200 }),
    category: varchar("category", { length: 50 }).notNull(),
    description: text(),
    priceRange: varchar("price_range", { length: 100 }),
    recoveryTime: varchar("recovery_time", { length: 100 }),
    keywords: text(),
    isActive: integer("is_active").default(1).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    index("idx_medical_projects_is_active_sort_order").using(
      "btree",
      table.isActive.asc().nullsLast().op("int4_ops"),
      table.sortOrder.asc().nullsLast().op("int4_ops")
    ),
    index("idx_medical_projects_category_is_active").using(
      "btree",
      table.category.asc().nullsLast().op("varchar_ops"),
      table.isActive.asc().nullsLast().op("int4_ops")
    ),
  ]
);

export const websiteNavigation = pgTable(
  "website_navigation",
  {
    id: serial().primaryKey().notNull(),
    parentKey: varchar("parent_key", { length: 100 }),
    navKey: varchar("nav_key", { length: 100 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    link: varchar("link", { length: 500 }),
    icon: varchar("icon", { length: 50 }),
    description: text(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: integer("is_active").default(1).notNull(),
    isExternal: integer("is_external").default(0).notNull(),
    openInNewTab: integer("open_in_new_tab").default(0).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    index("idx_website_navigation_is_active_parent_key_sort_order").using(
      "btree",
      table.isActive.asc().nullsLast().op("int4_ops"),
      table.parentKey.asc().nullsLast().op("varchar_ops"),
      table.sortOrder.asc().nullsLast().op("int4_ops")
    ),
    index("idx_website_navigation_nav_key").using(
      "btree",
      table.navKey.asc().nullsLast().op("varchar_ops")
    ),
  ]
);

// ==================== 服务项目知识库扩展 ====================

// 服务大类（皮肤管理/注射美容/光电项目/抗衰紧致）
export const serviceCategories = pgTable(
  "service_categories",
  {
    id: serial().primaryKey().notNull(),
    key: varchar("key", { length: 50 }).notNull().unique(), // skin, injection, laser, antiaging
    name: varchar("name", { length: 100 }).notNull(), // 皮肤管理
    displayName: varchar("display_name", { length: 200 }), // 用于展示的完整名称
    description: text(), // 大类描述
    icon: varchar("icon", { length: 50 }), // Lucide icon 名称
    coverImage: text("cover_image"), // 封面图
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: integer("is_active").default(1).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    index("idx_service_categories_key").using(
      "btree",
      table.key.asc().nullsLast().op("varchar_ops")
    ),
    index("idx_service_categories_is_active_sort_order").using(
      "btree",
      table.isActive.asc().nullsLast().op("int4_ops"),
      table.sortOrder.asc().nullsLast().op("int4_ops")
    ),
  ]
);

// 服务子类（水光针/玻尿酸/热玛吉等）
export const serviceSubcategories = pgTable(
  "service_subcategories",
  {
    id: serial().primaryKey().notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => serviceCategories.id),
    key: varchar("key", { length: 50 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    displayName: varchar("display_name", { length: 200 }),
    summary: text(), // 一句话简介
    description: text(), // 详细介绍
    icon: varchar("icon", { length: 50 }),
    coverImage: text("cover_image"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: integer("is_active").default(1).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    index("idx_service_subcategories_category_id").using(
      "btree",
      table.categoryId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_service_subcategories_is_active_sort_order").using(
      "btree",
      table.isActive.asc().nullsLast().op("int4_ops"),
      table.sortOrder.asc().nullsLast().op("int4_ops")
    ),
  ]
);

// 服务项目详情（知识库核心表）
export const serviceDetails = pgTable(
  "service_details",
  {
    id: serial().primaryKey().notNull(),
    subcategoryId: integer("subcategory_id")
      .notNull()
      .references(() => serviceSubcategories.id),
    medicalProjectId: integer("medical_project_id").references(
      () => medicalProjects.id
    ), // 关联 medical_projects

    // 基础信息
    name: varchar("name", { length: 100 }).notNull(),
    fullName: varchar("full_name", { length: 200 }), // 完整名称（含规格）
    slogan: varchar("slogan", { length: 200 }), // 宣传语
    shortDescription: text("short_description"), // 简短描述（列表展示）
    fullDescription: text("full_description"), // 完整描述

    // 适用人群
    indications: text(), // 适应症（JSON数组）
    contraindications: text(), // 禁忌症（JSON数组）
    suitableSkinTypes: text("suitable_skin_types"), // 适合肤质（JSON数组）
    suitableAges: varchar("suitable_ages", { length: 50 }), // 适合年龄段

    // 治疗信息
    treatmentDuration: varchar("treatment_duration", { length: 50 }), // 单次治疗时长
    treatmentInterval: varchar("treatment_interval", { length: 50 }), // 建议间隔
    recommendedCourses: text("recommended_courses"), // 推荐疗程
    recoveryTime: varchar("recovery_time", { length: 100 }), // 恢复期
    painLevel: integer("pain_level"), // 疼痛度 1-10

    // 效果相关
    effects: text(), // 主要效果（JSON数组）
    expectedResults: text("expected_results"), // 预期效果描述
    effectDuration: varchar("effect_duration", { length: 100 }), // 效果维持时间
    beforeAfterNotes: text("before_after_notes"), // 术前术后对比说明

    // 安全信息
    risks: text(), // 可能风险（JSON数组）
    sideEffects: text("side_effects"), // 副作用说明
    precautions: text(), // 注意事项（JSON数组）

    // 护理指南
    preCare: text("pre_care"), // 术前护理
    postCare: text("post_care"), // 术后护理
    dailyCare: text("daily_care"), // 日常护理建议

    // 价格体系
    priceMin: integer("price_min"), // 最低价格
    priceMax: integer("price_max"), // 最高价格
    priceUnit: varchar("price_unit", { length: 20 }).default("次"), // 价格单位
    priceNotes: text("price_notes"), // 价格说明

    // 技术/设备
    technology: text(), // 使用技术
    equipment: text(), // 使用设备
    products: text(), // 使用产品/药剂

    // 内容媒体
    coverImages: text("cover_images"), // 封面图列表（JSON）
    detailImages: text("detail_images"), // 详情页图片（JSON）
    videoUrl: text("video_url"), // 介绍视频

    // SEO/展示
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: text("seo_description"),
    seoKeywords: text("seo_keywords"),

    // 状态
    isRecommended: integer("is_recommended").default(0), // 是否推荐
    isNew: integer("is_new").default(0), // 是否新品
    isHot: integer("is_hot").default(0), // 是否热门
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: integer("is_active").default(1).notNull(),

    // 统计
    viewCount: integer("view_count").default(0),
    consultCount: integer("consult_count").default(0),
    bookingCount: integer("booking_count").default(0),

    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    createdBy: integer("created_by").references(() => users.id),
    updatedBy: integer("updated_by").references(() => users.id),
  },
  table => [
    index("idx_service_details_subcategory_id").using(
      "btree",
      table.subcategoryId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_service_details_medical_project_id").using(
      "btree",
      table.medicalProjectId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_service_details_is_active_sort_order").using(
      "btree",
      table.isActive.asc().nullsLast().op("int4_ops"),
      table.sortOrder.asc().nullsLast().op("int4_ops")
    ),
    index("idx_service_details_is_recommended").using(
      "btree",
      table.isRecommended.asc().nullsLast().op("int4_ops")
    ),
  ]
);

// 服务项目 FAQ
export const serviceFaqs = pgTable(
  "service_faqs",
  {
    id: serial().primaryKey().notNull(),
    serviceDetailId: integer("service_detail_id")
      .notNull()
      .references(() => serviceDetails.id),
    question: text().notNull(),
    answer: text().notNull(),
    category: varchar("category", { length: 50 }), // 问题分类：术前/术中/术后/价格/效果
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: integer("is_active").default(1).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    index("idx_service_faqs_service_detail_id").using(
      "btree",
      table.serviceDetailId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_service_faqs_category").using(
      "btree",
      table.category.asc().nullsLast().op("varchar_ops")
    ),
  ]
);

// 服务项目与医师关联表（哪些医师可以做这个项目）
export const serviceDoctorRelations = pgTable(
  "service_doctor_relations",
  {
    id: serial().primaryKey().notNull(),
    serviceDetailId: integer("service_detail_id")
      .notNull()
      .references(() => serviceDetails.id),
    doctorId: integer("doctor_id")
      .notNull()
      .references(() => users.id), // 假设医师也是 users
    isPrimary: integer("is_primary").default(0), // 是否是主推医师
    expertiseLevel: varchar("expertise_level", { length: 20 }), // expert/senior/junior
    description: text(), // 医师对这个项目的专长描述
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    index("idx_service_doctor_service_detail_id").using(
      "btree",
      table.serviceDetailId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_service_doctor_doctor_id").using(
      "btree",
      table.doctorId.asc().nullsLast().op("int4_ops")
    ),
    unique("idx_service_doctor_unique").on(
      table.serviceDetailId,
      table.doctorId
    ),
  ]
);

// 服务项目与案例关联
export const serviceCaseRelations = pgTable(
  "service_case_relations",
  {
    id: serial().primaryKey().notNull(),
    serviceDetailId: integer("service_detail_id")
      .notNull()
      .references(() => serviceDetails.id),
    caseId: integer("case_id")
      .notNull()
      .references(() => cases.id), // 关联 cases 表
    isFeatured: integer("is_featured").default(0), // 是否精选展示
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    index("idx_service_case_service_detail_id").using(
      "btree",
      table.serviceDetailId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_service_case_case_id").using(
      "btree",
      table.caseId.asc().nullsLast().op("int4_ops")
    ),
  ]
);

// ==================== 真实案例库（Before/After） ====================

// 案例客户信息（脱敏存储）
export const caseCustomers = pgTable(
  "case_customers",
  {
    id: serial().primaryKey().notNull(),

    // 关联真实客户（可为空，保护隐私）
    customerId: integer("customer_id").references(() => customers.id),

    // 脱敏展示信息
    displayName: varchar("display_name", { length: 50 }).notNull(), // 林小姐、张女士
    initial: varchar("initial", { length: 10 }).notNull(), // 林、张
    age: integer(), // 年龄（展示用）
    ageGroup: varchar("age_group", { length: 20 }), // 年龄段：20-25/26-30/31-35...
    occupation: varchar("occupation", { length: 100 }), // 职业（模糊处理）

    // 肤质/基础信息
    skinType: varchar("skin_type", { length: 50 }), // 肤质类型
    skinConcerns: text("skin_concerns"), // 主要皮肤问题（JSON）

    // 隐私控制
    isAnonymous: integer("is_anonymous").default(0), // 是否完全匿名
    showAge: integer("show_age").default(1), // 是否展示年龄
    showOccupation: integer("show_occupation").default(1), // 是否展示职业

    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    index("idx_case_customers_customer_id").using(
      "btree",
      table.customerId.asc().nullsLast().op("int4_ops")
    ),
  ]
);

// 案例主表
export const cases = pgTable(
  "cases",
  {
    id: serial().primaryKey().notNull(),
    caseCustomerId: integer("case_customer_id")
      .notNull()
      .references(() => caseCustomers.id),

    // 案例标题/描述
    title: varchar("title", { length: 200 }).notNull(), // 案例标题：暗沉肌焕新之旅
    subtitle: varchar("subtitle", { length: 300 }), // 副标题
    description: text(), // 案例描述
    shortDescription: text("short_description"), // 简短描述（列表展示）

    // 客户感言
    customerQuote: text("customer_quote"), // 客户原话
    quoteContext: text("quote_context"), // 感言背景（HER MORNING等）

    // 治疗信息
    primaryServiceId: integer("primary_service_id").references(
      () => serviceDetails.id
    ), // 主要项目
    primaryDoctorId: integer("primary_doctor_id").references(() => users.id), // 主刀医师
    treatmentDate: timestamp("treatment_date", { mode: "string" }), // 治疗日期
    recoveryMonths: integer("recovery_months"), // 恢复月数（展示用）

    // 案例分类/标签
    category: varchar("category", { length: 50 }), // 案例分类：皮肤/轮廓/抗衰...
    difficulty: varchar("difficulty", { length: 20 }), // 难度：simple/moderate/complex
    tags: text(), // 标签（JSON）

    // 效果评分
    effectScore: integer("effect_score"), // 效果评分 1-10
    satisfactionScore: integer("satisfaction_score"), // 满意度 1-10

    // 展示控制
    isPublic: integer("is_public").default(0), // 是否公开（必须授权后才能公开）
    isFeatured: integer("is_featured").default(0), // 是否精选
    isOnHomepage: integer("is_on_homepage").default(0), // 是否首页展示
    sortOrder: integer("sort_order").default(0),

    // 统计
    viewCount: integer("view_count").default(0),
    likeCount: integer("like_count").default(0),

    // SEO
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: text("seo_description"),

    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    createdBy: integer("created_by").references(() => users.id), // 录入人
    updatedBy: integer("updated_by").references(() => users.id),
  },
  table => [
    index("idx_cases_case_customer_id").using(
      "btree",
      table.caseCustomerId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_cases_primary_service_id").using(
      "btree",
      table.primaryServiceId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_cases_primary_doctor_id").using(
      "btree",
      table.primaryDoctorId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_cases_category").using(
      "btree",
      table.category.asc().nullsLast().op("varchar_ops")
    ),
    index("idx_cases_is_public_is_featured").using(
      "btree",
      table.isPublic.asc().nullsLast().op("int4_ops"),
      table.isFeatured.asc().nullsLast().op("int4_ops")
    ),
    index("idx_cases_is_on_homepage").using(
      "btree",
      table.isOnHomepage.asc().nullsLast().op("int4_ops")
    ),
  ]
);

// 案例照片表（Before/After 核心表）
export const casePhotos = pgTable(
  "case_photos",
  {
    id: serial().primaryKey().notNull(),
    caseId: integer("case_id")
      .notNull()
      .references(() => cases.id),

    // 照片类型
    photoType: varchar("photo_type", { length: 20 }).notNull(), // before/after/progress
    sequence: integer("sequence").default(0), // 顺序（before=0, progress=1,2,3, after=10）

    // 照片文件
    imageUrl: text("image_url").notNull(), // 图片URL
    thumbnailUrl: text("thumbnail_url"), // 缩略图URL
    highResUrl: text("high_res_url"), // 高清图URL（用于放大查看）

    // 拍摄信息（确保标准化）
    shootingDate: timestamp("shooting_date", { mode: "string" }), // 拍摄日期
    shootingLocation: varchar("shooting_location", { length: 100 }), // 拍摄地点（本院/分院）
    photographerId: integer("photographer_id").references(() => users.id), // 摄影师

    // 拍摄参数（确保同角度对比）
    cameraAngle: varchar("camera_angle", { length: 50 }), // 拍摄角度：front/side45/side90...
    lightingSetup: varchar("lighting_setup", { length: 50 }), // 灯光设置：standard/natural/ring...
    background: varchar("background", { length: 50 }), // 背景：gray/white/black...
    makeupStatus: varchar("makeup_status", { length: 20 }), // 妆容状态：bare/light/heavy

    // 照片说明
    caption: text(), // 照片说明
    notes: text(), // 内部备注（不对外展示）

    // 状态
    isPrimary: integer("is_primary").default(0), // 是否主图
    isPublic: integer("is_public").default(1), // 是否公开
    sortOrder: integer("sort_order").default(0),

    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    index("idx_case_photos_case_id").using(
      "btree",
      table.caseId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_case_photos_photo_type").using(
      "btree",
      table.photoType.asc().nullsLast().op("varchar_ops")
    ),
    index("idx_case_photos_case_id_photo_type").using(
      "btree",
      table.caseId.asc().nullsLast().op("int4_ops"),
      table.photoType.asc().nullsLast().op("varchar_ops")
    ),
  ]
);

// 案例授权书管理（法律合规）
export const caseAuthorizations = pgTable(
  "case_authorizations",
  {
    id: serial().primaryKey().notNull(),
    caseId: integer("case_id")
      .notNull()
      .references(() => cases.id),
    caseCustomerId: integer("case_customer_id")
      .notNull()
      .references(() => caseCustomers.id),

    // 授权书信息
    authorizationType: varchar("authorization_type", { length: 50 }).notNull(), // photo/use/both
    authorizationScope: text("authorization_scope"), // 授权范围：website/social/ads/all

    // 文件
    authorizationFileUrl: text("authorization_file_url"), // 授权书扫描件
    signedDate: timestamp("signed_date", { mode: "string" }), // 签署日期
    expireDate: timestamp("expire_date", { mode: "string" }), // 到期日期（可为空=永久）

    // 验证信息
    idVerified: integer("id_verified").default(0), // 身份证已核验
    idNumberHash: varchar("id_number_hash", { length: 64 }), // 身份证号哈希（脱敏存储）
    faceVerified: integer("face_verified").default(0), // 人脸比对已通过

    // 状态
    status: varchar("status", { length: 20 }).default("active"), // active/expired/revoked
    revokeReason: text("revoke_reason"), // 撤销原因
    revokedAt: timestamp("revoked_at", { mode: "string" }), // 撤销时间

    // 操作人
    createdBy: integer("created_by").references(() => users.id),
    verifiedBy: integer("verified_by").references(() => users.id),

    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    index("idx_case_auth_case_id").using(
      "btree",
      table.caseId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_case_auth_case_customer_id").using(
      "btree",
      table.caseCustomerId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_case_auth_status").using(
      "btree",
      table.status.asc().nullsLast().op("varchar_ops")
    ),
  ]
);

// 案例治疗记录（详细治疗时间线）
export const caseTreatments = pgTable(
  "case_treatments",
  {
    id: serial().primaryKey().notNull(),
    caseId: integer("case_id")
      .notNull()
      .references(() => cases.id),

    // 治疗信息
    serviceDetailId: integer("service_detail_id").references(
      () => serviceDetails.id
    ), // 使用的服务项目
    doctorId: integer("doctor_id").references(() => users.id), // 执行医师
    treatmentDate: timestamp("treatment_date", { mode: "string" }).notNull(), // 治疗日期

    // 治疗详情
    treatmentContent: text("treatment_content"), // 治疗内容
    productsUsed: text("products_used"), // 使用产品（JSON）	dosage: text(), // 用量/剂量
    duration: integer(), // 治疗时长（分钟）

    // 效果记录
    immediateEffect: text("immediate_effect"), // 即刻效果
    customerFeedback: text("customer_feedback"), // 客户反馈

    // 照片记录
    beforePhotoId: integer("before_photo_id").references(() => casePhotos.id),
    afterPhotoId: integer("after_photo_id").references(() => casePhotos.id),

    // 状态
    isFollowUp: integer("is_follow_up").default(0), // 是否为复诊
    followUpNumber: integer("follow_up_number").default(0), // 第几次复诊

    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  table => [
    index("idx_case_treatments_case_id").using(
      "btree",
      table.caseId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_case_treatments_service_detail_id").using(
      "btree",
      table.serviceDetailId.asc().nullsLast().op("int4_ops")
    ),
    index("idx_case_treatments_treatment_date").using(
      "btree",
      table.treatmentDate.asc().nullsLast().op("timestamp_ops")
    ),
  ]
);

// 类型导出
export type WebsiteContent = typeof websiteContent.$inferSelect;
export type InsertWebsiteContent = typeof websiteContent.$inferInsert;
export type MedicalProject = typeof medicalProjects.$inferSelect;
export type InsertMedicalProject = typeof medicalProjects.$inferInsert;
export type WebsiteNavigation = typeof websiteNavigation.$inferSelect;
export type InsertWebsiteNavigation = typeof websiteNavigation.$inferInsert;

// 服务项目知识库类型导出
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type InsertServiceCategory = typeof serviceCategories.$inferInsert;
export type ServiceSubcategory = typeof serviceSubcategories.$inferSelect;
export type InsertServiceSubcategory = typeof serviceSubcategories.$inferInsert;
export type ServiceDetail = typeof serviceDetails.$inferSelect;
export type InsertServiceDetail = typeof serviceDetails.$inferInsert;
export type ServiceFaq = typeof serviceFaqs.$inferSelect;
export type InsertServiceFaq = typeof serviceFaqs.$inferInsert;
export type ServiceDoctorRelation = typeof serviceDoctorRelations.$inferSelect;
export type InsertServiceDoctorRelation =
  typeof serviceDoctorRelations.$inferInsert;
export type ServiceCaseRelation = typeof serviceCaseRelations.$inferSelect;
export type InsertServiceCaseRelation =
  typeof serviceCaseRelations.$inferInsert;

// 真实案例库类型导出
export type CaseCustomer = typeof caseCustomers.$inferSelect;
export type InsertCaseCustomer = typeof caseCustomers.$inferInsert;
export type Case = typeof cases.$inferSelect;
export type InsertCase = typeof cases.$inferInsert;
export type CasePhoto = typeof casePhotos.$inferSelect;
export type InsertCasePhoto = typeof casePhotos.$inferInsert;
export type CaseAuthorization = typeof caseAuthorizations.$inferSelect;
export type InsertCaseAuthorization = typeof caseAuthorizations.$inferInsert;
export type CaseTreatment = typeof caseTreatments.$inferSelect;
export type InsertCaseTreatment = typeof caseTreatments.$inferInsert;

// CRM 类型导出
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// 缺失的 Insert 类型导出
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = typeof knowledgeBase.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type XiaohongshuPost = typeof xiaohongshuPosts.$inferSelect;
export type InsertXiaohongshuPost = typeof xiaohongshuPosts.$inferInsert;
export type Trigger = typeof triggers.$inferSelect;
export type InsertTrigger = typeof triggers.$inferInsert;
export type TriggerExecution = typeof triggerExecutions.$inferSelect;
export type InsertTriggerExecution = typeof triggerExecutions.$inferInsert;

// ==================== ����ϵ���� ====================

// ������Ŀ֪ʶ���ϵ
export const serviceCategoriesRelations = relations(
  serviceCategories,
  ({ many }) => ({
    subcategories: many(serviceSubcategories),
  })
);

export const serviceSubcategoriesRelations = relations(
  serviceSubcategories,
  ({ one, many }) => ({
    category: one(serviceCategories, {
      fields: [serviceSubcategories.categoryId],
      references: [serviceCategories.id],
    }),
    serviceDetails: many(serviceDetails),
  })
);

export const serviceDetailsRelations = relations(
  serviceDetails,
  ({ one, many }) => ({
    subcategory: one(serviceSubcategories, {
      fields: [serviceDetails.subcategoryId],
      references: [serviceSubcategories.id],
    }),
    medicalProject: one(medicalProjects, {
      fields: [serviceDetails.medicalProjectId],
      references: [medicalProjects.id],
    }),
    faqs: many(serviceFaqs),
    doctorRelations: many(serviceDoctorRelations),
    caseRelations: many(serviceCaseRelations),
  })
);

export const serviceFaqsRelations = relations(serviceFaqs, ({ one }) => ({
  serviceDetail: one(serviceDetails, {
    fields: [serviceFaqs.serviceDetailId],
    references: [serviceDetails.id],
  }),
}));

export const serviceDoctorRelationsRelations = relations(
  serviceDoctorRelations,
  ({ one }) => ({
    serviceDetail: one(serviceDetails, {
      fields: [serviceDoctorRelations.serviceDetailId],
      references: [serviceDetails.id],
    }),
    doctor: one(users, {
      fields: [serviceDoctorRelations.doctorId],
      references: [users.id],
    }),
  })
);

// 客户关联关系
export const caseCustomersRelations = relations(
  caseCustomers,
  ({ one, many }) => ({
    customer: one(customers, {
      fields: [caseCustomers.customerId],
      references: [customers.id],
    }),
    cases: many(cases),
    authorizations: many(caseAuthorizations),
  })
);

export const customersRelations = relations(customers, ({ one, many }) => ({
  consultant: one(users, {
    fields: [customers.consultantId],
    references: [users.id],
  }),
  appointments: many(appointments),
  orders: many(orders),
}));

export const appointmentsRelations = relations(
  appointments,
  ({ one, many }) => ({
    customer: one(customers, {
      fields: [appointments.customerId],
      references: [customers.id],
    }),
    lead: one(leads, {
      fields: [appointments.leadId],
      references: [leads.id],
    }),
    serviceDetail: one(serviceDetails, {
      fields: [appointments.serviceDetailId],
      references: [serviceDetails.id],
    }),
    doctor: one(users, {
      fields: [appointments.doctorId],
      references: [users.id],
    }),
    orders: many(orders),
  })
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  appointment: one(appointments, {
    fields: [orders.appointmentId],
    references: [appointments.id],
  }),
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
  caseCustomer: one(caseCustomers, {
    fields: [cases.caseCustomerId],
    references: [caseCustomers.id],
  }),
  primaryService: one(serviceDetails, {
    fields: [cases.primaryServiceId],
    references: [serviceDetails.id],
  }),
  primaryDoctor: one(users, {
    fields: [cases.primaryDoctorId],
    references: [users.id],
  }),
  photos: many(casePhotos),
  authorizations: many(caseAuthorizations),
  treatments: many(caseTreatments),
  serviceRelations: many(serviceCaseRelations),
}));

export const casePhotosRelations = relations(casePhotos, ({ one }) => ({
  case: one(cases, {
    fields: [casePhotos.caseId],
    references: [cases.id],
  }),
}));

export const caseAuthorizationsRelations = relations(
  caseAuthorizations,
  ({ one }) => ({
    case: one(cases, {
      fields: [caseAuthorizations.caseId],
      references: [cases.id],
    }),
    caseCustomer: one(caseCustomers, {
      fields: [caseAuthorizations.caseCustomerId],
      references: [caseCustomers.id],
    }),
  })
);

export const caseTreatmentsRelations = relations(caseTreatments, ({ one }) => ({
  case: one(cases, {
    fields: [caseTreatments.caseId],
    references: [cases.id],
  }),
  serviceDetail: one(serviceDetails, {
    fields: [caseTreatments.serviceDetailId],
    references: [serviceDetails.id],
  }),
  doctor: one(users, {
    fields: [caseTreatments.doctorId],
    references: [users.id],
  }),
  beforePhoto: one(casePhotos, {
    fields: [caseTreatments.beforePhotoId],
    references: [casePhotos.id],
  }),
  afterPhoto: one(casePhotos, {
    fields: [caseTreatments.afterPhotoId],
    references: [casePhotos.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  convertedCustomer: one(customers, {
    fields: [leads.convertedToCustomerId],
    references: [customers.id],
  }),
  appointments: many(appointments),
}));

export const serviceCaseRelationsRelations = relations(
  serviceCaseRelations,
  ({ one }) => ({
    serviceDetail: one(serviceDetails, {
      fields: [serviceCaseRelations.serviceDetailId],
      references: [serviceDetails.id],
    }),
    case: one(cases, {
      fields: [serviceCaseRelations.caseId],
      references: [cases.id],
    }),
  })
);
