// =============================================================================
// SAGSHUB SERVER ROUTING KONFIGURATION
// =============================================================================
// Denne fil implementerer alle HTTP routes for SagsHub backend serveren og indeholder:
// - Authentication og sikkerhedsmiddleware
// - RESTful API endpoints til alle funktionaliteter
// - Kunde, sag, RMA og ordre management routes
// - Interne beskeder og brugeradministration
// - Automatisk nummer generering til sager, RMA'er og ordrer
// - Real-time opdateringer via WebSocket broadcasting
// =============================================================================

// Import af Express types og HTTP server
import type { Express } from "express";                        // Express app type
import { createServer, type Server } from "http";             // HTTP server types

// Import af authentication og sikkerhedsfunktioner
import { setupAuth, hashPassword, setupInitialAdmin, migrateUserPasswords } from "./auth"; // Auth utilities

// Import af database storage layer
import { storage, generateOrderNumber } from "./storage";      // Database operations

// Import af schema og validation
import { insertCaseSchema, insertCustomerSchema, insertUserSchema, insertRMASchema, insertOrderSchema, OrderStatus, CaseStatus } from "../shared/schema";

// Import af Drizzle ORM operatorer
import { eq, like, desc, and } from 'drizzle-orm';             // Query operators

// Import af validation og utilities
import { z } from "zod";                                       // Schema validation
import { db } from "./db";                                     // Database forbindelse
import { users, internalCases } from "../shared/schema";       // Tabel definitioner
import bcrypt from "bcrypt";                                   // Password hashing
import { sql } from "drizzle-orm";                             // Raw SQL execution

// Import af oversættelsesfunktioner
import { findAndTranslateEnglishCases } from './translate';    // Case translation utility

// Import af Express og routing
import express from "express";                                 // Express framework
import { Router } from "express";                              // Express router

// Import af modulære routes og live updates
import { registerRoutes as registerAdditionalRoutes } from "./routes/index.js"; // Modulære routes
import { broadcastLiveUpdate, getRecentActivities } from "./index.js"; // Live update system

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Zod schema til validering af status opdateringer
const updateStatusSchema = z.object({
  status: z.enum([                                             // Godkendte status værdier
    'created',                                                 // Ny sag oprettet
    'in_progress',                                             // Under behandling
    'offer_created',                                           // Tilbud sendt
    'waiting_customer',                                        // Afventer kunde respons
    'offer_accepted',                                          // Tilbud accepteret
    'offer_rejected',                                          // Tilbud afvist
    'waiting_parts',                                           // Venter på reservedele
    'preparing_delivery',                                      // Forbereder udlevering
    'ready_for_pickup',                                        // Klar til afhentning
    'completed'                                                // Sag afsluttet
  ] as const),
  comment: z.string().min(1, "Kommentar er påkrævet"),        // Obligatorisk kommentar
  updatedByName: z.string().optional(),                       // Valgfri opdateret-af navn
});

// =============================================================================
// UTILITY FUNKTIONER
// =============================================================================

// Oversætter status keys til læsbare danske tekster
function translateStatus(status: string): string {
  const statusTranslations: Record<string, string> = {
    // Case status oversættelser
    'created': 'Oprettet',                                     // Ny sag
    'in_progress': 'Under behandling',                         // Arbejder på sagen
    'offer_created': 'Tilbud oprettet',                        // Tilbud sendt til kunde
    'waiting_customer': 'Afventer kunde',                      // Venter på kunde respons
    'offer_accepted': 'Tilbud accepteret',                     // Kunde sagde ja
    'offer_rejected': 'Tilbud afvist',                         // Kunde sagde nej
    'waiting_parts': 'Venter på dele',                         // Afventer reservedele
    'preparing_delivery': 'Klargør levering',                  // Pakker til kunde
    'ready_for_pickup': 'Klar til afhentning',                 // Kunde kan hente
    'completed': 'Afsluttet',                                  // Sag lukket
    
    // RMA status oversættelser
    'oprettet': 'Oprettet',                                    // Ny RMA
    'under_behandling': 'Under behandling',                    // RMA behandles
    'afsluttet': 'Afsluttet',                                  // RMA lukket
    
    // Order status oversættelser
    'pending': 'Afventer',                                     // Afventer behandling
    'ordered': 'Bestilt',                                      // Ordre afgivet
    'received': 'Modtaget',                                    // Varer modtaget
    'delivered': 'Leveret',                                    // Leveret til kunde
    'cancelled': 'Annulleret'                                  // Ordre annulleret
  };
  
  return statusTranslations[status] || status;                 // Fallback til original status
}

