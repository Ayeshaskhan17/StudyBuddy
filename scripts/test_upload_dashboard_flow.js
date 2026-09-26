const API_BASE = 'http://localhost:5000/api';

async function testCompleteUploadAndDashboardFlow() {
  console.log('============================================================');
  console.log('STARTING COMPLETE UPLOAD, AI PROCESSING & DASHBOARD UPDATE TEST');
  console.log('============================================================\n');

  const timestamp = Date.now();
  const testEmail = `student_upload_test_${timestamp}@university.edu`;
  const testPassword = 'Password123!';
  const testName = 'Alex Mercer';

  // STEP 1: LOGIN / FRESH ACCOUNT REGISTRATION
  console.log('[STEP 1] Fresh Account Registration & Login:');
  const signupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword,
      college: 'Institute of Advanced Computing',
      branch: 'Computer Science & AI',
      semester: 'Semester 4'
    })
  });
  const signupData = await signupRes.json();
  if (signupRes.status !== 201 || !signupData.token) {
    throw new Error(`Signup failed: Status ${signupRes.status}, Body: ${JSON.stringify(signupData)}`);
  }
  const token = signupData.token;
  const userId = signupData.user.id;
  console.log(`  ✓ Account created successfully for ${testEmail} (User ID: ${userId})`);

  // STEP 2: VERIFY INITIAL DASHBOARD STATE (Clean Empty State)
  console.log('\n[STEP 2] Inspecting Initial Dashboard State:');
  const initialProgRes = await fetch(`${API_BASE}/progress`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const initialProg = (await initialProgRes.json()).progress;
  console.log(`  Initial stats: Total Notes = ${initialProg.totalNotes}, Subjects = ${initialProg.totalSubjects}, Questions = ${initialProg.questionsAttempted}`);
  if (initialProg.totalNotes !== 0 || initialProg.totalSubjects !== 0) {
    throw new Error('Initial dashboard has dirty/unisolated data!');
  }
  console.log('  ✓ Initial Dashboard is clean: 0 notes, 0 subjects, 0 questions attempted.');

  // STEP 3: PREPARE AND UPLOAD REAL PDF TO /api/notes/upload
  console.log('\n[STEP 3] Uploading Real Study Document (PDF):');
  const samplePdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 310 >> stream
BT
/F1 12 Tf
72 710 Td
(Distributed Systems: Consensus Protocols and Raft Algorithm.) Tj
0 -22 Td
(The Raft consensus protocol ensures state machine replication across distributed server clusters.) Tj
0 -22 Td
(Leader election in Raft utilizes randomized election timeouts to prevent split votes.) Tj
0 -22 Td
(Log entries are committed only after being written to a quorum of peer nodes.) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000606 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
677
%%EOF`;

  const pdfBuffer = Buffer.from(samplePdfContent, 'utf8');
  const boundary = '----StudyBuddyUploadBoundary' + Math.random().toString(36).substring(2);
  let multipartBody = '';
  multipartBody += `--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nDistributed Systems — Raft Consensus\r\n`;
  multipartBody += `--${boundary}\r\nContent-Disposition: form-data; name="subject"\r\n\r\nDistributed Systems\r\n`;
  multipartBody += `--${boundary}\r\nContent-Disposition: form-data; name="semester"\r\n\r\nSemester 4\r\n`;
  multipartBody += `--${boundary}\r\nContent-Disposition: form-data; name="unit"\r\n\r\nUnit 3\r\n`;
  multipartBody += `--${boundary}\r\nContent-Disposition: form-data; name="topic"\r\n\r\nRaft Leader Election and Log Replication\r\n`;
  multipartBody += `--${boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\nLecture notes on distributed consensus, safety invariants, and leader heartbeats.\r\n`;
  multipartBody += `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="Raft_Consensus_Notes.pdf"\r\nContent-Type: application/pdf\r\n\r\n`;

  const payloadBuffer = Buffer.concat([
    Buffer.from(multipartBody, 'utf8'),
    pdfBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
  ]);

  const uploadRes = await fetch(`${API_BASE}/notes/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: payloadBuffer
  });

  const uploadData = await uploadRes.json();
  if (uploadRes.status !== 201 || !uploadData.note || !uploadData.note.id) {
    throw new Error(`Upload Failed: Status ${uploadRes.status}, Body: ${JSON.stringify(uploadData)}`);
  }
  const uploadedNote = uploadData.note;
  console.log(`  ✓ Document Uploaded Successfully!`);
  console.log(`    Note ID: ${uploadedNote.id}`);
  console.log(`    Title: "${uploadedNote.title}"`);
  console.log(`    Subject: "${uploadedNote.subject}"`);
  console.log(`    Extracted Text Length: ${uploadData.extractedTextLength} chars`);
  console.log(`    S3 Key: ${uploadedNote.s3Key}`);

  // STEP 4: REAL AI PROCESSING PIPELINE
  console.log('\n[STEP 4] Executing AI Study Pack Generation:');
  const processRes = await fetch(`${API_BASE}/ai/process-note`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ noteId: uploadedNote.id })
  });
  const processData = await processRes.json();
  if (processRes.status !== 200 || !processData.aiPack) {
    throw new Error(`AI Processing Failed: Status ${processRes.status}, Body: ${JSON.stringify(processData)}`);
  }
  const aiPack = processData.aiPack;
  console.log(`  ✓ AI Processing Completed!`);
  console.log(`    Summary Title: "${aiPack.summary?.title || 'Synthesized Summary'}"`);
  console.log(`    Topics Extracted: ${aiPack.topics?.length || 0}`);
  console.log(`    MCQs Formulated: ${aiPack.mcqs?.length || 0}`);
  console.log(`    Flashcards Created: ${aiPack.flashcards?.length || 0}`);

  // STEP 5: VERIFY DASHBOARD UPDATES WITHOUT REFRESH
  console.log('\n[STEP 5] Verifying Dashboard Auto-Update:');
  const updatedProgRes = await fetch(`${API_BASE}/progress`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const updatedProg = (await updatedProgRes.json()).progress;
  console.log(`  Updated Stats: Total Notes = ${updatedProg.totalNotes}, Total Subjects = ${updatedProg.totalSubjects}`);
  if (updatedProg.totalNotes !== 1) {
    throw new Error(`Dashboard note count mismatch! Expected 1, got ${updatedProg.totalNotes}`);
  }
  if (updatedProg.totalSubjects !== 1 || !updatedProg.subjects.includes('Distributed Systems')) {
    throw new Error(`Dashboard subjects mismatch! Expected ['Distributed Systems'], got ${JSON.stringify(updatedProg.subjects)}`);
  }
  if (!updatedProg.recentNotes.some(n => n.id === uploadedNote.id)) {
    throw new Error(`Uploaded note is missing from Dashboard recentNotes!`);
  }
  console.log(`  ✓ Dashboard accurately updated:`);
  console.log(`    - Notes count updated to 1`);
  console.log(`    - Subjects updated to [ "Distributed Systems" ]`);
  console.log(`    - Recent notes contains "${uploadedNote.title}"`);

  // STEP 6: VERIFY NOTES LIBRARY PERSISTENCE
  console.log('\n[STEP 6] Verifying Notes Library:');
  const notesRes = await fetch(`${API_BASE}/notes`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const notesData = await notesRes.json();
  const foundInLibrary = (notesData.notes || []).some(n => n.id === uploadedNote.id);
  if (!foundInLibrary) {
    throw new Error(`Uploaded note not found in /api/notes response!`);
  }
  console.log(`  ✓ Note "${uploadedNote.title}" is successfully listed in Notes Library.`);

  // STEP 7: BROWSER REFRESH SIMULATION (Re-authentication & State Persistence)
  console.log('\n[STEP 7] Simulating Page Refresh (Session Persistence):');
  const meRes = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const meData = await meRes.json();
  if (meRes.status !== 200 || meData.user.id !== userId) {
    throw new Error(`Session lost on simulated refresh!`);
  }
  const refreshedProgRes = await fetch(`${API_BASE}/progress`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const refreshedProg = (await refreshedProgRes.json()).progress;
  if (refreshedProg.totalNotes !== 1) {
    throw new Error(`Note count lost on refresh!`);
  }
  console.log(`  ✓ Session verified: User "${meData.user.name}" remains logged in.`);
  console.log(`  ✓ Persisted study data preserved across page refresh.`);

  console.log('\n============================================================');
  console.log('🎉 ALL UPLOAD, AI PROCESSING & DASHBOARD FLOW TESTS PASSED!');
  console.log('============================================================');
}

testCompleteUploadAndDashboardFlow().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
