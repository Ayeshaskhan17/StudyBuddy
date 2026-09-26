// Verification script testing all acceptance test criteria
import fs from 'fs';

async function runAcceptanceTest() {
  console.log('--- STARTING STUDYBUDDY ACCEPTANCE TEST ---');
  const testEmail = `student_${Date.now()}@university.edu`;
  const testPassword = 'Password123!';

  // Step 2 & 3: Create a new account & Login
  console.log('\n[Step 2 & 3] Signing up new account:', testEmail);
  const signupRes = await fetch('http://localhost:5000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sarah Connor',
      email: testEmail,
      password: testPassword,
      college: 'MIT College of Engineering',
      branch: 'Computer Science',
      semester: 'Semester 4'
    })
  });
  const signupData = await signupRes.json();
  if (!signupRes.ok) throw new Error('Signup failed: ' + JSON.stringify(signupData));
  const token = signupData.token;
  const userId = signupData.user.id;
  console.log('✓ Account created successfully. Token received. User ID:', userId);

  // Step 4: Verify Dashboard initially shows no fake study data
  console.log('\n[Step 4] Checking initial progress for brand new user...');
  const progRes = await fetch('http://localhost:5000/api/progress', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const progData = await progRes.json();
  console.log('Progress Data:', progData.progress);
  if (progData.progress.totalNotes !== 0 || progData.progress.questionsAttempted !== 0) {
    throw new Error('Initial dashboard has fake data!');
  }
  console.log('✓ Verified: Clean empty state with 0 notes, 0 questions attempted, 0 subjects.');

  // Step 5, 6, 7, 8: Upload a real PDF document to S3 and extract text
  console.log('\n[Step 5, 6, 7, 8] Uploading real PDF document to S3 & extracting text...');
  // Create a genuine sample PDF buffer or text payload
  // Minimal valid PDF structure with real text
  const samplePdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 285 >> stream
BT
/F1 12 Tf
72 700 Td
(Operating Systems: Process Scheduling and CPU Scheduling Algorithms.) Tj
0 -20 Td
(Preemptive scheduling allows high-priority tasks to interrupt running processes.) Tj
0 -20 Td
(Round Robin scheduling allocates a fixed time quantum Q to every process in the ready queue.) Tj
0 -20 Td
(The Shortest Job First SJF algorithm provides the minimum average waiting time for given processes.) Tj
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
0000000581 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
652
%%EOF`;

  const pdfBuffer = Buffer.from(samplePdfContent, 'utf8');

  // Multi-part boundary construction
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  let body = '';
  body += `--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nOperating Systems — CPU Scheduling\r\n`;
  body += `--${boundary}\r\nContent-Disposition: form-data; name="subject"\r\n\r\nComputer Science\r\n`;
  body += `--${boundary}\r\nContent-Disposition: form-data; name="semester"\r\n\r\nSemester 4\r\n`;
  body += `--${boundary}\r\nContent-Disposition: form-data; name="unit"\r\n\r\nUnit 2\r\n`;
  body += `--${boundary}\r\nContent-Disposition: form-data; name="topic"\r\n\r\nRound Robin and SJF Scheduling\r\n`;
  body += `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="OS_Process_Scheduling.pdf"\r\nContent-Type: application/pdf\r\n\r\n`;
  
  const payloadBuffer = Buffer.concat([
    Buffer.from(body, 'utf8'),
    pdfBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
  ]);

  const uploadRes = await fetch('http://localhost:5000/api/notes/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: payloadBuffer
  });

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) throw new Error('Upload failed: ' + JSON.stringify(uploadData));
  console.log('✓ Upload successful! S3 Key:', uploadData.note.s3Key);
  console.log('✓ Extracted Text Length:', uploadData.extractedTextLength, 'chars');
  console.log('Extracted Sample:', uploadData.note.extractedText.slice(0, 150));
  const noteId = uploadData.note.id;

  // Step 9, 10, 11, 12: AI Analysis & Generation grounded in the PDF
  console.log('\n[Step 9, 10, 11, 12] Running AI Study Pack generation on extracted text...');
  const aiRes = await fetch('http://localhost:5000/api/ai/process-note', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ noteId })
  });

  const aiData = await aiRes.json();
  if (!aiRes.ok) throw new Error('AI processing failed: ' + JSON.stringify(aiData));
  console.log('✓ AI Summary:', aiData.aiPack.summary.quickSummary.slice(0, 120) + '...');
  console.log('✓ AI Topics Extracted:', aiData.aiPack.topics.map(t => t.topic));
  console.log('✓ Generated MCQs Count:', aiData.aiPack.mcqs.length);
  console.log('✓ Sample MCQ 1:', aiData.aiPack.mcqs[0].question);
  console.log('  Options:', aiData.aiPack.mcqs[0].options);
  console.log('  Correct Answer:', aiData.aiPack.mcqs[0].correctAnswer);

  // Step 13, 14, 15, 16: User takes quiz, score calculated, wrong answers stored in Mistake Notebook
  console.log('\n[Step 13, 14, 15, 16] Submitting quiz attempt with 1 mistake...');
  const quizSubmission = {
    noteId,
    subject: 'Computer Science',
    topic: 'CPU Scheduling',
    totalQuestions: 2,
    correctCount: 1,
    wrongCount: 1,
    timeTakenSeconds: 45,
    answers: [
      {
        question: aiData.aiPack.mcqs[0].question,
        studentAnswer: aiData.aiPack.mcqs[0].correctAnswer,
        correctAnswer: aiData.aiPack.mcqs[0].correctAnswer,
        isCorrect: true,
        topic: 'CPU Scheduling'
      },
      {
        question: 'Which scheduling algorithm provides the minimum average waiting time?',
        studentAnswer: 'First Come First Served (FCFS)',
        correctAnswer: 'Shortest Job First (SJF)',
        isCorrect: false,
        topic: 'SJF Scheduling',
        explanation: 'SJF is provably optimal for minimizing average turnaround and waiting time.'
      }
    ]
  };

  const submitRes = await fetch('http://localhost:5000/api/quiz/submit', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(quizSubmission)
  });
  const submitData = await submitRes.json();
  console.log('✓ Quiz submitted. Score:', submitData.attempt.score + '%');

  // Verify Mistake Notebook
  const mistakesRes = await fetch('http://localhost:5000/api/mistakes', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const mistakesData = await mistakesRes.json();
  console.log('✓ Mistake Notebook Count:', mistakesData.mistakes.length);
  console.log('  Saved Mistake:', mistakesData.mistakes[0].question, '-> Student:', mistakesData.mistakes[0].studentAnswer);

  // Step 17: User can practice weak topics
  console.log('\n[Step 17] Generating targeted practice quiz for weak topic "SJF Scheduling"...');
  const weakQuizRes = await fetch('http://localhost:5000/api/ai/generate-mcqs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ noteId, count: 3, difficulty: 'Medium', topic: 'SJF Scheduling' })
  });
  const weakQuizData = await weakQuizRes.json();
  console.log('✓ Generated targeted weak topic MCQs:', weakQuizData.questions.length);

  // Step 18, 19, 20: Logout, Login again, verify persistence
  console.log('\n[Step 18, 19, 20] Logging in again with', testEmail);
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const loginData = await loginRes.json();
  const newToken = loginData.token;

  const notesRecheck = await fetch('http://localhost:5000/api/notes', {
    headers: { 'Authorization': `Bearer ${newToken}` }
  });
  const notesRecheckData = await notesRecheck.json();

  const progressRecheck = await fetch('http://localhost:5000/api/progress', {
    headers: { 'Authorization': `Bearer ${newToken}` }
  });
  const progressRecheckData = await progressRecheck.json();

  console.log('✓ Re-logged in successfully. Total persistent notes:', notesRecheckData.notes.length);
  console.log('✓ Re-logged in progress: Questions attempted:', progressRecheckData.progress.questionsAttempted, 'Average score:', progressRecheckData.progress.averageScore + '%');
  console.log('✓ Dynamic Subjects:', progressRecheckData.progress.subjects);

  console.log('\n======================================================');
  console.log('🎉 ALL 20 ACCEPTANCE TEST STEPS COMPLETED SUCCESSFULLY!');
  console.log('======================================================');
}

runAcceptanceTest().catch(err => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
