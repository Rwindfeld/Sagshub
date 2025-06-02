import express from 'express';
import { Storage } from './storage';

export const router = express.Router();
const storage = new Storage(/* database forbindelse her */);

// Middleware til authentication
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Implementer authentication logik her
  next();
};

// Fjern den gamle /api/search route
// router.get('/api/search', async (req, res) => {
//   try {
//     const searchTerm = req.query.q as string;
//     if (!searchTerm) {
//       return res.json({ customers: [], cases: [], rmas: [] });
//     }
//     const results = await storage.searchAll(searchTerm);
//     res.json(results);
//   } catch (error) {
//     console.error('Search error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// Behold den nye /api/search route med authentication check
router.get('/api/search', authenticateToken, async (req, res) => {
  try {
    const searchTerm = req.query.q as string;
    if (!searchTerm) {
      return res.json({ customers: [], cases: [], rmas: [] });
    }
    const results = await storage.searchAll(searchTerm);
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Tilføj endpoint for ulæste interne sager
router.get('/api/internal-cases/unread-count', authenticateToken, async (req, res) => {
  try {
    const count = await storage.getUnreadInternalCasesCount();
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint for status counts på alle sager
router.get('/api/cases/status-counts', authenticateToken, async (req, res) => {
  try {
    const counts = await storage.getCaseStatusCounts();
    res.json(counts);
  } catch (error) {
    console.error('Error getting case status counts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}); 