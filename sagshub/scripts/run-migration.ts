import { db } from '../server/storage';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('Kører migration: add_login_info_and_purchase_fields.sql');
    
    // Læs migration filen
    const migrationPath = path.join(__dirname, '../server/migrations/add_login_info_and_purchase_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL statements (hvis der er flere)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    // Kør hver statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Kører:', statement.substring(0, 50) + '...');
        await db.execute(sql.raw(statement));
      }
    }
    
    console.log('Migration gennemført succesfuldt!');
    process.exit(0);
  } catch (error) {
    console.error('Fejl ved migration:', error);
    process.exit(1);
  }
}

runMigration(); 