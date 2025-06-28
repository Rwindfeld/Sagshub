// =============================================================================
// SAGSHUB SERVER VITE INTEGRATION
// =============================================================================
// Denne fil håndterer integration mellem Express server og Vite frontend i production og indeholder:
// - Vite build integration til server
// - Static file serving fra Vite dist
// - SPA fallback til React Router
// - Production optimering af frontend assets
// - Development og production miljø håndtering
// =============================================================================

// =================================================================
// CORE IMPORTS
// =================================================================
import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config.js";
import { nanoid } from "nanoid";

// const viteLogger = createLogger(); // Removed due to compatibility

// =================================================================
// ES MODULES PATH RESOLUTION
// =================================================================
// Konverterer import.meta.url til __dirname equivalent i ES modules
const __filename = fileURLToPath(import.meta.url);            // Nuværende fil sti
const __dirname = dirname(__filename);                   // Directory sti

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // =============================================================
  // PRODUCTION STATIC FILE SERVING
  // =============================================================
  // I production serveres pre-built frontend assets fra dist mappen
  
  // Client dist directory sti (bygget af Vite)
  const clientDistPath = path.join(__dirname, '../client/dist'); // Vite build output directory
  
  // Serverer static assets (CSS, JS, images)
  app.use('/assets', express.static(path.join(clientDistPath, 'assets'))); // Optimerede assets fra Vite build
  
  // =============================================================
  // SPA FALLBACK MIDDLEWARE
  // =============================================================
  // Alle routes der ikke matcher API endpoints skal servere index.html
  // Dette sikrer at React Router kan håndtere client-side routing
  app.get('*', (req, res, next) => {
    // Skip hvis det er API route
    if (req.path.startsWith('/api')) {
      return next();                                          // Lad API routes håndteres af andre middleware
    }
    
    // Servér React SPA index.html for alle andre routes
    const indexPath = path.join(clientDistPath, 'index.html'); // Vite byggede index.html
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Fejl ved serving af index.html:', err); // Log fejl hvis fil ikke findes
        res.status(500).send('Server fejl');                 // Fallback fejl response
      }
    });
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
