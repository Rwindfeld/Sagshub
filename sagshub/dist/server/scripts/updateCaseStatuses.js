"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storage_1 = require("../storage");
const statusFlow = {
    'created': {
        next: ['in_progress', 'offer_created'],
        comments: [
            'Sag oprettet og tildelt tekniker',
            'Påbegynder diagnose af enheden',
            'Opretter tilbud baseret på første vurdering'
        ]
    },
    'in_progress': {
        next: ['waiting_parts', 'preparing_delivery', 'offer_created'],
        comments: [
            'Reparation påbegyndt',
            'Afventer reservedele før vi kan fortsætte',
            'Klargør enhed til levering',
            'Opretter tilbud efter grundig gennemgang'
        ]
    },
    'offer_created': {
        next: ['waiting_customer', 'offer_accepted', 'offer_rejected'],
        comments: [
            'Tilbud sendt til kunde',
            'Kunde har accepteret tilbud',
            'Kunde har afvist tilbud'
        ]
    },
    'waiting_customer': {
        next: ['offer_accepted', 'offer_rejected'],
        comments: [
            'Afventer kundens godkendelse af tilbud',
            'Kunde har godkendt tilbuddet',
            'Kunde ønsker ikke at fortsætte med reparationen'
        ]
    },
    'waiting_parts': {
        next: ['in_progress'],
        comments: [
            'Reservedele bestilt',
            'Reservedele modtaget, fortsætter reparation'
        ]
    },
    'preparing_delivery': {
        next: ['ready_for_pickup'],
        comments: [
            'Færdiggør reparation',
            'Enheden er testet og klar til afhentning'
        ]
    },
    'ready_for_pickup': {
        next: ['completed'],
        comments: [
            'Klar til afhentning',
            'Kunde informeret om at enheden er klar'
        ]
    },
    'completed': {
        next: [],
        comments: [
            'Sag afsluttet',
            'Enhed afhentet af kunde'
        ]
    }
};
async function updateCaseStatuses() {
    try {
        console.log('Henter alle sager...');
        const cases = await storage_1.storage.getCases();
        for (const case_ of cases) {
            // Vælg tilfældigt antal statusopdateringer (1-4)
            const numberOfUpdates = Math.floor(Math.random() * 4) + 1;
            let currentStatus = case_.status || 'created';
            const caseUpdates = [];
            for (let i = 0; i < numberOfUpdates; i++) {
                // Hvis der ikke er flere mulige status, stop opdateringer for denne sag
                if (!statusFlow[currentStatus]?.next.length) {
                    break;
                }
                const possibleNextStatuses = statusFlow[currentStatus].next;
                const nextStatus = possibleNextStatuses[Math.floor(Math.random() * possibleNextStatuses.length)];
                const comments = statusFlow[currentStatus].comments;
                const comment = comments[Math.floor(Math.random() * comments.length)];
                // Tilføj opdateringen til array'en af promises
                caseUpdates.push(storage_1.storage.updateCaseStatusWithHistory(case_.id, nextStatus, comment, 1 // Admin user ID
                ));
                currentStatus = nextStatus;
                // Tilføj en lille forsinkelse mellem hver opdatering for samme sag
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            // Vent på at alle opdateringer for denne sag er færdige før vi går videre
            await Promise.all(caseUpdates);
            console.log(`Opdateret status for sag ${case_.id}`);
        }
        console.log('Alle sager er blevet opdateret med nye statusser og historik');
    }
    catch (error) {
        console.error('Fejl under opdatering af sager:', error);
    }
}
// Kør funktionen og vent på at den er færdig
updateCaseStatuses().then(() => {
    console.log('Script færdigt');
    process.exit(0);
}).catch((error) => {
    console.error('Fejl i script:', error);
    process.exit(1);
});
