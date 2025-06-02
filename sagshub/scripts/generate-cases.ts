import { faker } from '@faker-js/faker/locale/da';
import { db } from '../server/db';
import { cases, customers, users } from '../shared/schema';
import { format } from 'date-fns';
import { sql, eq } from 'drizzle-orm';

const TOTAL_CASES = 3000;

// Tællere til case numre
let repCounter = 1;
let klaCounter = 1;
let andCounter = 1;
let rekCounter = 1;

// Liste af realistiske danske beskrivelser
const CASE_DESCRIPTIONS = [
  'Kundens computer starter ikke op. Der høres en kliklyd når der trykkes på power knappen, men skærmen forbliver sort. Strømforsyning er testet og virker.',
  'Laptop er meget langsom ved opstart og under almindelig brug. Windows opdateringer fejler ofte. Kunde ønsker systemet optimeret og renset for unødvendige programmer.',
  'Printer vil ikke forbinde til det trådløse netværk. Fejlkode vises på display. Kunde har allerede prøvet at genstarte printeren flere gange uden held.',
  'Blå skærm opstår tilfældigt under brug. Fejlkode: MEMORY_MANAGEMENT. Kunde har ikke oplevet problemer før sidste Windows opdatering.',
  'Harddisk laver høje klikkelyde under brug. Kunde ønsker data sikkerhedskopieret og disk tjekket for fejl. Computer er 3 år gammel.',
  'Kunde ønsker opgraderet RAM og SSD i stedet for traditionel harddisk. Computer bruges primært til foto- og videoredigering.',
  'Kølesystemet støjer meget og computer bliver meget varm. Kunde har selv prøvet at støvsuge ventilationen uden forbedring.',
  'Tastatur reagerer ikke på alle tastetryk. Flere taster skal trykkes hårdt ned for at virke. Ønsker tastaturet udskiftet.',
  'Skærm har udviklet en lodret streg af døde pixels. Garantisag, kvittering er vedlagt. Produkt er 11 måneder gammelt.',
  'Computer fryser når der spilles spil. Grafikkort temperatur når kritiske niveauer. Kunde ønsker køling efterset.',
  'Batteri holder kun strøm i ca. 30 minutter. Oprindelig kapacitet var 4-5 timer. Laptop er 2 år gammel.',
  'Windows vil ikke starte efter strømafbrydelse. Fejlmeddelelse om manglende boot device. Vigtige dokumenter på harddisken skal reddes.',
  'Kunde ønsker komplet systemgennemgang og oprydning. Mange programmer starter automatisk op, og der er mistanke om virus.',
  'Netværksforbindelse falder ud flere gange dagligt. Problemet opstår på både kabel og WiFi. Router er allerede udskiftet uden effekt.',
  'Ny printer skal installeres og konfigureres i netværk. Skal kunne bruges fra flere computere. Scanner funktion skal også opsættes.'
];

const TreatmentType = {
  REPAIR: 'repair',
  WARRANTY: 'warranty',
  SETUP: 'setup',
  OTHER: 'other'
} as const;

const PriorityType = {
  FREE_DIAGNOSIS: 'free_diagnosis',
  FOUR_DAYS: 'four_days',
  FIRST_PRIORITY: 'first_priority',
  ASAP: 'asap'
} as const;

const DeviceType = {
  LAPTOP: 'laptop',
  PC: 'pc',
  PRINTER: 'printer',
  OTHER: 'other'
} as const;

const CaseStatus = {
  CREATED: 'created',
  IN_PROGRESS: 'in_progress',
  OFFER_CREATED: 'offer_created',
  WAITING_CUSTOMER: 'waiting_customer',
  OFFER_ACCEPTED: 'offer_accepted',
  OFFER_REJECTED: 'offer_rejected',
  WAITING_PARTS: 'waiting_parts',
  PREPARING_DELIVERY: 'preparing_delivery',
  READY_FOR_PICKUP: 'ready_for_pickup',
  COMPLETED: 'completed',
} as const;

