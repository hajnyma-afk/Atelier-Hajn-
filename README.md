# ATELIER HAJNÝ - Portfolio CMS

A minimalist content management system for architecture portfolios. Built with React, TypeScript, Express, and Google Cloud Firestore.

## Features

- **Project Portfolio**: Showcase architecture projects with image galleries and videos
- **Content Management**: Edit hero section, about page, and contact information
- **Blog Posts**: Create and manage blog posts
- **Image Optimization**: Automatic image resizing and WebP conversion
- **FTP Storage**: Files stored on FTP server with proxy endpoint for CORS-free access
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

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and configure:
   ```bash
   # Admin password (required)
   ADMIN_PASSWORD=your-secure-password-here

   # Google Cloud Project ID (required for Firestore)
   GCP_PROJECT_ID=your-project-id
   # or use GOOGLE_CLOUD_PROJECT instead

   # For local development with service account key file (optional):
   # GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

   # FTP configuration (required for file uploads)
   FTP_HOST=ftp.yourdomain.com
   FTP_USER=your_ftp_username
   FTP_PASSWORD=your_ftp_password
   FTP_PORT=21
   FTP_SECURE=false
   FTP_BASE_PATH=/public_html/uploads
   FTP_BASE_URL=https://yourdomain.com/uploads
   ```

   **Important:** Never commit `.env.local` to version control. It's already in `.gitignore`.

   See [FIRESTORE_SETUP.md](./FIRESTORE_SETUP.md) for Firestore setup instructions.
   See [FTP_SETUP.md](./FTP_SETUP.md) for detailed FTP configuration instructions.

4. **Start the development servers:**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on `http://localhost:3001`
   - Frontend development server on `http://localhost:3000`

   The frontend will automatically proxy API requests to the backend.

5. **Set up Firestore database:**
   - Follow the instructions in [FIRESTORE_SETUP.md](./FIRESTORE_SETUP.md)
   - Ensure `GCP_PROJECT_ID` is set in `.env.local`

6. **Access the application:**
   - Open `http://localhost:3000` in your browser
   - Firestore collections will be created automatically on first use

## Accessing the Admin Panel

1. Navigate to the footer and click on the admin/login link
2. Enter the password you set in `ADMIN_PASSWORD` environment variable
3. You'll be redirected to the admin dashboard

**Note:**
- If you didn't set `ADMIN_PASSWORD`, you'll need to set a password through the admin panel after first login (if the database is empty)
- Change the password immediately after first login (Settings → Security) for additional security

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
│   ├── db.js           # Firestore database setup
│   ├── routes.js        # API routes
│   ├── utils.js         # Utility functions
│   └── ftpService.js    # FTP file storage service
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
- `DELETE /api/upload/:fileName` - Delete file
- `GET /api/images/:fileName` - Proxy endpoint for serving images from FTP (avoids CORS issues)

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

- **Database**: Google Cloud Firestore (NoSQL, serverless)
- **Files**: FTP server (configured via environment variables)
- All data persists between sessions

### FTP Storage

This application uses FTP for storing uploaded files (images and videos). Files are uploaded to your FTP server and served through a proxy endpoint to avoid CORS issues.

**Setup:**
1. Configure FTP credentials in `.env.local` (see [FTP_SETUP.md](./FTP_SETUP.md))
2. Create an `uploads` directory on your FTP server
3. Restart the server

The application will automatically:
- Upload files to your FTP server
- Serve images through `/api/images/:filename` proxy endpoint
- Handle file deletions from FTP

## Troubleshooting

**Backend server won't start:**
- Check if port 3001 is available
- Ensure Node.js is installed correctly

**Images not uploading:**
- Verify FTP configuration in `.env.local` (FTP_HOST, FTP_USER, FTP_PASSWORD, FTP_BASE_PATH, FTP_BASE_URL)
- Check FTP server logs and ensure the uploads directory exists and is writable
- Verify file size limits (50MB for uploads, 20MB for videos)
- Check server logs for FTP connection errors

