import { initDatabase } from './db.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const UPLOADS_DIR = join(__dirname, 'uploads');

// This script helps migrate base64 data from localStorage to file system
// Run this after exporting localStorage data

function base64ToBuffer(base64String) {
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '').replace(/^data:video\/[a-z]+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

function saveBase64AsFile(base64String, fileName) {
  if (!existsSync(UPLOADS_DIR)) {
    mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  const buffer = base64ToBuffer(base64String);
  const filePath = join(UPLOADS_DIR, fileName);
  writeFileSync(filePath, buffer);
  return fileName;
}

export async function migrateFromLocalStorage(localStorageData) {
  const db = initDatabase();

  try {
    // Migrate projects
    if (localStorageData.projects && Array.isArray(localStorageData.projects)) {
      console.log(`Migrating ${localStorageData.projects.length} projects...`);

      const insertProject = db.prepare(`
        INSERT INTO projects (id, title, thumbnail, description, year, location, category, created_at, updated_at, display_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertImage = db.prepare(`
        INSERT INTO project_images (id, project_id, file_path, display_order)
        VALUES (?, ?, ?, ?)
      `);

      localStorageData.projects.forEach((project, index) => {
        let thumbnailFileName = null;

        // Save thumbnail if it's base64
        if (project.thumbnail && project.thumbnail.startsWith('data:')) {
          thumbnailFileName = `thumb-${project.id}-${Date.now()}.webp`;
          saveBase64AsFile(project.thumbnail, thumbnailFileName);
        } else if (project.thumbnail) {
          // Already a URL, extract filename or keep as is
          thumbnailFileName = project.thumbnail.replace('/uploads/', '');
        }

        insertProject.run(
          project.id,
          project.title || '',
          thumbnailFileName,
          project.description || null,
          project.year || null,
          project.location || null,
          project.category || null,
          project.createdAt || Date.now(),
          project.updatedAt || Date.now(),
          index
        );

        // Save gallery images
        if (project.images && Array.isArray(project.images)) {
          project.images.forEach((image, imgIndex) => {
            let imageFileName = null;

            if (image.startsWith('data:')) {
              const ext = image.includes('video') ? '.mp4' : '.webp';
              imageFileName = `img-${project.id}-${imgIndex}-${Date.now()}${ext}`;
              saveBase64AsFile(image, imageFileName);
            } else {
              // External URL or already migrated
              imageFileName = image.replace('/uploads/', '');
            }

            insertImage.run(uuidv4(), project.id, imageFileName, imgIndex);
          });
        }
      });

      console.log('Projects migrated successfully!');
    }

    // Migrate posts
    if (localStorageData.posts && Array.isArray(localStorageData.posts)) {
      console.log(`Migrating ${localStorageData.posts.length} posts...`);

      const insertPost = db.prepare(`
        INSERT INTO posts (id, title, content, published, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      localStorageData.posts.forEach(post => {
        insertPost.run(
          post.id,
          post.title || '',
          post.content || '',
          post.published ? 1 : 0,
          post.createdAt || Date.now(),
          post.updatedAt || Date.now()
        );
      });

      console.log('Posts migrated successfully!');
    }

    // Migrate site content
    if (localStorageData.content) {
      console.log('Migrating site content...');

      const insertContent = db.prepare('INSERT OR REPLACE INTO site_content (key, value) VALUES (?, ?)');

      // Handle nested structure
      const contentKeys = {
        'branding': 'branding',
        'analytics': 'analytics',
        'seo': 'seo',
        'hero': 'hero',
        'atelier': 'atelier',
        'contact': 'contact'
      };

      Object.entries(contentKeys).forEach(([key, storageKey]) => {
        if (localStorageData.content[storageKey]) {
          // Handle images in content
          const content = { ...localStorageData.content[storageKey] };

          // Migrate hero image/video
          if (key === 'hero') {
            if (content.image && content.image.startsWith('data:')) {
              const fileName = `hero-${Date.now()}.webp`;
              saveBase64AsFile(content.image, fileName);
              content.image = `/uploads/${fileName}`;
            }
            if (content.video && content.video.startsWith('data:')) {
              const fileName = `hero-video-${Date.now()}.mp4`;
              saveBase64AsFile(content.video, fileName);
              content.video = `/uploads/${fileName}`;
            }
          }

          // Migrate atelier image
          if (key === 'atelier' && content.image && content.image.startsWith('data:')) {
            const fileName = `atelier-${Date.now()}.webp`;
            saveBase64AsFile(content.image, fileName);
            content.image = `/uploads/${fileName}`;
          }

          // Migrate branding logo/favicon
          if (key === 'branding') {
            if (content.logo && content.logo.startsWith('data:')) {
              const fileName = `logo-${Date.now()}.webp`;
              saveBase64AsFile(content.logo, fileName);
              content.logo = `/uploads/${fileName}`;
            }
            if (content.favicon && content.favicon.startsWith('data:')) {
              const fileName = `favicon-${Date.now()}.webp`;
              saveBase64AsFile(content.favicon, fileName);
              content.favicon = `/uploads/${fileName}`;
            }
          }

          insertContent.run(key, JSON.stringify(content));
        }
      });

      console.log('Site content migrated successfully!');
    }

    // Migrate password
    if (localStorageData.password) {
      const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      insertSetting.run('password', localStorageData.password);
      console.log('Password migrated successfully!');
    }

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    db.close();
  }
}

// If run directly, expect JSON input
if (import.meta.url === `file://${process.argv[1]}`) {
  const fs = await import('fs');
  const path = await import('path');

  const migrationFile = process.argv[2] || 'migration-data.json';
  const migrationPath = path.join(process.cwd(), migrationFile);

  if (!existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`);
    console.log('\nTo migrate from localStorage:');
    console.log('1. Export localStorage data to a JSON file');
    console.log('2. Run: node server/migrate.js <path-to-json-file>');
    process.exit(1);
  }

  const localStorageData = JSON.parse(fs.readFileSync(migrationPath, 'utf-8'));
  migrateFromLocalStorage(localStorageData)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

