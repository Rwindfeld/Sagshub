"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../server/db");
const schema_1 = require("../shared/schema");
const faker_1 = require("@faker-js/faker");
async function main() {
    // Hent alle kunder og brugere
    const allCustomers = await db_1.db.select().from(schema_1.customers);
    const allUsers = await db_1.db.select().from(schema_1.users);
    if (allCustomers.length === 0 || allUsers.length === 0) {
        throw new Error('Ingen kunder eller brugere fundet i databasen.');
    }
    const statuses = Object.values(OrderStatus);
    const ordersToInsert = [];
    // Computerværksted-relaterede modeller, fejlbeskrivelser og varer
    const models = [
        "Lenovo ThinkPad X1 Carbon",
        "HP EliteBook 840 G7",
        "Dell Latitude 7490",
        "MacBook Pro 16'' 2021",
        "Asus ZenBook 14",
        "Acer Aspire 5",
        "MSI Gaming PC",
        "Stationær PC",
        "Fujitsu Lifebook",
        "Surface Laptop 4"
    ];
    for (let i = 0; i < 1000; i++) {
        const customer = faker_1.faker.helpers.arrayElement(allCustomers);
        const user = faker_1.faker.helpers.arrayElement(allUsers);
        const status = faker_1.faker.helpers.arrayElement(statuses);
        const orderNumber = `ORD${faker_1.faker.number.int({ min: 10000, max: 99999 })}`;
        const model = faker_1.faker.helpers.arrayElement(models);
        const serialNumber = faker_1.faker.string.alphanumeric(10);
        const faultDescription = faker_1.faker.helpers.arrayElement([
            `Udskiftning af batteri på ${model}`,
            `Ny skærm til ${model}`,
            `Tastaturet skal udskiftes på ${model}`,
            `Opgradering af RAM i ${model}`,
            `Installation af ny SSD i ${model}`,
            `Udskiftning af grafikkort i ${model}`,
            `Nyt motherboard til ${model}`,
            `Reparation af strømforsyning på ${model}`,
            `Blæseren larmer og skal skiftes på ${model}`,
            `USB-porte virker ikke på ${model}`
        ]);
        const itemsOrdered = faker_1.faker.helpers.arrayElement([
            "Batteri til bærbar",
            "Skærm til laptop",
            "Tastatur",
            "RAM-modul 16GB DDR4",
            "SSD 1TB NVMe",
            "Grafikkort RTX 4060",
            "Motherboard ATX",
            "Strømforsyning 650W",
            "CPU-køler",
            "USB-hub"
        ]);
        const supplier = faker_1.faker.helpers.arrayElement([
            "IT-eksperten",
            "Nordic Data",
            "ElektronikPartner",
            "PC Service Danmark",
            "TechSupply",
            "Datalageret",
            "ComputerHuset",
            "Netværkscenteret",
            "Print & Scan ApS",
            "HardwareSpecialisten"
        ]);
        const price = faker_1.faker.commerce.price({ min: 100, max: 10000 });
        const orderDate = faker_1.faker.date.past({ years: 2 });
        const createdBy = user.id;
        ordersToInsert.push({
            orderNumber,
            customerId: customer.id,
            model,
            serialNumber,
            faultDescription,
            itemsOrdered,
            supplier,
            price,
            orderDate,
            createdBy,
            status,
            createdAt: orderDate,
            updatedAt: orderDate
        });
    }
    // Indsæt ordrer
    await db_1.db.insert(schema_1.orders).values(ordersToInsert);
    console.log('1000 ordrer oprettet!');
    // Simuler historik: For hver ordre, lav 1-3 statusændringer (kun log)
    ordersToInsert.forEach(order => {
        const numHistory = faker_1.faker.number.int({ min: 1, max: 3 });
        let prevStatus = order.status;
        for (let i = 0; i < numHistory; i++) {
            const newStatus = faker_1.faker.helpers.arrayElement(statuses.filter(s => s !== prevStatus));
            const date = faker_1.faker.date.between({ from: order.orderDate, to: new Date() });
            console.log(`Ordre ${order.orderNumber}: ${prevStatus} -> ${newStatus} (${date.toISOString()})`);
            prevStatus = newStatus;
        }
    });
}
main().catch(e => {
    console.error(e);
    process.exit(1);
});
