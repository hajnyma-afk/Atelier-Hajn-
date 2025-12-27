#!/bin/bash

# IAM Setup Script for Cloud Run Deployment
# This script grants necessary permissions to deploy to Cloud Run

set -e

PROJECT_ID=${1:-${GOOGLE_CLOUD_PROJECT}}

if [ -z "$PROJECT_ID" ]; then
  echo "Error: Project ID is required"
  echo "Usage: ./setup-iam.sh [project-id]"
  echo "Or set GOOGLE_CLOUD_PROJECT environment variable"
  exit 1
fi

CURRENT_USER=$(gcloud config get-value account 2>/dev/null)

if [ -z "$CURRENT_USER" ]; then
  echo "Error: No account configured"
  echo "Run 'gcloud auth login' first"
  exit 1
fi

echo "Setting up IAM permissions for Cloud Run deployment"
echo "Project: $PROJECT_ID"
echo "User: $CURRENT_USER"
echo ""

# Grant Cloud Build Service Account role
echo "1. Granting Cloud Build Service Account role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="user:$CURRENT_USER" \
  --role="roles/cloudbuild.builds.builder" \
  --condition=None || echo "  (may already have this role)"

# Grant Service Account User role (needed to deploy to Cloud Run)
echo "2. Granting Service Account User role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="user:$CURRENT_USER" \
  --role="roles/iam.serviceAccountUser" \
  --condition=None || echo "  (may already have this role)"

# Grant Cloud Run Admin role
echo "3. Granting Cloud Run Admin role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="user:$CURRENT_USER" \
  --role="roles/run.admin" \
  --condition=None || echo "  (may already have this role)"

# Grant Storage Admin role (for Container Registry)
echo "4. Granting Storage Admin role (for Container Registry)..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="user:$CURRENT_USER" \
  --role="roles/storage.admin" \
  --condition=None || echo "  (may already have this role)"

# Grant Service Usage Consumer role (to enable APIs)
echo "5. Granting Service Usage Consumer role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="user:$CURRENT_USER" \
  --role="roles/serviceusage.serviceUsageConsumer" \
  --condition=None || echo "  (may already have this role)"

# Get Cloud Build service account email
CLOUDBUILD_SA="${PROJECT_ID}@cloudbuild.gserviceaccount.com"

echo ""
echo "6. Granting Cloud Build service account permission to deploy to Cloud Run..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/run.admin" \
  --condition=None || echo "  (may already have this role)"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUDBUILD_SA}" \
  --role="roles/iam.serviceAccountUser" \
  --condition=None || echo "  (may already have this role)"

echo ""
echo "✅ IAM permissions configured!"
echo ""
echo "Next steps:"
echo "1. Enable required APIs:"
echo "   gcloud services enable cloudbuild.googleapis.com"
echo "   gcloud services enable run.googleapis.com"
echo "   gcloud services enable containerregistry.googleapis.com"
echo ""
echo "2. Deploy your application:"
echo "   ./deploy.sh $PROJECT_ID"

