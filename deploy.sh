#!/bin/bash

# Cloud Run Deployment Script
# Usage: ./deploy.sh [project-id] [region]

set -e

PROJECT_ID=${1:-${GOOGLE_CLOUD_PROJECT}}
REGION=${2:-us-central1}

if [ -z "$PROJECT_ID" ]; then
  echo "Error: Project ID is required"
  echo "Usage: ./deploy.sh [project-id] [region]"
  echo "Or set GOOGLE_CLOUD_PROJECT environment variable"
  exit 1
fi

echo "Deploying to Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  echo "Error: gcloud CLI is not installed"
  echo "Install it from: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed"
  echo "Install it from: https://docs.docker.com/get-docker/"
  exit 1
fi

# Set the project
gcloud config set project $PROJECT_ID

# Check if user has necessary permissions
echo "Checking permissions..."
CURRENT_USER=$(gcloud config get-value account 2>/dev/null)
if [ -z "$CURRENT_USER" ]; then
  echo "Error: No account configured. Run 'gcloud auth login' first."
  exit 1
fi

echo "Current account: $CURRENT_USER"

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com --quiet || echo "Cloud Build API already enabled or permission denied"
gcloud services enable run.googleapis.com --quiet || echo "Cloud Run API already enabled or permission denied"
gcloud services enable containerregistry.googleapis.com --quiet || echo "Container Registry API already enabled or permission denied"

# Check if Cloud Build API is enabled
echo "Verifying API access..."
if ! gcloud services list --enabled --filter="name:cloudbuild.googleapis.com" --format="value(name)" | grep -q cloudbuild; then
  echo ""
  echo "⚠️  WARNING: Cloud Build API may not be enabled or you don't have permission."
  echo "Please ensure you have the following IAM roles:"
  echo "  - Cloud Build Service Account (roles/cloudbuild.builds.builder)"
  echo "  - Service Account User (roles/iam.serviceAccountUser)"
  echo "  - Cloud Run Admin (roles/run.admin)"
  echo ""
  echo "To grant yourself these permissions, run:"
  echo "  gcloud projects add-iam-policy-binding $PROJECT_ID \\"
  echo "    --member=\"user:$CURRENT_USER\" \\"
  echo "    --role=\"roles/cloudbuild.builds.builder\""
  echo ""
  echo "  gcloud projects add-iam-policy-binding $PROJECT_ID \\"
  echo "    --member=\"user:$CURRENT_USER\" \\"
  echo "    --role=\"roles/iam.serviceAccountUser\""
  echo ""
  echo "  gcloud projects add-iam-policy-binding $PROJECT_ID \\"
  echo "    --member=\"user:$CURRENT_USER\" \\"
  echo "    --role=\"roles/run.admin\""
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Generate a unique tag for this deployment
DEPLOY_TAG=$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD 2>/dev/null || echo "manual")

# Build and deploy using Cloud Build
echo "Building and deploying with Cloud Build..."
echo "Deployment tag: $DEPLOY_TAG"
if ! gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_REGION=$REGION,_TAG=$DEPLOY_TAG; then
  echo ""
  echo "❌ Deployment failed!"
  echo ""
  echo "Common issues and solutions:"
  echo ""
  echo "1. Missing IAM permissions:"
  echo "   Run the setup-iam.sh script or manually grant permissions (see DEPLOYMENT.md)"
  echo ""
  echo "2. Cloud Build API not enabled:"
  echo "   gcloud services enable cloudbuild.googleapis.com"
  echo ""
  echo "3. Billing not enabled:"
  echo "   Enable billing in: https://console.cloud.google.com/billing"
  echo ""
  exit 1
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Your application should be available at:"
gcloud run services describe atelier-hajny \
  --region=$REGION \
  --format='value(status.url)' 2>/dev/null || echo "Check Cloud Run console for the URL"

