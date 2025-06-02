"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.DatabaseStorage = void 0;
exports.generateOrderNumber = generateOrderNumber;
const db_1 = require("./db");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../shared/schema");
const express_session_1 = __importDefault(require("express-session"));
const connect_pg_simple_1 = __importDefault(require("connect-pg-simple"));
const alarm_1 = require("../shared/alarm");
// Helper-funktion til at beregne antal hverdage mellem to datoer
function getBusinessDaysDifference(startDate, endDate) {
    let count = 0;
    let current = new Date(startDate);
    while (current <= endDate) {
        const day = current.getDay();
        if (day !== 0 && day !== 6)
            count++; // 0 = søndag, 6 = lørdag
        current.setDate(current.getDate() + 1);
    }
    return count;
}
const PostgresSessionStore = (0, connect_pg_simple_1.default)(express_session_1.default);
class DatabaseStorage {
    sessionStore;
    dbConfig;
    constructor() {
        const dbConfig = {
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'sagshub',
            password: process.env.DB_PASSWORD || 'wa2657321',
            port: parseInt(process.env.DB_PORT || '5432'),
        };
        this.dbConfig = dbConfig;
        this.sessionStore = new PostgresSessionStore({
            conObject: dbConfig,
            createTableIfMissing: true,
        });
        // Log databaseforbindelse ved opstart
        console.log('Forbinder til database:', dbConfig);
    }
    async getUser(id) {
        const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id));
        return user;
    }
    async getUserByUsername(username) {
        const [user] = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.username, username));
        return user;
    }
    async createUser(userData) {
        const [user] = await db_1.db
            .insert(schema_1.users)
            .values(userData)
            .returning();
        return user;
    }
    async getUsers() {
        return db_1.db.select().from(schema_1.users);
    }
    async getCustomers() {
        return db_1.db.select().from(schema_1.customers);
    }
    async getCustomer(id) {
        const [customer] = await db_1.db.select().from(schema_1.customers).where((0, drizzle_orm_1.eq)(schema_1.customers.id, id));
        return customer;
    }
    async createCustomer(customerData) {
        const [customer] = await db_1.db
            .insert(schema_1.customers)
            .values({
            ...customerData,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
            .returning();
        return customer;
    }
    async updateCustomer(id, customerData) {
        const [customer] = await db_1.db
            .update(schema_1.customers)
            .set({
            ...customerData,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.customers.id, id))
            .returning();
        return customer;
    }
    async searchCustomers(searchTerm) {
        if (!searchTerm?.trim()) {
            return [];
        }
        try {
            const searchTermTrimmed = searchTerm.trim();
            console.log('Søger efter kunder med term:', searchTermTrimmed);
            // Use raw SQL to ensure proper search functionality
            let query = `
        SELECT id, name, phone, email, address, city, postal_code, notes, created_at, updated_at
        FROM customers 
        WHERE (
          name ILIKE '%${searchTermTrimmed}%' OR
          phone ILIKE '%${searchTermTrimmed}%' OR
          email ILIKE '%${searchTermTrimmed}%'
        )
      `;
            // Add ID search if it's a number
            if (/^\d+$/.test(searchTermTrimmed)) {
                query += ` OR id = ${Number(searchTermTrimmed)}`;
            }
            query += ` ORDER BY name LIMIT 10`;
            console.log('Executing customer search query:', query);
            const result = await db_1.db.execute((0, drizzle_orm_1.sql)([query]));
            const customers = result.rows.map((row) => ({
                id: row.id,
                name: row.name,
                phone: row.phone,
                email: row.email,
                address: row.address,
                city: row.city,
                postalCode: row.postal_code,
                notes: row.notes,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at)
            }));
            console.log('Fandt', customers.length, 'kunder');
            return customers;
        }
        catch (error) {
            console.error('Fejl ved kundesøgning:', error);
            return [];
        }
    }
    async getCases(customerId) {
        try {
            const query = db_1.db
                .select({
                id: schema_1.cases.id,
                caseNumber: schema_1.cases.caseNumber,
                customerId: schema_1.cases.customerId,
                customerName: schema_1.customers.name,
                title: schema_1.cases.title,
                description: schema_1.cases.description,
                treatment: schema_1.cases.treatment,
                priority: schema_1.cases.priority,
                deviceType: schema_1.cases.deviceType,
                accessories: schema_1.cases.accessories,
                importantNotes: schema_1.cases.importantNotes,
                loginInfo: schema_1.cases.loginInfo,
                purchasedHere: schema_1.cases.purchasedHere,
                purchaseDate: schema_1.cases.purchaseDate,
                status: schema_1.cases.status,
                createdAt: schema_1.cases.createdAt,
                updatedAt: schema_1.cases.updatedAt,
                createdBy: schema_1.users.name,
            })
                .from(schema_1.cases)
                .leftJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.cases.customerId, schema_1.customers.id))
                .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.cases.createdBy, schema_1.users.id))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.cases.createdAt));
            if (customerId) {
                query.where((0, drizzle_orm_1.eq)(schema_1.cases.customerId, customerId));
            }
            const result = await query;
            return result.map(row => ({
                ...row,
                customerName: row.customerName || `Kunde #${row.customerId}`,
                createdBy: row.createdBy || "System",
            }));
        }
        catch (error) {
            console.error("Error in getCases:", error);
            return [];
        }
    }
    async getCaseByNumber(caseNumber) {
        try {
            const [case_] = await db_1.db
                .select()
                .from(schema_1.cases)
                .where((0, drizzle_orm_1.eq)(schema_1.cases.caseNumber, caseNumber));
            return case_;
        }
        catch (error) {
            console.error("Error finding case by number:", error);
            return undefined;
        }
    }
    async getCase(idOrNumber) {
        try {
            let query = db_1.db
                .select({
                id: schema_1.cases.id,
                caseNumber: schema_1.cases.caseNumber,
                customerId: schema_1.cases.customerId,
                title: schema_1.cases.title,
                description: schema_1.cases.description,
                treatment: schema_1.cases.treatment,
                priority: schema_1.cases.priority,
                deviceType: schema_1.cases.deviceType,
                accessories: schema_1.cases.accessories,
                importantNotes: schema_1.cases.importantNotes,
                loginInfo: schema_1.cases.loginInfo,
                purchasedHere: schema_1.cases.purchasedHere,
                purchaseDate: schema_1.cases.purchaseDate,
                status: schema_1.cases.status,
                createdAt: schema_1.cases.createdAt,
                updatedAt: schema_1.cases.updatedAt,
                createdBy: schema_1.cases.createdBy,
                customerName: schema_1.customers.name,
                customerPhone: schema_1.customers.phone,
                customerEmail: schema_1.customers.email,
                customerAddress: schema_1.customers.address,
            })
                .from(schema_1.cases)
                .leftJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.cases.customerId, schema_1.customers.id));
            if (typeof idOrNumber === 'string') {
                query = query.where((0, drizzle_orm_1.eq)(schema_1.cases.caseNumber, idOrNumber.toUpperCase()));
            }
            else {
                query = query.where((0, drizzle_orm_1.eq)(schema_1.cases.id, idOrNumber));
            }
            const [row] = await query;
            if (!row)
                return undefined;
            // Hent medarbejdernavn fra initial status history (sag oprettet)
            let createdByName = null;
            try {
                const initialStatusHistory = await db_1.db
                    .select({
                    createdByName: schema_1.statusHistory.createdByName,
                    userName: schema_1.users.name,
                })
                    .from(schema_1.statusHistory)
                    .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.statusHistory.createdBy, schema_1.users.id))
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.statusHistory.caseId, row.id), (0, drizzle_orm_1.eq)(schema_1.statusHistory.comment, 'Sag oprettet')))
                    .orderBy((0, drizzle_orm_1.asc)(schema_1.statusHistory.createdAt))
                    .limit(1);
                if (initialStatusHistory.length > 0) {
                    // Prioriter createdByName fra status history over userName
                    const history = initialStatusHistory[0];
                    createdByName = history.createdByName || history.userName;
                }
                // Fallback til brugerens navn hvis intet findes
                if (!createdByName) {
                    const user = await this.getUser(row.createdBy);
                    createdByName = user?.name || 'System';
                }
            }
            catch (error) {
                console.error('Error fetching initial status history:', error);
                // Fallback til brugerens navn
                const user = await this.getUser(row.createdBy);
                createdByName = user?.name || 'System';
            }
            return {
                ...row,
                purchasedHere: row.purchasedHere ?? false,
                purchaseDate: row.purchaseDate ?? null,
                createdByName,
                customer: {
                    name: row.customerName || "-",
                    phone: row.customerPhone || "-",
                    email: row.customerEmail || "-",
                    address: row.customerAddress || "-"
                }
            };
        }
        catch (error) {
            console.error("Error in getCase:", error);
            return undefined;
        }
    }
    async createCase(caseData) {
        try {
            console.log('Creating case with data:', JSON.stringify(caseData, null, 2));
            // Use raw SQL instead of Drizzle ORM to avoid schema issues
            const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
        INSERT INTO cases (
          case_number, customer_id, title, description, treatment, priority, 
          device_type, accessories, important_notes, login_info, purchased_here, 
          purchase_date, status, created_at, updated_at, created_by
        ) VALUES (
          ${caseData.caseNumber}, ${caseData.customerId}, ${caseData.title}, 
          ${caseData.description}, ${caseData.treatment}, ${caseData.priority},
          ${caseData.deviceType}, ${caseData.accessories || ''}, 
          ${caseData.importantNotes || ''}, ${caseData.loginInfo || ''}, 
          ${caseData.purchasedHere || false}, ${caseData.purchaseDate || null},
          ${caseData.status}, NOW(), NOW(), ${caseData.createdBy}
        ) RETURNING *
      `);
            const case_ = result.rows[0];
            console.log('Case created successfully:', case_);
            // Opret initial status history med createdByName
            let createdByName;
            if (caseData.createdByName && caseData.createdByName.trim()) {
                createdByName = caseData.createdByName.trim();
            }
            else {
                const user = await this.getUser(caseData.createdBy);
                createdByName = user?.name || 'System';
            }
            await db_1.db.insert(schema_1.statusHistory).values({
                caseId: case_.id,
                status: caseData.status,
                comment: 'Sag oprettet',
                createdBy: caseData.createdBy,
                createdByName,
                createdAt: new Date(),
            });
            console.log('Initial StatusHistory GEMT:', { caseId: case_.id, status: caseData.status, comment: 'Sag oprettet', createdBy: caseData.createdBy, createdByName });
            // Opret eller opdater customer user for denne kunde
            try {
                const customer = await this.getCustomer(caseData.customerId);
                if (customer) {
                    const existingCustomerUser = await this.getCustomerUser(customer.id);
                    if (!existingCustomerUser) {
                        await this.createCustomerUser(customer, case_.case_number);
                        console.log(`Automatisk oprettet customer login for ${customer.name} med sag ${case_.case_number}`);
                    }
                }
            }
            catch (error) {
                console.warn('Warning: Could not create customer user:', error);
                // Don't fail case creation if customer user creation fails
            }
            // Convert snake_case to camelCase
            return {
                id: case_.id,
                caseNumber: case_.case_number,
                customerId: case_.customer_id,
                title: case_.title,
                description: case_.description,
                treatment: case_.treatment,
                priority: case_.priority,
                deviceType: case_.device_type,
                accessories: case_.accessories,
                importantNotes: case_.important_notes,
                loginInfo: case_.login_info,
                purchasedHere: case_.purchased_here,
                purchaseDate: case_.purchase_date,
                status: case_.status,
                createdAt: new Date(case_.created_at),
                updatedAt: new Date(case_.updated_at),
                createdBy: case_.created_by
            };
        }
        catch (error) {
            console.error('Error in createCase:', error);
            throw error;
        }
    }
    async updateCaseStatus(id, status) {
        const [case_] = await db_1.db
            .update(schema_1.cases)
            .set({ status, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.cases.id, id))
            .returning();
        return case_;
    }
    async getLatestCaseNumber(prefix) {
        const result = await db_1.db
            .select()
            .from(schema_1.cases)
            .where((0, drizzle_orm_1.sql) `substring(${schema_1.cases.caseNumber} from 1 for ${prefix.length}) = ${prefix}`)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.cases.caseNumber))
            .limit(1);
        console.log(`getLatestCaseNumber for prefix ${prefix} returned:`, result);
        return result;
    }
    async getCaseStatusHistory(caseId) {
        try {
            // JOIN users for fallback-navn
            const history = await db_1.db
                .select({
                id: schema_1.statusHistory.id,
                caseId: schema_1.statusHistory.caseId,
                status: schema_1.statusHistory.status,
                comment: schema_1.statusHistory.comment,
                createdAt: schema_1.statusHistory.createdAt,
                createdBy: schema_1.statusHistory.createdBy,
                createdByName: schema_1.statusHistory.createdByName,
                userName: schema_1.users.name,
            })
                .from(schema_1.statusHistory)
                .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.statusHistory.createdBy, schema_1.users.id))
                .where((0, drizzle_orm_1.eq)(schema_1.statusHistory.caseId, caseId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.statusHistory.createdAt));
            return history.map(record => {
                // Brug createdByName hvis sat, ellers brug userName
                const out = { ...record, createdByName: record.createdByName || record.userName || "System" };
                console.log('StatusHistory RETURNERES:', out);
                return out;
            });
        }
        catch (error) {
            console.error("Fejl i getCaseStatusHistory:", error);
            return [];
        }
    }
    async updateCaseStatusWithHistory(caseId, status, comment, userId, updatedByName) {
        // Opdater sag status
        const now = new Date();
        const updateData = {
            status,
            updatedAt: now,
        };
        // Slet loginInfo når sag afsluttes
        if (status === 'completed') {
            updateData.loginInfo = null;
        }
        console.log('[updateCaseStatusWithHistory] Opdaterer sag', caseId, 'til status', status, 'updatedAt:', now.toISOString());
        console.log('[updateCaseStatusWithHistory] updateData:', updateData);
        const [updatedCase] = await db_1.db
            .update(schema_1.cases)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(schema_1.cases.id, caseId))
            .returning();
        console.log('Case updated with status:', status, 'updatedAt:', now);
        console.log('Updated case result:', { id: updatedCase.id, status: updatedCase.status, updatedAt: updatedCase.updatedAt });
        // Brug det angivne medarbejdernavn hvis det findes, ellers hent brugerens navn
        let createdByName;
        if (updatedByName && updatedByName.trim()) {
            createdByName = updatedByName.trim();
        }
        else {
            const user = await this.getUser(userId);
            createdByName = user?.name || 'System';
        }
        await db_1.db.insert(schema_1.statusHistory).values({
            caseId,
            status,
            comment,
            createdBy: userId,
            createdByName,
            createdAt: now,
        });
        console.log('StatusHistory GEMT:', { caseId, status, comment, createdBy: userId, createdByName });
        return updatedCase;
    }
    async searchCases(searchTerm) {
        if (!searchTerm?.trim()) {
            return [];
        }
        const searchTermTrimmed = searchTerm.trim();
        const searchPattern = `%${searchTermTrimmed}%`;
        const numericId = parseInt(searchTermTrimmed);
        const conditions = [
            (0, drizzle_orm_1.like)(schema_1.cases.caseNumber, searchPattern),
            (0, drizzle_orm_1.like)(schema_1.cases.title, searchPattern),
            (0, drizzle_orm_1.like)(schema_1.cases.description, searchPattern),
            (0, drizzle_orm_1.like)(schema_1.customers.name, searchPattern)
        ];
        // Kun tilføj ID søgning hvis det er et gyldigt nummer
        if (!isNaN(numericId)) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.cases.id, numericId));
        }
        return db_1.db.select({
            ...schema_1.cases,
            customerName: schema_1.customers.name
        })
            .from(schema_1.cases)
            .leftJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.cases.customerId, schema_1.customers.id))
            .where((0, drizzle_orm_1.or)(...conditions))
            .limit(10);
    }
    async getRMAs() {
        return db_1.db
            .select({
            id: schema_1.rma.id,
            customerId: schema_1.rma.customerId,
            customerName: schema_1.rma.customerName,
            invoiceNumber: schema_1.rma.invoiceNumber,
            faultDate: schema_1.rma.faultDate,
            faultDescription: schema_1.rma.faultDescription,
            modelName: schema_1.rma.modelName,
            sku: schema_1.rma.sku,
            serialNumber: schema_1.rma.serialNumber,
            supplier: schema_1.rma.supplier,
            status: schema_1.rma.status,
            createdAt: schema_1.rma.createdAt,
            updatedAt: schema_1.rma.updatedAt,
            rmaNumber: schema_1.rma.rmaNumber,
        })
            .from(schema_1.rma)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.rma.createdAt));
    }
    async getRMA(id) {
        const [rmaCase] = await db_1.db
            .select({
            id: schema_1.rma.id,
            rmaNumber: schema_1.rma.rmaNumber,
            customerId: schema_1.rma.customerId,
            customerName: schema_1.customers.name,
            customerPhone: schema_1.customers.phone,
            customerEmail: schema_1.customers.email,
            customerAddress: schema_1.customers.address,
            customerCity: schema_1.customers.city,
            customerPostalCode: schema_1.customers.postalCode,
            customerNotes: schema_1.customers.notes,
            customerCreatedAt: schema_1.customers.createdAt,
            description: schema_1.rma.description,
            faultDescription: schema_1.rma.description,
            deliveryDate: schema_1.rma.deliveryDate,
            model: schema_1.rma.model,
            modelName: schema_1.rma.model,
            sku: schema_1.rma.sku,
            serialNumber: schema_1.rma.serialNumber,
            supplier: schema_1.rma.supplier,
            shipmentDate: schema_1.rma.shipmentDate,
            status: schema_1.rma.status,
            createdAt: schema_1.rma.createdAt,
            updatedAt: schema_1.rma.updatedAt,
            createdBy: schema_1.rma.createdBy,
            createdByName: schema_1.users.name
        })
            .from(schema_1.rma)
            .leftJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.rma.customerId, schema_1.customers.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.rma.createdBy, schema_1.users.id))
            .where((0, drizzle_orm_1.eq)(schema_1.rma.id, id));
        return rmaCase;
    }
    async createRMA(rmaData) {
        try {
            const rmaNumber = await generateRMANumber();
            console.log("RMA data being saved:", { ...rmaData, rmaNumber, createdBy: rmaData.createdBy });
            const [newRMA] = await db_1.db
                .insert(schema_1.rma)
                .values({
                ...rmaData,
                status: "oprettet",
                rmaNumber,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .returning();
            return newRMA;
        }
        catch (error) {
            console.error("Error in createRMA:", error);
            throw error;
        }
    }
    async updateRMAStatus(id, status) {
        const [updatedRMA] = await db_1.db
            .update(schema_1.rma)
            .set({
            status,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.rma.id, id))
            .returning();
        return updatedRMA;
    }
    async getRMAStatusHistory(rmaId) {
        try {
            // JOIN users for fallback-navn
            const history = await db_1.db
                .select({
                id: schema_1.rmaStatusHistory.id,
                rmaId: schema_1.rmaStatusHistory.rmaId,
                status: schema_1.rmaStatusHistory.status,
                comment: schema_1.rmaStatusHistory.comment,
                createdAt: schema_1.rmaStatusHistory.createdAt,
                createdBy: schema_1.rmaStatusHistory.createdBy,
                createdByName: schema_1.rmaStatusHistory.createdByName,
                userName: schema_1.users.name,
            })
                .from(schema_1.rmaStatusHistory)
                .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.rmaStatusHistory.createdBy, schema_1.users.id))
                .where((0, drizzle_orm_1.eq)(schema_1.rmaStatusHistory.rmaId, rmaId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.rmaStatusHistory.createdAt));
            return history.map(record => {
                // Brug createdByName hvis sat, ellers brug userName
                const out = { ...record, createdByName: record.createdByName || record.userName || "System" };
                console.log('RMA StatusHistory RETURNERES:', out);
                return out;
            });
        }
        catch (error) {
            console.error("Error in getRMAStatusHistory:", error);
            return [];
        }
    }
    async updateRMAStatusWithHistory(rmaId, status, comment, userId, updatedByName) {
        const [updatedRMA] = await db_1.db
            .update(schema_1.rma)
            .set({
            status,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.rma.id, rmaId))
            .returning();
        // Brug det angivne medarbejdernavn hvis det findes, ellers hent brugerens navn
        let createdByName;
        if (updatedByName && updatedByName.trim()) {
            createdByName = updatedByName.trim();
        }
        else {
            const user = await this.getUser(userId);
            createdByName = user?.name || 'System';
        }
        await db_1.db.insert(schema_1.rmaStatusHistory).values({
            rmaId,
            status,
            comment,
            createdBy: userId,
            createdByName,
            createdAt: new Date(),
        });
        console.log('RMA StatusHistory GEMT:', { rmaId, status, comment, createdBy: userId, createdByName });
        return updatedRMA;
    }
    async updateRMA(id, rmaData) {
        const [updatedRMA] = await db_1.db
            .update(schema_1.rma)
            .set({
            ...rmaData,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.rma.id, id))
            .returning();
        return updatedRMA;
    }
    async updateCase(id, caseData) {
        try {
            console.log('Opdaterer sag med ID:', id, 'Data:', JSON.stringify(caseData, null, 2));
            // Tjek først om sagen eksisterer
            const [existingCase] = await db_1.db
                .select()
                .from(schema_1.cases)
                .where((0, drizzle_orm_1.eq)(schema_1.cases.id, id));
            if (!existingCase) {
                console.log('Sag ikke fundet med ID:', id);
                return undefined;
            }
            // Fjern ugyldige felter
            const cleanedData = { ...caseData };
            delete cleanedData.customer_search;
            delete cleanedData.customer_phone;
            delete cleanedData.createdByName;
            // Udfør opdateringen med Drizzle ORM
            const [updatedCase] = await db_1.db
                .update(schema_1.cases)
                .set({
                ...cleanedData,
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.eq)(schema_1.cases.id, id))
                .returning();
            if (!updatedCase) {
                console.log('Ingen sag blev opdateret');
                return undefined;
            }
            console.log('Sag opdateret:', updatedCase);
            // Hent den opdaterede sag med alle relationer
            return this.getCase(id);
        }
        catch (error) {
            console.error('Fejl i updateCase:', error);
            throw new Error('Der opstod en fejl ved opdatering af sagen');
        }
    }
    async getPaginatedCases(options) {
        const { page, pageSize, searchTerm, treatment, priority, status, sort, customerId, isWorker } = options;
        const offset = (page - 1) * pageSize;
        try {
            console.log('getPaginatedCases called with options:', options);
            const startTime = Date.now();
            // Build WHERE conditions
            let whereConditions = [];
            if (searchTerm) {
                whereConditions.push(`(
          c.title ILIKE '%${searchTerm}%' OR
          c.case_number ILIKE '%${searchTerm}%' OR
          c.description ILIKE '%${searchTerm}%' OR
          cust.name ILIKE '%${searchTerm}%'
        )`);
            }
            if (treatment) {
                whereConditions.push(`c.treatment = '${treatment}'`);
            }
            if (priority) {
                whereConditions.push(`c.priority = '${priority}'`);
            }
            if (status) {
                whereConditions.push(`c.status = '${status}'`);
            }
            // FJERNET: Automatisk filtrering af completed sager
            // Dette forhindrede statistik-siden i at få alle sager
            if (customerId) {
                whereConditions.push(`c.customer_id = ${customerId}`);
            }
            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
            // Get total count
            const countQuery = `
        SELECT COUNT(*)::int as count
        FROM cases c
        LEFT JOIN customers cust ON c.customer_id = cust.id
        LEFT JOIN users u ON c.created_by = u.id
        ${whereClause}
      `;
            const countResult = await db_1.db.execute((0, drizzle_orm_1.sql)([countQuery]));
            const count = countResult.rows[0]?.count || 0;
            // Get status counts (cached for better performance)
            const statusCountsQuery = `
        SELECT status, COUNT(*)::int as count
        FROM cases
        WHERE status != 'completed'
        GROUP BY status
      `;
            const statusCountsResult = await db_1.db.execute((0, drizzle_orm_1.sql)([statusCountsQuery]));
            const statusCountsMap = statusCountsResult.rows.reduce((acc, row) => {
                acc[row.status] = row.count;
                return acc;
            }, {});
            // Get alarm count (simplified for better performance)
            const alarmCountQuery = `
        SELECT COUNT(*)::int as count
        FROM cases c
        WHERE c.status != 'completed'
        AND (
          (c.status = 'created' AND c.priority = 'four_days' AND EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400 > 4)
          OR (c.status = 'in_progress' AND EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400 > 1)
          OR (c.status = 'ready_for_pickup' AND EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400 > 14)
          OR (c.status = 'waiting_customer' AND EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400 > 14)
        )
      `;
            const alarmResult = await db_1.db.execute((0, drizzle_orm_1.sql)([alarmCountQuery]));
            const alarmCount = alarmResult.rows[0]?.count || 0;
            // Build sort clause
            let sortClause = 'ORDER BY c.updated_at DESC';
            if (sort) {
                if (sort === 'newest') {
                    sortClause = 'ORDER BY c.created_at DESC';
                }
                else if (sort === 'oldest') {
                    sortClause = 'ORDER BY c.created_at ASC';
                }
                else if (sort === 'default') {
                    sortClause = 'ORDER BY c.updated_at DESC';
                }
                else {
                    // Fallback for old format (field:direction)
                    const [field, direction] = sort.split(':');
                    if (field === 'createdAt') {
                        sortClause = `ORDER BY c.created_at ${direction === 'desc' ? 'DESC' : 'ASC'}`;
                    }
                    else if (field === 'updatedAt') {
                        sortClause = `ORDER BY c.updated_at ${direction === 'desc' ? 'DESC' : 'ASC'}`;
                    }
                }
            }
            // Get paginated cases
            const casesQuery = `
        SELECT 
          c.id,
          c.case_number as "caseNumber",
          c.customer_id as "customerId",
          c.title,
          c.description,
          c.treatment,
          c.priority,
          c.device_type as "deviceType",
          c.accessories,
          c.important_notes as "importantNotes",
          c.login_info as "loginInfo",
          c.purchased_here as "purchasedHere",
          c.purchase_date as "purchaseDate",
          c.status,
          c.created_at as "createdAt",
          c.updated_at as "updatedAt",
          c.created_by as "createdBy",
          cust.name as "customerName",
          u.name as "userName"
        FROM cases c
        LEFT JOIN customers cust ON c.customer_id = cust.id
        LEFT JOIN users u ON c.created_by = u.id
        ${whereClause}
        ${sortClause}
        LIMIT ${pageSize} OFFSET ${offset}
      `;
            const casesResult = await db_1.db.execute((0, drizzle_orm_1.sql)([casesQuery]));
            const items = casesResult.rows.map((row) => ({
                ...row,
                createdAt: new Date(row.createdAt),
                updatedAt: new Date(row.updatedAt),
                purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : null,
                customerName: row.customerName || `Kunde #${row.customerId}`,
                createdBy: row.userName || 'System'
            }));
            const endTime = Date.now();
            console.log(`getPaginatedCases completed in ${endTime - startTime}ms`);
            return {
                items,
                total: count,
                page,
                pageSize,
                totalPages: Math.ceil(count / pageSize),
                statusCounts: {
                    ...statusCountsMap,
                    alarm: alarmCount
                }
            };
        }
        catch (error) {
            console.error('Error in getPaginatedCases:', error);
            throw error;
        }
    }
    async getPaginatedCustomers(page, pageSize, searchTerm) {
        try {
            console.log('Søger efter kunder med term:', searchTerm);
            const offset = (page - 1) * pageSize;
            // Build base query
            let query = db_1.db
                .select()
                .from(schema_1.customers);
            let countQuery = db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.customers);
            // Add search conditions if searchTerm is provided
            if (searchTerm?.trim()) {
                const searchPattern = `%${searchTerm.trim()}%`;
                const searchConditions = [
                    (0, drizzle_orm_1.like)(schema_1.customers.name, searchPattern),
                    (0, drizzle_orm_1.like)(schema_1.customers.phone, searchPattern),
                    (0, drizzle_orm_1.like)(schema_1.customers.email, searchPattern),
                    (0, drizzle_orm_1.like)(schema_1.customers.address, searchPattern),
                    (0, drizzle_orm_1.like)(schema_1.customers.city, searchPattern),
                ];
                // Add ID search if it's a number
                if (/^\d+$/.test(searchTerm.trim())) {
                    searchConditions.push((0, drizzle_orm_1.eq)(schema_1.customers.id, Number(searchTerm.trim())));
                }
                const whereCondition = (0, drizzle_orm_1.or)(...searchConditions);
                query = query.where(whereCondition);
                countQuery = countQuery.where(whereCondition);
            }
            console.log('Executing search query...');
            const [{ count }] = await countQuery;
            const totalPages = Math.ceil(count / pageSize);
            // Apply pagination and ordering
            const items = await query
                .orderBy((0, drizzle_orm_1.desc)(schema_1.customers.createdAt))
                .limit(pageSize)
                .offset(offset);
            console.log('Fandt', items.length, 'kunder');
            return {
                items,
                total: count,
                page,
                pageSize,
                totalPages,
            };
        }
        catch (error) {
            console.error("Error in getPaginatedCustomers:", error);
            return {
                items: [],
                total: 0,
                page,
                pageSize,
                totalPages: 0,
            };
        }
    }
    async getPaginatedRMAs(options) {
        try {
            const { page, pageSize, searchTerm, status, sort } = options;
            const offset = (page - 1) * pageSize;
            console.log('getPaginatedRMAs kaldt med:', options);
            // Brug en direkte SQL forespørgsel i stedet for Drizzle ORM
            const countQuery = `
        SELECT COUNT(*)::int AS count 
        FROM rma r
        LEFT JOIN customers c ON r.customer_id = c.id
        WHERE 1=1
        ${searchTerm ? `AND (
          r.description ILIKE '%${searchTerm}%' OR
          r.rma_number ILIKE '%${searchTerm}%' OR
          r.model ILIKE '%${searchTerm}%' OR
          c.name ILIKE '%${searchTerm}%'
        )` : ''}
        ${status ? `AND r.status = '${status}'` : ''}
      `;
            console.log('Count query:', countQuery);
            const countResult = await db_1.db.execute((0, drizzle_orm_1.sql)([countQuery]));
            const count = countResult.rows?.[0]?.count || 0;
            console.log('Antal resultater:', count);
            // Byg den primære forespørgsel for data
            const dataQuery = `
        SELECT 
          r.id, 
          r.rma_number AS "rmaNumber", 
          r.customer_id AS "customerId",
          c.name AS "customerName",
          r.model,
          r.serial_number AS "serialNumber",
          r.description,
          r.status,
          r.created_at AS "createdAt",
          r.updated_at AS "updatedAt",
          r.created_by AS "createdBy"
        FROM rma r
        LEFT JOIN customers c ON r.customer_id = c.id
        WHERE 1=1
        ${searchTerm ? `AND (
          r.description ILIKE '%${searchTerm}%' OR
          r.rma_number ILIKE '%${searchTerm}%' OR
          r.model ILIKE '%${searchTerm}%' OR
          c.name ILIKE '%${searchTerm}%'
        )` : ''}
        ${status ? `AND r.status = '${status}'` : ''}
        ORDER BY ${sort === 'newest' ? 'r.created_at DESC' :
                sort === 'oldest' ? 'r.created_at ASC' :
                    'r.created_at DESC'}
        LIMIT ${pageSize} OFFSET ${offset}
      `;
            console.log('Data query:', dataQuery);
            const result = await db_1.db.execute((0, drizzle_orm_1.sql)([dataQuery]));
            const items = result.rows || [];
            console.log('Fandt', items.length, 'RMA sager');
            return {
                items,
                total: count,
                page,
                pageSize,
                totalPages: Math.ceil(count / pageSize)
            };
        }
        catch (error) {
            console.error("Error in getPaginatedRMAs:", error);
            return {
                items: [],
                total: 0,
                page: options.page,
                pageSize: options.pageSize,
                totalPages: 0
            };
        }
    }
    async getRMAsByCustomerId(customerId) {
        try {
            const query = `
        SELECT 
          r.id, 
          r.rma_number AS "rmaNumber", 
          r.customer_id AS "customerId",
          r.model,
          r.serial_number AS "serialNumber",
          r.description,
          r.status,
          r.created_at AS "createdAt",
          r.updated_at AS "updatedAt",
          r.created_by AS "createdBy"
        FROM rma r
        WHERE r.customer_id = ${customerId}
        ORDER BY r.created_at DESC
      `;
            console.log('getRMAsByCustomerId query:', query);
            const result = await db_1.db.execute((0, drizzle_orm_1.sql)([query]));
            return result.rows || [];
        }
        catch (error) {
            console.error("Error in getRMAsByCustomerId:", error);
            return [];
        }
    }
    async getOrders() {
        const ordersData = await db_1.db.select().from(schema_1.orders);
        return ordersData;
    }
    async getOrder(id) {
        try {
            // Først henter vi ordren med kundenavn
            const [orderWithCustomer] = await db_1.db
                .select({
                ...schema_1.orders,
                customerName: schema_1.customers.name
            })
                .from(schema_1.orders)
                .leftJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.orders.customerId, schema_1.customers.id))
                .where((0, drizzle_orm_1.eq)(schema_1.orders.id, id));
            if (!orderWithCustomer)
                return undefined;
            // Så henter vi yderligere kundeinfo
            const [customer] = await db_1.db
                .select({
                name: schema_1.customers.name,
                phone: schema_1.customers.phone,
                email: schema_1.customers.email
            })
                .from(schema_1.customers)
                .where((0, drizzle_orm_1.eq)(schema_1.customers.id, orderWithCustomer.customerId));
            // Henter medarbejderinfo
            const [createdByUser] = await db_1.db
                .select({
                name: schema_1.users.name
            })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, orderWithCustomer.createdBy));
            // Tjekker om der er relaterede sager og henter dem
            let caseInfo = undefined;
            if (orderWithCustomer.caseId) {
                const [caseData] = await db_1.db
                    .select({
                    caseNumber: schema_1.cases.caseNumber,
                    description: schema_1.cases.description
                })
                    .from(schema_1.cases)
                    .where((0, drizzle_orm_1.eq)(schema_1.cases.id, orderWithCustomer.caseId));
                if (caseData) {
                    caseInfo = caseData;
                }
            }
            // Tjekker om der er relateret RMA og henter info
            let rmaInfo = undefined;
            if (orderWithCustomer.rmaId) {
                const [rmaData] = await db_1.db
                    .select({
                    rmaNumber: schema_1.rma.rmaNumber,
                    description: schema_1.rma.description
                })
                    .from(schema_1.rma)
                    .where((0, drizzle_orm_1.eq)(schema_1.rma.id, orderWithCustomer.rmaId));
                if (rmaData) {
                    rmaInfo = rmaData;
                }
            }
            // Samler alle oplysninger
            return {
                ...orderWithCustomer,
                customer,
                createdByUser,
                case: caseInfo,
                rmaCase: rmaInfo
            };
        }
        catch (error) {
            console.error("Error fetching order details:", error);
            return undefined;
        }
    }
    async getLatestOrderNumber() {
        const [order] = await db_1.db
            .select()
            .from(schema_1.orders)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.orderNumber))
            .limit(1);
        return order;
    }
    async createOrder(orderData) {
        console.log("Creating order with data:", orderData);
        const formattedData = {
            ...orderData,
            orderNumber: orderData.orderNumber,
            status: orderData.status || "pending",
        };
        console.log("Formatted order data:", formattedData);
        const [order] = await db_1.db
            .insert(schema_1.orders)
            .values(formattedData)
            .returning();
        console.log("Created order:", order);
        return order;
    }
    async updateOrderStatus(id, status) {
        const [order] = await db_1.db
            .update(schema_1.orders)
            .set({
            status,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.orders.id, id))
            .returning();
        return order;
    }
    async updateOrder(id, orderData) {
        const [order] = await db_1.db
            .update(schema_1.orders)
            .set({
            ...orderData,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.orders.id, id))
            .returning();
        return order;
    }
    async getPaginatedOrders(options) {
        const { page, pageSize, searchTerm, status, sort, customerId } = options;
        const offset = (page - 1) * pageSize;
        // Build where conditions
        let conditions = [];
        if (searchTerm) {
            conditions.push((0, drizzle_orm_1.like)(schema_1.orders.orderNumber, `%${searchTerm}%`));
        }
        if (status) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.orders.status, status));
        }
        if (customerId) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.orders.customerId, customerId));
        }
        // Build order by
        let orderBy;
        if (sort === "-createdAt") {
            orderBy = (0, drizzle_orm_1.desc)(schema_1.orders.createdAt);
        }
        else if (sort === "createdAt") {
            orderBy = (0, drizzle_orm_1.asc)(schema_1.orders.createdAt);
        }
        else if (sort === "-orderDate") {
            orderBy = (0, drizzle_orm_1.desc)(schema_1.orders.orderDate);
        }
        else if (sort === "orderDate") {
            orderBy = (0, drizzle_orm_1.asc)(schema_1.orders.orderDate);
        }
        else {
            orderBy = (0, drizzle_orm_1.desc)(schema_1.orders.createdAt);
        }
        const whereClause = conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined;
        // Get total count
        const [{ count }] = await db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.orders)
            .where(whereClause || (0, drizzle_orm_1.sql) `true`);
        // Get paginated results with customer name
        const items = await db_1.db
            .select({
            ...schema_1.orders,
            customerName: schema_1.customers.name
        })
            .from(schema_1.orders)
            .leftJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.orders.customerId, schema_1.customers.id))
            .where(whereClause || (0, drizzle_orm_1.sql) `true`)
            .orderBy(orderBy)
            .limit(pageSize)
            .offset(offset);
        return {
            items,
            total: Number(count),
            page,
            pageSize,
            totalPages: Math.ceil(Number(count) / pageSize),
        };
    }
    async getOrdersByCustomerId(customerId) {
        return db_1.db
            .select({
            ...schema_1.orders,
            customerName: schema_1.customers.name
        })
            .from(schema_1.orders)
            .leftJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.orders.customerId, schema_1.customers.id))
            .where((0, drizzle_orm_1.eq)(schema_1.orders.customerId, customerId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt));
    }
    async getOrdersByCaseId(caseId) {
        return db_1.db
            .select({
            ...schema_1.orders,
            customerName: schema_1.customers.name
        })
            .from(schema_1.orders)
            .leftJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.orders.customerId, schema_1.customers.id))
            .where((0, drizzle_orm_1.eq)(schema_1.orders.caseId, caseId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt));
    }
    // Interne sager methods
    async createInternalCase(internalCaseData) {
        const [internalCase] = await db_1.db
            .insert(schema_1.internalCases)
            .values(internalCaseData)
            .returning();
        return internalCase;
    }
    async getInternalCase(id) {
        const result = await db_1.db
            .select({
            id: schema_1.internalCases.id,
            caseId: schema_1.internalCases.caseId,
            senderId: schema_1.internalCases.senderId,
            receiverId: schema_1.internalCases.receiverId,
            message: schema_1.internalCases.message,
            read: schema_1.internalCases.read,
            createdAt: schema_1.internalCases.createdAt,
            updatedAt: schema_1.internalCases.updatedAt,
            caseCaseNumber: schema_1.cases.caseNumber,
            senderName: (0, drizzle_orm_1.sql) `sender.name`.as('senderName'),
            receiverName: (0, drizzle_orm_1.sql) `receiver.name`.as('receiverName'),
            customerName: schema_1.customers.name,
        })
            .from(schema_1.internalCases)
            .innerJoin(schema_1.cases, (0, drizzle_orm_1.eq)(schema_1.internalCases.caseId, schema_1.cases.id))
            .innerJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.cases.customerId, schema_1.customers.id))
            .innerJoin((0, drizzle_orm_1.sql) `users sender`, (0, drizzle_orm_1.eq)(schema_1.internalCases.senderId, (0, drizzle_orm_1.sql) `sender.id`))
            .innerJoin((0, drizzle_orm_1.sql) `users receiver`, (0, drizzle_orm_1.eq)(schema_1.internalCases.receiverId, (0, drizzle_orm_1.sql) `receiver.id`))
            .where((0, drizzle_orm_1.eq)(schema_1.internalCases.id, id));
        if (result.length === 0) {
            return undefined;
        }
        return result[0];
    }
    async getPaginatedInternalCases(options) {
        const { page, pageSize, userId, onlySent, onlyReceived, onlyUnread } = options;
        const offset = (page - 1) * pageSize;
        // Build where conditions
        let whereConditions = (0, drizzle_orm_1.sql) `1=1`;
        if (onlySent && !onlyReceived) {
            whereConditions = (0, drizzle_orm_1.sql) `${whereConditions} AND ic.sender_id = ${userId}`;
        }
        else if (onlyReceived && !onlySent) {
            whereConditions = (0, drizzle_orm_1.sql) `${whereConditions} AND ic.receiver_id = ${userId}`;
        }
        else {
            // Default: both sent and received
            whereConditions = (0, drizzle_orm_1.sql) `${whereConditions} AND (ic.sender_id = ${userId} OR ic.receiver_id = ${userId})`;
        }
        if (onlyUnread) {
            whereConditions = (0, drizzle_orm_1.sql) `${whereConditions} AND ic.read = false AND ic.receiver_id = ${userId}`;
        }
        // Get total count
        const countResult = await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT COUNT(*)::int AS count FROM internal_cases ic WHERE ${whereConditions}`);
        const total = countResult.rows[0].count;
        // Get paginated results with details
        const query = (0, drizzle_orm_1.sql) `
      SELECT 
        ic.id, 
        ic.case_id AS "caseId", 
        ic.sender_id AS "senderId", 
        ic.receiver_id AS "receiverId",
        ic.message,
        ic.read,
        ic.created_at AS "createdAt",
        ic.updated_at AS "updatedAt",
        c.case_number AS "caseCaseNumber",
        sender.name AS "senderName",
        receiver.name AS "receiverName",
        cust.name AS "customerName"
      FROM internal_cases ic
      INNER JOIN cases c ON ic.case_id = c.id
      INNER JOIN customers cust ON c.customer_id = cust.id
      INNER JOIN users sender ON ic.sender_id = sender.id
      INNER JOIN users receiver ON ic.receiver_id = receiver.id
      WHERE ${whereConditions}
      ORDER BY ic.created_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;
        const result = await db_1.db.execute(query);
        const items = result.rows;
        return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }
    async markInternalCaseAsRead(id) {
        const [internalCase] = await db_1.db
            .update(schema_1.internalCases)
            .set({
            read: true,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.internalCases.id, id))
            .returning();
        return internalCase;
    }
    async getUnreadInternalCasesCount(userId) {
        try {
            console.log(`Tæller ulæste interne sager for bruger ${userId}`);
            const result = await db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.internalCases)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.internalCases.receiverId, userId), (0, drizzle_orm_1.eq)(schema_1.internalCases.read, false)));
            const count = result[0]?.count || 0;
            console.log(`Antal ulæste sager: ${count}`);
            return count;
        }
        catch (error) {
            console.error(`Fejl ved tælling af ulæste interne sager: ${error}`);
            return 0;
        }
    }
    async searchRMAs(searchTerm) {
        if (!searchTerm?.trim()) {
            return [];
        }
        const searchTermTrimmed = searchTerm.trim();
        const searchPattern = `%${searchTermTrimmed}%`;
        const numericId = parseInt(searchTermTrimmed);
        const conditions = [
            (0, drizzle_orm_1.like)(schema_1.rma.rmaNumber, searchPattern),
            (0, drizzle_orm_1.like)(schema_1.rma.title, searchPattern),
            (0, drizzle_orm_1.like)(schema_1.rma.description, searchPattern),
            (0, drizzle_orm_1.like)(schema_1.customers.name, searchPattern)
        ];
        // Kun tilføj ID søgning hvis det er et gyldigt nummer
        if (!isNaN(numericId)) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.rma.id, numericId));
        }
        return db_1.db.select({
            ...schema_1.rma,
            customerName: schema_1.customers.name
        })
            .from(schema_1.rma)
            .leftJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.rma.customerId, schema_1.customers.id))
            .where((0, drizzle_orm_1.or)(...conditions))
            .limit(10);
    }
    async searchOrders(searchTerm) {
        if (!searchTerm?.trim()) {
            return [];
        }
        const searchTermTrimmed = searchTerm.trim();
        const searchPattern = `%${searchTermTrimmed}%`;
        return db_1.db.select({
            ...schema_1.orders,
            customerName: schema_1.customers.name
        })
            .from(schema_1.orders)
            .leftJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.orders.customerId, schema_1.customers.id))
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.orders.orderNumber, searchPattern), (0, drizzle_orm_1.like)(schema_1.customers.name, searchPattern)))
            .limit(10);
    }
    async updateUserPassword(userId, hashedPassword) {
        const [user] = await db_1.db
            .update(schema_1.users)
            .set({
            password: hashedPassword,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .returning();
        return user;
    }
    async updateUser(id, data) {
        // Fjern undefined værdier
        const cleanData = Object.fromEntries(Object.entries(data).filter(([_, value]) => value !== undefined));
        const result = await db_1.db
            .update(schema_1.users)
            .set(cleanData)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, id))
            .returning();
        return result[0];
    }
    async deleteUser(id) {
        console.log(`Attempting to delete user with ID: ${id}`);
        try {
            // Start en transaktion for at sikre at alle operationer enten lykkes eller fejler samlet
            await db_1.db.transaction(async (tx) => {
                console.log('Starting transaction');
                // Slet alle status historik oprettelser af denne bruger
                const statusHistoryResult = await tx
                    .delete(schema_1.statusHistory)
                    .where((0, drizzle_orm_1.eq)(schema_1.statusHistory.createdBy, id))
                    .returning();
                console.log(`Deleted ${statusHistoryResult.length} status history entries`);
                // Slet alle interne sager hvor brugeren er afsender eller modtager
                const internalCasesResult = await tx
                    .delete(schema_1.internalCases)
                    .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.internalCases.senderId, id), (0, drizzle_orm_1.eq)(schema_1.internalCases.receiverId, id)))
                    .returning();
                console.log(`Deleted ${internalCasesResult.length} internal cases`);
                // Slet alle ordrer oprettet af brugeren
                const ordersResult = await tx
                    .delete(schema_1.orders)
                    .where((0, drizzle_orm_1.eq)(schema_1.orders.createdBy, id))
                    .returning();
                console.log(`Deleted ${ordersResult.length} orders`);
                // Slet alle sager oprettet af brugeren
                const casesResult = await tx
                    .delete(schema_1.cases)
                    .where((0, drizzle_orm_1.eq)(schema_1.cases.createdBy, id))
                    .returning();
                console.log(`Deleted ${casesResult.length} cases`);
                // Til sidst slet selve brugeren
                const userResult = await tx
                    .delete(schema_1.users)
                    .where((0, drizzle_orm_1.eq)(schema_1.users.id, id))
                    .returning();
                console.log(`Deleted user: ${JSON.stringify(userResult)}`);
            });
            console.log('Transaction completed successfully');
        }
        catch (error) {
            console.error('Error in deleteUser:', error);
            throw error;
        }
    }
    async getTotalCases() {
        const result = await db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.cases)
            .where((0, drizzle_orm_1.sql) `1 = 1`);
        return result[0].count;
    }
    async getAlarmCases() {
        try {
            console.log('getAlarmCases called - using optimized SQL query');
            // Optimeret SQL query der følger den korrekte alarm logik fra shared/alarm.ts
            const alarmCasesQuery = (0, drizzle_orm_1.sql) `
        WITH case_status_duration AS (
          SELECT 
            c.id,
            c.case_number,
            c.customer_id,
            c.title,
            c.description,
            c.treatment,
            c.priority,
            c.device_type,
            c.accessories,
            c.important_notes,
            c.status,
            c.created_at,
            c.updated_at,
            c.created_by,
            COALESCE(
              (SELECT MAX(sh.created_at) 
               FROM status_history sh 
               WHERE sh.case_id = c.id AND sh.status = c.status),
              c.created_at
            ) as last_status_change,
            CASE 
              -- Four day priority alarm: created status + priority four_days + > 4 business days
              WHEN c.status = 'created' AND c.priority = 'four_days' THEN
                EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400 > 4
              -- In progress alarm: > 1 business day
              WHEN c.status = 'in_progress' THEN
                EXTRACT(EPOCH FROM (NOW() - COALESCE(
                  (SELECT MAX(sh.created_at) FROM status_history sh WHERE sh.case_id = c.id AND sh.status = 'in_progress'),
                  c.created_at
                ))) / 86400 > 1
              -- Ready for pickup alarm: > 14 business days
              WHEN c.status = 'ready_for_pickup' THEN
                EXTRACT(EPOCH FROM (NOW() - COALESCE(
                  (SELECT MAX(sh.created_at) FROM status_history sh WHERE sh.case_id = c.id AND sh.status = 'ready_for_pickup'),
                  c.created_at
                ))) / 86400 > 14
              -- Waiting customer alarm: > 14 business days
              WHEN c.status = 'waiting_customer' THEN
                EXTRACT(EPOCH FROM (NOW() - COALESCE(
                  (SELECT MAX(sh.created_at) FROM status_history sh WHERE sh.case_id = c.id AND sh.status = 'waiting_customer'),
                  c.created_at
                ))) / 86400 > 14
              -- All other statuses are not alarm
              ELSE false
            END as is_alarm
          FROM cases c
          WHERE c.status != 'completed'
        )
        SELECT * FROM case_status_duration WHERE is_alarm = true
      `;
            const result = await db_1.db.execute(alarmCasesQuery);
            const alarmCases = result.rows.map((row) => ({
                id: row.id,
                caseNumber: row.case_number,
                customerId: row.customer_id,
                title: row.title,
                description: row.description,
                treatment: row.treatment,
                priority: row.priority,
                deviceType: row.device_type,
                accessories: row.accessories,
                importantNotes: row.important_notes,
                status: row.status,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at),
                createdBy: row.created_by
            }));
            console.log(`Optimeret alarm query fandt ${alarmCases.length} sager i alarm`);
            return alarmCases;
        }
        catch (error) {
            console.error('Error getting alarm cases:', error);
            // Fallback til den gamle metode hvis SQL fejler
            console.log('Falling back to old method...');
            return this.getAlarmCasesLegacy();
        }
    }
    // Behold den gamle metode som fallback
    async getAlarmCasesLegacy() {
        try {
            const allCases = await db_1.db.select().from(schema_1.cases).where((0, drizzle_orm_1.ne)(schema_1.cases.status, 'completed')).limit(100);
            console.log('Legacy method - antal sager hentet:', allCases.length);
            const alarmCases = [];
            for (const caseItem of allCases) {
                const cleanCase = {
                    id: caseItem.id,
                    caseNumber: caseItem.caseNumber,
                    customerId: caseItem.customerId,
                    title: caseItem.title,
                    description: caseItem.description,
                    treatment: caseItem.treatment,
                    priority: caseItem.priority,
                    deviceType: caseItem.deviceType,
                    accessories: caseItem.accessories,
                    importantNotes: caseItem.importantNotes,
                    status: caseItem.status,
                    createdAt: new Date(caseItem.createdAt),
                    updatedAt: new Date(caseItem.updatedAt),
                    createdBy: caseItem.createdBy
                };
                const statusHistory = await this.getCaseStatusHistory(caseItem.id);
                if ((0, alarm_1.isCaseInAlarm)(cleanCase, statusHistory)) {
                    alarmCases.push(cleanCase);
                }
            }
            console.log('Legacy method - antal alarm-sager fundet:', alarmCases.length);
            return alarmCases;
        }
        catch (error) {
            console.error('Error in legacy alarm cases method:', error);
            return [];
        }
    }
    async getCasesInAlarm() {
        try {
            const allCases = await db_1.db.select().from(schema_1.cases);
            const casesWithHistory = await Promise.all(allCases.map(async (caseItem) => {
                const history = await this.getCaseStatusHistory(caseItem.id);
                return {
                    ...caseItem,
                    statusHistory: history
                };
            }));
            return casesWithHistory.filter(caseItem => this.isCaseInAlarm(caseItem, caseItem.statusHistory));
        }
        catch (error) {
            console.error('Fejl ved hentning af alarm-sager:', error);
            throw error;
        }
    }
    async getStatusCounts() {
        try {
            console.log('getStatusCounts called - starting query');
            // Returnér antal sager pr. status undtagen 'completed'
            const statusCounts = await db_1.db
                .select({
                status: schema_1.cases.status,
                count: (0, drizzle_orm_1.sql) `count(*)`,
            })
                .from(schema_1.cases)
                .where((0, drizzle_orm_1.ne)(schema_1.cases.status, 'completed'))
                .groupBy(schema_1.cases.status);
            console.log('Raw status counts from database:', statusCounts);
            const result = statusCounts.reduce((acc, { status, count }) => {
                acc[status] = Number(count);
                return acc;
            }, {});
            console.log('getStatusCounts final result:', result);
            return result;
        }
        catch (error) {
            console.error('Error in getStatusCounts:', error);
            return {};
        }
    }
    async deleteCustomer(id) {
        await db_1.db.delete(schema_1.customers).where((0, drizzle_orm_1.eq)(schema_1.customers.id, id));
    }
    // Customer authentication methods
    async getCustomerUser(customerId) {
        try {
            const [user] = await db_1.db
                .select()
                .from(schema_1.users)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.customerId, customerId), (0, drizzle_orm_1.eq)(schema_1.users.isCustomer, true)))
                .limit(1);
            return user;
        }
        catch (error) {
            console.error('Error getting customer user:', error);
            return undefined;
        }
    }
    async createCustomerUser(customer, caseNumber) {
        try {
            // Username er telefonnummer, password er sagsnummer (hashed)
            const hashedPassword = await Promise.resolve().then(() => __importStar(require('./auth.js'))).then(auth => auth.hashPassword(caseNumber));
            const [user] = await db_1.db
                .insert(schema_1.users)
                .values({
                username: customer.phone,
                password: hashedPassword,
                name: customer.name,
                isWorker: false,
                isAdmin: false,
                isCustomer: true,
                customerId: customer.id,
            })
                .returning();
            console.log(`Created customer user for ${customer.name} (${customer.phone})`);
            return user;
        }
        catch (error) {
            console.error('Error creating customer user:', error);
            throw error;
        }
    }
    async createOrUpdateCustomerUsers() {
        try {
            console.log('Starting customer user creation/update process...');
            // Hent alle kunder
            const allCustomers = await this.getCustomers();
            for (const customer of allCustomers) {
                // Find første sag for denne kunde
                const customerCases = await db_1.db
                    .select()
                    .from(schema_1.cases)
                    .where((0, drizzle_orm_1.eq)(schema_1.cases.customerId, customer.id))
                    .orderBy((0, drizzle_orm_1.asc)(schema_1.cases.createdAt))
                    .limit(1);
                if (customerCases.length === 0) {
                    console.log(`Springer over kunde ${customer.name} - ingen sager fundet`);
                    continue;
                }
                const firstCase = customerCases[0];
                // Tjek om customer user allerede eksisterer
                const existingUser = await this.getCustomerUser(customer.id);
                if (!existingUser) {
                    // Opret ny customer user
                    await this.createCustomerUser(customer, firstCase.caseNumber);
                    console.log(`Oprettet login for kunde: ${customer.name} (tlf: ${customer.phone}, sag: ${firstCase.caseNumber})`);
                }
                else {
                    console.log(`Kunde ${customer.name} har allerede en bruger`);
                }
            }
            console.log('Customer user creation/update process completed');
        }
        catch (error) {
            console.error('Error in createOrUpdateCustomerUsers:', error);
            throw error;
        }
    }
}
exports.DatabaseStorage = DatabaseStorage;
// Helper function for generating RMA numbers
async function generateRMANumber() {
    const prefix = "RMA";
    const rmas = await db_1.db
        .select()
        .from(schema_1.rma)
        .where((0, drizzle_orm_1.like)(schema_1.rma.rmaNumber, `${prefix}%`))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.rma.rmaNumber))
        .limit(1);
    let number = 1;
    if (rmas && rmas.length > 0) {
        const latestRMA = rmas[0];
        const match = latestRMA.rmaNumber.match(/\d+/);
        if (match) {
            number = parseInt(match[0]) + 1;
        }
    }
    return `${prefix}${number.toString().padStart(4, "0")}`;
}
// Helper function for generating order numbers
async function generateOrderNumber() {
    try {
        console.log("Generating order number");
        const latestOrder = await db_1.db
            .select()
            .from(schema_1.orders)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.orderNumber))
            .limit(1);
        console.log("Latest order:", latestOrder);
        let number = 1;
        if (latestOrder && latestOrder.length > 0) {
            const match = latestOrder[0].orderNumber.match(/\d+/);
            if (match) {
                number = parseInt(match[0]) + 1;
                console.log(`Extracted number: ${match[0]}, Next number: ${number}`);
            }
        }
        const orderNumber = `B${number.toString().padStart(5, '0')}`;
        console.log("Generated order number:", orderNumber);
        return orderNumber;
    }
    catch (error) {
        console.error("Error generating order number:", error);
        throw new Error("Der opstod en fejl ved generering af ordrenummer");
    }
}
exports.storage = new DatabaseStorage();
