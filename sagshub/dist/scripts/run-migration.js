"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const storage_1 = require("../server/storage");
const drizzle_orm_1 = require("drizzle-orm");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function runMigration() {
    try {
        console.log('Kører migration: add_login_info_and_purchase_fields.sql');
        // Læs migration filen
        const migrationPath = path_1.default.join(__dirname, '../server/migrations/add_login_info_and_purchase_fields.sql');
        const migrationSQL = fs_1.default.readFileSync(migrationPath, 'utf8');
        // Split SQL statements (hvis der er flere)
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        // Kør hver statement
        for (const statement of statements) {
            if (statement.trim()) {
                console.log('Kører:', statement.substring(0, 50) + '...');
                await storage_1.db.execute(drizzle_orm_1.sql.raw(statement));
            }
        }
        console.log('Migration gennemført succesfuldt!');
        process.exit(0);
    }
    catch (error) {
        console.error('Fejl ved migration:', error);
        process.exit(1);
    }
}
runMigration();