// Genererer automatiske sagsnumre baseret på behandlingstype
async function generateCaseNumber(treatment: string): Promise<string> {
  // Mapping af behandlingstyper til præfikser
  const prefix = {
    'repair': 'REP',                                           // Reparation
    'warranty': 'REK',                                         // Reklamation/garanti
    'setup': 'KLA',                                            // Klargøring/setup
    'other': 'AND',                                            // Andre opgaver
  }[treatment] || 'AND';                                       // Fallback til 'AND'

  try {
    console.log(`Generating case number for prefix: ${prefix}`);
    
    // Henter seneste sager med samme præfiks
    const cases = await storage.getLatestCaseNumber(prefix);
    console.log(`Latest cases for prefix ${prefix}:`, cases);
    
    let number = 1;                                            // Start nummer (hvis ingen eksisterende sager)

    if (cases && cases.length > 0) {
      const latestCase = cases[0];                             // Seneste sag
      console.log(`Latest case found: ${JSON.stringify(latestCase)}`);
      
      // Ekstraherer nummer fra sagsnummer (f.eks. REP00042 -> 42)
      const match = latestCase.caseNumber.match(/\d+/);
      if (match) {
        number = parseInt(match[0]) + 1;                       // Næste nummer i sekvens
        console.log(`Extracted number: ${match[0]}, Next number: ${number}`);
      }
    } else {
      console.log(`No cases found with prefix ${prefix}, starting with number 1`);
    }

    // Returnerer formateret sagsnummer (f.eks. REP00043)
    return `${prefix}${number.toString().padStart(5, '0')}`;   // Padding med nuller til 5 cifre
  } catch (error) {
    console.error("Error generating case number:", error);
    return `${prefix}00001`;                                   // Fallback ved fejl
  }
}

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

// Middleware til at verificere bruger authentication
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Tjekker om session eksisterer og indeholder bruger ID
  if (!req.session || !req.session.userId) {
    console.log('Ingen gyldig session fundet');
    return res.status(401).json({ error: 'Ikke autoriseret' }); // Returnerer 401 Unauthorized
  }
  
  // Tilføjer bruger info til request objektet
  req.user = { id: req.session.userId };
  console.log(`Bruger autentificeret med ID: ${req.session.userId}`);
  next();                                                      // Fortsætter til næste middleware/route
};

// =============================================================================
// HOVED ROUTING REGISTRERING FUNKTION
// =============================================================================

