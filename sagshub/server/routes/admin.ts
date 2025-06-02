import { Router } from "express";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../auth";

const router = Router();

router.post("/update-password", async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: "Kun administratorer kan opdatere passwords" });
    }
    
    const hashedPassword = await hashPassword(newPassword);
    
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.username, username));
    
    res.json({ message: `Password opdateret for bruger ${username}` });
  } catch (error) {
    console.error("Fejl ved opdatering af password:", error);
    res.status(500).json({ error: "Kunne ikke opdatere password" });
  }
});

export default router; 