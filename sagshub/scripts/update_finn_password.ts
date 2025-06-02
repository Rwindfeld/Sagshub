import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../server/auth";

async function updateFinnPassword() {
  try {
    const newPassword = "NytSikkertPassword123";
    const hashedPassword = await hashPassword(newPassword);
    
    // Opdater Finn's password i databasen
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.username, "Finn"));
    
    console.log("Finn's password er blevet opdateret med succes!");
    process.exit(0);
  } catch (error) {
    console.error("Fejl ved opdatering af password:", error);
    process.exit(1);
  }
}

updateFinnPassword(); 