"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../server/db");
const schema_1 = require("../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
async function updateRMAStatuses() {
    try {
        console.log('Starter opdatering af RMA statusser...');
        // Opdater RMA statusser
        await db_1.db.execute((0, drizzle_orm_1.sql) `
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
        const rmas = await db_1.db.select().from(schema_1.rma);
        // Tilføj status historik for hver RMA sag
        for (const rmaCase of rmas) {
            await db_1.db.insert(schema_1.rmaStatusHistory).values({
                rmaId: rmaCase.id,
                status: rmaCase.status,
                comment: getStatusComment(rmaCase.status),
                createdBy: rmaCase.createdBy
            });
        }
        console.log('RMA statusser er blevet opdateret succesfuldt!');
    }
    catch (error) {
        console.error('Fejl under opdatering af RMA statusser:', error);
        process.exit(1);
    }
}
function getStatusComment(status) {
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
