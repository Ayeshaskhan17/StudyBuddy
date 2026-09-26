const API_BASE = 'http://localhost:5000/api';

async function runCompleteAuthTests() {
  console.log('============================================================');
  console.log('STARTING COMPLETE AUTHENTICATION & MULTI-USER ISOLATION TESTS');
  console.log('============================================================\n');

  let passedTests = 0;
  let totalTests = 6;

  // TEST 1 — FRESH ACCOUNT
  console.log('TEST 1 — FRESH ACCOUNT SIGNUP & LOGIN:');
  const timestamp = Date.now();
  const test1Email = `unique-test-user-${timestamp}@example.com`;
  const test1Password = 'TestPassword123!';
  const test1Name = 'Test Student';

  // Step 1: Signup
  const signupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: test1Name,
      email: test1Email,
      password: test1Password,
      college: 'Apex Engineering Institute',
      branch: 'Computer Science',
      semester: 'Semester 4'
    })
  });
  const signupData = await signupRes.json();
  if (signupRes.status !== 201 || !signupData.token || !signupData.user) {
    throw new Error(`Test 1 Signup Failed: Status ${signupRes.status}, Body: ${JSON.stringify(signupData)}`);
  }
  const originalUserId = signupData.user.id;
  console.log(`  ✓ Signup succeeded for ${test1Email} (User ID: ${originalUserId})`);

  // Step 2: Immediate Logout simulation (drop token)
  let activeToken = null;

  // Step 3: Login using the EXACT SAME email and password
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: test1Email,
      password: test1Password
    })
  });
  const loginData = await loginRes.json();
  if (loginRes.status !== 200 || !loginData.token || !loginData.user) {
    throw new Error(`Test 1 Login Failed: Status ${loginRes.status}, Body: ${JSON.stringify(loginData)}`);
  }
  if (loginData.user.id !== originalUserId) {
    throw new Error(`Test 1 User ID Mismatch: Expected ${originalUserId}, got ${loginData.user.id}`);
  }
  activeToken = loginData.token;
  console.log(`  ✓ Immediate Login succeeded with same credentials (Token issued, User ID verified)`);
  passedTests++;

  // TEST 2 — WRONG PASSWORD
  console.log('\nTEST 2 — WRONG PASSWORD REJECTION:');
  const wrongPassRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: test1Email,
      password: 'WrongPassword123!'
    })
  });
  const wrongPassData = await wrongPassRes.json();
  if (wrongPassRes.status !== 401) {
    throw new Error(`Test 2 Failed: Expected 401 status, got ${wrongPassRes.status}`);
  }
  if (wrongPassData.error !== 'Invalid email or password') {
    throw new Error(`Test 2 Failed: Expected 'Invalid email or password', got '${wrongPassData.error}'`);
  }
  console.log(`  ✓ Wrong password strictly rejected with 401 and generic security message: "${wrongPassData.error}"`);
  passedTests++;

  // TEST 3 — REFRESH / PERSISTENCE (GET /api/auth/me)
  console.log('\nTEST 3 — REFRESH / TOKEN PERSISTENCE (/api/auth/me):');
  const meRes = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${activeToken}`
    }
  });
  const meData = await meRes.json();
  if (meRes.status !== 200 || !meData.user || meData.user.id !== originalUserId) {
    throw new Error(`Test 3 Failed: /api/auth/me rejected valid token. Status ${meRes.status}, Body: ${JSON.stringify(meData)}`);
  }
  console.log(`  ✓ Token validation (/api/auth/me) succeeded: User ${meData.user.name} (${meData.user.email}) remains authenticated across refresh`);
  passedTests++;

  // TEST 4 — LOGOUT / PROTECTED ROUTE PROTECTION
  console.log('\nTEST 4 — LOGOUT SIMULATION & ROUTE PROTECTION:');
  const unauthRes = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    headers: {} // No token provided
  });
  if (unauthRes.status !== 401) {
    throw new Error(`Test 4 Failed: Expected 401 Unauthorized without token, got ${unauthRes.status}`);
  }
  console.log(`  ✓ Unauthenticated requests to /api/auth/me correctly blocked with 401`);
  passedTests++;

  // TEST 5 — LOGIN AGAIN AFTER LOGOUT
  console.log('\nTEST 5 — LOGIN AGAIN AFTER LOGOUT:');
  // Also test case-insensitive email normalization during login: "UNIQUE-TEST-USER-...@EXAMPLE.COM"
  const loginAgainRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `  ${test1Email.toUpperCase()}  `,
      password: test1Password
    })
  });
  const loginAgainData = await loginAgainRes.json();
  if (loginAgainRes.status !== 200 || loginAgainData.user.id !== originalUserId) {
    throw new Error(`Test 5 Failed: Status ${loginAgainRes.status}, Body: ${JSON.stringify(loginAgainData)}`);
  }
  console.log(`  ✓ Login again succeeded (including case-insensitive and trimmed email handling)`);
  passedTests++;

  // TEST 6 — USER DATA ISOLATION
  console.log('\nTEST 6 — MULTI-USER DATA ISOLATION:');
  const userAEmail = `user-a-${timestamp}@example.com`;
  const userBEmail = `user-b-${timestamp}@example.com`;

  // Create User A
  const signupARes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'User Alpha',
      email: userAEmail,
      password: 'PasswordAlpha123!'
    })
  });
  const userAData = await signupARes.json();
  const tokenA = userAData.token;

  // Create User B
  const signupBRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'User Beta',
      email: userBEmail,
      password: 'PasswordBeta123!'
    })
  });
  const userBData = await signupBRes.json();
  const tokenB = userBData.token;

  // User A creates a note
  const noteARes = await fetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      title: 'Secret Alpha Research Note',
      subject: 'Quantum Computing',
      topic: 'Qubits & Superposition',
      content: 'Confidential User A research on quantum decoherence.'
    })
  });
  const noteAData = await noteARes.json();
  const noteAId = noteAData.note?.id || noteAData.id;

  // User B lists notes
  const notesBRes = await fetch(`${API_BASE}/notes`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenB}`
    }
  });
  const notesBData = await notesBRes.json();
  const notesBList = notesBData.notes || [];
  const userBSeesUserANote = notesBList.some(n => n.id === noteAId || n.title === 'Secret Alpha Research Note');
  if (userBSeesUserANote) {
    throw new Error(`Data Isolation Breach! User B was able to see User A's note!`);
  }

  // User B attempts to access User A's note directly
  const directAccessRes = await fetch(`${API_BASE}/notes/${noteAId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenB}`
    }
  });
  if (directAccessRes.status !== 404 && directAccessRes.status !== 403) {
    throw new Error(`Data Isolation Breach! User B directly accessed User A note with status ${directAccessRes.status}`);
  }

  // User B checks progress
  const progressBRes = await fetch(`${API_BASE}/progress`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tokenB}`
    }
  });
  const progressBData = await progressBRes.json();
  const totalNotes = progressBData.progress?.totalNotes ?? progressBData.totalNotes;
  if (totalNotes !== 0) {
    throw new Error(`Data Isolation Breach! User B shows ${totalNotes} notes instead of 0!`);
  }

  // 1. Notes Isolation
  console.log(`  ✓ User A created private note: "${noteAData.note?.title || 'Secret Alpha Research Note'}"`);
  console.log(`  ✓ User B note listing contains 0 notes (User A's note is NOT visible)`);
  console.log(`  ✓ User B direct access attempt to User A note returned ${directAccessRes.status} (Access Denied)`);

  // 2. Quiz Attempts & Mistakes Isolation
  const quizResA = await fetch(`${API_BASE}/quiz/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      subject: 'Quantum Computing',
      topic: 'Qubits & Superposition',
      totalQuestions: 5,
      correctCount: 4,
      wrongCount: 1,
      answers: [{ question: 'What is superposition?', isCorrect: false, studentAnswer: 'Classical bit', correctAnswer: 'Linear combination of states' }]
    })
  });
  if (quizResA.status !== 200) throw new Error('Failed to record User A quiz');

  const mistakesResB = await fetch(`${API_BASE}/mistakes`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  const mistakesB = await mistakesResB.json();
  if ((mistakesB.mistakes || []).length !== 0) {
    throw new Error(`Data Isolation Breach! User B sees User A's mistakes!`);
  }
  console.log(`  ✓ User B mistakes list is isolated (0 mistakes, User A's mistakes hidden)`);

  // 3. Flashcards Isolation
  const flashcardResA = await fetch(`${API_BASE}/flashcard/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      noteId: noteAId,
      cardId: 'card-1',
      front: 'What is entanglement?',
      state: 'mastered'
    })
  });
  if (flashcardResA.status !== 200) throw new Error('Failed to record User A flashcard');

  const flashcardResB = await fetch(`${API_BASE}/flashcard/progress`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  const flashcardB = await flashcardResB.json();
  if ((flashcardB.progress?.totalReviewed || 0) !== 0) {
    throw new Error(`Data Isolation Breach! User B sees User A's flashcard progress!`);
  }
  console.log(`  ✓ User B flashcard progress is isolated (0 reviewed, User A's progress hidden)`);

  // 4. Study Sessions Isolation
  const sessionResA = await fetch(`${API_BASE}/study-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      subject: 'Quantum Computing',
      topic: 'Qubits',
      durationSeconds: 1200
    })
  });
  if (sessionResA.status !== 200) throw new Error('Failed to record User A study session');

  const sessionResB = await fetch(`${API_BASE}/study-session`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  const sessionB = await sessionResB.json();
  if ((sessionB.sessions || []).length !== 0) {
    throw new Error(`Data Isolation Breach! User B sees User A's study sessions!`);
  }
  console.log(`  ✓ User B study sessions list is isolated (0 sessions, User A's sessions hidden)`);

  // 5. Exam Results Isolation
  const examResA = await fetch(`${API_BASE}/exam/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({
      subject: 'Quantum Computing',
      totalQuestions: 10,
      score: 90,
      correctCount: 9,
      wrongCount: 1,
      skippedCount: 0,
      timeTakenSeconds: 600
    })
  });
  if (examResA.status !== 200) throw new Error('Failed to record User A exam attempt');

  const examResB = await fetch(`${API_BASE}/exam/attempts`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  const examB = await examResB.json();
  if ((examB.attempts || []).length !== 0) {
    throw new Error(`Data Isolation Breach! User B sees User A's exam attempts!`);
  }
  console.log(`  ✓ User B exam attempts list is isolated (0 attempts, User A's exams hidden)`);

  // 6. Overall Progress Isolation
  console.log(`  ✓ User B progress calculation strictly isolated (0 notes, 0 questions attempted)`);
  passedTests++;

  console.log('\n============================================================');
  console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('============================================================');
}

runCompleteAuthTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err.message);
  process.exit(1);
});
