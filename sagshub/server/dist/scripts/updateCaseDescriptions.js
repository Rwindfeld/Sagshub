import { storage } from '../storage';
import { db } from '../db';
import { cases } from '../schema';
import { eq } from 'drizzle-orm';
const danskeBeskrivelser = [
    'Enheden tænder ikke. Ved forsøg på at starte høres en kliklyd, men skærmen forbliver sort.',
    'Skærmen viser forvrængede farver og flimrer ved brug. Problemet er blevet værre over de sidste par dage.',
    'Tastaturet reagerer ikke konsistent. Nogle taster skal trykkes meget hårdt for at registrere input.',
    'Batteriet holder kun strøm i cirka 30 minutter efter fuld opladning. Tidligere holdt det 4-5 timer.',
    'Enheden bliver meget varm under brug og lukker nogle gange ned uden varsel.',
    'Wi-Fi forbindelsen falder jævnligt ud, selv når andre enheder har god forbindelse.',
    'Der kommer ingen lyd fra højtalerne, selvom lydstyrken er skruet op og drivere er opdateret.',
    'USB-portene registrerer ikke eksterne enheder. Problemet opstår med alle typer USB-enheder.',
    'Printeren udskriver dokumenter med striber og manglende farver. Patronerne er nye.',
    'Computeren er meget langsom ved opstart og under almindelig brug af programmer.',
    'Harddisken laver høje klikkelyde under brug og nogle filer kan ikke åbnes.',
    'Blæseren støjer meget mere end normalt og kører konstant på høj hastighed.',
    'Touchpad\'en reagerer uregelmæssigt og markøren springer rundt på skærmen.',
    'CD/DVD-drevet vil ikke åbne/lukke og genkender ikke indsatte diske.',
    'Programmet crasher jævnligt under brug, især når der arbejdes med større filer.'
];
async function updateCaseDescriptions() {
    try {
        console.log('Henter alle sager...');
        const cases_ = await storage.getCases();
        for (const case_ of cases_) {
            const newDescription = danskeBeskrivelser[Math.floor(Math.random() * danskeBeskrivelser.length)];
            await db.update(cases)
                .set({
                description: newDescription,
                updatedAt: new Date()
            })
                .where(eq(cases.id, case_.id));
            console.log(`Opdateret beskrivelse for sag ${case_.id}`);
            // Tilføj en lille forsinkelse for at undgå at overbelaste databasen
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log('Alle sager er blevet opdateret med danske beskrivelser');
    }
    catch (error) {
        console.error('Fejl under opdatering af sagsbeskrivelser:', error);
    }
}
updateCaseDescriptions();
