import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, 'data.db');

export function initDatabase() {
  const db = new Database(DB_PATH);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      thumbnail TEXT,
      description TEXT,
      year TEXT,
      location TEXT,
      category TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      display_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS project_images (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      display_order INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      published INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_project_images_order ON project_images(project_id, display_order);
    CREATE INDEX IF NOT EXISTS idx_projects_order ON projects(display_order);
  `);

  // Initialize password from environment variable if it doesn't exist
  const passwordCheck = db.prepare('SELECT value FROM settings WHERE key = ?').get('password');
  if (!passwordCheck) {
    const initialPassword = process.env.ADMIN_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD;
    if (initialPassword) {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('password', initialPassword);
      console.log('Initial admin password set from environment variable');
    } else {
      console.warn('⚠️  WARNING: No admin password set! Set ADMIN_PASSWORD environment variable or set it via admin panel.');
    }
  }

  return db;
}

