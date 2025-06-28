// =============================================================================
// SAGSHUB DATABASE STORAGE LAYER
// =============================================================================
// Denne fil implementerer hele data access layer for SagsHub systemet og indeholder:
// - Database operationer for alle entiteter (sager, kunder, brugere, etc.)
// - Pagination og søgefunktionalitet
// - Session storage konfiguration
// - Alarm logik for sager der kræver handling
// - Komplekse queries med joins og filtrering
// - CRUD operationer med proper error handling
// =============================================================================

// Import af database forbindelse og Drizzle ORM operatorer
import { db } from "./db.js";                               // Database forbindelse
import { eq, desc, asc, and, or, like, ilike, sql, ne } from "drizzle-orm"; // Drizzle ORM query operatorer

// Import af TypeScript type definitioner fra schema
import type {
  User,                                                     // Bruger type
  Customer,                                                 // Kunde type  
  Case,                                                     // Sag type
  StatusHistory,                                            // Status historie type
  RMA,                                                      // RMA type
  RMAStatusHistory,                                         // RMA status historie type
  Order,                                                    // Ordre type
  InsertOrder,                                              // Insert ordre type
  InternalCase,                                             // Intern sag type
  InsertInternalCase,                                       // Insert intern sag type
  InternalCaseWithDetails                                   // Intern sag med detaljer type
} from "../shared/schema.js";

// Import af database tabel definitioner og enums
import { 
  users,                                                    // Users tabel
  customers,                                                // Customers tabel
  cases,                                                    // Cases tabel
  rma,                                                      // RMA tabel
  orders,                                                   // Orders tabel
  internalCases,                                            // Internal cases tabel
  statusHistory,                                            // Status history tabel
  rmaStatusHistory,                                         // RMA status history tabel
  CaseStatus,                                               // Case status enum
  TreatmentType,                                            // Treatment type enum
  PriorityType,                                             // Priority type enum
  DeviceType,                                               // Device type enum
  OrderStatus,                                              // Order status enum
  RMAStatus                                                 // RMA status enum
} from "../shared/schema";

// Import af session middleware og PostgreSQL session store
import session from "express-session";                     // Express session middleware
import connectPg from "connect-pg-simple";                 // PostgreSQL session store
import { isCaseInAlarm } from "../shared/alarm";           // Alarm logik utility

// =============================================================================
// UTILITY FUNKTIONER
// =============================================================================

// Beregner antal arbejdsdage mellem to datoer (ekskluderer weekender)
function getBusinessDaysDifference(startDate: Date, endDate: Date): number {
  let count = 0;                                            // Tæller for arbejdsdage
  let current = new Date(startDate);                        // Nuværende dato i loop
  while (current <= endDate) {                              // Loop gennem alle dage
    const day = current.getDay();                           // Henter ugedag (0-6)
    if (day !== 0 && day !== 6) count++;                   // Tæller kun hverdage (ikke søndag=0 eller lørdag=6)
    current.setDate(current.getDate() + 1);                // Går til næste dag
  }
  return count;
}

// =============================================================================
// TYPE DEFINITIONER OG INTERFACES
// =============================================================================

// Udvidet status historie interface med bruger navn information
export interface ExtendedStatusHistory extends Omit<StatusHistory, "createdBy"> {
  createdBy: number;                                        // Bruger ID der oprettede status
  createdByName: string | null;                            // Navn på bruger (denormaliseret for performance)
}

// Udvidet RMA status historie interface med bruger navn information
export interface ExtendedRMAStatusHistory extends Omit<RMAStatusHistory, "createdBy"> {
  createdBy: number;                                        // Bruger ID der oprettede RMA status
  createdByName: string | null;                            // Navn på bruger (denormaliseret for performance)
}

// Sag interface med kunde information (joinede data)
export interface CaseWithCustomer extends Omit<Case, "createdBy"> {
  customerName: string;                                     // Kunde navn (joinede data fra customer tabel)
  createdBy: string | null;                                // Navn på bruger der oprettede sagen
}

// Generic pagineret response interface
export interface PaginatedResponse<T> {
  items: T[];                                               // Array af items på denne side
  total: number;                                            // Totalt antal items
  page: number;                                             // Nuværende side nummer
  pageSize: number;                                         // Antal items per side
  totalPages: number;                                       // Total antal sider
  statusCounts?: Record<string, number>;                    // Optional: antal per status (for filtrering)
}

// Options interface til paginerede sager queries
export interface GetPaginatedCasesOptions {
  page: number;                                             // Side nummer (1-baseret)
  pageSize: number;                                         // Antal sager per side
  searchTerm?: string;                                      // Søgeterm (kunde navn, sag nummer, beskrivelse)
  treatment?: string;                                       // Filter på behandlingstype
  priority?: string;                                        // Filter på prioritet
  sort?: string;                                            // Sortering (newest, oldest, etc.)
  customerId?: number;                                      // Filter på specifik kunde
  isWorker: boolean;                                        // Er brugeren medarbejder? (påvirker hvilke sager der vises)
  status?: string;                                          // Filter på specifik status
  excludeStatus?: string;                                   // Ekskluder specifik status
  includeCompleted?: boolean;                               // Inkluder afsluttede sager?
}

// Options interface til paginerede RMA queries
export interface GetPaginatedRMAsOptions {
  page: number;                                             // Side nummer (1-baseret)
  pageSize: number;                                         // Antal RMA'er per side
  searchTerm?: string;                                      // Søgeterm (kunde navn, RMA nummer, beskrivelse)
  status?: string;                                          // Filter på RMA status
  sort?: 'newest' | 'oldest' | 'default';                  // Sortering type
}

// Options interface til paginerede interne sager queries
export interface GetPaginatedInternalCasesOptions {
  page: number;                                             // Side nummer (1-baseret)
  pageSize: number;                                         // Antal interne beskeder per side
  userId: number;                                           // Bruger ID (for at finde relevante beskeder)
  onlySent?: boolean;                                       // Vis kun sendte beskeder
  onlyReceived?: boolean;                                   // Vis kun modtagne beskeder
  onlyUnread?: boolean;                                     // Vis kun ulæste beskeder
}

