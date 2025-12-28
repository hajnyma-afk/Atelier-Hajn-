import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { uploadToFtp, deleteFromFtp, downloadFromFtp, isFtpConfigured } from './ftpService.js';
import { generateFileName, getFileUrl } from './utils.js';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

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

      const projectsWithImages = projects.map(project => {
        // Images are stored as an array in the project document
        const images = (project.images || []).map(filePath => getFileUrl(filePath));

        return {
          ...project,
          thumbnail: project.thumbnail ? getFileUrl(project.thumbnail) : null,
          images
        };
      });

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

      const images = (project.images || []).map(filePath => getFileUrl(filePath));

      res.json({
        ...project,
        thumbnail: project.thumbnail ? getFileUrl(project.thumbnail) : null,
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
      const { id, title, thumbnail, description, year, location, category, images, display_order } = req.body;
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

      // Delete files from FTP
      const filesToDelete = [
        ...(project.images || []),
        ...(project.thumbnail ? [project.thumbnail] : [])
      ];

      if (isFtpConfigured()) {
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

      if (!isFtpConfigured()) {
        return res.status(500).json({ error: 'FTP not configured. Please set FTP_HOST, FTP_USER, FTP_PASSWORD, and FTP_BASE_URL environment variables.' });
      }

      const fileName = generateFileName(req.file.originalname, req.file.mimetype);
      const fileUrl = await uploadToFtp(req.file.buffer, fileName);

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

      if (!isFtpConfigured()) {
        return res.status(500).json({ error: 'FTP not configured. Please set FTP_HOST, FTP_USER, FTP_PASSWORD, and FTP_BASE_URL environment variables.' });
      }

      const uploadedFiles = await Promise.all(
        req.files.map(async (file) => {
          const fileName = generateFileName(file.originalname, file.mimetype);
          const fileUrl = await uploadToFtp(file.buffer, fileName);
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

      if (!isFtpConfigured()) {
        return res.status(500).json({ error: 'FTP not configured' });
      }

      await deleteFromFtp(fileName);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: `Failed to delete file: ${error.message}` });
    }
  });

  // Proxy endpoint for images and videos (avoids CORS issues)
  app.get('/api/images/:fileName', async (req, res) => {
    try {
      // Extract filename from URL parameter (handle encoded paths)
      let fileName = decodeURIComponent(req.params.fileName);

      // Security: Remove any path traversal attempts
      fileName = fileName.replace(/\.\./g, '').replace(/^\//, '');

      if (!isFtpConfigured()) {
        return res.status(500).json({ error: 'FTP not configured' });
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

      // Download file from FTP
      const fileBuffer = await downloadFromFtp(fileName);
      const fileSize = fileBuffer.length;

      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range');

      // Handle range requests for videos (required for video playback and seeking)
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
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.send(chunk);
      } else {
        // Full file response for images or non-range requests
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', fileSize);
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        if (isVideo) {
          res.setHeader('Accept-Ranges', 'bytes');
        }
        res.send(fileBuffer);
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
      res.json(content);
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
}
