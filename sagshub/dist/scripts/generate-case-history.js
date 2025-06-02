"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const da_1 = require("@faker-js/faker/locale/da");
const db_1 = require("../server/db");
const schema_1 = require("../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const HISTORY_COMMENTS = [
    'Sagen er oprettet',
    'Venter på reservedele',
    'Kontaktet kunden',
    'Afventer svar fra kunden',
    'Reparation påbegyndt',
    'Diagnosticering færdiggjort',
    'Test af reparation',
    'Klar til afhentning',
    'Kunden informeret',
    'Sagen afsluttet',
    'Kunden har hentet enheden',
    'Venter på godkendelse',
    'Tilbud sendt til kunden',
    'Tilbud godkendt',
    'Nye reservedele bestilt',
    'Reservedele modtaget',
    'Reparation gennemført',
    'Kvalitetskontrol udført',
    'Sagen annulleret'
];
async function generateCaseHistory() {
    try {
        console.log('Genererer historik for sager...');
        // Hent alle sager
        const allCases = await db_1.db.select().from(schema_1.cases);
        console.log(`Fandt ${allCases.length} sager`);
        for (const caseItem of allCases) {
            console.log(`Genererer historik for sag ${caseItem.caseNumber}`);
            const createdAt = new Date(caseItem.createdAt);
            const statusList = [CaseStatus.CREATED];
            let currentStatus = CaseStatus.CREATED;
            let currentDate = createdAt;
            // Generer mellem 2-5 statusændringer
            const numChanges = da_1.faker.number.int({ min: 2, max: 5 });
            console.log(`Genererer ${numChanges} statusændringer`);
            for (let i = 0; i < numChanges; i++) {
                // Vælg en ny status (ikke den samme som den nuværende)
                let newStatus;
                do {
                    newStatus = da_1.faker.helpers.arrayElement(Object.values(CaseStatus));
                } while (newStatus === currentStatus);
                console.log(`Ny status: ${newStatus}`);
                // Tilføj til historik
                statusList.push(newStatus);
                currentStatus = newStatus;
                // Generer en tilfældig dato mellem sidste ændring og nu
                currentDate = da_1.faker.date.between({
                    from: currentDate,
                    to: new Date()
                });
                // Generer en tilfældig kommentar
                const comment = da_1.faker.helpers.arrayElement(HISTORY_COMMENTS);
                try {
                    // Indsæt historikposten
                    console.log('Indsætter historikpost med data:', {
                        caseId: caseItem.id,
                        status: newStatus,
                        comment,
                        createdAt: currentDate,
                        createdBy: caseItem.createdBy
                    });
                    await db_1.db.insert(schema_1.statusHistory).values({
                        caseId: caseItem.id,
                        status: newStatus,
                        comment: comment,
                        createdAt: currentDate,
                        createdBy: caseItem.createdBy
                    });
                    console.log('Historikpost indsat');
                }
                catch (error) {
                    console.error('Fejl ved indsættelse af historikpost:', error);
                    throw error;
                }
            }
            try {
                // Opdater sagens nuværende status
                await db_1.db.update(schema_1.cases)
                    .set({
                    status: currentStatus,
                    updatedAt: currentDate
                })
                    .where((0, drizzle_orm_1.sql) `id = ${caseItem.id}`);
                console.log(`Status opdateret for sag ${caseItem.caseNumber}`);
            }
            catch (error) {
                console.error('Fejl ved opdatering af sagens status:', error);
                throw error;
            }
        }
        console.log('Historik genereret for alle sager');
        process.exit(0);
    }
    catch (error) {
        console.error('Fejl under generering af historik:', error);
        process.exit(1);
    }
}
// Start generering af historik
generateCaseHistory();
