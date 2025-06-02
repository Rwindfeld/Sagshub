"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../server/db");
const drizzle_orm_1 = require("drizzle-orm");
async function findAndUpdateEnglishCases() {
    try {
        // Find sager med engelsk tekst
        const result = await db_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT id, case_number, description, important_notes 
      FROM cases 
      WHERE (description ~ '[a-zA-Z]{4,}' AND description !~ '[æøåÆØÅ]')
      OR (important_notes ~ '[a-zA-Z]{4,}' AND important_notes !~ '[æøåÆØÅ]')
    `);
        console.log('Fandt følgende sager med engelsk tekst:');
        console.log(result.rows);
        // Her kan vi tilføje kode til at opdatere sagerne til dansk
        // For eksempel:
        // for (const case_ of result.rows) {
        //   await db.update(cases)
        //     .set({ 
        //       description: translateToDanish(case_.description),
        //       important_notes: translateToDanish(case_.important_notes)
        //     })
        //     .where(eq(cases.id, case_.id));
        // }
    }
    catch (error) {
        console.error('Fejl ved søgning efter engelske sager:', error);
    }
    finally {
        process.exit();
    }
}
findAndUpdateEnglishCases();
