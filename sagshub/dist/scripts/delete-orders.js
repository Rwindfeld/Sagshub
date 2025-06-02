"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../server/db");
const schema_1 = require("../shared/schema");
async function main() {
    const deleted = await db_1.db.delete(schema_1.orders);
    console.log('Alle ordrer er nu slettet.');
}
main().catch(e => {
    console.error(e);
    process.exit(1);
});
