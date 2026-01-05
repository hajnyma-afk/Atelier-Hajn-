import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDatabase, closeDatabase } from './db.js';
import { downloadFromFtp, isFtpConfigured } from './ftpService.js';
import { uploadToGcs, isGcsConfigured, getGcsPublicUrl } from './gcsService.js';

// Load environment variables from .env.local first, then .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config();

/**
 * Extract filename from URL or path
 * Handles various formats: full URLs, proxy URLs, relative paths, or just filenames
 */
function extractFileName(path) {
  if (!path || typeof path !== 'string') return null;

  // Skip YouTube URLs and external URLs that aren't our files
  if (path.includes('youtube.com') || path.includes('youtu.be')) return null;
  if (path.startsWith('http') && !path.includes('storage.googleapis.com') && !path.includes('/api/images/') && !path.includes('/uploads/')) {
    return null; // External URL, skip
  }

  // Remove protocol and domain
  let fileName = path.replace(/^https?:\/\/[^\/]+/, '');
  // Remove /api/images/ prefix (FTP proxy endpoint)
  fileName = fileName.replace(/^\/api\/images\//, '');
  // Remove /uploads/ prefix (legacy local storage)
  fileName = fileName.replace(/^\/uploads\//, '').replace(/^uploads\//, '');
  // Remove GCS URL prefix if present
  fileName = fileName.replace(/^https:\/\/storage\.googleapis\.com\/[^\/]+\//, '');

  // Handle paths that start with / (like /bucket-name/filename.webp or /path/to/file.webp)
  // Extract just the filename (everything after the last /)
  if (fileName.startsWith('/')) {
    // Remove leading slash and any directory path, keep only the filename
    const parts = fileName.split('/').filter(p => p.length > 0);
    fileName = parts[parts.length - 1]; // Get the last part (the actual filename)
  }

  // Return just the filename (should be something like "1234567890-abc123.webp")
  return fileName.trim() || null;
}

/**
 * Collect all image/video filenames from a project
 */
function extractProjectFiles(project) {
  const files = new Set();

  // Thumbnail
  if (project.thumbnail) {
    const fileName = extractFileName(project.thumbnail);
    if (fileName) files.add(fileName);
  }

  // Gallery images/videos
  if (project.images && Array.isArray(project.images)) {
    project.images.forEach(img => {
      const fileName = extractFileName(img);
      if (fileName) files.add(fileName);
    });
  }

  // Project blocks (content blocks)
  if (project.blocks && Array.isArray(project.blocks)) {
    project.blocks.forEach(block => {
      if ((block.type === 'image' || block.type === 'video') && block.content) {
        const fileName = extractFileName(block.content);
        if (fileName) files.add(fileName);
      }
    });
  }

  return Array.from(files);
}

/**
 * Collect all image/video filenames from site content
 */
function extractContentFiles(content) {
  const files = new Set();

  // Hero image and video
  if (content.hero) {
    if (content.hero.image) {
      const fileName = extractFileName(content.hero.image);
      if (fileName) files.add(fileName);
    }
    if (content.hero.video) {
      const fileName = extractFileName(content.hero.video);
      if (fileName) files.add(fileName);
    }
  }

  // Branding (logo and favicon)
  if (content.branding) {
    if (content.branding.logo) {
      const fileName = extractFileName(content.branding.logo);
      if (fileName) files.add(fileName);
    }
    if (content.branding.favicon) {
      const fileName = extractFileName(content.branding.favicon);
      if (fileName) files.add(fileName);
    }
  }

  // Atelier blocks
  if (content.atelier) {
    const extractBlocks = (blocks) => {
      if (Array.isArray(blocks)) {
        blocks.forEach(block => {
          if ((block.type === 'image' || block.type === 'video') && block.content) {
            const fileName = extractFileName(block.content);
            if (fileName) files.add(fileName);
          }
        });
      }
    };

    if (content.atelier.leftColumn) {
      extractBlocks(content.atelier.leftColumn);
    }
    if (content.atelier.rightColumn) {
      extractBlocks(content.atelier.rightColumn);
    }
  }

  return Array.from(files);
}

/**
 * Migrate a single file from FTP to GCS
 */
async function migrateFile(fileName, stats) {
  try {
    // Download from FTP
    console.log(`  Downloading ${fileName}...`);
    const fileBuffer = await downloadFromFtp(fileName);

    // Upload to GCS (same filename/path)
    console.log(`  Uploading ${fileName} to GCS...`);
    const gcsUrl = await uploadToGcs(fileBuffer, fileName);

    stats.success++;
    console.log(`  ✅ Migrated: ${fileName} -> ${gcsUrl}`);
    return { fileName, success: true, gcsUrl };
  } catch (error) {
    stats.failed++;
    console.error(`  ❌ Failed to migrate ${fileName}: ${error.message}`);
    return { fileName, success: false, error: error.message };
  }
}

/**
 * Main migration function
 */
async function migrateImages() {
  console.log('🚀 Starting image migration from FTP to Google Cloud Storage\n');

  // Check configuration
  if (!isFtpConfigured()) {
    console.error('❌ FTP not configured. Please set FTP_HOST, FTP_USER, FTP_PASSWORD environment variables.');
    process.exit(1);
  }

  if (!isGcsConfigured()) {
    console.error('❌ GCS not configured. Please set GCS_BUCKET_NAME and GCS_PROJECT_ID environment variables.');
    process.exit(1);
  }

  console.log('✅ Configuration check passed');
  console.log(`   FTP Host: ${process.env.FTP_HOST}`);
  console.log(`   GCS Bucket: ${process.env.GCS_BUCKET_NAME}`);
  console.log(`   GCS Project: ${process.env.GCS_PROJECT_ID || process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT}\n`);

  const db = await initDatabase();
  const stats = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0
  };

  try {
    // Collect all unique filenames
    const allFiles = new Set();

    console.log('📋 Scanning Firestore for image references...\n');

    // Get all projects
    console.log('Scanning projects...');
    const projects = await db.queryAll('projects');
    console.log(`  Found ${projects.length} projects`);

    projects.forEach(project => {
      const files = extractProjectFiles(project);
      files.forEach(file => allFiles.add(file));
      if (files.length > 0) {
        console.log(`  Project "${project.title || project.id}": ${files.length} file(s)`);
      }
    });

    // Get site content
    console.log('\nScanning site content...');
    const contentDoc = await db.queryOne('site_content', 'key', 'content');
    if (contentDoc && contentDoc.value) {
      const content = typeof contentDoc.value === 'string'
        ? JSON.parse(contentDoc.value)
        : contentDoc.value;

      const files = extractContentFiles(content);
      files.forEach(file => allFiles.add(file));
      if (files.length > 0) {
        console.log(`  Site content: ${files.length} file(s)`);
      }
    } else {
      console.log('  No site content found');
    }

    const uniqueFiles = Array.from(allFiles);
    stats.total = uniqueFiles.length;

    console.log(`\n📊 Found ${uniqueFiles.length} unique file(s) to migrate\n`);

    if (uniqueFiles.length === 0) {
      console.log('✅ No files to migrate. Exiting.');
      await closeDatabase();
      return;
    }

    // Confirm before proceeding
    console.log('Files to migrate:');
    uniqueFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
    console.log('\n⚠️  This will download files from FTP and upload them to GCS.');
    console.log('   The files will be stored with the same filename in GCS.\n');

    // Migrate each file
    console.log('🔄 Starting migration...\n');

    const results = [];
    for (let i = 0; i < uniqueFiles.length; i++) {
      const fileName = uniqueFiles[i];
      console.log(`[${i + 1}/${uniqueFiles.length}] Processing ${fileName}...`);
      const result = await migrateFile(fileName, stats);
      results.push(result);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));
    console.log(`Total files found: ${stats.total}`);
    console.log(`✅ Successfully migrated: ${stats.success}`);
    console.log(`❌ Failed: ${stats.failed}`);
    console.log(`⏭️  Skipped: ${stats.skipped}`);

    if (stats.failed > 0) {
      console.log('\nFailed files:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.fileName}: ${r.error}`);
      });
    }

    console.log('\n✅ Migration complete!');
    console.log('\nNote: Firestore still contains the same filenames.');
    console.log('The application will automatically use GCS URLs via getFileUrl() function.');
    console.log('No Firestore updates are needed.\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

// Run migration
migrateImages()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
