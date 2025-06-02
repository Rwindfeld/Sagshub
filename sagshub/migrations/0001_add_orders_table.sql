CREATE TABLE "orders" (
    "id" serial PRIMARY KEY NOT NULL,
    "order_number" text NOT NULL,
    "customer_id" integer NOT NULL,
    "case_id" integer,
    "rma_id" integer,
    "model" text NOT NULL,
    "serial_number" text,
    "fault_description" text,
    "items_ordered" text NOT NULL,
    "supplier" text NOT NULL,
    "price" text,
    "order_date" timestamp,
    "status" text DEFAULT 'pending' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "created_by" integer NOT NULL
);

ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "orders" ADD CONSTRAINT "orders_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "orders" ADD CONSTRAINT "orders_rma_id_rma_id_fk" FOREIGN KEY ("rma_id") REFERENCES "public"."rma"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action; 