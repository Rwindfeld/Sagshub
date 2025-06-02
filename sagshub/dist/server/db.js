"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.pool = void 0;
const pg_1 = __importDefault(require("pg"));
const node_postgres_1 = require("drizzle-orm/node-postgres");
const { Pool } = pg_1.default;
// Database configuration using environment variables
const connectionConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'sagshub',
    password: process.env.DB_PASSWORD || 'wa2657321',
    port: parseInt(process.env.DB_PORT || '5432'),
};
// Create a standard PostgreSQL pool with direct connection
exports.pool = new Pool(connectionConfig);
// Create a drizzle instance without schema
exports.db = (0, node_postgres_1.drizzle)(exports.pool);
