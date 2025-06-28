// =============================================================================
// SAGSHUB AUTENTIFICERINGSSYSTEM
// =============================================================================
// Denne fil håndterer al autentificering og autorisation i SagsHub systemet:
// - Password hashing og validering (scrypt algorithm)
// - Passport.js konfiguration med multiple strategies
// - Session håndtering med secure cookies
// - Medarbejder login (brugernavn + password)
// - Kunde login (telefonnummer + sagsnummer)
// - Initial admin bruger oprettelse
// - Middleware til route beskyttelse
// =============================================================================

// Import af nødvendige biblioteker til autentificering
import passport from "passport";                           // Passport.js autentificerings framework
import { Strategy as LocalStrategy } from "passport-local"; // Local strategy for brugernavn/password login
import { Express } from "express";                          // Express TypeScript typer
import session from "express-session";                     // Session middleware til at holde brugere logget ind
import { scrypt, randomBytes, timingSafeEqual } from "crypto"; // Node.js crypto funktioner til password hashing
import { promisify } from "util";                          // Konverterer callback functions til promises
import { storage } from "./storage.js";                    // Database storage funktioner
import { User as SelectUser } from "../shared/schema.js";  // User type definition
import { eq } from "drizzle-orm";                          // Drizzle ORM equality operator
import logger from './logger.js';

// =============================================================================
// TYPESCRIPT TYPE UDVIDELSER
// =============================================================================
// Udvider Express User interface til at inkludere vores bruger egenskaber
declare global {
  namespace Express {
    interface User extends SelectUser {}              // Tilføjer vores User type til Express User interface
  }
}

// =============================================================================
// PASSWORD HASHING FUNKTIONER
// =============================================================================
// Bruger scrypt algorithm som er anbefalet til password hashing

// Konverterer scrypt til en promise-baseret funktion
const scryptAsync = promisify(scrypt);

// Hasher et password med salt og returnerer den hashede værdi med salt
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");         // Genererer et 16-byte random salt og konverterer til hex
  const buf = (await scryptAsync(password, salt, 64)) as Buffer; // Hasher password med salt (64 bytes output)
  return `${buf.toString("hex")}.${salt}`;              // Returnerer hashed password og salt adskilt af punktum
}

// Sammenligner et supplied password med et stored password
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  if (!stored || !supplied) return false;              // Returnerer false hvis enten er tom
  
  try {
    const [hashed, salt] = stored.split(".");          // Splitter stored password i hash og salt dele
    if (!hashed || !salt) return false;                // Validerer at begge dele eksisterer
    
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer; // Hasher supplied password med samme salt
    const storedBuf = Buffer.from(hashed, "hex");      // Konverterer stored hash til buffer
    
    // Bruger timingSafeEqual for at forhindre timing attacks
    return storedBuf.length === suppliedBuf.length && 
           timingSafeEqual(storedBuf, suppliedBuf);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
}

// =============================================================================
// INITIAL ADMIN BRUGER SETUP
// =============================================================================
// Opretter en initial admin bruger hvis den ikke eksisterer
export async function setupInitialAdmin() {
  const adminUsername = "admin";                       // Standard admin brugernavn
  const adminPassword = "admin123";                    // Standard admin password (SKAL ændres i produktion!)

  try {
    const existingAdmin = await storage.getUserByUsername(adminUsername); // Tjekker om admin bruger allerede eksisterer
    if (!existingAdmin) {                              // Hvis admin ikke eksisterer
      const hashedPassword = await hashPassword(adminPassword); // Hasher admin password
      await storage.createUser({                       // Opretter admin bruger
        username: adminUsername,
        password: hashedPassword,
        name: "Administrator",
        isWorker: true,                                // Admin er også medarbejder
        isAdmin: true,                                 // Markerer som administrator
      });
      console.log("Initial admin user created");       // Logger oprettelse
    }
  } catch (error) {
    console.error("Error setting up initial admin:", error);
  }
}

