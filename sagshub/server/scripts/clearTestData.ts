import { storage } from '../storage';
import { eq } from 'drizzle-orm';

async function clearTestData() {
  try {
    console.log('Sletter alle sager...');
    const cases = await storage.getCases();
    for (const case_ of cases) {
      // Slet status historik først
      const statusHistory = await storage.getCaseStatusHistory(case_.id);
      for (const history of statusHistory) {
        await storage.db.delete(storage.statusHistory).where(eq(storage.statusHistory.id, history.id));
      }
      // Slet sagen
      await storage.db.delete(storage.cases).where(eq(storage.cases.id, case_.id));
    }
    console.log('Alle sager er slettet');

    console.log('Sletter alle RMA sager...');
    const rmas = await storage.getRMAs();
    for (const rma of rmas) {
      // Slet status historik først
      const statusHistory = await storage.getRMAStatusHistory(rma.id);
      for (const history of statusHistory) {
        await storage.db.delete(storage.rmaStatusHistory).where(eq(storage.rmaStatusHistory.id, history.id));
      }
      // Slet RMA sagen
      await storage.db.delete(storage.rmas).where(eq(storage.rmas.id, rma.id));
    }
    console.log('Alle RMA sager er slettet');

    console.log('Sletter alle ordrer...');
    const orders = await storage.getOrders();
    for (const order of orders) {
      await storage.db.delete(storage.orders).where(eq(storage.orders.id, order.id));
    }
    console.log('Alle ordrer er slettet');

    console.log('Sletter alle kunder...');
    const customers = await storage.getCustomers();
    for (const customer of customers) {
      await storage.db.delete(storage.customers).where(eq(storage.customers.id, customer.id));
    }
    console.log('Alle kunder er slettet');

    console.log('Alt test data er slettet!');
  } catch (error) {
    console.error('Fejl ved sletning af test data:', error);
  }
}

clearTestData(); 