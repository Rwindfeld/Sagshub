import { db } from "./db.js";
import { eq, desc, asc, and, or, like, sql } from "drizzle-orm";
import { users, customers, cases, rma, orders, internalCases, statusHistory, rmaStatusHistory } from "../shared/schema.js";
import session from "express-session";
import connectPg from "connect-pg-simple";
const PostgresSessionStore = connectPg(session);
export class DatabaseStorage {
    constructor() {
        this.sessionStore = new PostgresSessionStore({
            conObject: {
                user: 'postgres',
                host: 'localhost',
                database: 'sagshub',
                password: 'wa2657321',
                port: 5432,
            },
            createTableIfMissing: true,
        });
    }
    async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
    }
    async getUserByUsername(username) {
        const [user] = await db.select().from(users).where(eq(users.username, username));
        return user;
    }
    async createUser(userData) {
        const [user] = await db
            .insert(users)
            .values(userData)
            .returning();
        return user;
    }
    async getUsers() {
        return db.select().from(users);
    }
    async getCustomers() {
        return db.select().from(customers);
    }
    async getCustomer(id) {
        const [customer] = await db.select().from(customers).where(eq(customers.id, id));
        return customer;
    }
    async createCustomer(customerData) {
        const [customer] = await db
            .insert(customers)
            .values({
            ...customerData,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
            .returning();
        return customer;
    }
    async updateCustomer(id, customerData) {
        const [customer] = await db
            .update(customers)
            .set({
            ...customerData,
            updatedAt: new Date(),
        })
            .where(eq(customers.id, id))
            .returning();
        return customer;
    }
    async searchCustomers(searchTerm) {
        if (!searchTerm?.trim()) {
            return [];
        }
        const searchTermTrimmed = searchTerm.trim();
        const searchPattern = `%${searchTermTrimmed}%`;
        return db.select()
            .from(customers)
            .where(or(like(customers.name, searchPattern), like(customers.phone, searchPattern), like(customers.email, searchPattern), eq(customers.id, parseInt(searchTermTrimmed))))
            .limit(10);
    }
    async getCases(customerId) {
        try {
            const query = db
                .select({
                id: cases.id,
                caseNumber: cases.caseNumber,
                customerId: cases.customerId,
                customerName: customers.name,
                title: cases.title,
                description: cases.description,
                treatment: cases.treatment,
                priority: cases.priority,
                deviceType: cases.deviceType,
                accessories: cases.accessories,
                importantNotes: cases.importantNotes,
                status: cases.status,
                createdAt: cases.createdAt,
                updatedAt: cases.updatedAt,
                createdBy: users.name,
            })
                .from(cases)
                .leftJoin(customers, eq(cases.customerId, customers.id))
                .leftJoin(users, eq(cases.createdBy, users.id))
                .orderBy(desc(cases.createdAt));
            if (customerId) {
                query.where(eq(cases.customerId, customerId));
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
            const [case_] = await db
                .select()
                .from(cases)
                .where(eq(cases.caseNumber, caseNumber));
            return case_;
        }
        catch (error) {
            console.error("Error finding case by number:", error);
            return undefined;
        }
    }
    async getCase(idOrNumber) {
        try {
            console.log(`Getting case with idOrNumber: ${idOrNumber}`);
            const query = db
                .select({
                id: cases.id,
                caseNumber: cases.caseNumber,
                customerId: cases.customerId,
                title: cases.title,
                description: cases.description,
                treatment: cases.treatment,
                priority: cases.priority,
                deviceType: cases.deviceType,
                accessories: cases.accessories,
                importantNotes: cases.importantNotes,
                status: cases.status,
                createdAt: cases.createdAt,
                updatedAt: cases.updatedAt,
                createdBy: cases.createdBy,
                customer: {
                    id: customers.id,
                    name: customers.name,
                    phone: customers.phone,
                    email: customers.email,
                    address: customers.address,
                    city: customers.city,
                    postalCode: customers.postalCode,
                    notes: customers.notes
                }
            })
                .from(cases)
                .leftJoin(customers, eq(cases.customerId, customers.id));
            if (typeof idOrNumber === 'string') {
                query.where(eq(cases.caseNumber, idOrNumber.toUpperCase()));
            }
            else {
                query.where(eq(cases.id, idOrNumber));
            }
            const [case_] = await query;
            if (!case_) {
                console.log('No case found');
                return undefined;
            }
            // Konverter snake_case til camelCase i customer objektet
            if (case_.customer) {
                const { customer } = case_;
                case_.customer = {
                    id: customer.id,
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email,
                    address: customer.address,
                    city: customer.city,
                    postalCode: customer.postalCode,
                    notes: customer.notes
                };
            }
            console.log('Found case:', case_);
            return case_;
        }
        catch (error) {
            console.error("Error in getCase:", error);
            return undefined;
        }
    }
    async createCase(caseData) {
        const [case_] = await db
            .insert(cases)
            .values({
            ...caseData,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
            .returning();
        return case_;
    }
    async updateCaseStatus(id, status) {
        const [case_] = await db
            .update(cases)
            .set({ status, updatedAt: new Date() })
            .where(eq(cases.id, id))
            .returning();
        return case_;
    }
    async getLatestCaseNumber(prefix) {
        const result = await db
            .select()
            .from(cases)
            .where(sql `substring(${cases.caseNumber} from 1 for ${prefix.length}) = ${prefix}`)
            .orderBy(desc(cases.caseNumber))
            .limit(1);
        console.log(`getLatestCaseNumber for prefix ${prefix} returned:`, result);
        return result;
    }
    async getCaseStatusHistory(caseId) {
        try {
            // Tjek først om sagen eksisterer og hent alle nødvendige felter
            const [caseExists] = await db
                .select()
                .from(cases)
                .where(eq(cases.id, caseId));
            if (!caseExists) {
                console.log(`Sag med id ${caseId} findes ikke`);
                return [];
            }
            const history = await db
                .select({
                id: statusHistory.id,
                caseId: statusHistory.caseId,
                status: statusHistory.status,
                comment: statusHistory.comment,
                createdAt: statusHistory.createdAt,
                createdBy: statusHistory.createdBy,
                createdByName: users.name,
            })
                .from(statusHistory)
                .leftJoin(users, eq(statusHistory.createdBy, users.id))
                .where(eq(statusHistory.caseId, caseId))
                .orderBy(desc(statusHistory.createdAt));
            return history.map(record => ({
                ...record,
                createdByName: record.createdByName || "System",
            }));
        }
        catch (error) {
            console.error("Fejl i getCaseStatusHistory:", error);
            return [];
        }
    }
    async updateCaseStatusWithHistory(caseId, status, comment, userId) {
        const [updatedCase] = await db
            .update(cases)
            .set({
            status,
            updatedAt: new Date(),
        })
            .where(eq(cases.id, caseId))
            .returning();
        await db.insert(statusHistory).values({
            caseId,
            status,
            comment,
            createdBy: userId,
            createdAt: new Date(),
        });
        return updatedCase;
    }
    async searchCases(searchTerm) {
        if (!searchTerm?.trim()) {
            return [];
        }
        const searchTermTrimmed = searchTerm.trim();
        const searchPattern = `%${searchTermTrimmed}%`;
        return db.select({
            ...cases,
            customerName: customers.name
        })
            .from(cases)
            .leftJoin(customers, eq(cases.customerId, customers.id))
            .where(or(like(cases.caseNumber, searchPattern), like(cases.title, searchPattern), like(cases.description, searchPattern), like(customers.name, searchPattern), eq(cases.id, parseInt(searchTermTrimmed))))
            .limit(10);
    }
    async getRMAs() {
        return db
            .select({
            id: rma.id,
            customerId: rma.customerId,
            customerName: rma.customerName,
            invoiceNumber: rma.invoiceNumber,
            faultDate: rma.faultDate,
            faultDescription: rma.faultDescription,
            modelName: rma.modelName,
            sku: rma.sku,
            serialNumber: rma.serialNumber,
            supplier: rma.supplier,
            status: rma.status,
            createdAt: rma.createdAt,
            updatedAt: rma.updatedAt,
            rmaNumber: rma.rmaNumber,
        })
            .from(rma)
            .orderBy(desc(rma.createdAt));
    }
    async getRMA(id) {
        const [rmaCase] = await db
            .select({
            id: rma.id,
            rmaNumber: rma.rmaNumber,
            customerId: rma.customerId,
            customerName: customers.name,
            customerPhone: customers.phone,
            customerEmail: customers.email,
            customerAddress: customers.address,
            customerCity: customers.city,
            customerPostalCode: customers.postalCode,
            customerNotes: customers.notes,
            customerCreatedAt: customers.createdAt,
            description: rma.description,
            faultDescription: rma.description,
            deliveryDate: rma.deliveryDate,
            model: rma.model,
            modelName: rma.model,
            sku: rma.sku,
            serialNumber: rma.serialNumber,
            supplier: rma.supplier,
            shipmentDate: rma.shipmentDate,
            status: rma.status,
            createdAt: rma.createdAt,
            updatedAt: rma.updatedAt,
            createdBy: rma.createdBy,
            createdByName: users.name
        })
            .from(rma)
            .leftJoin(customers, eq(rma.customerId, customers.id))
            .leftJoin(users, eq(rma.createdBy, users.id))
            .where(eq(rma.id, id));
        return rmaCase;
    }
    async createRMA(rmaData) {
        try {
            const rmaNumber = await generateRMANumber();
            console.log("RMA data being saved:", { ...rmaData, rmaNumber, createdBy: rmaData.createdBy });
            const [newRMA] = await db
                .insert(rma)
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
        const [updatedRMA] = await db
            .update(rma)
            .set({
            status,
            updatedAt: new Date(),
        })
            .where(eq(rma.id, id))
            .returning();
        return updatedRMA;
    }
    async getRMAStatusHistory(rmaId) {
        try {
            const history = await db
                .select({
                id: rmaStatusHistory.id,
                rmaId: rmaStatusHistory.rmaId,
                status: rmaStatusHistory.status,
                comment: rmaStatusHistory.comment,
                createdAt: rmaStatusHistory.createdAt,
                createdBy: rmaStatusHistory.createdBy,
                createdByName: users.name,
            })
                .from(rmaStatusHistory)
                .leftJoin(users, eq(rmaStatusHistory.createdBy, users.id))
                .where(eq(rmaStatusHistory.rmaId, rmaId))
                .orderBy(desc(rmaStatusHistory.createdAt));
            return history.map(record => ({
                ...record,
                createdByName: record.createdByName || "System",
            }));
        }
        catch (error) {
            console.error("Error in getRMAStatusHistory:", error);
            return [];
        }
    }
    async updateRMAStatusWithHistory(rmaId, status, comment, userId) {
        const [updatedRMA] = await db
            .update(rma)
            .set({
            status,
            updatedAt: new Date(),
        })
            .where(eq(rma.id, rmaId))
            .returning();
        await db.insert(rmaStatusHistory).values({
            rmaId,
            status,
            comment,
            createdBy: userId,
            createdAt: new Date(),
        });
        return updatedRMA;
    }
    async updateRMA(id, rmaData) {
        const [updatedRMA] = await db
            .update(rma)
            .set({
            ...rmaData,
            updatedAt: new Date(),
        })
            .where(eq(rma.id, id))
            .returning();
        return updatedRMA;
    }
    async updateCase(id, caseData) {
        try {
            console.log('Opdaterer sag med ID:', id, 'Data:', JSON.stringify(caseData, null, 2));
            // Tjek først om sagen eksisterer
            const [existingCase] = await db
                .select()
                .from(cases)
                .where(eq(cases.id, id));
            if (!existingCase) {
                console.log('Sag ikke fundet med ID:', id);
                return undefined;
            }
            // Fjern ugyldige felter
            const cleanedData = { ...caseData };
            delete cleanedData.customer_search;
            delete cleanedData.customer_phone;
            // Udfør opdateringen med Drizzle ORM
            const [updatedCase] = await db
                .update(cases)
                .set({
                ...cleanedData,
                updatedAt: new Date()
            })
                .where(eq(cases.id, id))
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
            // Opret base query
            let query = db
                .select({
                id: cases.id,
                caseNumber: cases.caseNumber,
                customerId: cases.customerId,
                customerName: customers.name,
                title: cases.title,
                description: cases.description,
                treatment: cases.treatment,
                priority: cases.priority,
                deviceType: cases.deviceType,
                accessories: cases.accessories,
                importantNotes: cases.importantNotes,
                status: cases.status,
                createdAt: cases.createdAt,
                updatedAt: cases.updatedAt,
                createdBy: users.name,
            })
                .from(cases)
                .leftJoin(customers, eq(cases.customerId, customers.id))
                .leftJoin(users, eq(cases.createdBy, users.id));
            if (searchTerm) {
                query = query.where(or(like(cases.title, `%${searchTerm}%`), like(cases.caseNumber, `%${searchTerm}%`), like(cases.description, `%${searchTerm}%`), like(customers.name, `%${searchTerm}%`)));
            }
            if (treatment) {
                query = query.where(eq(cases.treatment, treatment));
            }
            if (priority) {
                query = query.where(eq(cases.priority, priority));
            }
            if (status) {
                query = query.where(eq(cases.status, status));
            }
            if (customerId) {
                query = query.where(eq(cases.customerId, customerId));
            }
            if (sort) {
                const [field, direction] = sort.split(':');
                if (field === 'createdAt') {
                    query = query.orderBy(direction === 'desc' ? desc(cases.createdAt) : asc(cases.createdAt));
                }
                else if (field === 'updatedAt') {
                    query = query.orderBy(direction === 'desc' ? desc(cases.updatedAt) : asc(cases.updatedAt));
                }
            }
            else {
                query = query.orderBy(desc(cases.updatedAt));
            }
            // Hent total antal sager før paginering
            const [{ count }] = await db
                .select({ count: sql `count(*)` })
                .from(cases)
                .where(query._where || sql `true`);
            // Tilføj paginering til hovedforespørgslen
            const items = await query
                .limit(pageSize)
                .offset(offset);
            return {
                items,
                total: Number(count),
                page,
                pageSize,
                totalPages: Math.ceil(Number(count) / pageSize)
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
            const query = db
                .select()
                .from(customers);
            // Add search conditions if searchTerm is provided
            if (searchTerm?.trim()) {
                const searchValue = searchTerm.trim().toLowerCase();
                const numericSearch = parseInt(searchValue);
                const isNumeric = !isNaN(numericSearch);
                query.where(or(sql `LOWER(${customers.name}) LIKE ${`%${searchValue}%`}`, sql `LOWER(${customers.phone}) LIKE ${`%${searchValue}%`}`, sql `LOWER(${customers.email}) LIKE ${`%${searchValue}%`}`, sql `LOWER(${customers.address}) LIKE ${`%${searchValue}%`}`, sql `LOWER(${customers.city}) LIKE ${`%${searchValue}%`}`, isNumeric ? eq(customers.id, numericSearch) : sql `false`));
            }
            // Get total count with same filters
            const countQuery = db
                .select({ count: sql `count(*)` })
                .from(customers);
            // Apply same search conditions to count query
            if (searchTerm?.trim()) {
                const searchValue = searchTerm.trim().toLowerCase();
                const numericSearch = parseInt(searchValue);
                const isNumeric = !isNaN(numericSearch);
                countQuery.where(or(sql `LOWER(${customers.name}) LIKE ${`%${searchValue}%`}`, sql `LOWER(${customers.phone}) LIKE ${`%${searchValue}%`}`, sql `LOWER(${customers.email}) LIKE ${`%${searchValue}%`}`, sql `LOWER(${customers.address}) LIKE ${`%${searchValue}%`}`, sql `LOWER(${customers.city}) LIKE ${`%${searchValue}%`}`, isNumeric ? eq(customers.id, numericSearch) : sql `false`));
            }
            console.log('Executing search query...');
            const [{ count }] = await countQuery;
            const totalPages = Math.ceil(count / pageSize);
            // Apply pagination and ordering
            const items = await query
                .orderBy(desc(customers.createdAt))
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
            const countResult = await db.execute(sql([countQuery]));
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
            const result = await db.execute(sql([dataQuery]));
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
            const result = await db.execute(sql([query]));
            return result.rows || [];
        }
        catch (error) {
            console.error("Error in getRMAsByCustomerId:", error);
            return [];
        }
    }
    async getOrders() {
        const ordersData = await db.select().from(orders);
        return ordersData;
    }
    async getOrder(id) {
        try {
            // Først henter vi ordren med kundenavn
            const [orderWithCustomer] = await db
                .select({
                ...orders,
                customerName: customers.name
            })
                .from(orders)
                .leftJoin(customers, eq(orders.customerId, customers.id))
                .where(eq(orders.id, id));
            if (!orderWithCustomer)
                return undefined;
            // Så henter vi yderligere kundeinfo
            const [customer] = await db
                .select({
                name: customers.name,
                phone: customers.phone,
                email: customers.email
            })
                .from(customers)
                .where(eq(customers.id, orderWithCustomer.customerId));
            // Henter medarbejderinfo
            const [createdByUser] = await db
                .select({
                name: users.name
            })
                .from(users)
                .where(eq(users.id, orderWithCustomer.createdBy));
            // Tjekker om der er relaterede sager og henter dem
            let caseInfo = undefined;
            if (orderWithCustomer.caseId) {
                const [caseData] = await db
                    .select({
                    caseNumber: cases.caseNumber,
                    description: cases.description
                })
                    .from(cases)
                    .where(eq(cases.id, orderWithCustomer.caseId));
                if (caseData) {
                    caseInfo = caseData;
                }
            }
            // Tjekker om der er relateret RMA og henter info
            let rmaInfo = undefined;
            if (orderWithCustomer.rmaId) {
                const [rmaData] = await db
                    .select({
                    rmaNumber: rma.rmaNumber,
                    description: rma.description
                })
                    .from(rma)
                    .where(eq(rma.id, orderWithCustomer.rmaId));
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
        const [order] = await db
            .select()
            .from(orders)
            .orderBy(desc(orders.orderNumber))
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
        const [order] = await db
            .insert(orders)
            .values(formattedData)
            .returning();
        console.log("Created order:", order);
        return order;
    }
    async updateOrderStatus(id, status) {
        const [order] = await db
            .update(orders)
            .set({
            status,
            updatedAt: new Date(),
        })
            .where(eq(orders.id, id))
            .returning();
        return order;
    }
    async updateOrder(id, orderData) {
        const [order] = await db
            .update(orders)
            .set({
            ...orderData,
            updatedAt: new Date(),
        })
            .where(eq(orders.id, id))
            .returning();
        return order;
    }
    async getPaginatedOrders(options) {
        const { page, pageSize, searchTerm, status, sort, customerId } = options;
        const offset = (page - 1) * pageSize;
        // Build where conditions
        let conditions = [];
        if (searchTerm) {
            conditions.push(like(orders.orderNumber, `%${searchTerm}%`));
        }
        if (status) {
            conditions.push(eq(orders.status, status));
        }
        if (customerId) {
            conditions.push(eq(orders.customerId, customerId));
        }
        // Build order by
        let orderBy;
        if (sort === "-createdAt") {
            orderBy = desc(orders.createdAt);
        }
        else if (sort === "createdAt") {
            orderBy = asc(orders.createdAt);
        }
        else if (sort === "-orderDate") {
            orderBy = desc(orders.orderDate);
        }
        else if (sort === "orderDate") {
            orderBy = asc(orders.orderDate);
        }
        else {
            orderBy = desc(orders.createdAt);
        }
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        // Get total count
        const [{ count }] = await db
            .select({ count: sql `count(*)` })
            .from(orders)
            .where(whereClause || sql `true`);
        // Get paginated results with customer name
        const items = await db
            .select({
            ...orders,
            customerName: customers.name
        })
            .from(orders)
            .leftJoin(customers, eq(orders.customerId, customers.id))
            .where(whereClause || sql `true`)
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
        return db
            .select({
            ...orders,
            customerName: customers.name
        })
            .from(orders)
            .leftJoin(customers, eq(orders.customerId, customers.id))
            .where(eq(orders.customerId, customerId))
            .orderBy(desc(orders.createdAt));
    }
    async getOrdersByCaseId(caseId) {
        return db
            .select({
            ...orders,
            customerName: customers.name
        })
            .from(orders)
            .leftJoin(customers, eq(orders.customerId, customers.id))
            .where(eq(orders.caseId, caseId))
            .orderBy(desc(orders.createdAt));
    }
    // Interne sager methods
    async createInternalCase(internalCaseData) {
        const [internalCase] = await db
            .insert(internalCases)
            .values(internalCaseData)
            .returning();
        return internalCase;
    }
    async getInternalCase(id) {
        const result = await db
            .select({
            id: internalCases.id,
            caseId: internalCases.caseId,
            senderId: internalCases.senderId,
            receiverId: internalCases.receiverId,
            message: internalCases.message,
            read: internalCases.read,
            createdAt: internalCases.createdAt,
            updatedAt: internalCases.updatedAt,
            caseCaseNumber: cases.caseNumber,
            senderName: sql `sender.name`.as('senderName'),
            receiverName: sql `receiver.name`.as('receiverName'),
            customerName: customers.name,
        })
            .from(internalCases)
            .innerJoin(cases, eq(internalCases.caseId, cases.id))
            .innerJoin(customers, eq(cases.customerId, customers.id))
            .innerJoin(sql `users sender`, eq(internalCases.senderId, sql `sender.id`))
            .innerJoin(sql `users receiver`, eq(internalCases.receiverId, sql `receiver.id`))
            .where(eq(internalCases.id, id));
        if (result.length === 0) {
            return undefined;
        }
        return result[0];
    }
    async getPaginatedInternalCases(options) {
        const { page, pageSize, userId, onlySent, onlyReceived, onlyUnread } = options;
        const offset = (page - 1) * pageSize;
        // Build where conditions
        let whereConditions = sql `1=1`;
        if (onlySent && !onlyReceived) {
            whereConditions = sql `${whereConditions} AND ic.sender_id = ${userId}`;
        }
        else if (onlyReceived && !onlySent) {
            whereConditions = sql `${whereConditions} AND ic.receiver_id = ${userId}`;
        }
        else {
            // Default: both sent and received
            whereConditions = sql `${whereConditions} AND (ic.sender_id = ${userId} OR ic.receiver_id = ${userId})`;
        }
        if (onlyUnread) {
            whereConditions = sql `${whereConditions} AND ic.read = false AND ic.receiver_id = ${userId}`;
        }
        // Get total count
        const countResult = await db.execute(sql `SELECT COUNT(*)::int AS count FROM internal_cases ic WHERE ${whereConditions}`);
        const total = countResult.rows[0].count;
        // Get paginated results with details
        const query = sql `
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
        const result = await db.execute(query);
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
        const [internalCase] = await db
            .update(internalCases)
            .set({
            read: true,
            updatedAt: new Date(),
        })
            .where(eq(internalCases.id, id))
            .returning();
        return internalCase;
    }
    async getUnreadInternalCasesCount(userId) {
        try {
            console.log(`Tæller ulæste interne sager for bruger ${userId}`);
            const result = await db
                .select({ count: sql `count(*)` })
                .from(internalCases)
                .where(and(eq(internalCases.receiverId, userId), eq(internalCases.read, false)));
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
        return db.select({
            ...rma,
            customerName: customers.name
        })
            .from(rma)
            .leftJoin(customers, eq(rma.customerId, customers.id))
            .where(or(like(rma.rmaNumber, searchPattern), like(rma.title, searchPattern), like(rma.description, searchPattern), like(customers.name, searchPattern), eq(rma.id, parseInt(searchTermTrimmed))))
            .limit(10);
    }
    async updateUserPassword(userId, hashedPassword) {
        const [user] = await db
            .update(users)
            .set({
            password: hashedPassword,
            updatedAt: new Date(),
        })
            .where(eq(users.id, userId))
            .returning();
        return user;
    }
    async updateUser(id, data) {
        const result = await db
            .update(users)
            .set(data)
            .where(eq(users.id, id))
            .returning();
        return result[0];
    }
    async deleteUser(id) {
        console.log(`Attempting to delete user with ID: ${id}`);
        try {
            // Start en transaktion for at sikre at alle operationer enten lykkes eller fejler samlet
            await db.transaction(async (tx) => {
                console.log('Starting transaction');
                // Slet alle status historik oprettelser af denne bruger
                const statusHistoryResult = await tx
                    .delete(statusHistory)
                    .where(eq(statusHistory.createdBy, id))
                    .returning();
                console.log(`Deleted ${statusHistoryResult.length} status history entries`);
                // Slet alle interne sager hvor brugeren er afsender eller modtager
                const internalCasesResult = await tx
                    .delete(internalCases)
                    .where(or(eq(internalCases.senderId, id), eq(internalCases.receiverId, id)))
                    .returning();
                console.log(`Deleted ${internalCasesResult.length} internal cases`);
                // Slet alle ordrer oprettet af brugeren
                const ordersResult = await tx
                    .delete(orders)
                    .where(eq(orders.createdBy, id))
                    .returning();
                console.log(`Deleted ${ordersResult.length} orders`);
                // Slet alle sager oprettet af brugeren
                const casesResult = await tx
                    .delete(cases)
                    .where(eq(cases.createdBy, id))
                    .returning();
                console.log(`Deleted ${casesResult.length} cases`);
                // Til sidst slet selve brugeren
                const userResult = await tx
                    .delete(users)
                    .where(eq(users.id, id))
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
}
// Helper function for generating RMA numbers
async function generateRMANumber() {
    const prefix = "RMA";
    const rmas = await db
        .select()
        .from(rma)
        .where(like(rma.rmaNumber, `${prefix}%`))
        .orderBy(desc(rma.rmaNumber))
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
export async function generateOrderNumber() {
    try {
        console.log("Generating order number");
        const latestOrder = await db
            .select()
            .from(orders)
            .orderBy(desc(orders.orderNumber))
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
export const storage = new DatabaseStorage();
