import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema.js";
const { Pool } = pg;
// Hardcoded database URL for lokal udvikling
const connectionConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'sagshub',
    password: 'wa2657321',
    port: 5432,
};
// Opret en standard PostgreSQL pool med direkte forbindelse
export const pool = new Pool(connectionConfig);
// Opret en drizzle instans
export const db = drizzle(pool);
// Eksporter schema
export { schema };
