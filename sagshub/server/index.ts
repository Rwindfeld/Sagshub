// =============================================================================
// SAGSHUB SERVER - HOVEDSERVERFIL
// =============================================================================
// Denne fil er hjerten i SagsHub systemet og indeholder:
// - Express server setup og konfiguration
// - WebSocket forbindelser til live opdateringer
// - Database forbindelse og initialisering
// - Middleware til autentificering, CORS, logging
// - Static file serving til frontend (produktion)
// - Live aktivitets system til real-time opdateringer
// =============================================================================

// Import af nødvendige moduler og biblioteker
import express, { type Request, Response, NextFunction } from "express"; // Express web framework til HTTP server
import { registerRoutes } from "./routes.js"; // Importerer vores API ruter (cases, customers, etc.)
import { setupVite, serveStatic, log } from "./vite.js"; // Vite development server setup
import { db, pool } from "./db.js"; // Database forbindelser (Drizzle ORM og PostgreSQL pool)
import kill from "kill-port"; // Utility til at dræbe processer på en bestemt port
import { users } from "../shared/schema.js"; // Database schema definition for users tabellen
import "dotenv/config"; // Loader miljøvariabler fra .env fil
import cors from "cors"; // Cross-Origin Resource Sharing middleware
import session from "express-session"; // Session management middleware
import passport from "passport"; // Autentificering middleware
import { Strategy as LocalStrategy } from "passport-local"; // Lokal autentificering strategi
import bcrypt from "bcrypt"; // Password hashing library
import { drizzle } from "drizzle-orm/node-postgres"; // Drizzle ORM til PostgreSQL
import { migrate } from "drizzle-orm/node-postgres/migrator"; // Database migration tools
import { Pool } from "pg"; // PostgreSQL connection pool
import { fileURLToPath } from "url"; // Utility til at konvertere file URLs
import { dirname, join } from "path"; // Path manipulation utilities
import { createServer } from "http"; // HTTP server creation
import fs from "fs"; // File system operations
import path from "path"; // Path manipulation
import os from "os"; // Operating system utilities
import { WebSocketServer } from "ws"; // WebSocket server til real-time kommunikation

// =============================================================================
// MILJØVARIABEL SETUP
// =============================================================================
// Sikrer at kritiske miljøvariabler er sat, selv hvis .env fil mangler

// Sætter session secret hvis ikke defineret (bruges til session encryption)
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'your-secret-key-here';
}

// Sætter NODE_ENV til development hvis ikke defineret
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

// =============================================================================
// EXPRESS APP INITIALISERING
// =============================================================================
const app = express(); // Opretter Express application instance

// =============================================================================
// MIDDLEWARE SETUP
// =============================================================================

// Body parser middleware - tillader serveren at læse JSON og form data
app.use(express.json()); // Parser JSON requests (fx API calls fra frontend)
app.use(express.urlencoded({ extended: true })); // Parser URL-encoded form data

// =============================================================================
// CORS KONFIGURATION - KRITISK FOR NETVÆRKSADGANG
// =============================================================================
// Cross-Origin Resource Sharing setup der tillader frontend at kommunikere med backend
app.use(cors({
  origin: function(origin, callback) {
    // Tillader ALLE origins - vigtigt for .exe distribution på forskellige netværk
    // I produktion kunne dette begrænses til specifikke domæner for øget sikkerhed
    callback(null, true);
  },
  credentials: true, // Tillader cookies og sessions på tværs af domæner
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Tillader alle HTTP metoder vi bruger
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'], // Headers frontend må sende
  exposedHeaders: ['Set-Cookie'] // Headers frontend må læse fra response
}));

