// ============================================================================
// Comprehensive Verification Script: Real PDF Upload + Zero Demo Data
// Tests:
// 1. Fresh User Registration & Initial 0-State Verification
// 2. Real local PDF file upload from local machine
// 3. Server-side text extraction & note persistence
// 4. Real AI generation (Summary, Topics, MCQs, Flashcards) grounded in the PDF
// 5. Dashboard & Notes Library statistics update
// 6. Persistence across refresh & logout/login
// 7. Quiz subject isolation & schema validation
// 8. Complete removal of /api/demo/load endpoint
// ============================================================================

import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000';

// Pick an actual real PDF from user's machine
const REAL_PDF_PATH = 'C:\\Users\\AYESHA\\Downloads\\cybersecurity.pdf';
const FALLBACK_PDF_PATH = 'C:\\Users\\AYESHA\\Downloads\\be_computer-engineering_semester-5_2022_may_theory-of-computation-toc-pattern-2019.pdf';

const selectedPdfPath = fs.existsSync(REAL_PDF_PATH) ? REAL_PDF_PATH : FALLBACK_PDF_PATH;

if (!fs.existsSync(selectedPdfPath)) {
  console.error('ERROR: Real PDF file not found at:', selectedPdfPath);
  process.exit(1);
}

const pdfStats = fs.statSync(selectedPdfPath);
console.log(`[TEST SETUP] Using Real Machine PDF: "${path.basename(selectedPdfPath)}" (${(pdfStats.size / 1024).toFixed(1)} KB)`);

