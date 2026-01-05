import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDatabase } from './db.js';
import { setupRoutes } from './routes.js';
import { isFtpConfigured } from './ftpService.js';
import { isGcsConfigured } from './gcsService.js';

// Load environment variables from .env.local first, then .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config(); // This will load .env if .env.local doesn't have the variable

const app = express();
// Cloud Run sets PORT environment variable, default to 3001 for local development
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize database and start server
(async () => {
  try {
    const db = await initDatabase();

    // Check storage configuration (GCS or FTP)
    if (isGcsConfigured()) {
      console.log('✅ Google Cloud Storage configured');
      console.log(`   Bucket: ${process.env.GCS_BUCKET_NAME}`);
      console.log(`   Project: ${process.env.GCS_PROJECT_ID || process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT}`);
    } else if (isFtpConfigured()) {
      console.log('✅ FTP storage configured');
      console.log(`   Host: ${process.env.FTP_HOST}`);
      console.log(`   Base URL: ${process.env.FTP_BASE_URL || 'Not set'}`);
    } else {
      console.warn('⚠️  WARNING: Storage not configured. File uploads will fail.');
      console.warn('   Please set either:');
      console.warn('     - GCS: GCS_BUCKET_NAME and GCS_PROJECT_ID (or GCP_PROJECT_ID)');
      console.warn('     - FTP: FTP_HOST, FTP_USER, FTP_PASSWORD, FTP_BASE_PATH, and FTP_BASE_URL');
    }

    // Setup API routes (must come before static file serving)
    setupRoutes(app, db);

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

    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Database: Firestore (project: ${process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'default'})`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');
      const { closeFtpConnection } = await import('./ftpService.js');
      const { closeGcsConnection } = await import('./gcsService.js');
      const { closeDatabase } = await import('./db.js');
      await closeFtpConnection();
      await closeGcsConnection();
      await closeDatabase();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('\nSIGINT received, shutting down gracefully...');
      const { closeFtpConnection } = await import('./ftpService.js');
      const { closeGcsConnection } = await import('./gcsService.js');
      const { closeDatabase } = await import('./db.js');
      await closeFtpConnection();
      await closeGcsConnection();
      await closeDatabase();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
})();

