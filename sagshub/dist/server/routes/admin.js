"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const schema_1 = require("../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../auth");
const router = (0, express_1.Router)();
router.post("/update-password", async (req, res) => {
    try {
        const { username, newPassword } = req.body;
        if (!req.user?.isAdmin) {
            return res.status(403).json({ error: "Kun administratorer kan opdatere passwords" });
        }
        const hashedPassword = await (0, auth_1.hashPassword)(newPassword);
        await db_1.db.update(schema_1.users)
            .set({ password: hashedPassword })
            .where((0, drizzle_orm_1.eq)(schema_1.users.username, username));
        res.json({ message: `Password opdateret for bruger ${username}` });
    }
    catch (error) {
        console.error("Fejl ved opdatering af password:", error);
        res.status(500).json({ error: "Kunne ikke opdatere password" });
    }
});
exports.default = router;
