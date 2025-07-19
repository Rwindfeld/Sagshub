// =============================================================================
// SAGSHUB DATABASE SCHEMA
// =============================================================================
// Denne fil definerer hele database strukturen for SagsHub systemet og indeholder:
// - Database tabel definitioner (Drizzle ORM schema)
// - Relationer mellem tabeller
// - Type definitioner for TypeScript
// - Validerings schemas (Zod)
// - Enums og konstanter for status værdier
// =============================================================================

// Import af Drizzle ORM komponenter til database schema definition
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core"; // PostgreSQL tabel komponenter
import { relations } from "drizzle-orm"; // Til definition af tabel relationer
import { createInsertSchema } from "drizzle-zod"; // Integration mellem Drizzle og Zod validation
import { z } from "zod"; // Zod til runtime type validation

// =============================================================================
// USERS TABEL - BRUGERSTYRING
// =============================================================================
// Håndterer alle brugere i systemet (medarbejdere, admins og kunder)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),                    // Auto-increment primary key
  username: text("username").notNull().unique(),    // Unik brugernavn til login
  password: text("password").notNull(),             // Hashed password (bcrypt)
  isWorker: boolean("is_worker").notNull().default(false),   // Er brugeren en medarbejder?
  isAdmin: boolean("is_admin").notNull().default(false),     // Er brugeren administrator?
  isCustomer: boolean("is_customer").notNull().default(false), // Er brugeren en kunde?
  name: text("name").notNull(),                     // Fulde navn på brugeren
  birthday: timestamp("birthday"),                  // Fødselsdato (kan være null)
  customerId: integer("customer_id").references(() => customers.id), // Reference til customer tabel hvis det er en kunde
});

// =============================================================================
// CUSTOMERS TABEL - KUNDEDATA
// =============================================================================
// Gemmer alle kundeoplysninger og kontaktinformationer
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),                    // Auto-increment primary key
  name: text("name").notNull(),                     // Kundens fulde navn
  email: text("email"),                             // Email adresse (kan være null)
  phone: text("phone").notNull(),                   // Telefonnummer (påkrævet for identifikation)
  address: text("address"),                         // Gadenavn og nummer
  city: text("city"),                              // By/lokalitet
  postalCode: text("postal_code"),                 // Postnummer
  createdAt: timestamp("created_at").notNull().defaultNow(), // Hvornår kunden blev oprettet
  updatedAt: timestamp("updated_at").notNull().defaultNow(), // Sidste opdatering af kundedata
  notes: text("notes"),                            // Interne noter om kunden
});

// =============================================================================
// BEHANDLINGSTYPE ENUM
// =============================================================================
// Definerer hvilke typer behandlinger vi tilbyder
export const TreatmentType = {
  REPAIR: 'repair',       // Reparation af defekt udstyr
  WARRANTY: 'warranty',   // Reklamationssag
  SETUP: 'setup',        // Klargøring/installation
  OTHER: 'other'         // Andre typer behandlinger
} as const;

// =============================================================================
// PRIORITET ENUM
// =============================================================================
// Definerer forskellige prioritetsniveauer for sager
export const PriorityType = {
  FREE_DIAGNOSIS: 'free_diagnosis',  // Gratis diagnose (laveste prioritet)
  FOUR_DAYS: 'four_days',           // 4-dages behandling
  FIRST_PRIORITY: 'first_priority',  // Første prioritet
  ASAP: 'asap'                      // Så hurtigt som muligt (højeste prioritet)
} as const;

// =============================================================================
// ENHEDSTYPE ENUM
// =============================================================================
// Definerer hvilke typer enheder vi reparerer
export const DeviceType = {
  LAPTOP: 'laptop',    // Bærbare computere
  PC: 'pc',           // Stationære computere
  PRINTER: 'printer',  // Printere
  OTHER: 'other'      // Andre enheder
} as const;

// =============================================================================
// ORDRE STATUS ENUM
// =============================================================================
// Definerer status for bestillinger af reservedele
export const OrderStatus = {
  PENDING: 'pending',     // Afventer behandling
  ORDERED: 'ordered',     // Bestilt hos leverandør
  SHIPPED: 'shipped',     // Afsendt fra leverandør
  RECEIVED: 'received',   // Modtaget på værksted
  DELIVERED: 'delivered', // Leveret til kunde
  CANCELLED: 'cancelled'  // Annulleret
} as const;

