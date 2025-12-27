#!/bin/bash

# Check Cloud Run Service Access
# Usage: ./check-access.sh [project-id] [region]

set -e

PROJECT_ID=${1:-${GOOGLE_CLOUD_PROJECT}}
REGION=${2:-us-central1}

if [ -z "$PROJECT_ID" ]; then
  echo "Error: Project ID is required"
  echo "Usage: ./check-access.sh [project-id] [region]"
  exit 1
fi

echo "Checking Cloud Run service access..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Get service URL
SERVICE_URL=$(gcloud run services describe atelier-hajny \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format='value(status.url)' 2>/dev/null)

if [ -z "$SERVICE_URL" ]; then
  echo "❌ Service 'atelier-hajny' not found in region $REGION"
  echo "List all services: gcloud run services list --region=$REGION"
  exit 1
fi

echo "Service URL: $SERVICE_URL"
echo ""

# Check IAM policy
echo "Checking IAM permissions..."
IAM_POLICY=$(gcloud run services get-iam-policy atelier-hajny \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format=json 2>/dev/null)

# Check if allUsers has invoker role
if echo "$IAM_POLICY" | grep -q '"allUsers"'; then
  echo "✅ Service allows unauthenticated access (allUsers has invoker role)"
else
  echo "❌ Service does NOT allow unauthenticated access"
  echo ""
  echo "Fixing access permissions..."
  gcloud run services add-iam-policy-binding atelier-hajny \
    --region=$REGION \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --project=$PROJECT_ID
  echo "✅ Access permissions updated"
fi

echo ""
echo "Checking service status..."
gcloud run services describe atelier-hajny \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format='table(
    status.conditions[0].type,
    status.conditions[0].status,
    status.conditions[0].reason,
    status.latestReadyRevisionName,
    status.latestCreatedRevisionName
  )'

echo ""
echo "Recent logs (last 20 lines):"
gcloud run services logs read atelier-hajny \
  --region=$REGION \
  --project=$PROJECT_ID \
  --limit=20 \
  --format="table(timestamp,severity,textPayload)" 2>/dev/null || echo "No logs available"

echo ""
echo "Test the service:"
echo "  curl $SERVICE_URL"
echo ""
echo "Or open in browser:"
echo "  $SERVICE_URL"

