import { isFtpConfigured } from './ftpService.js';
import { isGcsConfigured, getGcsPublicUrl } from './gcsService.js';

export function generateFileName(originalName, mimeType) {
  const ext = mimeType.includes('video')
    ? (mimeType.includes('webm') ? '.webm' : '.mp4')
    : '.webp';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}${ext}`;
}

/**
 * Extract just the filename from a path or URL
 * Handles paths like /bucket-name/filename.webp, /api/images/filename.webp, etc.
 * Also handles signed URLs by extracting just the filename before query parameters
 */
export function extractFileName(filePath) {
  if (!filePath || typeof filePath !== 'string') return filePath;

  let fileName = filePath;

  // If it's a full signed URL (starts with https://), extract filename from URL path
  if (fileName.startsWith('https://')) {
    try {
      const url = new URL(fileName);
      // Get the pathname and extract filename
      const pathParts = url.pathname.split('/').filter(p => p.length > 0);
      fileName = pathParts[pathParts.length - 1] || fileName;
    } catch (e) {
      // If URL parsing fails, continue with string manipulation
    }
  }

  // Remove protocol and domain if present (for URLs without https:// prefix)
  fileName = fileName.replace(/^https?:\/\/[^\/]+/, '');
  // Remove /api/images/ prefix (FTP proxy endpoint)
  fileName = fileName.replace(/^\/api\/images\//, '');
  // Remove /uploads/ prefix (legacy local storage)
  fileName = fileName.replace(/^\/uploads\//, '').replace(/^uploads\//, '');
  // Remove GCS URL prefix if present
  fileName = fileName.replace(/^https:\/\/storage\.googleapis\.com\/[^\/]+\//, '');

  // Remove query parameters (for signed URLs that might have been partially processed)
  if (fileName.includes('?')) {
    fileName = fileName.split('?')[0];
  }

  // Handle paths that contain / (like /bucket-name/filename.webp or bucket-name/filename.webp)
  // Extract just the filename (everything after the last /)
  if (fileName.includes('/')) {
    const parts = fileName.split('/').filter(p => p.length > 0);
    fileName = parts[parts.length - 1]; // Get the last part (the actual filename)
  }

  return fileName.trim() || filePath; // Return original if extraction fails
}

/**
 * Check if GCS bucket allows public access (for direct URLs)
 * This is a simple check - if bucket is public, we can use direct URLs for better performance
 */
function isGcsPublicAccessible() {
  // For now, we'll use proxy. To enable direct URLs, make bucket public and set GCS_PUBLIC_ACCESS=true
  return process.env.GCS_PUBLIC_ACCESS === 'true' && isGcsConfigured();
}

/**
 * Get file URL - returns direct GCS URL if bucket is public, otherwise proxy endpoint
 * Direct URLs are much faster as they bypass the server proxy
 */
export function getFileUrl(fileName) {
  // Extract just the filename from any path format
  const cleanFileName = extractFileName(fileName);

  if (isGcsPublicAccessible()) {
    // Use direct GCS URL (fastest - bypasses server, uses CDN)
    return getGcsPublicUrl(cleanFileName);
  }

  if (isGcsConfigured() || isFtpConfigured()) {
    // Use proxy endpoint to avoid CORS issues and handle private buckets
    // The proxy endpoint handles authentication and downloads files server-side
    return `/api/images/${cleanFileName}`;
  }
  // Fallback to relative path (for backward compatibility or local dev)
  return `/uploads/${cleanFileName}`;
}

