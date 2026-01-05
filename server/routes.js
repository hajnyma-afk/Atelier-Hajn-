import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { uploadToFtp, deleteFromFtp, downloadFromFtp, isFtpConfigured } from './ftpService.js';
import { uploadToGcs, deleteFromGcs, downloadFromGcs, isGcsConfigured, getGcsBucket, getGcsSignedUrl } from './gcsService.js';
import { generateFileName, getFileUrl, extractFileName } from './utils.js';
import { sendContactEmail, isEmailConfigured } from './emailService.js';

// Helper functions to determine which storage to use
function isStorageConfigured() {
  return isFtpConfigured() || isGcsConfigured();
}

function getStorageType() {
  // Prefer GCS if both are configured
  if (isGcsConfigured()) return 'gcs';
  if (isFtpConfigured()) return 'ftp';
  return null;
}

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

/**
 * Convert file paths to signed URLs for GCS (if configured)
 * This allows direct access to GCS files, bypassing the proxy for much better performance
 * Falls back to proxy URLs if signed URL generation is not possible
 */
async function convertToSignedUrls(filePaths) {
  if (!isGcsConfigured() || !filePaths || filePaths.length === 0) {
    return filePaths;
  }

  return Promise.all(
    filePaths.map(async (filePath) => {
      // Skip YouTube URLs and external URLs
      if (!filePath || typeof filePath !== 'string' ||
          filePath.includes('youtube.com') || filePath.includes('youtu.be') ||
          (filePath.startsWith('http') && !filePath.includes('storage.googleapis.com') && !filePath.includes('/api/images/'))) {
        return filePath;
      }

      try {
        // Extract filename from path
        const fileName = extractFileName(filePath);
        // Generate signed URL valid for 24 hours
        const signedUrl = await getGcsSignedUrl(fileName, 24 * 60);
        // If signed URL generation returned null (missing credentials), fall back to proxy
        return signedUrl || getFileUrl(filePath);
      } catch (error) {
        // Fallback to proxy URL if signed URL generation fails
        return getFileUrl(filePath);
      }
    })
  );
}

/**
 * Convert a single file path to signed URL (if GCS)
 * Falls back to proxy URL if signed URL generation is not possible
 */
async function convertToSignedUrl(filePath) {
  if (!filePath || !isGcsConfigured()) {
    return filePath ? getFileUrl(filePath) : null;
  }

  // Skip YouTube URLs and external URLs
  if (typeof filePath !== 'string' ||
      filePath.includes('youtube.com') || filePath.includes('youtu.be') ||
      (filePath.startsWith('http') && !filePath.includes('storage.googleapis.com') && !filePath.includes('/api/images/'))) {
    return filePath;
  }

  try {
    const fileName = extractFileName(filePath);
    const signedUrl = await getGcsSignedUrl(fileName, 24 * 60);
    // If signed URL generation returned null (missing credentials), fall back to proxy
    return signedUrl || getFileUrl(filePath);
  } catch (error) {
    // Fallback to proxy URL if signed URL generation fails
    return getFileUrl(filePath);
  }
}

/**
 * Recursively process content object and convert file paths to signed URLs
 */
async function processContentForSignedUrls(content) {
  if (!content || !isGcsConfigured()) {
    return content;
  }

  const processed = { ...content };

  // Process hero images/videos
  if (processed.hero) {
    if (processed.hero.image) {
      processed.hero.image = await convertToSignedUrl(processed.hero.image);
    }
    if (processed.hero.video) {
      processed.hero.video = await convertToSignedUrl(processed.hero.video);
    }
  }

  // Process branding (logo, favicon)
  if (processed.branding) {
    if (processed.branding.logo) {
      processed.branding.logo = await convertToSignedUrl(processed.branding.logo);
    }
    if (processed.branding.favicon) {
      processed.branding.favicon = await convertToSignedUrl(processed.branding.favicon);
    }
  }

  // Process atelier blocks (left and right columns)
  if (processed.atelier) {
    const processBlocks = async (blocks) => {
      if (!Array.isArray(blocks)) return blocks;
      return Promise.all(
        blocks.map(async (block) => {
          if (block.content && (block.type === 'image' || block.type === 'video')) {
            return {
              ...block,
              content: await convertToSignedUrl(block.content)
            };
          }
          return block;
        })
      );
    };

    if (processed.atelier.leftColumn) {
      processed.atelier.leftColumn = await processBlocks(processed.atelier.leftColumn);
    }
    if (processed.atelier.rightColumn) {
      processed.atelier.rightColumn = await processBlocks(processed.atelier.rightColumn);
    }
  }

  return processed;
}

