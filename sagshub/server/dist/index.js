import express from "express";
import { registerRoutes } from "./routes.js";
import kill from "kill-port";
import "dotenv/config";
import cors from "cors";
import { logger } from "./logger.js";
import { setupAuth } from './auth.js';
import { createServer } from 'http';
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
// CORS configuration
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:3002"],
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
// Start server
const startServer = async () => {
    try {
        // Forsøg at dræbe eventuelle processer på port 3001
        try {
            await kill(3001);
            console.log('Killed any existing process on port 3001');
        }
        catch (error) {
            console.log('No process was running on port 3001');
        }
        // Setup authentication
        setupAuth(app);
        // Register routes directly on app
        await registerRoutes(app);
        // Create HTTP server
        const server = createServer(app);
        // Get port from environment or use fallback
        const PORT = 3001;
        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use. Please try a different port.`);
                process.exit(1);
            }
            else {
                console.error('Server error:', error);
                process.exit(1);
            }
        });
        // Start listening
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`API URL: http://localhost:${PORT}`);
            console.log('Frontend URL: http://localhost:5173');
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Der opstod en fejl på serveren',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
const port = process.env.PORT || 3002;
const server = createServer(app);
server.listen(port, () => {
    logger.info(`Server kører på port ${port}`);
});
