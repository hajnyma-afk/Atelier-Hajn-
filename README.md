# ATELIER HAJNÝ - Portfolio CMS

A minimalist content management system for architecture portfolios. Built with React, TypeScript, Express, and SQLite.

## Features

- **Project Portfolio**: Showcase architecture projects with image galleries and videos
- **Content Management**: Edit hero section, about page, and contact information
- **Blog Posts**: Create and manage blog posts
- **Image Optimization**: Automatic image resizing and WebP conversion
- **SEO Settings**: Configure meta tags, keywords, and descriptions
- **Google Analytics**: Integrated Google Analytics 4 support
- **Responsive Design**: Mobile-first, minimalist interface

## Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**

## Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Atelier-Hajn-
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development servers:**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on `http://localhost:3001`
   - Frontend development server on `http://localhost:3000`

   The frontend will automatically proxy API requests to the backend.

4. **Access the application:**
   - Open `http://localhost:3000` in your browser
   - The SQLite database (`server/data.db`) and uploads directory (`server/uploads/`) will be created automatically

## Accessing the Admin Panel

1. Navigate to the footer and click on the admin/login link
2. Enter the default password: `admin123`
3. You'll be redirected to the admin dashboard

**Note:** Change the default password immediately after first login (Settings → Security).

## Adding and Editing Content

### Projects

**To add a new project:**

1. Go to **Admin Dashboard** → **Projekty** tab
2. Click **"Přidat projekt"** (Add Project)
3. Fill in the project details:
   - **Název projektu** (Project Title) - Required
   - **Kategorie** (Category) - Select from dropdown
   - **Lokace** (Location)
   - **Rok** (Year)
   - **Popis** (Description)
4. Upload images:
   - **Hlavní obrázek** (Thumbnail): Click "Nahrát" to upload, then "Upravit" to crop/position (3:2 aspect ratio)
   - **Galerie médií** (Gallery): Upload multiple images or videos
5. Click **"Uložit projekt"** (Save Project)

**To edit a project:**

1. In the projects list, click the edit icon (pencil) next to the project
2. Make your changes
3. Click **"Uložit projekt"**

**To delete a project:**

1. Click the trash icon next to the project
2. Confirm deletion

**To reorder projects:**

- Drag and drop projects in the list using the grip handle on the left

**Project Categories:**
- Bydlení (Housing)
- Občanské stavby (Public Buildings)
- Veřejný prostor (Public Space)
- Interiéry (Interiors)
- Urbanismus (Urbanism)
- Ostatní (Other)

### Hero Section (Homepage)

**To edit the homepage hero:**

1. Go to **Admin Dashboard** → **Úvod** (Home) tab
2. Edit text content:
   - **Hlavní nadpis** (Main Title)
   - **Podnadpis** (Subtitle)
3. Configure text appearance:
   - **Pozice textu** (Text Position): 9-position grid selector
   - **Velikost písma** (Font Size): Small, Medium, or Large
   - **Barva textu** (Text Color): Color picker
4. Upload media:
   - **Video pozadí** (Background Video): Upload MP4/WebM (max 20MB, recommended 16:9)
   - **Alternativní obrázek** (Fallback Image): Used if no video (16:9 aspect ratio)
5. Click **"Uložit změny"** (Save Changes)

### Atelier Page (About)

**To edit the about page:**

1. Go to **Admin Dashboard** → **Atelier** tab
2. Edit content:
   - **Nadpis** (Title)
   - **Úvodní text** (Intro Text)
   - **Filosofie** (Philosophy)
   - **Služby** (Services): Comma-separated list
3. Upload **Hlavní obrázek** (Main Image): 3:4 portrait aspect ratio
4. Click **"Uložit změny"**

### Contact Page

**To edit contact information:**

1. Go to **Admin Dashboard** → **Kontakt** tab
2. Update:
   - **Adresa** (Address)
   - **Email**
   - **Telefon** (Phone)
3. Click **"Uložit změny"**

### SEO Settings

**To configure SEO:**

