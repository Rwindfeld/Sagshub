// =============================================================================
// SAGSHUB DATABASE FORBINDELSE
// =============================================================================
// Denne fil konfigurerer og eksporterer database forbindelser til SagsHub
// - PostgreSQL connection pool for direkte database adgang
// - Drizzle ORM instance for type-safe database operationer
// - Connection konfiguration baseret på miljøvariabler
// =============================================================================

// Import af PostgreSQL driver og Drizzle ORM
import pg from 'pg'; // PostgreSQL client library til Node.js
import { drizzle } from 'drizzle-orm/node-postgres'; // Drizzle ORM til type-safe SQL queries

const { Pool } = pg; // Ekstraherer Pool klassen fra pg modulet

// =============================================================================
// DATABASE FORBINDELSESKONFIGURATION
// =============================================================================
// Konfigurerer database forbindelse med miljøvariabler og fallback værdier
const connectionConfig = {
  user: process.env.DB_USER || 'postgres',     // Database bruger (default: postgres)
  host: process.env.DB_HOST || 'localhost',    // Database server IP/hostname (default: localhost)
  database: process.env.DB_NAME || 'sagshub',  // Database navn (default: sagshub)
  password: process.env.DB_PASSWORD || 'wa2657321', // Database password (default fra udvikling)
  port: parseInt(process.env.DB_PORT || '5432'), // Database port (default: 5432 - standard PostgreSQL port)
};

// =============================================================================
// CONNECTION POOL OPRETTELSE
// =============================================================================
// Opretter en PostgreSQL connection pool for effektiv forbindelseshåndtering
// Connection pools genanvender database forbindelser i stedet for at oprette nye hver gang
export const pool = new Pool(connectionConfig);

// =============================================================================
// DRIZZLE ORM INSTANCE
// =============================================================================
// Opretter Drizzle ORM instance der giver type-safe database operationer
// Drizzle kompilerer til rå SQL men giver TypeScript type checking
export const db = drizzle(pool);
