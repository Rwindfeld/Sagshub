import { db } from '../server/db';
import { cases } from '../shared/schema';
import { sql, eq } from 'drizzle-orm';

async function updateCaseNumbers() {
  try {
    // Hent alle sager sorteret efter ID for at bevare den oprindelige rækkefølge
    const allCases = await db.select().from(cases).orderBy(cases.id);
    console.log(`Fandt ${allCases.length} sager der skal opdateres...`);

    // Opret separate arrays for hver behandlingstype for at bevare deres individuelle rækkefølge
    const repairCases = allCases.filter(c => c.treatment === 'repair');
    const setupCases = allCases.filter(c => c.treatment === 'setup');
    const warrantyCases = allCases.filter(c => c.treatment === 'warranty');
    const otherCases = allCases.filter(c => c.treatment === 'other');

    // Opdater repair sager
    for (let i = 0; i < repairCases.length; i++) {
      const newCaseNumber = `REP${(i + 1).toString().padStart(5, '0')}`;
      await db.update(cases)
        .set({ caseNumber: newCaseNumber })
        .where(eq(cases.id, repairCases[i].id));
      
      if ((i + 1) % 100 === 0) {
        console.log(`Opdateret ${i + 1} repair sager...`);
      }
    }

    // Opdater setup (klargøring) sager
    for (let i = 0; i < setupCases.length; i++) {
      const newCaseNumber = `KLA${(i + 1).toString().padStart(5, '0')}`;
      await db.update(cases)
        .set({ caseNumber: newCaseNumber })
        .where(eq(cases.id, setupCases[i].id));
      
      if ((i + 1) % 100 === 0) {
        console.log(`Opdateret ${i + 1} klargøring sager...`);
      }
    }

    // Opdater warranty (reklamation) sager
    for (let i = 0; i < warrantyCases.length; i++) {
      const newCaseNumber = `REK${(i + 1).toString().padStart(5, '0')}`;
      await db.update(cases)
        .set({ caseNumber: newCaseNumber })
        .where(eq(cases.id, warrantyCases[i].id));
      
      if ((i + 1) % 100 === 0) {
        console.log(`Opdateret ${i + 1} reklamation sager...`);
      }
    }

    // Opdater other (andet) sager
    for (let i = 0; i < otherCases.length; i++) {
      const newCaseNumber = `AND${(i + 1).toString().padStart(5, '0')}`;
      await db.update(cases)
        .set({ caseNumber: newCaseNumber })
        .where(eq(cases.id, otherCases[i].id));
      
      if ((i + 1) % 100 === 0) {
        console.log(`Opdateret ${i + 1} andet sager...`);
      }
    }

    console.log('\nFærdig med at opdatere sagsnumre!');
    console.log(`Totale antal sager opdateret:`);
    console.log(`REP: ${repairCases.length}`);
    console.log(`KLA: ${setupCases.length}`);
    console.log(`AND: ${otherCases.length}`);
    console.log(`REK: ${warrantyCases.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Fejl under opdatering af sagsnumre:', error);
    process.exit(1);
  }
}

// Start opdatering af sagsnumre
updateCaseNumbers(); 