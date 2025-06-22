import { db } from '../server/db';
import { cases } from '../shared/schema';
import { sql, eq } from 'drizzle-orm';

async function checkCases() {
  try {
    console.log('Checker sager fra hver behandlingstype...\n');

    // Check reparationssager
    const repairCases = await db.select()
      .from(cases)
      .where(sql`case_number LIKE 'REP%'`)
      .orderBy(cases.caseNumber)
      .limit(3);
    
    console.log('Første 3 reparationssager:');
    repairCases.forEach(c => {
      console.log(`${c.caseNumber} - ${c.title}`);
      console.log(`Beskrivelse: ${c.description}\n`);
    });

    // Check klargøringssager
    const setupCases = await db.select()
      .from(cases)
      .where(sql`case_number LIKE 'KLA%'`)
      .orderBy(cases.caseNumber)
      .limit(3);
    
    console.log('Første 3 klargøringssager:');
    setupCases.forEach(c => {
      console.log(`${c.caseNumber} - ${c.title}`);
      console.log(`Beskrivelse: ${c.description}\n`);
    });

    // Check reklamationssager
    const warrantyCases = await db.select()
      .from(cases)
      .where(sql`case_number LIKE 'REK%'`)
      .orderBy(cases.caseNumber)
      .limit(3);
    
    console.log('Første 3 reklamationssager:');
    warrantyCases.forEach(c => {
      console.log(`${c.caseNumber} - ${c.title}`);
      console.log(`Beskrivelse: ${c.description}\n`);
    });

    // Check andre sager
    const otherCases = await db.select()
      .from(cases)
      .where(sql`case_number LIKE 'AND%'`)
      .orderBy(cases.caseNumber)
      .limit(3);
    
    console.log('Første 3 andre sager:');
    otherCases.forEach(c => {
      console.log(`${c.caseNumber} - ${c.title}`);
      console.log(`Beskrivelse: ${c.description}\n`);
    });

    // Vis total antal for hver type
    const counts = await db.select({
      type: sql`SUBSTRING(case_number, 1, 3)`,
      count: sql`COUNT(*)`
    })
    .from(cases)
    .groupBy(sql`SUBSTRING(case_number, 1, 3)`);

    console.log('\nTotal antal sager per type:');
    counts.forEach(c => {
      console.log(`${c.type}: ${c.count}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Fejl under check af sager:', error);
    process.exit(1);
  }
}

// Start check af sager
checkCases(); 