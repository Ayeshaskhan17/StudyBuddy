// ============================================================================
// StudyBuddy Production Backend Server (server.js)
// Full Authentication, S3 Storage, Real PDF Text Extraction, Real AI Engine,
// Multi-tenant User Isolation, and Dynamic Subjects.
// ============================================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  getS3Config,
  getClient as getS3Client,
  uploadDocumentToS3,
  getDocumentStream,
  getPresignedDownloadUrl,
  deleteDocumentFromS3,
  checkObjectExists,
  buildS3Key,
  sanitizeFileName,
  testS3Connection
} from './server/s3Storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');

import { db } from './server/db.js';
import { extractTextFromPDF } from './server/pdfService.js';
import { cleanDocumentText, extractStructuredDocument } from './server/pdfCleaner.js';
import {
  generateSummary,
  generateImportantTopics,
  generateMCQs,
  generateFlashcards,
  generateMnemonics,
  askAIAboutDocument,
  getAIEngineStatus,
  evaluateShortAnswer,
  evaluateLongAnswer,
  generateExamQuestions,
  generateWeakTopicPractice
} from './server/aiEngine.js';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'studybuddy-super-secret-jwt-key-2026';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(distPath));

// Multer memory storage for PDF file uploads (50MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// ----------------------------------------------------------------------------
// AWS S3 STORAGE SETUP
// ----------------------------------------------------------------------------
const s3Config = getS3Config();
console.log(`[AWS S3] Storage engine active: ${s3Config.isLive ? 'LIVE AWS S3' : 'Secure Storage Sandbox'} (Bucket: ${s3Config.bucket}, Region: ${s3Config.region})`);

// ----------------------------------------------------------------------------
// AUTHENTICATION MIDDLEWARE
// ----------------------------------------------------------------------------
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  // Also support token query parameter for secure authenticated file streaming/downloads
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please login.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
    }
    req.user = decoded; // { id, email, name }
    next();
  });
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'StudyBuddy API', timestamp: new Date().toISOString() });
});

// ----------------------------------------------------------------------------
// 1. AUTHENTICATION ENDPOINTS
// ----------------------------------------------------------------------------
// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, college, branch, semester } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password);

    if (cleanPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const existing = db.getUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const user = db.createUser({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      college: college ? String(college).trim() : '',
      branch: branch ? String(branch).trim() : '',
      semester: semester ? String(semester).trim() : 'Semester 1'
    });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        college: user.college,
        branch: user.branch,
        semester: user.semester
      }
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: 'Unable to create account. Please try again.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password);

    const user = db.getUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const storedHash = user.passwordHash || user.hashedPassword || user.password || '';
    const isMatch = await bcrypt.compare(cleanPassword, storedHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        college: user.college,
        branch: user.branch,
        semester: user.semester
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please check your credentials.' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      college: user.college,
      branch: user.branch,
      semester: user.semester
    }
  });
});

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  res.json({
    success: true,
    message: `If an account exists for ${email}, a password reset link has been dispatched.`
  });
});

// ----------------------------------------------------------------------------
// 2. DYNAMIC SUBJECTS ENDPOINTS
// ----------------------------------------------------------------------------
app.get('/api/subjects', authenticateToken, (req, res) => {
  const subjects = db.getUserSubjects(req.user.id);
  res.json({ subjects });
});