**Database errors:**
- Ensure only one instance of the server is running
- Check Firestore permissions and project ID configuration

**CORS errors:**
- Ensure backend server is running on port 3001
- Check that frontend proxy configuration in `vite.config.ts` is correct

## Production Deployment

### Google Cloud Platform (Cloud Run)

**Quick Start:**

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed Cloud Run deployment instructions.

```bash
# 1. Set up IAM permissions (first time only)
./setup-iam.sh your-project-id

# 2. Configure environment variables in .env.local
# Make sure your .env.local contains ADMIN_PASSWORD and FTP_* variables

# 3. Deploy to Cloud Run (with automatic env var configuration)
./deploy.sh your-project-id us-central1 --use-env-file

# Or deploy without automatic configuration and set env vars manually:
./deploy.sh your-project-id us-central1

# Then set environment variables manually:
gcloud run services update atelier-hajny \
  --region=us-central1 \
  --update-env-vars="ADMIN_PASSWORD=your-secure-password-here,FTP_HOST=ftp.yourdomain.com,FTP_USER=your_ftp_user,FTP_PASSWORD=your_ftp_password,FTP_PORT=21,FTP_SECURE=false,FTP_BASE_PATH=/public_html/uploads,FTP_BASE_URL=https://yourdomain.com/uploads"
```

**Important:** After deployment, you must configure:
1. **Admin password** - Required for admin panel access
2. **FTP credentials** - Required for file uploads (see [FTP_SETUP.md](./FTP_SETUP.md) for details)

**Using `--use-env-file` flag:**
- Automatically reads environment variables from `.env.local`
- Configures Cloud Run with these variables after deployment
- Only reads: `ADMIN_PASSWORD`, `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`, `FTP_PORT`, `FTP_SECURE`, `FTP_BASE_PATH`, `FTP_BASE_URL`
- Skips comments and empty lines

**Note:**
- If you get permission errors (403) during deployment, run `./setup-iam.sh` first to grant necessary IAM roles.
- If you get 403 when accessing the deployed service, run `./check-access.sh` to fix public access permissions.

**What's Included:**
- Dockerfile for containerization
- Cloud Build configuration (`cloudbuild.yaml`)
- Automated deployment script (`deploy.sh`)
- Complete deployment guide (`DEPLOYMENT.md`)

### General Production Considerations

1. **Set up the admin password:**
   - Set the `ADMIN_PASSWORD` environment variable on your production server
   - This will be used as the initial password when the database is first created
   - **Important:** Use a strong, unique password (at least 12 characters, mix of letters, numbers, and symbols)
   - **Never** commit the production password to version control

2. **Configure FTP storage:**
   - Set FTP environment variables (`FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`, `FTP_BASE_PATH`, `FTP_BASE_URL`)
   - Create the uploads directory on your FTP server
   - See [FTP_SETUP.md](./FTP_SETUP.md) for detailed instructions
   - **Note:** Files are served through a proxy endpoint to avoid CORS issues

3. Set `VITE_API_URL` environment variable to your production API URL (if needed)

4. **Data Persistence:**
   - **Database**: Firestore (persistent, serverless, scales automatically)
   - **Files**: Stored on FTP server (configured via environment variables)
   - **For Cloud Run**: Consider using Cloud SQL for database persistence (see DEPLOYMENT.md)
   - **For other platforms**: Consider using cloud storage (S3, Cloudinary) or keep using FTP

4. Implement proper authentication (JWT tokens) for enhanced security

5. Add rate limiting and security headers

6. Set up SSL/HTTPS (automatic with Cloud Run)

7. Configure all environment variables securely:
   - Use your hosting platform's secure environment variable management
   - Never expose environment variables in client-side code
   - Rotate passwords regularly

## License

Private project - All rights reserved
