import { db } from "./db";
import { eq, desc, asc, and, or, like, ilike, sql, ne } from "drizzle-orm";
import type {
  User,
  Customer,
  Case,
  StatusHistory,
  RMA,
  RMAStatusHistory,
  Order,
  InsertOrder,
  InternalCase,
  InsertInternalCase,
  InternalCaseWithDetails
} from "../shared/schema";
import { 
  users, 
  customers, 
  cases, 
  rma, 
  orders, 
  internalCases, 
  statusHistory, 
  rmaStatusHistory,
  CaseStatus,
  TreatmentType,
  PriorityType,
  DeviceType,
  OrderStatus,
  RMAStatus
} from "../shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { isCaseInAlarm } from "../shared/alarm";

// Helper-funktion til at beregne antal hverdage mellem to datoer
function getBusinessDaysDifference(startDate: Date, endDate: Date): number {
  let count = 0;
  let current = new Date(startDate);
  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++; // 0 = søndag, 6 = lørdag
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// Base interfaces for extended types
export interface ExtendedStatusHistory extends Omit<StatusHistory, "createdBy"> {
  createdBy: number;
  createdByName: string | null;
}

export interface ExtendedRMAStatusHistory extends Omit<RMAStatusHistory, "createdBy"> {
  createdBy: number;
  createdByName: string | null;
}

// Interface for cases with customer info
export interface CaseWithCustomer extends Omit<Case, "createdBy"> {
  customerName: string;
  createdBy: string | null;
}

// Add these interfaces at the top with the other interfaces
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statusCounts?: Record<string, number>;
}

export interface GetPaginatedCasesOptions {
  page: number;
  pageSize: number;
  searchTerm?: string;
  treatment?: string;
  priority?: string;
  sort?: string;
  customerId?: number;
  isWorker: boolean;
  status?: string;
  excludeStatus?: string;
  includeCompleted?: boolean;
}

// Tilføj RMA interface til paginerede forespørgsler
export interface GetPaginatedRMAsOptions {
  page: number;
  pageSize: number;
  searchTerm?: string;
  status?: string;
  sort?: 'newest' | 'oldest' | 'default';
}

// Tilføj interface til interne sager
export interface GetPaginatedInternalCasesOptions {
  page: number;
  pageSize: number;
  userId: number;
  onlySent?: boolean;
  onlyReceived?: boolean;
  onlyUnread?: boolean;
}

// Tilføj interface til at hente paginerede bestillinger
export interface GetPaginatedOrdersOptions {
  page: number;
  pageSize: number;
  searchTerm?: string;
  status?: string;
  sort?: string;
  customerId?: number;
}