// =============================================================================
// SAG STATUS ENUM
// =============================================================================
// Definerer alle mulige status værdier for sager gennem deres livscyklus
export const CaseStatus = {
  CREATED: 'created',                           // Nyoprettet sag
  IN_PROGRESS: 'in_progress',                   // Under behandling
  OFFER_CREATED: 'offer_created',               // Tilbud er lavet
  WAITING_CUSTOMER: 'waiting_customer',         // Venter på kundens svar
  OFFER_ACCEPTED: 'offer_accepted',             // Tilbud accepteret af kunde
  OFFER_REJECTED: 'offer_rejected',             // Tilbud afvist af kunde
  WAITING_PARTS: 'waiting_parts',               // Venter på reservedele
  PREPARING_DELIVERY: 'preparing_delivery',     // Forbereder udlevering
  READY_FOR_PICKUP: 'ready_for_pickup',         // Klar til afhentning
  COMPLETED: 'completed',                       // Afsluttet sag
} as const;

// =============================================================================
// CASES TABEL - HOVEDTABEL FOR SAGER
// =============================================================================
// Gemmer alle sager med deres details og status
export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),                             // Auto-increment primary key
  caseNumber: text("case_number").notNull(),                 // Unikt sagsnummer (fx TJD00001)
  customerId: integer("customer_id").notNull(),              // Reference til kunde
  title: text("title").notNull(),                            // Kort titel på sagen
  description: text("description").notNull(),                // Detaljeret beskrivelse af problemet
  treatment: text("treatment").notNull(),                    // Type behandling (repair, warranty, etc.)
  priority: text("priority").notNull(),                      // Prioritetsniveau
  deviceType: text("device_type").notNull(),                 // Type enhed
  accessories: text("accessories"),                          // Medfølgende tilbehør
  importantNotes: text("important_notes"),                   // Vigtige noter
  loginInfo: text("login_info"),                             // Login oplysninger til enheden
  purchasedHere: boolean("purchased_here").default(false),   // Købt i vores forretning?
  purchaseDate: timestamp("purchase_date"),                  // Dato for køb
  status: text("status").notNull().default("created"),       // Nuværende status
  createdAt: timestamp("created_at").notNull().defaultNow(), // Hvornår sagen blev oprettet
  updatedAt: timestamp("updated_at").notNull().defaultNow(), // Sidste opdatering
  createdBy: integer("created_by").notNull().references(() => users.id), // Hvem oprettede sagen
});

// =============================================================================
// RMA STATUS ENUM
// =============================================================================
// Definerer status værdier for RMA (Return Merchandise Authorization) sager
export const RMAStatus = {
  CREATED: 'created',                         // Nyoprettet RMA
  SENT_TO_SUPPLIER: 'sent_to_supplier',       // Sendt til leverandør
  WAITING_SUPPLIER: 'waiting_supplier',       // Venter på leverandør behandling
  RECEIVED_FROM_SUPPLIER: 'received_from_supplier', // Modtaget tilbage fra leverandør
  READY_FOR_PICKUP: 'ready_for_pickup',       // Klar til afhentning
  COMPLETED: 'completed',                     // Afsluttet RMA
  REJECTED: 'rejected'                        // Afvist af leverandør
} as const;

// =============================================================================
// RMA TABEL - REKLAMATIONSSAGER
// =============================================================================
// Håndterer reklamationer til leverandører
export const rma = pgTable("rma", {
  id: serial("id").primaryKey(),                             // Auto-increment primary key
  rmaNumber: text("rma_number").notNull(),                   // Unikt RMA nummer
  customerId: integer("customer_id").notNull().references(() => customers.id), // Reference til kunde
  description: text("description").notNull(),                // Beskrivelse af fejl/problem
  deliveryDate: timestamp("delivery_date").notNull(),        // Dato for levering til kunde
  sku: text("sku"),                                          // Varenummer/SKU
  model: text("model"),                                      // Model navn
  serialNumber: text("serial_number"),                       // Serienummer
  supplier: text("supplier"),                                // Leverandør navn
  supplierRmaId: text("supplier_rma_id"),                   // Leverandørens RMA ID
  status: text("status").notNull().default("created"),       // Nuværende status
  shipmentDate: timestamp("shipment_date"),                  // Dato for afsendelse til leverandør
  createdAt: timestamp("created_at").notNull().defaultNow(), // Oprettelsesdato
  updatedAt: timestamp("updated_at").notNull().defaultNow(), // Sidste opdatering
  createdBy: integer("created_by").notNull().references(() => users.id), // Hvem oprettede RMA'en
});

