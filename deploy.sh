#!/bin/bash

# Cloud Run Deployment Script
# Usage: ./deploy.sh [project-id] [region] [--use-env-file|-e]

set -e

USE_ENV_FILE=false
PROJECT_ID=""
REGION="us-central1"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --use-env-file|-e)
      USE_ENV_FILE=true
      shift
      ;;
    *)
      if [ -z "$PROJECT_ID" ]; then
        PROJECT_ID=$1
      elif [ "$REGION" = "us-central1" ]; then
        REGION=$1
      else
        echo "Error: Unknown argument: $1"
        echo "Usage: ./deploy.sh [project-id] [region] [--use-env-file|-e]"
        exit 1
      fi
      shift
      ;;
  esac
done

# Use GOOGLE_CLOUD_PROJECT if PROJECT_ID not provided
if [ -z "$PROJECT_ID" ]; then
  PROJECT_ID=${GOOGLE_CLOUD_PROJECT}
fi

if [ -z "$PROJECT_ID" ]; then
  echo "Error: Project ID is required"
  echo "Usage: ./deploy.sh [project-id] [region] [--use-env-file|-e]"
  echo "  --use-env-file, -e  : Read environment variables from .env.local and set them in Cloud Run"
  echo "Or set GOOGLE_CLOUD_PROJECT environment variable"
  exit 1
fi

echo "Deploying to Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
if [ "$USE_ENV_FILE" = true ]; then
  echo "Reading environment variables from .env.local"
fi
echo ""

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
SERVICE_URL=$(gcloud run services describe atelier-hajny \
  --region=$REGION \
  --format='value(status.url)' 2>/dev/null || echo "")

if [ -n "$SERVICE_URL" ]; then
  echo "$SERVICE_URL"
  echo ""

  # If --use-env-file flag is set, read .env.local and update Cloud Run
  if [ "$USE_ENV_FILE" = true ]; then
    if [ ! -f ".env.local" ]; then
      echo "⚠️  WARNING: .env.local file not found!"
      echo "   Skipping automatic environment variable configuration."
      echo ""
      USE_ENV_FILE=false
    else
      echo "Reading environment variables from .env.local..."

      # Function to read env vars from .env.local
      read_env_vars() {
        local env_vars=""
        local var_name
        local var_value

        # List of variables we want to read
        local vars=("ADMIN_PASSWORD" "GCP_PROJECT_ID" "GOOGLE_CLOUD_PROJECT" "GCS_PROJECT_ID" "GCS_BUCKET_NAME" "SMTP_HOST" "SMTP_PORT" "SMTP_SECURE" "SMTP_USER" "SMTP_PASSWORD" "SMTP_FROM" "CONTACT_EMAIL" "FTP_HOST" "FTP_USER" "FTP_PASSWORD" "FTP_PORT" "FTP_SECURE" "FTP_BASE_PATH" "FTP_BASE_URL")

        # Read .env.local line by line
        while IFS= read -r line || [ -n "$line" ]; do
          # Skip comments and empty lines
          [[ "$line" =~ ^[[:space:]]*# ]] && continue
          [[ -z "${line// }" ]] && continue

          # Split on first = sign
          if [[ "$line" =~ ^[[:space:]]*([^=]+)=(.*)$ ]]; then
            key="${BASH_REMATCH[1]}"
            value="${BASH_REMATCH[2]}"

            # Remove leading/trailing whitespace from key
            key=$(echo "$key" | xargs)

            # Check if this is a variable we want
            for var in "${vars[@]}"; do
              if [ "$key" = "$var" ]; then
                # Remove leading/trailing whitespace and quotes from value
                value=$(echo "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/")

                # Escape commas in value (they're used as separators in gcloud)
                value=$(echo "$value" | sed 's/,/\\,/g')

                if [ -n "$env_vars" ]; then
                  env_vars="$env_vars,"
                fi
                env_vars="$env_vars$key=$value"
                break
              fi
            done
          fi
        done < .env.local

        echo "$env_vars"
      }

      ENV_VARS=$(read_env_vars)

      if [ -z "$ENV_VARS" ]; then
        echo "⚠️  WARNING: No relevant environment variables found in .env.local"
        echo "   Make sure your .env.local contains ADMIN_PASSWORD, GCP_PROJECT_ID, SMTP_*, and FTP_* variables"
        echo ""
        USE_ENV_FILE=false
      else
        echo "Setting environment variables in Cloud Run..."
        echo ""

        if gcloud run services update atelier-hajny \
          --region=$REGION \
          --update-env-vars="$ENV_VARS" 2>&1; then
          echo ""
          echo "✅ Environment variables configured successfully!"
          echo ""
          echo "Configured variables:"
          echo "$ENV_VARS" | tr ',' '\n' | sed 's/^/  - /'
        else
          echo ""
          echo "⚠️  WARNING: Failed to set environment variables automatically"
          echo "   Please set them manually using the commands below"
          echo ""
          USE_ENV_FILE=false
        fi
      fi
    fi
  fi

  # Show manual instructions if not using env file or if automatic setup failed
  if [ "$USE_ENV_FILE" = false ]; then
    echo "⚠️  IMPORTANT: Set up environment variables for Firestore, Email (SMTP), FTP, GCS, and admin password:"
    echo ""
    echo "gcloud run services update atelier-hajny \\"
    echo "  --region=$REGION \\"
    echo "  --update-env-vars=\"ADMIN_PASSWORD=your-secure-password-here,GCP_PROJECT_ID=your-project-id,GCS_PROJECT_ID=your-project-id,GCS_BUCKET_NAME=your-bucket-name,SMTP_HOST=smtp.gmail.com,SMTP_PORT=587,SMTP_SECURE=false,SMTP_USER=your-email@gmail.com,SMTP_PASSWORD=your-app-password,SMTP_FROM=your-email@gmail.com,CONTACT_EMAIL=your-email@gmail.com,FTP_HOST=ftp.yourdomain.com,FTP_USER=your_ftp_user,FTP_PASSWORD=your_ftp_password,FTP_PORT=21,FTP_SECURE=false,FTP_BASE_PATH=/public_html/uploads,FTP_BASE_URL=https://yourdomain.com/uploads\""
    echo ""
    echo "For signed URLs (faster image loading), see GCS_SIGNED_URLS_SETUP.md"
    echo ""
    echo "Or use --use-env-file flag to read from .env.local:"
    echo "  ./deploy.sh $PROJECT_ID $REGION --use-env-file"
    echo ""
    echo "See README.md, FIRESTORE_SETUP.md, EMAIL_SETUP.md, FTP_SETUP.md, or GCS_SIGNED_URLS_SETUP.md for detailed configuration instructions."
  fi
else
  echo "Check Cloud Run console for the URL"
fi