1. Go to **Admin Dashboard** → **SEO** tab
2. Set:
   - **Titulek stránky** (Meta Title): 50-60 characters recommended
   - **Klíčová slova** (Keywords): Add keywords as tags
   - **Popis webu** (Meta Description): 150-160 characters recommended
3. Click **"Uložit SEO nastavení"**

### Branding & Settings

**To update branding:**

1. Go to **Admin Dashboard** → **Nastavení** (Settings) tab
2. Upload:
   - **Logo společnosti** (Company Logo)
   - **Favicon** (Browser Icon): Square PNG/ICO recommended
3. Configure **Google Analytics**:
   - Enter your Measurement ID (format: `G-XXXXXXXXXX`)
4. Change password:
   - Enter new password (minimum 4 characters)
   - Click **"Změnit heslo"**

### Blog Posts

**To create a blog post:**

1. Navigate to the blog/list view (if accessible from navigation)
2. Click **"Nový příspěvek"** (New Post)
3. Enter title and content
4. Click **"Uložit"** (Save)

**To edit a post:**

1. Select a post from the list
2. Make changes
3. Click **"Uložit"**

**To delete a post:**

1. Click the trash icon in the editor toolbar
2. Confirm deletion

## File Structure

```
Atelier-Hajn-/
├── components/          # React components
│   ├── AdminDashboard.tsx
│   ├── Editor.tsx
│   ├── ProjectGrid.tsx
│   └── ...
├── server/             # Backend server
│   ├── index.js        # Express server entry point
│   ├── db.js           # SQLite database setup
│   ├── routes.js        # API routes
│   ├── utils.js         # Utility functions
│   ├── data.db          # SQLite database (created automatically)
│   └── uploads/         # Uploaded files (created automatically)
├── services/            # Frontend services
│   └── storage.ts       # API client for data operations
├── types.ts            # TypeScript type definitions
├── App.tsx             # Main application component
└── package.json        # Dependencies and scripts
```

## Image Guidelines

- **Thumbnails**: 3:2 aspect ratio, automatically optimized to WebP
- **Hero Images**: 16:9 aspect ratio
- **Hero Videos**: MP4/WebM, max 20MB, 16:9 recommended
- **Atelier Image**: 3:4 portrait aspect ratio
- **Gallery Images**: Any aspect ratio, automatically optimized
- **Gallery Videos**: MP4/WebM, max 20MB

All images are automatically:
- Resized if larger than 1920px (maintains aspect ratio)
- Converted to WebP format
- Optimized for web delivery

## API Endpoints

The backend provides REST API endpoints:

- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create/update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/reorder` - Reorder projects
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create/update post
- `DELETE /api/posts/:id` - Delete post
- `GET /api/content` - Get site content
- `POST /api/content` - Update site content
- `POST /api/upload` - Upload single file
- `POST /api/upload/multiple` - Upload multiple files

## Development

**Run backend only:**
```bash
npm run dev:server
```

**Run frontend only:**
```bash
npm run dev:client
```

**Build for production:**
```bash
npm run build
```

**Preview production build:**
```bash
npm run preview
```

## Data Storage

- **Database**: SQLite (`server/data.db`)
- **Files**: Local filesystem (`server/uploads/`)
- All data persists between sessions

## Troubleshooting

**Backend server won't start:**
- Check if port 3001 is available
- Ensure Node.js is installed correctly

**Images not uploading:**
- Check that `server/uploads/` directory exists and is writable
- Verify file size limits (50MB for uploads, 20MB for videos)

**Database errors:**
- Ensure only one instance of the server is running
- Check file permissions on `server/data.db`

**CORS errors:**
- Ensure backend server is running on port 3001
- Check that frontend proxy configuration in `vite.config.ts` is correct

## Production Deployment

For production deployment:

1. Set `VITE_API_URL` environment variable to your production API URL
2. Consider using cloud storage (S3, Cloudinary) instead of local filesystem
3. Use a production database (PostgreSQL, MySQL) instead of SQLite
4. Implement proper authentication (JWT tokens)
5. Add rate limiting and security headers
6. Set up SSL/HTTPS
7. Configure environment variables securely

## License

Private project - All rights reserved
