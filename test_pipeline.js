// ============================================================================
// StudyBuddy Content Pipeline Verification Script (test_pipeline.js)
// Tests the full educational content generation pipeline on the live server
// with the real Cloud Computing note.
// ============================================================================

async function runAcceptanceTest() {
  console.log('🚀 Starting StudyBuddy Content Pipeline Verification...');
  const API_URL = 'http://localhost:5000/api';

  // 1. Login
  console.log('\n[1] Authenticating user...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@studybuddy.ai', password: 'Password123!' })
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginData.error}`);
  }
  const token = loginData.token;
  console.log('✅ Authenticated as:', loginData.user.name, `(${loginData.user.email})`);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. Fetch Notes
  console.log('\n[2] Fetching user notes...');
  const notesRes = await fetch(`${API_URL}/notes`, { headers });
  const notesData = await notesRes.json();
  console.log(`✅ Total notes found: ${notesData.notes.length}`);

  const ccNote = notesData.notes.find(n =>
    n.title.toLowerCase().includes('cloud') || n.extractedText?.includes('Cloud')
  );
  if (!ccNote) {
    throw new Error('Could not find Cloud Computing note in user notes.');
  }
  console.log(`✅ Found Cloud Computing note: "${ccNote.title}" (ID: ${ccNote.id}, size: ${ccNote.extractedText.length} chars)`);

  // 3. Process Note through New AI Pipeline
  console.log('\n[3] Triggering /api/ai/process-note on Cloud Computing note...');
  const processStart = Date.now();
  const processRes = await fetch(`${API_URL}/ai/process-note`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ noteId: ccNote.id })
  });
  const processData = await processRes.json();
  if (!processRes.ok) {
    throw new Error(`AI processing failed: ${processData.error}`);
  }
  console.log(`✅ AI Study Pack generated in ${Date.now() - processStart}ms`);
  const aiPack = processData.aiPack;

  // 4. Verify Summary Quality
  console.log('\n[4] Verifying Summary Structure & Quality...');
  const summary = aiPack.summary;
  if (!summary.overview) throw new Error('Summary missing overview');
  if (!summary.keyConcepts || summary.keyConcepts.length === 0) throw new Error('Summary missing keyConcepts');
  if (!summary.definitions || summary.definitions.length === 0) throw new Error('Summary missing definitions');
  if (!summary.comparisons || summary.comparisons.length === 0) throw new Error('Summary missing comparisons');

  const summaryText = JSON.stringify(summary);
  const badPatterns = ['MALLA REDDY', 'Maisammaguda', 'Secunderabad', 'Telangana', 'R18A0523', 'B. TECH IV YEAR'];
  for (const bp of badPatterns) {
    if (summaryText.includes(bp)) {
      throw new Error(`Summary contaminated with boilerplate: "${bp}"`);
    }
  }
  console.log('✅ Summary verified:');
  console.log('   - Title:', summary.title);
  console.log('   - Overview:', summary.overview.slice(0, 120) + '...');
  console.log('   - Key Concepts count:', summary.keyConcepts.length);
  console.log('   - Definitions count:', summary.definitions.length);
  console.log('   - Comparisons count:', summary.comparisons.length);
  console.log('   - Boilerplate count: 0 (100% clean)');

  // 5. Verify MCQs Quality
  console.log('\n[5] Verifying MCQ Questions...');
  const mcqs = aiPack.mcqs;
  if (!Array.isArray(mcqs) || mcqs.length < 5) {
    throw new Error(`Expected at least 5 MCQs, got ${mcqs?.length}`);
  }

  mcqs.forEach((q, idx) => {
    if (q.question.includes('Based on the uploaded study material')) {
      throw new Error(`MCQ ${idx + 1} uses forbidden generic template.`);
    }
    if (q.options.length !== 4) {
      throw new Error(`MCQ ${idx + 1} does not have exactly 4 options.`);
    }
    const optText = q.options.join(' ');
    for (const bp of badPatterns) {
      if (optText.includes(bp) || q.question.includes(bp)) {
        throw new Error(`MCQ ${idx + 1} contains boilerplate: "${bp}"`);
      }
    }
  });

  console.log(`✅ All ${mcqs.length} MCQs verified:`);
  mcqs.slice(0, 3).forEach((q, i) => {
    console.log(`   Q${i + 1} [${q.difficulty}] (${q.topic}): ${q.question}`);
    console.log(`      Correct: ${q.correctAnswer}`);
    console.log(`      Explanation: ${q.explanation.slice(0, 80)}...`);
  });

  // 6. Verify Flashcards
  console.log('\n[6] Verifying Flashcards...');
  const flashcards = aiPack.flashcards;
  if (!Array.isArray(flashcards) || flashcards.length < 5) {
    throw new Error(`Expected at least 5 flashcards, got ${flashcards?.length}`);
  }
  flashcards.forEach((fc, idx) => {
    if (fc.front.includes('significance of Cloud in this study material')) {
      throw new Error(`Flashcard ${idx + 1} uses forbidden generic template.`);
    }
    for (const bp of badPatterns) {
      if (fc.front.includes(bp) || fc.back.includes(bp)) {
        throw new Error(`Flashcard ${idx + 1} contains boilerplate: "${bp}"`);
      }
    }
  });
  console.log(`✅ All ${flashcards.length} Flashcards verified:`);
  console.log('   Sample 1 Front:', flashcards[0].front, '--> Back:', flashcards[0].back);
  console.log('   Sample 2 Front:', flashcards[1].front, '--> Back:', flashcards[1].back);

  // 7. Verify Focused Topic Study Endpoint
  console.log('\n[7] Testing /api/ai/topic-study endpoint for focused study...');
  const topicRes = await fetch(`${API_URL}/ai/topic-study`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ noteId: ccNote.id, topic: 'Service Models' })
  });
  const topicData = await topicRes.json();
  if (!topicRes.ok) throw new Error(`Topic study failed: ${topicData.error}`);
  console.log(`✅ Topic Study Pack for "${topicData.topic}" generated:`);
  console.log('   - MCQs count:', topicData.mcqs.length);
  console.log('   - Flashcards count:', topicData.flashcards.length);

  // 8. Verify Quiz Submission & Mistake Persistence
  console.log('\n[8] Submitting Quiz Attempt with 1 simulated wrong answer...');
  const quizPayload = {
    noteId: ccNote.id,
    subject: ccNote.subject,
    topic: 'Cloud Fundamentals',
    totalQuestions: 5,
    correctCount: 4,
    wrongCount: 1,
    timeTakenSeconds: 45,
    answers: [
      {
        question: mcqs[0].question,
        topic: mcqs[0].topic,
        studentAnswer: mcqs[0].correctAnswer,
        correctAnswer: mcqs[0].correctAnswer,
        isCorrect: true,
        explanation: mcqs[0].explanation
      },
      {
        question: mcqs[1].question,
        topic: mcqs[1].topic,
        studentAnswer: 'Wrong Distractor Option',
        correctAnswer: mcqs[1].correctAnswer,
        isCorrect: false,
        explanation: mcqs[1].explanation
      }
    ]
  };

  const submitRes = await fetch(`${API_URL}/quiz/submit`, {
    method: 'POST',
    headers,
    body: JSON.stringify(quizPayload)
  });
  const submitData = await submitRes.json();
  if (!submitRes.ok) throw new Error(`Quiz submission failed: ${submitData.error}`);
  console.log('✅ Quiz submitted. Recorded attempt ID:', submitData.attempt.id);

  // Verify Mistakes Notebook
  const mistakesRes = await fetch(`${API_URL}/mistakes`, { headers });
  const mistakesData = await mistakesRes.json();
  const loggedMistake = mistakesData.mistakes.find(m => m.question === mcqs[1].question);
  if (!loggedMistake) {
    throw new Error('Mistake was not logged in Mistake Notebook!');
  }
  console.log('✅ Mistake successfully verified in Mistake Notebook:');
  console.log('   - Question:', loggedMistake.question);
  console.log('   - Student Answer:', loggedMistake.studentAnswer);
  console.log('   - Correct Answer:', loggedMistake.correctAnswer);

  // 9. Verify Grounded Ask AI Chat Tutor
  console.log('\n[9] Testing Ask AI Grounded Tutor Chat...');
  const chatRes = await fetch(`${API_URL}/ai/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ noteId: ccNote.id, question: 'Explain IaaS in simple words.' })
  });
  const chatData = await chatRes.json();
  if (!chatRes.ok) throw new Error(`Ask AI failed: ${chatData.error}`);
  console.log('✅ Ask AI responded:');
  console.log('   Answer:', chatData.answer);

  console.log('\n======================================================');
  console.log('🎉 ALL ACCEPTANCE CRITERIA VERIFIED 100% SUCCESSFULLY!');
  console.log('======================================================');
}

runAcceptanceTest().catch(err => {
  console.error('\n❌ ACCEPTANCE TEST FAILED:', err.message);
  process.exit(1);
});