// =============================================================================
// RMA STATUS HISTORIE TABEL
// =============================================================================
// Holder styr på alle status ændringer for RMA sager
export const rmaStatusHistory = pgTable("rma_status_history", {
  id: serial("id").primaryKey(),                             // Auto-increment primary key
  rmaId: integer("rma_id").notNull().references(() => rma.id), // Reference til RMA sag
  status: text("status").notNull(),                           // Den nye status
  comment: text("comment").notNull(),                         // Kommentar til status ændringen
  createdAt: timestamp("created_at").notNull().defaultNow(),  // Hvornår status blev ændret
  createdBy: integer("created_by").notNull().references(() => users.id), // Hvem ændrede status
  createdByName: text("created_by_name"),                     // Navn på personen (denormaliseret for performance)
});

// =============================================================================
// ORDERS TABEL - BESTILLINGER AF RESERVEDELE
// =============================================================================
// Håndterer bestillinger af reservedele til reparationer
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),                             // Auto-increment primary key
  orderNumber: text("order_number").notNull(),               // Unikt ordrenummer
  customerId: integer("customer_id").notNull().references(() => customers.id), // Reference til kunde
  caseId: integer("case_id").references(() => cases.id),     // Reference til sag (kan være null)
  rmaId: integer("rma_id").references(() => rma.id),         // Reference til RMA (kan være null)
  model: text("model").notNull(),                            // Model der skal repareres
  serialNumber: text("serial_number"),                       // Serienummer
  faultDescription: text("fault_description"),               // Beskrivelse af fejl
  itemsOrdered: text("items_ordered").notNull(),             // Hvilke dele er bestilt
  supplier: text("supplier").notNull(),                      // Leverandør navn
  price: text("price"),                                      // Pris for delene
  orderDate: timestamp("order_date"),                        // Dato for bestilling
  status: text("status").notNull().default("pending"),       // Ordre status
  createdAt: timestamp("created_at").notNull().defaultNow(), // Oprettelsesdato
  updatedAt: timestamp("updated_at").notNull().defaultNow(), // Sidste opdatering
  createdBy: integer("created_by").notNull().references(() => users.id), // Hvem oprettede ordren
});

// =============================================================================
// STATUS HISTORIE TABEL
// =============================================================================
// Holder styr på alle status ændringer for sager
export const statusHistory = pgTable("status_history", {
  id: serial("id").primaryKey(),                             // Auto-increment primary key
  caseId: integer("case_id").notNull().references(() => cases.id), // Reference til sag
  status: text("status").notNull(),                           // Den nye status
  comment: text("comment").notNull(),                         // Kommentar til status ændringen
  createdAt: timestamp("created_at").notNull().defaultNow(),  // Hvornår status blev ændret
  createdBy: integer("created_by").notNull().references(() => users.id), // Hvem ændrede status
  createdByName: text("created_by_name"),                     // Navn på personen (denormaliseret)
});

// =============================================================================
// INTERNE SAGER TABEL
// =============================================================================
// Håndterer intern kommunikation mellem medarbejdere om specifikke sager
export const internalCases = pgTable("internal_cases", {
  id: serial("id").primaryKey(),                             // Auto-increment primary key
  caseId: integer("case_id").notNull().references(() => cases.id), // Reference til sag
  senderId: integer("sender_id").notNull().references(() => users.id), // Hvem sendte beskeden
  receiverId: integer("receiver_id").notNull().references(() => users.id), // Hvem skal modtage beskeden
  message: text("message").notNull(),                         // Besked indhold
  read: boolean("read").notNull().default(false),            // Er beskeden læst?
  createdAt: timestamp("created_at").notNull().defaultNow(), // Hvornår beskeden blev sendt
  updatedAt: timestamp("updated_at").notNull().defaultNow(), // Sidste opdatering (fx læst tidspunkt)
});

