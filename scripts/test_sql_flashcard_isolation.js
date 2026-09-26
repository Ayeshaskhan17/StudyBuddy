// scripts/test_sql_flashcard_isolation.js
// Automated regression test suite reproducing the exact bug and verifying
// noteId-scoped isolation, zero cross-pollination, refresh, and login persistence.

import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5000';

function createSamplePdfBuffer(textContent) {
  // Minimal valid PDF structure with extractable text stream
  const escapedText = textContent.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const streamContent = `BT\n/F1 12 Tf\n50 700 Td\n(${escapedText}) Tj\nET`;
  const streamLength = Buffer.byteLength(streamContent);

  const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${streamLength} >> stream
${streamContent}
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000246 00000 n 
0000000300 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
380
%%EOF`;

  return Buffer.from(pdf);
}

async function runRegressionTestSuite() {
  console.log('===============================================================');
  console.log('🧪 RUNNING SQL / CLOUD FLASHCARD SOURCE ISOLATION REGRESSION TEST');
  console.log('===============================================================\n');

  const testEmail = `student_iso_${Date.now()}@university.edu`;
  const testPassword = 'Password123!';

  // STEP 1: Create fresh student account
  console.log('[1] Creating new isolated student account:', testEmail);
  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Isolation Tester',
      email: testEmail,
      password: testPassword,
      college: 'Test University',
      branch: 'Computer Science',
      semester: 'Semester 5'
    })
  });
  const signupData = await signupRes.json();
  if (!signupRes.ok) throw new Error('Signup failed: ' + JSON.stringify(signupData));
  let token = signupData.token;
  const userId = signupData.user.id;
  console.log(`✓ Account created. User ID: ${userId}`);

  // STEP 2: Upload Note 1 - Cloud Computing PDF
  console.log('\n[2] Uploading Note 1: Cloud Computing PDF...');
  const cloudText = `Cloud Computing and Cloud Infrastructure.
Infrastructure as a Service (IaaS) provides virtual machines and storage.
Platform as a Service (PaaS) provides development runtimes and tools.
Software as a Service (SaaS) provides complete applications.
Hardware Virtualization uses hypervisors to manage isolated virtual machines.
Cloud Bursting allows private clouds to overflow into public clouds during peak spikes.`;

  const cloudPdf = createSamplePdfBuffer(cloudText);
  const cloudFormData = new FormData();
  cloudFormData.append('file', new Blob([cloudPdf], { type: 'application/pdf' }), 'cloud_computing.pdf');
  cloudFormData.append('title', 'Cloud Computing Architecture');
  cloudFormData.append('subject', 'Cloud Computing');
  cloudFormData.append('semester', 'Semester 5');
  cloudFormData.append('unit', 'Unit 1');
  cloudFormData.append('topic', 'IaaS, PaaS, and Virtualization');

  const cloudUploadRes = await fetch(`${BASE_URL}/api/notes/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: cloudFormData
  });
  const cloudUploadData = await cloudUploadRes.json();
  if (!cloudUploadRes.ok) throw new Error('Cloud upload failed: ' + JSON.stringify(cloudUploadData));
  const cloudNoteId = cloudUploadData.note.id;
  console.log(`✓ Note 1 uploaded. Note ID: ${cloudNoteId}`);

  // Process Cloud Note AI
  console.log('   Processing Note 1 AI Study Pack...');
  const cloudProcRes = await fetch(`${BASE_URL}/api/ai/process-note`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ noteId: cloudNoteId })
  });
  const cloudProcData = await cloudProcRes.json();
  if (!cloudProcRes.ok) throw new Error('Cloud AI process failed: ' + JSON.stringify(cloudProcData));
  console.log(`✓ Note 1 AI Pack generated.`);

  // STEP 3: Upload Note 2 - SQL / DBMS PDF
  console.log('\n[3] Uploading Note 2: SQL / DBMS PDF...');
  const sqlText = `DATABASE MANAGEMENT SYSTEMS LECTURE NOTES.
Data is defined as recorded facts, statistics, and figures with implicit meaning.
Database is defined as a collection of related relations and persistent records.
Record is defined as a collection of related data items representing an entity.
SQL is defined as Structured Query Language for defining and manipulating relational tables.
Relational Model represents data as two-dimensional tables called relations.
Normalization is defined as the process of organizing data to eliminate anomalies.
ACID Model guarantees Atomicity, Consistency, Isolation, and Durability in database transactions.`;

  const sqlPdf = createSamplePdfBuffer(sqlText);
  const sqlFormData = new FormData();
  sqlFormData.append('file', new Blob([sqlPdf], { type: 'application/pdf' }), 'sql_dbms.pdf');
  sqlFormData.append('title', 'sql');
  sqlFormData.append('subject', 'DBMS');
  sqlFormData.append('semester', 'Semester 5');
  sqlFormData.append('unit', 'Unit 2');
  sqlFormData.append('topic', 'SQL & Relational Databases');

  const sqlUploadRes = await fetch(`${BASE_URL}/api/notes/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: sqlFormData
  });
  const sqlUploadData = await sqlUploadRes.json();
  if (!sqlUploadRes.ok) throw new Error('SQL upload failed: ' + JSON.stringify(sqlUploadData));
  const sqlNoteId = sqlUploadData.note.id;
  console.log(`✓ Note 2 uploaded. Note ID: ${sqlNoteId}`);

  // Process SQL Note AI
  console.log('   Processing Note 2 AI Study Pack...');
  const sqlProcRes = await fetch(`${BASE_URL}/api/ai/process-note`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ noteId: sqlNoteId })
  });
  const sqlProcData = await sqlProcRes.json();
  if (!sqlProcRes.ok) throw new Error('SQL AI process failed: ' + JSON.stringify(sqlProcData));
  console.log(`✓ Note 2 AI Pack generated.`);

  // STEP 4: Test SQL Flashcards Isolation (Requirement 2, 3, 4, 8, 9)
  console.log('\n[4] Querying SQL Flashcards via /api/flashcards?noteId=' + sqlNoteId);
  const sqlFcRes = await fetch(`${BASE_URL}/api/flashcards?noteId=${sqlNoteId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const sqlFcData = await sqlFcRes.json();
  if (!sqlFcRes.ok) throw new Error('SQL flashcard retrieval failed: ' + JSON.stringify(sqlFcData));

  console.log(`✓ Retrieved ${sqlFcData.flashcards?.length} flashcards for SQL note.`);
  if (!sqlFcData.flashcards || sqlFcData.flashcards.length === 0) {
    throw new Error('FAIL: SQL note returned 0 flashcards!');
  }

  // ASSERTIONS on SQL Flashcards
  for (const fc of sqlFcData.flashcards) {
    // Assert noteId matches
    if (fc.noteId !== sqlNoteId) {
      throw new Error(`FAIL: Flashcard noteId mismatch! Expected ${sqlNoteId}, got ${fc.noteId}`);
    }
    // Assert userId matches
    if (fc.userId !== userId) {
      throw new Error(`FAIL: Flashcard userId mismatch! Expected ${userId}, got ${fc.userId}`);
    }
    // Assert NO Cloud Computing content!
    const combinedText = (fc.front + ' ' + fc.back + ' ' + (fc.topic || '')).toLowerCase();
    if (
      combinedText.includes('cloud computing') ||
      combinedText.includes('what is cloud computing') ||
      combinedText.includes('iaas') ||
      combinedText.includes('paas') ||
      combinedText.includes('saas') ||
      combinedText.includes('hypervisor') ||
      combinedText.includes('cloud fundamentals')
    ) {
      throw new Error(`CRITICAL BUG DETECTED: SQL flashcard contains Cloud Computing content! Card: ${JSON.stringify(fc)}`);
    }
  }
  console.log('✓ ASSERTION PASSED: 100% of SQL flashcards match SQL noteId and contain ZERO Cloud Computing content!');

  // STEP 5: Test Cloud Flashcards Isolation
  console.log('\n[5] Querying Cloud Flashcards via /api/flashcards?noteId=' + cloudNoteId);
  const cloudFcRes = await fetch(`${BASE_URL}/api/flashcards?noteId=${cloudNoteId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const cloudFcData = await cloudFcRes.json();
  if (!cloudFcRes.ok) throw new Error('Cloud flashcard retrieval failed: ' + JSON.stringify(cloudFcData));

  for (const fc of cloudFcData.flashcards) {
    if (fc.noteId !== cloudNoteId) {
      throw new Error(`FAIL: Cloud Flashcard noteId mismatch! Expected ${cloudNoteId}, got ${fc.noteId}`);
    }
    const combinedText = (fc.front + ' ' + fc.back + ' ' + (fc.topic || '')).toLowerCase();
    if (combinedText.includes('acid') || combinedText.includes('relational model') || combinedText.includes('normalization')) {
      throw new Error(`FAIL: Cloud note contains SQL content! Card: ${JSON.stringify(fc)}`);
    }
  }
  console.log('✓ ASSERTION PASSED: 100% of Cloud flashcards match Cloud noteId and contain ZERO SQL content!');

  // STEP 6: Test Rapid Switching (Cloud -> SQL -> Cloud -> SQL)
  console.log('\n[6] Testing Rapid Note Switching Isolation (Cloud -> SQL -> Cloud -> SQL)...');
  for (let cycle = 1; cycle <= 2; cycle++) {
    // Switch to Cloud
    const cRes = await fetch(`${BASE_URL}/api/flashcards?noteId=${cloudNoteId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const cData = await cRes.json();
    for (const fc of cData.flashcards) {
      if (fc.noteId !== cloudNoteId) throw new Error('Switching bug: Cloud request returned non-Cloud noteId');
    }

    // Switch to SQL
    const sRes = await fetch(`${BASE_URL}/api/flashcards?noteId=${sqlNoteId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const sData = await sRes.json();
    for (const fc of sData.flashcards) {
      if (fc.noteId !== sqlNoteId) throw new Error('Switching bug: SQL request returned non-SQL noteId');
      if (fc.front.includes('Cloud Computing')) throw new Error('Switching bug: SQL request returned Cloud Computing content');
    }
    console.log(`   ✓ Cycle ${cycle} switch clean.`);
  }
  console.log('✓ ASSERTION PASSED: Switching between notes produces zero stale card contamination.');

  // STEP 7: Test Refresh Behavior (Simulating page reload)
  console.log('\n[7] Testing Browser Refresh Simulation...');
  const reloadRes = await fetch(`${BASE_URL}/api/flashcards?noteId=${sqlNoteId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const reloadData = await reloadRes.json();
  if (reloadData.flashcards.length === 0) throw new Error('Refresh failed: 0 cards returned.');
  for (const fc of reloadData.flashcards) {
    if (fc.noteId !== sqlNoteId) throw new Error('Refresh error: noteId mismatch!');
    if (/cloud computing/i.test(fc.front)) throw new Error('Refresh error: Cloud Computing cards appeared!');
  }
  console.log('✓ ASSERTION PASSED: On reload, SQL cards persist faithfully without Cloud cards.');

  // STEP 8: Test Logout & Re-login Persistence (Requirement 16)
  console.log('\n[8] Testing Logout and Re-login Persistence...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) throw new Error('Re-login failed: ' + JSON.stringify(loginData));
  const newToken = loginData.token;

  const reLoginFcRes = await fetch(`${BASE_URL}/api/flashcards?noteId=${sqlNoteId}`, {
    headers: { 'Authorization': `Bearer ${newToken}` }
  });
  const reLoginFcData = await reLoginFcRes.json();
  if (reLoginFcData.flashcards.length === 0) throw new Error('Post-login failed: 0 cards returned.');
  for (const fc of reLoginFcData.flashcards) {
    if (fc.noteId !== sqlNoteId) throw new Error('Post-login error: noteId mismatch!');
    if (/cloud computing/i.test(fc.front)) throw new Error('Post-login error: Cloud Computing cards appeared!');
  }
  console.log('✓ ASSERTION PASSED: Re-login accurately serves SQL flashcards without Cloud cards.');

  // STEP 9: Test Multiple SQL Documents (Requirement 17)
  console.log('\n[9] Testing Multiple SQL Documents Isolation (Unit 1 vs Unit 2)...');
  const sqlUnit1Text = `SQL Unit 1: Relational Algebra and Relational Calculus.
Projection operator selects specified columns from a relation.
Selection operator selects rows that satisfy a specified predicate condition.
Join operator combines tuples from two relations based on common attributes.
Cartesian Product combines all tuples from two relations.`;

  const sqlUnit1Pdf = createSamplePdfBuffer(sqlUnit1Text);
  const sql1FormData = new FormData();
  sql1FormData.append('file', new Blob([sqlUnit1Pdf], { type: 'application/pdf' }), 'sql_unit1.pdf');
  sql1FormData.append('title', 'SQL Unit 1 - Relational Algebra');
  sql1FormData.append('subject', 'SQL');
  sql1FormData.append('semester', 'Semester 5');
  sql1FormData.append('unit', 'Unit 1');
  sql1FormData.append('topic', 'Relational Algebra Operators');

  const sql1UploadRes = await fetch(`${BASE_URL}/api/notes/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${newToken}` },
    body: sql1FormData
  });
  const sql1UploadData = await sql1UploadRes.json();
  const sqlUnit1NoteId = sql1UploadData.note.id;

  // Process Unit 1
  await fetch(`${BASE_URL}/api/ai/process-note`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${newToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ noteId: sqlUnit1NoteId })
  });

  const unit1Cards = (await (await fetch(`${BASE_URL}/api/flashcards?noteId=${sqlUnit1NoteId}`, {
    headers: { 'Authorization': `Bearer ${newToken}` }
  })).json()).flashcards;

  const unit2Cards = (await (await fetch(`${BASE_URL}/api/flashcards?noteId=${sqlNoteId}`, {
    headers: { 'Authorization': `Bearer ${newToken}` }
  })).json()).flashcards;

  if (sqlUnit1NoteId === sqlNoteId) throw new Error('Unit 1 and Unit 2 must have distinct noteIds!');
  for (const c of unit1Cards) {
    if (c.noteId !== sqlUnit1NoteId) throw new Error('Unit 1 card tagged with wrong noteId!');
  }
  for (const c of unit2Cards) {
    if (c.noteId !== sqlNoteId) throw new Error('Unit 2 card tagged with wrong noteId!');
  }
  console.log(`✓ Unit 1 noteId (${sqlUnit1NoteId}) has ${unit1Cards.length} cards.`);
  console.log(`✓ Unit 2 noteId (${sqlNoteId}) has ${unit2Cards.length} cards.`);
  console.log('✓ ASSERTION PASSED: Multiple SQL notes are fully isolated by noteId.');

  // STEP 10: Test Quiz Isolation (Requirement 19)
  console.log('\n[10] Testing Quiz Isolation for SQL note...');
  const quizRes = await fetch(`${BASE_URL}/api/quiz/create`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${newToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      noteId: sqlNoteId,
      subject: 'DBMS',
      topic: 'SQL & Relational Databases',
      count: 5
    })
  });
  const quizData = await quizRes.json();
  if (!quizRes.ok) throw new Error('Quiz creation failed: ' + JSON.stringify(quizData));
  for (const q of quizData.quiz.questions) {
    if (q.noteId && q.noteId !== sqlNoteId) {
      throw new Error(`FAIL: Quiz question has incorrect noteId: ${q.noteId} (expected ${sqlNoteId})`);
    }
    const qLower = (q.question + ' ' + (q.explanation || '')).toLowerCase();
    if (qLower.includes('cloud computing') || qLower.includes('iaas') || qLower.includes('hypervisor')) {
      throw new Error(`FAIL: SQL quiz contains Cloud Computing question: ${q.question}`);
    }
  }
  console.log('✓ ASSERTION PASSED: SQL Quiz questions are 100% isolated to SQL/DBMS with ZERO Cloud Computing questions.');

  console.log('\n===============================================================');
  console.log('🎉 ALL REGRESSION & SOURCE-ISOLATION TESTS PASSED 100%!');
  console.log('===============================================================\n');
}

runRegressionTestSuite().catch(err => {
  console.error('\n❌ REGRESSION TEST FAILED:', err);
  process.exit(1);
});
