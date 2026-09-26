// ============================================================================
// StudyBuddy Central Reactive Data Store
// Manages real notes, user stats, exam schedules, mistake notebook, and activity log.
// Uses localStorage persistence with reactive event listener subscriptions.
// Real user data only — zero mock/demo data.
// ============================================================================

const STORAGE_KEYS = {
  NOTES: 'studybuddy_notes_v1',
  PROGRESS: 'studybuddy_progress_v1',
  EXAM: 'studybuddy_active_exam_v1',
  MISTAKES: 'studybuddy_mistakes_v1',
  ACTIVITY: 'studybuddy_activity_v1',
  NOTIFICATIONS: 'studybuddy_notifications_v1'
};

const DEFAULT_EXAM = null;

const DEFAULT_PROGRESS = {
  topicsRevised: 0,
  questionsCompleted: 0,
  averageScore: null,
  studyStreak: 0,
  notesShared: 0,
  notesStudied: 0,
  examsPrepared: 0,
  strongTopics: [],
  weakTopics: [],
  weeklyActivity: []
};

const DEFAULT_MISTAKES = [];
const DEFAULT_NOTIFICATIONS = [];

class DataStore {
  constructor() {
    this.listeners = new Set();
    this.initData();
  }

  initData() {
    try {
      const storedNotes = localStorage.getItem(STORAGE_KEYS.NOTES);
      if (storedNotes && storedNotes.includes('note-thermo-01')) {
        localStorage.removeItem(STORAGE_KEYS.NOTES);
      }
      const storedProgress = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      if (storedProgress && storedProgress.includes('Thermodynamics')) {
        localStorage.removeItem(STORAGE_KEYS.PROGRESS);
      }
      const storedExam = localStorage.getItem(STORAGE_KEYS.EXAM);
      if (storedExam && storedExam.includes('exam-thermo-01')) {
        localStorage.removeItem(STORAGE_KEYS.EXAM);
      }
    } catch (e) {}

    if (!localStorage.getItem(STORAGE_KEYS.NOTES)) {
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PROGRESS)) {
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(DEFAULT_PROGRESS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.EXAM)) {
      localStorage.setItem(STORAGE_KEYS.EXAM, JSON.stringify(null));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MISTAKES)) {
      localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVITY)) {
      localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify([]));
    }
  }

  // Subscribe to real-time updates
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('Error in store subscriber:', err);
      }
    }
  }

  // NOTES
  getNotes() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTES);
      return data ? JSON.parse(data) : INITIAL_NOTES;
    } catch {
      return INITIAL_NOTES;
    }
  }

  getNoteById(id) {
    const notes = this.getNotes();
    return notes.find(n => n.id === id) || notes[0];
  }

  addNote(newNote) {
    const notes = this.getNotes();
    const updated = [newNote, ...notes];
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updated));

    // Update progress stats
    this.updateProgress(prev => ({
      ...prev,
      notesShared: prev.notesShared + 1
    }));

    this.addActivity(`Uploaded new note: "${newNote.title}"`, 'upload');
    this.notify();
    return updated;
  }

  deleteNote(noteId) {
    const notes = this.getNotes();
    const note = notes.find(n => n.id === noteId);
    const updated = notes.filter(n => n.id !== noteId);
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updated));
    if (note) {
      this.addActivity(`Deleted note: "${note.title}"`, 'trash');
    }
    this.notify();
    return updated;
  }

  incrementNoteDownloads(noteId) {
    const notes = this.getNotes();
    const updated = notes.map(n => n.id === noteId ? { ...n, downloads: (n.downloads || 0) + 1 } : n);
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updated));
    this.notify();
  }

  incrementNoteStudies(noteId) {
    const notes = this.getNotes();
    const updated = notes.map(n => n.id === noteId ? { ...n, studyCount: (n.studyCount || 0) + 1 } : n);
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(updated));
    this.notify();
  }

  // PROGRESS
  getProgress() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      return data ? JSON.parse(data) : DEFAULT_PROGRESS;
    } catch {
      return DEFAULT_PROGRESS;
    }
  }

  updateProgress(updater) {
    const current = this.getProgress();
    const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(next));
    this.notify();
    return next;
  }

  recordQuizCompleted({ totalQuestions, correctCount, topic, subject, weakTopics = [] }) {
    const current = this.getProgress();
    const newTotalQ = current.questionsCompleted + totalQuestions;
    const quizPct = Math.round((correctCount / totalQuestions) * 100);
    // Weighted moving average
    const newAvg = Math.round((current.averageScore * current.questionsCompleted + quizPct * totalQuestions) / newTotalQ);

    const updatedWeakTopics = [...current.weakTopics];
    if (quizPct < 70) {
      const existing = updatedWeakTopics.find(w => w.topic === topic);
      if (existing) {
        existing.score = quizPct;
      } else {
        updatedWeakTopics.push({ topic, score: quizPct, subject });
      }
    } else {
      // If mastered, remove from weak
      const idx = updatedWeakTopics.findIndex(w => w.topic === topic);
      if (idx !== -1) updatedWeakTopics.splice(idx, 1);
    }

    const updatedProgress = {
      ...current,
      questionsCompleted: newTotalQ,
      averageScore: newAvg,
      topicsRevised: current.topicsRevised + 1,
      weakTopics: updatedWeakTopics
    };

    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(updatedProgress));
    this.addActivity(`Completed MCQ quiz on ${topic}: Score ${quizPct}% (${correctCount}/${totalQuestions})`, 'check');
    this.notify();
  }

  // ACTIVE EXAM & PREPARATION PLAN
  getExam() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXAM);
      return data ? JSON.parse(data) : DEFAULT_EXAM;
    } catch {
      return DEFAULT_EXAM;
    }
  }

  setExam(examData) {
    localStorage.setItem(STORAGE_KEYS.EXAM, JSON.stringify(examData));
    this.updateProgress(prev => ({ ...prev, examsPrepared: prev.examsPrepared + 1 }));
    this.addActivity(`Created new Exam Preparation Plan: "${examData.name}"`, 'calendar');
    this.notify();
  }

  toggleExamDayCompleted(dayNumber) {
    const exam = this.getExam();
    if (!exam || !exam.scheduleDays) return;

    let completedCount = 0;
    const updatedDays = exam.scheduleDays.map(day => {
      if (day.dayNumber === dayNumber) {
        const nextCompleted = !day.completed;
        if (nextCompleted) completedCount++;
        return {
          ...day,
          completed: nextCompleted,
          status: nextCompleted ? 'completed' : 'in-progress'
        };
      }
      if (day.completed) completedCount++;
      return day;
    });

    const newProgress = Math.round((completedCount / updatedDays.length) * 100);
    const updatedExam = {
      ...exam,
      progress: newProgress,
      scheduleDays: updatedDays
    };

    localStorage.setItem(STORAGE_KEYS.EXAM, JSON.stringify(updatedExam));
    this.updateProgress(prev => ({ ...prev, topicsRevised: prev.topicsRevised + 1 }));
    this.addActivity(`Marked Day ${dayNumber} in Exam Plan as completed (${newProgress}% total)`, 'check');
    this.notify();
  }

  // MISTAKES NOTEBOOK
  getMistakes() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MISTAKES);
      return data ? JSON.parse(data) : DEFAULT_MISTAKES;
    } catch {
      return DEFAULT_MISTAKES;
    }
  }

  addMistake(mistake) {
    const current = this.getMistakes();
    const newMistake = {
      id: `mistake-${Date.now().toString(36)}`,
      ...mistake,
      dateAdded: new Date().toISOString().split('T')[0],
      status: 'needs-revision'
    };
    const updated = [newMistake, ...current];
    localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(updated));
    this.notify();
    return newMistake;
  }

  removeMistake(id) {
    const current = this.getMistakes();
    const updated = current.filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(updated));
    this.notify();
  }

  markMistakeMastered(id) {
    const current = this.getMistakes();
    const updated = current.map(m => m.id === id ? { ...m, status: 'mastered' } : m);
    localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(updated));
    this.notify();
  }

  // ACTIVITY LOG
  getActivity() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVITY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  addActivity(text, icon = 'info') {
    const current = this.getActivity();
    const updated = [{ id: `act-${Date.now()}`, text, time: 'Just now', icon }, ...current.slice(0, 19)];
    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(updated));
    this.notify();
  }

  // NOTIFICATIONS
  getNotifications() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return data ? JSON.parse(data) : DEFAULT_NOTIFICATIONS;
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  }

  markNotificationsRead() {
    const notifs = this.getNotifications().map(n => ({ ...n, unread: false }));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
    this.notify();
  }
}

export const dataStore = new DataStore();
