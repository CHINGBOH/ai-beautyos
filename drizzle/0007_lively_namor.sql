CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer,
	"lead_id" integer,
	"service_detail_id" integer,
	"appointment_time" timestamp NOT NULL,
	"duration" integer,
	"type" varchar(20) DEFAULT 'consultation',
	"status" varchar(20) DEFAULT 'pending',
	"cancel_reason" text,
	"notes" text,
	"doctor_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"wechat" varchar(100),
	"gender" varchar(10) DEFAULT '0',
	"birthday" timestamp,
	"age" integer,
	"occupation" varchar(100),
	"tier" varchar(20) DEFAULT 'normal',
	"total_spent" integer DEFAULT 0,
	"source" varchar(50),
	"notes" text,
	"tags" text,
	"consultant_id" integer,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_key" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"appointment_id" integer,
	"order_no" varchar(50) NOT NULL,
	"total_amount" integer NOT NULL,
	"discount_amount" integer DEFAULT 0,
	"final_amount" integer NOT NULL,
	"payment_status" varchar(20) DEFAULT 'pending',
	"payment_method" varchar(20),
	"paid_at" timestamp,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_no_key" UNIQUE("order_no")
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "converted_at" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "converted_to_customer_id" integer;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_detail_id_service_details_id_fk" FOREIGN KEY ("service_detail_id") REFERENCES "public"."service_details"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_consultant_id_users_id_fk" FOREIGN KEY ("consultant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_appointments_customer_id" ON "appointments" USING btree ("customer_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_appointments_lead_id" ON "appointments" USING btree ("lead_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_appointments_appointment_time" ON "appointments" USING btree ("appointment_time" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_appointments_status" ON "appointments" USING btree ("status" varchar_ops);--> statement-breakpoint
CREATE INDEX "idx_customers_phone" ON "customers" USING btree ("phone" varchar_ops);--> statement-breakpoint
CREATE INDEX "idx_customers_tier" ON "customers" USING btree ("tier" varchar_ops);--> statement-breakpoint
CREATE INDEX "idx_customers_status" ON "customers" USING btree ("status" varchar_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_customer_id" ON "orders" USING btree ("customer_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_order_no" ON "orders" USING btree ("order_no" varchar_ops);--> statement-breakpoint
CREATE INDEX "idx_orders_payment_status" ON "orders" USING btree ("payment_status" varchar_ops);--> statement-breakpoint
ALTER TABLE "case_customers" ADD CONSTRAINT "case_customers_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;