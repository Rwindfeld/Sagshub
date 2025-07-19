import { db } from '../server/db';
import { cases } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function deleteCases() {
  try {
    console.log('Sletter alle eksisterende sager...');
    
    // Slet alle sager
    await db.delete(cases);
    
    console.log('Alle sager er blevet slettet!');
    process.exit(0);
  } catch (error) {
    console.error('Fejl under sletning af sager:', error);
    process.exit(1);
  }
}

// Start sletning af sager
deleteCases(); 