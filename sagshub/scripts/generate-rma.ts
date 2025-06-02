import { faker } from '@faker-js/faker/locale/da';
import { db } from '../server/db';
import { rma, customers, users, rmaStatusHistory } from '../shared/schema';
import { format } from 'date-fns';
import { sql, eq } from 'drizzle-orm';

const TOTAL_RMAS = 120;

// Liste af realistiske danske RMA beskrivelser
const RMA_DESCRIPTIONS = [
  'Skærmen flimrer og viser forkerte farver. Produktet er stadig under garanti.',
  'Højttaler i laptop virker ikke. Der kommer ingen lyd ud, selvom Windows viser at lyden spiller.',
  'Batteriet holder kun strøm i 30 minutter. Normalt holder det 4-5 timer. Under garanti.',
  'USB-porte virker ikke. Ingen strøm til eksterne enheder. Købt for 3 måneder siden.',
  'Tastaturet reagerer ikke på alle tastetryk. Flere taster skal trykkes meget hårdt ned.',
  'Touchpad virker ikke efter Windows opdatering. Musepil bevæger sig ikke.',
  'Blå skærm opstår tilfældigt under brug. Fejlkode: MEMORY_MANAGEMENT.',
  'Strømstik er løst og computer vil ikke oplade. Skal holdes i en bestemt vinkel.',
  'Harddisk laver høje klikkelyde. Frygter at den er ved at stå af.',
  'Grafikkort overopheder under spil. Computer lukker ned efter få minutter.',
  'WiFi-kort virker ustabilt. Mister ofte forbindelsen og skal genstartes.',
  'CD/DVD drev vil ikke åbne/lukke. Mekanismen virker defekt.',
  'Printer fejlmelder konstant om papirstop, selvom der ikke er papir i bakken.',
  'Scanner del af multifunktionsprinter virker ikke. Fejlkode E3-45.',
  'Blækpatroner bliver ikke genkendt korrekt. Printer melder konstant om tomme patroner.'
];

const RMAStatus = {
  CREATED: 'created',
  SENT_TO_SUPPLIER: 'sent_to_supplier',
  WAITING_SUPPLIER: 'waiting_supplier',
  RECEIVED_FROM_SUPPLIER: 'received_from_supplier',
  READY_FOR_PICKUP: 'ready_for_pickup',
  COMPLETED: 'completed',
  REJECTED: 'rejected'
} as const;

// Funktion til at generere RMA nummer
let rmaCounter = 1;
function generateRMANumber(): string {
  return `RMA${rmaCounter++.toString().padStart(5, '0')}`;
}

async function generateRMAs() {
  try {
    // Nulstil tæller
    rmaCounter = 1;

    // Hent alle eksisterende kunder
    const existingCustomers = await db.select().from(customers);
    
    if (existingCustomers.length === 0) {
      console.error('Ingen kunder fundet i databasen');
      return;
    }

    // Hent en worker bruger til at oprette RMA sagerne
    const worker = await db.select().from(users).where(eq(users.isWorker, true)).limit(1);
    
    if (!worker || worker.length === 0) {
      console.error('Ingen worker bruger fundet');
      return;
    }

    console.log(`Genererer ${TOTAL_RMAS} RMA sager...`);

    for (let i = 0; i < TOTAL_RMAS; i++) {
      const customer = faker.helpers.arrayElement(existingCustomers);
      
      // Generer tilfældig dato inden for de sidste 2 år
      const createdAt = faker.date.past({ years: 2 });
      const updatedAt = faker.date.between({ 
        from: createdAt, 
        to: new Date() 
      });

      try {
        // Opret RMA sagen
        const rmaCase = await db.insert(rma).values({
          customerId: customer.id,
          rmaNumber: generateRMANumber(),
          description: faker.helpers.arrayElement(RMA_DESCRIPTIONS),
          deliveryDate: createdAt,
          sku: faker.string.numeric(6),
          model: faker.helpers.arrayElement([
            'ThinkPad X1 Carbon',
            'Dell XPS 13',
            'HP EliteBook 840',
            'MacBook Pro 13"',
            'Lenovo IdeaPad 5',
            'ASUS ZenBook 14',
            'Acer Swift 3',
            'HP LaserJet Pro',
            'Brother DCP-L3550CDW',
            'EPSON EcoTank ET-2850'
          ]),
          serialNumber: faker.string.alphanumeric(10).toUpperCase(),
          supplier: faker.helpers.arrayElement([
            'Ingram Micro',
            'Tech Data',
            'Also',
            'Dustin',
            'Komplett'
          ]),
          supplierRmaId: faker.string.numeric(8),
          status: faker.helpers.arrayElement(Object.values(RMAStatus)),
          shipmentDate: faker.helpers.maybe(() => faker.date.between({ from: createdAt, to: updatedAt }), { probability: 0.7 }),
          createdAt,
          updatedAt,
          createdBy: worker[0].id
        }).returning();

        // Tilføj status historik
        const statuses = Object.values(RMAStatus);
        const currentStatusIndex = statuses.indexOf(rmaCase[0].status);
        const previousStatuses = statuses.slice(0, currentStatusIndex + 1);

        let statusDate = createdAt;
        for (const status of previousStatuses) {
          await db.insert(rmaStatusHistory).values({
            rmaId: rmaCase[0].id,
            status,
            comment: faker.helpers.arrayElement([
              'Status opdateret af systemet',
              'Behandling påbegyndt',
              'Afventer leverandørens svar',
              'Produkt modtaget retur fra leverandør',
              'Klar til afhentning',
              'Sag afsluttet',
              'RMA afvist af leverandør'
            ]),
            createdAt: statusDate,
            createdBy: worker[0].id
          });

          statusDate = faker.date.between({ from: statusDate, to: updatedAt });
        }

        // Log fremskridt for hver 10 sager
        if ((i + 1) % 10 === 0) {
          console.log(`Genereret ${i + 1} RMA sager...`);
        }
      } catch (error) {
        console.error(`Fejl ved oprettelse af RMA sag ${i + 1}:`, error);
      }
    }

    console.log('\nFærdig med at generere RMA sager!');
    console.log(`Antal RMA sager genereret: ${rmaCounter - 1}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Fejl under generering af RMA sager:', error);
    process.exit(1);
  }
}

// Start generering af RMA sager
generateRMAs(); 