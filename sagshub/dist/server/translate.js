"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateText = translateText;
exports.findAndTranslateEnglishCases = findAndTranslateEnglishCases;
const db_1 = require("./db");
const schema_1 = require("../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_orm_2 = require("drizzle-orm");
const commonEnglishToDanish = {
    "This": "Dette",
    "is": "er",
    "the": "den",
    "laptop": "bærbar",
    "computer": "computer",
    "repair": "reparation",
    "screen": "skærm",
    "keyboard": "tastatur",
    "battery": "batteri",
    "broken": "i stykker",
    "damaged": "beskadiget",
    "replaced": "udskiftet",
    "needs": "behøver",
    "replacement": "udskiftning",
    "fixed": "repareret",
    "not": "ikke",
    "working": "virker",
    "problem": "problem",
    "with": "med",
    "customer": "kunde",
    "requested": "anmodet om",
    "warranty": "garanti",
    "case": "sag",
    "important": "vigtigt",
    "note": "bemærkning",
    "please": "venligst",
    "check": "tjek",
    "test": "test",
    "tested": "testet",
    "testing": "tester",
    "completed": "færdig",
    "waiting": "venter",
    "for": "på",
    "parts": "dele",
    "received": "modtaget",
    "sent": "sendt",
    "back": "tilbage",
    "approved": "godkendt",
    "rejected": "afvist",
    "pending": "afventer",
    "status": "status",
    "update": "opdatering",
    "updated": "opdateret",
    "new": "ny",
    "old": "gammel",
    "replaced": "udskiftet",
    "installed": "installeret",
    "removed": "fjernet",
    "cleaned": "rengjort",
    "repaired": "repareret",
    "diagnosed": "diagnosticeret",
    "diagnosis": "diagnose",
    "found": "fundet",
    "issue": "problem",
    "issues": "problemer",
    "resolved": "løst",
    "unresolved": "uløst",
    "setup": "opsætning",
    "configured": "konfigureret",
    "configuration": "konfiguration",
    "settings": "indstillinger",
    "changed": "ændret",
    "modified": "modificeret",
    "ready": "klar",
    "done": "færdig",
    "finished": "afsluttet",
    "started": "påbegyndt",
    "beginning": "begyndelse",
    "end": "slut",
    "ending": "afslutning",
    "middle": "midte",
    "process": "proces",
    "processing": "behandler",
    "processed": "behandlet"
};
const commonLatinToDanish = {
    // Almindelige latinske ord
    "lorem": "tekst",
    "ipsum": "selv",
    "dolor": "smerte",
    "sit": "sidder",
    "amet": "elsker",
    "consectetur": "konsekvens",
    "adipiscing": "fedme",
    "elit": "elite",
    "sed": "men",
    "eiusmod": "udvalgt",
    "tempor": "midlertidig",
    "incididunt": "hændelse",
    "labore": "arbejde",
    "magna": "stor",
    "aliqua": "nogle",
    "enim": "nemlig",
    "minim": "minimum",
    "veniam": "tilgivelse",
    "quis": "hvem",
    "nostrud": "vores",
    "exercitation": "øvelse",
    "ullamco": "yderste",
    "laboris": "arbejde",
    "nisi": "medmindre",
    "aliquip": "opnå",
    "commodo": "bekvem",
    "consequat": "følge",
    "duis": "mens",
    "aute": "eller",
    "irure": "vred",
    "reprehenderit": "irettesætte",
    "voluptate": "fornøjelse",
    "velit": "ønsker",
    "esse": "være",
    "cillum": "himmel",
    "dolore": "smerte",
    "fugiat": "flygte",
    "nulla": "ingen",
    "pariatur": "lige",
    "excepteur": "undtagen",
    "sint": "er",
    "occaecat": "skjult",
    "cupidatat": "begær",
    "non": "ikke",
    "proident": "forudseende",
    "sunt": "er",
    "culpa": "skyld",
    "officia": "pligt",
    "deserunt": "fortjener",
    "mollit": "blød",
    "anim": "sjæl",
    "laborum": "arbejde",
    // Tekniske latinske termer
    "nullam": "ingen",
    "eget": "har",
    "felis": "kat",
    "vitae": "liv",
    "justo": "retfærdig",
    "fringilla": "frynse",
    "aliquet": "andet",
    "nec": "ej",
    "vulputate": "rive",
    "egestas": "behov",
    "congue": "samle",
    "quisque": "enhver",
    "sagittis": "pil",
    "purus": "ren",
    "semper": "altid",
    "viverra": "levende",
    "nam": "for",
    "arcu": "bue",
    "cursus": "kurs",
    "euismod": "god",
    // Tilføjer de engelske ord fra før
    ...commonEnglishToDanish
};
function translateText(text) {
    if (!text)
        return text;
    // Split text into words
    let words = text.split(/\b/);
    // Translate each word if it exists in the dictionary
    words = words.map(word => {
        const lowerWord = word.toLowerCase();
        if (commonLatinToDanish[lowerWord]) {
            // Preserve original capitalization
            if (word[0] === word[0].toUpperCase()) {
                return commonLatinToDanish[lowerWord].charAt(0).toUpperCase() +
                    commonLatinToDanish[lowerWord].slice(1);
            }
            return commonLatinToDanish[lowerWord];
        }
        return word;
    });
    return words.join('');
}
async function findAndTranslateEnglishCases() {
    try {
        // Find sager med engelsk eller latinsk tekst
        const result = await db_1.db.execute((0, drizzle_orm_2.sql) `
      SELECT id, case_number, description, important_notes 
      FROM cases 
      WHERE (description ~ '[a-zA-Z]{4,}' AND description !~ '[æøåÆØÅ]')
      OR (important_notes ~ '[a-zA-Z]{4,}' AND important_notes !~ '[æøåÆØÅ]')
    `);
        console.log('Fandt følgende sager med engelsk/latinsk tekst:');
        console.log(result.rows);
        // Opdater hver sag med dansk oversættelse
        for (const case_ of result.rows) {
            const translatedDescription = translateText(case_.description);
            const translatedNotes = case_.important_notes ? translateText(case_.important_notes) : null;
            if (translatedDescription !== case_.description ||
                (translatedNotes && translatedNotes !== case_.important_notes)) {
                await db_1.db.update(schema_1.cases)
                    .set({
                    description: translatedDescription,
                    important_notes: translatedNotes,
                    updatedAt: new Date()
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.cases.id, case_.id));
                console.log(`Opdaterede sag ${case_.case_number}:`);
                console.log('Gammel beskrivelse:', case_.description);
                console.log('Ny beskrivelse:', translatedDescription);
                if (case_.important_notes) {
                    console.log('Gamle bemærkninger:', case_.important_notes);
                    console.log('Nye bemærkninger:', translatedNotes);
                }
            }
        }
        return result.rows;
    }
    catch (error) {
        console.error('Fejl ved oversættelse af sager:', error);
        throw error;
    }
}
