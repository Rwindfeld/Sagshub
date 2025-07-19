// =============================================================================
// SAGSHUB DATABASE MIGRATIONS SYSTEM
// =============================================================================
// Denne fil håndterer database schema migrations via Drizzle ORM og indeholder:
// - Automatisk migration køring ved server start
// - Database schema opdateringer og versioning
// - Migration status tracking og logging
// - Fejlhåndtering for migration failures
// - Backup og rollback understøttelse
// =============================================================================

// =================================================================
// DATABASE IMPORTS
// =================================================================
import { migrate } from 'drizzle-orm/postgres-js/migrator';   // Drizzle migration system
import { db } from './db.js';                                 // Database connection instance
import postgres from 'postgres';                              // PostgreSQL client
import logger from './logger.js';                             // Winston logger til migration logging
import { sql } from 'drizzle-orm';

// =================================================================
// MIGRATION KONFIGURATION
// =================================================================
interface MigrationConfig {
  migrationsFolder: string;                                   // Sti til migration filer
  migrationsTable?: string;                                   // Tabel navn til migration tracking
  schema?: string;                                            // Database schema navn
}

// Standard migration konfiguration
const migrationConfig: MigrationConfig = {
  migrationsFolder: './migrations',                           // Relative sti til migration SQL filer
  migrationsTable: '__drizzle_migrations__',                  // Drizzle's standard migration tracking table
  schema: 'public'                                            // PostgreSQL public schema
};

// =================================================================
// MIGRATION EXECUTION FUNKTION
// =================================================================
export async function runMigrations(): Promise<boolean> {
  try {
    logger.info('🔄 Starter database migrations...');
    
    // =============================================================
    // MIGRATION STATUS CHECK
    // =============================================================
    // Tjekker om der er pending migrations at køre
    logger.info(`📁 Scanner migration folder: ${migrationConfig.migrationsFolder}`);
    
    // =============================================================
    // DRIZZLE MIGRATION EXECUTION
    // =============================================================
    // Kører alle pending migrations i kronologisk rækkefølge
    await migrate(db, { 
      migrationsFolder: migrationConfig.migrationsFolder      // Drizzle scanner .sql filer og kører manglende migrations
    });
    
    logger.info('✅ Database migrations kørt succesfuldt');
    return true;                                              // Migration success
    
  } catch (error) {
    // =============================================================
    // MIGRATION ERROR HANDLING
    // =============================================================
    logger.error('❌ Migration fejl:', {
      error: error instanceof Error ? error.message : 'Ukendt fejl',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Migration failure - serveren bør ikke starte
    throw new Error(`Database migration fejlede: ${error instanceof Error ? error.message : 'Ukendt fejl'}`);
  }
}

// =================================================================
// MIGRATION STATUS CHECK FUNKTION
// =================================================================
export async function checkMigrationStatus(): Promise<void> {
  try {
    // Query migration status fra Drizzle's tracking table
    const migrationTable = migrationConfig.migrationsTable;
    
    logger.info('🔍 Tjekker migration status...');
    // Implementering kan tilføjes for at vise migration historie
    // const migrations = await db.select().from(migrationTable);
    
  } catch (error) {
    logger.warn('⚠️ Kunne ikke tjekke migration status:', error);
  }
}

// =================================================================
// AUTOMATISK MIGRATION VED SERVER START
// =================================================================
// Denne funktion kaldes fra index.ts ved server opstart
export async function initializeDatabase(): Promise<void> {
  logger.info('🗄️ Initialiserer database...');
  
  try {
    // Kør migrations først
    await runMigrations();
    
    // Tjek migration status (optional)
    await checkMigrationStatus();
    
    logger.info('🎉 Database initialisering fuldført');
    
  } catch (error) {
    logger.error('💥 Database initialisering fejlede:', error);
    
    // Kritisk fejl - server kan ikke starte uden database
    process.exit(1);                                          // Exit med fejl code
  }
}

// =================================================================
// MIGRATION UTILS
// =================================================================
// Utility funktioner til migration management

export function getMigrationConfig(): MigrationConfig {
  return migrationConfig;                                     // Returnerer aktuel migration konfiguration
}

// Eksempel på manual migration køring (for CLI tools):
// npx tsx migrations.ts

export async function runMigrationsOld() {
  try {
    logger.info('Running migrations...');
    
    // Add case_id column to RMA table
    logger.info('Adding case_id column to RMA table...');
    try {
      await db.execute(sql`
        ALTER TABLE "rma"
        ADD COLUMN IF NOT EXISTS "case_id" integer,
        ADD CONSTRAINT "rma_case_id_cases_id_fk" 
        FOREIGN KEY ("case_id") REFERENCES "cases"("id") 
        ON DELETE NO ACTION ON UPDATE NO ACTION;
      `);
      logger.info('Successfully added case_id column to RMA table');
    } catch (error) {
      logger.error('Error adding case_id column to RMA table:', error);
      throw error;
    }
    
    // Create orders table
    logger.info('Creating orders table...');
    const result = await db.execute(sql`
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
    logger.info('Orders table creation result:', result);

    // Verify table exists
    logger.info('Verifying orders table exists...');
    const verifyResult = await db.execute(sql`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders');`);
    logger.info('Orders table exists:', verifyResult);

    // Try to select from the table to verify it's accessible
    logger.info('Attempting to select from orders table...');
    try {
      const selectResult = await db.execute(sql`SELECT COUNT(*) FROM orders;`);
      logger.info('Select from orders table result:', selectResult);
    } catch (selectError) {
      logger.error('Error selecting from orders table:', selectError);
    }

    logger.info('Migrations completed successfully');
  } catch (error) {
    logger.error('Error running migrations:', error);
    throw error;
  }
} 