// =============================================================================
// REQUEST LOGGING MIDDLEWARE
// =============================================================================
// Logger alle indkommende requests med timestamp, method, path og responstid
app.use((req, res, next) => {
  const start = Date.now(); // Tidspunkt hvor request starter
  console.log(`[${new Date().toLocaleTimeString()}] Incoming request: ${req.method} ${req.path}`);
  next(); // Fortsæt til næste middleware
  
  // Logger når response er sendt (finish event)
  res.on('finish', () => {
    const duration = Date.now() - start; // Beregner hvor lang tid request tog
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
});

// =============================================================================
// HTTP SERVER OPRETTELSE
// =============================================================================
const server = createServer(app); // Opretter HTTP server baseret på Express app
const PORT = process.env.PORT || 3000; // Port nummer (default 3000 hvis ikke sat i miljøvariabler)

// =============================================================================
// LIVE AKTIVITETS SYSTEM - WEBSOCKET REAL-TIME OPDATERINGER
// =============================================================================

// Interface der definerer strukturen af en live aktivitet
interface LiveActivity {
  id: string;        // Unik identifier for aktiviteten
  type: string;      // Type af aktivitet (case_created, customer_updated, etc.)
  message: string;   // Menneskelæselig besked om hvad der skete
  timestamp: string; // ISO timestamp for hvornår aktiviteten skete
  data: any;        // Ekstra data relateret til aktiviteten
}

// In-memory storage af live aktiviteter (gemmes kun i RAM under server kørsel)
const liveActivities: LiveActivity[] = [];
const MAX_ACTIVITIES = 50; // Begrænser hvor mange aktiviteter vi holder i hukommelsen

// WebSocket server til real-time kommunikation med frontend
const wss = new WebSocketServer({ server }); // Bruger samme HTTP server som REST API
const clients = new Set(); // Set af aktive WebSocket connections

// =============================================================================
// WEBSOCKET CONNECTION HANDLING
// =============================================================================
// Håndterer når en ny klient (browser) etablerer WebSocket forbindelse
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established'); // Logger ny forbindelse
  clients.add(ws); // Tilføjer klienten til vores active clients set
  
  // Send bekræftelse til klienten at forbindelsen er etableret
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Live aktivitet forbundet'
  }));
  
  // =============================================================================
  // SENDER HISTORISKE AKTIVITETER TIL NY KLIENT
  // =============================================================================
  // Når en ny bruger logger ind, sender vi de seneste aktiviteter
  if (liveActivities.length > 0) {
    console.log(`Sending ${liveActivities.length} recent activities to new client`);
    
    // Sender aktiviteter i omvendt rækkefølge (ældste først) så de vises kronologisk korrekt
    const activitiesToSend = [...liveActivities].reverse();
    
    // Sender hver aktivitet med lille forsinkelse for at undgå at overvælde klienten
    activitiesToSend.forEach((activity, index) => {
      setTimeout(() => {
        if (ws.readyState === 1) { // Checker om WebSocket stadig er åben (WebSocket.OPEN = 1)
          try {
            ws.send(JSON.stringify({
              type: 'historical_activity', // Markerer som historisk aktivitet
              ...activity // Spreader alle activity properties
            }));
          } catch (error) {
            console.error('Error sending historical activity:', error);
          }
        }
      }, index * 50); // 50ms forsinkelse mellem hver aktivitet
    });
  }
  
  // =============================================================================
  // WEBSOCKET EVENT HANDLERS
  // =============================================================================
  
  // Håndterer når klienten lukker forbindelsen
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    clients.delete(ws); // Fjerner klienten fra active clients
  });
  
  // Håndterer WebSocket fejl
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws); // Fjerner klienten ved fejl
  });
});

// =============================================================================
// LIVE AKTIVITETS FUNKTIONER
// =============================================================================

// Funktion til at tilføje en ny aktivitet til persistent lagring
function addLiveActivity(type: string, message: string, data: any) {
  // Opretter en ny aktivitet med unik ID og timestamp
  const activity: LiveActivity = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unik ID baseret på timestamp + random string
    type,
    message,
    timestamp: new Date().toISOString(), // ISO 8601 format timestamp
    data
  };
  
  // Tilføjer aktiviteten til begyndelsen af array (nyeste aktiviteter først)
  liveActivities.unshift(activity);
  
  // Begrænser antal aktiviteter i hukommelsen for at undgå memory leaks
  if (liveActivities.length > MAX_ACTIVITIES) {
    liveActivities.splice(MAX_ACTIVITIES); // Fjerner de ældste aktiviteter
  }
  
  console.log(`Added live activity: ${message} (Total: ${liveActivities.length})`);
  return activity; // Returnerer den oprettede aktivitet
}

