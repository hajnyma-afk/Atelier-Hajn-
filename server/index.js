import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDatabase } from './db.js';
import { setupRoutes } from './routes.js';
import { ensureUploadsDir } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Initialize database
const db = initDatabase();

// Ensure uploads directory exists
ensureUploadsDir();

// Setup routes
setupRoutes(app, db);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Database initialized at ${join(__dirname, 'data.db')}`);
});

