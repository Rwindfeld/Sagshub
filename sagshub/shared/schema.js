import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    isWorker: boolean("is_worker").notNull().default(false),
    isAdmin: boolean("is_admin").notNull().default(false),
    isCustomer: boolean("is_customer").notNull().default(false),
    name: text("name").notNull(),
    birthday: timestamp("birthday"),
    customerId: integer("customer_id").references(() => customers.id),
});
export const customers = pgTable("customers", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone").notNull(),
    address: text("address"),
    city: text("city"),
    postalCode: text("postal_code"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    notes: text("notes"),
});
// Behandlingstype enum
export const TreatmentType = {
    REPAIR: 'repair',
    WARRANTY: 'warranty',
    SETUP: 'setup',
    OTHER: 'other'
};
// Prioritet enum
export const PriorityType = {
    FREE_DIAGNOSIS: 'free_diagnosis',
    FOUR_DAYS: 'four_days',
    FIRST_PRIORITY: 'first_priority',
    ASAP: 'asap'
};
// Enhed enum
export const DeviceType = {
    LAPTOP: 'laptop',
    PC: 'pc',
    PRINTER: 'printer',
    OTHER: 'other'
};
// Order status enum
export const OrderStatus = {
    PENDING: 'pending',
    ORDERED: 'ordered',
    RECEIVED: 'received',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
};
// Opdater CaseStatus enum med de nye værdier
export const CaseStatus = {
    CREATED: 'created',
    IN_PROGRESS: 'in_progress',
    OFFER_CREATED: 'offer_created',
    WAITING_CUSTOMER: 'waiting_customer',
    OFFER_ACCEPTED: 'offer_accepted',
    OFFER_REJECTED: 'offer_rejected',
    WAITING_PARTS: 'waiting_parts',
    PREPARING_DELIVERY: 'preparing_delivery',
    READY_FOR_PICKUP: 'ready_for_pickup',
    COMPLETED: 'completed',
};
export const cases = pgTable("cases", {
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
    loginInfo: text("login_info"),
    purchasedHere: boolean("purchased_here").default(false),
    purchaseDate: timestamp("purchase_date"),
    status: text("status").notNull().default("created"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdBy: integer("created_by").notNull().references(() => users.id),
});
export const orders = pgTable("orders", {
    id: serial("id").primaryKey(),
    orderNumber: text("order_number").notNull(),
    customerId: integer("customer_id").notNull().references(() => customers.id),
    caseId: integer("case_id").references(() => cases.id),
    rmaId: integer("rma_id").references(() => rma.id),
    model: text("model").notNull(),
    serialNumber: text("serial_number"),
    faultDescription: text("fault_description"),
    itemsOrdered: text("items_ordered").notNull(),
    supplier: text("supplier").notNull(),
    price: text("price"),
    orderDate: timestamp("order_date"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdBy: integer("created_by").notNull().references(() => users.id),
});
// Tilføj statusHistory tabel
export const statusHistory = pgTable("status_history", {
    id: serial("id").primaryKey(),
    caseId: integer("case_id").notNull().references(() => cases.id),
    status: text("status").notNull(),
    comment: text("comment").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    createdBy: integer("created_by").notNull().references(() => users.id),
    createdByName: text("created_by_name"),
});
// Tilføj internalCases tabel
export const internalCases = pgTable("internal_cases", {
    id: serial("id").primaryKey(),
    caseId: integer("case_id").notNull().references(() => cases.id),
    senderId: integer("sender_id").notNull().references(() => users.id),
    receiverId: integer("receiver_id").notNull().references(() => users.id),
    message: text("message").notNull(),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
// Definer relations for users tabellen
export const usersRelations = relations(users, ({ many }) => ({
    cases: many(cases),
    statusHistory: many(statusHistory),
    sentInternalCases: many(internalCases, { relationName: "sender" }),
    receivedInternalCases: many(internalCases, { relationName: "receiver" }),
}));
// Definer relations for internalCases tabellen
export const internalCasesRelations = relations(internalCases, ({ one }) => ({
    case: one(cases, {
        fields: [internalCases.caseId],
        references: [cases.id],
    }),
    sender: one(users, {
        fields: [internalCases.senderId],
        references: [users.id],
        relationName: "sender",
    }),
    receiver: one(users, {
        fields: [internalCases.receiverId],
        references: [users.id],
        relationName: "receiver",
    }),
}));
// Definer relations for cases tabellen
export const casesRelations = relations(cases, ({ one }) => ({
    customer: one(customers, {
        fields: [cases.customerId],
        references: [customers.id],
    }),
    createdByUser: one(users, {
        fields: [cases.createdBy],
        references: [users.id],
    }),
}));
export const ordersRelations = relations(orders, ({ one }) => ({
    customer: one(customers, {
        fields: [orders.customerId],
        references: [customers.id],
    }),
    case: one(cases, {
        fields: [orders.caseId],
        references: [cases.id],
    }),
    rma: one(rma, {
        fields: [orders.rmaId],
        references: [rma.id],
    }),
    createdByUser: one(users, {
        fields: [orders.createdBy],
        references: [users.id],
    }),
}));
// Definer relations for statusHistory tabellen
export const statusHistoryRelations = relations(statusHistory, ({ one }) => ({
    case: one(cases, {
        fields: [statusHistory.caseId],
        references: [cases.id],
    }),
    createdByUser: one(users, {
        fields: [statusHistory.createdBy],
        references: [users.id],
    }),
}));
// Create insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
    username: true,
    password: true,
    name: true,
    isWorker: true,
    isAdmin: true,
    isCustomer: true,
    birthday: true,
    customerId: true,
}).extend({
    username: z.string().min(1, "Brugernavn er påkrævet"),
    password: z.string().optional(),
    name: z.string().min(1, "Navn er påkrævet"),
    birthday: z.coerce.date().optional().nullable(),
    customerId: z.number().optional().nullable(),
});
// Schema for oprettelse af ny bruger (kræver password)
export const createUserSchema = insertUserSchema.extend({
    password: z.string().min(6, "Adgangskode skal være mindst 6 tegn"),
});
// Schema for opdatering af bruger (password er optional)
export const updateUserSchema = insertUserSchema.extend({
    password: z.string().min(6, "Adgangskode skal være mindst 6 tegn").optional(),
});
export const insertCustomerSchema = createInsertSchema(customers).pick({
    name: true,
    email: true,
    phone: true,
    address: true,
    city: true,
    postalCode: true,
    notes: true,
}).extend({
    name: z.string().min(1, "Navn er påkrævet"),
    phone: z.string().min(1, "Telefon er påkrævet"),
    email: z.string().optional().nullable().transform(e => e === "" ? null : e),
    address: z.string().optional().nullable().transform(e => e === "" ? null : e),
    city: z.string().optional().nullable().transform(e => e === "" ? null : e),
    postalCode: z.string().optional().nullable().transform(e => e === "" ? null : e),
    notes: z.string().optional().nullable().transform(e => e === "" ? null : e),
});
// Opdater insertCaseSchema med customerId som optional
export const insertCaseSchema = createInsertSchema(cases).pick({
    customerId: true,
    title: true,
    description: true,
    treatment: true,
    priority: true,
    deviceType: true,
    accessories: true,
    importantNotes: true,
    loginInfo: true,
    purchasedHere: true,
    purchaseDate: true,
}).extend({
    title: z.string().min(1, "Titel er påkrævet"),
    description: z.string().min(1, "Beskrivelse er påkrævet"),
    treatment: z.enum(['repair', 'warranty', 'setup', 'other'], {
        required_error: "Behandling er påkrævet",
        invalid_type_error: "Vælg en gyldig behandlingstype",
    }),
    priority: z.enum(['free_diagnosis', 'four_days', 'first_priority', 'asap'], {
        required_error: "Prioritet er påkrævet",
        invalid_type_error: "Vælg en gyldig prioritet",
    }),
    deviceType: z.enum(['laptop', 'pc', 'printer', 'other'], {
        required_error: "Enhedstype er påkrævet",
        invalid_type_error: "Vælg en gyldig enhedstype",
    }),
    accessories: z.string().optional().nullable().default(""),
    importantNotes: z.string().optional().nullable().default(""),
    loginInfo: z.string().optional().nullable().default(""),
    purchasedHere: z.boolean().default(false),
    purchaseDate: z.coerce.date().nullable(),
    customerSearch: z.string().optional(),
    customerPhone: z.string().optional(),
    customerId: z.number().optional(),
    createdByName: z.string().optional().nullable(),
});
export const updateCaseSchema = z.object({
    status: z.enum([
        'created',
        'in_progress',
        'offer_created',
        'waiting_customer',
        'offer_accepted',
        'offer_rejected',
        'waiting_parts',
        'preparing_delivery',
        'ready_for_pickup',
        'completed'
    ]),
    latestComment: z.string().optional(),
});
// Export the Customer schema for validation
export const CustomerSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().nullable(),
    phone: z.string(),
    address: z.string().nullable(),
    city: z.string().nullable(),
    postalCode: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    notes: z.string().nullable(),
});
// Export the RMA schema for validation
export const RMASchema = z.object({
    id: z.number(),
    rmaNumber: z.string(),
    customerId: z.number(),
    description: z.string(),
    deliveryDate: z.date(),
    sku: z.string().nullable(),
    model: z.string().nullable(),
    serialNumber: z.string().nullable(),
    supplier: z.string().nullable(),
    supplierRmaId: z.string().nullable(),
    shipmentDate: z.date().nullable(),
    status: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    createdBy: z.number(),
});
// Export the User schema for validation
export const UserSchema = z.object({
    id: z.number(),
    username: z.string(),
    name: z.string(),
    isWorker: z.boolean(),
    isAdmin: z.boolean(),
});
// Add RMA related schemas and types after the existing exports
export const RMAStatus = {
    CREATED: 'created',
    SENT_TO_SUPPLIER: 'sent_to_supplier',
    WAITING_SUPPLIER: 'waiting_supplier',
    RECEIVED_FROM_SUPPLIER: 'received_from_supplier',
    READY_FOR_PICKUP: 'ready_for_pickup',
    COMPLETED: 'completed',
    REJECTED: 'rejected'
};
export const rma = pgTable("rma", {
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
    status: text("status").notNull().default("created"),
    shipmentDate: timestamp("shipment_date"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdBy: integer("created_by").notNull().references(() => users.id),
});
// Tilføj rmaStatusHistory tabel
export const rmaStatusHistory = pgTable("rma_status_history", {
    id: serial("id").primaryKey(),
    rmaId: integer("rma_id").notNull().references(() => rma.id),
    status: text("status").notNull(),
    comment: text("comment").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    createdBy: integer("created_by").notNull().references(() => users.id),
    createdByName: text("created_by_name"),
});
// Definer relations for RMA tabellen
export const rmaRelations = relations(rma, ({ one }) => ({
    customer: one(customers, {
        fields: [rma.customerId],
        references: [customers.id],
    }),
    createdByUser: one(users, {
        fields: [rma.createdBy],
        references: [users.id],
    }),
}));
// Definer relations for rmaStatusHistory tabellen
export const rmaStatusHistoryRelations = relations(rmaStatusHistory, ({ one }) => ({
    rma: one(rma, {
        fields: [rmaStatusHistory.rmaId],
        references: [rma.id],
    }),
    createdByUser: one(users, {
        fields: [rmaStatusHistory.createdBy],
        references: [users.id],
    }),
}));
// RMA insert schema
export const insertRMASchema = createInsertSchema(rma).pick({
    customerId: true,
    description: true,
    deliveryDate: true,
    sku: true,
    model: true,
    serialNumber: true,
    supplier: true,
    supplierRmaId: true,
    shipmentDate: true,
}).extend({
    customerId: z.number({
        required_error: "Du skal vælge en kunde",
        invalid_type_error: "Du skal vælge en kunde",
    }),
    description: z.string().min(1, "Beskrivelse er påkrævet"),
    deliveryDate: z.coerce.date({
        required_error: "Leveringsdato er påkrævet",
        invalid_type_error: "Ugyldig leveringsdato",
    }),
    sku: z.string().optional().nullable(),
    model: z.string().optional().nullable(),
    serialNumber: z.string().optional().nullable(),
    supplier: z.string().optional().nullable(),
    supplierRmaId: z.string().optional().nullable(),
    shipmentDate: z.coerce.date().optional().nullable(),
});
// Order insert schema
export const insertOrderSchema = createInsertSchema(orders).pick({
    customerId: true,
    caseId: true,
    rmaId: true,
    model: true,
    serialNumber: true,
    faultDescription: true,
    itemsOrdered: true,
    supplier: true,
    price: true,
    orderDate: true,
    createdBy: true,
    orderNumber: true,
}).extend({
    customerId: z.number({
        required_error: "Du skal vælge en kunde",
        invalid_type_error: "Du skal vælge en kunde",
    }),
    model: z.string().min(1, "Model er påkrævet"),
    itemsOrdered: z.string().optional().nullable(),
    supplier: z.string().optional().nullable(),
    serialNumber: z.string().optional().nullable(),
    faultDescription: z.string().optional().nullable(),
    price: z.string().optional().nullable(),
    orderDate: z.coerce.date(),
    caseId: z.number().optional().nullable(),
    rmaId: z.number().optional().nullable(),
    createdBy: z.number(),
    orderNumber: z.string().min(1, "Ordrenummer er påkrævet"),
});
export const insertInternalCaseSchema = createInsertSchema(internalCases).pick({
    caseId: true,
    senderId: true,
    receiverId: true,
    message: true,
}).extend({
    message: z.string().min(1, "Besked er påkrævet"),
});
// Tilføj nye tabeller for statustyper og prioritetstyper
export const caseStatusTypes = pgTable("case_status_types", {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(),
    label: text("label").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export const priorityTypes = pgTable("priority_types", {
    id: serial("id").primaryKey(),
    key: text("key").notNull().unique(),
    label: text("label").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