// Type for order med kundenavn
export type OrderWithCustomer = Order & { customerName?: string };

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(userData: Omit<User, "id">): Promise<User>;
  getUsers(): Promise<User[]>;
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: Omit<Customer, "id" | "createdAt" | "updatedAt">): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<Omit<Customer, "id" | "createdAt" | "updatedAt">>): Promise<Customer | undefined>;
  searchCustomers(searchTerm: string): Promise<Customer[]>;
  getCases(customerId?: number): Promise<CaseWithCustomer[]>;
  getCase(id: number): Promise<Case | undefined>;
  createCase(caseData: Omit<Case, "id" | "createdAt" | "updatedAt"> & { createdByName?: string }): Promise<Case>;
  updateCaseStatus(id: number, status: string): Promise<Case>;
  getLatestCaseNumber(prefix: string): Promise<Case[]>;
  searchCases(searchTerm: string): Promise<CaseWithCustomer[]>;
  sessionStore: session.Store;
  getCaseStatusHistory(caseId: number): Promise<ExtendedStatusHistory[]>;
  updateCaseStatusWithHistory(caseId: number, status: string, comment: string, userId: number, updatedByName?: string): Promise<Case>;
  getRMAs(): Promise<RMA[]>;
  getRMA(id: number): Promise<RMA | undefined>;
  createRMA(rmaData: Omit<RMA, "id" | "createdAt" | "updatedAt">): Promise<RMA>;
  updateRMAStatus(id: number, status: string): Promise<RMA>;
  getRMAStatusHistory(rmaId: number): Promise<ExtendedRMAStatusHistory[]>;
  updateRMAStatusWithHistory(rmaId: number, status: string, comment: string, userId: number, updatedByName?: string): Promise<RMA>;
  updateCase(id: number, caseData: Partial<Omit<Case, "id" | "createdAt" | "updatedAt">>): Promise<Case | undefined>;
  updateRMA(id: number, rmaData: Partial<Omit<RMA, "id" | "createdAt" | "updatedAt">>): Promise<RMA>;
  // Add these new methods
  getPaginatedCases(options: GetPaginatedCasesOptions): Promise<PaginatedResponse<CaseWithCustomer>>;
  getPaginatedCustomers(page: number, pageSize: number, searchTerm?: string): Promise<PaginatedResponse<Customer>>;
  getPaginatedRMAs(options: GetPaginatedRMAsOptions): Promise<PaginatedResponse<RMA>>;
  getRMAsByCustomerId(customerId: number): Promise<RMA[]>;
  // Interne sager methods
  createInternalCase(internalCaseData: InsertInternalCase): Promise<InternalCase>;
  getInternalCase(id: number): Promise<InternalCaseWithDetails | undefined>;
  getPaginatedInternalCases(options: GetPaginatedInternalCasesOptions): Promise<PaginatedResponse<InternalCaseWithDetails>>;
  markInternalCaseAsRead(id: number): Promise<InternalCase | undefined>;
  getUnreadInternalCasesCount(userId: number): Promise<number>;
  // Bestilling methods
  getOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<(OrderWithCustomer & { 
    customer?: { name: string; phone: string; email: string | null };
    createdByUser?: { name: string };
    case?: { caseNumber: string; description: string };
    rmaCase?: { rmaNumber: string; description: string };
  }) | undefined>;
  getLatestOrderNumber(): Promise<Order | undefined>;
  createOrder(orderData: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order>;
  updateOrder(id: number, orderData: Partial<Omit<Order, "id" | "createdAt" | "updatedAt">>): Promise<Order>;
  getPaginatedOrders(options: GetPaginatedOrdersOptions): Promise<PaginatedResponse<OrderWithCustomer>>;
  getOrdersByCustomerId(customerId: number): Promise<OrderWithCustomer[]>;
  getOrdersByCaseId(caseId: number): Promise<OrderWithCustomer[]>;
  searchRMAs(searchTerm: string): Promise<RMA[]>;
  searchOrders(searchTerm: string): Promise<OrderWithCustomer[]>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<User>;
  updateUser(id: number, data: { username?: string; name?: string; isWorker?: boolean; isAdmin?: boolean; birthday?: Date | null; password?: string }): Promise<User>;
  deleteUser(id: number): Promise<void>;
  // Customer authentication methods
  getCustomerUser(customerId: number): Promise<User | undefined>;
  createCustomerUser(customer: Customer, caseNumber: string): Promise<User>;
  createOrUpdateCustomerUsers(): Promise<void>;
  getCaseByNumber(caseNumber: string): Promise<Case | undefined>;
  getTotalCases(): Promise<number>;
  getAlarmCases(): Promise<Case[]>;
  getCasesInAlarm(): Promise<Case[]>;
  getStatusCounts(): Promise<Record<string, number>>;
  deleteCustomer(id: number): Promise<void>;
}

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  dbConfig: any;

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

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: Omit<User, "id">): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getCustomers(): Promise<Customer[]> {
    return db.select().from(customers);
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customerData: Omit<Customer, "id" | "createdAt" | "updatedAt">): Promise<Customer> {
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

  async updateCustomer(
    id: number,
    customerData: Partial<Omit<Customer, "id" | "createdAt" | "updatedAt">>
  ): Promise<Customer | undefined> {
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

  async searchCustomers(searchTerm: string): Promise<Customer[]> {
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
      const result = await db.execute(sql([query]));
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

  async getCases(customerId?: number): Promise<CaseWithCustomer[]> {
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
          loginInfo: cases.loginInfo,
          purchasedHere: cases.purchasedHere,
          purchaseDate: cases.purchaseDate,
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
    } catch (error) {
      console.error("Error in getCases:", error);
      return [];
    }
  }

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

      // Build base query
      let query = db
        .select()
        .from(customers);

      let countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(customers);

      // Add search conditions if searchTerm is provided
      if (searchTerm?.trim()) {
        const searchPattern = `%${searchTerm.trim()}%`;
        const searchConditions = [
          like(customers.name, searchPattern),
          like(customers.phone, searchPattern),
          like(customers.email, searchPattern),
          like(customers.address, searchPattern),
          like(customers.city, searchPattern),
        ];
        
        // Add ID search if it's a number
        if (/^\d+$/.test(searchTerm.trim())) {
          searchConditions.push(eq(customers.id, Number(searchTerm.trim())));
        }

        const whereCondition = or(...searchConditions);
        query = query.where(whereCondition);
        countQuery = countQuery.where(whereCondition);
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