// =============================================================================
// BROADCAST FUNKTION - SENDER LIVE OPDATERINGER TIL ALLE KLIENTER
// =============================================================================
// Denne funktion kaldes fra andre dele af applikationen når noget ændrer sig
export function broadcastLiveUpdate(type: string, data: any) {
  // Opretter payload der skal sendes til alle klienter
  const payload: any = {
    type,
    data,
    timestamp: new Date().toISOString()
  };
  
  // Hvis data indeholder et message felt, kopierer vi det til top-niveau for lettere adgang
  if (data && data.message) {
    payload.message = data.message;
  }
  
  // Tilføjer aktiviteten til persistent lagring
  const activity = addLiveActivity(type, payload.message || 'Live opdatering', data);
  
  // Konverterer payload til JSON string for transmission
  const message = JSON.stringify(payload);
  
  // Sender besked til alle aktive WebSocket klienter
  clients.forEach((client) => {
    if (client.readyState === 1) { // Checker om forbindelsen stadig er åben
      try {
        client.send(message); // Sender JSON message til klient
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        clients.delete(client); // Fjerner klient ved fejl
      }
    } else {
      clients.delete(client); // Fjerner lukket forbindelse
    }
  });
  
  console.log(`Live update broadcasted: ${type} to ${clients.size} clients`);
}

// =============================================================================
// API FUNKTION - HENTER SENESTE AKTIVITETER VIA HTTP
// =============================================================================
// Eksporteret funktion som kan bruges i API endpoints til at hente aktiviteter
export function getRecentActivities(limit: number = 20): LiveActivity[] {
  return liveActivities.slice(0, limit); // Returnerer de X nyeste aktiviteter
}

