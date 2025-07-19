import { db } from '../server/db';
import { rma, rmaStatusHistory } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function updateRMAStatuses() {
  try {
    console.log('Starter opdatering af RMA statusser...');
    
    // Opdater RMA statusser
    await db.execute(sql`
      UPDATE rma
      SET status = CASE 
          WHEN random() < 0.15 THEN 'created'
          WHEN random() < 0.30 THEN 'sent_to_supplier'
          WHEN random() < 0.45 THEN 'waiting_supplier'
          WHEN random() < 0.60 THEN 'received_from_supplier'
          WHEN random() < 0.75 THEN 'ready_for_pickup'
          WHEN random() < 0.90 THEN 'completed'
          ELSE 'rejected'
      END
      WHERE status NOT IN (
          'created',
          'sent_to_supplier',
          'waiting_supplier',
          'received_from_supplier',
          'ready_for_pickup',
          'completed',
          'rejected'
      )
    `);

    // Hent alle RMA sager der blev opdateret
    const rmas = await db.select().from(rma);

    // Tilføj status historik for hver RMA sag
    for (const rmaCase of rmas) {
      await db.insert(rmaStatusHistory).values({
        rmaId: rmaCase.id,
        status: rmaCase.status,
        comment: getStatusComment(rmaCase.status),
        createdBy: rmaCase.createdBy
      });
    }
    
    console.log('RMA statusser er blevet opdateret succesfuldt!');
  } catch (error) {
    console.error('Fejl under opdatering af RMA statusser:', error);
    process.exit(1);
  }
}

function getStatusComment(status: string): string {
  switch (status) {
    case 'created':
      return 'RMA sag oprettet';
    case 'sent_to_supplier':
      return 'Produkt sendt til leverandør';
    case 'waiting_supplier':
      return 'Afventer svar fra leverandør';
    case 'received_from_supplier':
      return 'Produkt modtaget fra leverandør';
    case 'ready_for_pickup':
      return 'Produkt klar til afhentning';
    case 'completed':
      return 'RMA sag afsluttet';
    case 'rejected':
      return 'RMA sag afvist';
    default:
      return 'Status opdateret';
  }
}

updateRMAStatuses(); 