// =============================================================================
// PASSPORT.JS OG SESSION KONFIGURATION
// =============================================================================
// Hovedfunktion til opsætning af autentificering
export function setupAuth(app: Express) {
  // Validerer at SESSION_SECRET miljøvariabel er sat (nødvendig for session sikkerhed)
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be set");
  }

  // Konfigurerer session indstillinger
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,               // Hemmeligt nøgle til at signere session cookies
    resave: false,                                    // Gemmer ikke session hvis den ikke er ændret
    saveUninitialized: false,                        // Gemmer ikke tomme sessions
    store: storage.sessionStore,                      // Bruger vores database session store
    cookie: {
      secure: process.env.NODE_ENV === 'production',  // HTTPS only i produktion
      httpOnly: true,                                 // Cookie kan ikke tilgås via JavaScript (XSS beskyttelse)
      maxAge: 24 * 60 * 60 * 1000,                  // 24 timers levetid
      sameSite: 'lax'                                // CSRF beskyttelse
    }
  };

  // Konfigurerer Express middleware
  app.set("trust proxy", 1);                         // Stoler på første proxy (til HTTPS detection)
  app.use(session(sessionSettings));                 // Aktiverer session middleware
  app.use(passport.initialize());                    // Initialiserer Passport
  app.use(passport.session());                       // Aktiverer Passport session integration

  // Opretter initial admin bruger ved server start
  setupInitialAdmin();

  // =============================================================================
  // MEDARBEJDER LOGIN STRATEGY
  // =============================================================================
  // Strategy til medarbejder login (brugernavn + password)
  passport.use('worker', 
    new LocalStrategy(async (username, password, done) => {
      try {
        logger.info(`Attempting worker login for user: ${username}`); // Logger login forsøg
        const user = await storage.getUserByUsername(username);        // Finder bruger i database
        
        // Validerer at bruger eksisterer og er medarbejder
        if (!user || !user.isWorker) {
          logger.warn(`Worker login failed: User not found or not worker: ${username}`);
          return done(null, false, { message: 'Forkert brugernavn eller adgangskode' });
        }

        // Validerer password
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          logger.warn(`Worker login failed: Invalid password for user: ${username}`);
          return done(null, false, { message: 'Forkert brugernavn eller adgangskode' });
        }

        logger.info(`Worker login successful for user: ${username}`);  // Logger succesfuldt login
        return done(null, user);                                       // Returnerer bruger objekt
      } catch (error) {
        logger.error('Worker login error:', error);
        return done(error);
      }
    }),
  );

  // =============================================================================
  // KUNDE LOGIN STRATEGY
  // =============================================================================
  // Strategy til kunde login (telefonnummer + sagsnummer)
  passport.use('customer',
    new LocalStrategy({
      usernameField: 'phone',                          // Bruger 'phone' felt som brugernavn
      passwordField: 'caseNumber'                      // Bruger 'caseNumber' felt som password
    }, async (phone, caseNumber, done) => {
      try {
        logger.info(`Attempting customer login with phone: ${phone}, caseNumber: ${caseNumber}`);
        
        // Finder kunde baseret på telefonnummer
        const customers = await storage.searchCustomers(phone);
        const customer = customers.find(c => c.phone === phone); // Finder eksakt match på telefonnummer
        
        if (!customer) {
          logger.warn(`Customer login failed: Customer not found with phone: ${phone}`);
          return done(null, false, { message: 'Forkert telefonnummer eller sagsnummer' });
        }

        // Finder sag baseret på sagsnummer og validerer at den tilhører kunden
        const case_ = await storage.getCaseByNumber(caseNumber);
        if (!case_ || case_.customerId !== customer.id) {
          logger.warn(`Customer login failed: Case not found or doesn't belong to customer`);
          return done(null, false, { message: 'Forkert telefonnummer eller sagsnummer' });
        }

        // Finder eller opretter kunde bruger konto
        let customerUser = await storage.getCustomerUser(customer.id);
        if (!customerUser) {
          // Opretter kunde bruger konto hvis den ikke eksisterer
          customerUser = await storage.createCustomerUser(customer, caseNumber);
        }

        logger.info(`Customer login successful for: ${customer.name} (case: ${caseNumber})`);
        return done(null, { ...customerUser, primaryCaseId: case_.id }); // Returnerer bruger med primary case ID
      } catch (error) {
        logger.error('Customer login error:', error);
        return done(error);
      }
    }),
  );

  // =============================================================================
  // DEFAULT LOGIN STRATEGY
  // =============================================================================
  // Standard strategy for bagudkompatibilitet (bruges hvis ingen strategy specificeres)
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        logger.info(`Attempting login for user: ${username}`);
        const user = await storage.getUserByUsername(username);       // Finder bruger
        
        if (!user) {
          logger.warn(`Login failed: User not found: ${username}`);
          return done(null, false, { message: 'Forkert brugernavn eller adgangskode' });
        }

        const isValid = await comparePasswords(password, user.password); // Validerer password
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

  // =============================================================================
  // SESSION SERIALIZATION
  // =============================================================================
  // Definerer hvordan bruger objekter gemmes og gendannes fra session

  // Serialization: Gemmer kun bruger ID i session (for at spare plads)
  passport.serializeUser((user: any, done) => {
    done(null, user.id);                              // Gemmer kun bruger ID
  });

  // Deserialization: Henter fuld bruger objekt baseret på ID
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);          // Henter bruger fra database
      if (!user) {
        return done(null, false);                      // Bruger ikke fundet
      }
      done(null, user);                                // Returnerer fuld bruger objekt
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