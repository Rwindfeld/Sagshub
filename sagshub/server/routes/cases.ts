// =============================================================================
// SAGSHUB SAGER API ROUTES
// =============================================================================
// Denne fil definerer alle HTTP endpoints til håndtering af sager:
// - GET /alarm - Henter sager i alarm (påkræver handling)
// - GET / - Henter alle sager med pagination og filtrering
// - GET /:id - Henter specifik sag baseret på ID
// - POST / - Opretter ny sag (og evt. ny kunde)
// - PUT /:id - Opdaterer en eksisterende sag
// - PATCH /:id/status - Opdaterer kun status på en sag
// - DELETE /:id - Sletter en sag
// Alle endpoints broadcaster live updates via WebSocket
// =============================================================================

// Import af nødvendige moduler
import { Router } from 'express';                  // Express router til at definere endpoints
import { broadcastLiveUpdate } from '../index.js'; // WebSocket broadcast funktion til live opdateringer
import { storage } from '../storage.js';           // Database storage layer

// Opretter en Express router instance
const router = Router();

// =============================================================================
// GET /alarm - HENTER SAGER I ALARM
// =============================================================================
// Denne endpoint henter alle sager der er i alarm tilstand
// Bruges af frontend til at vise sager der kræver øjeblikkelig handling
router.get('/alarm', async (req, res) => {
  try {
    const cases = await storage.getCasesInAlarm();  // Henter sager i alarm fra database
    res.json(cases);                                // Sender sager som JSON response
  } catch (error) {
    console.error('Fejl ved hentning af alarm-sager:', error);
    res.status(500).json({ error: 'Intern serverfejl' }); // Sender fejl response
  }
});

// =============================================================================
// GET / - HENTER ALLE SAGER MED PAGINATION
// =============================================================================
// Denne endpoint henter sager med pagination, søgning og status filtrering
// Query parameters: page, pageSize, search, status
router.get('/', async (req, res) => {
  try {
    // Ekstraherer query parameters med default værdier
    const { page = 1, pageSize = 10, search, status } = req.query;
    
    // Henter sager fra database med de specificerede filtre
    const cases = await storage.getCases({
      page: parseInt(page as string),      // Konverterer page til nummer
      pageSize: parseInt(pageSize as string), // Konverterer pageSize til nummer
      search: search as string,            // Søgeterm (kan være null/undefined)
      status: status as string             // Status filter (kan være null/undefined)
    });
    
    res.json(cases);                       // Sender sager som JSON response
  } catch (error) {
    console.error('Error fetching cases:', error);
    res.status(500).json({ error: 'Kunne ikke hente sager' });
  }
});

// =============================================================================
// GET /:id - HENTER SPECIFIK SAG
// =============================================================================
// Henter en enkelt sag baseret på dens ID
// Path parameter: id (sag ID)
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);    // Konverterer ID til nummer
    const case_ = await storage.getCaseById(id); // Henter sag fra database
    
    if (!case_) {                          // Hvis sag ikke findes
      return res.status(404).json({ error: 'Sag ikke fundet' });
    }
    
    res.json(case_);                       // Sender sag som JSON response
  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({ error: 'Kunne ikke hente sag' });
  }
});

