"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.priorityTypes = exports.caseStatusTypes = exports.insertInternalCaseSchema = exports.insertOrderSchema = exports.insertRMASchema = exports.rmaStatusHistoryRelations = exports.rmaRelations = exports.rmaStatusHistory = exports.rma = exports.RMAStatus = exports.UserSchema = exports.RMASchema = exports.CustomerSchema = exports.updateCaseSchema = exports.insertCaseSchema = exports.insertCustomerSchema = exports.updateUserSchema = exports.createUserSchema = exports.insertUserSchema = exports.statusHistoryRelations = exports.ordersRelations = exports.casesRelations = exports.internalCasesRelations = exports.usersRelations = exports.internalCases = exports.statusHistory = exports.orders = exports.cases = exports.CaseStatus = exports.OrderStatus = exports.DeviceType = exports.PriorityType = exports.TreatmentType = exports.customers = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_zod_1 = require("drizzle-zod");
const zod_1 = require("zod");
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    username: (0, pg_core_1.text)("username").notNull().unique(),
    password: (0, pg_core_1.text)("password").notNull(),
    isWorker: (0, pg_core_1.boolean)("is_worker").notNull().default(false),
    isAdmin: (0, pg_core_1.boolean)("is_admin").notNull().default(false),
    isCustomer: (0, pg_core_1.boolean)("is_customer").notNull().default(false),
    name: (0, pg_core_1.text)("name").notNull(),
    birthday: (0, pg_core_1.timestamp)("birthday"),
    customerId: (0, pg_core_1.integer)("customer_id").references(() => exports.customers.id),
});
exports.customers = (0, pg_core_1.pgTable)("customers", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    email: (0, pg_core_1.text)("email"),
    phone: (0, pg_core_1.text)("phone").notNull(),
    address: (0, pg_core_1.text)("address"),
    city: (0, pg_core_1.text)("city"),
    postalCode: (0, pg_core_1.text)("postal_code"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
    notes: (0, pg_core_1.text)("notes"),
});
// Behandlingstype enum
exports.TreatmentType = {
    REPAIR: 'repair',
    WARRANTY: 'warranty',
    SETUP: 'setup',
    OTHER: 'other'
};
// Prioritet enum
exports.PriorityType = {
    FREE_DIAGNOSIS: 'free_diagnosis',
    FOUR_DAYS: 'four_days',
    FIRST_PRIORITY: 'first_priority',
    ASAP: 'asap'
};
// Enhed enum
exports.DeviceType = {
    LAPTOP: 'laptop',
    PC: 'pc',
    PRINTER: 'printer',
    OTHER: 'other'
};
// Order status enum
exports.OrderStatus = {
    PENDING: 'pending',
    ORDERED: 'ordered',
    RECEIVED: 'received',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
};
// Opdater CaseStatus enum med de nye værdier
exports.CaseStatus = {
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
exports.cases = (0, pg_core_1.pgTable)("cases", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    caseNumber: (0, pg_core_1.text)("case_number").notNull(),
    customerId: (0, pg_core_1.integer)("customer_id").notNull(),
    title: (0, pg_core_1.text)("title").notNull(),
    description: (0, pg_core_1.text)("description").notNull(),
    treatment: (0, pg_core_1.text)("treatment").notNull(),
    priority: (0, pg_core_1.text)("priority").notNull(),
    deviceType: (0, pg_core_1.text)("device_type").notNull(),
    accessories: (0, pg_core_1.text)("accessories"),
    importantNotes: (0, pg_core_1.text)("important_notes"),
    loginInfo: (0, pg_core_1.text)("login_info"),
    purchasedHere: (0, pg_core_1.boolean)("purchased_here").default(false),
    purchaseDate: (0, pg_core_1.timestamp)("purchase_date"),
    status: (0, pg_core_1.text)("status").notNull().default("created"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
    createdBy: (0, pg_core_1.integer)("created_by").notNull().references(() => exports.users.id),
});
exports.orders = (0, pg_core_1.pgTable)("orders", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    orderNumber: (0, pg_core_1.text)("order_number").notNull(),
    customerId: (0, pg_core_1.integer)("customer_id").notNull().references(() => exports.customers.id),
    caseId: (0, pg_core_1.integer)("case_id").references(() => exports.cases.id),
    rmaId: (0, pg_core_1.integer)("rma_id").references(() => exports.rma.id),
    model: (0, pg_core_1.text)("model").notNull(),
    serialNumber: (0, pg_core_1.text)("serial_number"),
    faultDescription: (0, pg_core_1.text)("fault_description"),
    itemsOrdered: (0, pg_core_1.text)("items_ordered").notNull(),
    supplier: (0, pg_core_1.text)("supplier").notNull(),
    price: (0, pg_core_1.text)("price"),
    orderDate: (0, pg_core_1.timestamp)("order_date"),
    status: (0, pg_core_1.text)("status").notNull().default("pending"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
    createdBy: (0, pg_core_1.integer)("created_by").notNull().references(() => exports.users.id),
});
// Tilføj statusHistory tabel
exports.statusHistory = (0, pg_core_1.pgTable)("status_history", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    caseId: (0, pg_core_1.integer)("case_id").notNull().references(() => exports.cases.id),
    status: (0, pg_core_1.text)("status").notNull(),
    comment: (0, pg_core_1.text)("comment").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    createdBy: (0, pg_core_1.integer)("created_by").notNull().references(() => exports.users.id),
    createdByName: (0, pg_core_1.text)("created_by_name"),
});
// Tilføj internalCases tabel
exports.internalCases = (0, pg_core_1.pgTable)("internal_cases", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    caseId: (0, pg_core_1.integer)("case_id").notNull().references(() => exports.cases.id),
    senderId: (0, pg_core_1.integer)("sender_id").notNull().references(() => exports.users.id),
    receiverId: (0, pg_core_1.integer)("receiver_id").notNull().references(() => exports.users.id),
    message: (0, pg_core_1.text)("message").notNull(),
    read: (0, pg_core_1.boolean)("read").notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
});
// Definer relations for users tabellen
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ many }) => ({
    cases: many(exports.cases),
    statusHistory: many(exports.statusHistory),
    sentInternalCases: many(exports.internalCases, { relationName: "sender" }),
    receivedInternalCases: many(exports.internalCases, { relationName: "receiver" }),
}));
// Definer relations for internalCases tabellen
exports.internalCasesRelations = (0, drizzle_orm_1.relations)(exports.internalCases, ({ one }) => ({
    case: one(exports.cases, {
        fields: [exports.internalCases.caseId],
        references: [exports.cases.id],
    }),
    sender: one(exports.users, {
        fields: [exports.internalCases.senderId],
        references: [exports.users.id],
        relationName: "sender",
    }),
    receiver: one(exports.users, {
        fields: [exports.internalCases.receiverId],
        references: [exports.users.id],
        relationName: "receiver",
    }),
}));
// Definer relations for cases tabellen
exports.casesRelations = (0, drizzle_orm_1.relations)(exports.cases, ({ one }) => ({
    customer: one(exports.customers, {
        fields: [exports.cases.customerId],
        references: [exports.customers.id],
    }),
    createdByUser: one(exports.users, {
        fields: [exports.cases.createdBy],
        references: [exports.users.id],
    }),
}));
exports.ordersRelations = (0, drizzle_orm_1.relations)(exports.orders, ({ one }) => ({
    customer: one(exports.customers, {
        fields: [exports.orders.customerId],
        references: [exports.customers.id],
    }),
    case: one(exports.cases, {
        fields: [exports.orders.caseId],
        references: [exports.cases.id],
    }),
    rma: one(exports.rma, {
        fields: [exports.orders.rmaId],
        references: [exports.rma.id],
    }),
    createdByUser: one(exports.users, {
        fields: [exports.orders.createdBy],
        references: [exports.users.id],
    }),
}));
// Definer relations for statusHistory tabellen
exports.statusHistoryRelations = (0, drizzle_orm_1.relations)(exports.statusHistory, ({ one }) => ({
    case: one(exports.cases, {
        fields: [exports.statusHistory.caseId],
        references: [exports.cases.id],
    }),
    createdByUser: one(exports.users, {
        fields: [exports.statusHistory.createdBy],
        references: [exports.users.id],
    }),
}));
// Create insert schemas
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).pick({
    username: true,
    password: true,
    name: true,
    isWorker: true,
    isAdmin: true,
    isCustomer: true,
    birthday: true,
    customerId: true,
}).extend({
    username: zod_1.z.string().min(1, "Brugernavn er påkrævet"),
    password: zod_1.z.string().optional(),
    name: zod_1.z.string().min(1, "Navn er påkrævet"),
    birthday: zod_1.z.coerce.date().optional().nullable(),
    customerId: zod_1.z.number().optional().nullable(),
});
// Schema for oprettelse af ny bruger (kræver password)
exports.createUserSchema = exports.insertUserSchema.extend({
    password: zod_1.z.string().min(6, "Adgangskode skal være mindst 6 tegn"),
});
// Schema for opdatering af bruger (password er optional)
exports.updateUserSchema = exports.insertUserSchema.extend({
    password: zod_1.z.string().min(6, "Adgangskode skal være mindst 6 tegn").optional(),
});
exports.insertCustomerSchema = (0, drizzle_zod_1.createInsertSchema)(exports.customers).pick({
    name: true,
    email: true,
    phone: true,
    address: true,
    city: true,
    postalCode: true,
    notes: true,
}).extend({
    name: zod_1.z.string().min(1, "Navn er påkrævet"),
    phone: zod_1.z.string().min(1, "Telefon er påkrævet"),
    email: zod_1.z.string().optional().nullable().transform(e => e === "" ? null : e),
    address: zod_1.z.string().optional().nullable().transform(e => e === "" ? null : e),
    city: zod_1.z.string().optional().nullable().transform(e => e === "" ? null : e),
    postalCode: zod_1.z.string().optional().nullable().transform(e => e === "" ? null : e),
    notes: zod_1.z.string().optional().nullable().transform(e => e === "" ? null : e),
});
// Opdater insertCaseSchema med customerId som optional
exports.insertCaseSchema = (0, drizzle_zod_1.createInsertSchema)(exports.cases).pick({
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
    title: zod_1.z.string().min(1, "Titel er påkrævet"),
    description: zod_1.z.string().min(1, "Beskrivelse er påkrævet"),
    treatment: zod_1.z.enum(['repair', 'warranty', 'setup', 'other'], {
        required_error: "Behandling er påkrævet",
        invalid_type_error: "Vælg en gyldig behandlingstype",
    }),
    priority: zod_1.z.enum(['free_diagnosis', 'four_days', 'first_priority', 'asap'], {
        required_error: "Prioritet er påkrævet",
        invalid_type_error: "Vælg en gyldig prioritet",
    }),
    deviceType: zod_1.z.enum(['laptop', 'pc', 'printer', 'other'], {
        required_error: "Enhedstype er påkrævet",
        invalid_type_error: "Vælg en gyldig enhedstype",
    }),
    accessories: zod_1.z.string().optional().nullable().default(""),
    importantNotes: zod_1.z.string().optional().nullable().default(""),
    loginInfo: zod_1.z.string().optional().nullable().default(""),
    purchasedHere: zod_1.z.boolean().default(false),
    purchaseDate: zod_1.z.coerce.date().nullable(),
    customerSearch: zod_1.z.string().optional(),
    customerPhone: zod_1.z.string().optional(),
    customerId: zod_1.z.number().optional(),
    createdByName: zod_1.z.string().optional().nullable(),
});
exports.updateCaseSchema = zod_1.z.object({
    status: zod_1.z.enum([
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
    latestComment: zod_1.z.string().optional(),
});
// Export the Customer schema for validation
exports.CustomerSchema = zod_1.z.object({
    id: zod_1.z.number(),
    name: zod_1.z.string(),
    email: zod_1.z.string().nullable(),
    phone: zod_1.z.string(),
    address: zod_1.z.string().nullable(),
    city: zod_1.z.string().nullable(),
    postalCode: zod_1.z.string().nullable(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    notes: zod_1.z.string().nullable(),
});
// Export the RMA schema for validation
exports.RMASchema = zod_1.z.object({
    id: zod_1.z.number(),
    rmaNumber: zod_1.z.string(),
    customerId: zod_1.z.number(),
    description: zod_1.z.string(),
    deliveryDate: zod_1.z.date(),
    sku: zod_1.z.string().nullable(),
    model: zod_1.z.string().nullable(),
    serialNumber: zod_1.z.string().nullable(),
    supplier: zod_1.z.string().nullable(),
    supplierRmaId: zod_1.z.string().nullable(),
    shipmentDate: zod_1.z.date().nullable(),
    status: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    createdBy: zod_1.z.number(),
});
// Export the User schema for validation
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.number(),
    username: zod_1.z.string(),
    name: zod_1.z.string(),
    isWorker: zod_1.z.boolean(),
    isAdmin: zod_1.z.boolean(),
});
// Add RMA related schemas and types after the existing exports
exports.RMAStatus = {
    CREATED: 'created',
    SENT_TO_SUPPLIER: 'sent_to_supplier',
    WAITING_SUPPLIER: 'waiting_supplier',
    RECEIVED_FROM_SUPPLIER: 'received_from_supplier',
    READY_FOR_PICKUP: 'ready_for_pickup',
    COMPLETED: 'completed',
    REJECTED: 'rejected'
};
exports.rma = (0, pg_core_1.pgTable)("rma", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    rmaNumber: (0, pg_core_1.text)("rma_number").notNull(),
    customerId: (0, pg_core_1.integer)("customer_id").notNull().references(() => exports.customers.id),
    description: (0, pg_core_1.text)("description").notNull(),
    deliveryDate: (0, pg_core_1.timestamp)("delivery_date").notNull(),
    sku: (0, pg_core_1.text)("sku"),
    model: (0, pg_core_1.text)("model"),
    serialNumber: (0, pg_core_1.text)("serial_number"),
    supplier: (0, pg_core_1.text)("supplier"),
    supplierRmaId: (0, pg_core_1.text)("supplier_rma_id"),
    status: (0, pg_core_1.text)("status").notNull().default("created"),
    shipmentDate: (0, pg_core_1.timestamp)("shipment_date"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
    createdBy: (0, pg_core_1.integer)("created_by").notNull().references(() => exports.users.id),
});
// Tilføj rmaStatusHistory tabel
exports.rmaStatusHistory = (0, pg_core_1.pgTable)("rma_status_history", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    rmaId: (0, pg_core_1.integer)("rma_id").notNull().references(() => exports.rma.id),
    status: (0, pg_core_1.text)("status").notNull(),
    comment: (0, pg_core_1.text)("comment").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    createdBy: (0, pg_core_1.integer)("created_by").notNull().references(() => exports.users.id),
    createdByName: (0, pg_core_1.text)("created_by_name"),
});
// Definer relations for RMA tabellen
exports.rmaRelations = (0, drizzle_orm_1.relations)(exports.rma, ({ one }) => ({
    customer: one(exports.customers, {
        fields: [exports.rma.customerId],
        references: [exports.customers.id],
    }),
    createdByUser: one(exports.users, {
        fields: [exports.rma.createdBy],
        references: [exports.users.id],
    }),
}));
// Definer relations for rmaStatusHistory tabellen
exports.rmaStatusHistoryRelations = (0, drizzle_orm_1.relations)(exports.rmaStatusHistory, ({ one }) => ({
    rma: one(exports.rma, {
        fields: [exports.rmaStatusHistory.rmaId],
        references: [exports.rma.id],
    }),
    createdByUser: one(exports.users, {
        fields: [exports.rmaStatusHistory.createdBy],
        references: [exports.users.id],
    }),
}));
// RMA insert schema
exports.insertRMASchema = (0, drizzle_zod_1.createInsertSchema)(exports.rma).pick({
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
    customerId: zod_1.z.number({
        required_error: "Du skal vælge en kunde",
        invalid_type_error: "Du skal vælge en kunde",
    }),
    description: zod_1.z.string().min(1, "Beskrivelse er påkrævet"),
    deliveryDate: zod_1.z.coerce.date({
        required_error: "Leveringsdato er påkrævet",
        invalid_type_error: "Ugyldig leveringsdato",
    }),
    sku: zod_1.z.string().optional().nullable(),
    model: zod_1.z.string().optional().nullable(),
    serialNumber: zod_1.z.string().optional().nullable(),
    supplier: zod_1.z.string().optional().nullable(),
    supplierRmaId: zod_1.z.string().optional().nullable(),
    shipmentDate: zod_1.z.coerce.date().optional().nullable(),
});
// Order insert schema
exports.insertOrderSchema = (0, drizzle_zod_1.createInsertSchema)(exports.orders).pick({
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
    customerId: zod_1.z.number({
        required_error: "Du skal vælge en kunde",
        invalid_type_error: "Du skal vælge en kunde",
    }),
    model: zod_1.z.string().min(1, "Model er påkrævet"),
    itemsOrdered: zod_1.z.string().optional().nullable(),
    supplier: zod_1.z.string().optional().nullable(),
    serialNumber: zod_1.z.string().optional().nullable(),
    faultDescription: zod_1.z.string().optional().nullable(),
    price: zod_1.z.string().optional().nullable(),
    orderDate: zod_1.z.coerce.date(),
    caseId: zod_1.z.number().optional().nullable(),
    rmaId: zod_1.z.number().optional().nullable(),
    createdBy: zod_1.z.number(),
    orderNumber: zod_1.z.string().min(1, "Ordrenummer er påkrævet"),
});
exports.insertInternalCaseSchema = (0, drizzle_zod_1.createInsertSchema)(exports.internalCases).pick({
    caseId: true,
    senderId: true,
    receiverId: true,
    message: true,
}).extend({
    message: zod_1.z.string().min(1, "Besked er påkrævet"),
});
// Tilføj nye tabeller for statustyper og prioritetstyper
exports.caseStatusTypes = (0, pg_core_1.pgTable)("case_status_types", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    key: (0, pg_core_1.text)("key").notNull().unique(),
    label: (0, pg_core_1.text)("label").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
});
exports.priorityTypes = (0, pg_core_1.pgTable)("priority_types", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    key: (0, pg_core_1.text)("key").notNull().unique(),
    label: (0, pg_core_1.text)("label").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
});
