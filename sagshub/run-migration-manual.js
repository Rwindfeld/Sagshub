const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'sagshub',
    password: 'wa2657321',
    port: 5432,
  });

  try {
    await client.connect();
    console.log('Forbundet til database');

    // Tjek om kolonnerne allerede eksisterer
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cases' 
      AND column_name IN ('login_info', 'purchased_here', 'purchase_date')
    `);
    
    console.log('Eksisterende kolonner:', checkColumns.rows);

    if (checkColumns.rows.length === 0) {
      console.log('Tilføjer manglende kolonner...');
      
      // Tilføj kolonnerne
      await client.query(`
        ALTER TABLE cases 
        ADD COLUMN login_info TEXT,
        ADD COLUMN purchased_here BOOLEAN DEFAULT FALSE,
        ADD COLUMN purchase_date TIMESTAMP
      `);
      
      // Opdater eksisterende rækker
      await client.query(`
        UPDATE cases SET purchased_here = FALSE WHERE purchased_here IS NULL
      `);
      
      console.log('✓ Kolonner tilføjet succesfuldt!');
    } else {
      console.log('Kolonnerne eksisterer allerede');
    }

  } catch (error) {
    console.error('Fejl:', error);
  } finally {
    await client.end();
  }
}

runMigration(); 