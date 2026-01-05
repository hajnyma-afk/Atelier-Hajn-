#!/bin/bash

# Setup script for GCS Signed URLs
# This creates a service account and key file for generating signed URLs

set -e

PROJECT_ID=${1:-${GCP_PROJECT_ID:-${GOOGLE_CLOUD_PROJECT}}}

if [ -z "$PROJECT_ID" ]; then
  echo "Error: Project ID is required"
  echo "Usage: ./setup-gcs-signed-urls.sh [project-id]"
  echo "Or set GCP_PROJECT_ID or GOOGLE_CLOUD_PROJECT environment variable"
  exit 1
fi

BUCKET_NAME=${2:-${GCS_BUCKET_NAME}}

if [ -z "$BUCKET_NAME" ]; then
  echo "Error: Bucket name is required"
  echo "Usage: ./setup-gcs-signed-urls.sh [project-id] [bucket-name]"
  echo "Or set GCS_BUCKET_NAME environment variable"
  exit 1
fi

SERVICE_ACCOUNT_NAME="gcs-signed-urls"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="${HOME}/gcs-signed-urls-key.json"

echo "Setting up GCS signed URLs for project: $PROJECT_ID"
echo "Bucket: $BUCKET_NAME"
echo ""

# Check if service account exists
if gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" --project="$PROJECT_ID" &>/dev/null; then
  echo "✅ Service account already exists: $SERVICE_ACCOUNT_EMAIL"
else
  echo "Creating service account: $SERVICE_ACCOUNT_NAME"
  gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
    --project="$PROJECT_ID" \
    --display-name="GCS Signed URLs Service Account" \
    --description="Service account for generating signed URLs for GCS objects"
fi

# Grant Storage Object Viewer role (needed to read objects and generate signed URLs)
echo ""
echo "Granting Storage Object Viewer role..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/storage.objectViewer" \
  --condition=None || echo "  (may already have this role)"

# Create key file
echo ""
echo "Creating service account key file..."
gcloud iam service-accounts keys create "$KEY_FILE" \
  --iam-account="$SERVICE_ACCOUNT_EMAIL" \
  --project="$PROJECT_ID"

echo ""
echo "✅ Service account key created: $KEY_FILE"
echo ""
echo "Next steps:"
echo "1. Add to your .env.local file:"
echo "   GCS_KEY_FILE=$KEY_FILE"
echo "   # or"
echo "   GOOGLE_APPLICATION_CREDENTIALS=$KEY_FILE"
echo ""
echo "2. Restart your server"
echo ""
echo "⚠️  Security Note: Keep this key file secure and never commit it to git!"
