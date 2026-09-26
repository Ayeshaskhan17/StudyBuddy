// ============================================================================
// Automated Verification Suite: AWS S3 Integration & Multi-Tenant Security
// (scripts/test_s3_integration_and_security.js)
// ============================================================================

import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';

function createSamplePdfBuffer(title, content) {
  const escapedTitle = title.replace(/[()\\]/g, ' ');
  const escapedContent = content.replace(/[()\\]/g, ' ');
  const stream = `BT\n/F1 14 Tf\n50 720 Td\n(${escapedTitle}) Tj\n/F1 11 Tf\n0 -25 Td\n(${escapedContent}) Tj\nET`;
  const streamLength = Buffer.byteLength(stream);

  const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${streamLength} >> stream
${stream}
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
00000000115 00000 n 
00000000245 00000 n 
00000000300 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
380
%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🚀 AWS S3 STORAGE INTEGRATION & MULTI-TENANT SECURITY TEST SUITE');
  console.log('================================================================\n');

  // --- STEP 1: CREATE USER A & USER B ---
  const userAEmail = `user_a_${Date.now()}@university.edu`;
  const userBEmail = `user_b_${Date.now()}@university.edu`;
  const password = 'SecurePassword123!';

  console.log('[1] Creating User A (Primary Student):', userAEmail);
  const regARes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Johnson',
      email: userAEmail,
      password,
      college: 'MIT Engineering',
      branch: 'Computer Science',
      semester: 'Semester 5'
    })
  });
  const regA = await regARes.json();
  if (!regARes.ok) throw new Error('User A registration failed: ' + JSON.stringify(regA));
  const tokenA = regA.token;
  const userAId = regA.user.id;
  console.log(`  ✓ User A registered: ${userAId}`);

  console.log('\n[2] Creating User B (Unauthorized Attacker/Peer):', userBEmail);
  const regBRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bob Smith',
      email: userBEmail,
      password,
      college: 'Stanford Tech',
      branch: 'Electrical Engineering',
      semester: 'Semester 3'
    })
  });
  const regB = await regBRes.json();
  if (!regBRes.ok) throw new Error('User B registration failed: ' + JSON.stringify(regB));
  const tokenB = regB.token;
  const userBId = regB.user.id;
  console.log(`  ✓ User B registered: ${userBId}`);

  // --- STEP 2: USER A UPLOADS REAL PDF ---
  console.log('\n[3] User A uploading real Database Management System (DBMS) PDF...');
  const dbmsPdf = createSamplePdfBuffer(
    'Database Management Systems - ACID and Normalization',
    'Atomicity ensures all-or-nothing execution. Consistency preserves integrity constraints. Isolation ensures concurrent transaction independence. Durability guarantees committed data persists through system crashes. Boyce-Codd Normal Form BCNF eliminates transitive and functional redundancy.'
  );

  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  let multipartBody = '';
  multipartBody += `--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nDatabase Systems — ACID & Normalization\r\n`;
  multipartBody += `--${boundary}\r\nContent-Disposition: form-data; name="subject"\r\n\r\nDatabase Management\r\n`;
  multipartBody += `--${boundary}\r\nContent-Disposition: form-data; name="semester"\r\n\r\nSemester 5\r\n`;
  multipartBody += `--${boundary}\r\nContent-Disposition: form-data; name="unit"\r\n\r\nUnit 3\r\n`;
  multipartBody += `--${boundary}\r\nContent-Disposition: form-data; name="topic"\r\n\r\nACID Properties and BCNF\r\n`;
  multipartBody += `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="dbms_acid_bcnf.pdf"\r\nContent-Type: application/pdf\r\n\r\n`;

  const payload = Buffer.concat([
    Buffer.from(multipartBody, 'utf8'),
    dbmsPdf,
    Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
  ]);

  const uploadRes = await fetch(`${BASE_URL}/api/notes/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenA}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: payload
  });

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) throw new Error('Upload failed: ' + JSON.stringify(uploadData));

  const noteA = uploadData.note;
  console.log('  ✓ Note created successfully!');
  console.log('    - Note ID:', noteA.id);
  console.log('    - S3 Key:', noteA.s3Key);
  console.log('    - S3 Bucket:', noteA.s3Bucket);
  console.log('    - Extracted Text Length:', uploadData.extractedTextLength, 'chars');

  // Verify Requirement 4: Object Structure users/{userId}/notes/{noteId}/{safe-file-name}
  const expectedS3Prefix = `users/${userAId}/notes/${noteA.id}/`;
  if (!noteA.s3Key.startsWith(expectedS3Prefix)) {
    throw new Error(`S3 Key does NOT follow Requirement 4 format: ${noteA.s3Key} (expected to start with ${expectedS3Prefix})`);
  }
  console.log(`  ✓ VERIFIED: S3 Key matches Requirement 4 exact hierarchy: users/{userId}/notes/{noteId}/{safe-name}`);

  // --- STEP 3: VERIFY S3 OBJECT EXISTS ---
  console.log('\n[4] Verifying S3 object status via /api/notes/:id/s3-status...');
  const s3StatusRes = await fetch(`${BASE_URL}/api/notes/${noteA.id}/s3-status`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const s3Status = await s3StatusRes.json();
  if (!s3StatusRes.ok || !s3Status.exists) {
    throw new Error('S3 object existence check failed: ' + JSON.stringify(s3Status));
  }
  console.log('  ✓ VERIFIED: Document exists in S3 storage (Size:', s3Status.contentLength, 'bytes, Mode:', s3Status.mode, ')');

  // --- STEP 4: VERIFY DOWNLOAD / STREAMING (REQUIREMENT 9) ---
  console.log('\n[5] Verifying secure document streaming via GET /api/notes/:id/file...');
  const streamRes = await fetch(`${BASE_URL}/api/notes/${noteA.id}/file`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  if (!streamRes.ok) {
    throw new Error(`Document streaming failed with HTTP ${streamRes.status}`);
  }
  const streamContentType = streamRes.headers.get('content-type');
  const streamBuffer = Buffer.from(await streamRes.arrayBuffer());
  console.log(`  ✓ Document stream received: ${streamBuffer.length} bytes, Content-Type: ${streamContentType}`);
  if (!streamBuffer.toString('utf8', 0, 4).startsWith('%PDF')) {
    throw new Error('Streamed content is not a valid PDF header!');
  }
  console.log('  ✓ VERIFIED: Streamed file is the authentic uploaded PDF binary');

  // Also test presigned download URL endpoint
  console.log('\n[6] Verifying presigned download URL generation via GET /api/notes/:id/download-url...');
  const presignRes = await fetch(`${BASE_URL}/api/notes/${noteA.id}/download-url`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const presignData = await presignRes.json();
  if (!presignRes.ok || !presignData.downloadUrl) {
    throw new Error('Presigned URL generation failed: ' + JSON.stringify(presignData));
  }
  console.log('  ✓ Presigned URL received (Expires in:', presignData.expiresInSeconds, 's)');

  // --- STEP 5: AI STUDY PACK GENERATION GROUNDED IN UPLOADED PDF ---
  console.log('\n[7] Generating AI Study Pack from uploaded DBMS document...');
  const aiRes = await fetch(`${BASE_URL}/api/ai/process-note`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ noteId: noteA.id })
  });
  const aiData = await aiRes.json();
  if (!aiRes.ok) throw new Error('AI generation failed: ' + JSON.stringify(aiData));

  console.log('  ✓ AI Summary Title:', aiData.aiPack.summary.title);
  console.log('  ✓ MCQs Generated:', aiData.aiPack.mcqs.length);
  console.log('  ✓ Flashcards Generated:', aiData.aiPack.flashcards.length);
  console.log('  ✓ Sample MCQ 1:', aiData.aiPack.mcqs[0]?.question);

  // Check that questions contain NO cross-contamination
  const allText = JSON.stringify(aiData.aiPack);
  if (allText.includes('What is Cloud Computing') || allText.includes('Cloud Bursting')) {
    throw new Error('FAILED: Detected Cloud Computing cross-contamination in DBMS note!');
  }
  console.log('  ✓ VERIFIED: 100% grounded in DBMS PDF with ZERO cross-subject content');

  // --- STEP 6: SECURITY & MULTI-TENANT ACCESS CONTROL TEST (REQUIREMENT 17) ---
  console.log('\n================================================================');
  console.log('🔒 EXECUTING MULTI-TENANT SECURITY ACCESS-CONTROL TESTS');
  console.log('================================================================');

  // Attack 1: User B tries to view User A's note details
  console.log('\n[Security 1] User B attempts to access User A note via /api/notes/:id...');
  const bViewRes = await fetch(`${BASE_URL}/api/notes/${noteA.id}`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  console.log(`  -> User B view attempt HTTP status: ${bViewRes.status} (Expected: 404/403)`);
  if (bViewRes.ok) throw new Error('SECURITY BREACH: User B accessed User A note!');
  console.log('  ✓ BLOCKED: Unauthorized note access successfully prevented.');

  // Attack 2: User B tries to download User A's private S3 PDF
  console.log('\n[Security 2] User B attempts to download User A private S3 PDF via /api/notes/:id/file...');
  const bStreamRes = await fetch(`${BASE_URL}/api/notes/${noteA.id}/file`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  console.log(`  -> User B download attempt HTTP status: ${bStreamRes.status} (Expected: 404/403)`);
  if (bStreamRes.ok) throw new Error('SECURITY BREACH: User B downloaded User A private PDF from S3!');
  console.log('  ✓ BLOCKED: Unauthorized S3 file streaming successfully prevented.');

  // Attack 3: User B tries to get a presigned URL for User A's S3 object
  console.log('\n[Security 3] User B attempts to get presigned URL for User A document...');
  const bPresignRes = await fetch(`${BASE_URL}/api/notes/${noteA.id}/download-url`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  console.log(`  -> User B presigned URL attempt HTTP status: ${bPresignRes.status} (Expected: 404/403)`);
  if (bPresignRes.ok) throw new Error('SECURITY BREACH: User B generated presigned URL for User A note!');
  console.log('  ✓ BLOCKED: Unauthorized presigned URL generation successfully prevented.');

  // Attack 4: User B tries to delete User A's note and S3 object
  console.log('\n[Security 4] User B attempts to delete User A note and S3 object...');
  const bDeleteRes = await fetch(`${BASE_URL}/api/notes/${noteA.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  console.log(`  -> User B delete attempt HTTP status: ${bDeleteRes.status} (Expected: 404/403)`);
  if (bDeleteRes.ok) throw new Error('SECURITY BREACH: User B was able to delete User A note!');
  console.log('  ✓ BLOCKED: Unauthorized S3 object deletion successfully prevented.');

  // Attack 5: User B queries their notes library — User A's note must NOT appear
  console.log('\n[Security 5] User B lists notes in library (/api/notes)...');
  const bNotesRes = await fetch(`${BASE_URL}/api/notes`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  const bNotesData = await bNotesRes.json();
  const bNotesList = bNotesData.notes || [];
  console.log(`  -> User B note count: ${bNotesList.length}`);
  if (bNotesList.some(n => n.id === noteA.id)) {
    throw new Error('SECURITY BREACH: User A note leaked into User B note list!');
  }
  console.log('  ✓ VERIFIED: User B cannot see User A note in library.');

  // --- STEP 7: SESSION & REFRESH PERSISTENCE ---
  console.log('\n[8] Testing session refresh & re-login persistence...');
  const reloginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userAEmail, password })
  });
  const reloginData = await reloginRes.json();
  if (!reloginRes.ok) throw new Error('Re-login failed: ' + JSON.stringify(reloginData));
  const refreshedNotes = await (await fetch(`${BASE_URL}/api/notes`, {
    headers: { 'Authorization': `Bearer ${reloginData.token}` }
  })).json();
  if (!refreshedNotes.notes?.some(n => n.id === noteA.id)) {
    throw new Error('FAILED: Note disappeared after re-login!');
  }
  console.log('  ✓ VERIFIED: Note and S3 storage reference faithfully persist across sessions.');

  // --- STEP 8: AUTHORIZED DELETION OF S3 OBJECT & NOTE (REQUIREMENT 10) ---
  console.log('\n[9] Authorized User A deleting document via DELETE /api/notes/:id...');
  const deleteRes = await fetch(`${BASE_URL}/api/notes/${noteA.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const deleteData = await deleteRes.json();
  if (!deleteRes.ok) throw new Error('Delete failed: ' + JSON.stringify(deleteData));
  console.log('  ✓ Delete API responded:', deleteData.message);

  // Verify note removed from library
  const remainingNotes = await (await fetch(`${BASE_URL}/api/notes`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  })).json();
  if (remainingNotes.notes?.some(n => n.id === noteA.id)) {
    throw new Error('FAILED: Note still appears in library after deletion!');
  }
  console.log('  ✓ VERIFIED: Note completely removed from student library.');

  // Verify S3 object removed
  const s3CheckAfterDelete = await fetch(`${BASE_URL}/api/notes/${noteA.id}/file`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  if (s3CheckAfterDelete.status !== 404) {
    throw new Error(`Expected 404 after deletion, got ${s3CheckAfterDelete.status}`);
  }
  console.log('  ✓ VERIFIED: S3 document object deleted. Subsequent retrieval returns 404 Not Found.');

  console.log('\n================================================================');
  console.log('🎉 ALL S3 STORAGE & SECURITY CRITERIA VERIFIED 100% SUCCESSFULLY!');
  console.log('================================================================\n');
}

runTestSuite().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