// Funktion til at generere case nummer baseret på behandlingstype
function generateCaseNumber(treatment: string): string {
  switch (treatment) {
    case 'repair':
      return `REP${repCounter++.toString().padStart(5, '0')}`;
    case 'setup':
      return `KLA${klaCounter++.toString().padStart(5, '0')}`;
    case 'warranty':
      return `REK${rekCounter++.toString().padStart(5, '0')}`;
    case 'other':
      return `AND${andCounter++.toString().padStart(5, '0')}`;
    default:
      throw new Error(`Ukendt behandlingstype: ${treatment}`);
  }
}

async function generateCases() {
  try {
    // Nulstil tællere
    repCounter = 1;
    klaCounter = 1;
    rekCounter = 1;
    andCounter = 1;

    // Hent alle eksisterende kunder
    const existingCustomers = await db.select().from(customers);
    
    if (existingCustomers.length === 0) {
      console.error('Ingen kunder fundet i databasen');
      return;
    }

    // Hent en worker bruger til at oprette sagerne
    const worker = await db.select().from(users).where(eq(users.isWorker, true)).limit(1);
    
    if (!worker || worker.length === 0) {
      console.error('Ingen worker bruger fundet');
      return;
    }

    console.log(`Genererer ${TOTAL_CASES} sager...`);

    for (let i = 0; i < TOTAL_CASES; i++) {
      const customer = faker.helpers.arrayElement(existingCustomers);
      
      // Generer tilfældig dato inden for de sidste 2 år
      const createdAt = faker.date.past({ years: 2 });
      const updatedAt = faker.date.between({ 
        from: createdAt, 
        to: new Date() 
      });

      try {
        // Vælg behandlingstype først, så vi kan generere det korrekte case nummer
        const treatment = faker.helpers.arrayElement(Object.values(TreatmentType));
        
        // Opret sagen
        await db.insert(cases).values({
          customerId: customer.id,
          caseNumber: generateCaseNumber(treatment),
          title: faker.helpers.arrayElement([
            'Skærm virker ikke',
            'Computeren starter ikke',
            'Blækpatroner skal skiftes',
            'Virus scanning',
            'Backup af data',
            'Windows opdatering',
            'Hardware opgradering',
            'Software installation',
            'Internet problemer',
            'Keyboard udskiftning'
          ]),
          description: faker.helpers.arrayElement(CASE_DESCRIPTIONS),
          treatment: treatment,
          priority: faker.helpers.arrayElement(Object.values(PriorityType)),
          status: faker.helpers.arrayElement(Object.values(CaseStatus)),
          deviceType: faker.helpers.arrayElement(Object.values(DeviceType)),
          deviceBrand: faker.helpers.arrayElement(['HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'Apple', 'Samsung']),
          accessories: faker.helpers.arrayElement([
            'Strømforsyning, mus',
            'Taske, oplader',
            'Mus, tastatur',
            'Ingen tilbehør',
            'Printer kabler'
          ]),
          importantNotes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
          createdAt,
          updatedAt,
          createdBy: worker[0].id
        });

        // Log fremskridt for hver 100 sager
        if ((i + 1) % 100 === 0) {
          console.log(`Genereret ${i + 1} sager...`);
        }
      } catch (error) {
        console.error(`Fejl ved oprettelse af sag ${i + 1}:`, error);
      }
    }

    console.log('\nFærdig med at generere sager!');
    console.log('Antal sager genereret per type:');
    console.log(`REP: ${repCounter - 1}`);
    console.log(`REK: ${rekCounter - 1}`);
    console.log(`KLA: ${klaCounter - 1}`);
    console.log(`AND: ${andCounter - 1}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Fejl under generering af sager:', error);
    process.exit(1);
  }
}

// Start generering af sager
generateCases(); 