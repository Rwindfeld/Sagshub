"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../server/db");
const schema_1 = require("../shared/schema");
async function deleteCases() {
    try {
        console.log('Sletter alle eksisterende sager...');
        // Slet alle sager
        await db_1.db.delete(schema_1.cases);
        console.log('Alle sager er blevet slettet!');
        process.exit(0);
    }
    catch (error) {
        console.error('Fejl under sletning af sager:', error);
        process.exit(1);
    }
}
// Start sletning af sager
deleteCases();
