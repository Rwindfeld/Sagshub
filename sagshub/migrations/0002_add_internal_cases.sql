CREATE TABLE "internal_cases" (
    "id" serial PRIMARY KEY NOT NULL,
    "case_id" integer NOT NULL,
    "sender_id" integer NOT NULL,
    "receiver_id" integer NOT NULL,
    "message" text NOT NULL,
    "read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "internal_cases" ADD CONSTRAINT "internal_cases_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE CASCADE ON UPDATE no action;

ALTER TABLE "internal_cases" ADD CONSTRAINT "internal_cases_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "internal_cases" ADD CONSTRAINT "internal_cases_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action; 