// Hovedfunktion der registrerer alle routes på Express app
export async function registerRoutes(app: Express): Promise<void> {
  // =================================================================
  // INITIAL SETUP OG AUTHENTICATION
  // =================================================================
  
  // Opsætter authentication middleware (sessions, passport, etc.)
  setupAuth(app);
  
  // Registrerer alle modulære routes fra separate filer
  await registerAdditionalRoutes(app);
  
  // =================================================================
  // DATABASE MIGRATIONS OG INITIAL DATA
  // =================================================================
  
  // Migrerer eksisterende passwords til sikker format (bcrypt)
  try {
    await migrateUserPasswords();                              // Konverterer gamle passwords
  } catch (error) {
    console.error('Failed to migrate passwords:', error);
  }
  
  // Opretter initial admin bruger hvis der ikke eksisterer nogen
  await setupInitialAdmin();

  // Opretter kunde-bruger konti for alle eksisterende kunder
  try {
    await storage.createOrUpdateCustomerUsers();              // Sikrer alle kunder har login adgang
  } catch (error) {
    console.error('Error creating customer users:', error);
  }

  // =================================================================
  // PUBLIC ENDPOINTS (INGEN AUTHENTICATION KRÆVET)
  // =================================================================
  
  // Health check endpoint - bruges til monitoring og load balancer checks
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok",                                            // Server status
      timestamp: new Date().toISOString()                     // Nuværende timestamp
    });
  });

  // HEAD variant af health check (returnerer kun status headers)
  app.head("/api/health", (req, res) => {
    res.status(200).send();                                    // Tom respons med 200 OK status
  });

  // =================================================================
  // INTERNE BESKEDER ENDPOINTS
  // =================================================================
  
  // Henter antal ulæste interne beskeder for bruger
  app.get("/api/internal-cases/unread-count", async (req, res) => {
    // Authentication check - kun autentificerede brugere
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Ikke autoriseret" });
    }

    try {
      const userId = req.user?.id;                             // Henter bruger ID fra session
      if (!userId) {
        return res.status(401).json({ error: "Ikke autoriseret" });
      }

      console.log('Getting unread count for user:', userId);
      
      try {
        // Kalder database for at få antal ulæste beskeder
        const count = await storage.getUnreadInternalCasesCount(userId);
        console.log('Unread count:', count);
        return res.json({ count });                            // Returnerer count som JSON
      } catch (error) {
        console.error("Database error getting unread count:", error);
        return res.status(500).json({ 
          error: "Database fejl", 
          count: 0                                             // Fallback til 0 ved database fejl
        });
      }
    } catch (error) {
      console.error("Error getting unread internal cases count:", error);
      res.status(500).json({ 
        error: "Der opstod en fejl ved hentning af antal ulæste interne sager" 
      });
    }
  });

  // =================================================================
  // KUNDE MANAGEMENT ENDPOINTS
  // =================================================================
  
  // Henter paginerede kunder (kun for medarbejdere)
  app.get("/api/customers", async (req, res) => {
    // Authorization check - kun medarbejdere kan se alle kunder
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);

    // Parsing af query parametre med defaults
    const page = parseInt(req.query.page as string) || 1;      // Side nummer (default: 1)
    const pageSize = parseInt(req.query.pageSize as string) || 6; // Items per side (default: 6)
    const searchTerm = req.query.search as string;             // Søgeterm (optional)

    console.log(`Customers endpoint called with: page=${page}, pageSize=${pageSize}, searchTerm="${searchTerm}"`);

    // Henter paginerede kunder fra database
    const customers = await storage.getPaginatedCustomers(page, pageSize, searchTerm);
    console.log(`Returning ${customers.items.length} customers out of ${customers.total} total`);
    
    res.json(customers);                                       // Returnerer paginerede resultater
  });

  // Søger i kunder baseret på søgeterm
  app.get("/api/customers/search", async (req, res) => {
    // Authorization check - kun medarbejdere
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);

    try {
      const searchTerm = req.query.q as string;                // Henter søgeterm fra query
      console.log("Received search request with term:", searchTerm);
      
      if (!searchTerm) {
        // Hvis ingen søgeterm, returnér alle kunder
        const allCustomers = await storage.getCustomers();
        return res.json(allCustomers);
      }

      // Udfører søgning i database
      const customers = await storage.searchCustomers(searchTerm);
      console.log("Found customers:", customers);
      res.json(customers);
    } catch (error) {
      console.error("Error searching customers:", error);
      res.status(500).json({ error: "Der opstod en fejl ved søgning efter kunder" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    const customer = await storage.getCustomer(parseInt(req.params.id));
    if (!customer) return res.sendStatus(404);
    res.json(customer);
  });

  app.post("/api/customers", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    const result = insertCustomerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json(result.error);
    }
    const customer = await storage.createCustomer(result.data);
    res.status(201).json(customer);
  });

  app.patch("/api/customers/:id", async (req, res) => {
    if (!req.isAuthenticated() || (!req.user.isWorker && !req.user.isAdmin)) return res.sendStatus(403);
    const result = insertCustomerSchema.partial().safeParse(req.body);
    if (!result.success) {
      return res.status(400).json(result.error);
    }
    const customer = await storage.updateCustomer(parseInt(req.params.id), result.data);
    if (!customer) return res.sendStatus(404);
    res.json(customer);
  });

  // New route to get customer's cases
  app.get("/api/customers/:id/cases", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      const customerId = parseInt(req.params.id);
      if (isNaN(customerId)) {
        return res.status(400).json({ error: "Ugyldigt kunde-ID" });
      }
      const cases = await storage.getCases(customerId);
      res.json(cases);
    } catch (error) {
      console.error("Error fetching customer cases:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af kundens sager" });
    }
  });

  // New route to get customer's RMA cases
  app.get("/api/customers/:id/rma", async (req, res) => {
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

  // Global search endpoint
  app.get("/api/search", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    
    try {
      const searchTerm = req.query.q as string;
      console.log("Global search request received with term:", searchTerm);
      
      if (!searchTerm?.trim()) {
        console.log("Global search: empty search term, returning empty array");
        return res.json([]);
      }

      console.log("Global search: performing parallel searches for:", searchTerm.trim());
      
      // Udfør alle søgninger parallelt
      const [customers, cases, rmas, orders] = await Promise.all([
        storage.searchCustomers(searchTerm).catch((err) => { console.error("Customer search error:", err); return []; }),
        storage.searchCases(searchTerm).catch((err) => { console.error("Case search error:", err); return []; }),
        storage.searchRMAs(searchTerm).catch((err) => { console.error("RMA search error:", err); return []; }),
        storage.searchOrders(searchTerm).catch((err) => { console.error("Order search error:", err); return []; })
      ]);

      console.log("Global search results:", {
        customers: customers.length,
        cases: cases.length,
        rmas: rmas.length,
        orders: orders.length
      });

      // Konverter resultaterne til det korrekte format
      const results = [
        ...customers.map(customer => {
          console.log("Global search - mapping customer:", customer.id, customer.name);
          return {
            id: customer.id,
            type: 'customer' as const,
            title: customer.name,
            subtitle: `Tlf: ${customer.phone}${customer.email ? ` • Email: ${customer.email}` : ''}`,
            link: `/worker/customers/${customer.id}`
          };
        }),
        ...cases.map(case_ => ({
          id: case_.id,
          type: 'case' as const,
          title: `${case_.caseNumber} - ${case_.title || ''}`,
          subtitle: `Kunde: ${case_.customerName} • Status: ${translateStatus(case_.status)}`,
          link: `/worker/cases/${case_.id}`
        })),
        ...rmas.map(rma => ({
          id: rma.id,
          type: 'rma' as const,
          title: `${rma.rmaNumber} - ${rma.description || rma.model || 'RMA'}`,
          subtitle: `Kunde: ${rma.customerName} • Status: ${translateStatus(rma.status)}`,
          link: `/worker/rma/${rma.id}`
        })),
        ...orders.map(order => ({
          id: order.id,
          type: 'order' as const,
          title: `${order.orderNumber} - ${order.itemsOrdered || 'Bestilling'}`,
          subtitle: `Kunde: ${order.customerName} • Status: ${translateStatus(order.status)}`,
          link: `/worker/orders/${order.id}`
        }))
      ];

      console.log("Global search - final results:", results);
      // Returner resultaterne
      res.json(results);
    } catch (error) {
      console.error("Error in global search:", error);
      res.status(500).json({ error: "Der opstod en fejl under søgningen" });
    }
  });

  // User management routes
  app.post("/api/users", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);

    // Kun admins kan oprette andre admins
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

      const hashedPassword = await hashPassword(result.data.password);
      const user = await storage.createUser({
        username: result.data.username,
        password: hashedPassword,
        name: result.data.name,
        isWorker: result.data.isWorker,
        isAdmin: result.data.isAdmin,
        birthday: result.data.birthday || null
      });

      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Der opstod en fejl ved oprettelse af brugeren" });
    }
  });

  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    const users = await storage.getUsers();
    res.json(users);
  });

  app.delete("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(403).json({ error: "Kun administratorer kan slette brugere" });
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Ugyldigt bruger-ID" });
    }

    // Forhindre sletning af egen bruger
    if (userId === req.user.id) {
      return res.status(400).json({ error: "Du kan ikke slette din egen bruger" });
    }

    try {
      await storage.deleteUser(userId);
      res.json({ message: "Bruger slettet" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Der opstod en fejl ved sletning af brugeren" });
    }
  });

  // Existing case management routes
  app.get("/api/cases", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 6;
    const searchTerm = (req.query.search as string) || (req.query.searchTerm as string);
    const treatment = req.query.treatment as string;
    const priority = req.query.priority as string;
    const status = req.query.status as string;
    const sort = req.query.sort as string;
    const includeCompleted = req.query.includeCompleted === 'true';
    let customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;

    // For customer users, force filter by their customer ID
    if (!req.user.isWorker && req.user.customerId) {
      customerId = req.user.customerId;
    }

    try {
      const cases = await storage.getPaginatedCases({
        page,
        pageSize,
        searchTerm,
        treatment,
        priority,
        status,
        sort,
        customerId,
        isWorker: req.user.isWorker,
        includeCompleted
      });

      return res.json(cases);
    } catch (error) {
      console.error('Error fetching cases:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Specialruter først
  app.get("/api/cases/alarm", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) {
      return res.sendStatus(403);
    }
    try {
      const alarmCases = await storage.getAlarmCases();
      console.log('Antal sager i alarm:', alarmCases.length);
      res.json(alarmCases);
    } catch (error) {
      console.error("Error fetching alarm cases:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af sager i alarm" });
    }
  });

  app.get("/api/cases/status-counts", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      console.log('Status counts endpoint called');
      const statusCounts = await storage.getStatusCounts();
      console.log('Status counts from storage:', statusCounts);
      res.json(statusCounts);
    } catch (error) {
      console.error('Error fetching status counts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/api/cases/total", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const total = await storage.getTotalCases();
      return res.json({ total });
    } catch (error) {
      console.error('Error fetching total cases:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/api/cases/alarm-count", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      const alarmCases = await storage.getAlarmCases();
      return res.json({ count: alarmCases.length });
    } catch (error) {
      console.error('Fejl ved hentning af alarm-count:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PATCH kun for tal
  app.patch("/api/cases/:id(\\d+)", async (req, res) => {
    console.log(`[DEBUG] Hit numeric PATCH route for case ID: ${req.params.id}`);
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      const caseId = parseInt(req.params.id);
      if (isNaN(caseId)) {
        return res.status(400).json({ error: "Ugyldigt sagsnummer" });
      }

      console.log(`[DEBUG] PATCH /api/cases/${caseId} (numeric route) - Request body:`, JSON.stringify(req.body, null, 2));

      const result = insertCaseSchema.partial().safeParse(req.body);
      if (!result.success) {
        console.log(`[DEBUG] Validation failed (numeric route):`, result.error);
        return res.status(400).json(result.error);
      }

      console.log(`[DEBUG] Validation passed (numeric route):`, JSON.stringify(result.data, null, 2));

      const updatedCase = await storage.updateCase(caseId, result.data);
      if (!updatedCase) {
        return res.status(404).json({ error: "Sagen blev ikke fundet" });
      }

      // Broadcast live update for case update
      broadcastLiveUpdate('case_updated', {
        case: updatedCase,
        message: `Sag opdateret: ${updatedCase.caseNumber} - ${updatedCase.title}`
      });

      console.log(`[DEBUG] Case updated successfully (numeric route):`, JSON.stringify(updatedCase, null, 2));
      res.json(updatedCase);
    } catch (error) {
      console.error("Error updating case:", error);
      res.status(500).json({ error: "Der opstod en fejl ved opdatering af sagen" });
    }
  });

  // GET catch-all til sidst
  app.get("/api/cases/:idOrNumber", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.sendStatus(401);
      }
      const idOrNumber = req.params.idOrNumber;
      console.log(`Attempting to fetch case with idOrNumber: ${idOrNumber}`);
      let case_ = await storage.getCase(idOrNumber);
      if (!case_ && !isNaN(Number(idOrNumber))) {
        case_ = await storage.getCase(Number(idOrNumber));
      }
      if (!case_) {
        console.log(`Case not found for idOrNumber: ${idOrNumber}`);
        return res.status(404).json({ error: "Sagen blev ikke fundet" });
      }
      if (!req.user.isWorker && case_.customerId !== req.user.customerId) {
        console.log(`User ${req.user.id} (customerId: ${req.user.customerId}) not authorized to view case ${case_.id} (customerId: ${case_.customerId})`);
        return res.status(403).json({ error: "Ingen adgang til denne sag" });
      }
      console.log(`Successfully fetched case:`, case_);
      res.json(case_);
    } catch (error) {
      console.error("Error in /api/cases/:idOrNumber route:", error);
      res.status(500).json({ 
        error: "Der opstod en fejl ved hentning af sagen",
        details: error.message 
      });
    }
  });

  // Opdater case creation route for at håndtere nye kunder korrekt
  app.post("/api/cases", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    
    const result = insertCaseSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json(result.error);
    }

    try {
      let customerId = result.data.customerId;

      // Hvis vi opretter en ny kunde
      if (!customerId && result.data.customerPhone) {
        const newCustomer = await storage.createCustomer({
          name: result.data.customerSearch || "Ny kunde",
          phone: result.data.customerPhone,
          email: null,
          address: null,
          city: null,
          postalCode: null,
          notes: null,
        });
        customerId = newCustomer.id;
      }

      // Hvis vi ikke har hverken customerId eller customerPhone
      if (!customerId && !result.data.customerPhone) {
        return res.status(400).json({
          message: "Enten customerId eller customerPhone skal angives"
        });
      }

      const caseNumber = await generateCaseNumber(result.data.treatment.toLowerCase());

      // Sikrer at vi gemmer den aktuelle brugers ID
      const caseDataToCreate = {
        ...result.data,
        customerId,
        caseNumber,
        status: 'created',
        createdBy: req.user.id,
        createdByName: result.data.createdByName,
      };

      const case_ = await storage.createCase(caseDataToCreate);
      
      // Broadcast live update for case creation
      broadcastLiveUpdate('case_created', {
        case: case_,
        message: `Ny sag oprettet: ${case_.caseNumber} - ${case_.title}`
      });
      
      res.status(201).json(case_);
    } catch (error) {
      console.error("Error creating case:", error);
      res.status(500).json({ error: "Der opstod en fejl ved oprettelse af sagen" });
    }
  });

  // Add this route in the case management section
  app.patch("/api/cases/:id", async (req, res) => {
    console.log(`[DEBUG] Hit general PATCH route for case ID: ${req.params.id}`);
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);

    try {
      const caseId = parseInt(req.params.id);
      if (isNaN(caseId)) {
        return res.status(400).json({ error: "Ugyldigt sagsnummer" });
      }

      console.log(`[DEBUG] PATCH /api/cases/${caseId} - Request body:`, JSON.stringify(req.body, null, 2));

      // Validate the request body using the case schema
      const result = insertCaseSchema.partial().safeParse(req.body);
      if (!result.success) {
        console.log(`[DEBUG] Validation failed:`, result.error);
        return res.status(400).json(result.error);
      }

      console.log(`[DEBUG] Validation passed:`, JSON.stringify(result.data, null, 2));

      const updatedCase = await storage.updateCase(caseId, result.data);
      if (!updatedCase) {
        return res.status(404).json({ error: "Sagen blev ikke fundet" });
      }

      // Broadcast live update for case update
      broadcastLiveUpdate('case_updated', {
        case: updatedCase,
        message: `Sag opdateret: ${updatedCase.caseNumber} - ${updatedCase.title}`
      });

      console.log(`[DEBUG] Case updated successfully:`, JSON.stringify(updatedCase, null, 2));
      res.json(updatedCase);
    } catch (error) {
      console.error("Error updating case:", error);
      res.status(500).json({ error: "Der opstod en fejl ved opdatering af sagen" });
    }
  });

  app.post("/api/cases/:id/status", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);

    const result = updateStatusSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json(result.error);
    }

    try {
      const caseId = parseInt(req.params.id);
      const { status, comment, updatedByName } = result.data;
      // Tilføj: brug evt. updatedByName fra body, ellers brug brugerens navn
      const updatedByName_ = updatedByName || req.user.name;

      // Update case status and add to history
      const updatedCase = await storage.updateCaseStatusWithHistory(
        caseId,
        status,
        comment || "",
        req.user.id,
        updatedByName_
      );

      console.log(`[DEBUG] About to broadcast live update for case ${caseId} status change to ${status}`);
      
      // Oversæt status til dansk
      const statusMap: Record<string, string> = {
        'created': 'Oprettet',
        'in_progress': 'Under behandling',
        'offer_created': 'Tilbud oprettet',
        'waiting_customer': 'Afventer kunde',
        'offer_accepted': 'Tilbud godkendt',
        'offer_rejected': 'Tilbud afvist',
        'waiting_parts': 'Afventer dele',
        'preparing_delivery': 'Klargøring til levering',
        'ready_for_pickup': 'Klar til afhentning',
        'completed': 'Afsluttet'
      };
      const danishStatus = statusMap[status] || status;
      
      // Broadcast live update
      broadcastLiveUpdate('case_status_updated', {
        case: updatedCase,
        newStatus: status,
        comment: comment,
        updatedBy: updatedByName_,
        message: `${updatedByName_} har opdateret ${updatedCase.caseNumber || caseId} til ${danishStatus}`
      });

      console.log(`[DEBUG] Live update broadcast completed for case ${caseId}`);

      res.json(updatedCase);
    } catch (error) {
      console.error("Error updating case status:", error);
      res.status(500).json({ error: "Der opstod en fejl ved opdatering af status" });
    }
  });

  // New route to get case status history
  app.get("/api/cases/:id/status-history", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const caseId = parseInt(req.params.id);
      
      // For non-workers, check if the case belongs to the customer
      if (!req.user.isWorker) {
        const case_ = await storage.getCase(caseId);
        if (!case_ || case_.customerId !== req.user.customerId) {
          return res.status(403).json({ error: "Ingen adgang til denne sag" });
        }
      }

      const history = await storage.getCaseStatusHistory(caseId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching case status history:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af sagens historik" });
    }
  });

  // RMA routes
  app.get("/api/rma", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 6;
      const searchTerm = req.query.search as string;
      const status = req.query.status as string;
      const sort = req.query.sort as 'newest' | 'oldest' | 'default' || 'default';

      const options = {
        page,
        pageSize,
        searchTerm,
        status,
        sort
      };

      console.log("RMA request options:", options);
      const rmas = await storage.getPaginatedRMAs(options);
      console.log(`RMA request returned ${rmas.items.length} items`);
      res.json(rmas);
    } catch (error) {
      console.error("Error fetching RMAs:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af RMA sager", details: error.message });
    }
  });

  app.get("/api/rma/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      const rma = await storage.getRMA(parseInt(req.params.id));
      if (!rma) return res.status(404).json({ error: "RMA ikke fundet" });
      res.json(rma);
    } catch (error) {
      console.error("Error fetching RMA:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af RMA" });
    }
  });

  app.post("/api/rma", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    const result = insertRMASchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json(result.error);
    }
    try {
      // Tilføj bruger-ID til RMA data
      const rmaData = {
        ...result.data,
        createdBy: req.user.id // Tilføj den aktuelle brugers ID
      };
      
      const rma = await storage.createRMA(rmaData);
      res.status(201).json(rma);
    } catch (error) {
      console.error("Error creating RMA:", error);
      res.status(500).json({ error: "Der opstod en fejl ved oprettelse af RMA" });
    }
  });

  // Add new route to get RMA status history
  app.get("/api/rma/:id/status-history", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      const history = await storage.getRMAStatusHistory(parseInt(req.params.id));
      res.json(history);
    } catch (error) {
      console.error("Error fetching RMA status history:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af RMA status historik" });
    }
  });

  // Update the status update endpoint to handle comments
  app.patch("/api/rma/:id/status", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      const { status, comment, updatedByName } = req.body;
      if (!status || !comment) {
        return res.status(400).json({ error: "Status og kommentar er påkrævet" });
      }
      const rma = await storage.updateRMAStatusWithHistory(
        parseInt(req.params.id),
        status,
        comment,
        req.user.id,
        updatedByName
      );
      res.json(rma);
    } catch (error) {
      console.error("Error updating RMA status:", error);
      res.status(500).json({ error: "Der opstod en fejl ved opdatering af RMA status" });
    }
  });

  // Add new PATCH endpoint for updating RMA
  app.patch("/api/rma/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      const rmaId = parseInt(req.params.id);
      if (isNaN(rmaId)) {
        return res.status(400).json({ error: "Ugyldigt RMA ID" });
      }

      // Validate the request body using the RMA schema
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

  // Order management routes
  app.get("/api/orders", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);

    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const status = req.query.status as string;
      const sort = req.query.sort as string;
      const searchTerm = req.query.search as string;
      const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;

      const orders = await storage.getPaginatedOrders({
        page,
        pageSize,
        status,
        sort,
        searchTerm,
        customerId,
      });

      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af bestillinger" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);

    try {
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "Ugyldigt bestillings-ID" });
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Bestilling ikke fundet" });
      }

      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af bestillingen" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);

    try {
        console.log("Received order data:", req.body);
        
        // Generer ordrenummer først
        let orderNumber;
        try {
            orderNumber = await generateOrderNumber();
            console.log("Generated order number:", orderNumber);
        } catch (error) {
            console.error("Error generating order number:", error);
            return res.status(500).json({
                error: "Der opstod en fejl ved generering af ordrenummer",
                details: error.message
            });
        }
        
        // Forbered ordre data
        const orderData = {
            ...req.body,
            orderNumber,
            itemsOrdered: req.body.itemsOrdered || "Ikke specificeret",
            supplier: req.body.supplier || "Ikke specificeret",
            orderDate: req.body.orderDate ? new Date(req.body.orderDate) : new Date(),
            createdBy: req.user.id,
            status: "pending" as const
        };
        
        console.log("Complete order data before validation:", orderData);
        
        // Valider den komplette data
        const result = insertOrderSchema.safeParse(orderData);
        
        if (!result.success) {
            console.error("Order validation failed:", result.error.errors);
            return res.status(400).json({
                error: "Validering fejlede",
                details: result.error.errors,
                receivedData: orderData  // Log det modtagne data for bedre debugging
            });
        }

        console.log("Validation passed, creating order with data:", result.data);

        try {
            const order = await storage.createOrder(result.data);
            console.log("Order created successfully:", order);
            res.status(201).json(order);
        } catch (error) {
            console.error("Error in storage.createOrder:", error);
            res.status(500).json({ 
                error: "Der opstod en fejl ved oprettelse af bestillingen i databasen",
                details: error.message,
                receivedData: result.data  // Log det validerede data for bedre debugging
            });
        }
    } catch (error) {
        console.error("Unexpected error in order creation:", error);
        res.status(500).json({ 
            error: "Der opstod en uventet fejl ved oprettelse af bestillingen",
            details: error.message 
        });
    }
  });

  app.patch("/api/orders/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);

    try {
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "Ugyldigt bestillings-ID" });
      }

      const result = insertOrderSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json(result.error);
      }

      const order = await storage.updateOrder(orderId, result.data);
      if (!order) {
        return res.status(404).json({ error: "Bestilling ikke fundet" });
      }

      res.json(order);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ error: "Der opstod en fejl ved opdatering af bestillingen" });
    }
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);

    try {
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "Ugyldigt bestillings-ID" });
      }

      const { status } = req.body;
      if (!status || !Object.values(OrderStatus).includes(status)) {
        return res.status(400).json({ error: "Ugyldig status" });
      }

      const order = await storage.updateOrderStatus(orderId, status);
      if (!order) {
        return res.status(404).json({ error: "Bestilling ikke fundet" });
      }

      res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Der opstod en fejl ved opdatering af bestillingens status" });
    }
  });

  app.get("/api/customers/:id/orders", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      const customerId = parseInt(req.params.id);
      if (isNaN(customerId)) {
        return res.status(400).json({ error: "Ugyldigt kunde-ID" });
      }
      const orders = await storage.getOrdersByCustomerId(customerId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching customer orders:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af kundens bestillinger" });
    }
  });

  // Endpoint til at hente bestillinger for en specifik sag
  app.get("/api/cases/:id/orders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const caseId = parseInt(req.params.id);
      if (isNaN(caseId)) {
        return res.status(400).json({ error: "Ugyldigt sags-ID" });
      }

      // For non-workers, check if the case belongs to the customer
      if (!req.user.isWorker) {
        const case_ = await storage.getCase(caseId);
        if (!case_ || case_.customerId !== req.user.customerId) {
          return res.status(403).json({ error: "Ingen adgang til denne sag" });
        }
      }

      const orders = await storage.getOrdersByCaseId(caseId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching case orders:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af sagens bestillinger" });
    }
  });

  // Internal cases routes
  app.get("/api/internal-cases", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const onlySent = req.query.onlySent === 'true';
      const onlyReceived = req.query.onlyReceived === 'true';
      const onlyUnread = req.query.onlyUnread === 'true';
      const userId = req.user.id;
      const result = await storage.getPaginatedInternalCases({
        page,
        pageSize,
        userId,
        onlySent,
        onlyReceived,
        onlyUnread
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching internal cases:", error);
      res.status(500).json({ error: "Der opstod en fejl ved hentning af interne sager" });
    }
  });

  // Mark internal case as read
  app.patch("/api/internal-cases/:id/read", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    
    try {
      const id = parseInt(req.params.id);
      
      // Check if the internal case exists and belongs to the user
      const [internalCase] = await db
        .select()
        .from(internalCases)
        .where(eq(internalCases.id, id));
      
      if (!internalCase) {
        return res.status(404).json({ error: "Intern sag ikke fundet" });
      }
      
      // Only the receiver can mark as read
      if (internalCase.receiverId !== req.user.id) {
        return res.status(403).json({ error: "Du har ikke tilladelse til at markere denne sag som læst" });
      }
      
      const [updatedCase] = await db
        .update(internalCases)
        .set({ read: true, updatedAt: new Date() })
        .where(eq(internalCases.id, id))
        .returning();
      
      // =================================================================
      // BROADCASTER LIVE UPDATE FOR MARKERING SOM LÆST
      // =================================================================
      // Sender WebSocket besked om at beskeden er markeret som læst
      broadcastLiveUpdate('internal_case_read', {
        internalCase: updatedCase,
        readBy: req.user.name,
        message: `${req.user.name} har læst en intern besked`
      });
      
      res.json(updatedCase);
    } catch (error) {
      console.error("Error marking internal case as read:", error);
      res.status(500).json({ error: "Der opstod en fejl ved markering af intern sag som læst" });
    }
  });

  // Create internal case
  app.post("/api/internal-cases", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);
    
    try {
      const { caseId, receiverId, message } = req.body;
      
      if (!caseId || !receiverId || !message) {
        return res.status(400).json({ error: "Manglende påkrævede felter" });
      }
      
      // Hent modtager info for bedre besked
      const [receiver] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, receiverId));
      
      const [newInternalCase] = await db
        .insert(internalCases)
        .values({
          caseId,
          senderId: req.user.id,
          receiverId,
          message,
          read: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      // =================================================================
      // BROADCASTER LIVE UPDATE FOR INTERN BESKED
      // =================================================================
      // Sender WebSocket besked til alle tilsluttede klienter om ny intern besked
      broadcastLiveUpdate('internal_case_created', {
        internalCase: newInternalCase,
        senderName: req.user.name,
        receiverName: receiver?.name || 'Ukendt modtager',
        caseId: caseId,
        message: `${req.user.name} har sendt en intern besked til ${receiver?.name || 'modtager'}`
      });
      
      res.status(201).json(newInternalCase);
    } catch (error) {
      console.error("Error creating internal case:", error);
      res.status(500).json({ error: "Der opstod en fejl ved oprettelse af intern sag" });
    }
  });

  // Tilføj en temp route til at indsætte test interne sager (KUN TIL UDVIKLING)
  app.post("/api/temp/insert-internal-cases", async (req, res) => {
    try {
      // Opretter intern sag fra Rattana (ID 1) til Mike (ID 2) - ulæst
      const result1 = await storage.createInternalCase({
        caseId: 34,
        senderId: 1,
        receiverId: 2,
        message: "Hej Mike, kan du kigge på denne sag hurtigst muligt?",
      });

      // Opretter intern sag fra Anders (ID 3) til Mike (ID 2) - ulæst
      const result2 = await storage.createInternalCase({
        caseId: 32, 
        senderId: 3,
        receiverId: 2,
        message: "Hej Mike, jeg har brug for din hjælp med denne reparation.",
      });

      // Opretter intern sag fra Julie (ID 4) til Mike (ID 2) - ulæst
      const result3 = await storage.createInternalCase({
        caseId: 29,
        senderId: 4,
        receiverId: 2,
        message: "Mike, kunden har ringet og spurgt til status. Kan du give en opdatering?",
      });

      res.status(201).json({ 
        message: "Test interne sager oprettet", 
        cases: [result1, result2, result3] 
      });
    } catch (error) {
      console.error("Fejl ved oprettelse af test interne sager:", error);
      res.status(500).json({ error: "Der opstod en fejl ved oprettelsen af test interne sager" });
    }
  });

  // Temporary endpoint to fix Finn's password
  app.post("/api/temp/fix-finn-password", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }

    try {
      const finn = await storage.getUserByUsername("Finn");
      if (!finn) {
        return res.status(404).json({ error: "Bruger ikke fundet" });
      }

      const hashedPassword = await hashPassword("finnernice");
      await storage.updateUserPassword(finn.id, hashedPassword);

      res.json({ message: "Password opdateret succesfuldt" });
    } catch (error) {
      console.error("Error updating Finn's password:", error);
      res.status(500).json({ error: "Der opstod en fejl ved opdatering af password" });
    }
  });

  // Tilføj denne nye route til at finde og opdatere sager med engelsk tekst
  app.get("/api/cases/find-english", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);

    try {
      const result = await db.execute(sql`
        SELECT id, case_number, description, important_notes 
        FROM cases 
        WHERE (description ~ '[a-zA-Z]{4,}' AND description !~ '[æøåÆØÅ]')
        OR (important_notes ~ '[a-zA-Z]{4,}' AND important_notes !~ '[æøåÆØÅ]')
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Error finding English cases:", error);
      res.status(500).json({ error: "Der opstod en fejl ved søgning efter engelske sager" });
    }
  });

  // Tilføj denne nye route til at oversætte sager til dansk
  app.post("/api/cases/translate-to-danish", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);

    try {
      const updatedCases = await findAndTranslateEnglishCases();
      res.json({
        message: `${updatedCases.length} sager blev fundet og oversat til dansk`,
        cases: updatedCases
      });
    } catch (error) {
      console.error("Error translating cases:", error);
      res.status(500).json({ error: "Der opstod en fejl ved oversættelse af sagerne" });
    }
  });

  // Slet kunde (kun admin)
  app.delete("/api/customers/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(403).json({ error: "Kun administratorer kan slette kunder" });
    }
    const customerId = parseInt(req.params.id);
    if (isNaN(customerId)) {
      return res.status(400).json({ error: "Ugyldigt kunde-ID" });
    }
    try {
      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ error: "Kunde ikke fundet" });
      }
      // Slet kunden
      await storage.deleteCustomer(customerId);
      res.json({ message: "Kunde slettet" });
    } catch (error) {
      console.error("Fejl ved sletning af kunde:", error);
      res.status(500).json({ error: "Der opstod en fejl ved sletning af kunden" });
    }
  });

  // Customer data export endpoint
  app.get("/api/customers/:id/export", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isWorker) return res.sendStatus(403);

    try {
      const customerId = parseInt(req.params.id);
      const includeCases = req.query.includeCases === 'true';
      const includeOrders = req.query.includeOrders === 'true';
      const includeRMA = req.query.includeRMA === 'true';

      // Hent kundens stamdata
      const customer = await storage.getCustomer(customerId);
      if (!customer) return res.sendStatus(404);

      const exportData: any = {
        customer: customer
      };

      // Hent sager hvis ønsket
      if (includeCases) {
        const cases = await storage.getCasesByCustomerId(customerId);
        exportData.cases = cases;
      }

      // Hent bestillinger hvis ønsket
      if (includeOrders) {
        const orders = await storage.getOrdersByCustomerId(customerId);
        exportData.orders = orders;
      }

      // Hent RMA hvis ønsket
      if (includeRMA) {
        const rmas = await storage.getRMAsByCustomerId(customerId);
        exportData.rmas = rmas;
      }

      res.json(exportData);
    } catch (error) {
      console.error("Error exporting customer data:", error);
      res.status(500).json({ error: "Der opstod en fejl ved eksport af kundedata" });
    }
  });

  // Live aktiviteter endpoint
  app.get("/api/live-activities", (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const activities = getRecentActivities(limit);
      res.json(activities);
    } catch (error) {
      console.error('Error fetching live activities:', error);
      res.status(500).json({ error: 'Kunne ikke hente live aktiviteter' });
    }
  });
}