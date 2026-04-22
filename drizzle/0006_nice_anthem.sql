CREATE TABLE "case_authorizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"case_customer_id" integer NOT NULL,
	"authorization_type" varchar(50) NOT NULL,
	"authorization_scope" text,
	"authorization_file_url" text,
	"signed_date" timestamp,
	"expire_date" timestamp,
	"id_verified" integer DEFAULT 0,
	"id_number_hash" varchar(64),
	"face_verified" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'active',
	"revoke_reason" text,
	"revoked_at" timestamp,
	"created_by" integer,
	"verified_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer,
	"display_name" varchar(50) NOT NULL,
	"initial" varchar(10) NOT NULL,
	"age" integer,
	"age_group" varchar(20),
	"occupation" varchar(100),
	"skin_type" varchar(50),
	"skin_concerns" text,
	"is_anonymous" integer DEFAULT 0,
	"show_age" integer DEFAULT 1,
	"show_occupation" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"photo_type" varchar(20) NOT NULL,
	"sequence" integer DEFAULT 0,
	"image_url" text NOT NULL,
	"thumbnail_url" text,
	"high_res_url" text,
	"shooting_date" timestamp,
	"shooting_location" varchar(100),
	"photographer_id" integer,
	"camera_angle" varchar(50),
	"lighting_setup" varchar(50),
	"background" varchar(50),
	"makeup_status" varchar(20),
	"caption" text,
	"notes" text,
	"is_primary" integer DEFAULT 0,
	"is_public" integer DEFAULT 1,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_treatments" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"service_detail_id" integer,
	"doctor_id" integer,
	"treatment_date" timestamp NOT NULL,
	"treatment_content" text,
	"products_used" text,
	"duration" integer,
	"immediate_effect" text,
	"customer_feedback" text,
	"before_photo_id" integer,
	"after_photo_id" integer,
	"is_follow_up" integer DEFAULT 0,
	"follow_up_number" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_customer_id" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"subtitle" varchar(300),
	"description" text,
	"short_description" text,
	"customer_quote" text,
	"quote_context" text,
	"primary_service_id" integer,
	"primary_doctor_id" integer,
	"treatment_date" timestamp,
	"recovery_months" integer,
	"category" varchar(50),
	"difficulty" varchar(20),
	"tags" text,
	"effect_score" integer,
	"satisfaction_score" integer,
	"is_public" integer DEFAULT 0,
	"is_featured" integer DEFAULT 0,
	"is_on_homepage" integer DEFAULT 0,
	"sort_order" integer DEFAULT 0,
	"view_count" integer DEFAULT 0,
	"like_count" integer DEFAULT 0,
	"seo_title" varchar(200),
	"seo_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "service_case_relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_detail_id" integer NOT NULL,
	"case_id" integer NOT NULL,
	"is_featured" integer DEFAULT 0,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(200),
	"description" text,
	"icon" varchar(50),
	"cover_image" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_categories_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "service_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"subcategory_id" integer NOT NULL,
	"medical_project_id" integer,
	"name" varchar(100) NOT NULL,
	"full_name" varchar(200),
	"slogan" varchar(200),
	"short_description" text,
	"full_description" text,
	"indications" text,
	"contraindications" text,
	"suitable_skin_types" text,
	"suitable_ages" varchar(50),
	"treatment_duration" varchar(50),
	"treatment_interval" varchar(50),
	"recommended_courses" text,
	"recovery_time" varchar(100),
	"pain_level" integer,
	"effects" text,
	"expected_results" text,
	"effect_duration" varchar(100),
	"before_after_notes" text,
	"risks" text,
	"side_effects" text,
	"precautions" text,
	"pre_care" text,
	"post_care" text,
	"daily_care" text,
	"price_min" integer,
	"price_max" integer,
	"price_unit" varchar(20) DEFAULT '次',
	"price_notes" text,
	"technology" text,
	"equipment" text,
	"products" text,
	"cover_images" text,
	"detail_images" text,
	"video_url" text,
	"seo_title" varchar(200),
	"seo_description" text,
	"seo_keywords" text,
	"is_recommended" integer DEFAULT 0,
	"is_new" integer DEFAULT 0,
	"is_hot" integer DEFAULT 0,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"view_count" integer DEFAULT 0,
	"consult_count" integer DEFAULT 0,
	"booking_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "service_doctor_relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_detail_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"is_primary" integer DEFAULT 0,
	"expertise_level" varchar(20),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "idx_service_doctor_unique" UNIQUE("service_detail_id","doctor_id")
);
--> statement-breakpoint
CREATE TABLE "service_faqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_detail_id" integer NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"category" varchar(50),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_subcategories" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"key" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(200),
	"summary" text,
	"description" text,
	"icon" varchar(50),
	"cover_image" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_authorizations" ADD CONSTRAINT "case_authorizations_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_authorizations" ADD CONSTRAINT "case_authorizations_case_customer_id_case_customers_id_fk" FOREIGN KEY ("case_customer_id") REFERENCES "public"."case_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_authorizations" ADD CONSTRAINT "case_authorizations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_authorizations" ADD CONSTRAINT "case_authorizations_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_photos" ADD CONSTRAINT "case_photos_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_photos" ADD CONSTRAINT "case_photos_photographer_id_users_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_treatments" ADD CONSTRAINT "case_treatments_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_treatments" ADD CONSTRAINT "case_treatments_service_detail_id_service_details_id_fk" FOREIGN KEY ("service_detail_id") REFERENCES "public"."service_details"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_treatments" ADD CONSTRAINT "case_treatments_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_treatments" ADD CONSTRAINT "case_treatments_before_photo_id_case_photos_id_fk" FOREIGN KEY ("before_photo_id") REFERENCES "public"."case_photos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_treatments" ADD CONSTRAINT "case_treatments_after_photo_id_case_photos_id_fk" FOREIGN KEY ("after_photo_id") REFERENCES "public"."case_photos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_case_customer_id_case_customers_id_fk" FOREIGN KEY ("case_customer_id") REFERENCES "public"."case_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_primary_service_id_service_details_id_fk" FOREIGN KEY ("primary_service_id") REFERENCES "public"."service_details"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_primary_doctor_id_users_id_fk" FOREIGN KEY ("primary_doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_case_relations" ADD CONSTRAINT "service_case_relations_service_detail_id_service_details_id_fk" FOREIGN KEY ("service_detail_id") REFERENCES "public"."service_details"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_case_relations" ADD CONSTRAINT "service_case_relations_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_details" ADD CONSTRAINT "service_details_subcategory_id_service_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."service_subcategories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_details" ADD CONSTRAINT "service_details_medical_project_id_medical_projects_id_fk" FOREIGN KEY ("medical_project_id") REFERENCES "public"."medical_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_details" ADD CONSTRAINT "service_details_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_details" ADD CONSTRAINT "service_details_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_doctor_relations" ADD CONSTRAINT "service_doctor_relations_service_detail_id_service_details_id_fk" FOREIGN KEY ("service_detail_id") REFERENCES "public"."service_details"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_doctor_relations" ADD CONSTRAINT "service_doctor_relations_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_faqs" ADD CONSTRAINT "service_faqs_service_detail_id_service_details_id_fk" FOREIGN KEY ("service_detail_id") REFERENCES "public"."service_details"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_subcategories" ADD CONSTRAINT "service_subcategories_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_case_auth_case_id" ON "case_authorizations" USING btree ("case_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_case_auth_case_customer_id" ON "case_authorizations" USING btree ("case_customer_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_case_auth_status" ON "case_authorizations" USING btree ("status" varchar_ops);--> statement-breakpoint
