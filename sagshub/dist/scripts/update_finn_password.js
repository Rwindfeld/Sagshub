"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../server/db");
const schema_1 = require("../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../server/auth");
async function updateFinnPassword() {
    try {
        const newPassword = "NytSikkertPassword123";
        const hashedPassword = await (0, auth_1.hashPassword)(newPassword);
        // Opdater Finn's password i databasen
        await db_1.db.update(schema_1.users)
            .set({ password: hashedPassword })
            .where((0, drizzle_orm_1.eq)(schema_1.users.username, "Finn"));
        console.log("Finn's password er blevet opdateret med succes!");
        process.exit(0);
    }
    catch (error) {
        console.error("Fejl ved opdatering af password:", error);
        process.exit(1);
    }
}
updateFinnPassword();
