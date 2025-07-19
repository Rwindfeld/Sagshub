import { db } from '../server/storage';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function runAllMigrations() {
  // Saml alle migrationsfiler fra begge migrations-mapper
  const migrationDirs = [
    path.join(__dirname, '../migrations'),
    path.join(__dirname, '../server/migrations'),
  ];
  let migrationFiles: string[] = [];
  for (const dir of migrationDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.sql'))
        .map(f => path.join(dir, f));
      migrationFiles = migrationFiles.concat(files);
    }
  }
  // Sorter for at køre i rækkefølge
  migrationFiles.sort();

  for (const file of migrationFiles) {
    console.log('Kører migration:', file);
    const migrationSQL = fs.readFileSync(file, 'utf8');
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.execute(sql.raw(statement));
        } catch (e) {
          console.error('Fejl i migration', file, ':', e.message);
        }
      }
    }
  }
  console.log('Alle migrationer er kørt!');
  process.exit(0);
}

runAllMigrations(); 