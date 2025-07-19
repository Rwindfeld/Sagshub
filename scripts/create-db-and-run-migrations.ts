import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const adminClient = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres', // Brug admin-database
  password: 'wa2657321',
  port: 5432,
});

async function ensureDatabaseExists() {
  await adminClient.connect();
  const res = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = 'sagshub'");
  if (res.rowCount === 0) {
    console.log('Opretter database: sagshub');
    await adminClient.query('CREATE DATABASE sagshub');
  } else {
    console.log('Databasen sagshub findes allerede');
  }
  await adminClient.end();
}

async function runAllMigrations() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'sagshub',
    password: 'wa2657321',
    port: 5432,
  });
  await client.connect();
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
          await client.query(statement);
        } catch (e) {
          console.error('Fejl i migration', file, ':', e.message);
        }
      }
    }
  }
  await client.end();
  console.log('Alle migrationer er kørt!');
}

(async () => {
  await ensureDatabaseExists();
  await runAllMigrations();
  process.exit(0);
})(); 