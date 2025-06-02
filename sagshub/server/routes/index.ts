import { Express } from "express";
import adminRouter from "./admin";
import { storage } from "../storage";
import { insertUserSchema } from "../../shared/schema";
import { hashPassword } from "../auth";

export async function registerRoutes(app: Express) {
  // Register admin routes
  app.use("/api/admin", adminRouter);
  
  // Opdater bruger
  app.put("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(403).json({ error: "Kun administratorer kan opdatere brugere" });
    }

    const { id } = req.params;
    const result = insertUserSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json(result.error);
    }

    try {
      // Tjek om brugeren eksisterer
      const existingUser = await storage.getUser(parseInt(id));
      if (!existingUser) {
        return res.status(404).json({ error: "Bruger ikke fundet" });
      }

      // Tjek om brugernavnet allerede er taget (hvis det er ændret)
      if (result.data.username !== existingUser.username) {
        const userWithUsername = await storage.getUserByUsername(result.data.username);
        if (userWithUsername) {
          return res.status(400).json({ error: "Brugernavn er allerede taget" });
        }
      }

      // Forbered data til opdatering
      const updateData: any = {
        username: result.data.username,
        name: result.data.name,
        isWorker: result.data.isWorker,
        isAdmin: result.data.isAdmin,
        birthday: result.data.birthday || null,
      };

      // Hash password hvis det er angivet
      if (result.data.password && result.data.password.length > 0) {
        updateData.password = await hashPassword(result.data.password);
      }

      // Opdater brugeren
      const updatedUser = await storage.updateUser(parseInt(id), updateData);

      res.json(updatedUser);
    } catch (error) {
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
      const existingUser = await storage.getUser(parseInt(id));
      if (!existingUser) {
        return res.status(404).json({ error: "Bruger ikke fundet" });
      }

      // Slet brugeren
      await storage.deleteUser(parseInt(id));
      res.json({ message: "Bruger slettet" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Der opstod en fejl ved sletning af brugeren" });
    }
  });

  // ... existing code ...
} 