// =============================================================================
// KONFIGURATIONSTABELLER FOR DYNAMISKE VÆRDIER
// =============================================================================

// Tabel til dynamisk håndtering af sag status typer
export const caseStatusTypes = pgTable("case_status_types", {
  id: serial("id").primaryKey(),                             // Auto-increment primary key
  key: text("key").notNull().unique(),                       // Nøgle (fx 'created', 'in_progress')
  label: text("label").notNull(),                            // Menneskelæselig label (fx 'Oprettet', 'I gang')
  createdAt: timestamp("created_at").notNull().defaultNow(), // Oprettelsesdato
  updatedAt: timestamp("updated_at").notNull().defaultNow(), // Sidste opdatering
});

// Tabel til dynamisk håndtering af prioritets typer
export const priorityTypes = pgTable("priority_types", {
  id: serial("id").primaryKey(),                             // Auto-increment primary key
  key: text("key").notNull().unique(),                       // Nøgle (fx 'asap', 'first_priority')
  label: text("label").notNull(),                            // Menneskelæselig label (fx 'Haster', 'Første prioritet')
  createdAt: timestamp("created_at").notNull().defaultNow(), // Oprettelsesdato
  updatedAt: timestamp("updated_at").notNull().defaultNow(), // Sidste opdatering
});

// =============================================================================
// TABEL RELATIONER
// =============================================================================
// Definerer relationer mellem tabeller for at kunne lave joins og eager loading

// Relationer for users tabellen - definerer hvordan users relaterer til andre tabeller
export const usersRelations = relations(users, ({ many }) => ({
  cases: many(cases),                     // En bruger kan oprette mange sager
  statusHistory: many(statusHistory),     // En bruger kan lave mange status opdateringer
  sentInternalCases: many(internalCases, { relationName: "sender" }),     // Bruger kan sende mange interne beskeder
  receivedInternalCases: many(internalCases, { relationName: "receiver" }), // Bruger kan modtage mange interne beskeder
}));

