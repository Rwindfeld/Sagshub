"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../server/db");
const schema_1 = require("../shared/schema");
async function deleteRMAs() {
    try {
        console.log('Sletter RMA status historik...');
        await db_1.db.delete(schema_1.rmaStatusHistory);
        console.log('RMA status historik slettet');
        console.log('Sletter RMA sager...');
        await db_1.db.delete(schema_1.rma);
        console.log('RMA sager slettet');
        process.exit(0);
    }
    catch (error) {
        console.error('Fejl under sletning af RMA sager:', error);
        process.exit(1);
    }
}
deleteRMAs();
