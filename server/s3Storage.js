// ============================================================================
// StudyBuddy AWS S3 Storage Service (server/s3Storage.js)
// Official AWS SDK v3 Integration (@aws-sdk/client-s3 & presigner)
// Private bucket, user-isolated object hierarchy, zero credentials in client.
// ============================================================================

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_VAULT_ROOT = path.join(__dirname, '..', 'data', 's3-vault');

/**
 * Loads and standardizes AWS S3 configuration from environment variables.
 */
export function getS3Config() {
  const region = process.env.AWS_REGION || 'eu-north-1';
  const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME || 'studybuddy-notes-vault';
  const accessKeyId = (process.env.AWS_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || '').trim();
  const customEndpoint = process.env.AWS_S3_CUSTOM_ENDPOINT || process.env.AWS_ENDPOINT_URL || null;
  const isConfigured = Boolean(accessKeyId && secretAccessKey);
  const rawMode = (process.env.STORAGE_MODE || (isConfigured ? 'aws' : 'emulated')).toLowerCase().trim();
  const isLive = ['s3', 'aws'].includes(rawMode) && isConfigured;

  return {
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    customEndpoint,
    isConfigured,
    isLive,
    mode: rawMode
  };
}

/**
 * Instantiates the official AWS S3 client using server-side credentials only.
 */
export function createS3Client() {
  const config = getS3Config();
  if (!config.isConfigured) {
    return null;
  }

  const clientConfig = {
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  };

  if (config.customEndpoint) {
    clientConfig.endpoint = config.customEndpoint;
    clientConfig.forcePathStyle = true;
  }

  return new S3Client(clientConfig);
}

// Singleton S3 client instance
let s3ClientInstance = null;

export function getClient() {
  if (!s3ClientInstance) {
    s3ClientInstance = createS3Client();
  }
  return s3ClientInstance;
}

/**
 * Tests live connection to configured S3 bucket using HeadBucketCommand.
 */
export async function testS3Connection() {
  const config = getS3Config();
  if (!config.isLive) {
    return {
      connected: true,
      bucket: config.bucket,
      region: config.region,
      mode: config.mode,
      live: false,
      message: 'Storage running in local/emulated sandbox mode.'
    };
  }

  const client = getClient();
  if (!client) {
    return {
      connected: false,
      bucket: config.bucket,
      region: config.region,
      mode: config.mode,
      live: false,
      error: 'AWS S3 Client could not be initialized with current credentials.'
    };
  }

  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
    return {
      connected: true,
      bucket: config.bucket,
      region: config.region,
      mode: config.mode,
      live: true,
      message: `Successfully connected to AWS S3 bucket "${config.bucket}" in ${config.region}.`
    };
  } catch (err) {
    return {
      connected: false,
      bucket: config.bucket,
      region: config.region,
      mode: config.mode,
      live: true,
      error: err.message,
      errorCode: err.name || err.$metadata?.httpStatusCode
    };
  }
}

/**
 * Sanitizes original filename:
 * - Strips directory traversal (.. / \)
 * - Replaces unsafe characters with underscores
 * - Preserves extension
 */
export function sanitizeFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return 'document.pdf';
  }
  const base = path.basename(fileName.trim());
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    return `document_${Date.now()}.pdf`;
  }
  return sanitized;
}

/**
 * Constructs user-isolated S3 key conforming to Requirement 4:
 * users/{userId}/notes/{noteId}/{safe-file-name}
 */
export function buildS3Key(userId, noteId, originalFilename) {
  const safeUser = String(userId).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeNote = String(noteId).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeName = sanitizeFileName(originalFilename);
  return `users/${safeUser}/notes/${safeNote}/${safeName}`;
}

/**
 * Validates that an S3 key belongs strictly to the authenticated user.
 * Prevents horizontal privilege escalation and directory traversal.
 */
