"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storage_1 = require("../storage");
const drizzle_orm_1 = require("drizzle-orm");
async function clearTestData() {
    try {
        console.log('Sletter alle sager...');
        const cases = await storage_1.storage.getCases();
        for (const case_ of cases) {
            // Slet status historik først
            const statusHistory = await storage_1.storage.getCaseStatusHistory(case_.id);
            for (const history of statusHistory) {
                await storage_1.storage.db.delete(storage_1.storage.statusHistory).where((0, drizzle_orm_1.eq)(storage_1.storage.statusHistory.id, history.id));
            }
            // Slet sagen
            await storage_1.storage.db.delete(storage_1.storage.cases).where((0, drizzle_orm_1.eq)(storage_1.storage.cases.id, case_.id));
        }
        console.log('Alle sager er slettet');
        console.log('Sletter alle RMA sager...');
        const rmas = await storage_1.storage.getRMAs();
        for (const rma of rmas) {
            // Slet status historik først
            const statusHistory = await storage_1.storage.getRMAStatusHistory(rma.id);
            for (const history of statusHistory) {
                await storage_1.storage.db.delete(storage_1.storage.rmaStatusHistory).where((0, drizzle_orm_1.eq)(storage_1.storage.rmaStatusHistory.id, history.id));
            }
            // Slet RMA sagen
            await storage_1.storage.db.delete(storage_1.storage.rmas).where((0, drizzle_orm_1.eq)(storage_1.storage.rmas.id, rma.id));
        }
        console.log('Alle RMA sager er slettet');
        console.log('Sletter alle ordrer...');
        const orders = await storage_1.storage.getOrders();
        for (const order of orders) {
            await storage_1.storage.db.delete(storage_1.storage.orders).where((0, drizzle_orm_1.eq)(storage_1.storage.orders.id, order.id));
        }
        console.log('Alle ordrer er slettet');
        console.log('Sletter alle kunder...');
        const customers = await storage_1.storage.getCustomers();
        for (const customer of customers) {
            await storage_1.storage.db.delete(storage_1.storage.customers).where((0, drizzle_orm_1.eq)(storage_1.storage.customers.id, customer.id));
        }
        console.log('Alle kunder er slettet');
        console.log('Alt test data er slettet!');
    }
    catch (error) {
        console.error('Fejl ved sletning af test data:', error);
    }
}
clearTestData();