// Relationer for internalCases tabellen - forbinder intern kommunikation med sager og brugere
export const internalCasesRelations = relations(internalCases, ({ one }) => ({
  case: one(cases, {                      // Hver intern besked tilhører én sag
    fields: [internalCases.caseId],
    references: [cases.id],
  }),
  sender: one(users, {                    // Hver besked har én afsender
    fields: [internalCases.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  receiver: one(users, {                  // Hver besked har én modtager
    fields: [internalCases.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
}));

// Relationer for cases tabellen - forbinder sager med kunder og oprettere
export const casesRelations = relations(cases, ({ one }) => ({
  customer: one(customers, {              // Hver sag tilhører én kunde
    fields: [cases.customerId],
    references: [customers.id],
  }),
  createdByUser: one(users, {             // Hver sag er oprettet af én bruger
    fields: [cases.createdBy],
    references: [users.id],
  }),
}));

// Relationer for RMA tabellen - forbinder RMA sager med kunder og oprettere
export const rmaRelations = relations(rma, ({ one }) => ({
  customer: one(customers, {              // Hver RMA tilhører én kunde
    fields: [rma.customerId],
    references: [customers.id],
  }),
  createdByUser: one(users, {             // Hver RMA er oprettet af én bruger
    fields: [rma.createdBy],
    references: [users.id],
  }),
}));

// Relationer for RMA status historie - forbinder status opdateringer med RMA og brugere
export const rmaStatusHistoryRelations = relations(rmaStatusHistory, ({ one }) => ({
  rma: one(rma, {                         // Hver status opdatering tilhører én RMA
    fields: [rmaStatusHistory.rmaId],
    references: [rma.id],
  }),
  createdByUser: one(users, {             // Hver status opdatering er lavet af én bruger
    fields: [rmaStatusHistory.createdBy],
    references: [users.id],
  }),
}));

// Relationer for orders tabellen - forbinder bestillinger med kunder, sager, RMA og oprettere
export const ordersRelations = relations(orders, ({ one }) => ({
  customer: one(customers, {              // Hver ordre tilhører én kunde
    fields: [orders.customerId],
    references: [customers.id],
  }),
  case: one(cases, {                      // Ordre kan være relateret til én sag
    fields: [orders.caseId],
    references: [cases.id],
  }),
  rma: one(rma, {                         // Ordre kan være relateret til én RMA
    fields: [orders.rmaId],
    references: [rma.id],
  }),
  createdByUser: one(users, {             // Hver ordre er oprettet af én bruger
    fields: [orders.createdBy],
    references: [users.id],
  }),
}));

// Relationer for status historie - forbinder status opdateringer med sager og brugere
export const statusHistoryRelations = relations(statusHistory, ({ one }) => ({
  case: one(cases, {                      // Hver status opdatering tilhører én sag
    fields: [statusHistory.caseId],
    references: [cases.id],
  }),
  createdByUser: one(users, {             // Hver status opdatering er lavet af én bruger
    fields: [statusHistory.createdBy],
    references: [users.id],
  }),
}));

// =============================================================================
// ZOD VALIDERINGS SCHEMAS
// =============================================================================
// Definerer runtime validation af data før indsættelse i database

// Schema til indsættelse og opdatering af brugere
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,                         // Bruger skal have brugernavn
  password: true,                         // Password (optional ved update)
  name: true,                            // Fulde navn
  isWorker: true,                        // Boolean flag for medarbejder
  isAdmin: true,                         // Boolean flag for administrator
  isCustomer: true,                      // Boolean flag for kunde
  birthday: true,                        // Fødselsdato (optional)
  customerId: true,                      // Reference til kunde (optional)
}).extend({
  username: z.string().min(1, "Brugernavn er påkrævet"),          // Validerer brugernavn
  password: z.string().optional(),                                // Password er optional ved update
  name: z.string().min(1, "Navn er påkrævet"),                   // Validerer navn
  birthday: z.coerce.date().optional().nullable(),                // Konverterer til dato
  customerId: z.number().optional().nullable(),                   // Validerer kunde ID
});

// Schema specifikt til oprettelse af nye brugere (kræver password)
export const createUserSchema = insertUserSchema.extend({
  password: z.string().min(6, "Adgangskode skal være mindst 6 tegn"), // Password påkrævet ved oprettelse
});

// Schema til opdatering af eksisterende brugere (password optional)
export const updateUserSchema = insertUserSchema.extend({
  password: z.string().min(6, "Adgangskode skal være mindst 6 tegn").optional(), // Password optional ved update
});

// Schema til indsættelse og opdatering af kunder
export const insertCustomerSchema = createInsertSchema(customers).pick({
  name: true,                            // Kundens navn (påkrævet)
  email: true,                           // Email adresse (optional)
  phone: true,                           // Telefonnummer (påkrævet)
  address: true,                         // Adresse (optional)
  city: true,                            // By (optional)
  postalCode: true,                      // Postnummer (optional)
  notes: true,                           // Interne noter (optional)
}).extend({
  name: z.string().min(1, "Navn er påkrævet"),                   // Validerer kunde navn
  phone: z.string().min(1, "Telefon er påkrævet"),              // Validerer telefonnummer
  email: z.string().optional().nullable().transform(e => e === "" ? null : e),       // Konverterer tom streng til null
  address: z.string().optional().nullable().transform(e => e === "" ? null : e),     // Konverterer tom streng til null
  city: z.string().optional().nullable().transform(e => e === "" ? null : e),         // Konverterer tom streng til null
  postalCode: z.string().optional().nullable().transform(e => e === "" ? null : e), // Konverterer tom streng til null
  notes: z.string().optional().nullable().transform(e => e === "" ? null : e),      // Konverterer tom streng til null
});

// Schema til indsættelse af nye sager
export const insertCaseSchema = createInsertSchema(cases).pick({
  customerId: true,                       // Reference til kunde (optional ved oprettelse)
  title: true,                           // Titel på sagen
  description: true,                     // Beskrivelse af problemet
  treatment: true,                       // Behandlingstype
  priority: true,                        // Prioritetsniveau
  deviceType: true,                      // Type enhed
  accessories: true,                     // Tilbehør (optional)
  importantNotes: true,                  // Vigtige noter (optional)
  loginInfo: true,                       // Login info (optional)
  purchasedHere: true,                   // Købt her? (boolean)
  purchaseDate: true,                    // Købsdato (optional)
}).extend({
  title: z.string().min(1, "Titel er påkrævet"),                // Validerer titel
  description: z.string().min(1, "Beskrivelse er påkrævet"),    // Validerer beskrivelse
  treatment: z.enum(['repair', 'warranty', 'setup', 'other'] as const, {  // Enum validation for behandling
    required_error: "Behandling er påkrævet",
    invalid_type_error: "Vælg en gyldig behandlingstype",
  }),
  priority: z.enum(['free_diagnosis', 'four_days', 'first_priority', 'asap'] as const, { // Enum validation for prioritet
    required_error: "Prioritet er påkrævet",
    invalid_type_error: "Vælg en gyldig prioritet",
  }),
  deviceType: z.enum(['laptop', 'pc', 'printer', 'other'] as const, {     // Enum validation for enhedstype
    required_error: "Enhedstype er påkrævet",
    invalid_type_error: "Vælg en gyldig enhedstype",
  }),
  accessories: z.string().optional().nullable().default(""),              // Tilbehør er optional
  importantNotes: z.string().optional().nullable().default(""),           // Vigtige noter er optional
  loginInfo: z.string().optional().nullable().default(""),                // Login info er optional
  purchasedHere: z.boolean().default(false),                              // Default false for købt her
  purchaseDate: z.coerce.date().nullable(),                               // Konverterer til dato eller null
  customerSearch: z.string().optional(),                                  // Kundesøgning (frontend only)
  customerPhone: z.string().optional(),                                   // Kunde telefon (frontend only)
  customerId: z.number().optional(),                                      // Kunde ID (optional ved oprettelse)
  createdByName: z.string().optional().nullable(),                        // Navn på opretter (denormaliseret)
});

// Schema til opdatering af sag status
export const updateCaseSchema = z.object({
  status: z.enum([                        // Validerer at status er en af de gyldige værdier
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
  latestComment: z.string().optional(),   // Kommentar til status ændringen (optional)
});

// Schema til indsættelse af RMA sager
export const insertRMASchema = createInsertSchema(rma).pick({
  customerId: true,                       // Reference til kunde
  description: true,                      // Beskrivelse af fejl
  deliveryDate: true,                     // Leveringsdato
  sku: true,                             // Varenummer
  model: true,                           // Model navn
  serialNumber: true,                    // Serienummer
  supplier: true,                        // Leverandør
  supplierRmaId: true,                   // Leverandørens RMA ID
  shipmentDate: true,                    // Afsendelsesdato
}).extend({
  customerId: z.number({                  // Validerer kunde ID
    required_error: "Du skal vælge en kunde",
    invalid_type_error: "Du skal vælge en kunde",
  }),
  description: z.string().min(1, "Beskrivelse er påkrævet"),    // Validerer beskrivelse
  deliveryDate: z.coerce.date({          // Validerer leveringsdato
    required_error: "Leveringsdato er påkrævet",
    invalid_type_error: "Ugyldig leveringsdato",
  }),
  sku: z.string().optional().nullable(),                        // SKU er optional
  model: z.string().optional().nullable(),                      // Model er optional
  serialNumber: z.string().optional().nullable(),               // Serienummer er optional
  supplier: z.string().optional().nullable(),                   // Leverandør er optional
  supplierRmaId: z.string().optional().nullable(),              // Leverandør RMA ID er optional
  shipmentDate: z.coerce.date().optional().nullable(),          // Afsendelsesdato er optional
});

// Schema til indsættelse af bestillinger
export const insertOrderSchema = createInsertSchema(orders).pick({
  customerId: true,                       // Reference til kunde
  caseId: true,                          // Reference til sag (optional)
  rmaId: true,                           // Reference til RMA (optional)
  model: true,                           // Model navn
  serialNumber: true,                    // Serienummer
  faultDescription: true,                // Fejlbeskrivelse
  itemsOrdered: true,                    // Bestilte varer
  supplier: true,                        // Leverandør
  price: true,                           // Pris
  orderDate: true,                       // Bestillingsdato
  createdBy: true,                       // Hvem oprettede ordren
  orderNumber: true,                     // Ordrenummer
}).extend({
  customerId: z.number({                  // Validerer kunde ID
    required_error: "Du skal vælge en kunde",
    invalid_type_error: "Du skal vælge en kunde",
  }),
  model: z.string().min(1, "Model er påkrævet"),               // Validerer model navn
  itemsOrdered: z.string().optional().nullable(),              // Bestilte varer er optional
  supplier: z.string().optional().nullable(),                  // Leverandør er optional
  serialNumber: z.string().optional().nullable(),              // Serienummer er optional
  faultDescription: z.string().optional().nullable(),          // Fejlbeskrivelse er optional
  price: z.string().optional().nullable(),                     // Pris er optional
  orderDate: z.coerce.date(),                                  // Konverterer til dato
  caseId: z.number().optional().nullable(),                    // Sag ID er optional
  rmaId: z.number().optional().nullable(),                     // RMA ID er optional
  createdBy: z.number(),                                       // Opretter ID påkrævet
  orderNumber: z.string().min(1, "Ordrenummer er påkrævet"),   // Validerer ordrenummer
});

// Schema til indsættelse af interne beskeder
export const insertInternalCaseSchema = createInsertSchema(internalCases).pick({
  caseId: true,                          // Reference til sag
  senderId: true,                        // Afsender ID
  receiverId: true,                      // Modtager ID
  message: true,                         // Besked indhold
}).extend({
  message: z.string().min(1, "Besked er påkrævet"),           // Validerer besked indhold
});

// =============================================================================
// TYPESCRIPT TYPE EKSPORTER
// =============================================================================
// Disse typer bruges i hele applikationen til type safety

// Basic insert typer (genereret fra Drizzle schemas)
export type InsertUser = typeof users.$inferInsert;                      // Type til indsættelse af bruger
export type InsertCustomer = typeof customers.$inferInsert;              // Type til indsættelse af kunde
export type InsertCase = z.infer<typeof insertCaseSchema>;               // Type til indsættelse af sag (med validation)
export type UpdateCase = z.infer<typeof updateCaseSchema>;               // Type til opdatering af sag

// Basic select typer (genereret fra Drizzle schemas)
export type User = typeof users.$inferSelect;                            // Type for bruger data
export type Customer = typeof customers.$inferSelect;                    // Type for kunde data
export type Case = typeof cases.$inferSelect;                            // Type for sag data

// Validerings schemas til runtime validation
export const CustomerSchema = z.object({                                 // Runtime validation af kunde data
  id: z.number(),                                                        // Kunde ID
  name: z.string(),                                                      // Kunde navn
  email: z.string().nullable(),                                          // Email (kan være null)
  phone: z.string(),                                                     // Telefonnummer
  address: z.string().nullable(),                                        // Adresse (kan være null)
  city: z.string().nullable(),                                           // By (kan være null)
  postalCode: z.string().nullable(),                                     // Postnummer (kan være null)
  createdAt: z.date(),                                                   // Oprettelsesdato
  updatedAt: z.date(),                                                   // Opdateringsdato
  notes: z.string().nullable(),                                          // Noter (kan være null)
});

export const RMASchema = z.object({                                      // Runtime validation af RMA data
  id: z.number(),                                                        // RMA ID
  rmaNumber: z.string(),                                                 // RMA nummer
  customerId: z.number(),                                                // Kunde ID
  description: z.string(),                                               // Beskrivelse
  deliveryDate: z.date(),                                                // Leveringsdato
  sku: z.string().nullable(),                                            // SKU (kan være null)
  model: z.string().nullable(),                                          // Model (kan være null)
  serialNumber: z.string().nullable(),                                   // Serienummer (kan være null)
  supplier: z.string().nullable(),                                       // Leverandør (kan være null)
  supplierRmaId: z.string().nullable(),                                  // Leverandør RMA ID (kan være null)
  shipmentDate: z.date().nullable(),                                     // Afsendelsesdato (kan være null)
  status: z.string(),                                                    // Status
  createdAt: z.date(),                                                   // Oprettelsesdato
  updatedAt: z.date(),                                                   // Opdateringsdato
  createdBy: z.number(),                                                 // Opretter ID
});

export const UserSchema = z.object({                                     // Runtime validation af bruger data
  id: z.number(),                                                        // Bruger ID
  username: z.string(),                                                  // Brugernavn
  name: z.string(),                                                      // Fulde navn
  isWorker: z.boolean(),                                                 // Er medarbejder?
  isAdmin: z.boolean(),                                                  // Er administrator?
});

// =============================================================================
// UDVIDEDE TYPE DEFINITIONER
// =============================================================================
// Kombinerede typer til frontend brug med joinede data

// Sag med kunde information (til visning i lister)
export type CaseWithCustomer = Omit<Case, "createdBy"> & {
  customerName: string;                                                  // Kundens navn (joinede data)
  customerPhone?: string | null;                                         // Kundens telefon (joinede data)
  createdBy: string | null;                                              // Navn på opretter (joinede data)
};

// Union typer for enum værdier (bruges til dropdowns og validation)
export type TreatmentTypeValue = typeof TreatmentType[keyof typeof TreatmentType];  // Type for behandlingstype værdier
export type PriorityTypeValue = typeof PriorityType[keyof typeof PriorityType];      // Type for prioritets værdier
export type DeviceTypeValue = typeof DeviceType[keyof typeof DeviceType];            // Type for enhedstype værdier
export type CaseStatusValue = typeof CaseStatus[keyof typeof CaseStatus];            // Type for sag status værdier

// Status historie med bruger information
export type StatusHistory = typeof statusHistory.$inferSelect & {
  createdBy: string | null;                                              // Navn på opretter (joinede data)
  createdByName: string | null;                                          // Navn på opretter (denormaliseret)
};

// RMA relaterede typer
export type RMAStatusValue = typeof RMAStatus[keyof typeof RMAStatus];               // Type for RMA status værdier
export type RMA = typeof rma.$inferSelect;                                           // Type for RMA data
export type InsertRMA = z.infer<typeof insertRMASchema>;                             // Type til indsættelse af RMA
export type RMAStatusHistory = typeof rmaStatusHistory.$inferSelect & {              // RMA status historie med bruger info
  createdBy: string | null;                                              // Navn på opretter (joinede data)
  createdByName: string | null;                                          // Navn på opretter (denormaliseret)
};

// Ordre med kunde information (til visning i lister)
export type OrderWithCustomer = Order & {
  customerName: string;                                                  // Kundens navn (joinede data)
  customerPhone?: string | null;                                         // Kundens telefon (joinede data)
  customerEmail?: string | null;                                         // Kundens email (joinede data)
  customerAddress?: string | null;                                       // Kundens adresse (joinede data)
  createdByName?: string | null;                                         // Navn på opretter (joinede data)
  caseCaseNumber?: string | null;                                        // Sagsnummer (joinede data)
  rmaCaseNumber?: string | null;                                         // RMA nummer (joinede data)
};

// Ordre relaterede typer
export type OrderStatusValue = typeof OrderStatus[keyof typeof OrderStatus];        // Type for ordre status værdier
export type Order = typeof orders.$inferSelect & { customerName?: string };         // Type for ordre data med kunde navn
export type InsertOrder = typeof orders.$inferInsert;                               // Type til indsættelse af ordre

// Interne sager typer
export type InternalCase = typeof internalCases.$inferSelect;                        // Type for intern sag data
export type InsertInternalCase = typeof internalCases.$inferInsert;                 // Type til indsættelse af intern sag
export type InternalCaseWithDetails = InternalCase & {                              // Intern sag med detaljerede informationer
  caseCaseNumber: string;                                                // Sagsnummer (joinede data)
  senderName: string;                                                    // Afsender navn (joinede data)
  receiverName: string;                                                  // Modtager navn (joinede data)
  customerName: string;                                                  // Kunde navn (joinede data)
};