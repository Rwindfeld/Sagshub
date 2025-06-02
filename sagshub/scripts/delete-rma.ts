import { db } from '../server/db';
import { rma, rmaStatusHistory } from '../shared/schema';

async function deleteRMAs() {
  try {
    console.log('Sletter RMA status historik...');
    await db.delete(rmaStatusHistory);
    console.log('RMA status historik slettet');

    console.log('Sletter RMA sager...');
    await db.delete(rma);
    console.log('RMA sager slettet');

    process.exit(0);
  } catch (error) {
    console.error('Fejl under sletning af RMA sager:', error);
    process.exit(1);
  }
}

deleteRMAs(); 