import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const UPLOADS_DIR = join(__dirname, 'uploads');

export function ensureUploadsDir() {
  if (!existsSync(UPLOADS_DIR)) {
    mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export function generateFileName(originalName, mimeType) {
  const ext = mimeType.includes('video')
    ? (mimeType.includes('webm') ? '.webm' : '.mp4')
    : '.webp';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}${ext}`;
}

export function getFileUrl(fileName) {
  return `/uploads/${fileName}`;
}

