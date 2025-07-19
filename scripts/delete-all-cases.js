import pg from 'pg';
import { createInterface } from 'readline';

// Opsætning af readline interface for brugerinput
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const pool = new pg.Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'sagshub',
  password: process.env.DB_PASSWORD || 'wa2657321',
  port: process.env.DB_PORT || 5432,
});

async function main() {
  try {
    console.log('Starter identifikation af alle sager...');
    
    // Test database forbindelse
    try {
      await pool.query('SELECT 1');
      console.log('Database forbindelse OK');
    } catch (error) {
      console.error('Fejl ved forbindelse til database:', error);
      return;
    }
    
    // Tæl antal sager
    const countResult = await pool.query('SELECT COUNT(*) FROM cases');
    const totalCases = parseInt(countResult.rows[0].count);
    
    if (totalCases === 0) {
      console.log('Ingen sager fundet i databasen');
      return;
    }

    console.log(`\nADVARSEL: Dette vil slette ALLE ${totalCases} sager i databasen!`);
    console.log('Dette kan ikke fortrydes!');
    
    // Første bekræftelse
    const firstAnswer = await new Promise((resolve) => {
      rl.question('Skriv "BEKRÆFT" for at fortsætte: ', (answer) => {
        resolve(answer.trim().toUpperCase());
      });
    });

    if (firstAnswer !== 'BEKRÆFT') {
      console.log('Sletning afbrudt');
      rl.close();
      await pool.end();
      process.exit(0);
    }

    // Anden bekræftelse
    console.log('\nDette er din sidste chance for at afbryde!');
    const secondAnswer = await new Promise((resolve) => {
      rl.question('Skriv "SLET ALLE" for at bekræfte sletning: ', (answer) => {
        resolve(answer.trim().toUpperCase());
      });
    });

    if (secondAnswer !== 'SLET ALLE') {
      console.log('Sletning afbrudt');
      rl.close();
      await pool.end();
      process.exit(0);
    }

    // Slet alle sager
    console.log('\nStarter sletning af alle sager...');
    
    // Slet i korrekt rækkefølge for at håndtere foreign key constraints
    console.log('Sletter status historik...');
    await pool.query('DELETE FROM status_history');
    
    console.log('Sletter ordrer...');
    await pool.query('DELETE FROM orders');
    
    console.log('Sletter sager...');
    await pool.query('DELETE FROM cases');
    console.log(`Slettet ${totalCases} sager og relaterede data`);

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