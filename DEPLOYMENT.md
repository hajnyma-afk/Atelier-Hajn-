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
2. **VITE_API_URL** - Your Cloud Run service URL (optional, auto-detected)

### Setting Environment Variables

**Option 1: Via gcloud CLI**

```bash
gcloud run services update atelier-hajny \
  --region=us-central1 \
  --set-env-vars="ADMIN_PASSWORD=your-secure-password-here"
```

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

# Deploy
./deploy.sh your-project-id us-central1
```

The script will:
- Check for required permissions
- Enable required APIs
- Build the Docker image
- Push to Container Registry
- Deploy to Cloud Run

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
  --set-env-vars="ADMIN_PASSWORD=your-secure-password-here,NODE_ENV=production" \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300
```

## Configuration

### Cloud Build Configuration

Edit `cloudbuild.yaml` to customize:

- **Region**: Change `_REGION` substitution (default: `us-central1`)
- **Memory**: Change `_MEMORY` (default: `512Mi`)
- **CPU**: Change `_CPU` (default: `1`)
- **Min/Max Instances**: Adjust `_MIN_INSTANCES` and `_MAX_INSTANCES`
- **Timeout**: Change `_TIMEOUT` in seconds (default: `300`)

### Resource Recommendations

- **Small site**: 512Mi memory, 1 CPU
- **Medium site**: 1Gi memory, 2 CPU
- **Large site**: 2Gi memory, 2 CPU

## Important Considerations

### ⚠️ Data Persistence

**Current Limitation**: Cloud Run instances are stateless and ephemeral. This means:

- **SQLite database** (`server/data.db`) will be lost when the container stops
- **Uploaded files** (`server/uploads/`) will be lost when the container stops

### Solutions for Production

1. **Use Cloud SQL** (PostgreSQL or MySQL) instead of SQLite
2. **Use Cloud Storage** for file uploads instead of local filesystem
3. **Use Cloud SQL with persistent disk** for SQLite (not recommended)

### Quick Fix: Use Cloud Storage for Files

Update `server/utils.js` to use Cloud Storage:

```javascript
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucket = storage.bucket('your-bucket-name');

export async function saveFile(fileName, buffer) {
  const file = bucket.file(fileName);
  await file.save(buffer);
  return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
}
```

### Quick Fix: Use Cloud SQL

Replace SQLite with PostgreSQL:

1. Create Cloud SQL instance
2. Update database connection in `server/db.js`
3. Use `pg` or `postgres` npm package

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

