var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  CaseStatus: () => CaseStatus,
  DeviceType: () => DeviceType,
  PriorityType: () => PriorityType,
  RMAStatus: () => RMAStatus,
  TreatmentType: () => TreatmentType,
  cases: () => cases,
  casesRelations: () => casesRelations,
  customers: () => customers,
  insertCaseSchema: () => insertCaseSchema,
  insertCustomerSchema: () => insertCustomerSchema,
  insertRMASchema: () => insertRMASchema,
  insertUserSchema: () => insertUserSchema,
  rma: () => rma,
  rmaRelations: () => rmaRelations,
  rmaStatusHistory: () => rmaStatusHistory,
  rmaStatusHistoryRelations: () => rmaStatusHistoryRelations,
  statusHistory: () => statusHistory,
  statusHistoryRelations: () => statusHistoryRelations,
  updateCaseSchema: () => updateCaseSchema2,
  users: () => users,
  usersRelations: () => usersRelations
});
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isWorker: boolean("is_worker").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  name: text("name").notNull()
});
var customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  notes: text("notes")
});
var TreatmentType = {
  REPAIR: "repair",
  WARRANTY: "warranty",
  SETUP: "setup",
  OTHER: "other"
};
var PriorityType = {
  FREE_DIAGNOSIS: "free_diagnosis",
  FOUR_DAYS: "four_days",
  FIRST_PRIORITY: "first_priority",
  ASAP: "asap"
};
var DeviceType = {
  LAPTOP: "laptop",
  PC: "pc",
  PRINTER: "printer",
  OTHER: "other"
};
var CaseStatus = {
  CREATED: "created",
  IN_PROGRESS: "in_progress",
  OFFER_CREATED: "offer_created",
  WAITING_CUSTOMER: "waiting_customer",
  OFFER_ACCEPTED: "offer_accepted",
  OFFER_REJECTED: "offer_rejected",
  WAITING_PARTS: "waiting_parts",
  PREPARING_DELIVERY: "preparing_delivery",
  READY_FOR_PICKUP: "ready_for_pickup",
  COMPLETED: "completed"
};
var cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  caseNumber: text("case_number").notNull(),
  customerId: integer("customer_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  treatment: text("treatment").notNull(),
  priority: text("priority").notNull(),
  deviceType: text("device_type").notNull(),
  accessories: text("accessories"),
  importantNotes: text("important_notes"),
  status: text("status").notNull().default("created"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id)
  // Gør createdBy required
});
var statusHistory = pgTable("status_history", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => cases.id),
  status: text("status").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id)
});
var usersRelations = relations(users, ({ many }) => ({
  cases: many(cases),
  statusHistory: many(statusHistory)
}));
var casesRelations = relations(cases, ({ one }) => ({
  customer: one(customers, {
    fields: [cases.customerId],
    references: [customers.id]
  }),
  createdByUser: one(users, {
    fields: [cases.createdBy],
    references: [users.id]
  })
}));
var statusHistoryRelations = relations(statusHistory, ({ one }) => ({
  case: one(cases, {
    fields: [statusHistory.caseId],
    references: [cases.id]
  }),
  createdByUser: one(users, {
    fields: [statusHistory.createdBy],
    references: [users.id]
  })
}));
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  isWorker: true,
  isAdmin: true
}).extend({
  username: z.string().min(1, "Brugernavn er p\xE5kr\xE6vet"),
  password: z.string().min(6, "Adgangskode skal v\xE6re mindst 6 tegn"),
  name: z.string().min(1, "Navn er p\xE5kr\xE6vet")
});
var insertCustomerSchema = createInsertSchema(customers).pick({
  name: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  postalCode: true,
  notes: true
}).extend({
  name: z.string().min(1, "Navn er p\xE5kr\xE6vet"),
  phone: z.string().min(1, "Telefon er p\xE5kr\xE6vet"),
  email: z.string().optional().nullable().transform((e) => e === "" ? null : e),
  address: z.string().optional().nullable().transform((e) => e === "" ? null : e),
  city: z.string().optional().nullable().transform((e) => e === "" ? null : e),
  postalCode: z.string().optional().nullable().transform((e) => e === "" ? null : e),
  notes: z.string().optional().nullable().transform((e) => e === "" ? null : e)
});
var insertCaseSchema = createInsertSchema(cases).pick({
  customerId: true,
  title: true,
  description: true,
  treatment: true,
  priority: true,
  deviceType: true,
  accessories: true,
  importantNotes: true
}).extend({
  title: z.string().min(1, "Titel er p\xE5kr\xE6vet"),
  description: z.string().min(1, "Beskrivelse er p\xE5kr\xE6vet"),
  treatment: z.enum(["repair", "warranty", "setup", "other"], {
    required_error: "Behandling er p\xE5kr\xE6vet",
    invalid_type_error: "V\xE6lg en gyldig behandlingstype"
  }),
  priority: z.enum(["free_diagnosis", "four_days", "first_priority", "asap"], {
    required_error: "Prioritet er p\xE5kr\xE6vet",
    invalid_type_error: "V\xE6lg en gyldig prioritet"
  }),
  deviceType: z.enum(["laptop", "pc", "printer", "other"], {
    required_error: "Enhedstype er p\xE5kr\xE6vet",
    invalid_type_error: "V\xE6lg en gyldig enhedstype"
  }),
  accessories: z.string().nullable(),
  importantNotes: z.string().nullable(),
  customerSearch: z.string().optional(),
  customerPhone: z.string().optional(),
  customerId: z.number().optional()
});
var updateCaseSchema2 = z.object({
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  latestComment: z.string().optional()
});
var RMAStatus = {
  CREATED: "oprettet",
  IN_PROGRESS: "p\xE5begyndt",
  SENT: "afsendt",
  WAITING_CUSTOMER: "afventer_kunde",
  WAITING_WORKSHOP: "afventer_v\xE6rksted",
  WAITING_RESPONSE: "afventer_svar",
  WAITING_PARTS: "afventer_dele",
  CASE_CLOSED: "sag_lukket",
  CASE_REJECTED: "sag_afvist",
  CASE_APPROVED: "sag_godkendt",
  RETURNED: "sendt_retur",
  COMPLETED: "afsluttet"
};
var rma = pgTable("rma", {
  id: serial("id").primaryKey(),
  rmaNumber: text("rma_number").notNull(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  description: text("description").notNull(),
  deliveryDate: timestamp("delivery_date").notNull(),
  sku: text("sku"),
  model: text("model"),
  serialNumber: text("serial_number"),
  supplier: text("supplier"),
  supplierRmaId: text("supplier_rma_id"),
  shipmentDate: timestamp("shipment_date"),
  status: text("status").notNull().default("oprettet"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id)
});
var insertRMASchema = createInsertSchema(rma).pick({
  customerId: true,
  description: true,
  deliveryDate: true,
  sku: true,
  model: true,
  serialNumber: true,
  supplier: true,
  supplierRmaId: true,
  shipmentDate: true
}).extend({
  description: z.string().min(1, "Fejlbeskrivelse er p\xE5kr\xE6vet"),
  customerId: z.number(),
  sku: z.string().optional().nullable().transform((e) => e === "" ? null : e),
  model: z.string().optional().nullable().transform((e) => e === "" ? null : e),
  serialNumber: z.string().optional().nullable().transform((e) => e === "" ? null : e),
  supplier: z.string().optional().nullable().transform((e) => e === "" ? null : e),
  supplierRmaId: z.string().optional().nullable().transform((e) => e === "" ? null : e),
  deliveryDate: z.coerce.date(),
  shipmentDate: z.coerce.date().optional().nullable(),
  customerSearch: z.string().optional(),
  customerPhone: z.string().optional()
});
var rmaRelations = relations(rma, ({ one }) => ({
  customer: one(customers, {
    fields: [rma.customerId],
    references: [customers.id]
  })
}));
var rmaStatusHistory = pgTable("rma_status_history", {
  id: serial("id").primaryKey(),
  rmaId: integer("rma_id").notNull().references(() => rma.id),
  status: text("status").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull().references(() => users.id)
});
var rmaStatusHistoryRelations = relations(rmaStatusHistory, ({ one }) => ({
  rma: one(rma, {
    fields: [rmaStatusHistory.rmaId],
    references: [rma.id]
  }),
  createdByUser: one(users, {
    fields: [rmaStatusHistory.createdBy],
    references: [users.id]
  })
}));

// server/db.ts
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
var { Pool } = pg;
var connectionConfig = {
  user: "postgres",
  host: "localhost",
  database: "sagshub",
  password: "wa2657321",
  port: 5432
};
var pool = new Pool(connectionConfig);
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, ilike, or, like, desc, sql, asc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
var PostgresSessionStore = connectPg(session);
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        user: "postgres",
        host: "localhost",
        database: "sagshub",
        password: "wa2657321",
        port: 5432
      },
      createTableIfMissing: true
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
    const [user] = await db.insert(users).values(userData).returning();
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
    const [customer] = await db.insert(customers).values({
      ...customerData,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return customer;
  }
  async updateCustomer(id, customerData) {
    const [customer] = await db.update(customers).set({
      ...customerData,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(customers.id, id)).returning();
    return customer;
  }
  async searchCustomers(searchTerm) {
    return db.select().from(customers).where(
      or(
        ilike(customers.name, `%${searchTerm}%`),
        ilike(customers.phone, `%${searchTerm}%`)
      )
    ).limit(5);
  }
  async getCases(customerId) {
    try {
      const query = db.select({
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
        createdBy: users.name
      }).from(cases).leftJoin(customers, eq(cases.customerId, customers.id)).leftJoin(users, eq(cases.createdBy, users.id)).orderBy(desc(cases.createdAt));
      if (customerId) {
        query.where(eq(cases.customerId, customerId));
      }
      const result = await query;
      return result.map((row) => ({
        ...row,
        customerName: row.customerName || `Kunde #${row.customerId}`,
        createdBy: row.createdBy || "System"
      }));
    } catch (error) {
      console.error("Error in getCases:", error);
      return [];
    }
  }
  async getCase(id) {
    const [case_] = await db.select({
      id: cases.id,
      caseNumber: cases.caseNumber,
      customerId: cases.customerId,
      customerName: customers.name,
      customer: {
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        email: customers.email
      },
      title: cases.title,
      description: cases.description,
      treatment: cases.treatment,
      priority: cases.priority,
      deviceType: cases.deviceType,
      accessories: cases.accessories,
      importantNotes: cases.importantNotes,
      loginInfo: cases.loginInfo,
      purchasedHere: cases.purchasedHere,
      purchaseDate: cases.purchaseDate,
      status: cases.status,
      createdAt: cases.createdAt,
      updatedAt: cases.updatedAt,
      createdBy: cases.createdBy
    }).from(cases).leftJoin(customers, eq(cases.customerId, customers.id)).where(eq(cases.id, id));
    
    if (case_) {
      return {
        ...case_,
        customerName: case_.customerName || `Kunde #${case_.customerId}`
      };
    }
    return case_;
  }
  async createCase(caseData) {
    const [case_] = await db.insert(cases).values({
      ...caseData,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return case_;
  }
  async updateCaseStatus(id, status) {
    const [case_] = await db.update(cases).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq(cases.id, id)).returning();
    return case_;
  }
  async getLatestCaseNumber(prefix) {
    const result = await db.select().from(cases).where(sql`substring(${cases.caseNumber} from 1 for ${prefix.length}) = ${prefix}`).orderBy(desc(cases.caseNumber)).limit(1);
    console.log(`getLatestCaseNumber for prefix ${prefix} returned:`, result);
    return result;
  }
  async getCaseStatusHistory(caseId) {
    try {
      const history = await db.select({
        id: statusHistory.id,
        caseId: statusHistory.caseId,
        status: statusHistory.status,
        comment: statusHistory.comment,
        createdAt: statusHistory.createdAt,
        createdBy: statusHistory.createdBy,
        createdByName: users.name
      }).from(statusHistory).leftJoin(users, eq(statusHistory.createdBy, users.id)).where(eq(statusHistory.caseId, caseId)).orderBy(desc(statusHistory.createdAt));
      return history.map((record) => ({
        ...record,
        createdByName: record.createdByName || "System"
      }));
    } catch (error) {
      console.error("Error in getCaseStatusHistory:", error);
      return [];
    }
  }
  async updateCaseStatusWithHistory(caseId, status, comment, userId) {
    const [updatedCase] = await db.update(cases).set({
      status,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(cases.id, caseId)).returning();
    await db.insert(statusHistory).values({
      caseId,
      status,
      comment,
      createdBy: userId,
      createdAt: /* @__PURE__ */ new Date()
    });
    return updatedCase;
  }
  async searchCases(searchTerm) {
    try {
      const query = db.select({
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
        createdBy: users.name
      }).from(cases).leftJoin(customers, eq(cases.customerId, customers.id)).leftJoin(users, eq(cases.createdBy, users.id));
      if (searchTerm?.trim()) {
        query.where(
          or(
            ilike(cases.caseNumber, `%${searchTerm.trim()}%`),
            ilike(customers.name, `%${searchTerm.trim()}%`),
            ilike(customers.phone, `%${searchTerm.trim()}%`),
            ilike(cases.title, `%${searchTerm.trim()}%`),
            ilike(cases.description, `%${searchTerm.trim()}%`)
          )
        );
      }
      const result = await query.orderBy(desc(cases.createdAt));
      return result.map((row) => ({
        ...row,
        customerName: row.customerName || `Kunde #${row.customerId}`,
        createdBy: row.createdBy || "System"
      }));
    } catch (error) {
      console.error("Error in searchCases:", error);
      return [];
    }
  }
  async getRMAs() {
    return db.select({
      id: rma.id,
      customerId: rma.customerId,
      customerName: rma.customerName,
      invoiceNumber: rma.invoiceNumber,
      faultDate: rma.faultDate,
      faultDescription: rma.faultDescription,
      modelName: rma.model,
      sku: rma.sku,
      serialNumber: rma.serialNumber,
      supplier: rma.supplier,
      status: rma.status,
      createdAt: rma.createdAt,
      updatedAt: rma.updatedAt,
      rmaNumber: rma.rmaNumber
    }).from(rma).orderBy(desc(rma.createdAt));
  }
  async getRMA(id) {
    const [rmaCase] = await db.select({
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
    }).from(rma).leftJoin(customers, eq(rma.customerId, customers.id)).leftJoin(users, eq(rma.createdBy, users.id)).where(eq(rma.id, id));
    return rmaCase;
  }
  async createRMA(rmaData) {
    try {
      const rmaNumber = await generateRMANumber();
      console.log("RMA data being saved:", { ...rmaData, rmaNumber, createdBy: rmaData.createdBy });
      const [newRMA] = await db.insert(rma).values({
        ...rmaData,
        status: "oprettet",
        rmaNumber,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return newRMA;
    } catch (error) {
      console.error("Error in createRMA:", error);
      throw error;
    }
  }
  async updateRMAStatus(id, status) {
    const [updatedRMA] = await db.update(rma).set({
      status,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(rma.id, id)).returning();
    return updatedRMA;
  }
  async getRMAStatusHistory(rmaId) {
    try {
      const history = await db.select({
        id: rmaStatusHistory.id,
        rmaId: rmaStatusHistory.rmaId,
        status: rmaStatusHistory.status,
        comment: rmaStatusHistory.comment,
        createdAt: rmaStatusHistory.createdAt,
        createdBy: rmaStatusHistory.createdBy,
        createdByName: users.name
      }).from(rmaStatusHistory).leftJoin(users, eq(rmaStatusHistory.createdBy, users.id)).where(eq(rmaStatusHistory.rmaId, rmaId)).orderBy(desc(rmaStatusHistory.createdAt));
      return history.map((record) => ({
        ...record,
        createdByName: record.createdByName || "System"
      }));
    } catch (error) {
      console.error("Error in getRMAStatusHistory:", error);
      return [];
    }
  }
  async updateRMAStatusWithHistory(rmaId, status, comment, userId) {
    const [updatedRMA] = await db.update(rma).set({
      status,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(rma.id, rmaId)).returning();
    await db.insert(rmaStatusHistory).values({
      rmaId,
      status,
      comment,
      createdBy: userId,
      createdAt: /* @__PURE__ */ new Date()
    });
    return updatedRMA;
  }
  async updateRMA(id, rmaData) {
    const [updatedRMA] = await db.update(rma).set({
      ...rmaData,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(rma.id, id)).returning();
    return updatedRMA;
  }
  async updateCase(id, caseData) {
    const [case_] = await db.update(cases).set({
      ...caseData,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(cases.id, id)).returning();
    return case_;
  }
  async getPaginatedCases(page, pageSize, searchTerm, treatmentFilter, priorityFilter, status, sortBy, customerId, isWorker) {
    try {
      const startTime = Date.now();
      console.log("getPaginatedCases called with options:", {
        page,
        pageSize,
        searchTerm,
        treatment: treatmentFilter,
        priority: priorityFilter,
        status,
        sort: sortBy,
        customerId,
        isWorker
      });

      const offset = (page - 1) * pageSize;
      
      let query = db.select({
        id: cases.id,
        caseNumber: cases.caseNumber,
        title: cases.title,
        description: cases.description,
        status: cases.status,
        priority: cases.priority,
        treatment: cases.treatment,
        deviceType: cases.deviceType,
        customerId: cases.customerId,
        customerName: customers.name,
        createdAt: cases.createdAt,
        updatedAt: cases.updatedAt,
        createdBy: cases.createdBy
      })
      .from(cases)
      .leftJoin(customers, eq(cases.customerId, customers.id));

      let countQuery = db.select({ count: sql`count(*)` }).from(cases)
        .leftJoin(customers, eq(cases.customerId, customers.id));

      // Apply filters
      if (searchTerm) {
        const searchCondition = or(
          like(cases.title, `%${searchTerm}%`),
          like(cases.description, `%${searchTerm}%`),
          like(cases.caseNumber, `%${searchTerm}%`),
          like(customers.name, `%${searchTerm}%`)
        );
        query = query.where(searchCondition);
        countQuery = countQuery.where(searchCondition);
      }

      if (customerId) {
        query = query.where(eq(cases.customerId, customerId));
        countQuery = countQuery.where(eq(cases.customerId, customerId));
      }

      if (status) {
        query = query.where(eq(cases.status, status));
        countQuery = countQuery.where(eq(cases.status, status));
      }

      if (treatmentFilter) {
        query = query.where(eq(cases.treatment, treatmentFilter));
        countQuery = countQuery.where(eq(cases.treatment, treatmentFilter));
      }

      if (priorityFilter) {
        query = query.where(eq(cases.priority, priorityFilter));
        countQuery = countQuery.where(eq(cases.priority, priorityFilter));
      }

      // Apply sorting
      switch (sortBy) {
        case "newest":
          query = query.orderBy(desc(cases.createdAt));
          break;
        case "oldest":
          query = query.orderBy(asc(cases.createdAt));
          break;
        default:
          query = query.orderBy(desc(cases.createdAt));
          break;
      }

      const [{ count }] = await countQuery;
      const total = Number(count);
      const totalPages = Math.ceil(total / pageSize);

      query = query.limit(pageSize).offset(offset);
      const items = await query;

      console.log("getPaginatedCases completed in", Date.now() - startTime, "ms");
      console.log("getPaginatedCases result:", { total, page, pageSize, totalPages, itemsCount: items.length });

      const mappedItems = items.map((row) => ({
        ...row,
        customerName: row.customerName || `Kunde #${row.customerId}`,
        createdBy: row.createdBy || "System"
      }));

      const result = {
        items: mappedItems,
        total,
        page,
        pageSize,
        totalPages
      };
      
      console.log("Returning pagination result:", { total: result.total, totalPages: result.totalPages, itemsCount: result.items.length });
      
      return result;
    } catch (error) {
      console.error("Error in getPaginatedCases:", error);
      throw error;
    }
  }
  async getPaginatedCustomers(page, pageSize) {
    try {
      const offset = (page - 1) * pageSize;
      const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(customers);
      const items = await db.select().from(customers).orderBy(desc(customers.createdAt)).limit(pageSize).offset(offset);
      return {
        items,
        total: count,
        page,
        pageSize,
        totalPages: Math.ceil(count / pageSize)
      };
    } catch (error) {
      console.error("Error in getPaginatedCustomers:", error);
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }
  }
  async getPaginatedRMAs(page, pageSize) {
    try {
      const offset = (page - 1) * pageSize;
      const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(rma);
      const items = await db.select({
        id: rma.id,
        rmaNumber: rma.rmaNumber,
        customerId: rma.customerId,
        customerName: customers.name,
        faultDescription: rma.description,
        // Alias for frontend compatibility
        description: rma.description,
        deliveryDate: rma.deliveryDate,
        modelName: rma.model,
        // Alias for frontend compatibility 
        model: rma.model,
        sku: rma.sku,
        serialNumber: rma.serialNumber,
        supplier: rma.supplier,
        status: rma.status,
        createdAt: rma.createdAt,
        updatedAt: rma.updatedAt,
        createdBy: rma.createdBy
      }).from(rma).leftJoin(customers, eq(rma.customerId, customers.id)).orderBy(desc(rma.createdAt)).limit(pageSize).offset(offset);
      return {
        items,
        total: count,
        page,
        pageSize,
        totalPages: Math.ceil(count / pageSize)
      };
    } catch (error) {
      console.error("Error in getPaginatedRMAs:", error);
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }
  }
  async getRMAsByCustomerId(customerId) {
    try {
      const result = await db.select({
        id: rma.id,
        rmaNumber: rma.rmaNumber,
        customerId: rma.customerId,
        description: rma.description,
        deliveryDate: rma.deliveryDate,
        shipmentDate: rma.shipmentDate,
        sku: rma.sku,
        model: rma.model,
        serialNumber: rma.serialNumber,
        supplier: rma.supplier,
        supplierRmaId: rma.supplierRmaId,
        status: rma.status,
        createdAt: rma.createdAt,
        updatedAt: rma.updatedAt,
        createdBy: rma.createdBy
      }).from(rma).where(eq(rma.customerId, customerId)).orderBy(desc(rma.createdAt));
      return result;
    } catch (error) {
      console.error("Error in getRMAsByCustomerId:", error);
      return [];
    }
  }
};
async function generateRMANumber() {
  const prefix = "RMA";
  const rmas = await db.select().from(rma).where(like(rma.rmaNumber, `${prefix}%`)).orderBy(desc(rma.rmaNumber)).limit(1);
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
var storage = new DatabaseStorage();

// server/auth.ts
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  if (!stored || !supplied) return false;
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) return false;
    const suppliedBuf = await scryptAsync(supplied, salt, 64);
    const storedBuf = Buffer.from(hashed, "hex");
    return storedBuf.length === suppliedBuf.length && timingSafeEqual(storedBuf, suppliedBuf);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}
async function setupInitialAdmin() {
  const username = "Rattana";
  const password = "Wa2657321";
  try {
    const existingUser = await storage.getUserByUsername(username);
    if (!existingUser) {
      const hashedPassword = await hashPassword(password);
      await storage.createUser(
        "Rattana",
        // name
        username,
        hashedPassword,
        true,
        // isWorker
        true
        // isAdmin
      );
      console.log("Admin user created successfully");
    }
  } catch (error) {
    console.error("Error setting up admin user:", error);
  }
}
function setupAuth(app2) {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set");
  }
  const sessionSettings = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  setupInitialAdmin();
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false);
        }
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false);
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Brugernavn eksisterer allerede");
    }
    try {
      const user = await storage.createUser(
        req.body.name,
        req.body.username,
        await hashPassword(req.body.password),
        req.body.isWorker || false,
        false
        // isAdmin - new users can't be admins by default
      );
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

// server/routes.ts
import { z as z2 } from "zod";
var updateStatusSchema = z2.object({
  status: z2.enum([
    "created",
    "in_progress",
    "offer_created",
    "waiting_customer",
    "offer_accepted",
    "offer_rejected",
    "waiting_parts",
    "preparing_delivery",
    "ready_for_pickup",
    "completed"
  ]),
  comment: z2.string().min(1, "Kommentar er p\xE5kr\xE6vet")
});
async function generateCaseNumber(treatment) {
  const prefix = {
    "repair": "REP",
    "warranty": "REK",
    "setup": "KLA",
    "other": "AND"
  }[treatment] || "AND";
  try {
    console.log(`Generating case number for prefix: ${prefix}`);
    const cases2 = await storage.getLatestCaseNumber(prefix);
    console.log(`Latest cases for prefix ${prefix}:`, cases2);
    let number = 1;
    if (cases2 && cases2.length > 0) {
      const latestCase = cases2[0];
      console.log(`Latest case found: ${JSON.stringify(latestCase)}`);
      const match = latestCase.caseNumber.match(/\d+/);
      if (match) {
        number = parseInt(match[0]) + 1;
        console.log(`Extracted number: ${match[0]}, Next number: ${number}`);
      }
    } else {
      console.log(`No cases found with prefix ${prefix}, starting with number 1`);
    }
    return `${prefix}${number.toString().padStart(5, "0")}`;
  } catch (error) {
    console.error("Error generating case number:", error);
    return `${prefix}00001`;
  }
}
async function registerRoutes(app2) {
  setupAuth(app2);
  app2.get("/api/customers", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 6;
    const customers2 = await storage.getPaginatedCustomers(page, pageSize);
    res.json(customers2);
  });
  app2.get("/api/customers/search", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      const searchTerm = req.query.searchTerm;
      if (!searchTerm) return res.json([]);
      const customers2 = await storage.searchCustomers(searchTerm);
      res.json(customers2);
    } catch (error) {
      console.error("Error searching customers:", error);
      res.status(500).json({ error: "Der opstod en fejl ved s\xF8gning efter kunder" });
    }
  });
  app2.get("/api/customers/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    const customer = await storage.getCustomer(parseInt(req.params.id));
    if (!customer) return res.sendStatus(404);
    res.json(customer);
  });
  app2.post("/api/customers", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    const result = insertCustomerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json(result.error);
    }
    const customer = await storage.createCustomer(result.data);
    res.status(201).json(customer);
  });
  app2.patch("/api/customers/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    const result = insertCustomerSchema.partial().safeParse(req.body);
    if (!result.success) {
      return res.status(400).json(result.error);
    }
    const customer = await storage.updateCustomer(parseInt(req.params.id), result.data);
    if (!customer) return res.sendStatus(404);
    res.json(customer);
  });
  app2.get("/api/customers/:id/cases", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      const customerId = parseInt(req.params.id);
      if (isNaN(customerId)) {
        return res.status(400).json({ error: "Ugyldigt kunde-ID" });
      }
      const cases2 = await storage.getCases(customerId);
      res.json(cases2);
    } catch (error) {
      console.error("Error fetching customer cases:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af kundens sager" });
    }
  });
  app2.get("/api/customers/:id/rma", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      const customerId = parseInt(req.params.id);
      if (isNaN(customerId)) {
        return res.status(400).json({ error: "Ugyldigt kunde-ID" });
      }
      const rmas = await storage.getRMAsByCustomerId(customerId);
      res.json(rmas);
    } catch (error) {
      console.error("Error fetching customer RMAs:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af kundens RMA-sager" });
    }
  });
  app2.post("/api/users", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    if (req.body.isAdmin && !req.user.isAdmin) {
      return res.status(403).json({ error: "Kun administratorer kan oprette andre administratorer" });
    }
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json(result.error);
    }
    try {
      const existingUser = await storage.getUserByUsername(result.data.username);
      if (existingUser) {
        return res.status(400).json({ error: "Brugernavn findes allerede" });
      }
      const hashedPassword = await hashPassword2(result.data.password);
      const user = await storage.createUser({
        username: result.data.username,
        password: hashedPassword,
        name: result.data.name,
        isWorker: result.data.isWorker,
        isAdmin: result.data.isAdmin
      });
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Der opstod en fejl ved oprettelse af brugeren" });
    }
  });
  app2.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    const users2 = await storage.getUsers();
    res.json(users2);
  });
  app2.get("/api/cases", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      
      // Disable caching for this endpoint
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 6;
      const searchTerm = req.query.searchTerm;
      const treatmentFilter = req.query.treatment;
      const priorityFilter = req.query.priority;
      const status = req.query.status;
      const sortBy = req.query.sort;
      
      console.log("API /api/cases called with params:", { page, pageSize, searchTerm, treatmentFilter, priorityFilter, status, sortBy });
      
      if (searchTerm) {
        const cases3 = await storage.searchCases(searchTerm);
        return res.json({
          items: cases3,
          total: cases3.length,
          page: 1,
          pageSize: cases3.length,
          totalPages: 1
        });
      }
      
      const cases2 = await storage.getPaginatedCases(
        page,
        pageSize,
        searchTerm,
        treatmentFilter,
        priorityFilter,
        status,
        sortBy,
        undefined, // customerId
        true // isWorker
      );
      
      console.log("API /api/cases returning:", { total: cases2.total, totalPages: cases2.totalPages, itemsCount: cases2.items.length });
      res.json(cases2);
    } catch (error) {
      console.error("Error fetching cases:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af sager" });
    }
  });
  app2.get("/api/cases/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.sendStatus(401);
      }
      const caseId = parseInt(req.params.id);
      if (isNaN(caseId)) {
        return res.status(400).json({ error: "Ugyldigt sagsnummer" });
      }
      const case_ = await storage.getCase(caseId);
      if (!case_) {
        return res.status(404).json({ error: "Sagen blev ikke fundet" });
      }
      if (!req.user.isWorker && case_.customerId !== req.user.id) {
        return res.status(403).json({ error: "Ingen adgang til denne sag" });
      }
      res.json(case_);
    } catch (error) {
      console.error("Error fetching case:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af sagen" });
    }
  });
  app2.post("/api/cases", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    const result = insertCaseSchema.safeParse(req.body);
    if (!result.success) {
      console.error("Valideringsfejl ved oprettelse af sag:", result.error);
      return res.status(400).json(result.error);
    }
    try {
      let customerId = result.data.customerId;
      if (!customerId && result.data.customerPhone) {
        const newCustomer = await storage.createCustomer({
          name: result.data.customerSearch || "Ny kunde",
          phone: result.data.customerPhone,
          email: null,
          address: null,
          city: null,
          postalCode: null,
          notes: null
        });
        customerId = newCustomer.id;
      }
      if (!customerId && !result.data.customerPhone) {
        return res.status(400).json({
          message: "Enten customerId eller customerPhone skal angives"
        });
      }
      const caseNumber = await generateCaseNumber(result.data.treatment.toLowerCase());
      console.log("Creating case with user ID:", req.user.id);
      const case_ = await storage.createCase({
        ...result.data,
        customerId,
        caseNumber,
        status: "created",
        createdBy: req.user.id
        // Eksplicit sæt bruger ID
      });
      
      // Hent den fulde case med customer data til print funktionalitet
      console.log("Created case ID:", case_.id);
      const fullCase = await storage.getCase(case_.id);
      console.log("Full case data:", JSON.stringify(fullCase, null, 2));
      res.status(201).json(fullCase);
    } catch (error) {
      console.error("Error creating case:", error);
      res.status(500).json({ error: "Der opstod en fejl ved oprettelse af sagen" });
    }
  });
  app2.patch("/api/cases/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      const caseId = parseInt(req.params.id);
      if (isNaN(caseId)) {
        return res.status(400).json({ error: "Ugyldigt sagsnummer" });
      }
      const result = insertCaseSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json(result.error);
      }
      const updatedCase = await storage.updateCase(caseId, result.data);
      if (!updatedCase) {
        return res.status(404).json({ error: "Sagen blev ikke fundet" });
      }
      res.json(updatedCase);
    } catch (error) {
      console.error("Error updating case:", error);
      res.status(500).json({ error: "Der opstod en fejl ved opdatering af sagen" });
    }
  });
  app2.patch("/api/cases/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.user.isWorker) return res.sendStatus(403);
    const result = updateCaseSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json(result.error);
    }
    const case_ = await storage.updateCaseStatus(
      parseInt(req.params.id),
      result.data.status
    );
    res.json(case_);
  });
  app2.get("/api/cases/:id/status-history", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const history = await storage.getCaseStatusHistory(parseInt(req.params.id));
    res.json(history);
  });
  app2.post("/api/cases/:id/status", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    const result = updateStatusSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json(result.error);
    }
    try {
      const caseId = parseInt(req.params.id);
      const { status, comment } = result.data;
      const updatedCase = await storage.updateCaseStatusWithHistory(
        caseId,
        status,
        comment,
        req.user.id
      );
      res.json(updatedCase);
    } catch (error) {
      console.error("Error updating case status:", error);
      res.status(500).json({ error: "Der opstod en fejl ved opdatering af status" });
    }
  });

  // Add status counts endpoint
  app2.get("/api/cases/status-counts", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      console.log("Cases router status-counts endpoint called");
      const result = await db.select({
        status: cases.status,
        count: sql`count(*)::int`
      }).from(cases).groupBy(cases.status);
      
      console.log("Raw status counts from database:", result);
      
      const statusCounts = result.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {});
      
      console.log("Status counts from storage in router:", statusCounts);
      res.json(statusCounts);
    } catch (error) {
      console.error("Error fetching status counts:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af status counts" });
    }
  });

  // Add total cases endpoint
  app2.get("/api/cases/total", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(cases);
      res.json({ total: count });
    } catch (error) {
      console.error("Error fetching total cases:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af total cases" });
    }
  });

  // Add alarm cases endpoint
  app2.get("/api/cases/alarm", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      console.log("Alarm endpoint called");
      // This is a simplified alarm query - you may need to adjust based on your alarm logic
      const alarmCases = await db.select({
        id: cases.id,
        caseNumber: cases.caseNumber,
        customerName: customers.name,
        status: cases.status,
        createdAt: cases.createdAt
      }).from(cases)
      .leftJoin(customers, eq(cases.customerId, customers.id))
      .where(sql`${cases.createdAt} < NOW() - INTERVAL '7 days'`)
      .orderBy(desc(cases.createdAt));
      
      console.log(`Alarm cases retrieved: ${alarmCases.length} cases`);
      res.json(alarmCases);
    } catch (error) {
      console.error("Error fetching alarm cases:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af alarm cases" });
    }
  });
  app2.get("/api/rma", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 6;
      const rmas = await storage.getPaginatedRMAs(page, pageSize);
      res.json(rmas);
    } catch (error) {
      console.error("Error fetching RMAs:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af RMA sager" });
    }
  });
  app2.get("/api/rma/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      const rma2 = await storage.getRMA(parseInt(req.params.id));
      if (!rma2) return res.status(404).json({ error: "RMA ikke fundet" });
      res.json(rma2);
    } catch (error) {
      console.error("Error fetching RMA:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af RMA" });
    }
  });
  app2.post("/api/rma", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    const result = insertRMASchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json(result.error);
    }
    try {
      const rmaData = {
        ...result.data,
        createdBy: req.user.id
        // Tilføj den aktuelle brugers ID
      };
      const rma2 = await storage.createRMA(rmaData);
      res.status(201).json(rma2);
    } catch (error) {
      console.error("Error creating RMA:", error);
      res.status(500).json({ error: "Der opstod en fejl ved oprettelse af RMA" });
    }
  });
  app2.get("/api/rma/:id/status-history", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      const history = await storage.getRMAStatusHistory(parseInt(req.params.id));
      res.json(history);
    } catch (error) {
      console.error("Error fetching RMA status history:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af RMA status historik" });
    }
  });
  app2.patch("/api/rma/:id/status", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      const { status, comment } = req.body;
      if (!status || !comment) {
        return res.status(400).json({ error: "Status og kommentar er p\xE5kr\xE6vet" });
      }
      const rma2 = await storage.updateRMAStatusWithHistory(
        parseInt(req.params.id),
        status,
        comment,
        req.user.id
      );
      res.json(rma2);
    } catch (error) {
      console.error("Error updating RMA status:", error);
      res.status(500).json({ error: "Der opstod en fejl ved opdatering af RMA status" });
    }
  });
  app2.patch("/api/rma/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      const rmaId = parseInt(req.params.id);
      if (isNaN(rmaId)) {
        return res.status(400).json({ error: "Ugyldigt RMA ID" });
      }
      const result = insertRMASchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json(result.error);
      }
      const updatedRMA = await storage.updateRMA(rmaId, result.data);
      if (!updatedRMA) {
        return res.status(404).json({ error: "RMA ikke fundet" });
      }
      res.json(updatedRMA);
    } catch (error) {
      console.error("Error updating RMA:", error);
      res.status(500).json({ error: "Der opstod en fejl ved opdatering af RMA" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}
async function hashPassword2(password) {
  return password;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createLogger } from "vite";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  log("Vite server forventes at k\xF8re p\xE5 port 5173. Vi starter ikke Vite middleware her.");
  app2.get("/", (_req, res) => {
    res.send("API-server k\xF8rer. Frontend forventes at k\xF8re p\xE5 http://localhost:5173");
  });
}
function serveStatic(app2) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import kill from "kill-port";
import "dotenv/config";
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  try {
    log("Starting server initialization...");
    try {
      await pool.query("SELECT 1");
      log("Raw database connection successful");
      await db.select().from(users).limit(1);
      log("Database connection successful");
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      throw new Error("Failed to connect to database");
    }
    const server = await registerRoutes(app);
    log("Routes registered successfully");
    app.use((err, _req, res, _next) => {
      console.error("Server error:", err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });
    const port = 3e3;
    log(`Configured to use port: ${port}`);
    try {
      await kill(port, "tcp");
      log(`Killed any existing process on port ${port}`);
      await new Promise((resolve) => setTimeout(resolve, 1e3));
    } catch (error) {
      log(`No existing process found on port ${port}`);
    }
    let retries = 0;
    const maxRetries = 3;
    while (retries < maxRetries) {
      try {
        log(`Starting server attempt ${retries + 1}/${maxRetries}`);
        if (process.env.NODE_ENV === "production") {
          log("Setting up static file serving...");
          serveStatic(app);
          log("Static file serving setup complete");
        } else {
          log("Setting up API server (frontend forventes at k\xF8re p\xE5 port 5173)...");
          await setupVite(app, server);
          log("API server setup complete");
        }
        await new Promise((resolve, reject) => {
          server.listen({
            port,
            host: "0.0.0.0"
          }, () => {
            log(`Server successfully listening on port ${port}`);
            resolve();
          });
          server.on("error", (error) => {
            if (error.code === "EADDRINUSE") {
              log(`Port ${port} is still in use. Retrying...`);
              server.close();
              reject(error);
            } else {
              console.error("Server error:", error);
              reject(error);
            }
          });
        });
        break;
      } catch (error) {
        retries++;
        if (retries === maxRetries) {
          console.error(`Failed to start server after ${maxRetries} attempts:`, error);
          process.exit(1);
        }
        log(`Retry ${retries}/${maxRetries}...`);
        await new Promise((resolve) => setTimeout(resolve, 2e3));
      }
    }
    process.on("SIGTERM", () => {
      log("SIGTERM signal received: closing HTTP server");
      server.close(() => {
        log("HTTP server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Fatal error during startup:", error);
    process.exit(1);
  }
})();
