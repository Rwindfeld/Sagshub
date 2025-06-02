"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const db_1 = require("./db");
const drizzle_orm_1 = require("drizzle-orm");
const logger_1 = require("./logger");
async function runMigrations() {
    try {
        logger_1.logger.info('Running migrations...');
        // Add case_id column to RMA table
        logger_1.logger.info('Adding case_id column to RMA table...');
        try {
            await db_1.db.execute((0, drizzle_orm_1.sql) `
        ALTER TABLE "rma"
        ADD COLUMN IF NOT EXISTS "case_id" integer,
        ADD CONSTRAINT "rma_case_id_cases_id_fk" 
        FOREIGN KEY ("case_id") REFERENCES "cases"("id") 
        ON DELETE NO ACTION ON UPDATE NO ACTION;
      `);
            logger_1.logger.info('Successfully added case_id column to RMA table');
        }
        catch (error) {
            logger_1.logger.error('Error adding case_id column to RMA table:', error);
            throw error;
        }
        // Create orders table
        logger_1.logger.info('Creating orders table...');
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      CREATE TABLE IF NOT EXISTS "orders" (
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
        "created_by" integer NOT NULL,
        CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "orders_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "orders_rma_id_rma_id_fk" FOREIGN KEY ("rma_id") REFERENCES "rma"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      );
    `);
        logger_1.logger.info('Orders table creation result:', result);
        // Verify table exists
        logger_1.logger.info('Verifying orders table exists...');
        const verifyResult = await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders');`);
        logger_1.logger.info('Orders table exists:', verifyResult);
        // Try to select from the table to verify it's accessible
        logger_1.logger.info('Attempting to select from orders table...');
        try {
            const selectResult = await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT COUNT(*) FROM orders;`);
            logger_1.logger.info('Select from orders table result:', selectResult);
        }
        catch (selectError) {
            logger_1.logger.error('Error selecting from orders table:', selectError);
        }
        logger_1.logger.info('Migrations completed successfully');
    }
    catch (error) {
        logger_1.logger.error('Error running migrations:', error);
        throw error;
    }
}
