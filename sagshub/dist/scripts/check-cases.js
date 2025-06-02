"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../server/db");
const schema_1 = require("../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
async function checkCases() {
    try {
        console.log('Checker sager fra hver behandlingstype...\n');
        // Check reparationssager
        const repairCases = await db_1.db.select()
            .from(schema_1.cases)
            .where((0, drizzle_orm_1.sql) `case_number LIKE 'REP%'`)
            .orderBy(schema_1.cases.caseNumber)
            .limit(3);
        console.log('Første 3 reparationssager:');
        repairCases.forEach(c => {
            console.log(`${c.caseNumber} - ${c.title}`);
            console.log(`Beskrivelse: ${c.description}\n`);
        });
        // Check klargøringssager
        const setupCases = await db_1.db.select()
            .from(schema_1.cases)
            .where((0, drizzle_orm_1.sql) `case_number LIKE 'KLA%'`)
            .orderBy(schema_1.cases.caseNumber)
            .limit(3);
        console.log('Første 3 klargøringssager:');
        setupCases.forEach(c => {
            console.log(`${c.caseNumber} - ${c.title}`);
            console.log(`Beskrivelse: ${c.description}\n`);
        });
        // Check reklamationssager
        const warrantyCases = await db_1.db.select()
            .from(schema_1.cases)
            .where((0, drizzle_orm_1.sql) `case_number LIKE 'REK%'`)
            .orderBy(schema_1.cases.caseNumber)
            .limit(3);
        console.log('Første 3 reklamationssager:');
        warrantyCases.forEach(c => {
            console.log(`${c.caseNumber} - ${c.title}`);
            console.log(`Beskrivelse: ${c.description}\n`);
        });
        // Check andre sager
        const otherCases = await db_1.db.select()
            .from(schema_1.cases)
            .where((0, drizzle_orm_1.sql) `case_number LIKE 'AND%'`)
            .orderBy(schema_1.cases.caseNumber)
            .limit(3);
        console.log('Første 3 andre sager:');
        otherCases.forEach(c => {
            console.log(`${c.caseNumber} - ${c.title}`);
            console.log(`Beskrivelse: ${c.description}\n`);
        });
        // Vis total antal for hver type
        const counts = await db_1.db.select({
            type: (0, drizzle_orm_1.sql) `SUBSTRING(case_number, 1, 3)`,
            count: (0, drizzle_orm_1.sql) `COUNT(*)`
        })
            .from(schema_1.cases)
            .groupBy((0, drizzle_orm_1.sql) `SUBSTRING(case_number, 1, 3)`);
        console.log('\nTotal antal sager per type:');
        counts.forEach(c => {
            console.log(`${c.type}: ${c.count}`);
        });
        process.exit(0);
    }
    catch (error) {
        console.error('Fejl under check af sager:', error);
        process.exit(1);
    }
}
// Start check af sager
checkCases();
