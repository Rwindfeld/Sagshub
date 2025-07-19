// Simpel migration fix
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sagshub',
  password: 'wa2657321',
  port: 5432,
});

async function fixMigration() {
  try {
    console.log('Starter migration fix...');
    
    // Tjek om kolonnerne eksisterer
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cases' 
      AND column_name IN ('login_info', 'purchased_here', 'purchase_date')
    `);
    
    console.log('Eksisterende kolonner:', result.rows.map(r => r.column_name));
    
    if (result.rows.length < 3) {
      console.log('Tilføjer manglende kolonner...');
      
      // Tilføj kolonnerne en ad gangen
      try {
        await pool.query('ALTER TABLE cases ADD COLUMN IF NOT EXISTS login_info TEXT');
        console.log('✓ login_info tilføjet');
      } catch (e) {
        console.log('login_info eksisterer allerede eller fejl:', e.message);
      }
      
      try {
        await pool.query('ALTER TABLE cases ADD COLUMN IF NOT EXISTS purchased_here BOOLEAN DEFAULT FALSE');
        console.log('✓ purchased_here tilføjet');
      } catch (e) {
        console.log('purchased_here eksisterer allerede eller fejl:', e.message);
      }
      
      try {
        await pool.query('ALTER TABLE cases ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMP');
        console.log('✓ purchase_date tilføjet');
      } catch (e) {
        console.log('purchase_date eksisterer allerede eller fejl:', e.message);
      }
      
      // Opdater eksisterende rækker
      await pool.query('UPDATE cases SET purchased_here = FALSE WHERE purchased_here IS NULL');
      console.log('✓ Eksisterende rækker opdateret');
      
      console.log('Migration gennemført!');
    } else {
      console.log('Alle kolonner eksisterer allerede');
    }
    
  } catch (error) {
    console.error('Fejl ved migration:', error);
  } finally {
    await pool.end();
  }
}

fixMigration(); 