export function validateS3KeyOwnership(s3Key, userId) {
  if (!s3Key || typeof s3Key !== 'string') return false;
  if (!userId || typeof userId !== 'string') return false;

  // Reject path traversal sequences
  if (s3Key.includes('..') || s3Key.includes('\\')) {
    return false;
  }

  const safeUser = String(userId).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const expectedPrefix = `users/${safeUser}/notes/`;
  return s3Key.startsWith(expectedPrefix);
}

/**
 * Uploads student study document to S3 (or high-fidelity local vault).
 * Maintains private bucket security (zero public ACLs).
 */
export async function uploadDocumentToS3({
  userId,
  noteId,
  fileBuffer,
  originalFilename,
  contentType = 'application/pdf'
}) {
  if (!userId || !noteId || !fileBuffer) {
    throw new Error('Upload requires userId, noteId, and fileBuffer.');
  }

  const config = getS3Config();
  const safeName = sanitizeFileName(originalFilename);
  const s3Key = buildS3Key(userId, noteId, safeName);
  const client = getClient();

  if (config.isLive && client) {
    try {
      const putCommand = new PutObjectCommand({
        Bucket: config.bucket,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: {
          userid: String(userId),
          noteid: String(noteId),
          originalname: encodeURIComponent(originalFilename)
        }
      });

      await client.send(putCommand);
      console.log(`[AWS S3] Upload successful: s3://${config.bucket}/${s3Key}`);

      return {
        s3Key,
        s3Bucket: config.bucket,
        s3Region: config.region,
        s3Url: `https://${config.bucket}.s3.${config.region}.amazonaws.com/${s3Key}`,
        fileSize: fileBuffer.length,
        mode: 's3'
      };
    } catch (err) {
      console.error('[AWS S3] PutObject error:', err);
      if (err.name === 'NoSuchBucket') {
        throw new Error(`The configured S3 storage bucket "${config.bucket}" was not found.`);
      }
      if (err.name === 'AccessDenied') {
        throw new Error('Storage access denied. Please verify AWS S3 IAM credentials and permissions.');
      }
      throw new Error(`Unable to upload study material to storage: ${err.message}`);
    }
  }

  // Local storage sandbox (mirrors exact S3 directory structure)
  const localFilePath = path.join(LOCAL_VAULT_ROOT, ...s3Key.split('/'));
  const localDir = path.dirname(localFilePath);
  fs.mkdirSync(localDir, { recursive: true });
  fs.writeFileSync(localFilePath, fileBuffer);
  console.log(`[Storage Sandbox] File persisted at S3 key: ${s3Key}`);

  return {
    s3Key,
    s3Bucket: config.bucket,
    s3Region: config.region,
    s3Url: `https://${config.bucket}.s3.${config.region}.amazonaws.com/${s3Key}`,
    fileSize: fileBuffer.length,
    mode: 'emulated'
  };
}

/**
 * Retrieves readable stream of the private S3 document for authenticated streaming.
 */
export async function getDocumentStream({ s3Key, userId }) {
  if (!validateS3KeyOwnership(s3Key, userId)) {
    const err = new Error('Access denied: You do not have permission to access this document.');
    err.status = 403;
    throw err;
  }

  const config = getS3Config();
  const client = getClient();

  if (config.isLive && client) {
    try {
      const getCommand = new GetObjectCommand({
        Bucket: config.bucket,
        Key: s3Key
      });
      const response = await client.send(getCommand);
      return {
        stream: response.Body,
        contentType: response.ContentType || 'application/pdf',
        contentLength: response.ContentLength
      };
    } catch (err) {
      console.error('[AWS S3] GetObject error:', err);
      if (err.name === 'NoSuchKey') {
        const notFound = new Error('Study document not found in storage.');
        notFound.status = 404;
        throw notFound;
      }
      throw err;
    }
  }

  // Local storage sandbox fallback
  const localFilePath = path.join(LOCAL_VAULT_ROOT, ...s3Key.split('/'));
  if (!fs.existsSync(localFilePath)) {
    const notFound = new Error('Study document not found in storage vault.');
    notFound.status = 404;
    throw notFound;
  }

  const stats = fs.statSync(localFilePath);
  return {
    stream: fs.createReadStream(localFilePath),
    contentType: 'application/pdf',
    contentLength: stats.size
  };
}