// Options interface til paginerede ordre queries
export interface GetPaginatedOrdersOptions {
  page: number;                                             // Side nummer (1-baseret)
  pageSize: number;                                         // Antal ordrer per side
  searchTerm?: string;                                      // Søgeterm (kunde navn, ordre nummer)
  status?: string;                                          // Filter på ordre status
  sort?: string;                                            // Sortering
  customerId?: number;                                      // Filter på specifik kunde
}

// Type definition for ordre med kunde information
export type OrderWithCustomer = Order & { customerName?: string }; // Ordre med joinede kunde navn

// =============================================================================
// STORAGE INTERFACE DEFINITION
// =============================================================================
// Definerer kontrakten for alle database operationer i systemet
export interface IStorage {
  // =================================================================
  // BRUGER OPERATIONER
  // =================================================================
  getUser(id: number): Promise<User | undefined>;                    // Hent bruger via ID
  getUserByUsername(username: string): Promise<User | undefined>;    // Hent bruger via brugernavn
  createUser(userData: Omit<User, "id">): Promise<User>;             // Opret ny bruger
  getUsers(): Promise<User[]>;                                       // Hent alle brugere
  
  // =================================================================
  // KUNDE OPERATIONER
  // =================================================================
  getCustomers(): Promise<Customer[]>;                               // Hent alle kunder
  getCustomer(id: number): Promise<Customer | undefined>;            // Hent specifik kunde
  createCustomer(customer: Omit<Customer, "id" | "createdAt" | "updatedAt">): Promise<Customer>; // Opret ny kunde
  updateCustomer(id: number, customer: Partial<Omit<Customer, "id" | "createdAt" | "updatedAt">>): Promise<Customer | undefined>; // Opdater kunde
  searchCustomers(searchTerm: string): Promise<Customer[]>;          // Søg kunder
  
  // =================================================================
  // SAG OPERATIONER
  // =================================================================
  getCases(customerId?: number): Promise<CaseWithCustomer[]>;        // Hent sager (evt. filtreret på kunde)
  getCase(id: number): Promise<Case | undefined>;                    // Hent specifik sag
  createCase(caseData: Omit<Case, "id" | "createdAt" | "updatedAt"> & { createdByName?: string }): Promise<Case>; // Opret ny sag
  updateCaseStatus(id: number, status: string): Promise<Case>;       // Opdater sag status
  getLatestCaseNumber(prefix: string): Promise<Case[]>;              // Hent seneste sagsnumre for auto-generering
  searchCases(searchTerm: string): Promise<CaseWithCustomer[]>;      // Søg sager
  
  // =================================================================
  // SESSION STORE
  // =================================================================
  sessionStore: session.Store;                                       // Express session store til login sessions
  
  // =================================================================
  // STATUS HISTORIE OPERATIONER
  // =================================================================
  getCaseStatusHistory(caseId: number): Promise<ExtendedStatusHistory[]>; // Hent status historie for sag
  updateCaseStatusWithHistory(caseId: number, status: string, comment: string, userId: number, updatedByName?: string): Promise<Case>; // Opdater status med historik
  
  // =================================================================
  // RMA OPERATIONER
  // =================================================================
  getRMAs(): Promise<RMA[]>;                                         // Hent alle RMA'er
  getRMA(id: number): Promise<RMA | undefined>;                      // Hent specifik RMA
  createRMA(rmaData: Omit<RMA, "id" | "createdAt" | "updatedAt">): Promise<RMA>; // Opret ny RMA
  updateRMAStatus(id: number, status: string): Promise<RMA>;         // Opdater RMA status
  getRMAStatusHistory(rmaId: number): Promise<ExtendedRMAStatusHistory[]>; // Hent RMA status historie
  updateRMAStatusWithHistory(rmaId: number, status: string, comment: string, userId: number, updatedByName?: string): Promise<RMA>; // Opdater RMA status med historik
  updateCase(id: number, caseData: Partial<Omit<Case, "id" | "createdAt" | "updatedAt">>): Promise<Case | undefined>; // Opdater sag
  updateRMA(id: number, rmaData: Partial<Omit<RMA, "id" | "createdAt" | "updatedAt">>): Promise<RMA>; // Opdater RMA
  
  // =================================================================
  // PAGINEREDE QUERIES
  // =================================================================
  getPaginatedCases(options: GetPaginatedCasesOptions): Promise<PaginatedResponse<CaseWithCustomer>>; // Paginerede sager
  getPaginatedCustomers(page: number, pageSize: number, searchTerm?: string): Promise<PaginatedResponse<Customer>>; // Paginerede kunder
  getPaginatedRMAs(options: GetPaginatedRMAsOptions): Promise<PaginatedResponse<RMA>>; // Paginerede RMA'er
  getRMAsByCustomerId(customerId: number): Promise<RMA[]>;           // RMA'er for specifik kunde
  
  // =================================================================
  // INTERNE SAG OPERATIONER
  // =================================================================
  createInternalCase(internalCaseData: InsertInternalCase): Promise<InternalCase>; // Opret intern besked
  getInternalCase(id: number): Promise<InternalCaseWithDetails | undefined>; // Hent specifik intern besked
  getPaginatedInternalCases(options: GetPaginatedInternalCasesOptions): Promise<PaginatedResponse<InternalCaseWithDetails>>; // Paginerede interne beskeder
  markInternalCaseAsRead(id: number): Promise<InternalCase | undefined>; // Marker intern besked som læst
  getUnreadInternalCasesCount(userId: number): Promise<number>;      // Antal ulæste interne beskeder
  
