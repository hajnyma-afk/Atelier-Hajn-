# GCS Signed URLs Setup Guide

This guide explains how to set up signed URLs for Google Cloud Storage to enable faster image loading.

## Why Signed URLs?

Signed URLs allow direct access to GCS files, bypassing the server proxy. This provides:
- **Faster loading**: Images load directly from Google's CDN
- **Reduced server load**: No proxy overhead
- **Better performance**: Especially noticeable with many images

## Local Development Setup

### Option 1: Using the Setup Script (Recommended)

```bash
./setup-gcs-signed-urls.sh YOUR_PROJECT_ID YOUR_BUCKET_NAME
```

This will:
1. Create a service account for signed URLs
2. Grant Storage Object Viewer permissions
3. Create a key file at `~/gcs-signed-urls-key.json`
4. Show you how to configure it

Then add to your `.env.local`:
```bash
GCS_KEY_FILE=~/gcs-signed-urls-key.json
```

### Option 2: Manual Setup

1. **Create service account**:
   ```bash
   gcloud iam service-accounts create gcs-signed-urls \
     --project=YOUR_PROJECT_ID \
     --display-name="GCS Signed URLs Service Account"
   ```

2. **Grant permissions**:
   ```bash
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:gcs-signed-urls@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/storage.objectViewer"
   ```

3. **Create key file**:
   ```bash
   gcloud iam service-accounts keys create ~/gcs-signed-urls-key.json \
     --iam-account=gcs-signed-urls@YOUR_PROJECT_ID.iam.gserviceaccount.com \
     --project=YOUR_PROJECT_ID
   ```

4. **Add to `.env.local`**:
   ```bash
   GCS_KEY_FILE=~/gcs-signed-urls-key.json
   ```

## Cloud Run Deployment Setup

For Cloud Run, you have two options:

### Option 1: Using Secret Manager (Recommended - More Secure)

1. **Create secret from key file**:
   ```bash
   gcloud secrets create gcs-signed-urls-key \
     --data-file=~/gcs-signed-urls-key.json \
     --project=YOUR_PROJECT_ID
   ```

2. **Grant Cloud Run access to the secret**:
   ```bash
   # Get Cloud Run service account
   CLOUD_RUN_SA=$(gcloud run services describe atelier-hajny \
     --region=europe-west4 \
     --format='value(spec.template.spec.serviceAccountName)' \
     --project=YOUR_PROJECT_ID)

   # If no custom service account, use the default
   if [ -z "$CLOUD_RUN_SA" ]; then
     CLOUD_RUN_SA="${PROJECT_ID}-compute@developer.gserviceaccount.com"
   fi

   # Grant secret accessor role
   gcloud secrets add-iam-policy-binding gcs-signed-urls-key \
     --member="serviceAccount:${CLOUD_RUN_SA}" \
     --role="roles/secretmanager.secretAccessor" \
     --project=YOUR_PROJECT_ID
   ```

3. **Mount secret as environment variable in Cloud Run**:
   ```bash
   gcloud run services update atelier-hajny \
     --region=europe-west4 \
     --update-secrets=GCS_KEY_JSON=gcs-signed-urls-key:latest \
     --project=YOUR_PROJECT_ID
   ```

### Option 2: Using Environment Variable (Simpler but Less Secure)

1. **Read key file content**:
   ```bash
   cat ~/gcs-signed-urls-key.json
   ```

2. **Set as environment variable in Cloud Run**:
   ```bash
   # Escape the JSON properly (remove newlines, escape quotes)
   KEY_JSON=$(cat ~/gcs-signed-urls-key.json | tr -d '\n' | sed 's/"/\\"/g')

   gcloud run services update atelier-hajny \
     --region=europe-west4 \
     --update-env-vars="GCS_KEY_JSON=${KEY_JSON}" \
     --project=YOUR_PROJECT_ID
   ```

   Or add to your `.env.local` and use `--use-env-file`:
   ```bash
   GCS_KEY_JSON='{"type":"service_account","project_id":"...","private_key":"..."}'
   ```

## Verification

After setup, restart your server and check the logs. You should see:
- ✅ No "Cannot sign data without `client_email`" errors
- ✅ Images loading with direct GCS URLs (check browser network tab)
- ✅ URLs should look like: `https://storage.googleapis.com/bucket-name/file.webp?X-Goog-Algorithm=...`

## Troubleshooting

**"Cannot sign data without `client_email`" error:**
- Make sure `GCS_KEY_FILE` or `GCS_KEY_JSON` is set correctly
- Verify the key file exists and is readable (local development)
- Check that the service account has `roles/storage.objectViewer` permission

**Images still using proxy URLs:**
- Check server logs for signed URL generation errors
- Verify the service account key has `private_key` field
- Ensure the key file path is correct (local) or secret is mounted (Cloud Run)

**Cloud Run deployment issues:**
- Make sure Secret Manager API is enabled: `gcloud services enable secretmanager.googleapis.com`
- Verify the Cloud Run service account has access to the secret
- Check Cloud Run logs: `gcloud run services logs read atelier-hajny --region=europe-west4`

## Security Notes

- **Never commit** service account key files to git
- **Use Secret Manager** for Cloud Run deployments (more secure than env vars)
- **Rotate keys** periodically for better security
- **Limit permissions** - only grant `roles/storage.objectViewer` (not admin roles)
