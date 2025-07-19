import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const { Pool } = pg;

// Database configuration using environment variables
const connectionConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'sagshub',
  password: process.env.DB_PASSWORD || 'wa2657321',
  port: parseInt(process.env.DB_PORT || '5432'),
};

// Create a standard PostgreSQL pool with direct connection
export const pool = new Pool(connectionConfig);

// Create a drizzle instance without schema
export const db = drizzle(pool);
