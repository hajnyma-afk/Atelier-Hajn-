import { isFtpConfigured } from './ftpService.js';

export function generateFileName(originalName, mimeType) {
  const ext = mimeType.includes('video')
    ? (mimeType.includes('webm') ? '.webm' : '.mp4')
    : '.webp';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}${ext}`;
}

/**
 * Get file URL - uses proxy endpoint to avoid CORS issues when FTP is configured
 */
export function getFileUrl(fileName) {
  if (isFtpConfigured()) {
    // Use proxy endpoint to avoid CORS issues
    return `/api/images/${fileName}`;
  }
  // Fallback to relative path (for backward compatibility or local dev)
  return `/uploads/${fileName}`;
}