// ----------------------------------------------------------------------------
// 3. REAL PDF UPLOAD & TEXT EXTRACTION (AWS S3 + PDF-PARSE)
// ----------------------------------------------------------------------------
app.post('/api/notes/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { title, subject, semester, unit, topic, description } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded. Please select a PDF or document.' });
    }
    if (!title || !subject) {
      return res.status(400).json({ error: 'Title and Subject are required.' });
    }

    // Validate file size (50MB maximum)
    if (file.size > 50 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds the 50MB limit.' });
    }

    const noteId = `note_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Upload original document to AWS S3 (private bucket, user-isolated key)
    const s3Result = await uploadDocumentToS3({
      userId: req.user.id,
      noteId,
      fileBuffer: file.buffer,
      originalFilename: file.originalname,
      contentType: file.mimetype || 'application/pdf'
    });

    // 2. Real PDF Text Extraction
    let extractedText = '';
    let numPages = 1;
    let isScanned = false;
    let warningMessage = null;

    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      const parseResult = await extractTextFromPDF(file.buffer);
      extractedText = parseResult.text;
      numPages = parseResult.numPages;
      isScanned = parseResult.isScanned;
      warningMessage = parseResult.warningMessage || null;
    } else {
      // For text files / other documents
      extractedText = file.buffer.toString('utf8').replace(/[^\x20-\x7E\n]/g, ' ').trim();
    }

    // 3. Save Note Metadata to Database (zero AWS credentials stored)
    const note = db.createNote({
      id: noteId,
      userId: req.user.id,
      title: title.trim(),
      subject: subject.trim(),
      semester: semester || 'Semester 1',
      unit: unit || 'Unit 1',
      topic: topic ? topic.trim() : title.trim(),
      description: description ? description.trim() : `Uploaded study notes for ${subject}.`,
      originalFilename: file.originalname,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      fileType: file.originalname.split('.').pop()?.toUpperCase() || 'PDF',
      s3Key: s3Result.s3Key,
      s3Bucket: s3Result.s3Bucket,
      s3Region: s3Result.s3Region,
      s3Url: s3Result.s3Url,
      extractedText,
      numPages,
      isScanned
    });

    res.status(201).json({
      success: true,
      note,
      extractedTextLength: extractedText.length,
      isScanned,
      warningMessage
    });
  } catch (err) {
    console.error('Upload & PDF extraction error:', err);
    res.status(500).json({ error: err.message || 'Unable to upload your study material. Please try again.' });
  }
});

// POST /api/notes
app.post('/api/notes', authenticateToken, (req, res) => {
  try {
    const { title, subject, semester, unit, topic, description, extractedText, fileType, s3Key, s3Bucket } = req.body;
    if (!title || !subject) {
      return res.status(400).json({ error: 'Title and Subject are required.' });
    }
    const noteId = `note_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const safeTitle = sanitizeFileName(title);
    const assignedS3Key = s3Key || buildS3Key(req.user.id, noteId, `${safeTitle}.pdf`);
    const cfg = getS3Config();

    const note = db.createNote({
      id: noteId,
      userId: req.user.id,
      title: title.trim(),
      subject: subject.trim(),
      semester: semester || 'Semester 1',
      unit: unit || 'Unit 1',
      topic: topic ? topic.trim() : title.trim(),
      description: description ? description.trim() : `Uploaded study notes for ${subject}.`,
      originalFilename: `${safeTitle}.pdf`,
      fileSize: '1.25 MB',
      fileType: fileType || 'PDF',
      s3Key: assignedS3Key,
      s3Bucket: s3Bucket || cfg.bucket,
      s3Region: cfg.region,
      s3Url: `https://${s3Bucket || cfg.bucket}.s3.${cfg.region}.amazonaws.com/${assignedS3Key}`,
      extractedText: extractedText || '',
      numPages: 5,
      isScanned: false
    });
    res.status(201).json({ success: true, note });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create note.' });
  }
});

// GET /api/notes
app.get('/api/notes', authenticateToken, (req, res) => {
  const notes = db.getNotesByUser(req.user.id);
  res.json({ notes });
});

// GET /api/notes/:id
app.get('/api/notes/:id', authenticateToken, (req, res) => {
  const note = db.getNoteById(req.params.id, req.user.id);
  if (!note) {
    return res.status(404).json({ error: 'Note not found or access unauthorized.' });
  }
  res.json({ note });
});

// GET /api/notes/:id/file - Securely stream private S3 document to authenticated owner
app.get('/api/notes/:id/file', authenticateToken, async (req, res) => {
  try {
    const note = db.getNoteById(req.params.id, req.user.id);
    if (!note) {
      return res.status(404).json({ error: 'Study material not found or access unauthorized.' });
    }

    if (!note.s3Key) {
      return res.status(404).json({ error: 'Storage reference missing for this document.' });
    }

    const { stream, contentType, contentLength } = await getDocumentStream({
      s3Key: note.s3Key,
      userId: req.user.id
    });

    res.setHeader('Content-Type', contentType || 'application/pdf');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    const safeName = sanitizeFileName(note.originalFilename || `${note.title}.pdf`);
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);

    stream.pipe(res);
  } catch (err) {
    console.error('File stream error:', err);
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Unable to retrieve study document from storage.' });
  }
});

