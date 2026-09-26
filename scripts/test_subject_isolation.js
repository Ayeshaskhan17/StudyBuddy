// Using native fetch

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('STUDYBUDDY SUBJECT ISOLATION & QUIZ INTEGRITY TEST');
  console.log('====================================================\n');

  // Step 1: Login or create a user session
  console.log('[Step 1] Authenticating test user...');
  const testEmail = `test_audit_${Date.now()}@studybuddy.test`;
  const testPassword = 'Password123!';

  const signupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. Test Student',
      email: testEmail,
      password: testPassword,
      college: 'Test University',
      branch: 'Science & Engineering',
      semester: 'Fall 2026'
    })
  });
  const authData = await signupRes.json();
  if (!authData.token) {
    throw new Error('Authentication failed: ' + JSON.stringify(authData));
  }
  const token = authData.token;
  const user = authData.user;
  console.log(`Authenticated as: ${user.name} (${user.id})\n`);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Step 2: Create a Biology Note and a Computer Science Note
  console.log('[Step 2] Creating test notes for Biology and Computer Science...');
  const bioNoteRes = await fetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'AP Biology: Cell Division and Genetics',
      subject: 'Biology',
      topic: 'Cell Biology',
      description: 'Comprehensive study guide on mitosis, meiosis, ATP synthesis, and cellular membranes.',
      fileType: 'pdf',
      semester: 'Fall 2026',
      extractedText: `
        Cellular Biology and Genetics Overview.
        Mitochondria is known as the powerhouse of eukaryotic cells because it synthesizes ATP via oxidative phosphorylation.
        The cell membrane consists of a phospholipid bilayer with hydrophilic heads facing outwards and hydrophobic fatty acid tails inside.
        Photosynthesis takes place within the chloroplasts, utilizing chlorophyll pigments to convert carbon dioxide and water into glucose.
        Enzymes act as biological catalysts that lower the activation energy required for biochemical reactions without being consumed.
        DNA replication follows a semi-conservative model where each daughter strand retains one parental nucleotide template.
        Mitosis produces two genetically identical diploid daughter cells, whereas meiosis results in four genetically diverse haploid gametes.
        Ribosomes are responsible for protein synthesis by translating messenger RNA transcripts.
      `
    })
  });
  const bioNoteJson = await bioNoteRes.json();
  const bioNote = bioNoteJson.note || bioNoteJson;
  console.log(`Created Biology Note: id=${bioNote.id}, subject=${bioNote.subject}`);

  const csNoteRes = await fetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'CS 301: Advanced Data Structures & Graph Algorithms',
      subject: 'Computer Science',
      topic: 'Data Structures',
      description: 'Lectures on binary search trees, hash tables, Dijkstra algorithm, and time complexity.',
      fileType: 'pdf',
      semester: 'Fall 2026',
      extractedText: `
        Computer Science and Algorithms Principles.
        A Hash Table provides average O(1) constant time complexity for insert, search, and delete operations via hash functions.
        Binary Search Trees maintain the invariant that left subtree keys are strictly less than the root key and right subtree keys are greater.
        Dijkstra's algorithm finds the single-source shortest path in weighted graphs with non-negative edge weights using a priority queue.
        A stack is a Last-In First-Out (LIFO) abstract data type commonly utilized for call stack management and depth-first search traversal.
        A queue is a First-In First-Out (FIFO) data structure utilized for breadth-first graph traversal and task scheduling.
        QuickSort achieves an average case time complexity of O(N log N) using a divide-and-conquer partitioning approach.
      `
    })
  });
  const csNoteJson = await csNoteRes.json();
  const csNote = csNoteJson.note || csNoteJson;
  console.log(`Created CS Note: id=${csNote.id}, subject=${csNote.subject}\n`);

  // Step 3: Test Quiz Creation for Biology
  console.log('[Step 3] Creating Quiz Session for BIOLOGY...');
  const bioQuizRes = await fetch(`${API_BASE}/quiz/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      noteId: bioNote.id,
      subject: 'Biology',
      topic: 'Cell Biology',
      count: 10,
      difficulty: 'medium'
    })
  });
  const bioQuizData = await bioQuizRes.json();
  console.log(`Quiz Session created: quizId=${bioQuizData.quizId}`);
  console.log(`Stored Subject: ${bioQuizData.subject}`);
  console.log(`Stored Topic: ${bioQuizData.topic}`);
  console.log(`Question Count: ${bioQuizData.questions?.length}`);

  // Validate Biology questions
  let bioContaminated = false;
  let bioMissingMetadata = false;

  bioQuizData.questions.forEach((q, idx) => {
    console.log(`  [Bio Q${idx + 1}] Subject: "${q.subject}" | Topic: "${q.topic}" | NoteId: "${q.noteId}" | Q: ${q.question.substring(0, 60)}...`);
    if (q.subject !== 'Biology') {
      console.error(`  --> CONTAMINATION ERROR: Question subject is "${q.subject}", expected "Biology"!`);
      bioContaminated = true;
    }
    if (!q.id || !q.userId || !q.noteId || !q.subject || !q.options || !q.correctAnswer) {
      console.error(`  --> METADATA ERROR: Question missing required metadata fields:`, q);
      bioMissingMetadata = true;
    }
  });

  // Step 4: Test Quiz Creation for Computer Science
  console.log('\n[Step 4] Creating Quiz Session for COMPUTER SCIENCE...');
  const csQuizRes = await fetch(`${API_BASE}/quiz/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      noteId: csNote.id,
      subject: 'Computer Science',
      topic: 'Data Structures',
      count: 10,
      difficulty: 'medium'
    })
  });
  const csQuizData = await csQuizRes.json();
  console.log(`Quiz Session created: quizId=${csQuizData.quizId}`);
  console.log(`Stored Subject: ${csQuizData.subject}`);
  console.log(`Stored Topic: ${csQuizData.topic}`);
  console.log(`Question Count: ${csQuizData.questions?.length}`);

  let csContaminated = false;
  let csMissingMetadata = false;

  csQuizData.questions.forEach((q, idx) => {
    console.log(`  [CS Q${idx + 1}] Subject: "${q.subject}" | Topic: "${q.topic}" | NoteId: "${q.noteId}" | Q: ${q.question.substring(0, 60)}...`);
    if (q.subject !== 'Computer Science') {
      console.error(`  --> CONTAMINATION ERROR: Question subject is "${q.subject}", expected "Computer Science"!`);
      csContaminated = true;
    }
    if (!q.id || !q.userId || !q.noteId || !q.subject || !q.options || !q.correctAnswer) {
      console.error(`  --> METADATA ERROR: Question missing required metadata fields:`, q);
      csMissingMetadata = true;
    }
  });

  // Step 5: Test Quiz Session Persistence & Retrieval
  console.log('\n[Step 5] Testing Quiz Session Retrieval from Database...');
  const getBioQuizRes = await fetch(`${API_BASE}/quiz/session/${bioQuizData.quizId}`, { headers });
  const retrievedBioQuiz = await getBioQuizRes.json();
  const sessionPersisted = retrievedBioQuiz.quizId === bioQuizData.quizId && 
                           retrievedBioQuiz.subject === 'Biology' &&
                           retrievedBioQuiz.questions.length === bioQuizData.questions.length;
  console.log(`Retrieved Session verified: ${sessionPersisted ? 'SUCCESS' : 'FAILED'}`);

  // Step 6: Test Rapid Subject Switching (Biology -> CS -> Biology)
  console.log('\n[Step 6] Testing Rapid Subject Switching...');
  const switch1 = await (await fetch(`${API_BASE}/quiz/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ noteId: bioNote.id, subject: 'Biology', count: 5 })
  })).json();
  const switch2 = await (await fetch(`${API_BASE}/quiz/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ noteId: csNote.id, subject: 'Computer Science', count: 5 })
  })).json();
  const switch3 = await (await fetch(`${API_BASE}/quiz/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ noteId: bioNote.id, subject: 'Biology', count: 5 })
  })).json();

  const switch1Ok = switch1.questions.every(q => q.subject === 'Biology');
  const switch2Ok = switch2.questions.every(q => q.subject === 'Computer Science');
  const switch3Ok = switch3.questions.every(q => q.subject === 'Biology');
  console.log(`Switch 1 (Biology): ${switch1Ok ? '100% Biology' : 'FAILED'}`);
  console.log(`Switch 2 (Computer Science): ${switch2Ok ? '100% Computer Science' : 'FAILED'}`);
  console.log(`Switch 3 (Biology): ${switch3Ok ? '100% Biology' : 'FAILED'}`);

  // Step 7: Test Multi-Topic Quiz within same subject (Requirement 6)
  console.log('\n[Step 7] Testing Multi-Topic Quiz within same subject (Requirement 6)...');
  const multiTopicRes = await fetch(`${API_BASE}/quiz/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      noteId: bioNote.id,
      subject: 'Biology',
      topic: 'Cell Biology, Genetics',
      count: 6
    })
  });
  const multiTopicData = await multiTopicRes.json();
  const multiTopicSubjectOk = multiTopicData.questions.every(q => q.subject === 'Biology');
  console.log(`Multi-topic Subject isolation (All questions Biology): ${multiTopicSubjectOk ? 'PASS' : 'FAIL'}`);

  // Step 8: Verify no silent fill from other subjects (Requirement 10)
  console.log('\n[Step 8] Testing no silent cross-contamination on count limit...');
  const partialRes = await fetch(`${API_BASE}/quiz/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      noteId: csNote.id,
      subject: 'Computer Science',
      count: 12
    })
  });
  const partialData = await partialRes.json();
  const zeroBioInCS = partialData.questions.every(q => q.subject === 'Computer Science');
  console.log(`All returned questions are strictly Computer Science: ${zeroBioInCS ? 'PASS' : 'FAIL'}`);

  console.log('\n====================================================');
  console.log('SUMMARY OF RESULTS:');
  console.log(`- Quiz Subject Isolation: ${(!bioContaminated && !csContaminated && switch1Ok && switch2Ok && switch3Ok && multiTopicSubjectOk && zeroBioInCS) ? 'PASS' : 'FAIL'}`);
  console.log(`- Question Metadata: ${(!bioMissingMetadata && !csMissingMetadata) ? 'PASS' : 'FAIL'}`);
  console.log(`- Quiz Session Persistence: ${sessionPersisted ? 'PASS' : 'FAIL'}`);
  console.log(`- Cross-subject contamination: ${(!bioContaminated && !csContaminated && zeroBioInCS) ? 'PASS (0% Contamination)' : 'FAIL'}`);
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