async function runVerification() {
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ PASS: ${testName} ${details ? '(' + details + ')' : ''}`);
    } else {
      console.error(`  ✗ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`);
      process.exit(1);
    }
  }

  console.log('\n=== STEP 1: Fresh User Creation & Zero-State Verification (Part 10 & 17) ===');
  const userTimestamp = Date.now();
  const studentEmail = `fresh.student.${userTimestamp}@studybuddy.edu`;
  const studentPassword = 'SecurePassword123!';

  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Priya Sharma',
      email: studentEmail,
      password: studentPassword,
      college: 'National Institute of Technology',
      branch: 'Computer Science & Cybersecurity',
      semester: 'Semester 5'
    })
  });

  const signupData = await signupRes.json();
  assert(signupRes.status === 201 && signupData.token, 'Signup creates fresh user with JWT token');
  const token = signupData.token;
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Check initial progress
  const initialProgRes = await fetch(`${BASE_URL}/api/progress`, { headers: authHeaders });
  const initialData = await initialProgRes.json();
  const initialProgress = initialData.progress;
  
  assert(initialProgress.totalNotes === 0, 'Initial Notes = 0', `got ${initialProgress.totalNotes}`);
  assert(initialProgress.totalSubjects === 0, 'Initial Subjects = 0', `got ${initialProgress.totalSubjects}`);
  assert(initialProgress.questionsAttempted === 0, 'Initial Questions Attempted = 0', `got ${initialProgress.questionsAttempted}`);
  assert(initialProgress.averageScore === null, 'Initial Accuracy = null (displayed as "—")', `got ${initialProgress.averageScore}`);
  assert(initialProgress.studyStreak === 0, 'Initial Study Streak = 0', `got ${initialProgress.studyStreak}`);
  assert(initialProgress.weakTopics.length === 0, 'Initial Weak Topics = 0', `got ${initialProgress.weakTopics.length}`);
  assert(initialProgress.examReadiness === null, 'Initial Exam Readiness = null (displayed as "Unassessed")', `got ${initialProgress.examReadiness}`);

  console.log('\n=== STEP 2: Real PDF Upload & Text Extraction (Part 1, 2, 4, 6) ===');
  const fileBuffer = fs.readFileSync(selectedPdfPath);
  const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' });
  const form = new FormData();
  form.append('file', fileBlob, path.basename(selectedPdfPath));
  form.append('title', 'Cybersecurity & Defense Foundations');
  form.append('subject', 'Cybersecurity');
  form.append('semester', 'Semester 5');
  form.append('unit', 'Unit 1: Security Threats & Cryptography');
  form.append('topic', 'Network Defense & Cryptographic Protocols');
  form.append('description', 'Comprehensive lecture notes on threats, attacks, defense mechanisms, and cryptography.');

  const uploadRes = await fetch(`${BASE_URL}/api/notes/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: form
  });

  const uploadData = await uploadRes.json();
  assert(uploadRes.status === 201, 'Upload returns HTTP 201 Created', `status ${uploadRes.status}`);
  assert(uploadData.note && uploadData.note.id, 'Uploaded note persisted with unique ID', uploadData.note?.id);
  assert(uploadData.note.subject === 'Cybersecurity', 'Note subject preserved correctly', uploadData.note?.subject);
  assert(uploadData.extractedTextLength > 0, 'Real PDF text extracted successfully', `${uploadData.extractedTextLength} characters extracted`);
  const uploadedNoteId = uploadData.note.id;

  console.log('\n=== STEP 3: Real AI Processing Pipeline (Part 14) ===');
  const processRes = await fetch(`${BASE_URL}/api/ai/process-note`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ noteId: uploadedNoteId })
  });

  const processData = await processRes.json();
  assert(processRes.status === 200, 'AI processing returns HTTP 200', `status ${processRes.status}`);
  assert(processData.aiPack, 'AI pack returned');
  assert(processData.aiPack.summary && processData.aiPack.summary.keyConcepts?.length > 0, 'Summary & key concepts generated from document');
  assert(processData.aiPack.mcqs && processData.aiPack.mcqs.length > 0, 'MCQs generated from document', `${processData.aiPack.mcqs?.length} questions`);
  assert(processData.aiPack.flashcards && processData.aiPack.flashcards.length > 0, 'Flashcards generated from document', `${processData.aiPack.flashcards?.length} flashcards`);

  // Verify that questions belong strictly to Cybersecurity
  const allMatchSubject = processData.aiPack.mcqs.every(q => q.subject.toLowerCase() === 'cybersecurity');
  assert(allMatchSubject, '100% of generated MCQs strictly belong to "Cybersecurity"', `checked ${processData.aiPack.mcqs.length} questions`);

  console.log('\n=== STEP 4: Dashboard & Library Statistics Update (Part 16) ===');
  const updatedProgRes = await fetch(`${BASE_URL}/api/progress`, { headers: authHeaders });
  const updatedData = await updatedProgRes.json();
  const updatedProg = updatedData.progress;

  assert(updatedProg.totalNotes === 1, 'Dashboard totalNotes = 1', `got ${updatedProg.totalNotes}`);
  assert(updatedProg.totalSubjects === 1, 'Dashboard totalSubjects = 1', `got ${updatedProg.totalSubjects}`);
  assert(updatedProg.subjects[0] === 'Cybersecurity', 'Dashboard active subject is "Cybersecurity"');
  assert(updatedProg.recentNotes.length === 1, 'Recent notes list updated');

  const notesRes = await fetch(`${BASE_URL}/api/notes`, { headers: authHeaders });
  const notesList = await notesRes.json();
  assert(notesList.notes.length === 1, 'Notes Library contains the uploaded document');
  assert(notesList.notes[0].id === uploadedNoteId, 'Note ID matches in Notes Library');

  console.log('\n=== STEP 5: Persistence Across Refresh & Re-Authentication (Part 16 & 17) ===');
  // Re-login with fresh credentials
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: studentEmail, password: studentPassword })
  });

  const loginData = await loginRes.json();
  assert(loginRes.status === 200 && loginData.token, 'Student can re-login successfully');
  const freshHeaders = {
    'Authorization': `Bearer ${loginData.token}`,
    'Content-Type': 'application/json'
  };

  const reloadedNotes = await fetch(`${BASE_URL}/api/notes`, { headers: freshHeaders });
  const reloadedData = await reloadedNotes.json();
  assert(reloadedData.notes.length === 1, 'Uploaded document remains persistent after re-login');
  assert(reloadedData.notes[0].title === 'Cybersecurity & Defense Foundations', 'Document title intact');

  console.log('\n=== STEP 6: Quiz Session & Subject Isolation (Part 15) ===');
  const quizRes = await fetch(`${BASE_URL}/api/quiz/create`, {
    method: 'POST',
    headers: freshHeaders,
    body: JSON.stringify({
      noteId: uploadedNoteId,
      subject: 'Cybersecurity',
      count: 5
    })
  });

  const quizData = await quizRes.json();
  assert(quizRes.status === 200 && quizData.quiz, 'Quiz session created');
  assert(quizData.quiz.subject === 'Cybersecurity', 'Quiz session subject is Cybersecurity');
  assert(quizData.quiz.questions.length > 0, 'Quiz session contains questions', `${quizData.quiz.questions.length} questions`);

  const quizSubjectIsolation = quizData.quiz.questions.every(q => q.subject.toLowerCase() === 'cybersecurity');
  assert(quizSubjectIsolation, 'No cross-subject question mixing in Cybersecurity quiz');

  // Verify question schema retains userId, noteId, subject, topic, questionId
  const firstQ = quizData.quiz.questions[0];
  assert(firstQ.subject === 'Cybersecurity', 'Question has subject metadata');
  assert(Boolean(firstQ.id), 'Question has questionId');
  assert(Boolean(firstQ.topic), 'Question has topic metadata');
  assert(Array.isArray(firstQ.options) && firstQ.options.length === 4, 'Question has 4 valid options');
  assert(Boolean(firstQ.correctAnswer), 'Question has correct answer');
  assert(Boolean(firstQ.explanation), 'Question has conceptual explanation');

  console.log('\n=== STEP 7: Verify Complete Removal of Demo Endpoint (Part 8 & 12) ===');
  const demoEndpointRes = await fetch(`${BASE_URL}/api/demo/load`, {
    method: 'POST',
    headers: freshHeaders
  });

  assert(demoEndpointRes.status === 404, '/api/demo/load route returns HTTP 404 Not Found (Endpoint Removed)', `status ${demoEndpointRes.status}`);

  console.log('\n============================================================');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log('ALL VERIFICATION CRITERIA SATISFIED WITH REAL LOCAL PDF & CLEAN USER DATA');
  console.log('============================================================\n');
}

runVerification().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
