import { db } from '../db';
import { cases } from '../../shared/schema';
import { sql } from 'drizzle-orm';

async function checkStatus() {
  try {
    console.log('=== Status oversigt ===');
    
    // Total antal sager
    const totalCases = await db.select({ count: sql`COUNT(*)` }).from(cases);
    console.log('Total antal sager:', totalCases[0].count);

    // Status fordeling
    const statusCounts = await db.select({
      status: cases.status,
      count: sql`COUNT(*)`
    })
    .from(cases)
    .groupBy(cases.status);

    console.log('\nStatus fordeling:');
    statusCounts.forEach(s => {
      console.log(`  ${s.status}: ${s.count}`);
    });

    // Completed sager
    const completedCases = await db.select()
      .from(cases)
      .where(sql`status = 'completed'`)
      .orderBy(cases.updatedAt)
      .limit(5);

    console.log('\n=== Completed sager ===');
    console.log('Antal completed sager:', completedCases.length);
    
    if (completedCases.length > 0) {
      console.log('\nFørste 5 completed sager:');
      completedCases.forEach(c => {
        const createdDate = new Date(c.createdAt).toLocaleDateString('da-DK');
        const updatedDate = new Date(c.updatedAt).toLocaleDateString('da-DK');
        console.log(`  Sag ${c.caseNumber}: ${c.status} - oprettet: ${createdDate}, opdateret: ${updatedDate}`);
      });
    }

    // Ready for pickup sager
    const readyForPickupCases = await db.select()
      .from(cases)
      .where(sql`status = 'ready_for_pickup'`)
      .orderBy(cases.updatedAt)
      .limit(5);

    console.log('\n=== Ready for pickup sager ===');
    console.log('Antal ready_for_pickup sager:', readyForPickupCases.length);
    
    if (readyForPickupCases.length > 0) {
      console.log('\nFørste 5 ready_for_pickup sager:');
      readyForPickupCases.forEach(c => {
        const createdDate = new Date(c.createdAt).toLocaleDateString('da-DK');
        const updatedDate = new Date(c.updatedAt).toLocaleDateString('da-DK');
        console.log(`  Sag ${c.caseNumber}: ${c.status} - oprettet: ${createdDate}, opdateret: ${updatedDate}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Fejl under status check:', error);
    process.exit(1);
  }
}

checkStatus(); 