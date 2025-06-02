"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.comparePasswords = comparePasswords;
exports.setupInitialAdmin = setupInitialAdmin;
exports.setupAuth = setupAuth;
exports.migrateUserPasswords = migrateUserPasswords;
const passport_1 = __importDefault(require("passport"));
const passport_local_1 = require("passport-local");
const express_session_1 = __importDefault(require("express-session"));
const crypto_1 = require("crypto");
const util_1 = require("util");
const storage_js_1 = require("./storage.js");
const logger_js_1 = require("./logger.js");
const scryptAsync = (0, util_1.promisify)(crypto_1.scrypt);
async function hashPassword(password) {
    const salt = (0, crypto_1.randomBytes)(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64));
    return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
    if (!stored || !supplied)
        return false;
    try {
        const [hashed, salt] = stored.split(".");
        if (!hashed || !salt)
            return false;
        const suppliedBuf = (await scryptAsync(supplied, salt, 64));
        const storedBuf = Buffer.from(hashed, "hex");
        return storedBuf.length === suppliedBuf.length &&
            (0, crypto_1.timingSafeEqual)(storedBuf, suppliedBuf);
    }
    catch (error) {
        console.error("Password comparison error:", error);
        return false;
    }
}
async function setupInitialAdmin() {
    const adminUsername = "admin";
    const adminPassword = "admin123"; // Dette bør ændres i produktion
    try {
        const existingAdmin = await storage_js_1.storage.getUserByUsername(adminUsername);
        if (!existingAdmin) {
            const hashedPassword = await hashPassword(adminPassword);
            await storage_js_1.storage.createUser({
                username: adminUsername,
                password: hashedPassword,
                name: "Administrator",
                isWorker: true,
                isAdmin: true,
            });
            console.log("Initial admin user created");
        }
    }
    catch (error) {
        console.error("Error setting up initial admin:", error);
    }
}
function setupAuth(app) {
    if (!process.env.SESSION_SECRET) {
        throw new Error("SESSION_SECRET must be set");
    }
    const sessionSettings = {
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: storage_js_1.storage.sessionStore,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'lax'
        }
    };
    app.set("trust proxy", 1);
    app.use((0, express_session_1.default)(sessionSettings));
    app.use(passport_1.default.initialize());
    app.use(passport_1.default.session());
    // Opret admin bruger ved startup
    setupInitialAdmin();
    // Standard medarbejder login strategy
    passport_1.default.use('worker', new passport_local_1.Strategy(async (username, password, done) => {
        try {
            logger_js_1.logger.info(`Attempting worker login for user: ${username}`);
            const user = await storage_js_1.storage.getUserByUsername(username);
            if (!user || !user.isWorker) {
                logger_js_1.logger.warn(`Worker login failed: User not found or not worker: ${username}`);
                return done(null, false, { message: 'Forkert brugernavn eller adgangskode' });
            }
            const isValid = await comparePasswords(password, user.password);
            if (!isValid) {
                logger_js_1.logger.warn(`Worker login failed: Invalid password for user: ${username}`);
                return done(null, false, { message: 'Forkert brugernavn eller adgangskode' });
            }
            logger_js_1.logger.info(`Worker login successful for user: ${username}`);
            return done(null, user);
        }
        catch (error) {
            logger_js_1.logger.error('Worker login error:', error);
            return done(error);
        }
    }));
    // Customer login strategy (telefonnummer + sagsnummer)
    passport_1.default.use('customer', new passport_local_1.Strategy({
        usernameField: 'phone',
        passwordField: 'caseNumber'
    }, async (phone, caseNumber, done) => {
        try {
            logger_js_1.logger.info(`Attempting customer login with phone: ${phone}, caseNumber: ${caseNumber}`);
            // Find customer by phone
            const customers = await storage_js_1.storage.searchCustomers(phone);
            const customer = customers.find(c => c.phone === phone);
            if (!customer) {
                logger_js_1.logger.warn(`Customer login failed: Customer not found with phone: ${phone}`);
                return done(null, false, { message: 'Forkert telefonnummer eller sagsnummer' });
            }
            // Find case by caseNumber for this customer
            const case_ = await storage_js_1.storage.getCaseByNumber(caseNumber);
            if (!case_ || case_.customerId !== customer.id) {
                logger_js_1.logger.warn(`Customer login failed: Case not found or doesn't belong to customer`);
                return done(null, false, { message: 'Forkert telefonnummer eller sagsnummer' });
            }
            // Find or create customer user account
            let customerUser = await storage_js_1.storage.getCustomerUser(customer.id);
            if (!customerUser) {
                // Create customer user account
                customerUser = await storage_js_1.storage.createCustomerUser(customer, caseNumber);
            }
            logger_js_1.logger.info(`Customer login successful for: ${customer.name} (case: ${caseNumber})`);
            return done(null, { ...customerUser, primaryCaseId: case_.id });
        }
        catch (error) {
            logger_js_1.logger.error('Customer login error:', error);
            return done(error);
        }
    }));
    // Default strategy for backward compatibility
    passport_1.default.use(new passport_local_1.Strategy(async (username, password, done) => {
        try {
            logger_js_1.logger.info(`Attempting login for user: ${username}`);
            const user = await storage_js_1.storage.getUserByUsername(username);
            if (!user) {
                logger_js_1.logger.warn(`Login failed: User not found: ${username}`);
                return done(null, false, { message: 'Forkert brugernavn eller adgangskode' });
            }
            const isValid = await comparePasswords(password, user.password);
            if (!isValid) {
                logger_js_1.logger.warn(`Login failed: Invalid password for user: ${username}`);
                return done(null, false, { message: 'Forkert brugernavn eller adgangskode' });
            }
            logger_js_1.logger.info(`Login successful for user: ${username}`);
            return done(null, user);
        }
        catch (error) {
            logger_js_1.logger.error('Login error:', error);
            return done(error);
        }
    }));
    passport_1.default.serializeUser((user, done) => {
        done(null, user.id);
    });
    passport_1.default.deserializeUser(async (id, done) => {
        try {
            const user = await storage_js_1.storage.getUser(id);
            if (!user) {
                return done(null, false);
            }
            done(null, user);
        }
        catch (error) {
            done(error);
        }
    });
    app.post("/api/register", async (req, res, next) => {
        const existingUser = await storage_js_1.storage.getUserByUsername(req.body.username);
        if (existingUser) {
            return res.status(400).send("Brugernavn eksisterer allerede");
        }
        try {
            const user = await storage_js_1.storage.createUser({
                name: req.body.name,
                username: req.body.username,
                password: await hashPassword(req.body.password),
                isWorker: req.body.isWorker || false,
                isAdmin: false // new users can't be admins by default
            });
            req.login(user, (err) => {
                if (err)
                    return next(err);
                res.status(201).json(user);
            });
        }
        catch (error) {
            next(error);
        }
    });
    const handleWorkerLogin = (req, res, next) => {
        logger_js_1.logger.info("Received worker login request:", { username: req.body.username });
        passport_1.default.authenticate("worker", (err, user, info) => {
            if (err) {
                logger_js_1.logger.error('Worker authentication error:', err);
                return res.status(500).json({ message: 'Der opstod en fejl ved login' });
            }
            if (!user) {
                logger_js_1.logger.warn('Worker authentication failed:', info?.message);
                return res.status(401).json({ message: info?.message || 'Forkert brugernavn eller adgangskode' });
            }
            req.logIn(user, (err) => {
                if (err) {
                    logger_js_1.logger.error('Worker login error:', err);
                    return res.status(500).json({ message: 'Der opstod en fejl ved login' });
                }
                logger_js_1.logger.info(`Worker logged in successfully: ${user.username}`);
                return res.json({
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    isWorker: user.isWorker,
                    isAdmin: user.isAdmin,
                    isCustomer: false
                });
            });
        })(req, res, next);
    };
    const handleCustomerLogin = (req, res, next) => {
        logger_js_1.logger.info("Received customer login request:", { phone: req.body.phone, caseNumber: req.body.caseNumber });
        passport_1.default.authenticate("customer", (err, user, info) => {
            if (err) {
                logger_js_1.logger.error('Customer authentication error:', err);
                return res.status(500).json({ message: 'Der opstod en fejl ved login' });
            }
            if (!user) {
                logger_js_1.logger.warn('Customer authentication failed:', info?.message);
                return res.status(401).json({ message: info?.message || 'Forkert telefonnummer eller sagsnummer' });
            }
            req.logIn(user, (err) => {
                if (err) {
                    logger_js_1.logger.error('Customer login error:', err);
                    return res.status(500).json({ message: 'Der opstod en fejl ved login' });
                }
                logger_js_1.logger.info(`Customer logged in successfully: ${user.name}`);
                return res.json({
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    isWorker: false,
                    isAdmin: false,
                    isCustomer: true,
                    customerId: user.customerId,
                    primaryCaseId: user.primaryCaseId
                });
            });
        })(req, res, next);
    };
    const handleLogin = (req, res, next) => {
        logger_js_1.logger.info("Received login request:", { username: req.body.username, isWorker: req.body.isWorker });
        passport_1.default.authenticate("local", (err, user, info) => {
            if (err) {
                logger_js_1.logger.error('Authentication error:', err);
                return res.status(500).json({ message: 'Der opstod en fejl ved login' });
            }
            if (!user) {
                logger_js_1.logger.warn('Authentication failed:', info?.message);
                return res.status(401).json({ message: info?.message || 'Forkert brugernavn eller adgangskode' });
            }
            // Tjek om brugeren har de korrekte rettigheder
            if (req.body.isWorker && !user.isWorker) {
                logger_js_1.logger.warn('Worker access denied for user:', user.username);
                return res.status(403).json({ message: 'Du har ikke adgang til medarbejder login' });
            }
            req.logIn(user, (err) => {
                if (err) {
                    logger_js_1.logger.error('Login error:', err);
                    return res.status(500).json({ message: 'Der opstod en fejl ved login' });
                }
                logger_js_1.logger.info(`User logged in successfully: ${user.username}`);
                return res.json({
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    isWorker: user.isWorker,
                    isAdmin: user.isAdmin,
                    isCustomer: user.isCustomer || false
                });
            });
        })(req, res, next);
    };
    // Support both endpoints for backwards compatibility
    app.post("/api/login", handleLogin);
    app.post("/api/auth/login", handleLogin);
    // Dedicated worker and customer login endpoints
    app.post("/api/auth/worker-login", handleWorkerLogin);
    app.post("/api/auth/customer-login", handleCustomerLogin);
    app.post("/api/logout", (req, res) => {
        const username = req.user?.username;
        req.logout(() => {
            logger_js_1.logger.info(`User logged out: ${username}`);
            res.json({ message: 'Logged out successfully' });
        });
    });
    // Support both endpoints for backwards compatibility
    app.post("/api/auth/logout", (req, res) => {
        const username = req.user?.username;
        req.logout(() => {
            logger_js_1.logger.info(`User logged out: ${username}`);
            res.json({ message: 'Logged out successfully' });
        });
    });
    app.get("/api/user", (req, res) => {
        if (!req.user) {
            return res.json(null);
        }
        const user = req.user;
        res.json({
            id: user.id,
            username: user.username,
            name: user.name,
            isWorker: user.isWorker || false,
            isAdmin: user.isAdmin || false,
            isCustomer: user.isCustomer || false,
            customerId: user.customerId || null,
            primaryCaseId: user.primaryCaseId || null
        });
    });
}
// Funktion til at migrere eksisterende brugere til sikker password hash
async function migrateUserPasswords() {
    try {
        const users = await storage_js_1.storage.getUsers();
        for (const user of users) {
            try {
                // Skip Finn
                if (user.username === 'Finn') {
                    console.log('Springer over bruger Finn');
                    continue;
                }
                // Tjek om password allerede er i det nye format (indeholder et salt)
                if (user.password && !user.password.includes('.')) {
                    console.log(`Migrerer password for bruger: ${user.username}`);
                    const hashedPassword = await hashPassword(user.password);
                    await storage_js_1.storage.updateUserPassword(user.id, hashedPassword);
                }
            }
            catch (error) {
                console.error(`Error migrating password for user ${user.username}:`, error);
                // Fortsæt med næste bruger selvom denne fejler
                continue;
            }
        }
        console.log('Password migration completed successfully');
    }
    catch (error) {
        console.error('Error in password migration:', error);
        throw error;
    }
}
