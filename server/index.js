import 'dotenv/config';
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
// Cloud Run sets PORT environment variable, default to 3001 for local development
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize database
const db = initDatabase();

// Ensure uploads directory exists
ensureUploadsDir();

// Setup API routes (must come before static file serving)
setupRoutes(app, db);

// Serve uploaded files statically
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Serve static files from Vite build in production
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '..', 'dist');
  app.use(express.static(distPath));

  // Serve index.html for all non-API routes (SPA routing)
  // This must be last to catch all routes not handled above
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Database initialized at ${join(__dirname, 'data.db')}`);
});