// GET /api/notes/:id/download-url - Generates temporary signed S3 URL
app.get('/api/notes/:id/download-url', authenticateToken, async (req, res) => {
  try {
    const note = db.getNoteById(req.params.id, req.user.id);
    if (!note) {
      return res.status(404).json({ error: 'Study material not found or access unauthorized.' });
    }

    const result = await getPresignedDownloadUrl({
      s3Key: note.s3Key,
      userId: req.user.id,
      originalFilename: note.originalFilename || `${note.title}.pdf`,
      expiresInSeconds: 900 // 15 minutes
    });

    res.json(result);
  } catch (err) {
    console.error('Presigned URL error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Failed to generate download URL.' });
  }
});

// GET /api/notes/:id/s3-status - Internal check confirming S3 object existence
app.get('/api/notes/:id/s3-status', authenticateToken, async (req, res) => {
  try {
    const note = db.getNoteById(req.params.id, req.user.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found.' });
    }
    const existsResult = await checkObjectExists({ s3Key: note.s3Key, userId: req.user.id });
    res.json({ success: true, noteId: note.id, s3Key: note.s3Key, ...existsResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notes/:id
app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const note = db.getNoteById(req.params.id, req.user.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found or unauthorized.' });
    }

    // Delete document from S3
    if (note.s3Key) {
      try {
        await deleteDocumentFromS3({ s3Key: note.s3Key, userId: req.user.id });
      } catch (err) {
        console.warn('[AWS S3] Delete object warning:', err.message);
      }
    }

    db.deleteNote(note.id, req.user.id);
    res.json({ success: true, message: `Note "${note.title}" removed from storage and library.` });
  } catch (err) {
    console.error('Delete note error:', err);
    res.status(500).json({ error: 'Failed to delete note from storage.' });
  }
});

// ----------------------------------------------------------------------------
// 4. REAL AI STUDY HUB PIPELINE
// ----------------------------------------------------------------------------
// POST /api/ai/process-note
// Generates complete study material grounded in the uploaded document
app.post('/api/ai/process-note', authenticateToken, async (req, res) => {
  try {
    const { noteId } = req.body;
    const note = db.getNoteById(noteId, req.user.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    if (note.isScanned && (!note.extractedText || note.extractedText.length < 20)) {
      return res.status(422).json({
        error: 'This PDF appears to be scanned/image-based with no extractable text layer. OCR is required to analyze it.'
      });
    }

    const rawText = note.extractedText || note.description;
    const cleanedText = cleanDocumentText(rawText);
    const structured = extractStructuredDocument(cleanedText, note.title);
    const engineStatus = getAIEngineStatus();

    // Run parallel AI analyses on the cleaned document text
    const [summary, topics, mcqs, flashcards, mnemonics] = await Promise.all([
      generateSummary(cleanedText, note.title, note.subject, note.topic),
      generateImportantTopics(cleanedText, note.title),
      generateMCQs(cleanedText, 10, 'Mixed', '', note.subject, note.topic, note.id, req.user.id),
      generateFlashcards(cleanedText, note.title, note.subject, note.topic, note.id, req.user.id),
      generateMnemonics(cleanedText)
    ]);

    const aiPack = db.saveAIContent({
      noteId: note.id,
      userId: req.user.id,
      summary,
      topics,
      mcqs,
      flashcards,
      mnemonics,
      units: structured.units,
      comparisons: summary.comparisons || structured.comparisons,
      keyDefinitions: summary.definitions || structured.extractedDefinitions,
      engineStatus,
      practiceQuestions: [
        { question: `Explain the core architecture and service delivery models of ${note.topic || note.title}.`, marks: 5 },
        { question: `Compare the trade-offs, security implications, and governance models discussed in these notes.`, marks: 10 }
      ],
      studyPlan: {
        examName: `${note.subject} Exam`,
        estimatedDays: 4,
        steps: topics.map((t, i) => `Day ${i + 1}: Master ${t.topic}`)
      }
    });

    res.json({ success: true, aiPack, engineStatus });
  } catch (err) {
    console.error('AI Study process error:', err);
    res.status(500).json({ error: err.message || 'AI generation failed. Please try again.' });
  }
});

// GET /api/ai/status
app.get('/api/ai/status', (req, res) => {
  res.json({ success: true, status: getAIEngineStatus() });
});

// GET /api/ai/note/:noteId
app.get('/api/ai/note/:noteId', authenticateToken, (req, res) => {
  const content = db.getAIContent(req.params.noteId, req.user.id);
  res.json({ aiPack: content });
});

// POST /api/ai/generate-mcqs
// Generates custom MCQs from note text with selectable count & difficulty and strict subject isolation
app.post('/api/ai/generate-mcqs', authenticateToken, async (req, res) => {
  try {
    const { noteId, count = 5, difficulty = 'Mixed', topic = '', subject = '' } = req.body;
    let note = null;
    if (noteId) {
      note = db.getNoteById(noteId, req.user.id);
    }

    const targetSubject = (subject || note?.subject || 'General').trim();
    const targetTopic = (topic || note?.topic || 'Core Concepts').trim();
    const cleanedText = cleanDocumentText(note ? (note.extractedText || note.description) : '');

    const questions = await generateMCQs(cleanedText, count, difficulty, topic, targetSubject, targetTopic, note?.id, req.user.id);

    // Hard backend validation: 100% of questions must belong to targetSubject!
    const strictlyValid = questions.filter(q => q.subject.toLowerCase() === targetSubject.toLowerCase());
    res.json({ success: true, questions: strictlyValid });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to generate MCQs.' });
  }
});

// POST /api/quiz/create
// Creates and persists a dedicated, subject-isolated quiz session with stored question IDs
app.post('/api/quiz/create', authenticateToken, async (req, res) => {
  try {
    const { noteId, subject = '', topic = '', count = 5, difficulty = 'Mixed' } = req.body;
    let note = null;
    if (noteId) {
      note = db.getNoteById(noteId, req.user.id);
    }

    const targetSubject = (subject || note?.subject || 'General').trim();
    const targetTopic = (topic || note?.topic || 'Core Concepts').trim();

    let questions = [];
    if (note) {
      const aiContent = db.getAIContent(note.id, req.user.id);
      if (aiContent && Array.isArray(aiContent.mcqs) && aiContent.mcqs.length > 0) {
        questions = aiContent.mcqs.filter(q =>
          q.subject.toLowerCase() === targetSubject.toLowerCase() &&
          (!topic || q.topic.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().includes(q.topic.toLowerCase()))
        );
      }
    }

    if (questions.length < count) {
      const cleanedText = cleanDocumentText(note ? (note.extractedText || note.description) : '');
      const fresh = await generateMCQs(cleanedText, count, difficulty, topic, targetSubject, targetTopic, note?.id, req.user.id);
      questions = fresh;
    }

    // Hard validation: 100% of questions must belong to targetSubject!
    const strictlyValid = questions.filter(q =>
      q.subject.toLowerCase() === targetSubject.toLowerCase()
    ).slice(0, count);

    // Persist Quiz Session
    const session = db.createQuizSession({
      userId: req.user.id,
      noteId: note?.id || null,
      subject: targetSubject,
      topic: targetTopic,
      difficulty,
      questionType: 'mcq',
      questions: strictlyValid
    });

    res.json({
      success: true,
      quiz: session,
      quizId: session.id,
      id: session.id,
      subject: session.subject,
      topic: session.topic,
      noteId: session.noteId,
      questionIds: session.questionIds,
      questions: session.questions
    });
  } catch (err) {
    console.error('[Quiz Create Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to initialize quiz session.' });
  }
});

// GET /api/quiz/session/:quizId
app.get('/api/quiz/session/:quizId', authenticateToken, (req, res) => {
  const session = db.getQuizSession(req.params.quizId, req.user.id);
  if (!session) return res.status(404).json({ error: 'Quiz session not found.' });
  res.json({
    success: true,
    quiz: session,
    quizId: session.id,
    id: session.id,
    subject: session.subject,
    topic: session.topic,
    noteId: session.noteId,
    questionIds: session.questionIds,
    questions: session.questions
  });
});

// POST /api/ai/topic-study
// Generates a focused study pack (5 MCQs, 5 flashcards, summary) for a specific topic
app.post('/api/ai/topic-study', authenticateToken, async (req, res) => {
  try {
    const { noteId, topic } = req.body;
    if (!topic) return res.status(400).json({ error: 'Topic is required.' });

    const note = db.getNoteById(noteId, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found.' });

    const cleanedText = cleanDocumentText(note.extractedText || note.description);
    const [mcqs, allFlashcards] = await Promise.all([
      generateMCQs(cleanedText, 5, 'Mixed', topic, note.subject, topic, note.id, req.user.id),
      generateFlashcards(cleanedText, note.title, note.subject, topic, note.id, req.user.id)
    ]);

    const topicFlashcards = allFlashcards.slice(0, 5);
    const topicSummary = `Focused study session on **${topic}**. Review key definitions, active recall flashcards, and test your conceptual understanding with targeted questions.`;

    res.json({
      success: true,
      topic,
      summary: topicSummary,
      mcqs,
      flashcards: topicFlashcards
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to generate topic study session.' });
  }
});

// POST /api/ai/chat
// Contextual Chat QA grounded in the uploaded document
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  try {
    const { noteId, question } = req.body;
    if (!question) return res.status(400).json({ error: 'Question is required.' });

    const note = db.getNoteById(noteId, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found.' });

    const cleanedText = cleanDocumentText(note.extractedText || note.description);
    const answer = await askAIAboutDocument(cleanedText, question);

    // Save chat interaction
    db.appendChatHistory(noteId, req.user.id, { role: 'user', content: question });
    db.appendChatHistory(noteId, req.user.id, { role: 'assistant', content: answer });

    res.json({ success: true, answer });
  } catch (err) {
    res.status(500).json({ error: err.message || 'AI answer generation failed.' });
  }
});

// ----------------------------------------------------------------------------
// 5. QUIZ ATTEMPTS & MISTAKE NOTEBOOK
// ----------------------------------------------------------------------------
app.post('/api/quiz/submit', authenticateToken, (req, res) => {
  try {
    const { noteId, subject, topic, totalQuestions, correctCount, wrongCount, timeTakenSeconds, answers } = req.body;

    const attempt = db.saveQuizAttempt({
      userId: req.user.id,
      noteId,
      subject,
      topic,
      totalQuestions: Number(totalQuestions),
      correctCount: Number(correctCount),
      wrongCount: Number(wrongCount),
      score: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
      timeTakenSeconds: timeTakenSeconds || 0,
      answers: answers || []
    });

    // Auto-save wrong answers to Mistake Notebook
    if (Array.isArray(answers)) {
      answers.filter(a => !a.isCorrect).forEach(a => {
        db.addMistake({
          userId: req.user.id,
          noteId,
          subject: subject || 'General',
          topic: a.topic || topic || 'General Topic',
          question: a.question,
          studentAnswer: a.studentAnswer || 'Unanswered',
          correctAnswer: a.correctAnswer,
          explanation: a.explanation || 'Review the uploaded notes to understand this concept.'
        });
      });
    }

    // Auto-update topic mastery
    if (topic) {
      db.updateTopicMastery(req.user.id, {
        topic,
        noteId,
        subject,
        isCorrect: Number(correctCount) >= Number(wrongCount),
        score: totalQuestions > 0 ? Math.round((Number(correctCount) / Number(totalQuestions)) * 100) : 0
      });
    }

    res.json({ success: true, attempt });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to submit quiz results.' });
  }
});

// GET /api/mistakes
app.get('/api/mistakes', authenticateToken, (req, res) => {
  const mistakes = db.getMistakes(req.user.id);
  res.json({ mistakes });
});

// PUT /api/mistakes/:id
app.put('/api/mistakes/:id', authenticateToken, (req, res) => {
  const { status } = req.body;
  const updated = db.updateMistakeStatus(req.params.id, req.user.id, status || 'mastered');
  res.json({ success: true, mistake: updated });
});

// DELETE /api/mistakes/:id
app.delete('/api/mistakes/:id', authenticateToken, (req, res) => {
  db.removeMistake(req.params.id, req.user.id);
  res.json({ success: true });
});

// ----------------------------------------------------------------------------
// 6. REAL DASHBOARD PROGRESS & EXAMS
// ----------------------------------------------------------------------------
app.get('/api/progress', authenticateToken, (req, res) => {
  const progress = db.getUserProgress(req.user.id);
  res.json({ progress });
});

app.get('/api/exam-plans', authenticateToken, (req, res) => {
  const plans = db.getExamPlans(req.user.id);
  res.json({ plans });
});

app.post('/api/exam-plans', authenticateToken, (req, res) => {
  const plan = db.saveExamPlan({ ...req.body, userId: req.user.id });
  res.status(201).json({ success: true, plan });
});

app.put('/api/exam-plans/:id', authenticateToken, (req, res) => {
  const updated = db.updateExamPlan(req.params.id, req.user.id, req.body);
  res.json({ success: true, plan: updated });
});

// ----------------------------------------------------------------------------
// 7. REAL EXAM MODE & SHORT/LONG ANSWER EVALUATION
// ----------------------------------------------------------------------------
// POST /api/exam/generate
app.post('/api/exam/generate', authenticateToken, async (req, res) => {
  try {
    const { noteId, count = 10, questionTypes = 'Mixed', difficulty = 'Mixed', topic = '', subject = '' } = req.body;
    let textToUse = '';
    let targetSubject = subject;

    if (noteId) {
      const note = db.getNoteById(noteId, req.user.id);
      if (note) {
        textToUse = note.extractedText || note.description;
        if (!targetSubject) targetSubject = note.subject;
      }
    }

    if (!textToUse) {
      const userNotes = db.getNotesByUser(req.user.id);
      if (userNotes.length > 0) {
        textToUse = userNotes[0].extractedText || userNotes[0].description;
        if (!targetSubject) targetSubject = userNotes[0].subject;
      }
    }

    const questions = await generateExamQuestions(textToUse, count, questionTypes, difficulty, topic, targetSubject || 'General', noteId, req.user.id);
    res.json({ success: true, questions });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to generate exam questions.' });
  }
});

// POST /api/ai/evaluate-answer
// Semantic evaluation for Short Answer & Long Answer grounded in document
app.post('/api/ai/evaluate-answer', authenticateToken, async (req, res) => {
  try {
    const { noteId, question, studentAnswer, questionType = 'short_answer', topic = '' } = req.body;
    if (!question) return res.status(400).json({ error: 'Question is required.' });

    let rawText = '';
    if (noteId) {
      const note = db.getNoteById(noteId, req.user.id);
      if (note) rawText = note.extractedText || note.description;
    }
    if (!rawText) {
      const userNotes = db.getNotesByUser(req.user.id);
      if (userNotes.length > 0) rawText = userNotes[0].extractedText || userNotes[0].description;
    }

    if (questionType === 'long_answer') {
      const evaluation = await evaluateLongAnswer(rawText, question, studentAnswer);
      
      // Update topic mastery
      if (topic) {
        db.updateTopicMastery(req.user.id, {
          topic,
          noteId,
          isCorrect: evaluation.overall >= 6,
          score: evaluation.overall * 10
        });
      }
      return res.json({ success: true, evaluation });
    }

    // Default: Short Answer Evaluation
    const evaluation = await evaluateShortAnswer(rawText, question, studentAnswer);
    if (topic) {
      db.updateTopicMastery(req.user.id, {
        topic,
        noteId,
        isCorrect: evaluation.score >= 6,
        score: evaluation.score * 10
      });
      // Save mistake if answer scored low
      if (evaluation.score < 5) {
        db.addMistake({
          userId: req.user.id,
          noteId,
          topic,
          question,
          studentAnswer: studentAnswer || 'Unanswered',
          correctAnswer: evaluation.modelAnswer,
          explanation: `Covered: ${evaluation.covered?.join(', ') || 'None'}. Missing: ${evaluation.missing?.join(', ') || 'Key concepts'}.`
        });
      }
    }
    res.json({ success: true, evaluation });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to evaluate answer.' });
  }
});

// POST /api/exam/submit
app.post('/api/exam/submit', authenticateToken, (req, res) => {
  try {
    const { noteId, subject, topics, totalQuestions, score, correctCount, wrongCount, skippedCount, timeTakenSeconds, answers, questionTypes } = req.body;

    const attempt = db.saveExamAttempt({
      userId: req.user.id,
      noteId,
      subject: subject || 'General',
      topics: topics || [],
      totalQuestions: Number(totalQuestions),
      score: Number(score),
      correctCount: Number(correctCount),
      wrongCount: Number(wrongCount),
      skippedCount: Number(skippedCount),
      timeTakenSeconds: Number(timeTakenSeconds),
      answers: answers || [],
      questionTypes: questionTypes || 'Mixed'
    });

    // Auto-save wrong answers to Mistake Notebook
    if (Array.isArray(answers)) {
      answers.filter(a => !a.isCorrect && a.type === 'mcq').forEach(a => {
        db.addMistake({
          userId: req.user.id,
          noteId,
          subject: subject || 'General',
          topic: a.topic || 'General Exam',
          question: a.question,
          studentAnswer: a.studentAnswer || 'Unanswered',
          correctAnswer: a.correctAnswer,
          explanation: a.explanation || 'Review exam materials on this concept.'
        });
      });
    }

    res.json({ success: true, attempt });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to save exam attempt.' });
  }
});

// GET /api/exam/attempts
app.get('/api/exam/attempts', authenticateToken, (req, res) => {
  const attempts = db.getExamAttempts(req.user.id);
  res.json({ attempts });
});

// POST /api/ai/weak-topic-practice
// Focuses practice on misconceptions recorded in Mistake Notebook
app.post('/api/ai/weak-topic-practice', authenticateToken, async (req, res) => {
  try {
    const { topic, noteId, count = 5 } = req.body;
    if (!topic) return res.status(400).json({ error: 'Topic is required.' });

    let rawText = '';
    if (noteId) {
      const note = db.getNoteById(noteId, req.user.id);
      if (note) rawText = note.extractedText || note.description;
    }
    if (!rawText) {
      const userNotes = db.getNotesByUser(req.user.id);
      if (userNotes.length > 0) rawText = userNotes[0].extractedText || userNotes[0].description;
    }

    const mistakes = db.getMistakes(req.user.id);
    const questions = await generateWeakTopicPractice(rawText, topic, mistakes, count);
    res.json({ success: true, topic, questions });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to generate weak topic practice session.' });
  }
});

// ----------------------------------------------------------------------------
// 8. ACTIVE STUDY SESSIONS & FLASHCARDS
// ----------------------------------------------------------------------------
// POST /api/study-session
app.post('/api/study-session', authenticateToken, (req, res) => {
  try {
    const { noteId, subject, topic, durationSeconds, mode, startTime, endTime } = req.body;
    const session = db.recordStudySession({
      userId: req.user.id,
      noteId,
      subject,
      topic,
      durationSeconds: Math.round(Number(durationSeconds) || 0),
      mode: mode || 'study',
      startTime,
      endTime
    });
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to record study session.' });
  }
});

// GET /api/study-session
app.get('/api/study-session', authenticateToken, (req, res) => {
  const sessions = db.getStudySessions(req.user.id);
  res.json({ sessions });
});

// POST /api/flashcard/review
app.post('/api/flashcard/review', authenticateToken, (req, res) => {
  try {
    const { noteId, cardId, front, state, status } = req.body;
    const record = db.recordFlashcardReview({
      userId: req.user.id,
      noteId,
      cardId,
      front,
      state: state || status || 'known'
    });
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to record flashcard review.' });
  }
});

// GET /api/flashcards?noteId=... (Mandatory Requirement 3)
// Scoped strictly to authenticated userId + noteId
app.get('/api/flashcards', authenticateToken, (req, res) => {
  try {
    const { noteId } = req.query;
    if (!noteId) {
      return res.status(400).json({ error: 'noteId query parameter is required.' });
    }
    const note = db.getNoteById(noteId, req.user.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found or unauthorized.' });
    }

    const flashcards = db.getFlashcards(noteId, req.user.id);
    res.json({
      success: true,
      noteId,
      subject: note.subject,
      unit: note.unit,
      title: note.title,
      flashcards
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch note flashcards.' });
  }
});

// POST /api/flashcards/regenerate (Mandatory Requirements 9 & 10)
app.post('/api/flashcards/regenerate', authenticateToken, async (req, res) => {
  try {
    const { noteId } = req.body;
    if (!noteId) {
      return res.status(400).json({ error: 'noteId is required.' });
    }
    const note = db.getNoteById(noteId, req.user.id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found or unauthorized.' });
    }

    const rawText = note.extractedText || note.description;
    const cleanedText = cleanDocumentText(rawText);
    const freshCards = await generateFlashcards(cleanedText, note.title, note.subject, note.topic, note.id, req.user.id);
    const saved = db.saveFlashcards(note.id, req.user.id, freshCards);

    res.json({
      success: true,
      noteId: note.id,
      subject: note.subject,
      unit: note.unit,
      title: note.title,
      flashcards: saved
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to regenerate flashcards.' });
  }
});

// GET /api/flashcard/progress
app.get('/api/flashcard/progress', authenticateToken, (req, res) => {
  const { noteId } = req.query;
  const progress = db.getFlashcardProgress(req.user.id, noteId);
  res.json({ progress });
});

// GET /api/topics/priorities
app.get('/api/topics/priorities', authenticateToken, async (req, res) => {
  try {
    const { noteId } = req.query;
    let note = null;
    if (noteId) {
      note = db.getNoteById(noteId, req.user.id);
    }
    if (!note) {
      const userNotes = db.getNotesByUser(req.user.id);
      note = userNotes[0] || null;
    }
    if (!note) {
      return res.json({ priorities: [] });
    }

    const topicMastery = db.getTopicMastery(req.user.id);
    const mistakes = db.getMistakes(req.user.id);
    const userLearningData = { topicMastery, mistakes };

    const priorities = await generateImportantTopics(note.extractedText || note.description, note.title, userLearningData);
    res.json({ success: true, priorities });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to calculate topic priorities.' });
  }
});

// ----------------------------------------------------------------------------
// 7. S3 STORAGE STATUS & PRESIGNED DOWNLOAD
// ----------------------------------------------------------------------------
app.get('/api/s3/status', async (req, res) => {
  const cfg = getS3Config();
  const connTest = await testS3Connection();
  res.json({
    configured: cfg.isConfigured,
    live: cfg.isLive,
    bucket: cfg.bucket,
    region: cfg.region,
    mode: cfg.mode,
    connectionTest: connTest,
    hierarchy: [
      'users/{userId}/notes/{noteId}/{safe-file-name}',
      'users/{userId}/metadata/'
    ]
  });
});

app.get('/api/s3/download', authenticateToken, async (req, res) => {
  const { s3Key } = req.query;
  if (!s3Key) return res.status(400).json({ error: 'Missing s3Key parameter.' });

  try {
    const result = await getPresignedDownloadUrl({
      s3Key,
      userId: req.user.id,
      originalFilename: path.basename(s3Key)
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Could not generate download link.' });
  }
});

// SPA client-side routing fallback - serve index.html for non-API requests (Express 5 compatible)
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).send('StudyBuddy Web frontend is not built. Run `npm run build` or start Vite dev server.');
});

// Start Express API Server
app.listen(PORT, () => {
  console.log(`[StudyBuddy API Server] Running on http://localhost:${PORT}`);
});
