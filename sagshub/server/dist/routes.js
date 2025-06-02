import { setupAuth, hashPassword, setupInitialAdmin, migrateUserPasswords } from "./auth";
import { storage, generateOrderNumber } from "./storage";
import { insertCaseSchema, insertCustomerSchema, insertUserSchema, insertRMASchema, insertOrderSchema, OrderStatus } from "../shared/schema";
import { eq } from 'drizzle-orm';
import { z } from "zod";
import { db } from "./db";
import { users, internalCases } from "../shared/schema";
import { sql } from "drizzle-orm";
import { findAndTranslateEnglishCases } from './translate';
const updateStatusSchema = z.object({
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
    comment: z.string().min(1, "Kommentar er påkrævet"),
});
// Helper function for generating case numbers
async function generateCaseNumber(treatment) {
    const prefix = {
        'repair': 'REP',
        'warranty': 'REK',
        'setup': 'KLA',
        'other': 'AND',
    }[treatment] || 'AND';
    try {
        console.log(`Generating case number for prefix: ${prefix}`);
        const cases = await storage.getLatestCaseNumber(prefix);
        console.log(`Latest cases for prefix ${prefix}:`, cases);
        let number = 1;
        if (cases && cases.length > 0) {
            const latestCase = cases[0];
            console.log(`Latest case found: ${JSON.stringify(latestCase)}`);
            const match = latestCase.caseNumber.match(/\d+/);
            if (match) {
                number = parseInt(match[0]) + 1;
                console.log(`Extracted number: ${match[0]}, Next number: ${number}`);
            }
        }
        else {
            console.log(`No cases found with prefix ${prefix}, starting with number 1`);
        }
        return `${prefix}${number.toString().padStart(5, '0')}`;
    }
    catch (error) {
        console.error("Error generating case number:", error);
        return `${prefix}00001`;
    }
}
const authenticateToken = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        console.log('Ingen gyldig session fundet');
        return res.status(401).json({ error: 'Ikke autoriseret' });
    }
    req.user = { id: req.session.userId };
    console.log(`Bruger autentificeret med ID: ${req.session.userId}`);
    next();
};
export async function registerRoutes(app) {
    // Setup authentication
    setupAuth(app);
    // Migrate existing passwords to secure format
    try {
        await migrateUserPasswords();
    }
    catch (error) {
        console.error('Failed to migrate passwords:', error);
    }
    // Setup initial admin if needed
    await setupInitialAdmin();
    // Health check endpoint - dette er offentligt tilgængeligt
    app.get("/api/health", (req, res) => {
        res.status(200).json({ status: "OK" });
    });
    app.head("/api/health", (req, res) => {
        res.status(200).send();
    });
    // Endpoint til at hente antal ulæste interne sager
    app.get("/api/internal-cases/unread-count", async (req, res) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Ikke autoriseret" });
        }
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: "Ikke autoriseret" });
            }
            console.log('Getting unread count for user:', userId);
            try {
                const count = await storage.getUnreadInternalCasesCount(userId);
                console.log('Unread count:', count);
                return res.json({ count });
            }
            catch (error) {
                console.error("Database error getting unread count:", error);
                return res.status(500).json({ error: "Database fejl", count: 0 });
            }
        }
        catch (error) {
            console.error("Error getting unread internal cases count:", error);
            res.status(500).json({ error: "Der opstod en fejl ved hentning af antal ulæste interne sager" });
        }
    });
    // Customer management routes
    app.get("/api/customers", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 6;
        const searchTerm = req.query.search;
        const customers = await storage.getPaginatedCustomers(page, pageSize, searchTerm);
        res.json(customers);
    });
    // Customer search route 
    app.get("/api/customers/search", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        try {
            const searchTerm = req.query.q;
            console.log("Received search request with term:", searchTerm);
            if (!searchTerm) {
                console.log("No search term provided, returning empty array");
                return res.json([]);
            }
            const customers = await storage.searchCustomers(searchTerm);
            console.log("Found customers:", customers);
            res.json(customers);
        }
        catch (error) {
            console.error("Error searching customers:", error);
            res.status(500).json({ error: "Der opstod en fejl ved søgning efter kunder" });
        }
    });
    app.get("/api/customers/:id", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        const customer = await storage.getCustomer(parseInt(req.params.id));
        if (!customer)
            return res.sendStatus(404);
        res.json(customer);
    });
    app.post("/api/customers", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        const result = insertCustomerSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json(result.error);
        }
        const customer = await storage.createCustomer(result.data);
        res.status(201).json(customer);
    });
    app.patch("/api/customers/:id", async (req, res) => {
        if (!req.isAuthenticated() || (!req.user.isWorker && !req.user.isAdmin))
            return res.sendStatus(403);
        const result = insertCustomerSchema.partial().safeParse(req.body);
        if (!result.success) {
            return res.status(400).json(result.error);
        }
        const customer = await storage.updateCustomer(parseInt(req.params.id), result.data);
        if (!customer)
            return res.sendStatus(404);
        res.json(customer);
    });
    // New route to get customer's cases
    app.get("/api/customers/:id/cases", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        try {
            const customerId = parseInt(req.params.id);
            if (isNaN(customerId)) {
                return res.status(400).json({ error: "Ugyldigt kunde-ID" });
            }
            const cases = await storage.getCases(customerId);
            res.json(cases);
        }
        catch (error) {
            console.error("Error fetching customer cases:", error);
            res.status(500).json({ error: "Der opstod en fejl ved hentning af kundens sager" });
        }
    });
    // New route to get customer's RMA cases
    app.get("/api/customers/:id/rma", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        try {
            const customerId = parseInt(req.params.id);
            if (isNaN(customerId)) {
                return res.status(400).json({ error: "Ugyldigt kunde-ID" });
            }
            const rmas = await storage.getRMAsByCustomerId(customerId);
            res.json(rmas);
        }
        catch (error) {
            console.error("Error fetching customer RMAs:", error);
            res.status(500).json({ error: "Der opstod en fejl ved hentning af kundens RMA-sager" });
        }
    });
    // Global search endpoint
    app.get("/api/search", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        try {
            const searchTerm = req.query.q;
            if (!searchTerm?.trim()) {
                return res.json([]);
            }
            // Udfør alle søgninger parallelt
            const [customers, cases, rmas] = await Promise.all([
                storage.searchCustomers(searchTerm).catch(() => []),
                storage.searchCases(searchTerm).catch(() => []),
                storage.searchRMAs(searchTerm).catch(() => [])
            ]);
            // Konverter resultaterne til det korrekte format
            const results = [
                ...customers.map(customer => ({
                    id: customer.id,
                    type: 'customer',
                    title: customer.name,
                    subtitle: `Tlf: ${customer.phone}${customer.email ? ` • Email: ${customer.email}` : ''}`,
                    link: `/worker/customers/${customer.id}`
                })),
                ...cases.map(case_ => ({
                    id: case_.id,
                    type: 'case',
                    title: `${case_.caseNumber} - ${case_.title || ''}`,
                    subtitle: `Kunde: ${case_.customerName} • Status: ${case_.status}`,
                    link: `/worker/cases/${case_.id}`
                })),
                ...rmas.map(rma => ({
                    id: rma.id,
                    type: 'rma',
                    title: `${rma.rmaNumber} - ${rma.title || ''}`,
                    subtitle: `Kunde: ${rma.customerName} • Status: ${rma.status}`,
                    link: `/worker/rma/${rma.id}`
                }))
            ];
            // Returner resultaterne
            res.json(results);
        }
        catch (error) {
            console.error("Error in global search:", error);
            res.status(500).json({ error: "Der opstod en fejl under søgningen" });
        }
    });
    // User management routes
    app.post("/api/users", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
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
                isAdmin: result.data.isAdmin
            });
            res.status(201).json(user);
        }
        catch (error) {
            console.error("Error creating user:", error);
            res.status(500).json({ error: "Der opstod en fejl ved oprettelse af brugeren" });
        }
    });
    app.get("/api/users", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
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
        }
        catch (error) {
            console.error("Error deleting user:", error);
            res.status(500).json({ error: "Der opstod en fejl ved sletning af brugeren" });
        }
    });
    // Existing case management routes
    app.get("/api/cases", async (req, res) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 6;
        const searchTerm = req.query.searchTerm;
        const treatment = req.query.treatment;
        const priority = req.query.priority;
        const status = req.query.status;
        const sort = req.query.sort;
        const customerId = req.query.customerId ? parseInt(req.query.customerId) : undefined;
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
                isWorker: req.user.isWorker
            });
            return res.json(cases);
        }
        catch (error) {
            console.error('Error fetching cases:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
    // Get case by ID or case number
    app.get("/api/cases/:idOrNumber", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.sendStatus(401);
            }
            const idOrNumber = req.params.idOrNumber;
            console.log(`Attempting to fetch case with idOrNumber: ${idOrNumber}`);
            let case_;
            try {
                // Først prøv at parse som ID
                const caseId = parseInt(idOrNumber);
                if (!isNaN(caseId)) {
                    console.log(`Trying to fetch case by ID: ${caseId}`);
                    case_ = await storage.getCase(caseId);
                }
                // Hvis ikke fundet som ID, prøv som sagsnummer
                if (!case_) {
                    console.log(`Case not found by ID, trying case number: ${idOrNumber}`);
                    case_ = await storage.getCase(idOrNumber);
                }
            }
            catch (error) {
                console.error("Error fetching case:", error);
                throw new Error(`Fejl ved hentning af sag: ${error.message}`);
            }
            if (!case_) {
                console.log(`Case not found for idOrNumber: ${idOrNumber}`);
                return res.status(404).json({ error: "Sagen blev ikke fundet" });
            }
            if (!req.user.isWorker && case_.customerId !== req.user.id) {
                console.log(`User ${req.user.id} not authorized to view case ${case_.id}`);
                return res.status(403).json({ error: "Ingen adgang til denne sag" });
            }
            console.log(`Successfully fetched case:`, case_);
            res.json(case_);
        }
        catch (error) {
            console.error("Error in /api/cases/:idOrNumber route:", error);
            res.status(500).json({
                error: "Der opstod en fejl ved hentning af sagen",
                details: error.message
            });
        }
    });
    // Opdater case creation route for at håndtere nye kunder korrekt
    app.post("/api/cases", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
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
            console.log("Creating case with user ID:", req.user.id); // Debug log
            // Sikrer at vi gemmer den aktuelle brugers ID
            const case_ = await storage.createCase({
                ...result.data,
                customerId,
                caseNumber,
                status: 'created',
                createdBy: req.user.id, // Eksplicit sæt bruger ID
            });
            res.status(201).json(case_);
        }
        catch (error) {
            console.error("Error creating case:", error);
            res.status(500).json({ error: "Der opstod en fejl ved oprettelse af sagen" });
        }
    });
    // Add this route in the case management section
    app.patch("/api/cases/:id", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        try {
            const caseId = parseInt(req.params.id);
            if (isNaN(caseId)) {
                return res.status(400).json({ error: "Ugyldigt sagsnummer" });
            }
            // Validate the request body using the case schema
            const result = insertCaseSchema.partial().safeParse(req.body);
            if (!result.success) {
                return res.status(400).json(result.error);
            }
            const updatedCase = await storage.updateCase(caseId, result.data);
            if (!updatedCase) {
                return res.status(404).json({ error: "Sagen blev ikke fundet" });
            }
            res.json(updatedCase);
        }
        catch (error) {
            console.error("Error updating case:", error);
            res.status(500).json({ error: "Der opstod en fejl ved opdatering af sagen" });
        }
    });
    app.post("/api/cases/:id/status", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        const result = updateStatusSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json(result.error);
        }
        try {
            const caseId = parseInt(req.params.id);
            const { status, comment } = result.data;
            // Update case status and add to history
            const updatedCase = await storage.updateCaseStatusWithHistory(caseId, status, comment || "", req.user.id);
            res.json(updatedCase);
        }
        catch (error) {
            console.error("Error updating case status:", error);
            res.status(500).json({ error: "Der opstod en fejl ved opdatering af status" });
        }
    });
    // New route to get case status history
    app.get("/api/cases/:id/status-history", async (req, res) => {
        if (!req.isAuthenticated())
            return res.sendStatus(401);
        const history = await storage.getCaseStatusHistory(parseInt(req.params.id));
        res.json(history);
    });
    // RMA routes
    app.get("/api/rma", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        try {
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 6;
            const searchTerm = req.query.searchTerm;
            const status = req.query.status;
            const sort = req.query.sort || 'default';
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
        }
        catch (error) {
            console.error("Error fetching RMAs:", error);
            res.status(500).json({ error: "Der opstod en fejl ved hentning af RMA sager", details: error.message });
        }
    });
    app.get("/api/rma/:id", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        try {
            const rma = await storage.getRMA(parseInt(req.params.id));
            if (!rma)
                return res.status(404).json({ error: "RMA ikke fundet" });
            res.json(rma);
        }
        catch (error) {
            console.error("Error fetching RMA:", error);
            res.status(500).json({ error: "Der opstod en fejl ved hentning af RMA" });
        }
    });
    app.post("/api/rma", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
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
        }
        catch (error) {
            console.error("Error creating RMA:", error);
            res.status(500).json({ error: "Der opstod en fejl ved oprettelse af RMA" });
        }
    });
    // Add new route to get RMA status history
    app.get("/api/rma/:id/status-history", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        try {
            const history = await storage.getRMAStatusHistory(parseInt(req.params.id));
            res.json(history);
        }
        catch (error) {
            console.error("Error fetching RMA status history:", error);
            res.status(500).json({ error: "Der opstod en fejl ved hentning af RMA status historik" });
        }
    });
    // Update the status update endpoint to handle comments
    app.patch("/api/rma/:id/status", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        try {
            const { status, comment } = req.body;
            if (!status || !comment) {
                return res.status(400).json({ error: "Status og kommentar er påkrævet" });
            }
            const rma = await storage.updateRMAStatusWithHistory(parseInt(req.params.id), status, comment, req.user.id);
            res.json(rma);
        }
        catch (error) {
            console.error("Error updating RMA status:", error);
            res.status(500).json({ error: "Der opstod en fejl ved opdatering af RMA status" });
        }
    });
    // Add new PATCH endpoint for updating RMA
    app.patch("/api/rma/:id", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
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
        }
        catch (error) {
            console.error("Error updating RMA:", error);
            res.status(500).json({ error: "Der opstod en fejl ved opdatering af RMA" });
        }
    });
    // Order management routes
    app.get("/api/orders", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        try {
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;
            const status = req.query.status;
            const sort = req.query.sort;
            const searchTerm = req.query.search;
            const customerId = req.query.customerId ? parseInt(req.query.customerId) : undefined;
            const orders = await storage.getPaginatedOrders({
                page,
                pageSize,
                status,
                sort,
                searchTerm,
                customerId,
            });
            res.json(orders);
        }
        catch (error) {
            console.error("Error fetching orders:", error);
            res.status(500).json({ error: "Der opstod en fejl ved hentning af bestillinger" });
        }
    });
    app.get("/api/orders/:id", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
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
        }
        catch (error) {
            console.error("Error fetching order:", error);
            res.status(500).json({ error: "Der opstod en fejl ved hentning af bestillingen" });
        }
    });
    app.post("/api/orders", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        try {
            console.log("Received order data:", req.body);
            // Generer ordrenummer først
            let orderNumber;
            try {
                orderNumber = await generateOrderNumber();
                console.log("Generated order number:", orderNumber);
            }
            catch (error) {
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
                status: "pending"
            };
            console.log("Complete order data before validation:", orderData);
            // Valider den komplette data
            const result = insertOrderSchema.safeParse(orderData);
            if (!result.success) {
                console.error("Order validation failed:", result.error.errors);
                return res.status(400).json({
                    error: "Validering fejlede",
                    details: result.error.errors,
                    receivedData: orderData // Log det modtagne data for bedre debugging
                });
            }
            console.log("Validation passed, creating order with data:", result.data);
            try {
                const order = await storage.createOrder(result.data);
                console.log("Order created successfully:", order);
                res.status(201).json(order);
            }
            catch (error) {
                console.error("Error in storage.createOrder:", error);
                res.status(500).json({
                    error: "Der opstod en fejl ved oprettelse af bestillingen i databasen",
                    details: error.message,
                    receivedData: result.data // Log det validerede data for bedre debugging
                });
            }
        }
        catch (error) {
            console.error("Unexpected error in order creation:", error);
            res.status(500).json({
                error: "Der opstod en uventet fejl ved oprettelse af bestillingen",
                details: error.message
            });
        }
    });
    app.patch("/api/orders/:id", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
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
        }
        catch (error) {
            console.error("Error updating order:", error);
            res.status(500).json({ error: "Der opstod en fejl ved opdatering af bestillingen" });
        }
    });
    app.patch("/api/orders/:id/status", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
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
        }
        catch (error) {
            console.error("Error updating order status:", error);
            res.status(500).json({ error: "Der opstod en fejl ved opdatering af bestillingens status" });
        }
    });
    app.get("/api/customers/:id/orders", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        try {
            const customerId = parseInt(req.params.id);
            if (isNaN(customerId)) {
                return res.status(400).json({ error: "Ugyldigt kunde-ID" });
            }
            const orders = await storage.getOrdersByCustomerId(customerId);
            res.json(orders);
        }
        catch (error) {
            console.error("Error fetching customer orders:", error);
            res.status(500).json({ error: "Der opstod en fejl ved hentning af kundens bestillinger" });
        }
    });
    // Endpoint til at hente bestillinger for en specifik sag
    app.get("/api/cases/:id/orders", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        try {
            const caseId = parseInt(req.params.id);
            if (isNaN(caseId)) {
                return res.status(400).json({ error: "Ugyldigt sags-ID" });
            }
            const orders = await storage.getOrdersByCaseId(caseId);
            res.json(orders);
        }
        catch (error) {
            console.error("Error fetching case orders:", error);
            res.status(500).json({ error: "Der opstod en fejl ved hentning af sagens bestillinger" });
        }
    });
    // Internal cases routes
    app.get("/api/internal-cases", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        try {
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;
            const onlySent = req.query.onlySent === 'true';
            const onlyReceived = req.query.onlyReceived === 'true';
            const onlyUnread = req.query.onlyUnread === 'true';
            const result = await db
                .select({
                id: internalCases.id,
                caseId: internalCases.caseId,
                senderId: internalCases.senderId,
                senderName: users.name,
                receiverId: internalCases.receiverId,
                receiverName: users.name,
                message: internalCases.message,
                read: internalCases.read,
                createdAt: internalCases.createdAt,
                updatedAt: internalCases.updatedAt
            })
                .from(internalCases)
                .leftJoin(users, eq(internalCases.senderId, users.id));
            // Filter baseret på brugerens ID og parametre
            let query = result;
            if (onlySent) {
                query = query.filter(item => item.senderId === req.user.id);
            }
            else if (onlyReceived) {
                query = query.filter(item => item.receiverId === req.user.id);
            }
            else {
                query = query.filter(item => item.senderId === req.user.id || item.receiverId === req.user.id);
            }
            if (onlyUnread) {
                query = query.filter(item => !item.read && item.receiverId === req.user.id);
            }
            // Paginering
            const totalItems = query.length;
            const startIndex = (page - 1) * pageSize;
            const items = query.slice(startIndex, startIndex + pageSize);
            res.json({
                items,
                totalItems,
                page,
                pageSize,
                totalPages: Math.ceil(totalItems / pageSize)
            });
        }
        catch (error) {
            console.error("Error fetching internal cases:", error);
            res.status(500).json({ error: "Der opstod en fejl ved hentning af interne sager" });
        }
    });
    // Mark internal case as read
    app.patch("/api/internal-cases/:id/read", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
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
            res.json(updatedCase);
        }
        catch (error) {
            console.error("Error marking internal case as read:", error);
            res.status(500).json({ error: "Der opstod en fejl ved markering af intern sag som læst" });
        }
    });
    // Create internal case
    app.post("/api/internal-cases", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        try {
            const { caseId, receiverId, message } = req.body;
            if (!caseId || !receiverId || !message) {
                return res.status(400).json({ error: "Manglende påkrævede felter" });
            }
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
            res.status(201).json(newInternalCase);
        }
        catch (error) {
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
        }
        catch (error) {
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
        }
        catch (error) {
            console.error("Error updating Finn's password:", error);
            res.status(500).json({ error: "Der opstod en fejl ved opdatering af password" });
        }
    });
    // Tilføj denne nye route til at finde og opdatere sager med engelsk tekst
    app.get("/api/cases/find-english", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        try {
            const result = await db.execute(sql `
        SELECT id, case_number, description, important_notes 
        FROM cases 
        WHERE (description ~ '[a-zA-Z]{4,}' AND description !~ '[æøåÆØÅ]')
        OR (important_notes ~ '[a-zA-Z]{4,}' AND important_notes !~ '[æøåÆØÅ]')
      `);
            res.json(result.rows);
        }
        catch (error) {
            console.error("Error finding English cases:", error);
            res.status(500).json({ error: "Der opstod en fejl ved søgning efter engelske sager" });
        }
    });
    // Tilføj denne nye route til at oversætte sager til dansk
    app.post("/api/cases/translate-to-danish", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isWorker)
            return res.sendStatus(403);
        try {
            const updatedCases = await findAndTranslateEnglishCases();
            res.json({
                message: `${updatedCases.length} sager blev fundet og oversat til dansk`,
                cases: updatedCases
            });
        }
        catch (error) {
            console.error("Error translating cases:", error);
            res.status(500).json({ error: "Der opstod en fejl ved oversættelse af sagerne" });
        }
    });
}