/**
 * Generates a temporary signed S3 URL for downloading private study documents.
 * Expires automatically after 15 minutes (900 seconds).
 */
export async function getPresignedDownloadUrl({ s3Key, userId, originalFilename, expiresInSeconds = 900 }) {
  if (!validateS3KeyOwnership(s3Key, userId)) {
    const err = new Error('Access denied: You do not have permission to access this document.');
    err.status = 403;
    throw err;
  }

  const config = getS3Config();
  const client = getClient();
  const safeName = sanitizeFileName(originalFilename);

  if (config.isLive && client) {
    try {
      const getCommand = new GetObjectCommand({
        Bucket: config.bucket,
        Key: s3Key,
        ResponseContentDisposition: `inline; filename="${safeName}"`
      });

      const signedUrl = await getSignedUrl(client, getCommand, { expiresIn: expiresInSeconds });
      return {
        success: true,
        downloadUrl: signedUrl,
        expiresInSeconds,
        mode: 's3'
      };
    } catch (err) {
      console.error('[AWS S3] getSignedUrl error:', err);
      throw new Error(`Failed to generate secure download link: ${err.message}`);
    }
  }

  // Local mode returns authenticated API route
  return {
    success: true,
    downloadUrl: `/api/notes/stream?key=${encodeURIComponent(s3Key)}`,
    expiresInSeconds,
    mode: 'emulated'
  };
}

/**
 * Deletes document from S3 bucket (or local vault) with strict user ownership validation.
 */
export async function deleteDocumentFromS3({ s3Key, userId }) {
  if (!validateS3KeyOwnership(s3Key, userId)) {
    const err = new Error('Access denied: You do not have permission to delete this document.');
    err.status = 403;
    throw err;
  }

  const config = getS3Config();
  const client = getClient();

  if (config.isLive && client) {
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: s3Key
      });
      await client.send(deleteCommand);
      console.log(`[AWS S3] Delete successful: s3://${config.bucket}/${s3Key}`);
    } catch (err) {
      console.warn('[AWS S3] DeleteObject warning:', err.message);
      // Non-fatal if object already absent
    }
  }

  // Also clean local sandbox copy if present
  const localFilePath = path.join(LOCAL_VAULT_ROOT, ...s3Key.split('/'));
  if (fs.existsSync(localFilePath)) {
    try {
      fs.unlinkSync(localFilePath);
      console.log(`[Storage Sandbox] File removed: ${s3Key}`);
    } catch (err) {
      console.warn('[Storage Sandbox] Unlink warning:', err.message);
    }
  }

  return { success: true, s3Key };
}

/**
 * Checks if an S3 object exists.
 */
export async function checkObjectExists({ s3Key, userId }) {
  if (!validateS3KeyOwnership(s3Key, userId)) {
    return { exists: false, error: 'Unauthorized' };
  }

  const config = getS3Config();
  const client = getClient();

  if (config.isLive && client) {
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: config.bucket,
        Key: s3Key
      });
      const res = await client.send(headCommand);
      return {
        exists: true,
        contentLength: res.ContentLength,
        contentType: res.ContentType,
        lastModified: res.LastModified,
        mode: 's3'
      };
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return { exists: false };
      }
      throw err;
    }
  }

  // Local sandbox check
  const localFilePath = path.join(LOCAL_VAULT_ROOT, ...s3Key.split('/'));
  if (fs.existsSync(localFilePath)) {
    const stats = fs.statSync(localFilePath);
    return {
      exists: true,
      contentLength: stats.size,
      contentType: 'application/pdf',
      lastModified: stats.mtime,
      mode: 'emulated'
    };
  }

  return { exists: false };
}
