// ============================================================================
// StudyBuddy Real AI Client Service (src/services/aiService.js)
// Connects to the backend AI Engine to generate authentic summaries, MCQs,
// flashcards, mnemonics, and topics derived 100% from the uploaded PDF document.
// Zero hardcoded subjects or question templates.
// ============================================================================

import { api } from './apiService';

class AIService {
  // Generate structured summary from note via backend API
  async generateSummary(note) {
    if (!note || !note.id) return null;
    try {
      let aiPack = await api.getNoteAI(note.id);
      if (!aiPack || !aiPack.summary) {
        aiPack = await api.processNoteAI(note.id);
      }
      return {
        noteTitle: note.title,
        subject: note.subject,
        topic: note.topic,
        quickSummary: aiPack.summary?.quickSummary || aiPack.summary?.overview || 'Document summary ready.',
        overview: aiPack.summary?.overview || aiPack.summary?.quickSummary,
        keyConcepts: aiPack.summary?.keyConcepts || [],
        definitions: aiPack.summary?.definitions || aiPack.keyDefinitions || [],
        formulas: aiPack.summary?.formulas || [],
        comparisons: aiPack.summary?.comparisons || aiPack.comparisons || [],
        coreIdeas: aiPack.summary?.coreIdeas || [],
        advantages: aiPack.summary?.advantages || [],
        disadvantages: aiPack.summary?.disadvantages || [],
        examFocusAreas: aiPack.summary?.examFocus || aiPack.summary?.examFocusAreas || [],
        quickRevision: aiPack.summary?.quickRevision || ''
      };
    } catch (err) {
      console.warn('Failed to load note summary from backend:', err.message);
      return null;
    }
  }

  // Generate MCQs based on note, question count, and difficulty
  async generateMCQs({ note, count = 5, difficulty = 'Mixed', topic = '' }) {
    if (!note || !note.id) return [];
    try {
      const questions = await api.generateMCQs({
        noteId: note.id,
        count,
        difficulty,
        topic: topic || note.topic
      });
      return questions;
    } catch (err) {
      console.warn('Failed to generate MCQs from backend:', err.message);
      return [];
    }
  }

  // Generate flashcards from note
  async generateFlashcards(note) {
    if (!note || !note.id) return [];
    try {
      let aiPack = await api.getNoteAI(note.id);
      if (!aiPack || !aiPack.flashcards) {
        aiPack = await api.processNoteAI(note.id);
      }
      return aiPack.flashcards || [];
    } catch (err) {
      console.warn('Failed to load flashcards:', err.message);
      return [];
    }
  }

  // Generate mnemonics from note
  async generateMnemonics(note) {
    if (!note || !note.id) return [];
    try {
      let aiPack = await api.getNoteAI(note.id);
      if (!aiPack || !aiPack.mnemonics) {
        aiPack = await api.processNoteAI(note.id);
      }
      return aiPack.mnemonics || [];
    } catch (err) {
      console.warn('Failed to load mnemonics:', err.message);
      return [];
    }
  }

  // Generate important topics dynamically with calculated priorities
  async generateImportantTopics(note) {
    if (!note || !note.id) return [];
    try {
      const dynamicPriorities = await api.getTopicPriorities(note.id);
      if (Array.isArray(dynamicPriorities) && dynamicPriorities.length > 0) {
        return dynamicPriorities;
      }
      let aiPack = await api.getNoteAI(note.id);
      if (!aiPack || !aiPack.topics) {
        aiPack = await api.processNoteAI(note.id);
      }
      return aiPack.topics || [];
    } catch (err) {
      console.warn('Failed to load topics:', err.message);
      return [];
    }
  }

  // Generate short or long practice questions
  async generateQuestions(note, type = 'short') {
    if (!note || !note.id) return [];
    try {
      const qType = type === 'short' ? 'Short Answer' : 'Long Answer';
      const questions = await api.generateExamQuestions({
        noteId: note.id,
        count: 5,
        questionTypes: qType,
        difficulty: 'Medium'
      });
      if (questions && questions.length > 0) return questions;

      let aiPack = await api.getNoteAI(note.id);
      if (!aiPack) {
        aiPack = await api.processNoteAI(note.id);
      }
      if (type === 'short') {
        return (aiPack.practiceQuestions || []).slice(0, 3);
      } else {
        return (aiPack.practiceQuestions || []).slice(1);
      }
    } catch (err) {
      return [];
    }
  }
}

export const aiService = new AIService();
