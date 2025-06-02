import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage.js";
import { logger } from './logger.js';
const scryptAsync = promisify(scrypt);
export async function hashPassword(password) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64));
    return `${buf.toString("hex")}.${salt}`;
}
export async function comparePasswords(supplied, stored) {
    if (!stored || !supplied)
        return false;
    try {
        const [hashed, salt] = stored.split(".");
        if (!hashed || !salt)
            return false;
        const suppliedBuf = (await scryptAsync(supplied, salt, 64));
        const storedBuf = Buffer.from(hashed, "hex");
        return storedBuf.length === suppliedBuf.length &&
            timingSafeEqual(storedBuf, suppliedBuf);
    }
    catch (error) {
        console.error("Password comparison error:", error);
        return false;
    }
}
export async function setupInitialAdmin() {
    const adminUsername = "admin";
    const adminPassword = "admin123"; // Dette bør ændres i produktion
    try {
        const existingAdmin = await storage.getUserByUsername(adminUsername);
        if (!existingAdmin) {
            const hashedPassword = await hashPassword(adminPassword);
            await storage.createUser({
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
export function setupAuth(app) {
    if (!process.env.SESSION_SECRET) {
        throw new Error("SESSION_SECRET must be set");
    }
    const sessionSettings = {
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: storage.sessionStore,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'lax'
        }
    };
    app.set("trust proxy", 1);
    app.use(session(sessionSettings));
    app.use(passport.initialize());
    app.use(passport.session());
    // Opret admin bruger ved startup
    setupInitialAdmin();
    passport.use(new LocalStrategy(async (username, password, done) => {
        try {
            logger.info(`Attempting login for user: ${username}`);
            const user = await storage.getUserByUsername(username);
            if (!user) {
                logger.warn(`Login failed: User not found: ${username}`);
                return done(null, false, { message: 'Forkert brugernavn eller adgangskode' });
            }
            const isValid = await comparePasswords(password, user.password);
            if (!isValid) {
                logger.warn(`Login failed: Invalid password for user: ${username}`);
                return done(null, false, { message: 'Forkert brugernavn eller adgangskode' });
            }
            logger.info(`Login successful for user: ${username}`);
            return done(null, user);
        }
        catch (error) {
            logger.error('Login error:', error);
            return done(error);
        }
    }));
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await storage.getUser(id);
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
        const existingUser = await storage.getUserByUsername(req.body.username);
        if (existingUser) {
            return res.status(400).send("Brugernavn eksisterer allerede");
        }
        try {
            const user = await storage.createUser({
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
    app.post("/api/login", (req, res, next) => {
        logger.info("Received login request:", { username: req.body.username, isWorker: req.body.isWorker });
        passport.authenticate("local", (err, user, info) => {
            if (err) {
                logger.error('Authentication error:', err);
                return res.status(500).json({ message: 'Der opstod en fejl ved login' });
            }
            if (!user) {
                logger.warn('Authentication failed:', info?.message);
                return res.status(401).json({ message: info?.message || 'Forkert brugernavn eller adgangskode' });
            }
            // Tjek om brugeren har de korrekte rettigheder
            if (req.body.isWorker && !user.isWorker) {
                logger.warn('Worker access denied for user:', user.username);
                return res.status(403).json({ message: 'Du har ikke adgang til medarbejder login' });
            }
            req.logIn(user, (err) => {
                if (err) {
                    logger.error('Login error:', err);
                    return res.status(500).json({ message: 'Der opstod en fejl ved login' });
                }
                logger.info(`User logged in successfully: ${user.username}`);
                return res.json({
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    isWorker: user.isWorker,
                    isAdmin: user.isAdmin
                });
            });
        })(req, res, next);
    });
    app.post("/api/logout", (req, res) => {
        const username = req.user?.username;
        req.logout(() => {
            logger.info(`User logged out: ${username}`);
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
            isWorker: user.isWorker,
            isAdmin: user.isAdmin
        });
    });
}
// Funktion til at migrere eksisterende brugere til sikker password hash
export async function migrateUserPasswords() {
    try {
        const users = await storage.getUsers();
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
                    await storage.updateUserPassword(user.id, hashedPassword);
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
