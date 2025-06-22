import { Router } from 'express';
import { broadcastLiveUpdate } from '../index.js';
import { storage } from '../storage.js';

const router = Router();

// Endpoint for at hente sager i alarm
router.get('/alarm', async (req, res) => {
  try {
    const cases = await storage.getCasesInAlarm();
    res.json(cases);
  } catch (error) {
    console.error('Fejl ved hentning af alarm-sager:', error);
    res.status(500).json({ error: 'Intern serverfejl' });
  }
});

// Get all cases
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 10, search, status } = req.query;
    const cases = await storage.getCases({
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      search: search as string,
      status: status as string
    });
    res.json(cases);
  } catch (error) {
    console.error('Error fetching cases:', error);
    res.status(500).json({ error: 'Kunne ikke hente sager' });
  }
});

// Get case by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const case_ = await storage.getCaseById(id);
    if (!case_) {
      return res.status(404).json({ error: 'Sag ikke fundet' });
    }
    res.json(case_);
  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({ error: 'Kunne ikke hente sag' });
  }
});

// Create case
router.post('/', async (req, res) => {
  try {
    const { 
      customerId, 
      title, 
      description, 
      priority, 
      type,
      treatment,
      customerPhone,
      customerName,
      customerEmail,
      customerAddress
    } = req.body;

    let finalCustomerId = customerId;

    // If no customerId provided, create new customer
    if (!customerId && customerPhone) {
      try {
        const newCustomer = await storage.createCustomer({
          name: customerName || 'Ukendt kunde',
          email: customerEmail || '',
          phone: customerPhone,
          address: customerAddress || ''
        });
        finalCustomerId = newCustomer.id;
      } catch (error) {
        console.error('Error creating customer:', error);
        return res.status(400).json({ error: 'Kunne ikke oprette kunde' });
      }
    }

    if (!finalCustomerId) {
      return res.status(400).json({ error: 'Kunde-ID er påkrævet' });
    }

    const newCase = await storage.createCase({
      customerId: finalCustomerId,
      title: title || 'Ny sag',
      description: description || '',
      priority: priority || 'medium',
      type: type || 'repair',
      treatment: treatment || '',
      status: 'created'
    });

    // Broadcast live update
    broadcastLiveUpdate('case_created', {
      case: newCase,
      message: `Ny sag oprettet: ${newCase.title}`
    });

    res.status(201).json(newCase);
  } catch (error) {
    console.error('Error creating case:', error);
    res.status(500).json({ error: 'Kunne ikke oprette sag' });
  }
});

// Update case
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updateData = req.body;
    
    const updatedCase = await storage.updateCase(id, updateData);
    
    // Broadcast live update
    broadcastLiveUpdate('case_updated', {
      case: updatedCase,
      message: `Sag opdateret: ${updatedCase.title}`
    });
    
    res.json(updatedCase);
  } catch (error) {
    console.error('Error updating case:', error);
    res.status(500).json({ error: 'Kunne ikke opdatere sag' });
  }
});

// Update case status
router.patch('/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    const updatedCase = await storage.updateCaseStatus(id, status);
    
    // Broadcast live update
    broadcastLiveUpdate('case_status_updated', {
      case: updatedCase,
      oldStatus: req.body.oldStatus,
      newStatus: status,
      message: `Sag status ændret til: ${status}`
    });
    
    res.json(updatedCase);
  } catch (error) {
    console.error('Error updating case status:', error);
    res.status(500).json({ error: 'Kunne ikke opdatere sag status' });
  }
});

// Delete case
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const caseToDelete = await storage.getCaseById(id);
    
    await storage.deleteCase(id);
    
    // Broadcast live update
    broadcastLiveUpdate('case_deleted', {
      caseId: id,
      case: caseToDelete,
      message: `Sag slettet: ${caseToDelete?.title || 'Ukendt sag'}`
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting case:', error);
    res.status(500).json({ error: 'Kunne ikke slette sag' });
  }
});

export default router; 