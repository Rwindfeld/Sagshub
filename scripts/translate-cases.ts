import { Pool } from 'pg';
import { translateText } from '../server/translate';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sagshub',
  password: 'wa2657321',
  port: 5432,
});

async function main() {
  try {
    console.log('Starter oversættelse af sager...');
    
    // Test database forbindelse
    try {
      await pool.query('SELECT 1');
      console.log('Database forbindelse OK');
    } catch (error) {
      console.error('Fejl ved forbindelse til database:', error);
      return;
    }
    
    // Find sager med engelsk eller latinsk tekst
    const result = await pool.query(`
      SELECT id, case_number, description, important_notes 
      FROM cases 
      WHERE (description ~ '[a-zA-Z]{4,}' AND description !~ '[æøåÆØÅ]')
      OR (important_notes ~ '[a-zA-Z]{4,}' AND important_notes !~ '[æøåÆØÅ]')
    `);

    console.log(`Fandt ${result.rows.length} sager med engelsk/latinsk tekst`);

    // Opdater hver sag med dansk oversættelse
    for (const case_ of result.rows) {
      const translatedDescription = translateText(case_.description);
      const translatedNotes = case_.important_notes ? translateText(case_.important_notes) : null;

      if (translatedDescription !== case_.description || 
          (translatedNotes && translatedNotes !== case_.important_notes)) {
        await pool.query(
          `UPDATE cases 
           SET description = $1, 
               important_notes = $2, 
               updated_at = NOW() 
           WHERE id = $3`,
          [translatedDescription, translatedNotes, case_.id]
        );
        
        console.log(`Opdaterede sag ${case_.case_number}:`);
        console.log('Gammel beskrivelse:', case_.description);
        console.log('Ny beskrivelse:', translatedDescription);
        if (case_.important_notes) {
          console.log('Gamle bemærkninger:', case_.important_notes);
          console.log('Nye bemærkninger:', translatedNotes);
        }
      }
    }

    console.log('Oversættelse fuldført');
  } catch (error) {
    console.error('Fejl ved oversættelse af sager:', error);
  } finally {
    await pool.end();
    process.exit();
  }
}

console.log('Script starter...');
main().catch(error => {
  console.error('Uventet fejl:', error);
  process.exit(1);
}); 