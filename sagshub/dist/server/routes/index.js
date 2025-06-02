"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const admin_1 = __importDefault(require("./admin"));
const storage_1 = require("../storage");
const schema_1 = require("../../shared/schema");
const auth_1 = require("../auth");
async function registerRoutes(app) {
    // Register admin routes
    app.use("/api/admin", admin_1.default);
    // Opdater bruger
    app.put("/api/users/:id", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isAdmin) {
            return res.status(403).json({ error: "Kun administratorer kan opdatere brugere" });
        }
        const { id } = req.params;
        const result = schema_1.insertUserSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json(result.error);
        }
        try {
            // Tjek om brugeren eksisterer
            const existingUser = await storage_1.storage.getUser(parseInt(id));
            if (!existingUser) {
                return res.status(404).json({ error: "Bruger ikke fundet" });
            }
            // Tjek om brugernavnet allerede er taget (hvis det er ændret)
            if (result.data.username !== existingUser.username) {
                const userWithUsername = await storage_1.storage.getUserByUsername(result.data.username);
                if (userWithUsername) {
                    return res.status(400).json({ error: "Brugernavn er allerede taget" });
                }
            }
            // Forbered data til opdatering
            const updateData = {
                username: result.data.username,
                name: result.data.name,
                isWorker: result.data.isWorker,
                isAdmin: result.data.isAdmin,
                birthday: result.data.birthday || null,
            };
            // Hash password hvis det er angivet
            if (result.data.password && result.data.password.length > 0) {
                updateData.password = await (0, auth_1.hashPassword)(result.data.password);
            }
            // Opdater brugeren
            const updatedUser = await storage_1.storage.updateUser(parseInt(id), updateData);
            res.json(updatedUser);
        }
        catch (error) {
            console.error("Error updating user:", error);
            res.status(500).json({ error: "Der opstod en fejl ved opdatering af brugeren" });
        }
    });
    // Slet bruger
    app.delete("/api/users/:id", async (req, res) => {
        if (!req.isAuthenticated() || !req.user.isAdmin) {
            return res.status(403).json({ error: "Kun administratorer kan slette brugere" });
        }
        const { id } = req.params;
        try {
            // Tjek om brugeren eksisterer
            const existingUser = await storage_1.storage.getUser(parseInt(id));
            if (!existingUser) {
                return res.status(404).json({ error: "Bruger ikke fundet" });
            }
            // Slet brugeren
            await storage_1.storage.deleteUser(parseInt(id));
            res.json({ message: "Bruger slettet" });
        }
        catch (error) {
            console.error("Error deleting user:", error);
            res.status(500).json({ error: "Der opstod en fejl ved sletning af brugeren" });
        }
    });
    // ... existing code ...
}
