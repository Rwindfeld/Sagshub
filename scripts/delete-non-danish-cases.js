const { Pool } = require('pg');
const readline = require('readline');

// Opsætning af readline interface for brugerinput
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'sagshub',
  password: process.env.DB_PASSWORD || 'wa2657321',
  port: process.env.DB_PORT || 5432,
});

async function main() {
  try {
    console.log('Starter identifikation af ikke-danske sager...');
    
    // Test database forbindelse
    try {
      await pool.query('SELECT 1');
      console.log('Database forbindelse OK');
    } catch (error) {
      console.error('Fejl ved forbindelse til database:', error);
      return;
    }
    
    // Find sager uden dansk tekst med forbedret detektion
    const result = await pool.query(`
      SELECT id, case_number, description, important_notes 
      FROM cases 
      WHERE (
        -- Latinske mønstre
        (description ~* '\\m(lorem|ipsum|dolor|sit|amet|consectetur|adipiscing|elit|sed|do|eiusmod|tempor|incididunt)\\M' OR
         description ~* '\\m(ut|labore|et|dolore|magna|aliqua|enim|ad|minim|veniam|quis|nostrud)\\M' OR
         description ~* '\\m(exercitation|ullamco|laboris|nisi|aliquip|ex|ea|commodo|consequat)\\M')
        OR
        -- Engelsk tekst uden danske tegn
        ((description ~ '[a-zA-Z]{4,}' AND 
          description !~ '[æøåÆØÅéÉ]' AND 
          description ~ '[a-zA-Z]{2,}\s+[a-zA-Z]{2,}')
        OR 
        (important_notes ~ '[a-zA-Z]{4,}' AND 
         important_notes !~ '[æøåÆØÅéÉ]' AND
         important_notes ~ '[a-zA-Z]{2,}\s+[a-zA-Z]{2,}'))
      )
    `);

    console.log(`Fandt ${result.rows.length} sager uden dansk tekst`);

    // Vis sagerne der vil blive slettet
    for (const case_ of result.rows) {
      console.log(`\nSag ${case_.case_number}:`);
      console.log('Beskrivelse:', case_.description);
      if (case_.important_notes) {
        console.log('Bemærkninger:', case_.important_notes);
      }
    }

    // Bekræftelse før sletning
    console.log(`\nEr du sikker på at du vil slette disse ${result.rows.length} sager?`);
    
    // Vent på brugerbekræftelse
    const answer = await new Promise((resolve) => {
      rl.question('Skriv "JA" for at bekræfte sletning: ', (answer) => {
        resolve(answer.trim().toUpperCase());
      });
    });

    if (answer !== 'JA') {
      console.log('Sletning afbrudt');
      rl.close();
      await pool.end();
      process.exit(0);
    }

    // Slet sagerne i batch
    if (result.rows.length > 0) {
      const ids = result.rows.map(row => row.id);
      await pool.query('DELETE FROM cases WHERE id = ANY($1)', [ids]);
      console.log(`Slettet ${result.rows.length} sager`);
    }

    console.log('\nSletning fuldført');
  } catch (error) {
    console.error('Fejl ved sletning af sager:', error);
  } finally {
    rl.close();
    await pool.end();
    process.exit();
  }
}

console.log('Script starter...');
main().catch(error => {
  console.error('Uventet fejl:', error);
  process.exit(1);
}); 