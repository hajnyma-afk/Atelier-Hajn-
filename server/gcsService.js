import { Storage } from '@google-cloud/storage';
import { homedir } from 'os';
import { resolve } from 'path';

let storageClient = null;
let bucketInstance = null;
let signedUrlWarningShown = false;

/**
 * Expand tilde (~) in file paths to home directory
 */
function expandTilde(filePath) {
  if (!filePath) return filePath;
  if (filePath.startsWith('~/')) {
    return resolve(homedir(), filePath.slice(2));
  }
  if (filePath === '~') {
    return homedir();
  }
  return filePath;
}

/**
 * Initialize Google Cloud Storage client
 */
function initGcsClient() {
  if (storageClient) {
    return { storage: storageClient, bucket: bucketInstance };
  }

  const bucketName = process.env.GCS_BUCKET_NAME;
  const projectId = process.env.GCS_PROJECT_ID || process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;

  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME environment variable is required');
  }

  if (!projectId) {
    throw new Error('GCS_PROJECT_ID, GCP_PROJECT_ID, or GOOGLE_CLOUD_PROJECT environment variable is required');
  }

  // Initialize Storage client
  // For signed URLs, we need explicit service account key file with private key
  // Priority: GCS_KEY_FILE > GOOGLE_APPLICATION_CREDENTIALS > GCS_KEY_JSON (for Cloud Run) > default credentials

  let storageConfig = { projectId };

  // Check for key file path (local development)
  const keyFile = process.env.GCS_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyFile) {
    const expandedKeyFile = expandTilde(keyFile);
    storageConfig.keyFilename = expandedKeyFile;
  }
  // Check for key JSON (Cloud Run - can be set as env var or secret)
  else if (process.env.GCS_KEY_JSON) {
    try {
      // Parse JSON string from environment variable (useful for Cloud Run secrets)
      const keyData = typeof process.env.GCS_KEY_JSON === 'string'
        ? JSON.parse(process.env.GCS_KEY_JSON)
        : process.env.GCS_KEY_JSON;
      storageConfig.credentials = keyData;
    } catch (error) {
      console.warn('Failed to parse GCS_KEY_JSON, falling back to default credentials:', error.message);
    }
  }

  storageClient = new Storage(storageConfig);

  bucketInstance = storageClient.bucket(bucketName);

  return { storage: storageClient, bucket: bucketInstance };
}

/**
 * Get GCS bucket instance (exported for streaming)
 */
export function getGcsBucket() {
  const { bucket } = initGcsClient();
  return bucket;
}

/**
 * Upload a file buffer to Google Cloud Storage
 * @param {Buffer} buffer - File buffer
 * @param {string} remotePath - Remote file path (object name in bucket)
 * @returns {Promise<string>} - Public URL of the uploaded file
 */
export async function uploadToGcs(buffer, remotePath) {
  const { bucket } = initGcsClient();

  try {
    const file = bucket.file(remotePath);

    // Upload file buffer
    await file.save(buffer, {
      metadata: {
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
    });

    // Make file publicly readable if bucket allows
    await file.makePublic().catch(() => {
      // If bucket policy doesn't allow makePublic, that's okay
      // We'll use signed URLs or the bucket's public URL format
    });

    // Return public URL
    // Format: https://storage.googleapis.com/BUCKET_NAME/fileName
    // Or: https://BUCKET_NAME.storage.googleapis.com/fileName
    const bucketName = process.env.GCS_BUCKET_NAME;
    return `https://storage.googleapis.com/${bucketName}/${remotePath}`;
  } catch (error) {
    throw new Error(`GCS upload failed: ${error.message}`);
  }
}

/**
 * Download a file from Google Cloud Storage
 * @param {string} remotePath - Remote file path (object name in bucket)
 * @returns {Promise<Buffer>} - File buffer
 */
export async function downloadFromGcs(remotePath) {
  const { bucket } = initGcsClient();

  try {
    const file = bucket.file(remotePath);
    const [buffer] = await file.download();
    return buffer;
  } catch (error) {
    if (error.code === 404) {
      throw new Error(`File not found: ${remotePath}`);
    }
    throw new Error(`GCS download failed: ${error.message}`);
  }
}

/**
 * Delete a file from Google Cloud Storage
 * @param {string} remotePath - Remote file path (object name in bucket)
 */
export async function deleteFromGcs(remotePath) {
  const { bucket } = initGcsClient();

  try {
    const file = bucket.file(remotePath);
    await file.delete();
  } catch (error) {
    // If file doesn't exist (404), that's okay (idempotent delete)
    if (error.code !== 404) {
      throw new Error(`GCS delete failed: ${error.message}`);
    }
  }
}

/**
 * Check if GCS is configured
 */
export function isGcsConfigured() {
  return !!(process.env.GCS_BUCKET_NAME && (process.env.GCS_PROJECT_ID || process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT));
}

/**
 * Get public URL for a file (without downloading)
 * @param {string} remotePath - Remote file path (object name in bucket)
 * @returns {string} - Public URL
 */
export function getGcsPublicUrl(remotePath) {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME not configured');
  }
  return `https://storage.googleapis.com/${bucketName}/${remotePath}`;
}

/**
 * Check if signed URLs can be generated (requires service account key with private key)
 */
function canGenerateSignedUrls() {
  // Check if we have explicit credentials with private key
  // This is required for signing URLs
  if (process.env.GCS_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return true;
  }

  // In Cloud Run, we can try to use the service account, but it might not work
  // without explicit key file. We'll attempt it and fall back if it fails.
  return false;
}

/**
 * Generate a signed URL for a file in GCS
 * Signed URLs allow direct access to private buckets without going through the proxy
 * This is much faster as it bypasses the server and uses Google's CDN
 *
 * Note: Requires service account key file with private key. Falls back to null if not available.
 *
 * @param {string} remotePath - Remote file path (object name in bucket)
 * @param {number} expirationMinutes - URL expiration time in minutes (default: 60 minutes)
 * @returns {Promise<string|null>} - Signed URL or null if signing is not possible
 */
export async function getGcsSignedUrl(remotePath, expirationMinutes = 60) {
  try {
    const { bucket } = initGcsClient();
    const file = bucket.file(remotePath);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File not found: ${remotePath}`);
    }

    // Generate signed URL valid for specified minutes
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expirationMinutes * 60 * 1000, // Convert minutes to milliseconds
    });

    return signedUrl;
  } catch (error) {
    // If signing fails due to missing credentials, return null
    // The caller will fall back to proxy URLs
    if (error.message.includes('client_email') || error.message.includes('Cannot sign')) {
      // Show warning once about enabling signed URLs for better performance
      if (!signedUrlWarningShown) {
        console.warn('⚠️  Signed URLs not available (missing service account key).');
        console.warn('   Images will use proxy endpoint (slower but works).');
        console.warn('   To enable faster signed URLs, set GCS_KEY_FILE or GOOGLE_APPLICATION_CREDENTIALS');
        console.warn('   to point to a service account key file with Storage Object Viewer role.');
        signedUrlWarningShown = true;
      }
      return null;
    }
    // Re-throw other errors (like file not found)
    throw error;
  }
}

/**
 * Close GCS connection (no-op since client is stateless)
 * Kept for compatibility with graceful shutdown code
 */
export async function closeGcsConnection() {
  // No-op: GCS client is stateless, no persistent connection to close
  // This function is kept for compatibility with existing shutdown code
}
