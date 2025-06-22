import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage.js";
import { User as SelectUser } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import { logger } from './logger.js';

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  if (!stored || !supplied) return false;
  
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) return false;
    
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    const storedBuf = Buffer.from(hashed, "hex");
    
    return storedBuf.length === suppliedBuf.length && 
           timingSafeEqual(storedBuf, suppliedBuf);
  } catch (error) {
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
  } catch (error) {
    console.error("Error setting up initial admin:", error);
  }
}

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set");
  }

  const sessionSettings: session.SessionOptions = {
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

  // Standard medarbejder login strategy
  passport.use('worker', 
    new LocalStrategy(async (username, password, done) => {
      try {
        logger.info(`Attempting worker login for user: ${username}`);
        const user = await storage.getUserByUsername(username);
        
        if (!user || !user.isWorker) {
          logger.warn(`Worker login failed: User not found or not worker: ${username}`);
          return done(null, false, { message: 'Forkert brugernavn eller adgangskode' });
        }

        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          logger.warn(`Worker login failed: Invalid password for user: ${username}`);
          return done(null, false, { message: 'Forkert brugernavn eller adgangskode' });
        }

        logger.info(`Worker login successful for user: ${username}`);
        return done(null, user);
      } catch (error) {
        logger.error('Worker login error:', error);
        return done(error);
      }
    }),
  );

  // Customer login strategy (telefonnummer + sagsnummer)
  passport.use('customer',
    new LocalStrategy({
      usernameField: 'phone',
      passwordField: 'caseNumber'
    }, async (phone, caseNumber, done) => {
      try {
        logger.info(`Attempting customer login with phone: ${phone}, caseNumber: ${caseNumber}`);
        
        // Find customer by phone
        const customers = await storage.searchCustomers(phone);
        const customer = customers.find(c => c.phone === phone);
        
        if (!customer) {
          logger.warn(`Customer login failed: Customer not found with phone: ${phone}`);
          return done(null, false, { message: 'Forkert telefonnummer eller sagsnummer' });
        }

        // Find case by caseNumber for this customer
        const case_ = await storage.getCaseByNumber(caseNumber);
        if (!case_ || case_.customerId !== customer.id) {
          logger.warn(`Customer login failed: Case not found or doesn't belong to customer`);
          return done(null, false, { message: 'Forkert telefonnummer eller sagsnummer' });
        }

        // Find or create customer user account
        let customerUser = await storage.getCustomerUser(customer.id);
        if (!customerUser) {
          // Create customer user account
          customerUser = await storage.createCustomerUser(customer, caseNumber);
        }

        logger.info(`Customer login successful for: ${customer.name} (case: ${caseNumber})`);
        return done(null, { ...customerUser, primaryCaseId: case_.id });
      } catch (error) {
        logger.error('Customer login error:', error);
        return done(error);
      }
    }),
  );

  // Default strategy for backward compatibility
  passport.use(
    new LocalStrategy(async (username, password, done) => {
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
      } catch (error) {
        logger.error('Login error:', error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
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
        isAdmin: false  // new users can't be admins by default
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  const handleWorkerLogin = (req: any, res: any, next: any) => {
    logger.info("Received worker login request:", { username: req.body.username });
    
    passport.authenticate("worker", (err, user, info) => {
      if (err) {
        logger.error('Worker authentication error:', err);
        return res.status(500).json({ message: 'Der opstod en fejl ved login' });
      }
      
      if (!user) {
        logger.warn('Worker authentication failed:', info?.message);
        return res.status(401).json({ message: info?.message || 'Forkert brugernavn eller adgangskode' });
      }

      req.logIn(user, (err) => {
        if (err) {
          logger.error('Worker login error:', err);
          return res.status(500).json({ message: 'Der opstod en fejl ved login' });
        }

        logger.info(`Worker logged in successfully: ${user.username}`);
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

  const handleCustomerLogin = (req: any, res: any, next: any) => {
    logger.info("Received customer login request:", { phone: req.body.phone, caseNumber: req.body.caseNumber });
    
    passport.authenticate("customer", (err, user, info) => {
      if (err) {
        logger.error('Customer authentication error:', err);
        return res.status(500).json({ message: 'Der opstod en fejl ved login' });
      }
      
      if (!user) {
        logger.warn('Customer authentication failed:', info?.message);
        return res.status(401).json({ message: info?.message || 'Forkert telefonnummer eller sagsnummer' });
      }

      req.logIn(user, (err) => {
        if (err) {
          logger.error('Customer login error:', err);
          return res.status(500).json({ message: 'Der opstod en fejl ved login' });
        }

        logger.info(`Customer logged in successfully: ${user.name}`);
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

  const handleLogin = (req: any, res: any, next: any) => {
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
    const username = (req.user as any)?.username;
    req.logout(() => {
      logger.info(`User logged out: ${username}`);
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Support both endpoints for backwards compatibility
  app.post("/api/auth/logout", (req, res) => {
    const username = (req.user as any)?.username;
    req.logout(() => {
      logger.info(`User logged out: ${username}`);
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.user) {
      return res.json(null);
    }
    const user = req.user as any;
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
      } catch (error) {
        console.error(`Error migrating password for user ${user.username}:`, error);
        // Fortsæt med næste bruger selvom denne fejler
        continue;
      }
    }
    console.log('Password migration completed successfully');
  } catch (error) {
    console.error('Error in password migration:', error);
    throw error;
  }
}