// =============================================================================
// SERVER STARTUP FUNKTION
// =============================================================================
// Hovedfunktion der initialiserer og starter hele serveren
const startServer = async () => {
  try {
    log("Starting server initialization..."); // Logger startup proces
    
    // =============================================================================
    // DATABASE CONNECTION TEST
    // =============================================================================
    
    // Tester rå PostgreSQL forbindelse
    try {
      await pool.query('SELECT 1'); // Simpel query for at teste forbindelse
      log("Raw database connection successful");
    } catch (error) {
      console.error("Database connection failed:", error);
      process.exit(1); // Afslutter applikation hvis database ikke er tilgængelig
    }

    // Tester Drizzle ORM forbindelse
    try {
      await db.select().from(users).limit(1); // Prøver at læse fra users tabellen
      log("Database connection successful");
    } catch (error) {
      console.error("Drizzle database connection failed:", error);
      process.exit(1); // Afslutter hvis Drizzle ikke kan forbinde
    }

    // =============================================================================
    // API RUTER REGISTRERING
    // =============================================================================
    // Registrerer alle vores API endpoints (cases, customers, orders, etc.)
    await registerRoutes(app);
    log("Routes registered successfully");

    // =============================================================================
    // FRONTEND SERVING SETUP
    // =============================================================================
    // Konfigurerer hvordan vi serverer frontend (enten built files eller Vite dev server)
    
    const clientDistPath = path.join(process.cwd(), 'client', 'dist'); // Path til byggede frontend filer
    const isProduction = process.env.NODE_ENV === 'production'; // Er vi i produktion?
    
    log(`Configured to use port: ${PORT}`);
    
    // Hvis frontend er bygget ELLER vi er i produktion
    if (fs.existsSync(clientDistPath) || isProduction) {
      log("Setting up static file serving for built frontend...");
      
      // Serverer statiske filer (HTML, CSS, JS) fra client/dist mappen
      app.use(express.static(clientDistPath));
      
      // =============================================================================
      // SPA ROUTING SUPPORT
      // =============================================================================
      // Catch-all handler til Single Page Application routing
      app.get('*', (req, res) => {
        // Spring API ruter over - de håndteres af registerRoutes()
        if (req.path.startsWith('/api')) {
          return res.status(404).json({ error: 'API endpoint not found' });
        }
        
        // For alle andre ruter, server index.html (SPA routing)
        const indexPath = path.join(clientDistPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath); // Sender frontend app til browseren
        } else {
          res.status(404).send('Frontend not built. Run: cd client && npm run build');
        }
      });
      
      log("Static file serving configured");
    } else {
      // =============================================================================
      // DEVELOPMENT MODE SETUP
      // =============================================================================
      // I udvikling forventer vi at frontend kører separat på port 5173 (Vite)
      log("Setting up API server (frontend forventes at køre på port 5173)...");
      await setupVite(app, server); // Sætter Vite middleware op (hvis nødvendigt)
      log("Vite server forventes at køre på port 5173. Vi starter ikke Vite middleware her.");
      log("API server setup complete");
    }

    // =============================================================================
    // PORT CLEANUP
    // =============================================================================
    // Forsøger at dræbe eventuelle processer der allerede kører på vores port
    try {
      await kill(Number(PORT));
      log(`Killed any existing process on port ${PORT}`);
    } catch (error) {
      // Ignorerer fejl hvis ingen proces kørte - det er okay
    }

    // =============================================================================
    // SERVER START MED RETRY LOGIC
    // =============================================================================
    let attempts = 0;
    const maxAttempts = 3;

    // Funktion der forsøger at starte serveren med retry logik
    const tryStartServer = () => {
      attempts++;
      log(`Starting server attempt ${attempts}/${maxAttempts}`);
      
      // =============================================================================
      // SERVER ERROR HANDLING
      // =============================================================================
      // Håndterer server fejl (fx port allerede i brug)
      server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`Port ${PORT} is already in use.`);
          if (attempts < maxAttempts) {
            console.log(`Retrying in 2 seconds... (attempt ${attempts + 1}/${maxAttempts})`);
            setTimeout(() => {
              server.close(); // Lukker server
              tryStartServer(); // Prøver igen
            }, 2000);
          } else {
            console.error('Max attempts reached. Exiting.');
            process.exit(1); // Giver op efter max forsøg
          }
        } else {
          console.error('Server error:', error);
          process.exit(1); // Afslutter ved andre fejl
        }
      });

      // =============================================================================
      // SERVER LYTNING - STARTER SERVEREN
      // =============================================================================
      // Starter serveren på alle netværksinterfaces (0.0.0.0) for netværksadgang
      server.listen(PORT, '0.0.0.0', () => {
        log(`Server successfully listening on port ${PORT}`);
        console.log(`\n========================================`);
        console.log(`🚀 SagsHub Server Running!`);
        console.log(`========================================`);
        console.log(`Local access: http://localhost:${PORT}`); // Lokal adgang
        console.log(`WebSocket: ws://localhost:${PORT}`); // WebSocket endpoint
        
        // =============================================================================
        // NETVÆRKS IP VISNING
        // =============================================================================
        // Viser alle tilgængelige netværks IP'er så andre kan forbinde
        const networkInterfaces = os.networkInterfaces();
        for (const name of Object.keys(networkInterfaces)) {
          for (const net of networkInterfaces[name]) {
            // Kun IPv4 adresser der ikke er interne (loopback)
            if (net.family === 'IPv4' && !net.internal) {
              console.log(`Network access: http://${net.address}:${PORT}`);
              console.log(`Network WebSocket: ws://${net.address}:${PORT}`);
            }
          }
        }
        console.log(`========================================\n`);
      });
    };

    tryStartServer(); // Starter server startup proces
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1); // Afslutter hvis noget går galt under startup
  }
};

// =============================================================================
// STARTER SERVEREN
// =============================================================================
startServer(); // Kalder hovedfunktionen der starter alt

// =============================================================================
// GLOBAL ERROR HANDLING MIDDLEWARE
// =============================================================================
// Fanger alle uventede fejl og sender pænt svar til klienten
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err); // Logger fejlen til konsol
  res.status(500).json({ 
    error: 'Der opstod en fejl på serveren', // Generisk fejlbesked til bruger
    message: process.env.NODE_ENV === 'development' ? err.message : undefined // Detaljeret fejl kun i development
  });
});