// =============================================================================
// POST / - OPRETTER NY SAG
// =============================================================================
// Opretter en ny sag og kan også oprette en ny kunde hvis ikke eksisterer
// Body parameters: customerId, title, description, priority, type, treatment,
//                 customerPhone, customerName, customerEmail, customerAddress
router.post('/', async (req, res) => {
  try {
    // Ekstraherer data fra request body
    const { 
      customerId,                          // Eksisterende kunde ID (optional)
      title,                              // Titel på sagen
      description,                        // Beskrivelse af problemet
      priority,                           // Prioritetsniveau
      type,                              // Type sag (repair, warranty, etc.)
      treatment,                         // Behandlingstype
      customerPhone,                     // Kunde telefonnummer (hvis ny kunde)
      customerName,                      // Kunde navn (hvis ny kunde)
      customerEmail,                     // Kunde email (hvis ny kunde)
      customerAddress                    // Kunde adresse (hvis ny kunde)
    } = req.body;

    let finalCustomerId = customerId;      // Variabel til at holde det endelige kunde ID

    // =================================================================
    // OPRETTER NY KUNDE HVIS NØDVENDIGT
    // =================================================================
    // Hvis ingen customerId er angivet, men customerPhone er angivet, 
    // opretter vi en ny kunde
    if (!customerId && customerPhone) {
      try {
        const newCustomer = await storage.createCustomer({
          name: customerName || 'Ukendt kunde',      // Bruger angivet navn eller default
          email: customerEmail || '',                // Bruger angivet email eller tom streng
          phone: customerPhone,                      // Telefonnummer er påkrævet
          address: customerAddress || ''             // Bruger angivet adresse eller tom streng
        });
        finalCustomerId = newCustomer.id;             // Gemmer ny kunde ID
      } catch (error) {
        console.error('Error creating customer:', error);
        return res.status(400).json({ error: 'Kunne ikke oprette kunde' });
      }
    }

    // Validerer at vi har et kunde ID (enten eksisterende eller nyoprettet)
    if (!finalCustomerId) {
      return res.status(400).json({ error: 'Kunde-ID er påkrævet' });
    }

    // =================================================================
    // OPRETTER NY SAG
    // =================================================================
    const newCase = await storage.createCase({
      customerId: finalCustomerId,                   // Kunde ID (eksisterende eller nyoprettet)
      title: title || 'Ny sag',                     // Titel (med fallback)
      description: description || '',                // Beskrivelse (med fallback)
      priority: priority || 'medium',                // Prioritet (med fallback)
      type: type || 'repair',                       // Type (med fallback)
      treatment: treatment || '',                    // Behandling (med fallback)
      status: 'created'                             // Sætter initial status til 'created'
    });

    // =================================================================
    // BROADCASTER LIVE UPDATE
    // =================================================================
    // Sender WebSocket besked til alle tilsluttede klienter om ny sag
    broadcastLiveUpdate('case_created', {
      case: newCase,                                 // Den nyoprettede sag
      message: `Ny sag oprettet: ${newCase.title}`  // Besked til brugere
    });

    res.status(201).json(newCase);                   // Sender den nyoprettede sag tilbage
  } catch (error) {
    console.error('Error creating case:', error);
    res.status(500).json({ error: 'Kunne ikke oprette sag' });
  }
});

// =============================================================================
// PUT /:id - OPDATERER EKSISTERENDE SAG
// =============================================================================
// Opdaterer alle felter på en eksisterende sag
// Path parameter: id (sag ID)
// Body: alle felter der skal opdateres
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);              // Konverterer ID til nummer
    const updateData = req.body;                     // Henter alle update data fra body
    
    const updatedCase = await storage.updateCase(id, updateData); // Opdaterer sag i database
    
    // Broadcaster live update om sag opdatering
    broadcastLiveUpdate('case_updated', {
      case: updatedCase,                             // Den opdaterede sag
      message: `Sag opdateret: ${updatedCase.title}` // Besked til brugere
    });
    
    res.json(updatedCase);                           // Sender den opdaterede sag tilbage
  } catch (error) {
    console.error('Error updating case:', error);
    res.status(500).json({ error: 'Kunne ikke opdatere sag' });
  }
});

// =============================================================================
// PATCH /:id/status - OPDATERER KUN SAG STATUS
// =============================================================================
// Opdaterer kun status feltet på en sag (bruges til status workflow)
// Path parameter: id (sag ID)
// Body: { status: 'new_status' }
router.patch('/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);              // Konverterer ID til nummer
    const { status } = req.body;                     // Ekstraherer ny status fra body
    
    const updatedCase = await storage.updateCaseStatus(id, status); // Opdaterer kun status
    
    // Broadcaster specifik live update for status ændring
    broadcastLiveUpdate('case_status_updated', {
      case: updatedCase,                             // Den opdaterede sag
      oldStatus: req.body.oldStatus,                 // Gammel status (til historik)
      newStatus: status,                             // Ny status
      message: `Sag status ændret til: ${status}`    // Besked til brugere
    });
    
    res.json(updatedCase);                           // Sender den opdaterede sag tilbage
  } catch (error) {
    console.error('Error updating case status:', error);
    res.status(500).json({ error: 'Kunne ikke opdatere sag status' });
  }
});

// =============================================================================
// DELETE /:id - SLETTER SAG
// =============================================================================
// Sletter en sag permanent fra systemet
// Path parameter: id (sag ID)
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);              // Konverterer ID til nummer
    const caseToDelete = await storage.getCaseById(id); // Henter sag før sletning (til broadcast)
    
    await storage.deleteCase(id);                    // Sletter sag fra database
    
    // Broadcaster live update om sag sletning
    broadcastLiveUpdate('case_deleted', {
      caseId: id,                                    // ID på slettet sag
      case: caseToDelete,                           // Den slettede sag (til historik)
      message: `Sag slettet: ${caseToDelete?.title || 'Ukendt sag'}` // Besked til brugere
    });
    
    res.status(204).send();                          // Sender 204 No Content (standard for sletning)
  } catch (error) {
    console.error('Error deleting case:', error);
    res.status(500).json({ error: 'Kunne ikke slette sag' });
  }
});

// Eksporterer router så den kan bruges i hovedserveren
export default router; 