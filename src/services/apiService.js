// ============================================================================
// StudyBuddy Real API Client Service (src/services/apiService.js)
// Connects to backend for S3 uploads, PDF extraction, real AI generation,
// dynamic subjects, mistakes notebook, and persistent progress.
// ============================================================================

import { authService } from './authService';

class ApiService {
  getHeaders(isMultipart = false) {
    const token = authService.getToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  // --- NOTES & REAL PDF UPLOAD ---
  async uploadNote({ file, title, subject, semester, unit, topic, description }) {
    console.log('[UPLOAD START]', {
      requestStarted: new Date().toISOString(),
      authenticatedUser: authService.getUser()?.email || 'authenticated-user',
      fileAttached: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      formDataField: 'file'
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('subject', subject);
    formData.append('semester', semester || 'Semester 1');
    formData.append('unit', unit || 'Unit 1');
    formData.append('topic', topic || title);
    formData.append('description', description || '');

    const res = await fetch('/api/notes/upload', {
      method: 'POST',
      headers: this.getHeaders(true),
      body: formData
    });

    const data = await res.json().catch(() => ({}));
    console.log('[UPLOAD RESPONSE]', {
      httpStatus: res.status,
      response: data
    });

    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload study document.');
    }
    return data;
  }

  async getNotes() {
    const res = await fetch('/api/notes', {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Could not fetch notes.');
    const data = await res.json();
    return data.notes || [];
  }

  async getNoteById(id) {
    const res = await fetch(`/api/notes/${id}`, {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Note not found.');
    const data = await res.json();
    return data.note;
  }

  async deleteNote(id) {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete note.');
    return res.json();
  }

  // --- DYNAMIC SUBJECTS ---
  async getSubjects() {
    const res = await fetch('/api/subjects', {
      headers: this.getHeaders()
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.subjects || [];
  }

  // --- REAL AI STUDY HUB PIPELINE ---
  async processNoteAI(noteId) {
    const res = await fetch('/api/ai/process-note', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ noteId })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'AI Study Generation failed.');
    }
    return data.aiPack;
  }

  async getNoteAI(noteId) {
    const res = await fetch(`/api/ai/note/${noteId}`, {
      headers: this.getHeaders()
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.aiPack;
  }

  async generateMCQs({ noteId, count, difficulty, topic, subject }) {
    const res = await fetch('/api/ai/generate-mcqs', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ noteId, count, difficulty, topic, subject })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate MCQs.');
    return data.questions || [];
  }

  async createQuizSession({ noteId, subject, topic, count, difficulty }) {
    const res = await fetch('/api/quiz/create', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ noteId, subject, topic, count, difficulty })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create quiz session.');
    return data.quiz;
  }

  async getQuizSession(quizId) {
    const res = await fetch(`/api/quiz/session/${quizId}`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load quiz session.');
    return data.quiz;
  }

  async askAIChat({ noteId, question }) {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ noteId, question })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'AI was unable to answer.');
    return data.answer;
  }

  async getTopicStudy({ noteId, topic }) {
    const res = await fetch('/api/ai/topic-study', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ noteId, topic })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate topic study.');
    return data;
  }

  async getAIStatus() {
    const res = await fetch('/api/ai/status');
    if (!res.ok) return { isOffline: true, engineMode: 'Basic offline extraction' };
    const data = await res.json();
    return data.status || { isOffline: true, engineMode: 'Basic offline extraction' };
  }

  // --- QUIZ & MISTAKES ---
  async submitQuiz(payload) {
    const res = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to record quiz submission.');
    return res.json();
  }

  async getMistakes() {
    const res = await fetch('/api/mistakes', {
      headers: this.getHeaders()
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.mistakes || [];
  }

  async updateMistakeStatus(id, status) {
    const res = await fetch(`/api/mistakes/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status })
    });
    return res.json();
  }

  async removeMistake(id) {
    const res = await fetch(`/api/mistakes/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return res.json();
  }

  // --- PROGRESS & EXAMS ---
  async getProgress() {
    const res = await fetch('/api/progress', {
      headers: this.getHeaders()
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.progress;
  }

  async getExamPlans() {
    const res = await fetch('/api/exam-plans', {
      headers: this.getHeaders()
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.plans || [];
  }

  async createExamPlan(plan) {
    const res = await fetch('/api/exam-plans', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(plan)
    });
    if (!res.ok) throw new Error('Could not create exam plan.');
    const data = await res.json();
    return data.plan;
  }

  async toggleExamDay(planId, updates) {
    const res = await fetch(`/api/exam-plans/${planId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates)
    });
    return res.json();
  }

  // --- EXAM MODE & ANSWER EVALUATION ---
  async generateExamQuestions({ noteId, count, questionTypes, difficulty, topic }) {
    const res = await fetch('/api/exam/generate', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ noteId, count, questionTypes, difficulty, topic })
    });
    if (!res.ok) throw new Error('Failed to generate exam questions.');
    const data = await res.json();
    return data.questions || [];
  }

  async evaluateAnswer({ noteId, question, studentAnswer, questionType, topic }) {
    const res = await fetch('/api/ai/evaluate-answer', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ noteId, question, studentAnswer, questionType, topic })
    });
    if (!res.ok) throw new Error('Answer evaluation failed.');
    const data = await res.json();
    return data.evaluation;
  }

  async submitExam(payload) {
    const res = await fetch('/api/exam/submit', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Exam submission failed.');
    return res.json();
  }

  async getExamAttempts() {
    const res = await fetch('/api/exam/attempts', {
      headers: this.getHeaders()
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.attempts || [];
  }

  async getWeakTopicPractice({ topic, noteId, count = 5 }) {
    const res = await fetch('/api/ai/weak-topic-practice', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ topic, noteId, count })
    });
    if (!res.ok) throw new Error('Failed to retrieve weak topic remediation questions.');
    const data = await res.json();
    return data.questions || [];
  }

  // --- ACTIVE STUDY SESSIONS & FLASHCARDS ---
  async recordStudySession(sessionData) {
    const res = await fetch('/api/study-session', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(sessionData)
    });
    if (!res.ok) return null;
    return res.json();
  }

  async getStudySessions() {
    const res = await fetch('/api/study-session', {
      headers: this.getHeaders()
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.sessions || [];
  }

  async recordFlashcardReview(reviewData) {
    const res = await fetch('/api/flashcard/review', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(reviewData)
    });
    if (!res.ok) return null;
    return res.json();
  }

  // --- NOTE-SPECIFIC FLASHCARDS (Mandatory Requirements 2 & 3) ---
  async getFlashcards(noteId) {
    if (!noteId) return { flashcards: [] };
    const res = await fetch(`/api/flashcards?noteId=${encodeURIComponent(noteId)}`, {
      headers: this.getHeaders()
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch flashcards for note.');
    }
    return res.json();
  }

  async regenerateFlashcards(noteId) {
    if (!noteId) throw new Error('noteId is required.');
    const res = await fetch('/api/flashcards/regenerate', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ noteId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to regenerate flashcards.');
    return data;
  }

  async getFlashcardProgress(noteId = '') {
    const url = noteId ? `/api/flashcard/progress?noteId=${encodeURIComponent(noteId)}` : '/api/flashcard/progress';
    const res = await fetch(url, {
      headers: this.getHeaders()
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.progress;
  }

  async getTopicPriorities(noteId = '') {
    const url = noteId ? `/api/topics/priorities?noteId=${noteId}` : '/api/topics/priorities';
    const res = await fetch(url, {
      headers: this.getHeaders()
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.priorities || [];
  }
}

export const api = new ApiService();
