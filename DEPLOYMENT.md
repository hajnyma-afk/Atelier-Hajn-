# Cloud Run Deployment Guide

This guide walks you through deploying the ATELIER HAJNÝ application to Google Cloud Platform (GCP) Cloud Run.

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and configured
3. **Docker** installed (for local testing)
4. **Node.js** (for local development)

## Initial Setup

### 1. Install gcloud CLI

```bash
# macOS
brew install google-cloud-sdk

# Linux
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Windows
# Download from: https://cloud.google.com/sdk/docs/install
```

### 2. Authenticate and Set Project

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create atelier-hajny --name="Atelier Hajný"

# Set the project
gcloud config set project atelier-hajny

# Enable billing (required for Cloud Run)
# Do this in the Cloud Console: https://console.cloud.google.com/billing
```

### 3. Set Up IAM Permissions

**Important:** You need proper IAM permissions to deploy to Cloud Run. Run the setup script:

```bash
# Grant necessary permissions
./setup-iam.sh your-project-id
```

Or manually grant permissions:

```bash
# Get your email
CURRENT_USER=$(gcloud config get-value account)

# Grant Cloud Build Service Account role
gcloud projects add-iam-policy-binding your-project-id \
  --member="user:$CURRENT_USER" \
  --role="roles/cloudbuild.builds.builder"

# Grant Service Account User role
gcloud projects add-iam-policy-binding your-project-id \
  --member="user:$CURRENT_USER" \
  --role="roles/iam.serviceAccountUser"

# Grant Cloud Run Admin role
gcloud projects add-iam-policy-binding your-project-id \
  --member="user:$CURRENT_USER" \
  --role="roles/run.admin"

# Grant Storage Admin role (for Container Registry)
gcloud projects add-iam-policy-binding your-project-id \
  --member="user:$CURRENT_USER" \
  --role="roles/storage.admin"

# Grant Cloud Build service account permission to deploy
CLOUDBUILD_SA="your-project-id@cloudbuild.gserviceaccount.com"
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/iam.serviceAccountUser"
```

**Note:** If you're the project owner, you may already have these permissions. The script will skip roles you already have.

### 4. Enable Required APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

## Environment Variables

### Required Environment Variables

Set these in Cloud Run after deployment:

1. **ADMIN_PASSWORD** - Your admin panel password (required)
2. **FTP_HOST** - Your FTP server hostname (required for file uploads)
3. **FTP_USER** - Your FTP username (required for file uploads)
4. **FTP_PASSWORD** - Your FTP password (required for file uploads)
5. **FTP_BASE_PATH** - FTP directory path (e.g., `/public_html/uploads`)
6. **FTP_BASE_URL** - Public URL for uploaded files (e.g., `https://yourdomain.com/uploads`)

### Optional Environment Variables

- **FTP_PORT** - FTP port (default: `21`)
- **FTP_SECURE** - Use FTPS (default: `false`)
- **VITE_API_URL** - Your Cloud Run service URL (optional, auto-detected)

### Setting Environment Variables

**Option 1: Via gcloud CLI**

Set all required environment variables:

```bash
gcloud run services update atelier-hajny \
  --region=us-central1 \
  --update-env-vars="ADMIN_PASSWORD=your-secure-password-here,FTP_HOST=ftp.yourdomain.com,FTP_USER=your_ftp_user,FTP_PASSWORD=your_ftp_password,FTP_PORT=21,FTP_SECURE=false,FTP_BASE_PATH=/public_html/uploads,FTP_BASE_URL=https://yourdomain.com/uploads"
```

Or set them individually:

