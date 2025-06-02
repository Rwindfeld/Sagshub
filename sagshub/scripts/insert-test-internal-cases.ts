import pg from 'pg';
const { Pool } = pg;

// Opret en direkte forbindelse til PostgreSQL databasen
// Bruger samme forbindelsesdetaljer som i server/db.ts
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  // Ingen password, hvis det ikke behøves lokalt
  password: '',
  port: 5432,
});

async function insertTestInternalCases() {
  try {
    console.log("Indsætter test interne sager...");

    // Opretter intern sag fra Rattana (ID 1) til Mike (ID 2) - ulæst
    const result1 = await pool.query(`
      INSERT INTO internal_cases 
        (case_id, sender_id, receiver_id, message, read, created_at, updated_at) 
      VALUES 
        (34, 1, 2, 'Hej Mike, kan du kigge på denne sag hurtigst muligt?', false, NOW(), NOW())
      RETURNING id;
    `);
    console.log("Intern sag 1 oprettet med ID:", result1.rows[0].id);

    // Opretter intern sag fra Anders (ID 3) til Mike (ID 2) - ulæst
    const result2 = await pool.query(`
      INSERT INTO internal_cases 
        (case_id, sender_id, receiver_id, message, read, created_at, updated_at) 
      VALUES 
        (32, 3, 2, 'Hej Mike, jeg har brug for din hjælp med denne reparation.', false, NOW(), NOW())
      RETURNING id;
    `);
    console.log("Intern sag 2 oprettet med ID:", result2.rows[0].id);

    // Opretter intern sag fra Julie (ID 4) til Mike (ID 2) - ulæst
    const result3 = await pool.query(`
      INSERT INTO internal_cases 
        (case_id, sender_id, receiver_id, message, read, created_at, updated_at) 
      VALUES 
        (29, 4, 2, 'Mike, kunden har ringet og spurgt til status. Kan du give en opdatering?', false, NOW(), NOW())
      RETURNING id;
    `);
    console.log("Intern sag 3 oprettet med ID:", result3.rows[0].id);

    console.log("Alle test interne sager er blevet oprettet!");
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("Fejl ved oprettelse af test interne sager:", error);
    await pool.end();
    process.exit(1);
  }
}

insertTestInternalCases(); 