export function setupRoutes(app, db) {

  // ========== PROJECTS ==========

  // Get all projects
  app.get('/api/projects', async (req, res) => {
    try {
      // Get all projects, ordered by display_order then created_at
      const projects = await db.queryAll('projects', 'display_order', 'asc');

      // Sort by created_at DESC as secondary sort (Firestore only supports one orderBy per query)
      projects.sort((a, b) => {
        if (a.display_order !== b.display_order) {
          return a.display_order - b.display_order;
        }
        return (b.created_at || 0) - (a.created_at || 0);
      });

      // Convert file paths to signed URLs for faster loading
      const projectsWithImages = await Promise.all(
        projects.map(async (project) => {
          const images = await convertToSignedUrls(project.images || []);
          const thumbnail = await convertToSignedUrl(project.thumbnail);

          return {
            ...project,
            thumbnail,
            images
          };
        })
      );

      res.json(projectsWithImages);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  // Get single project
  app.get('/api/projects/:id', async (req, res) => {
    try {
      const project = await db.getById('projects', req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Convert file paths to signed URLs for faster loading
      const images = await convertToSignedUrls(project.images || []);
      const thumbnail = await convertToSignedUrl(project.thumbnail);

      res.json({
        ...project,
        thumbnail,
        images
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  });

  // Create or update project
  app.post('/api/projects', async (req, res) => {
    try {
      const { id, title, thumbnail, description, year, location, category, images, display_order, blocks } = req.body;
      const projectId = id || uuidv4();
      const now = Date.now();

      const existing = await db.getById('projects', projectId);

      // Process images: extract filenames from paths
      let processedImages = [];
      if (images && Array.isArray(images)) {
        processedImages = images.map(imagePath => {
          // Extract filename from path (remove /api/images/, /uploads/ prefixes if present)
          let fileName = imagePath;
          // Remove protocol and domain if present
          fileName = fileName.replace(/^https?:\/\/[^\/]+/, '');
          // Remove /api/images/ prefix (FTP proxy endpoint)
          fileName = fileName.replace(/^\/api\/images\//, '');
          // Remove /uploads/ prefix (legacy local storage)
          fileName = fileName.replace(/^\/uploads\//, '').replace(/^uploads\//, '');
          return fileName;
        });
      }

      const projectData = {
        title,
        thumbnail: thumbnail || null,
        description: description || null,
        year: year || null,
        location: location || null,
        category: category || null,
        images: processedImages,
        blocks: blocks || [],
        display_order: display_order || 0,
        updated_at: now
      };

      if (!existing) {
        // Create new project
        projectData.created_at = now;
      }

      await db.set('projects', projectId, projectData);

      res.json({ id: projectId, success: true });
    } catch (error) {
      console.error('Error saving project:', error);
      res.status(500).json({ error: 'Failed to save project' });
    }
  });

  // Delete project
  app.delete('/api/projects/:id', async (req, res) => {
    try {
      const projectId = req.params.id;

      // Get project to find associated files
      const project = await db.getById('projects', projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Delete files from storage (FTP or GCS)
      const filesToDelete = [
        ...(project.images || []),
        ...(project.thumbnail ? [project.thumbnail] : [])
      ];

      const storageType = getStorageType();
      if (storageType === 'gcs') {
        for (const fileName of filesToDelete) {
          try {
            await deleteFromGcs(fileName);
          } catch (err) {
            console.error(`Failed to delete file ${fileName} from GCS:`, err.message);
          }
        }
      } else if (storageType === 'ftp') {
        for (const fileName of filesToDelete) {
          try {
            await deleteFromFtp(fileName);
          } catch (err) {
            console.error(`Failed to delete file ${fileName} from FTP:`, err.message);
          }
        }
      }

      // Delete project from database
      await db.delete('projects', projectId);

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  });

  // Reorder projects
  app.post('/api/projects/reorder', async (req, res) => {
    try {
      const { projectIds } = req.body;
      if (!Array.isArray(projectIds)) {
        return res.status(400).json({ error: 'projectIds must be an array' });
      }

      // Update display_order for each project
      const updates = projectIds.map((id, index) =>
        db.set('projects', id, { display_order: index })
      );

      await Promise.all(updates);

      res.json({ success: true });
    } catch (error) {
      console.error('Error reordering projects:', error);
      res.status(500).json({ error: 'Failed to reorder projects' });
    }
  });

  // ========== FILE UPLOADS ==========

  // Upload single file (image or video)
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      if (!isStorageConfigured()) {
        return res.status(500).json({ error: 'Storage not configured. Please set either GCS (GCS_BUCKET_NAME, GCS_PROJECT_ID) or FTP (FTP_HOST, FTP_USER, FTP_PASSWORD) environment variables.' });
      }

      const fileName = generateFileName(req.file.originalname, req.file.mimetype);
      const storageType = getStorageType();

      let fileUrl;
      if (storageType === 'gcs') {
        await uploadToGcs(req.file.buffer, fileName);
        // Try to generate signed URL for immediate use (valid for 24 hours)
        // Falls back to proxy URL if signing is not possible
        const signedUrl = await getGcsSignedUrl(fileName, 24 * 60);
        fileUrl = signedUrl || getFileUrl(fileName);
      } else {
        fileUrl = await uploadToFtp(req.file.buffer, fileName);
      }

      res.json({
        url: fileUrl,
        fileName: fileName
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: `Failed to upload file: ${error.message}` });
    }
  });

  // Upload multiple files
  app.post('/api/upload/multiple', upload.array('files', 20), async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
      }

      if (!isStorageConfigured()) {
        return res.status(500).json({ error: 'Storage not configured. Please set either GCS (GCS_BUCKET_NAME, GCS_PROJECT_ID) or FTP (FTP_HOST, FTP_USER, FTP_PASSWORD) environment variables.' });
      }

      const storageType = getStorageType();
      const uploadedFiles = await Promise.all(
        req.files.map(async (file) => {
          const fileName = generateFileName(file.originalname, file.mimetype);
          let fileUrl;
          if (storageType === 'gcs') {
            await uploadToGcs(file.buffer, fileName);
            // Try to generate signed URL for immediate use (valid for 24 hours)
            // Falls back to proxy URL if signing is not possible
            const signedUrl = await getGcsSignedUrl(fileName, 24 * 60);
            fileUrl = signedUrl || getFileUrl(fileName);
          } else {
            fileUrl = await uploadToFtp(file.buffer, fileName);
          }
          return {
            url: fileUrl,
            fileName: fileName
          };
        })
      );

      res.json({ files: uploadedFiles });
    } catch (error) {
      console.error('Error uploading files:', error);
      res.status(500).json({ error: `Failed to upload files: ${error.message}` });
    }
  });

  // Delete file
  app.delete('/api/upload/:fileName', async (req, res) => {
    try {
      const fileName = req.params.fileName;

      if (!isStorageConfigured()) {
        return res.status(500).json({ error: 'Storage not configured' });
      }

      const storageType = getStorageType();
      if (storageType === 'gcs') {
        await deleteFromGcs(fileName);
      } else {
        await deleteFromFtp(fileName);
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: `Failed to delete file: ${error.message}` });
    }
  });

  // Proxy endpoint for images and videos (avoids CORS issues)
  app.get('/api/images/:fileName(*)', async (req, res) => {
    try {
      // Extract filename from URL parameter (handle encoded paths and full paths)
      let fileName = decodeURIComponent(req.params.fileName);

      // Security: Remove any path traversal attempts
      fileName = fileName.replace(/\.\./g, '').replace(/^\//, '');

      // Extract just the filename from paths using the shared utility function
      // This handles cases where the database has paths like "/atelier-hajny-web-file-content/filename.webp"
      fileName = extractFileName(fileName);

      if (!isStorageConfigured()) {
        return res.status(500).json({ error: 'Storage not configured' });
      }

      // Determine content type based on file extension
      const isVideo = fileName.endsWith('.mp4') || fileName.endsWith('.webm');
      let contentType = 'application/octet-stream';
      if (fileName.endsWith('.webp')) {
        contentType = 'image/webp';
      } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (fileName.endsWith('.png')) {
        contentType = 'image/png';
      } else if (fileName.endsWith('.gif')) {
        contentType = 'image/gif';
      } else if (fileName.endsWith('.mp4')) {
        contentType = 'video/mp4';
      } else if (fileName.endsWith('.webm')) {
        contentType = 'video/webm';
      }

      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range');

      // Download file from storage (FTP or GCS)
      const storageType = getStorageType();

      if (storageType === 'gcs') {
        // Stream directly from GCS for better performance (no memory buffering)
        const bucket = getGcsBucket();
        const file = bucket.file(fileName);

        // Get file metadata for size and ETag
        const [metadata] = await file.getMetadata();
        const fileSize = parseInt(metadata.size, 10);
        const etag = metadata.etag;

        // Check if client has cached version (304 Not Modified)
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch === etag) {
          res.status(304).end();
          return;
        }

        // Set cache headers
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('ETag', etag);
        res.setHeader('Content-Type', contentType);

        // Handle range requests for videos
        const range = req.headers.range;
        if (isVideo && range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunkSize = (end - start) + 1;

          res.status(206); // Partial Content
          res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Content-Length', chunkSize);

          // Stream partial file
          file.createReadStream({ start, end }).pipe(res);
        } else {
          // Stream full file
          res.setHeader('Content-Length', fileSize);
          if (isVideo) {
            res.setHeader('Accept-Ranges', 'bytes');
          }
          file.createReadStream().pipe(res);
        }
      } else {
        // FTP - buffer required (FTP library doesn't support streaming well)
        const fileBuffer = await downloadFromFtp(fileName);
        const fileSize = fileBuffer.length;

        // Generate ETag from file content hash
        const crypto = await import('crypto');
        const etag = `"${crypto.createHash('md5').update(fileBuffer).digest('hex')}"`;

        // Check if client has cached version (304 Not Modified)
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch === etag) {
          res.status(304).end();
          return;
        }

        // Handle range requests for videos
        const range = req.headers.range;
        if (isVideo && range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunkSize = (end - start) + 1;
          const chunk = fileBuffer.slice(start, end + 1);

          res.status(206); // Partial Content
          res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Content-Length', chunkSize);
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.setHeader('ETag', etag);
          res.send(chunk);
        } else {
          // Full file response
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Length', fileSize);
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.setHeader('ETag', etag);
          if (isVideo) {
            res.setHeader('Accept-Ranges', 'bytes');
          }
          res.send(fileBuffer);
        }
      }
    } catch (error) {
      console.error('Error proxying file:', error);
      res.status(404).json({ error: `File not found: ${error.message}` });
    }
  });

  // ========== POSTS ==========

  app.get('/api/posts', async (req, res) => {
    try {
      const posts = await db.queryAll('posts', 'created_at', 'desc');
      res.json(posts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({ error: 'Failed to fetch posts' });
    }
  });

  app.get('/api/posts/:id', async (req, res) => {
    try {
      const post = await db.getById('posts', req.params.id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
      res.json(post);
    } catch (error) {
      console.error('Error fetching post:', error);
      res.status(500).json({ error: 'Failed to fetch post' });
    }
  });

  app.post('/api/posts', async (req, res) => {
    try {
      const { id, title, content, published } = req.body;
      const postId = id || uuidv4();
      const now = Date.now();

      const existing = await db.getById('posts', postId);

      const postData = {
        title,
        content,
        published: published ? true : false,
        updated_at: now
      };

      if (!existing) {
        postData.created_at = now;
      }

      await db.set('posts', postId, postData);

      res.json({ id: postId, success: true });
    } catch (error) {
      console.error('Error saving post:', error);
      res.status(500).json({ error: 'Failed to save post' });
    }
  });

  app.delete('/api/posts/:id', async (req, res) => {
    try {
      await db.delete('posts', req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ error: 'Failed to delete post' });
    }
  });

  // ========== SITE CONTENT ==========

  app.get('/api/content', async (req, res) => {
    try {
      const rows = await db.queryAll('site_content');
      const content = {};
      rows.forEach(row => {
        try {
          content[row.key] = JSON.parse(row.value);
        } catch {
          content[row.key] = row.value;
        }
      });

      // Convert file paths to signed URLs for faster loading
      const processedContent = await processContentForSignedUrls(content);

      res.json(processedContent);
    } catch (error) {
      console.error('Error fetching content:', error);
      res.status(500).json({ error: 'Failed to fetch content' });
    }
  });

  app.post('/api/content', async (req, res) => {
    try {
      const content = req.body;

      // Save each key-value pair as a document
      const updates = Object.entries(content).map(([key, value]) => {
        const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
        return db.set('site_content', key, { key, value: jsonValue });
      });

      await Promise.all(updates);

      res.json({ success: true });
    } catch (error) {
      console.error('Error saving content:', error);
      res.status(500).json({ error: 'Failed to save content' });
    }
  });

  // ========== SETTINGS ==========

  app.get('/api/settings/:key', async (req, res) => {
    try {
      const setting = await db.getById('settings', req.params.key);
      // For password, return null if not set (don't expose env var as fallback for security)
      if (req.params.key === 'password' && !setting) {
        return res.json({ value: null });
      }
      res.json({ value: setting ? setting.value : null });
    } catch (error) {
      console.error('Error fetching setting:', error);
      res.status(500).json({ error: 'Failed to fetch setting' });
    }
  });

  app.post('/api/settings/:key', async (req, res) => {
    try {
      const { value } = req.body;
      await db.set('settings', req.params.key, { value });
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving setting:', error);
      res.status(500).json({ error: 'Failed to save setting' });
    }
  });

  // ========== CONTACT FORM ==========

  app.post('/api/contact', async (req, res) => {
    try {
      const { name, email, message } = req.body;

      // Validate input
      if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email, and message are required' });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }

      if (!isEmailConfigured()) {
        return res.status(500).json({ error: 'Email service not configured' });
      }

      await sendContactEmail(name.trim(), email.trim(), message.trim());
      res.json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
      console.error('Error sending contact email:', error);
      res.status(500).json({ error: `Failed to send email: ${error.message}` });
    }
  });
}