```bash
# Admin password
gcloud run services update atelier-hajny \
  --region=us-central1 \
  --set-env-vars="ADMIN_PASSWORD=your-secure-password-here"

# FTP configuration
gcloud run services update atelier-hajny \
  --region=us-central1 \
  --set-env-vars="FTP_HOST=ftp.yourdomain.com"

gcloud run services update atelier-hajny \
  --region=us-central1 \
  --set-env-vars="FTP_USER=your_ftp_user"

gcloud run services update atelier-hajny \
  --region=us-central1 \
  --set-env-vars="FTP_PASSWORD=your_ftp_password"

gcloud run services update atelier-hajny \
  --region=us-central1 \
  --set-env-vars="FTP_BASE_PATH=/public_html/uploads"

gcloud run services update atelier-hajny \
  --region=us-central1 \
  --set-env-vars="FTP_BASE_URL=https://yourdomain.com/uploads"
```

**Note:** For security, consider using [Secret Manager](https://cloud.google.com/secret-manager) for sensitive values like passwords instead of environment variables.

**Option 2: Via Cloud Console**

1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Click on your service
3. Click "Edit & Deploy New Revision"
4. Go to "Variables & Secrets" tab
5. Add environment variables
6. Click "Deploy"

## Deployment Methods

### Method 1: Automated Deployment Script (Recommended)

**Before deploying, ensure you've set up IAM permissions (see step 3 above).**

```bash
# Make scripts executable (if not already)
chmod +x deploy.sh setup-iam.sh

# If you haven't set up IAM permissions yet:
./setup-iam.sh your-project-id

# Option A: Deploy with automatic environment variable configuration from .env.local
./deploy.sh your-project-id europe-west4 --use-env-file

# Option B: Deploy without automatic configuration (set env vars manually after)
./deploy.sh your-project-id europe-west4
```

The script will:
- Check for required permissions
- Enable required APIs
- Build the Docker image
- Push to Container Registry
- Deploy to Cloud Run
- (If `--use-env-file` is used) Automatically configure environment variables from `.env.local`

**Using `--use-env-file` flag:**
- Reads environment variables from `.env.local` file
- Automatically sets them in Cloud Run after deployment
- Only reads: `ADMIN_PASSWORD`, `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`, `FTP_PORT`, `FTP_SECURE`, `FTP_BASE_PATH`, `FTP_BASE_URL`
- Skips comments and empty lines in `.env.local`

### Method 2: Cloud Build (CI/CD)

```bash
# Submit build to Cloud Build
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_REGION=us-central1
```

### Method 3: Manual Deployment

```bash
# Build the Docker image
docker build -t gcr.io/your-project-id/atelier-hajny .

# Push to Container Registry
docker push gcr.io/your-project-id/atelier-hajny

# Deploy to Cloud Run
gcloud run deploy atelier-hajny \
  --image gcr.io/your-project-id/atelier-hajny \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="ADMIN_PASSWORD=your-secure-password-here,NODE_ENV=production,FTP_HOST=ftp.yourdomain.com,FTP_USER=your_ftp_user,FTP_PASSWORD=your_ftp_password,FTP_PORT=21,FTP_SECURE=false,FTP_BASE_PATH=/public_html/uploads,FTP_BASE_URL=https://yourdomain.com/uploads" \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300
```

**Important:** After deployment, make sure to set all FTP environment variables. See [FTP_SETUP.md](./FTP_SETUP.md) for detailed FTP configuration instructions.

## Configuration

### Cloud Build Configuration

Edit `cloudbuild.yaml` to customize:

- **Region**: Change `_REGION` substitution (default: `europe-west4`)
- **Memory**: Change `_MEMORY` (default: `512Mi`)
- **CPU**: Change `_CPU` (default: `1`)
- **Min/Max Instances**: Adjust `_MIN_INSTANCES` and `_MAX_INSTANCES`
- **Timeout**: Change `_TIMEOUT` in seconds (default: `300`)

### Resource Recommendations

- **Small site**: 512Mi memory, 1 CPU
- **Medium site**: 1Gi memory, 2 CPU
- **Large site**: 2Gi memory, 2 CPU

## FTP Configuration

This application uses FTP for file storage. You need to configure FTP credentials after deployment.

### Setting Up FTP

1. **Get FTP credentials from your hosting provider** (e.g., Wedos.com)
   - FTP Host (e.g., `ftp.wedos.com` or `ftp.yourdomain.com`)
   - FTP Username
   - FTP Password
   - FTP Port (usually `21` for standard FTP, `990` for FTPS)

2. **Create uploads directory on your FTP server**
   - Log into your FTP account
   - Navigate to your public HTML directory (usually `public_html` or `www`)
   - Create an `uploads` directory
   - Ensure it has write permissions

3. **Set FTP environment variables in Cloud Run**

   ```bash
   gcloud run services update atelier-hajny \
     --region=us-central1 \
     --update-env-vars="FTP_HOST=ftp.yourdomain.com,FTP_USER=your_ftp_user,FTP_PASSWORD=your_ftp_password,FTP_PORT=21,FTP_SECURE=false,FTP_BASE_PATH=/public_html/uploads,FTP_BASE_URL=https://yourdomain.com/uploads"
   ```

4. **Verify FTP connection**
   - Check Cloud Run logs: `gcloud run services logs read atelier-hajny --region=us-central1`
   - You should see: `✅ FTP storage configured`

For detailed FTP setup instructions, see [FTP_SETUP.md](./FTP_SETUP.md).

## Important Considerations

### ✅ Data Persistence

**Current Setup**:

- **Firestore database** - Fully managed, persistent, serverless NoSQL database
- **Uploaded files** - Stored on FTP server (persistent, configured via environment variables)

**Firestore Benefits**:
- Persistent storage (data survives container restarts)
- Serverless (scales automatically)
- Generous free tier (50K reads, 20K writes, 1 GB storage/month)
- No database management required

### Setting Up Firestore

1. **Enable Firestore API**:
   ```bash
   gcloud services enable firestore.googleapis.com
   ```

2. **Create Firestore Database**:
   - Go to [Firestore Console](https://console.cloud.google.com/firestore)
   - Click "Create Database"
   - Choose **Native mode**
   - Select a location (same region as Cloud Run recommended)

3. **Grant Permissions**:
   ```bash
   PROJECT_ID=$(gcloud config get-value project)
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" \
     --role="roles/datastore.user"
   ```

4. **Set Environment Variable**:
   ```bash
   gcloud run services update atelier-hajny \
     --region=us-central1 \
     --update-env-vars="GCP_PROJECT_ID=$PROJECT_ID"
   ```

See [FIRESTORE_SETUP.md](./FIRESTORE_SETUP.md) for detailed setup instructions.

## Post-Deployment

### 1. Get Your Service URL

```bash
gcloud run services describe atelier-hajny \
  --region=us-central1 \
  --format='value(status.url)'
```

### 2. Frontend API URL Configuration

The frontend automatically detects the environment:
- **In production**: Uses relative URLs (`/api`) - no configuration needed
- **In development**: Uses `VITE_API_URL` or defaults to `http://localhost:3001/api`

If you need to override the API URL in production, set it as an environment variable:

```bash
gcloud run services update atelier-hajny \
  --region=us-central1 \
  --set-env-vars="VITE_API_URL=https://your-service-url.run.app/api"
```

**Note:** Since the frontend and backend are served from the same Cloud Run service, relative URLs work automatically. You typically don't need to set `VITE_API_URL` in production.

### 3. Set Up Custom Domain (Optional)

```bash
gcloud run domain-mappings create \
  --service atelier-hajny \
  --domain yourdomain.com \
  --region us-central1
```

### 4. Monitor Your Service

```bash
# View logs
gcloud run services logs read atelier-hajny --region=us-central1

# View metrics
# Go to: https://console.cloud.google.com/run/detail/us-central1/atelier-hajny/metrics
```

## Troubleshooting

### 403 Forbidden Error When Accessing Service

If you get a 403 error when accessing your Cloud Run service URL:

**Quick Fix:**
```bash
# Check and fix access permissions
./check-access.sh your-project-id us-central1
```

**Manual Fix:**
```bash
# Grant public access (allow unauthenticated)
gcloud run services add-iam-policy-binding atelier-hajny \
  --region=us-central1 \
  --member="allUsers" \
  --role="roles/run.invoker"
```

**Check Service Status:**
```bash
# View service details
gcloud run services describe atelier-hajny --region=us-central1

# Check logs for errors
gcloud run services logs read atelier-hajny --region=us-central1 --limit=50
```

**Common Causes:**
- Service was deployed without `--allow-unauthenticated` flag
- IAM policy was changed after deployment
- Service is crashing on startup (check logs)

### CORS Errors / API Calls Failing

If you see CORS errors or API calls failing with `localhost:3001`:

**The Problem:**
The frontend is trying to connect to `localhost:3001` instead of the Cloud Run service.

**The Solution:**
The code has been updated to automatically use relative URLs (`/api`) in production. You need to rebuild and redeploy:

```bash
# Rebuild and redeploy
./deploy.sh your-project-id us-central1
```

**Why This Happens:**
- The frontend was built with the default `localhost:3001` API URL
- In production, the frontend and backend are served from the same domain
- Relative URLs (`/api`) automatically work without configuration

**Verify the Fix:**
After redeploying, check the browser console - API calls should go to `/api` instead of `http://localhost:3001/api`.

### Permission Denied (403) Errors During Deployment

If you get `HttpError 403` or `PERMISSION_DENIED`:

```bash
# Run the IAM setup script
./setup-iam.sh your-project-id

# Or check your current permissions
gcloud projects get-iam-policy your-project-id \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:$(gcloud config get-value account)"
```

**Common permission issues:**
- Missing `roles/cloudbuild.builds.builder` - Run `./setup-iam.sh`
- Missing `roles/run.admin` - Run `./setup-iam.sh`
- Cloud Build service account can't deploy - Run `./setup-iam.sh` (it grants this automatically)
- Billing not enabled - Enable in Cloud Console

### Container fails to start

```bash
# Check logs
gcloud run services logs read atelier-hajny --region=us-central1 --limit=50

# Common issues:
# - Missing ADMIN_PASSWORD environment variable
# - Port not set correctly (Cloud Run uses PORT env var)
# - Database initialization errors
```

### Files not persisting

- Files uploaded to `server/uploads/` are lost on container restart
- Use Cloud Storage for persistent file storage
- Database in `server/data.db` is lost on container restart
- Use Cloud SQL for persistent database

### CORS errors

- Ensure `VITE_API_URL` matches your Cloud Run service URL
- Check that CORS is enabled in `server/index.js`

### High costs

- Set `_MIN_INSTANCES: '0'` to scale to zero when not in use
- Adjust memory and CPU based on actual usage
- Monitor costs in Cloud Console

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - id: 'auth'
        uses: 'google-github-actions/auth@v1'
        with:
          credentials_json: '${{ secrets.GCP_SA_KEY }}'

      - name: 'Set up Cloud SDK'
        uses: 'google-github-actions/setup-gcloud@v1'

      - name: 'Deploy to Cloud Run'
        run: |
          gcloud builds submit --config=cloudbuild.yaml \
            --substitutions=_REGION=us-central1
```

## Cost Estimation

Approximate monthly costs (varies by usage):

- **Cloud Run**: $0.40 per million requests + $0.00002400 per GB-second
- **Cloud Build**: $0.003 per build-minute
- **Container Registry**: $0.026 per GB stored

For a small portfolio site:
- **Estimated**: $5-20/month (with scale-to-zero enabled)

## Security Best Practices

1. **Never commit** `.env` files or passwords
2. **Use Secret Manager** for sensitive data:
   ```bash
   # Create secret
   echo -n "your-password" | gcloud secrets create admin-password --data-file=-

   # Use in Cloud Run
   gcloud run services update atelier-hajny \
     --update-secrets=ADMIN_PASSWORD=admin-password:latest
   ```
3. **Enable authentication** if needed (remove `--allow-unauthenticated`)
4. **Set up VPC** for private services
5. **Use HTTPS** (automatic with Cloud Run)

## Next Steps

1. Set up Cloud Storage for file uploads
2. Migrate to Cloud SQL for database
3. Set up monitoring and alerts
4. Configure custom domain
5. Set up CI/CD pipeline