  // =================================================================
  // BESTILLING OPERATIONER
  // =================================================================
  getOrders(): Promise<Order[]>;                                     // Hent alle bestillinger
  getOrder(id: number): Promise<(OrderWithCustomer & {              // Hent specifik bestilling med detaljer
    customer?: { name: string; phone: string; email: string | null };
    createdByUser?: { name: string };
    case?: { caseNumber: string; description: string };
    rmaCase?: { rmaNumber: string; description: string };
  }) | undefined>;
  getLatestOrderNumber(): Promise<Order | undefined>;                // Hent seneste ordrenummer for auto-generering
  createOrder(orderData: InsertOrder): Promise<Order>;               // Opret ny bestilling
  updateOrderStatus(id: number, status: string): Promise<Order>;     // Opdater bestilling status
  updateOrder(id: number, orderData: Partial<Omit<Order, "id" | "createdAt" | "updatedAt">>): Promise<Order>; // Opdater bestilling
  getPaginatedOrders(options: GetPaginatedOrdersOptions): Promise<PaginatedResponse<OrderWithCustomer>>; // Paginerede bestillinger
  getOrdersByCustomerId(customerId: number): Promise<OrderWithCustomer[]>; // Bestillinger for specifik kunde
  getOrdersByCaseId(caseId: number): Promise<OrderWithCustomer[]>;   // Bestillinger for specifik sag
  
  // =================================================================
  // SØGE OPERATIONER
  // =================================================================
  searchRMAs(searchTerm: string): Promise<RMA[]>;                    // Søg RMA'er
  searchOrders(searchTerm: string): Promise<OrderWithCustomer[]>;    // Søg bestillinger
  
  // =================================================================
  // BRUGER ADMINISTRATION
  // =================================================================
  updateUserPassword(userId: number, hashedPassword: string): Promise<User>; // Opdater bruger password
  updateUser(id: number, data: { username?: string; name?: string; isWorker?: boolean; isAdmin?: boolean; birthday?: Date | null; password?: string }): Promise<User>; // Opdater bruger
  deleteUser(id: number): Promise<void>;                            // Slet bruger
  
  // =================================================================
  // KUNDE AUTENTIFICERING
  // =================================================================
  getCustomerUser(customerId: number): Promise<User | undefined>;    // Hent kunde bruger konto
  createCustomerUser(customer: Customer, caseNumber: string): Promise<User>; // Opret kunde bruger konto
  createOrUpdateCustomerUsers(): Promise<void>;                     // Opret/opdater alle kunde bruger konti
  getCaseByNumber(caseNumber: string): Promise<Case | undefined>;    // Hent sag via sagsnummer
  
  // =================================================================
  // STATISTIK OG ALARM OPERATIONER
  // =================================================================
  getTotalCases(): Promise<number>;                                  // Total antal sager
  getAlarmCases(): Promise<Case[]>;                                  // Hent sager i alarm (legacy)
  getCasesInAlarm(): Promise<Case[]>;                               // Hent sager i alarm (ny implementering)
  getStatusCounts(): Promise<Record<string, number>>;               // Antal sager per status
  deleteCustomer(id: number): Promise<void>;                        // Slet kunde
}

// =============================================================================
// DATABASE SESSION STORE KONFIGURATION
// =============================================================================
// PostgreSQL-baseret session store til Express sessions
const PostgresSessionStore = connectPg(session);

