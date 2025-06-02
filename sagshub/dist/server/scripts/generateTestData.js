"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const faker_1 = require("@faker-js/faker");
const storage_1 = require("../storage");
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
    return `+45${faker_1.faker.number.int({ min: 20000000, max: 99999999 })}`;
}
function genererDanskPostnummer() {
    return faker_1.faker.number.int({ min: 1000, max: 9999 }).toString();
}
function genererDanskAdresse() {
    return `${faker_1.faker.helpers.arrayElement(danskeGader)} ${faker_1.faker.number.int({ min: 1, max: 999 })}`;
}
function genererDanskNavn() {
    const erVirksomhed = faker_1.faker.datatype.boolean();
    if (erVirksomhed) {
        return faker_1.faker.helpers.arrayElement(danskeVirksomheder);
    }
    else {
        return `${faker_1.faker.helpers.arrayElement(danskeFornavne)} ${faker_1.faker.helpers.arrayElement(danskeEfternavne)}`;
    }
}
function genererDanskBy() {
    return faker_1.faker.helpers.arrayElement(danskeByer);
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
    return faker_1.faker.helpers.arrayElement(fejltyper);
}
function genererDanskBehandling() {
    // Vi bruger de korrekte engelske værdier fra TreatmentType enum
    const treatments = ['repair', 'warranty', 'setup', 'other'];
    return faker_1.faker.helpers.arrayElement(treatments);
}
async function generateCustomers(count) {
    console.log('Generating customers...');
    for (let i = 1; i <= count; i++) {
        const customer = {
            name: genererDanskNavn(),
            email: faker_1.faker.internet.email(),
            phone: genererDanskTelefonnummer(),
            address: genererDanskAdresse(),
            city: genererDanskBy(),
            postalCode: genererDanskPostnummer(),
            notes: faker_1.faker.datatype.boolean() ? faker_1.faker.lorem.sentence() : null,
            createdAt: faker_1.faker.date.past(),
            updatedAt: faker_1.faker.date.recent()
        };
        await storage_1.storage.createCustomer(customer);
        console.log(`Created customer ${i}/${count}`);
    }
}
async function generateCases(count) {
    console.log('Generating cases...');
    const customers = await storage_1.storage.getCustomers();
    for (let i = 1; i <= count; i++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const caseTypes = ['REP', 'REK', 'AND', 'KLA'];
        const caseType = caseTypes[Math.floor(Math.random() * caseTypes.length)];
        const caseData = {
            caseNumber: `${caseType}${faker_1.faker.number.int({ min: 10000, max: 99999 })}`,
            customerId: customer.id,
            title: genererDanskFejlbeskrivelse(),
            description: faker_1.faker.lorem.paragraph(),
            treatment: genererDanskBehandling(),
            priority: faker_1.faker.helpers.arrayElement(['free_diagnosis', 'four_days', 'first_priority', 'asap']),
            deviceType: faker_1.faker.helpers.arrayElement(['phone', 'tablet', 'laptop', 'desktop', 'other']),
            accessories: faker_1.faker.datatype.boolean() ? faker_1.faker.lorem.words(3) : null,
            importantNotes: faker_1.faker.datatype.boolean() ? faker_1.faker.lorem.sentence() : null,
            status: 'created',
            createdAt: faker_1.faker.date.past(),
            updatedAt: faker_1.faker.date.recent(),
            createdBy: 1 // Assuming admin user with ID 1
        };
        await storage_1.storage.createCase(caseData);
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
            model: faker_1.faker.commerce.productName(),
            serialNumber: faker_1.faker.string.alphanumeric(10),
            faultDescription: faker_1.faker.lorem.paragraph(),
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
    const customers = await storage_1.storage.getCustomers();
    const cases = await storage_1.storage.getCases();
    for (let i = 1; i <= count; i++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const useCase = faker_1.faker.datatype.boolean();
        const case_ = useCase ? cases[Math.floor(Math.random() * cases.length)] : null;
        const order = {
            orderNumber: `B${i.toString().padStart(5, '0')}`,
            customerId: customer.id,
            caseId: case_?.id || null,
            rmaId: null,
            model: faker_1.faker.helpers.arrayElement([
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
            serialNumber: faker_1.faker.string.alphanumeric(10).toUpperCase(),
            faultDescription: genererDanskFejlbeskrivelse(),
            itemsOrdered: faker_1.faker.helpers.arrayElement([
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
            supplier: faker_1.faker.helpers.arrayElement([
                'Ingram Micro',
                'Tech Data',
                'Also',
                'Dustin',
                'Komplett'
            ]),
            price: faker_1.faker.number.float({ min: 100, max: 10000, precision: 0.01 }).toString(),
            orderDate: faker_1.faker.date.past(),
            status: faker_1.faker.helpers.arrayElement(['pending', 'ordered', 'shipped', 'delivered', 'cancelled']),
            createdAt: faker_1.faker.date.past(),
            updatedAt: faker_1.faker.date.recent(),
            createdBy: 1 // Assuming admin user with ID 1
        };
        await storage_1.storage.createOrder(order);
        console.log(`Created order ${i}/${count}`);
    }
}
async function generateTestData() {
    try {
        await generateCustomers(100);
        await generateCases(300);
        await generateRMAs(await storage_1.storage.getCustomers(), await storage_1.storage.getCases(), storage_1.storage);
        await generateOrders(120);
        console.log('Test data generation completed successfully!');
    }
    catch (error) {
        console.error('Error generating test data:', error);
    }
}
generateTestData();
