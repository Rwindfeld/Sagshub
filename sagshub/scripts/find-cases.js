const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sagshub',
  password: 'wa2657321',
  port: 5432,
});

async function findEnglishCases() {
  try {
    const result = await pool.query(`
      SELECT id, case_number, description, important_notes 
      FROM cases 
      WHERE (description ~ '[a-zA-Z]{4,}' AND description !~ '[æøåÆØÅ]')
      OR (important_notes ~ '[a-zA-Z]{4,}' AND important_notes !~ '[æøåÆØÅ]')
    `);

    console.log('Fandt følgende sager med engelsk tekst:');
    console.log(result.rows);
  } catch (error) {
    console.error('Fejl ved søgning efter engelske sager:', error);
  } finally {
    await pool.end();
    process.exit();
  }
}

findEnglishCases(); 