// =============================================================================
// HOVEDDATABASE STORAGE KLASSE
// =============================================================================
// Implementerer alle database operationer for SagsHub systemet
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;                               // Express session store
  dbConfig: any;                                             // Database konfiguration

  // =================================================================
  // KONSTRUKTOR
  // =================================================================
  // Initialiserer database forbindelse og session store
  constructor() {
    // Database konfiguration fra miljøvariabler
    const dbConfig = {
      user: process.env.DB_USER || 'postgres',              // Database bruger
      host: process.env.DB_HOST || 'localhost',             // Database host
      database: process.env.DB_NAME || 'sagshub',            // Database navn
      password: process.env.DB_PASSWORD || 'wa2657321',       // Database password
      port: parseInt(process.env.DB_PORT || '5432'),          // Database port
    };
    this.dbConfig = dbConfig;
    
    // Konfigurerer PostgreSQL session store til Express
    this.sessionStore = new PostgresSessionStore({
      conObject: dbConfig,                                   // Database forbindelseskonfiguration
      createTableIfMissing: true,                           // Opret session tabel automatisk hvis den mangler
    });
    
    // Logger database konfiguration ved opstart (for debugging)
    console.log('Forbinder til database:', dbConfig);
  }

  // =================================================================
  // BRUGER OPERATIONER
  // =================================================================
  
  // Henter enkelt bruger baseret på bruger ID
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)); // SELECT * FROM users WHERE id = ?
    return user;
  }

  // Henter bruger baseret på brugernavn (til login)
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username)); // SELECT * FROM users WHERE username = ?
    return user;
  }

  // Opretter ny bruger i systemet
  async createUser(userData: Omit<User, "id">): Promise<User> {
    const [user] = await db
      .insert(users)                                         // INSERT INTO users
      .values(userData)                                      // VALUES (bruger data)
      .returning();                                          // RETURNING * (PostgreSQL specifik)
    return user;
  }

  // Henter alle brugere (til administration)
  async getUsers(): Promise<User[]> {
    return db.select().from(users);                          // SELECT * FROM users
  }

  // =================================================================
  // KUNDE OPERATIONER
  // =================================================================
  
  // Henter alle kunder
  async getCustomers(): Promise<Customer[]> {
    return db.select().from(customers);                      // SELECT * FROM customers
  }

  // Henter specifik kunde baseret på ID
  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id)); // SELECT * FROM customers WHERE id = ?
    return customer;
  }

  // Opretter ny kunde med automatiske timestamps
  async createCustomer(customerData: Omit<Customer, "id" | "createdAt" | "updatedAt">): Promise<Customer> {
    const [customer] = await db
      .insert(customers)                                     // INSERT INTO customers
      .values({
        ...customerData,                                     // Alle kunde data
        createdAt: new Date(),                               // Automatisk created timestamp
        updatedAt: new Date(),                               // Automatisk updated timestamp
      })
      .returning();                                          // RETURNING * (returnerer det nye record)
    return customer;
  }

  // Opdaterer eksisterende kunde
  async updateCustomer(
    id: number,
    customerData: Partial<Omit<Customer, "id" | "createdAt" | "updatedAt">>
  ): Promise<Customer | undefined> {
    const [customer] = await db
      .update(customers)                                     // UPDATE customers
      .set({
        ...customerData,                                     // Kunde data der skal opdateres
        updatedAt: new Date(),                               // Opdaterer timestamp automatisk
      })
      .where(eq(customers.id, id))                          // WHERE id = ?
      .returning();                                          // RETURNING * (returnerer det opdaterede record)
    return customer;
  }

  // Søger kunder baseret på navn, telefon eller email
  async searchCustomers(searchTerm: string): Promise<Customer[]> {
    if (!searchTerm?.trim()) {                               // Returnerer tom array hvis ingen søgeterm
      return [];
    }

    try {
      const searchTermTrimmed = searchTerm.trim();           // Fjerner whitespace fra søgeterm
      console.log('Søger efter kunder med term:', searchTermTrimmed);
      
      // Bruger raw SQL for bedre søgefunktionalitet med ILIKE (case insensitive)
      let query = `
        SELECT id, name, phone, email, address, city, postal_code, notes, created_at, updated_at
        FROM customers 
        WHERE (
          name ILIKE '%${searchTermTrimmed}%' OR           -- Søger i navn (case insensitive)
          phone ILIKE '%${searchTermTrimmed}%' OR          -- Søger i telefonnummer
          email ILIKE '%${searchTermTrimmed}%'             -- Søger i email
        )
      `;
      
      // Tilføjer ID søgning hvis søgetermen er et nummer
      if (/^\d+$/.test(searchTermTrimmed)) {
        query += ` OR id = ${Number(searchTermTrimmed)}`;    // Direkte ID match
      }
      
      query += ` ORDER BY name LIMIT 10`;                   // Sorterer alfabetisk og begrænser til 10 resultater
      
      console.log('Executing customer search query:', query);
      const result = await db.execute(sql([query]));        // Udfører raw SQL query
      
      // Mapper database resultater til Customer objekter
      const customers = result.rows.map((row: any) => ({
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
    } catch (error) {
      console.error('Fejl ved kundesøgning:', error);
      return [];
    }
  }

  // =================================================================
  // SAG OPERATIONER
  // =================================================================
  
  // Henter alle sager med kunde information (joinede data)
  async getCases(customerId?: number): Promise<CaseWithCustomer[]> {
    try {
      // Bygger query med joins til customer og user tabeller
      const query = db
        .select({
          id: cases.id,                                      // Sag ID
          caseNumber: cases.caseNumber,                      // Sagsnummer (f.eks. SAG-2025-001)
          customerId: cases.customerId,                      // Kunde ID reference
          customerName: customers.name,                      // Joinede kunde navn
          title: cases.title,                                // Sag titel
          description: cases.description,                    // Sag beskrivelse
          treatment: cases.treatment,                        // Behandlingstype (reparation, garanti, etc.)
          priority: cases.priority,                          // Prioritet (lav, normal, høj)
          deviceType: cases.deviceType,                      // Enhedstype (computer, telefon, etc.)
          accessories: cases.accessories,                    // Tilbehør
          importantNotes: cases.importantNotes,              // Vigtige noter
          loginInfo: cases.loginInfo,                        // Login informationer
          purchasedHere: cases.purchasedHere,                // Købt her (boolean)
          purchaseDate: cases.purchaseDate,                  // Købsdato
          status: cases.status,                              // Sag status
          createdAt: cases.createdAt,                        // Oprettelsesdato
          updatedAt: cases.updatedAt,                        // Sidste opdatering
          createdBy: users.name,                             // Joinede bruger navn (hvem oprettede sagen)
        })
        .from(cases)                                         // Hovedtabel: cases
        .leftJoin(customers, eq(cases.customerId, customers.id)) // LEFT JOIN customers for kunde info
        .leftJoin(users, eq(cases.createdBy, users.id))     // LEFT JOIN users for bruger info
        .orderBy(desc(cases.createdAt));                    // Sorterer efter nyeste først

      // Tilføjer filter hvis der skal vises sager for specifik kunde
      if (customerId) {
        query.where(eq(cases.customerId, customerId));      // WHERE customer_id = ?
      }

      const result = await query;                            // Udfører query

      // Mapper resultater og sikrer fallback værdier
      return result.map(row => ({
        ...row,
        customerName: row.customerName || `Kunde #${row.customerId}`, // Fallback hvis kunde navn mangler
        createdBy: row.createdBy || "System",               // Fallback hvis bruger navn mangler
      }));
    } catch (error) {
      console.error("Error in getCases:", error);
      return [];                                             // Returnerer tom array ved fejl
    }
  }

  // Henter specifik sag baseret på sagsnummer (string)
  async getCaseByNumber(caseNumber: string): Promise<Case | undefined> {
    try {
      const [case_] = await db
        .select()
        .from(cases)
        .where(eq(cases.caseNumber, caseNumber));
      return case_;
    } catch (error) {
      console.error("Error finding case by number:", error);
      return undefined;
    }
  }

  async getCase(idOrNumber: number | string): Promise<Case | undefined> {
    try {
      let query = db
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
          loginInfo: cases.loginInfo,
          purchasedHere: cases.purchasedHere,
          purchaseDate: cases.purchaseDate,
          status: cases.status,
          createdAt: cases.createdAt,
          updatedAt: cases.updatedAt,
          createdBy: cases.createdBy,
          customerName: customers.name,
          customerPhone: customers.phone,
          customerEmail: customers.email,
          customerAddress: customers.address,
        })
        .from(cases)
        .leftJoin(customers, eq(cases.customerId, customers.id));

      if (typeof idOrNumber === 'string') {
        query = query.where(eq(cases.caseNumber, idOrNumber.toUpperCase()));
      } else {
        query = query.where(eq(cases.id, idOrNumber));
      }

      const [row] = await query;
      if (!row) return undefined;

      // Hent medarbejdernavn fra initial status history (sag oprettet)
      let createdByName = null;
      try {
        const initialStatusHistory = await db
          .select({
            createdByName: statusHistory.createdByName,
            userName: users.name,
          })
          .from(statusHistory)
          .leftJoin(users, eq(statusHistory.createdBy, users.id))
          .where(
            and(
              eq(statusHistory.caseId, row.id),
              eq(statusHistory.comment, 'Sag oprettet')
            )
          )
          .orderBy(asc(statusHistory.createdAt))
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
      } catch (error) {
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
    } catch (error) {
      console.error("Error in getCase:", error);
      return undefined;
    }
  }

  async createCase(caseData: Omit<Case, "id" | "createdAt" | "updatedAt"> & { createdByName?: string }): Promise<Case> {
    try {
      console.log('Creating case with data:', JSON.stringify(caseData, null, 2));
      
      // Use raw SQL instead of Drizzle ORM to avoid schema issues
      const result = await db.execute(sql`
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
      let createdByName: string;
      if (caseData.createdByName && caseData.createdByName.trim()) {
        createdByName = caseData.createdByName.trim();
      } else {
        const user = await this.getUser(caseData.createdBy);
        createdByName = user?.name || 'System';
      }

      await db.insert(statusHistory).values({
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
      } catch (error) {
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
    } catch (error) {
      console.error('Error in createCase:', error);
      throw error;
    }
  }

  async updateCaseStatus(id: number, status: string): Promise<Case> {
    const [case_] = await db
      .update(cases)
      .set({ status, updatedAt: new Date() })
      .where(eq(cases.id, id))
      .returning();
    return case_;
  }

  async getLatestCaseNumber(prefix: string): Promise<Case[]> {
    const result = await db
      .select()
      .from(cases)
      .where(sql`substring(${cases.caseNumber} from 1 for ${prefix.length}) = ${prefix}`)
      .orderBy(desc(cases.caseNumber))
      .limit(1);
    
    console.log(`getLatestCaseNumber for prefix ${prefix} returned:`, result);
    return result;
  }

  async getCaseStatusHistory(caseId: number): Promise<ExtendedStatusHistory[]> {
    try {
      // JOIN users for fallback-navn
      const history = await db
        .select({
          id: statusHistory.id,
          caseId: statusHistory.caseId,
          status: statusHistory.status,
          comment: statusHistory.comment,
          createdAt: statusHistory.createdAt,
          createdBy: statusHistory.createdBy,
          createdByName: statusHistory.createdByName,
          userName: users.name,
        })
        .from(statusHistory)
        .leftJoin(users, eq(statusHistory.createdBy, users.id))
        .where(eq(statusHistory.caseId, caseId))
        .orderBy(desc(statusHistory.createdAt));

      return history.map(record => {
        // Brug createdByName hvis sat, ellers brug userName
        const out = { ...record, createdByName: record.createdByName || record.userName || "System" };
        console.log('StatusHistory RETURNERES:', out);
        return out;
      });
    } catch (error) {
      console.error("Fejl i getCaseStatusHistory:", error);
      return [];
    }
  }

  async updateCaseStatusWithHistory(
    caseId: number,
    status: string,
    comment: string,
    userId: number,
    updatedByName?: string
  ): Promise<Case> {
    // Opdater sag status
    const now = new Date();
    const updateData: any = {
      status,
      updatedAt: now,
    };
    
    // Slet loginInfo når sag afsluttes
    if (status === 'completed') {
      updateData.loginInfo = null;
    }

    console.log('[updateCaseStatusWithHistory] Opdaterer sag', caseId, 'til status', status, 'updatedAt:', now.toISOString());
    console.log('[updateCaseStatusWithHistory] updateData:', updateData);

    const [updatedCase] = await db
      .update(cases)
      .set(updateData)
      .where(eq(cases.id, caseId))
      .returning();
    console.log('Case updated with status:', status, 'updatedAt:', now);
    console.log('Updated case result:', { id: updatedCase.id, status: updatedCase.status, updatedAt: updatedCase.updatedAt });

    // Brug det angivne medarbejdernavn hvis det findes, ellers hent brugerens navn
    let createdByName: string;
    if (updatedByName && updatedByName.trim()) {
      createdByName = updatedByName.trim();
    } else {
      const user = await this.getUser(userId);
      createdByName = user?.name || 'System';
    }

    await db.insert(statusHistory).values({
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

  async searchCases(searchTerm: string): Promise<CaseWithCustomer[]> {
    if (!searchTerm?.trim()) {
      return [];
    }

    const searchTermTrimmed = searchTerm.trim();
    const searchPattern = `%${searchTermTrimmed}%`;
    const numericId = parseInt(searchTermTrimmed);

    const conditions = [
      like(cases.caseNumber, searchPattern),
      like(cases.title, searchPattern),
      like(cases.description, searchPattern),
      like(customers.name, searchPattern)
    ];

    // Kun tilføj ID søgning hvis det er et gyldigt nummer
    if (!isNaN(numericId)) {
      conditions.push(eq(cases.id, numericId));
    }

    return db.select({
      ...cases,
      customerName: customers.name
    })
      .from(cases)
      .leftJoin(customers, eq(cases.customerId, customers.id))
      .where(or(...conditions))
      .limit(10);
  }

  async getRMAs(): Promise<RMA[]> {
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

  async getRMA(id: number): Promise<RMA | undefined> {
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

  async createRMA(rmaData: Omit<RMA, "id" | "createdAt" | "updatedAt">): Promise<RMA> {
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
    } catch (error) {
      console.error("Error in createRMA:", error);
      throw error;
    }
  }

  async updateRMAStatus(id: number, status: string): Promise<RMA> {
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

  async getRMAStatusHistory(rmaId: number): Promise<ExtendedRMAStatusHistory[]> {
    try {
      // JOIN users for fallback-navn
      const history = await db
        .select({
          id: rmaStatusHistory.id,
          rmaId: rmaStatusHistory.rmaId,
          status: rmaStatusHistory.status,
          comment: rmaStatusHistory.comment,
          createdAt: rmaStatusHistory.createdAt,
          createdBy: rmaStatusHistory.createdBy,
          createdByName: rmaStatusHistory.createdByName,
          userName: users.name,
        })
        .from(rmaStatusHistory)
        .leftJoin(users, eq(rmaStatusHistory.createdBy, users.id))
        .where(eq(rmaStatusHistory.rmaId, rmaId))
        .orderBy(desc(rmaStatusHistory.createdAt));

      return history.map(record => {
        // Brug createdByName hvis sat, ellers brug userName
        const out = { ...record, createdByName: record.createdByName || record.userName || "System" };
        console.log('RMA StatusHistory RETURNERES:', out);
        return out;
      });
    } catch (error) {
      console.error("Error in getRMAStatusHistory:", error);
      return [];
    }
  }

  async updateRMAStatusWithHistory(
    rmaId: number,
    status: string,
    comment: string,
    userId: number,
    updatedByName?: string
  ): Promise<RMA> {
    const [updatedRMA] = await db
      .update(rma)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(rma.id, rmaId))
      .returning();

    // Brug det angivne medarbejdernavn hvis det findes, ellers hent brugerens navn
    let createdByName: string;
    if (updatedByName && updatedByName.trim()) {
      createdByName = updatedByName.trim();
    } else {
      const user = await this.getUser(userId);
      createdByName = user?.name || 'System';
    }

    await db.insert(rmaStatusHistory).values({
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

  async updateRMA(
    id: number,
    rmaData: Partial<Omit<RMA, "id" | "createdAt" | "updatedAt">>
  ): Promise<RMA> {
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

  async updateCase(
    id: number,
    caseData: Partial<Omit<Case, "id" | "createdAt" | "updatedAt">>
  ): Promise<Case | undefined> {
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
      delete cleanedData.createdByName;

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
    } catch (error) {
      console.error('Fejl i updateCase:', error);
      throw new Error('Der opstod en fejl ved opdatering af sagen');
    }
  }

  async getPaginatedCases(options: GetPaginatedCasesOptions): Promise<PaginatedResponse<CaseWithCustomer>> {
    const { page, pageSize, searchTerm, treatment, priority, status, sort, customerId, isWorker, includeCompleted } = options;
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
      } else if (!includeCompleted) {
        // Skjul afsluttede sager som standard, medmindre der specifikt søges efter dem
        // eller includeCompleted er sat til true (for statistikker)
        whereConditions.push(`c.status != 'completed'`);
      }

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
      
      const countResult = await db.execute(sql([countQuery]));
      const count = countResult.rows[0]?.count || 0;

      // Get status counts (cached for better performance)
      const statusCountsQuery = `
        SELECT status, COUNT(*)::int as count
        FROM cases
        WHERE status != 'completed'
        GROUP BY status
      `;
      
      const statusCountsResult = await db.execute(sql([statusCountsQuery]));
      const statusCountsMap = statusCountsResult.rows.reduce((acc: Record<string, number>, row: any) => {
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
      
      const alarmResult = await db.execute(sql([alarmCountQuery]));
      const alarmCount = alarmResult.rows[0]?.count || 0;

      // Build sort clause
      let sortClause = 'ORDER BY c.updated_at DESC';
      if (sort) {
        if (sort === 'newest') {
          sortClause = 'ORDER BY c.created_at DESC';
        } else if (sort === 'oldest') {
          sortClause = 'ORDER BY c.created_at ASC';
        } else if (sort === 'default') {
          sortClause = 'ORDER BY c.updated_at DESC';
        } else {
          // Fallback for old format (field:direction)
          const [field, direction] = sort.split(':');
          if (field === 'createdAt') {
            sortClause = `ORDER BY c.created_at ${direction === 'desc' ? 'DESC' : 'ASC'}`;
          } else if (field === 'updatedAt') {
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

      const casesResult = await db.execute(sql([casesQuery]));
      const items = casesResult.rows.map((row: any) => ({
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
    } catch (error) {
      console.error('Error in getPaginatedCases:', error);
      throw error;
    }
  }

  async getPaginatedCustomers(page: number, pageSize: number, searchTerm?: string): Promise<PaginatedResponse<Customer>> {
    try {
      console.log('Søger efter kunder med term:', searchTerm);
      const offset = (page - 1) * pageSize;

      // Build base query using raw SQL like searchCustomers
      let countQuery = 'SELECT COUNT(*)::int AS count FROM customers';
      let dataQuery = `
        SELECT id, name, phone, email, address, city, postal_code, notes, created_at, updated_at
        FROM customers
      `;
      
      // Add search conditions if searchTerm is provided
      if (searchTerm?.trim()) {
        const searchPattern = searchTerm.trim();
        console.log('Search pattern:', searchPattern);
        
        let whereClause = `
          WHERE (
            name ILIKE '%${searchPattern}%' OR
            phone ILIKE '%${searchPattern}%' OR
            email ILIKE '%${searchPattern}%' OR
            address ILIKE '%${searchPattern}%' OR
            city ILIKE '%${searchPattern}%'
        `;
        
        // Add ID search if it's a number
        if (/^\d+$/.test(searchPattern)) {
          whereClause += ` OR id = ${Number(searchPattern)}`;
        }
        
        whereClause += ')';
        
        countQuery += whereClause;
        dataQuery += whereClause;
        console.log('Added search conditions for term:', searchPattern);
      }

      console.log('Executing count query:', countQuery);
      const countResult = await db.execute(sql([countQuery]));
      const count = countResult.rows?.[0]?.count || 0;
      console.log('Count result:', count);
      
      // Add ordering and pagination to data query
      dataQuery += ` ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      
      console.log('Executing data query:', dataQuery);
      const result = await db.execute(sql([dataQuery]));
      const items = result.rows?.map((row: any) => ({
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
      })) || [];

      console.log('Fandt', items.length, 'kunder');
      console.log('First few results:', items.slice(0, 2).map(c => ({ id: c.id, name: c.name, phone: c.phone })));
      
      const totalPages = Math.ceil(count / pageSize);
      
      return {
        items,
        total: count,
        page,
        pageSize,
        totalPages,
      };
    } catch (error) {
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

  async getPaginatedRMAs(options: GetPaginatedRMAsOptions): Promise<PaginatedResponse<RMA>> {
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
    } catch (error) {
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

  async getRMAsByCustomerId(customerId: number): Promise<RMA[]> {
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
    } catch (error) {
      console.error("Error in getRMAsByCustomerId:", error);
      return [];
    }
  }

  async getOrders(): Promise<Order[]> {
    const ordersData = await db.select().from(orders);
    return ordersData;
  }

  async getOrder(id: number): Promise<(OrderWithCustomer & { 
    customer?: { name: string; phone: string; email: string | null };
    createdByUser?: { name: string };
    case?: { caseNumber: string; description: string };
    rmaCase?: { rmaNumber: string; description: string };
  }) | undefined> {
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
      
      if (!orderWithCustomer) return undefined;

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
    } catch (error) {
      console.error("Error fetching order details:", error);
      return undefined;
    }
  }

  async getLatestOrderNumber(): Promise<Order | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.orderNumber))
      .limit(1);
    return order;
  }

  async createOrder(orderData: InsertOrder): Promise<Order> {
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

  async updateOrderStatus(id: number, status: string): Promise<Order> {
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

  async updateOrder(
    id: number,
    orderData: Partial<Omit<Order, "id" | "createdAt" | "updatedAt">>
  ): Promise<Order> {
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

  async getPaginatedOrders(options: GetPaginatedOrdersOptions): Promise<PaginatedResponse<OrderWithCustomer>> {
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
    } else if (sort === "createdAt") {
      orderBy = asc(orders.createdAt);
    } else if (sort === "-orderDate") {
      orderBy = desc(orders.orderDate);
    } else if (sort === "orderDate") {
      orderBy = asc(orders.orderDate);
    } else {
      orderBy = desc(orders.createdAt);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(whereClause || sql`true`);

    // Get paginated results with customer name
    const items = await db
      .select({
        ...orders,
        customerName: customers.name
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(whereClause || sql`true`)
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

  async getOrdersByCustomerId(customerId: number): Promise<OrderWithCustomer[]> {
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

  async getOrdersByCaseId(caseId: number): Promise<OrderWithCustomer[]> {
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
  async createInternalCase(internalCaseData: InsertInternalCase): Promise<InternalCase> {
    const [internalCase] = await db
      .insert(internalCases)
      .values(internalCaseData)
      .returning();
    return internalCase;
  }

  async getInternalCase(id: number): Promise<InternalCaseWithDetails | undefined> {
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
        senderName: sql<string>`sender.name`.as('senderName'),
        receiverName: sql<string>`receiver.name`.as('receiverName'),
        customerName: customers.name,
      })
      .from(internalCases)
      .innerJoin(cases, eq(internalCases.caseId, cases.id))
      .innerJoin(customers, eq(cases.customerId, customers.id))
      .innerJoin(sql`users sender`, eq(internalCases.senderId, sql<number>`sender.id`))
      .innerJoin(sql`users receiver`, eq(internalCases.receiverId, sql<number>`receiver.id`))
      .where(eq(internalCases.id, id));

    if (result.length === 0) {
      return undefined;
    }
    
    return result[0] as InternalCaseWithDetails;
  }

  async getPaginatedInternalCases(options: GetPaginatedInternalCasesOptions): Promise<PaginatedResponse<InternalCaseWithDetails>> {
    const { page, pageSize, userId, onlySent, onlyReceived, onlyUnread } = options;
    const offset = (page - 1) * pageSize;

    // Build where conditions
    let whereConditions = sql`1=1`;
    
    if (onlySent && !onlyReceived) {
      whereConditions = sql`${whereConditions} AND ic.sender_id = ${userId}`;
    } else if (onlyReceived && !onlySent) {
      whereConditions = sql`${whereConditions} AND ic.receiver_id = ${userId}`;
    } else {
      // Default: both sent and received
      whereConditions = sql`${whereConditions} AND (ic.sender_id = ${userId} OR ic.receiver_id = ${userId})`;
    }

    if (onlyUnread) {
      whereConditions = sql`${whereConditions} AND ic.read = false AND ic.receiver_id = ${userId}`;
    }

    // Get total count
    const countResult = await db.execute(
      sql`SELECT COUNT(*)::int AS count FROM internal_cases ic WHERE ${whereConditions}`
    );
    const total = countResult.rows[0].count;

    // Get paginated results with details
    const query = sql`
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
    const items = result.rows as InternalCaseWithDetails[];

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async markInternalCaseAsRead(id: number): Promise<InternalCase | undefined> {
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

  async getUnreadInternalCasesCount(userId: number): Promise<number> {
    try {
      console.log(`Tæller ulæste interne sager for bruger ${userId}`);
      
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(internalCases)
        .where(and(
          eq(internalCases.receiverId, userId),
          eq(internalCases.read, false)
        ));
      
      const count = result[0]?.count || 0;
      console.log(`Antal ulæste sager: ${count}`);
      return count;
    } catch (error) {
      console.error(`Fejl ved tælling af ulæste interne sager: ${error}`);
      return 0;
    }
  }

  async searchRMAs(searchTerm: string): Promise<RMA[]> {
    if (!searchTerm?.trim()) {
      return [];
    }

    const searchTermTrimmed = searchTerm.trim();
    const searchPattern = `%${searchTermTrimmed}%`;
    const numericId = parseInt(searchTermTrimmed);

    const conditions = [
      like(rma.rmaNumber, searchPattern),
      like(rma.title, searchPattern),
      like(rma.description, searchPattern),
      like(customers.name, searchPattern)
    ];

    // Kun tilføj ID søgning hvis det er et gyldigt nummer
    if (!isNaN(numericId)) {
      conditions.push(eq(rma.id, numericId));
    }

    return db.select({
      ...rma,
      customerName: customers.name
    })
      .from(rma)
      .leftJoin(customers, eq(rma.customerId, customers.id))
      .where(or(...conditions))
      .limit(10);
  }

  async searchOrders(searchTerm: string): Promise<OrderWithCustomer[]> {
    if (!searchTerm?.trim()) {
      return [];
    }

    const searchTermTrimmed = searchTerm.trim();
    const searchPattern = `%${searchTermTrimmed}%`;

    return db.select({
      ...orders,
      customerName: customers.name
    })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(
        or(
          like(orders.orderNumber, searchPattern),
          like(customers.name, searchPattern)
        )
      )
      .limit(10);
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<User> {
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

  async updateUser(id: number, data: { username?: string; name?: string; isWorker?: boolean; isAdmin?: boolean; birthday?: Date | null; password?: string }) {
    // Fjern undefined værdier
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );
    
    const result = await db
      .update(users)
      .set(cleanData)
      .where(eq(users.id, id))
      .returning();
    
    return result[0];
  }

  async deleteUser(id: number) {
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
          .where(or(
            eq(internalCases.senderId, id),
            eq(internalCases.receiverId, id)
          ))
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
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw error;
    }
  }

  async getTotalCases(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(cases)
      .where(sql`1 = 1`);
    
    return result[0].count;
  }

  async getAlarmCases(): Promise<Case[]> {
    try {
      console.log('getAlarmCases called - using optimized SQL query');
      
      // Optimeret SQL query der følger den korrekte alarm logik fra shared/alarm.ts
      const alarmCasesQuery = sql`
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
      
      const result = await db.execute(alarmCasesQuery);
      const alarmCases = result.rows.map((row: any) => ({
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
    } catch (error) {
      console.error('Error getting alarm cases:', error);
      // Fallback til den gamle metode hvis SQL fejler
      console.log('Falling back to old method...');
      return this.getAlarmCasesLegacy();
    }
  }

  // Behold den gamle metode som fallback
  private async getAlarmCasesLegacy(): Promise<Case[]> {
    try {
      const allCases = await db.select().from(cases).where(ne(cases.status, 'completed')).limit(100);
      console.log('Legacy method - antal sager hentet:', allCases.length);
      const alarmCases: Case[] = [];
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
        if (isCaseInAlarm(cleanCase, statusHistory)) {
          alarmCases.push(cleanCase);
        }
      }
      console.log('Legacy method - antal alarm-sager fundet:', alarmCases.length);
      return alarmCases;
    } catch (error) {
      console.error('Error in legacy alarm cases method:', error);
      return [];
    }
  }

  async getCasesInAlarm(): Promise<Case[]> {
    try {
      const allCases = await db.select().from(cases);
      const casesWithHistory = await Promise.all(
        allCases.map(async (caseItem) => {
          const history = await this.getCaseStatusHistory(caseItem.id);
          return {
            ...caseItem,
            statusHistory: history
          };
        })
      );
      
      return casesWithHistory.filter(caseItem => 
        this.isCaseInAlarm(caseItem, caseItem.statusHistory)
      );
    } catch (error) {
      console.error('Fejl ved hentning af alarm-sager:', error);
      throw error;
    }
  }

  async getStatusCounts(): Promise<Record<string, number>> {
    try {
      console.log('getStatusCounts called - starting query');
      
      // Returnér antal sager pr. status undtagen 'completed'
      const statusCounts = await db
        .select({
          status: cases.status,
          count: sql<number>`count(*)`,
        })
        .from(cases)
        .where(ne(cases.status, 'completed'))
        .groupBy(cases.status);
      
      console.log('Raw status counts from database:', statusCounts);
      
      const result = statusCounts.reduce((acc, { status, count }) => {
        acc[status] = Number(count);
        return acc;
      }, {} as Record<string, number>);
      
      console.log('getStatusCounts final result:', result);
      return result;
    } catch (error) {
      console.error('Error in getStatusCounts:', error);
      return {};
    }
  }

  async deleteCustomer(id: number): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  // Customer authentication methods
  async getCustomerUser(customerId: number): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.customerId, customerId), eq(users.isCustomer, true)))
        .limit(1);
      return user;
    } catch (error) {
      console.error('Error getting customer user:', error);
      return undefined;
    }
  }

  async createCustomerUser(customer: Customer, caseNumber: string): Promise<User> {
    try {
      // Username er telefonnummer, password er sagsnummer (hashed)
      const hashedPassword = await import('./auth.js').then(auth => auth.hashPassword(caseNumber));
      
      const [user] = await db
        .insert(users)
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
    } catch (error) {
      console.error('Error creating customer user:', error);
      throw error;
    }
  }

  async createOrUpdateCustomerUsers(): Promise<void> {
    try {
      console.log('Starting customer user creation/update process...');
      
      // Hent alle kunder
      const allCustomers = await this.getCustomers();
      
      for (const customer of allCustomers) {
        // Find første sag for denne kunde
        const customerCases = await db
          .select()
          .from(cases)
          .where(eq(cases.customerId, customer.id))
          .orderBy(asc(cases.createdAt))
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
        } else {
          console.log(`Kunde ${customer.name} har allerede en bruger`);
        }
      }
      
      console.log('Customer user creation/update process completed');
    } catch (error) {
      console.error('Error in createOrUpdateCustomerUsers:', error);
      throw error;
    }
  }
}

// Helper function for generating RMA numbers
async function generateRMANumber(): Promise<string> {
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
export async function generateOrderNumber(): Promise<string> {
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
  } catch (error) {
    console.error("Error generating order number:", error);
    throw new Error("Der opstod en fejl ved generering af ordrenummer");
  }
}

export const storage = new DatabaseStorage();



