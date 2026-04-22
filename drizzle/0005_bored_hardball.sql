CREATE INDEX "idx_conversations_created_at" ON "conversations" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_knowledge_base_module_is_active" ON "knowledge_base" USING btree ("module" varchar_ops,"is_active" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_knowledge_base_type_is_active" ON "knowledge_base" USING btree ("type" varchar_ops,"is_active" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_knowledge_base_parent_id" ON "knowledge_base" USING btree ("parent_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_knowledge_base_path" ON "knowledge_base" USING btree ("path" text_ops);--> statement-breakpoint
CREATE INDEX "idx_knowledge_base_module_is_active_level_order" ON "knowledge_base" USING btree ("module" varchar_ops,"is_active" int4_ops,"level" int4_ops,"order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_leads_created_at" ON "leads" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_leads_phone" ON "leads" USING btree ("phone" varchar_ops);--> statement-breakpoint
CREATE INDEX "idx_leads_birthday" ON "leads" USING btree ("birthday" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_medical_projects_is_active_sort_order" ON "medical_projects" USING btree ("is_active" int4_ops,"sort_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_medical_projects_category_is_active" ON "medical_projects" USING btree ("category" varchar_ops,"is_active" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_messages_conversation_id_created_at" ON "messages" USING btree ("conversation_id" int4_ops,"created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_trigger_executions_trigger_id_executed_at" ON "trigger_executions" USING btree ("trigger_id" int4_ops,"executed_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_triggers_created_at" ON "triggers" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_triggers_is_active_type" ON "triggers" USING btree ("is_active" int4_ops,"type" varchar_ops);--> statement-breakpoint
CREATE INDEX "idx_website_content_page_key_is_active_sort_order" ON "website_content" USING btree ("page_key" varchar_ops,"is_active" int4_ops,"sort_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_website_navigation_is_active_parent_key_sort_order" ON "website_navigation" USING btree ("is_active" int4_ops,"parent_key" varchar_ops,"sort_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_website_navigation_nav_key" ON "website_navigation" USING btree ("nav_key" varchar_ops);--> statement-breakpoint
CREATE INDEX "idx_xiaohongshu_comments_post_id_commented_at" ON "xiaohongshu_comments" USING btree ("post_id" int4_ops,"commented_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_xiaohongshu_content_history_post_id_created_at" ON "xiaohongshu_content_history" USING btree ("post_id" int4_ops,"created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_xiaohongshu_posts_status_created_at" ON "xiaohongshu_posts" USING btree ("status" varchar_ops,"created_at" timestamp_ops);