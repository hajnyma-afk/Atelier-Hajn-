import ftp from 'basic-ftp';
import { Readable, PassThrough } from 'stream';

/**
 * Create a new FTP client connection
 * Note: basic-ftp doesn't support concurrent operations on a single client,
 * so we create a new client for each operation to avoid conflicts
 */
async function createFtpClient() {
  const host = process.env.FTP_HOST;
  const user = process.env.FTP_USER;
  const password = process.env.FTP_PASSWORD;
  const port = parseInt(process.env.FTP_PORT || '21', 10);
  const secure = process.env.FTP_SECURE === 'true';

  if (!host || !user || !password) {
    throw new Error('FTP configuration missing. Please set FTP_HOST, FTP_USER, and FTP_PASSWORD environment variables.');
  }

  const client = new ftp.Client();
  client.ftp.verbose = process.env.NODE_ENV === 'development';

  try {
    await client.access({
      host,
      user,
      password,
      port,
      secure,
      secureOptions: secure ? { rejectUnauthorized: false } : undefined
    });

    // Ensure base directory exists
    const basePath = process.env.FTP_BASE_PATH || '/';
    if (basePath !== '/') {
      try {
        await client.ensureDir(basePath);
      } catch (err) {
        console.warn(`Warning: Could not ensure FTP directory ${basePath}:`, err.message);
      }
    }

    return client;
  } catch (error) {
    try {
      await client.close();
    } catch (closeError) {
      // Ignore close errors
    }
    throw new Error(`FTP connection failed: ${error.message}`);
  }
}

/**
 * Upload a file buffer to FTP server
 * @param {Buffer} buffer - File buffer
 * @param {string} remotePath - Remote file path (relative to FTP_BASE_PATH)
 * @returns {Promise<string>} - Public URL of the uploaded file
 */
export async function uploadToFtp(buffer, remotePath) {
  const client = await createFtpClient();
  const basePath = process.env.FTP_BASE_PATH || '/';
  const fullPath = basePath === '/' ? remotePath : `${basePath}/${remotePath}`.replace(/\/+/g, '/');

  try {
    // Ensure directory exists
    const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
    if (dirPath) {
      await client.ensureDir(dirPath);
    }

    // Upload file
    const stream = Readable.from(buffer);
    await client.uploadFrom(stream, fullPath);

    // Return proxy URL to avoid CORS issues
    // The proxy endpoint will fetch from FTP and serve through the backend
    return `/api/images/${remotePath}`;
  } catch (error) {
    throw new Error(`FTP upload failed: ${error.message}`);
  } finally {
    // Always close the client to free up resources
    try {
      await client.close();
    } catch (closeError) {
      // Ignore close errors
    }
  }
}

/**
 * Download a file from FTP server
 * @param {string} remotePath - Remote file path (relative to FTP_BASE_PATH)
 * @returns {Promise<Buffer>} - File buffer
 */
export async function downloadFromFtp(remotePath) {
  const client = await createFtpClient();
  const basePath = process.env.FTP_BASE_PATH || '/';
  const fullPath = basePath === '/' ? remotePath : `${basePath}/${remotePath}`.replace(/\/+/g, '/');

  try {
    return new Promise((resolve, reject) => {
      const chunks = [];
      const stream = new PassThrough();

      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      stream.on('end', async () => {
        try {
          await client.close();
        } catch (closeError) {
          // Ignore close errors
        }
        resolve(Buffer.concat(chunks));
      });

      stream.on('error', async (error) => {
        try {
          await client.close();
        } catch (closeError) {
          // Ignore close errors
        }
        reject(error);
      });

      client.downloadTo(stream, fullPath).catch(async (error) => {
        try {
          await client.close();
        } catch (closeError) {
          // Ignore close errors
        }
        reject(error);
      });
    });
  } catch (error) {
    throw new Error(`FTP download failed: ${error.message}`);
  }
}

/**
 * Delete a file from FTP server
 * @param {string} remotePath - Remote file path (relative to FTP_BASE_PATH)
 */
export async function deleteFromFtp(remotePath) {
  const client = await createFtpClient();
  const basePath = process.env.FTP_BASE_PATH || '/';
  const fullPath = basePath === '/' ? remotePath : `${basePath}/${remotePath}`.replace(/\/+/g, '/');

  try {
    await client.remove(fullPath);
  } catch (error) {
    // If file doesn't exist, that's okay (idempotent delete)
    if (error.code !== 550) {
      throw new Error(`FTP delete failed: ${error.message}`);
    }
  } finally {
    // Always close the client to free up resources
    try {
      await client.close();
    } catch (closeError) {
      // Ignore close errors
    }
  }
}

/**
 * Check if FTP is configured
 */
export function isFtpConfigured() {
  return !!(process.env.FTP_HOST && process.env.FTP_USER && process.env.FTP_PASSWORD);
}

/**
 * Close FTP connection (no-op since we create new clients per operation)
 * Kept for compatibility with graceful shutdown code
 */
export async function closeFtpConnection() {
  // No-op: We create new clients for each operation, so there's no persistent connection to close
  // This function is kept for compatibility with existing shutdown code
}

