import { faker } from '@faker-js/faker';
import { storage } from '../storage';
// Danske virksomhedsnavne
const danskeVirksomheder = [
    'TechSupport A/S', 'IT-Service Danmark', 'ComputerHjælp ApS', 'PC-Service Nord',
    'DataSupport', 'IT-Solutions', 'Netværk & Co', 'HardwareHjælp', 'SoftwareService',
    'DigitalSupport', 'IT-eksperten', 'ComputerGuru', 'TechPartner', 'IT-Hjælp 24/7',
    'PC-Doktoren', 'DataDoctor', 'IT-First', 'TechTeam', 'ComputerClinic', 'IT-Specialisten'
];
// Danske fornavne
const danskeFornavne = [
    'Jens', 'Peter', 'Michael', 'Lars', 'Thomas', 'Henrik', 'Søren', 'Christian',
    'Jan', 'Martin', 'Niels', 'Anders', 'Morten', 'Jesper', 'Mads', 'Jakob',
    'Anne', 'Mette', 'Hanne', 'Lene', 'Lone', 'Bente', 'Susanne', 'Pia',
    'Dorthe', 'Maria', 'Lise', 'Kirsten', 'Eva', 'Gitte'
];
// Danske efternavne
const danskeEfternavne = [
    'Jensen', 'Nielsen', 'Hansen', 'Pedersen', 'Andersen', 'Christensen', 'Larsen',
    'Sørensen', 'Rasmussen', 'Jørgensen', 'Petersen', 'Madsen', 'Kristensen',
    'Olsen', 'Thomsen', 'Christiansen', 'Poulsen', 'Johansen', 'Møller', 'Mortensen'
];
// Danske byer
const danskeByer = [
    'København', 'Aarhus', 'Odense', 'Aalborg', 'Frederiksberg', 'Esbjerg', 'Gentofte',
    'Gladsaxe', 'Randers', 'Kolding', 'Horsens', 'Vejle', 'Roskilde', 'Herning',
    'Hørsholm', 'Helsingør', 'Silkeborg', 'Næstved', 'Fredericia', 'Viborg'
];
// Danske gadenavne
const danskeGader = [
    'Hovedgaden', 'Kirkegade', 'Skovvej', 'Strandvejen', 'Industrivej', 'Parkvej',
    'Bakkevej', 'Møllevej', 'Skovbrynet', 'Havnevej', 'Brogade', 'Markvej',
    'Skovbakken', 'Havnegade', 'Industrigade', 'Parkgade', 'Bakkevej', 'Møllegade',
    'Skovvejen', 'Havnevejen'
];
function genererDanskTelefonnummer() {
    return `+45${faker.number.int({ min: 20000000, max: 99999999 })}`;
}
function genererDanskPostnummer() {
    return faker.number.int({ min: 1000, max: 9999 }).toString();
}
function genererDanskAdresse() {
    return `${faker.helpers.arrayElement(danskeGader)} ${faker.number.int({ min: 1, max: 999 })}`;
}
function genererDanskNavn() {
    const erVirksomhed = faker.datatype.boolean();
    if (erVirksomhed) {
        return faker.helpers.arrayElement(danskeVirksomheder);
    }
    else {
        return `${faker.helpers.arrayElement(danskeFornavne)} ${faker.helpers.arrayElement(danskeEfternavne)}`;
    }
}
function genererDanskBy() {
    return faker.helpers.arrayElement(danskeByer);
}
function genererDanskFejlbeskrivelse() {
    const fejltyper = [
        'Skærmen viser ikke noget billede',
        'Computeren starter ikke',
        'Lyden virker ikke',
        'Tastaturet reagerer ikke',
        'Musen bevæger sig ikke',
        'Internetforbindelsen virker ikke',
        'Printeren printer ikke',
        'Batteriet holder ikke strøm',
        'Computeren er langsom',
        'Programmerne crasher'
    ];
    return faker.helpers.arrayElement(fejltyper);
}
function genererDanskBehandling() {
    // Vi bruger de korrekte engelske værdier fra TreatmentType enum
    const treatments = ['repair', 'warranty', 'setup', 'other'];
    return faker.helpers.arrayElement(treatments);
}
async function generateCustomers(count) {
    console.log('Generating customers...');
    for (let i = 1; i <= count; i++) {
        const customer = {
            name: genererDanskNavn(),
            email: faker.internet.email(),
            phone: genererDanskTelefonnummer(),
            address: genererDanskAdresse(),
            city: genererDanskBy(),
            postalCode: genererDanskPostnummer(),
            notes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
            createdAt: faker.date.past(),
            updatedAt: faker.date.recent()
        };
        await storage.createCustomer(customer);
        console.log(`Created customer ${i}/${count}`);
    }
}
async function generateCases(count) {
    console.log('Generating cases...');
    const customers = await storage.getCustomers();
    for (let i = 1; i <= count; i++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const caseTypes = ['REP', 'REK', 'AND', 'KLA'];
        const caseType = caseTypes[Math.floor(Math.random() * caseTypes.length)];
        const caseData = {
            caseNumber: `${caseType}${faker.number.int({ min: 10000, max: 99999 })}`,
            customerId: customer.id,
            title: genererDanskFejlbeskrivelse(),
            description: faker.lorem.paragraph(),
            treatment: genererDanskBehandling(),
            priority: faker.helpers.arrayElement(['free_diagnosis', 'four_days', 'first_priority', 'asap']),
            deviceType: faker.helpers.arrayElement(['phone', 'tablet', 'laptop', 'desktop', 'other']),
            accessories: faker.datatype.boolean() ? faker.lorem.words(3) : null,
            importantNotes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
            status: 'created',
            createdAt: faker.date.past(),
            updatedAt: faker.date.recent(),
            createdBy: 1 // Assuming admin user with ID 1
        };
        await storage.createCase(caseData);
        console.log(`Created case ${i}/${count}`);
    }
}
async function generateRMAs(customers, cases, storage) {
    console.log('Generating RMAs...');
    const rmas = [];
    for (let i = 0; i < 100; i++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const case_ = cases[Math.floor(Math.random() * cases.length)];
        const rma = {
            customerId: customer.id,
            case_id: case_.id,
            model: faker.commerce.productName(),
            serialNumber: faker.string.alphanumeric(10),
            faultDescription: faker.lorem.paragraph(),
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 1
        };
        try {
            const createdRMA = await storage.createRMA(rma);
            rmas.push(createdRMA);
            console.log(`Created RMA ${i + 1}/100`);
        }
        catch (error) {
            console.error('Error in createRMA:', error);
            throw error;
        }
    }
    return rmas;
}
async function generateOrders(count) {
    console.log('Generating orders...');
    const customers = await storage.getCustomers();
    const cases = await storage.getCases();
    for (let i = 1; i <= count; i++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const useCase = faker.datatype.boolean();
        const case_ = useCase ? cases[Math.floor(Math.random() * cases.length)] : null;
        const order = {
            orderNumber: `B${i.toString().padStart(5, '0')}`,
            customerId: customer.id,
            caseId: case_?.id || null,
            rmaId: null,
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
            faultDescription: genererDanskFejlbeskrivelse(),
            itemsOrdered: faker.helpers.arrayElement([
                'Bundkort',
                'Skærm',
                'Tastatur',
                'Batteri',
                'Strømforsyning',
                'RAM',
                'SSD',
                'Blækpatroner',
                'Toner',
                'Netværkskort'
            ]),
            supplier: faker.helpers.arrayElement([
                'Ingram Micro',
                'Tech Data',
                'Also',
                'Dustin',
                'Komplett'
            ]),
            price: faker.number.float({ min: 100, max: 10000, precision: 0.01 }).toString(),
            orderDate: faker.date.past(),
            status: faker.helpers.arrayElement(['pending', 'ordered', 'shipped', 'delivered', 'cancelled']),
            createdAt: faker.date.past(),
            updatedAt: faker.date.recent(),
            createdBy: 1 // Assuming admin user with ID 1
        };
        await storage.createOrder(order);
        console.log(`Created order ${i}/${count}`);
    }
}
async function generateTestData() {
    try {
        await generateCustomers(100);
        await generateCases(300);
        await generateRMAs(await storage.getCustomers(), await storage.getCases(), storage);
        await generateOrders(120);
        console.log('Test data generation completed successfully!');
    }
    catch (error) {
        console.error('Error generating test data:', error);
    }
}
generateTestData();
