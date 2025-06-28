import { db } from '../server/db';
import { orders } from '../shared/schema';

async function main() {
  const deleted = await db.delete(orders);
  console.log('Alle ordrer er nu slettet.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}); 