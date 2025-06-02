import express from 'express';
import cors from 'cors';
import { Storage } from './storage';
import { router } from './routes';

const app = express();
const port = process.env.PORT || 3001;

// Initialiser storage
const storage = new Storage(/* database forbindelse her */);

// Middleware
app.use(cors());
app.use(express.json());

// Brug router
app.use(router);

// Start server
app.listen(port, () => {
  console.log(`Server kører på port ${port}`);
}); 