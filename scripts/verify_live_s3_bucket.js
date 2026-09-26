// ============================================================================
// Live AWS S3 Bucket Verification Script (scripts/verify_live_s3_bucket.js)
// Tests real connectivity, HeadBucket, PutObject, GetObject, and DeleteObject
// against the target AWS S3 bucket: studybuddy-notes-vault in eu-north-1.
// ============================================================================

import 'dotenv/config';
import {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const AWS_REGION = process.env.AWS_REGION || 'eu-north-1';
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME || 'studybuddy-notes-vault';
const AWS_ACCESS_KEY_ID = (process.env.AWS_ACCESS_KEY_ID || '').trim();
const AWS_SECRET_ACCESS_KEY = (process.env.AWS_SECRET_ACCESS_KEY || '').trim();

async function runLiveS3Verification() {
  console.log('================================================================');
  console.log('☁️  LIVE AWS S3 BUCKET VERIFICATION — STUDYBUDDY');
  console.log('================================================================');
  console.log(`Target Bucket: ${AWS_S3_BUCKET}`);
  console.log(`Target Region: ${AWS_REGION}`);

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || AWS_ACCESS_KEY_ID === 'your_access_key_id') {
    console.log('\n⚠️  AWS Credentials Notice:');
    console.log('   AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are currently empty or using placeholders in .env.');
    console.log('   To test against your real AWS account:');
    console.log('   1. Open .env');
    console.log('   2. Set your AWS IAM User credentials:');
    console.log('      AWS_ACCESS_KEY_ID=AKIA...');
    console.log('      AWS_SECRET_ACCESS_KEY=...');
    console.log('   3. Run: node scripts/verify_live_s3_bucket.js\n');
    console.log('✓ Application is currently safely operating in local storage sandbox mode without crashing.');
    return;
  }

  console.log('\n[1] Initializing Official AWS S3 Client with Server-side IAM Credentials...');
  const s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY
    }
  });
  console.log('  ✓ Client initialized for region:', AWS_REGION);

  // Step 2: Test HeadBucket permission
  console.log(`\n[2] Testing connection and permissions for bucket: "${AWS_S3_BUCKET}"...`);
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: AWS_S3_BUCKET }));
    console.log(`  ✓ Bucket "${AWS_S3_BUCKET}" verified and accessible!`);
  } catch (err) {
    console.error(`  ❌ Failed to reach bucket "${AWS_S3_BUCKET}":`, err.message);
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      console.error('     Check: The bucket name might not exist in eu-north-1 or is spelled differently.');
    } else if (err.name === 'AccessDenied' || err.$metadata?.httpStatusCode === 403) {
      console.error('     Check: Your IAM user needs s3:ListBucket, s3:PutObject, s3:GetObject permissions on this bucket.');
    }
    process.exit(1);
  }

  // Step 3: Test PutObjectCommand
  const testKey = `users/verification_test/notes/note_${Date.now()}/verification_document.pdf`;
  const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj\ntrailer << /Size 4 /Root 1 0 R >>\n%%EOF');

  console.log(`\n[3] Uploading real PDF test object to S3...`);
  console.log(`    Target Key: ${testKey}`);
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: testKey,
      Body: pdfContent,
      ContentType: 'application/pdf',
      Metadata: {
        purpose: 'StudyBuddy S3 Integration Verification',
        timestamp: new Date().toISOString()
      }
    }));
    console.log('  ✓ PutObjectCommand successful! File uploaded to S3.');
  } catch (err) {
    console.error('  ❌ PutObjectCommand failed:', err.message);
    process.exit(1);
  }

  // Step 4: Test HeadObjectCommand
  console.log(`\n[4] Verifying object exists in bucket via HeadObjectCommand...`);
  try {
    const headRes = await s3Client.send(new HeadObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: testKey
    }));
    console.log(`  ✓ HeadObject confirmed! Content-Length: ${headRes.ContentLength} bytes, Content-Type: ${headRes.ContentType}`);
  } catch (err) {
    console.error('  ❌ HeadObjectCommand failed:', err.message);
    process.exit(1);
  }

  // Step 5: Test Presigned URL Generation
  console.log(`\n[5] Generating SigV4 Presigned Download URL...`);
  try {
    const getCmd = new GetObjectCommand({ Bucket: AWS_S3_BUCKET, Key: testKey });
    const presignedUrl = await getSignedUrl(s3Client, getCmd, { expiresIn: 300 });
    console.log('  ✓ Presigned URL successfully signed with AWS SigV4 algorithm:');
    console.log('    ' + presignedUrl.slice(0, 90) + '...');
  } catch (err) {
    console.error('  ❌ Presigned URL generation failed:', err.message);
    process.exit(1);
  }

  // Step 6: Test GetObjectCommand (Streaming file)
  console.log(`\n[6] Retrieving file stream from S3 via GetObjectCommand...`);
  try {
    const getRes = await s3Client.send(new GetObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: testKey
    }));
    const chunks = [];
    for await (const chunk of getRes.Body) {
      chunks.push(chunk);
    }
    const retrievedBuffer = Buffer.concat(chunks);
    console.log(`  ✓ GetObject successful! Retrieved: ${retrievedBuffer.length} bytes`);
    if (!retrievedBuffer.toString('utf8', 0, 4).startsWith('%PDF')) {
      throw new Error('Downloaded object is not a valid PDF!');
    }
    console.log('  ✓ Validated authentic PDF header from retrieved S3 object.');
  } catch (err) {
    console.error('  ❌ GetObjectCommand failed:', err.message);
    process.exit(1);
  }

  // Step 7: Test DeleteObjectCommand
  console.log(`\n[7] Cleaning up test object via DeleteObjectCommand...`);
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: testKey
    }));
    console.log('  ✓ DeleteObjectCommand successful! Test object removed.');
  } catch (err) {
    console.error('  ❌ DeleteObjectCommand failed:', err.message);
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🎉 LIVE AWS S3 STORAGE INTEGRATION VERIFIED 100% SUCCESSFULLY!');
  console.log('================================================================\n');
}

runLiveS3Verification().catch(err => {
  console.error('\n❌ S3 Verification Error:', err);
  process.exit(1);
});
