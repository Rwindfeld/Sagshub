import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { db, pool } from "./db.js";
import kill from "kill-port";
import { users } from "../shared/schema.js";
import "dotenv/config";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import os from "os";
import { WebSocketServer } from "ws";

// Set required environment variables if not set
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'your-secret-key-here';
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration - tillad alle origins for netværksadgang
app.use(cors({
  origin: function(origin, callback) {
    // Tillad alle origins (for .exe distribution)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toLocaleTimeString()}] Incoming request: ${req.method} ${req.path}`);
  next();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
});

// Create HTTP server
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// WebSocket server for live aktivitet
const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established');
  clients.add(ws);
  
  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Live aktivitet forbundet'
  }));
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    clients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Funktion til at broadcaste live opdateringer
export function broadcastLiveUpdate(type: string, data: any) {
  const payload: any = {
    type,
    data,
    timestamp: new Date().toISOString()
  };
  
  // Hvis data har et message felt, hiv det op på top-niveau
  if (data && data.message) {
    payload.message = data.message;
  }
  
  const message = JSON.stringify(payload);
  
  clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(message);
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        clients.delete(client);
      }
    } else {
      clients.delete(client);
    }
  });
  
  console.log(`Live update broadcasted: ${type} to ${clients.size} clients`);
}

// Start server
const startServer = async () => {
  try {
    log("Starting server initialization...");
    
    // Test database connection
    try {
      await pool.query('SELECT 1');
      log("Raw database connection successful");
    } catch (error) {
      console.error("Database connection failed:", error);
      process.exit(1);
    }

    // Test drizzle connection
    try {
      await db.select().from(users).limit(1);
      log("Database connection successful");
    } catch (error) {
      console.error("Drizzle database connection failed:", error);
      process.exit(1);
    }

    // Register API routes
    await registerRoutes(app);
    log("Routes registered successfully");

    // Serve static files in production or if client/dist exists
    const clientDistPath = path.join(process.cwd(), 'client', 'dist');
    const isProduction = process.env.NODE_ENV === 'production';
    
    log(`Configured to use port: ${PORT}`);
    
    if (fs.existsSync(clientDistPath) || isProduction) {
      log("Setting up static file serving for built frontend...");
      
      // Serve static files from client/dist
      app.use(express.static(clientDistPath));
      
      // Catch-all handler for SPA routing
      app.get('*', (req, res) => {
        // Skip API routes
        if (req.path.startsWith('/api')) {
          return res.status(404).json({ error: 'API endpoint not found' });
        }
        
        const indexPath = path.join(clientDistPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('Frontend not built. Run: cd client && npm run build');
        }
      });
      
      log("Static file serving configured");
    } else {
      log("Setting up API server (frontend forventes at køre på port 5173)...");
      await setupVite(app, server);
      log("Vite server forventes at køre på port 5173. Vi starter ikke Vite middleware her.");
      log("API server setup complete");
    }

    // Forsøg at dræbe eventuelle processer på port
    try {
      await kill(Number(PORT));
      log(`Killed any existing process on port ${PORT}`);
    } catch (error) {
      // Ignore error if no process was running
    }

    let attempts = 0;
    const maxAttempts = 3;

    const tryStartServer = () => {
      attempts++;
      log(`Starting server attempt ${attempts}/${maxAttempts}`);
      
      // Handle server errors
      server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`Port ${PORT} is already in use.`);
          if (attempts < maxAttempts) {
            console.log(`Retrying in 2 seconds... (attempt ${attempts + 1}/${maxAttempts})`);
            setTimeout(() => {
              server.close();
              tryStartServer();
            }, 2000);
          } else {
            console.error('Max attempts reached. Exiting.');
            process.exit(1);
          }
        } else {
          console.error('Server error:', error);
          process.exit(1);
        }
      });

      // Start listening på alle interfaces (0.0.0.0) for netværksadgang
      server.listen(PORT, '0.0.0.0', () => {
        log(`Server successfully listening on port ${PORT}`);
        console.log(`\n========================================`);
        console.log(`🚀 SagsHub Server Running!`);
        console.log(`========================================`);
        console.log(`Local access: http://localhost:${PORT}`);
        console.log(`WebSocket: ws://localhost:${PORT}`);
        
        // Vis netværks IP for eksterne forbindelser
        const networkInterfaces = os.networkInterfaces();
        for (const name of Object.keys(networkInterfaces)) {
          for (const net of networkInterfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
              console.log(`Network access: http://${net.address}:${PORT}`);
              console.log(`Network WebSocket: ws://${net.address}:${PORT}`);
            }
          }
        }
        console.log(`========================================\n`);
      });
    };

    tryStartServer();
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Der opstod en fejl på serveren',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});