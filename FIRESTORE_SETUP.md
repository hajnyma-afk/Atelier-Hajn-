# Firestore Database Setup Guide

This application uses Google Cloud Firestore (NoSQL) for persistent database storage. Firestore is serverless, scales automatically, and offers a generous free tier.

## Cost

- **Free Tier**: 50,000 reads, 20,000 writes, 1 GB storage/month
- **Beyond Free Tier**:
  - Reads: $0.06 per 100,000 documents
  - Writes: $0.18 per 100,000 documents
  - Storage: $0.18/GB/month
- **Typical Portfolio Site**: Usually stays within free tier (~$0-2/month)

## Prerequisites

1. **Google Cloud Project** with billing enabled (for production)
2. **Firestore API enabled** in your GCP project
3. **Service Account** with Firestore permissions (for Cloud Run)

## Setup Steps

### 1. Create/Select a Google Cloud Project

```bash
# Create a new project (or use existing)
gcloud projects create atelier-hajny --name="Atelier Hajný"

# Set the project
gcloud config set project atelier-hajny
```

### 2. Enable Firestore API

```bash
gcloud services enable firestore.googleapis.com
```

### 3. Create Firestore Database

1. Go to [Firestore Console](https://console.cloud.google.com/firestore)
2. Click "Create Database"
3. Choose **Native mode** (not Datastore mode)
4. Select a location (choose the same region as your Cloud Run service for best performance)
5. Click "Create"

### 4. Set Up Authentication

#### For Cloud Run (Production)

Cloud Run automatically uses the default Compute Engine service account. You need to grant it Firestore permissions:

```bash
# Get your project ID
PROJECT_ID=$(gcloud config get-value project)

# Grant Firestore User role to Cloud Run service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" \
  --role="roles/datastore.user"
```

Alternatively, you can use a custom service account:

```bash
# Create a service account
gcloud iam service-accounts create firestore-user \
  --display-name="Firestore User"

# Grant Firestore permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:firestore-user@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Use this service account in Cloud Run deployment
gcloud run services update atelier-hajny \
  --service-account=firestore-user@${PROJECT_ID}.iam.gserviceaccount.com \
  --region=us-central1
```

#### For Local Development

**Option A: Use Application Default Credentials (Recommended)**

```bash
# Authenticate with your Google account
gcloud auth application-default login

# Set your project ID
export GCP_PROJECT_ID=your-project-id
# or
export GOOGLE_CLOUD_PROJECT=your-project-id
```

**Option B: Use Service Account Key File**

1. Create a service account key:
   ```bash
   gcloud iam service-accounts keys create ~/firestore-key.json \
     --iam-account=firestore-user@${PROJECT_ID}.iam.gserviceaccount.com
   ```

2. Set environment variable:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=~/firestore-key.json
   export GCP_PROJECT_ID=your-project-id
   ```

### 5. Environment Variables

Add to your `.env.local` file:

```bash
# Google Cloud Project ID (required)
GCP_PROJECT_ID=your-project-id
# or use GOOGLE_CLOUD_PROJECT instead

# For local development with service account key file:
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

For Cloud Run deployment, set the environment variable:

```bash
gcloud run services update atelier-hajny \
  --region=us-central1 \
  --update-env-vars="GCP_PROJECT_ID=your-project-id"
```

## Database Structure

Firestore organizes data into **collections** and **documents**:

- **`projects`** collection: Portfolio projects
  - Each document contains: `id`, `title`, `thumbnail`, `description`, `year`, `location`, `category`, `images` (array), `created_at`, `updated_at`, `display_order`

- **`posts`** collection: Blog posts
  - Each document contains: `id`, `title`, `content`, `published`, `created_at`, `updated_at`

- **`site_content`** collection: Site configuration
  - Each document key is the content key (e.g., `hero`, `atelier`, `contact`)
  - Document contains: `key`, `value` (JSON string)

- **`settings`** collection: Application settings
  - Each document key is the setting key (e.g., `password`)
  - Document contains: `value`

## Testing the Connection

After setup, start your server:

```bash
npm run dev:server
```

You should see:
```
✅ Database connected to Firestore (project: your-project-id)
```

## Troubleshooting

### "PERMISSION_DENIED" Error

**In Cloud Run:**
- Ensure the service account has `roles/datastore.user` role
- Check that Firestore API is enabled

**In Local Development:**
- Verify `GOOGLE_APPLICATION_CREDENTIALS` points to a valid service account key
- Or ensure `gcloud auth application-default login` was run
- Verify `GCP_PROJECT_ID` or `GOOGLE_CLOUD_PROJECT` is set

### "Project not found" Error

- Set `GCP_PROJECT_ID` or `GOOGLE_CLOUD_PROJECT` environment variable
- Verify the project ID is correct: `gcloud config get-value project`

### Firestore Not Enabled

Enable it:
```bash
gcloud services enable firestore.googleapis.com
```

## Migration from SQLite

If you have existing SQLite data:

1. Export your SQLite data (projects, posts, site_content, settings)
2. Use the Firestore console or a migration script to import the data
3. The application will automatically work with Firestore once configured

## Security Best Practices

1. **Never commit service account keys** to version control
2. **Use IAM roles** instead of service account keys when possible
3. **Restrict Firestore rules** in production (though this app uses server-side access)
4. **Monitor usage** in the Firestore console to stay within free tier
5. **Set up billing alerts** to avoid unexpected charges

## Monitoring

View your Firestore usage:
- [Firestore Console](https://console.cloud.google.com/firestore)
- Check "Usage" tab for read/write operations and storage

## Additional Resources

- [Firestore Documentation](https://cloud.google.com/firestore/docs)
- [Firestore Pricing](https://cloud.google.com/firestore/pricing)
- [Firestore Best Practices](https://cloud.google.com/firestore/docs/best-practices)

