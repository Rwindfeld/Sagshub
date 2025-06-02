"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const routes_js_1 = require("./routes.js");
const vite_js_1 = require("./vite.js");
const db_js_1 = require("./db.js");
const kill_port_1 = __importDefault(require("kill-port"));
const schema_js_1 = require("../shared/schema.js");
require("dotenv/config");
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Set required environment variables if not set
if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = 'your-secret-key-here';
}
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
}
const app = (0, express_1.default)();
// Body parser middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// CORS configuration - tillad alle origins for netværksadgang
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
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
const server = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 3000;
// Start server
const startServer = async () => {
    try {
        (0, vite_js_1.log)("Starting server initialization...");
        // Test database connection
        try {
            await db_js_1.pool.query('SELECT 1');
            (0, vite_js_1.log)("Raw database connection successful");
        }
        catch (error) {
            console.error("Database connection failed:", error);
            process.exit(1);
        }
        // Test drizzle connection
        try {
            await db_js_1.db.select().from(schema_js_1.users).limit(1);
            (0, vite_js_1.log)("Database connection successful");
        }
        catch (error) {
            console.error("Drizzle database connection failed:", error);
            process.exit(1);
        }
        // Register API routes
        await (0, routes_js_1.registerRoutes)(app);
        (0, vite_js_1.log)("Routes registered successfully");
        // Serve static files in production or if client/dist exists
        const clientDistPath = path_1.default.join(process.cwd(), 'client', 'dist');
        const isProduction = process.env.NODE_ENV === 'production';
        (0, vite_js_1.log)(`Configured to use port: ${PORT}`);
        if (fs_1.default.existsSync(clientDistPath) || isProduction) {
            (0, vite_js_1.log)("Setting up static file serving for built frontend...");
            // Serve static files from client/dist
            app.use(express_1.default.static(clientDistPath));
            // Catch-all handler for SPA routing
            app.get('*', (req, res) => {
                // Skip API routes
                if (req.path.startsWith('/api')) {
                    return res.status(404).json({ error: 'API endpoint not found' });
                }
                const indexPath = path_1.default.join(clientDistPath, 'index.html');
                if (fs_1.default.existsSync(indexPath)) {
                    res.sendFile(indexPath);
                }
                else {
                    res.status(404).send('Frontend not built. Run: cd client && npm run build');
                }
            });
            (0, vite_js_1.log)("Static file serving configured");
        }
        else {
            (0, vite_js_1.log)("Setting up API server (frontend forventes at køre på port 5173)...");
            await (0, vite_js_1.setupVite)(app, server);
            (0, vite_js_1.log)("Vite server forventes at køre på port 5173. Vi starter ikke Vite middleware her.");
            (0, vite_js_1.log)("API server setup complete");
        }
        // Forsøg at dræbe eventuelle processer på port
        try {
            await (0, kill_port_1.default)(Number(PORT));
            (0, vite_js_1.log)(`Killed any existing process on port ${PORT}`);
        }
        catch (error) {
            // Ignore error if no process was running
        }
        let attempts = 0;
        const maxAttempts = 3;
        const tryStartServer = () => {
            attempts++;
            (0, vite_js_1.log)(`Starting server attempt ${attempts}/${maxAttempts}`);
            // Handle server errors
            server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    console.error(`Port ${PORT} is already in use.`);
                    if (attempts < maxAttempts) {
                        console.log(`Retrying in 2 seconds... (attempt ${attempts + 1}/${maxAttempts})`);
                        setTimeout(() => {
                            server.close();
                            tryStartServer();
                        }, 2000);
                    }
                    else {
                        console.error('Max attempts reached. Exiting.');
                        process.exit(1);
                    }
                }
                else {
                    console.error('Server error:', error);
                    process.exit(1);
                }
            });
            // Start listening på alle interfaces (0.0.0.0) for netværksadgang
            server.listen(PORT, '0.0.0.0', () => {
                (0, vite_js_1.log)(`Server successfully listening on port ${PORT}`);
                console.log(`\n========================================`);
                console.log(`🚀 SagsHub Server Running!`);
                console.log(`========================================`);
                console.log(`Local access: http://localhost:${PORT}`);
                // Vis netværks IP for eksterne forbindelser
                const os = require('os');
                const networkInterfaces = os.networkInterfaces();
                for (const name of Object.keys(networkInterfaces)) {
                    for (const net of networkInterfaces[name]) {
                        if (net.family === 'IPv4' && !net.internal) {
                            console.log(`Network access: http://${net.address}:${PORT}`);
                        }
                    }
                }
                console.log(`========================================\n`);
            });
        };
        tryStartServer();
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Der opstod en fejl på serveren',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
