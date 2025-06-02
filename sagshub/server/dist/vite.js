import express from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const viteLogger = createLogger();
export function log(message, source = "express") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
    console.log(`${formattedTime} [${source}] ${message}`);
}
export async function setupVite(app, server) {
    // I stedet for at starte en Vite-server her, vil vi blot 
    // håndtere API-requests, da frontend kører på sin egen port (5173)
    log("Vite server forventes at køre på port 5173. Vi starter ikke Vite middleware her.");
    // For at undgå 404 fejl på API-routes, tilføjer vi en catch-all route
    app.get('/', (_req, res) => {
        res.send('API-server kører. Frontend forventes at køre på http://localhost:5173');
    });
}
export function serveStatic(app) {
    const distPath = path.resolve(__dirname, "public");
    if (!fs.existsSync(distPath)) {
        throw new Error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
    }
    app.use(express.static(distPath));
    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
        res.sendFile(path.resolve(distPath, "index.html"));
    });
}
