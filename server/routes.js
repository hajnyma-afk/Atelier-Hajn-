import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { UPLOADS_DIR, ensureUploadsDir, generateFileName, getFileUrl } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

ensureUploadsDir();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

export function setupRoutes(app, db) {

  // ========== PROJECTS ==========

  // Get all projects
  app.get('/api/projects', (req, res) => {
    try {
      const projects = db.prepare('SELECT * FROM projects ORDER BY display_order ASC, created_at DESC').all();

      const projectsWithImages = projects.map(project => {
        const images = db.prepare('SELECT file_path FROM project_images WHERE project_id = ? ORDER BY display_order ASC')
          .all(project.id)
          .map(row => getFileUrl(row.file_path));

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
  app.get('/api/projects/:id', (req, res) => {
    try {
      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const images = db.prepare('SELECT file_path FROM project_images WHERE project_id = ? ORDER BY display_order ASC')
        .all(project.id)
        .map(row => getFileUrl(row.file_path));

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
  app.post('/api/projects', (req, res) => {
    try {
      const { id, title, thumbnail, description, year, location, category, images, display_order } = req.body;
      const projectId = id || uuidv4();
      const now = Date.now();

      const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);

      if (existing) {
        // Update
        db.prepare(`
          UPDATE projects
          SET title = ?, thumbnail = ?, description = ?, year = ?, location = ?, category = ?, updated_at = ?, display_order = ?
          WHERE id = ?
        `).run(title, thumbnail, description, year, location, category, now, display_order || 0, projectId);
      } else {
        // Create
        db.prepare(`
          INSERT INTO projects (id, title, thumbnail, description, year, location, category, created_at, updated_at, display_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(projectId, title, thumbnail, description, year, location, category, now, now, display_order || 0);
      }

      // Update images if provided
      if (images && Array.isArray(images)) {
        // Delete existing images
        db.prepare('DELETE FROM project_images WHERE project_id = ?').run(projectId);

        // Insert new images
        const insertImage = db.prepare('INSERT INTO project_images (id, project_id, file_path, display_order) VALUES (?, ?, ?, ?)');
        images.forEach((imagePath, index) => {
          // Extract filename from path (remove /uploads/ prefix if present)
          const fileName = imagePath.replace('/uploads/', '').replace('uploads/', '');
          insertImage.run(uuidv4(), projectId, fileName, index);
        });
      }

      res.json({ id: projectId, success: true });
    } catch (error) {
      console.error('Error saving project:', error);
      res.status(500).json({ error: 'Failed to save project' });
    }
  });

  // Delete project
  app.delete('/api/projects/:id', (req, res) => {
    try {
      const projectId = req.params.id;

      // Get all file paths associated with this project
      const images = db.prepare('SELECT file_path FROM project_images WHERE project_id = ?').all(projectId);
      const project = db.prepare('SELECT thumbnail FROM projects WHERE id = ?').get(projectId);

      // Delete files
      const filesToDelete = [
        ...images.map(img => img.file_path),
        ...(project?.thumbnail ? [project.thumbnail] : [])
      ];

      filesToDelete.forEach(fileName => {
        const filePath = join(UPLOADS_DIR, fileName);
        if (existsSync(filePath)) {
          try {
            unlinkSync(filePath);
          } catch (err) {
            console.error(`Failed to delete file ${filePath}:`, err);
          }
        }
      });

      // Delete from database (cascade will handle project_images)
      db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  });

  // Reorder projects
  app.post('/api/projects/reorder', (req, res) => {
    try {
      const { projectIds } = req.body;
      if (!Array.isArray(projectIds)) {
        return res.status(400).json({ error: 'projectIds must be an array' });
      }

      const updateOrder = db.prepare('UPDATE projects SET display_order = ? WHERE id = ?');
      projectIds.forEach((id, index) => {
        updateOrder.run(index, id);
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error reordering projects:', error);
      res.status(500).json({ error: 'Failed to reorder projects' });
    }
  });

  // ========== FILE UPLOADS ==========

  // Upload single file (image or video)
  app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const fileName = generateFileName(req.file.originalname, req.file.mimetype);
      const filePath = join(UPLOADS_DIR, fileName);

      writeFileSync(filePath, req.file.buffer);

      res.json({
        url: getFileUrl(fileName),
        fileName: fileName
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });

  // Upload multiple files
  app.post('/api/upload/multiple', upload.array('files', 20), (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
      }

      const uploadedFiles = req.files.map(file => {
        const fileName = generateFileName(file.originalname, file.mimetype);
        const filePath = join(UPLOADS_DIR, fileName);
        writeFileSync(filePath, file.buffer);
        return {
          url: getFileUrl(fileName),
          fileName: fileName
        };
      });

      res.json({ files: uploadedFiles });
    } catch (error) {
      console.error('Error uploading files:', error);
      res.status(500).json({ error: 'Failed to upload files' });
    }
  });

  // Delete file
  app.delete('/api/upload/:fileName', (req, res) => {
    try {
      const fileName = req.params.fileName;
      const filePath = join(UPLOADS_DIR, fileName);

      if (existsSync(filePath)) {
        unlinkSync(filePath);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: 'File not found' });
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  // ========== POSTS ==========

  app.get('/api/posts', (req, res) => {
    try {
      const posts = db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();
      res.json(posts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({ error: 'Failed to fetch posts' });
    }
  });

  app.get('/api/posts/:id', (req, res) => {
    try {
      const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
      res.json(post);
    } catch (error) {
      console.error('Error fetching post:', error);
      res.status(500).json({ error: 'Failed to fetch post' });
    }
  });

  app.post('/api/posts', (req, res) => {
    try {
      const { id, title, content, published } = req.body;
      const postId = id || uuidv4();
      const now = Date.now();

      const existing = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);

      if (existing) {
        db.prepare('UPDATE posts SET title = ?, content = ?, published = ?, updated_at = ? WHERE id = ?')
          .run(title, content, published ? 1 : 0, now, postId);
      } else {
        db.prepare('INSERT INTO posts (id, title, content, published, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run(postId, title, content, published ? 1 : 0, now, now);
      }

      res.json({ id: postId, success: true });
    } catch (error) {
      console.error('Error saving post:', error);
      res.status(500).json({ error: 'Failed to save post' });
    }
  });

  app.delete('/api/posts/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ error: 'Failed to delete post' });
    }
  });

  // ========== SITE CONTENT ==========

  app.get('/api/content', (req, res) => {
    try {
      const rows = db.prepare('SELECT key, value FROM site_content').all();
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

  app.post('/api/content', (req, res) => {
    try {
      const content = req.body;
      const insertOrReplace = db.prepare('INSERT OR REPLACE INTO site_content (key, value) VALUES (?, ?)');

      Object.entries(content).forEach(([key, value]) => {
        const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
        insertOrReplace.run(key, jsonValue);
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error saving content:', error);
      res.status(500).json({ error: 'Failed to save content' });
    }
  });

  // ========== SETTINGS ==========

  app.get('/api/settings/:key', (req, res) => {
    try {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);
      res.json({ value: row ? row.value : null });
    } catch (error) {
      console.error('Error fetching setting:', error);
      res.status(500).json({ error: 'Failed to fetch setting' });
    }
  });

  app.post('/api/settings/:key', (req, res) => {
    try {
      const { value } = req.body;
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(req.params.key, value);
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving setting:', error);
      res.status(500).json({ error: 'Failed to save setting' });
    }
  });
}

