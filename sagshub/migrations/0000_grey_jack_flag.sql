CREATE TABLE "cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_number" text NOT NULL,
	"customer_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"treatment" text NOT NULL,
	"priority" text NOT NULL,
	"device_type" text NOT NULL,
	"accessories" text,
	"important_notes" text,
	"status" text DEFAULT 'created' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text NOT NULL,
	"address" text,
	"city" text,
	"postal_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "rma" (
	"id" serial PRIMARY KEY NOT NULL,
	"rma_number" text NOT NULL,
	"customer_id" integer NOT NULL,
	"description" text NOT NULL,
	"delivery_date" timestamp NOT NULL,
	"sku" text,
	"model" text,
	"serial_number" text,
	"supplier" text,
	"supplier_rma_id" text,
	"shipment_date" timestamp,
	"status" text DEFAULT 'oprettet' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rma_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"rma_id" integer NOT NULL,
	"status" text NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"status" text NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"is_worker" boolean DEFAULT false NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rma" ADD CONSTRAINT "rma_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rma" ADD CONSTRAINT "rma_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rma_status_history" ADD CONSTRAINT "rma_status_history_rma_id_rma_id_fk" FOREIGN KEY ("rma_id") REFERENCES "public"."rma"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rma_status_history" ADD CONSTRAINT "rma_status_history_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;