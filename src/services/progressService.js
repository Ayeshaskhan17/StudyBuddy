// ============================================================================
// StudyBuddy Central Progress Service (src/services/progressService.js)
// ONE SOURCE OF TRUTH FOR ALL STUDENT PROGRESS & MASTERY METRICS
// Strictly dynamic: zero fabricated percentages or synthetic study hours.
// ============================================================================

import { api } from './apiService';

class ProgressService {
  constructor() {
    this.listeners = new Set();
    this.cachedProgress = null;
    this.activeSessionTimer = null;
    this.sessionStartTime = null;
    this.accumulatedActiveSeconds = 0;
    this.currentSessionContext = null;
    this.isSessionPaused = false;
    this.idleTimer = null;
    this.setupActiveTimeTracker();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.cachedProgress);
      } catch (err) {
        console.error('[ProgressService] Listener error:', err);
      }
    }
  }

  /**
   * Fetches latest calculated progress from the backend server
   */
  async fetchProgress() {
    try {
      const data = await api.getProgress();
      if (data) {
        this.cachedProgress = data;
        this.notify();
      }
      return data;
    } catch (err) {
      console.warn('[ProgressService] Failed to fetch progress:', err);
      return this.cachedProgress;
    }
  }

  getProgress() {
    return this.cachedProgress;
  }

  // --------------------------------------------------------------------------
  // ACTIVE STUDY SESSION TIME TRACKING (Requirement #16)
  // Pauses automatically on tab blur, document hide, or user idle > 60s
  // --------------------------------------------------------------------------
  setupActiveTimeTracker() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Handle visibility changes (tab switch / window minimize)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseActiveSession();
      } else {
        this.resumeActiveSession();
      }
    });

    window.addEventListener('blur', () => {
      this.pauseActiveSession();
    });

    window.addEventListener('focus', () => {
      this.resumeActiveSession();
    });

    // Detect idle user (> 60s without input)
    const resetIdle = () => {
      if (this.isSessionPaused && this.currentSessionContext) {
        this.resumeActiveSession();
      }
      clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => {
        this.pauseActiveSession();
      }, 60000); // 60s idle threshold
    };

    window.addEventListener('mousemove', resetIdle, { passive: true });
    window.addEventListener('keydown', resetIdle, { passive: true });
    window.addEventListener('click', resetIdle, { passive: true });
    window.addEventListener('scroll', resetIdle, { passive: true });
  }

  startStudySession({ noteId = '', subject = 'General', topic = 'Workspace Study', mode = 'study' } = {}) {
    // If a session is already running, end and save it first
    if (this.currentSessionContext) {
      this.endStudySession();
    }

    this.currentSessionContext = {
      noteId,
      subject,
      topic,
      mode,
      startTime: new Date().toISOString()
    };
    this.sessionStartTime = Date.now();
    this.accumulatedActiveSeconds = 0;
    this.isSessionPaused = false;

    // Heartbeat every 10s to accumulate active study seconds
    clearInterval(this.activeSessionTimer);
    this.activeSessionTimer = setInterval(() => {
      if (!this.isSessionPaused) {
        this.accumulatedActiveSeconds += 10;
      }
    }, 10000);
  }

  pauseActiveSession() {
    if (!this.isSessionPaused && this.currentSessionContext) {
      this.isSessionPaused = true;
    }
  }

  resumeActiveSession() {
    if (this.isSessionPaused && this.currentSessionContext) {
      this.isSessionPaused = false;
    }
  }

  async endStudySession() {
    if (!this.currentSessionContext) return;

    clearInterval(this.activeSessionTimer);
    clearTimeout(this.idleTimer);

    const seconds = Math.max(0, Math.round(this.accumulatedActiveSeconds));
    const sessionPayload = {
      ...this.currentSessionContext,
      durationSeconds: seconds,
      endTime: new Date().toISOString()
    };

    this.currentSessionContext = null;
    this.sessionStartTime = null;
    this.accumulatedActiveSeconds = 0;
    this.isSessionPaused = false;

    // Only record sessions that had at least 15 active seconds
    if (seconds >= 15) {
      try {
        await api.recordStudySession(sessionPayload);
        await this.fetchProgress();
      } catch (err) {
        console.warn('[ProgressService] Failed to record study session:', err);
      }
    }
  }

  // --------------------------------------------------------------------------
  // CENTRAL COMPUTATION UTILITIES
  // --------------------------------------------------------------------------

  /**
   * Calculates topic mastery status badge and color
   */
  getTopicMasteryStatus(masteryScore) {
    if (masteryScore === null || masteryScore === undefined) {
      return { status: 'Unassessed', label: 'Unassessed', badgeClass: 'badge-neutral', color: '#94a3b8' };
    }
    if (masteryScore >= 85) {
      return { status: 'Strong', label: 'Strong (85%+)', badgeClass: 'badge-success', color: '#10b981' };
    }
    if (masteryScore >= 70) {
      return { status: 'Improving', label: 'Improving (70-84%)', badgeClass: 'badge-primary', color: '#6366f1' };
    }
    if (masteryScore >= 50) {
      return { status: 'Needs Practice', label: 'Needs Practice (50-69%)', badgeClass: 'badge-warning', color: '#f59e0b' };
    }
    return { status: 'Weak', label: 'Weak Topic (<50%)', badgeClass: 'badge-danger', color: '#ef4444' };
  }

  /**
   * Calculates priority score from topic importance, weakness score, remaining content & urgency
   * Priority Score = Topic Importance + Weakness Score + Remaining Content + Urgency
   */
  calculatePriority({ contentWeightPct = 25, accuracy = null, mistakesCount = 0, examDaysRemaining = null }) {
    let score = Number(contentWeightPct) || 20;

    // Weakness score (up to 40 points)
    if (accuracy !== null) {
      score += Math.max(0, 100 - accuracy) * 0.4;
    } else {
      score += 15; // Unstudied penalty
    }

    // Mistakes score
    score += Math.min(25, mistakesCount * 5);

    // Exam urgency
    if (examDaysRemaining !== null) {
      if (examDaysRemaining <= 3) score += 20;
      else if (examDaysRemaining <= 7) score += 10;
    }

    if (score >= 65 || (accuracy !== null && accuracy < 50) || mistakesCount >= 3) {
      return { level: 'Critical', label: 'Critical Priority', badgeClass: 'badge-danger', score: Math.round(score) };
    }
    if (score >= 45 || (accuracy !== null && accuracy < 70) || mistakesCount > 0) {
      return { level: 'High', label: 'High Priority', badgeClass: 'badge-warning', score: Math.round(score) };
    }
    if (score >= 30) {
      return { level: 'Medium', label: 'Medium Priority', badgeClass: 'badge-primary', score: Math.round(score) };
    }
    return { level: 'Low', label: 'Low Priority', badgeClass: 'badge-success', score: Math.round(score) };
  }

  /**
   * Action trigger: Record completed quiz and immediately refresh progress
   */
  async handleQuizCompleted(payload) {
    try {
      const res = await api.submitQuiz(payload);
      await this.fetchProgress();
      return res;
    } catch (err) {
      console.error('[ProgressService] Quiz submit error:', err);
      throw err;
    }
  }

  /**
   * Action trigger: Record completed exam and immediately refresh progress
   */
  async handleExamCompleted(payload) {
    try {
      const res = await api.submitExam(payload);
      await this.fetchProgress();
      return res;
    } catch (err) {
      console.error('[ProgressService] Exam submit error:', err);
      throw err;
    }
  }

  /**
   * Action trigger: Record flashcard review and refresh progress
   */
  async handleFlashcardReviewed(payload) {
    try {
      const res = await api.recordFlashcardReview(payload);
      await this.fetchProgress();
      return res;
    } catch (err) {
      console.error('[ProgressService] Flashcard review error:', err);
      throw err;
    }
  }
}

export const progressService = new ProgressService();