CREATE INDEX "idx_case_customers_customer_id" ON "case_customers" USING btree ("customer_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_case_photos_case_id" ON "case_photos" USING btree ("case_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_case_photos_photo_type" ON "case_photos" USING btree ("photo_type" varchar_ops);--> statement-breakpoint
CREATE INDEX "idx_case_photos_case_id_photo_type" ON "case_photos" USING btree ("case_id" int4_ops,"photo_type" varchar_ops);--> statement-breakpoint
CREATE INDEX "idx_case_treatments_case_id" ON "case_treatments" USING btree ("case_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_case_treatments_service_detail_id" ON "case_treatments" USING btree ("service_detail_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_case_treatments_treatment_date" ON "case_treatments" USING btree ("treatment_date" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_cases_case_customer_id" ON "cases" USING btree ("case_customer_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_cases_primary_service_id" ON "cases" USING btree ("primary_service_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_cases_primary_doctor_id" ON "cases" USING btree ("primary_doctor_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_cases_category" ON "cases" USING btree ("category" varchar_ops);--> statement-breakpoint
CREATE INDEX "idx_cases_is_public_is_featured" ON "cases" USING btree ("is_public" int4_ops,"is_featured" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_cases_is_on_homepage" ON "cases" USING btree ("is_on_homepage" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_service_case_service_detail_id" ON "service_case_relations" USING btree ("service_detail_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_service_case_case_id" ON "service_case_relations" USING btree ("case_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_service_categories_key" ON "service_categories" USING btree ("key" varchar_ops);--> statement-breakpoint
CREATE INDEX "idx_service_categories_is_active_sort_order" ON "service_categories" USING btree ("is_active" int4_ops,"sort_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_service_details_subcategory_id" ON "service_details" USING btree ("subcategory_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_service_details_medical_project_id" ON "service_details" USING btree ("medical_project_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_service_details_is_active_sort_order" ON "service_details" USING btree ("is_active" int4_ops,"sort_order" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_service_details_is_recommended" ON "service_details" USING btree ("is_recommended" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_service_doctor_service_detail_id" ON "service_doctor_relations" USING btree ("service_detail_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_service_doctor_doctor_id" ON "service_doctor_relations" USING btree ("doctor_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_service_faqs_service_detail_id" ON "service_faqs" USING btree ("service_detail_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_service_faqs_category" ON "service_faqs" USING btree ("category" varchar_ops);--> statement-breakpoint
CREATE INDEX "idx_service_subcategories_category_id" ON "service_subcategories" USING btree ("category_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_service_subcategories_is_active_sort_order" ON "service_subcategories" USING btree ("is_active" int4_ops,"sort_order" int4_ops);