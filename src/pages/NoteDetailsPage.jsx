import React, { useState, useEffect } from 'react';
import {
  FileText, Download, Sparkles, BookOpen, Brain, ListChecks,
  Layers, MessageSquare, Send, ArrowLeft, Tag, Calendar,
  HardDrive, User, RotateCcw, AlertTriangle, CheckCircle2,
  ChevronRight, Zap, Target, Search, Clock
} from 'lucide-react';
import { api } from '../services/apiService';
import { authService } from '../services/authService';
import MCQQuiz from './MCQQuiz';
import InteractiveFlashcards from '../components/InteractiveFlashcards';
import InteractiveSummary from '../components/InteractiveSummary';
import TopicStudyMap from '../components/TopicStudyMap';

export default function NoteDetailsPage({
  noteId,
  initialMode = 'learn',
  onBack,
  onShowToast,
  onNavigateMistakes
}) {
  const [note, setNote] = useState(null);
  const [aiPack, setAiPack] = useState(null);
  const [activeMode, setActiveMode] = useState(initialMode || 'learn');
  const [loadingAI, setLoadingAI] = useState(false);
  const [engineStatus, setEngineStatus] = useState(null);

  useEffect(() => {
    if (initialMode) {
      setActiveMode(initialMode);
    }
  }, [initialMode, noteId]);

  // Reader Search & Navigation State
  const [readerSearch, setReaderSearch] = useState('');

  // Chat State
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your StudyBuddy AI tutor. Ask me any concept, explanation, derivation, or question about this document!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Active Quiz Runner state
  const [activeQuizQuestions, setActiveQuizQuestions] = useState(null);
  const [activeQuizSession, setActiveQuizSession] = useState(null);

  // Focused Topic Study Modal
  const [topicStudyData, setTopicStudyData] = useState(null);
  const [loadingTopicStudy, setLoadingTopicStudy] = useState(false);

  const [loadingFlashcards, setLoadingFlashcards] = useState(false);

  useEffect(() => {
    loadNoteData();
  }, [noteId]);

  const loadNoteData = async () => {
    // Mandatory Requirement 5 & 6: Clear old note state immediately to prevent leakage
    setNote(null);
    setAiPack(null);
    setActiveQuizQuestions(null);
    setActiveQuizSession(null);
    setLoadingAI(true);

    try {
      const n = await api.getNoteById(noteId);
      setNote(n);

      const existingAI = await api.getNoteAI(noteId);
      if (existingAI && existingAI.summary) {
        setAiPack(existingAI);
        if (existingAI.engineStatus) setEngineStatus(existingAI.engineStatus);
      } else {
        // Trigger AI processing
        const newPack = await api.processNoteAI(noteId);
        setAiPack(newPack);
        if (newPack?.engineStatus) setEngineStatus(newPack.engineStatus);
      }
      setLoadingAI(false);
    } catch (err) {
      setLoadingAI(false);
      onShowToast({
        type: 'error',
        title: 'Error loading note',
        message: err.message
      });
    }
  };

  const handleRegenerateFlashcards = async () => {
    setLoadingFlashcards(true);
    try {
      const res = await api.regenerateFlashcards(noteId);
      if (res && Array.isArray(res.flashcards)) {
        setAiPack(prev => ({
          ...(prev || {}),
          flashcards: res.flashcards
        }));
        onShowToast({
          type: 'success',
          title: 'Flashcards Generated',
          message: `Generated ${res.flashcards.length} active-recall cards from ${note?.title || 'this document'}.`
        });
      }
    } catch (err) {
      onShowToast({
        type: 'error',
        title: 'Flashcard Generation Failed',
        message: err.message
      });
    } finally {
      setLoadingFlashcards(false);
    }
  };

  const handleSendMessage = async (e, customQuery = null) => {
    if (e) e.preventDefault();
    const query = customQuery || chatInput.trim();
    if (!query || chatLoading) return;

    if (!customQuery) setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: query }]);
    setChatLoading(true);

    try {
      const answer = await api.askAIChat({ noteId, question: query });
      setChatMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'I encountered an issue analyzing the document text. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleStartMCQQuiz = (count = 5, difficulty = 'Mixed', topic = '') => {
    // Clear any previous quiz questions/session immediately to prevent stale cross-subject state
    setActiveQuizQuestions(null);
    setActiveQuizSession(null);

    onShowToast({
      type: 'info',
      title: 'Preparing Questions',
      message: `Creating subject-isolated ${note?.subject || 'study'} quiz...`
    });

    api.createQuizSession({
      noteId,
      subject: note?.subject || 'General',
      topic: topic || note?.topic || 'Core Concepts',
      count,
      difficulty
    }).then(session => {
      if (session && session.questions && session.questions.length > 0) {
        // Enforce hard subject filter
        const strictlySubjectQuestions = session.questions.filter(q =>
          !note?.subject || q.subject?.toLowerCase() === note.subject.toLowerCase()
        );
        setActiveQuizSession(session);
        setActiveQuizQuestions(strictlySubjectQuestions.length > 0 ? strictlySubjectQuestions : session.questions);
      } else {
        api.generateMCQs({ noteId, count, difficulty, topic, subject: note?.subject }).then(qs => {
          const strictlySubjectQuestions = (qs || []).filter(q =>
            !note?.subject || q.subject?.toLowerCase() === note.subject.toLowerCase()
          );
          setActiveQuizSession(null);
          setActiveQuizQuestions(strictlySubjectQuestions);
        });
      }
    }).catch(err => {
      console.warn('Quiz session creation fallback:', err.message);
      api.generateMCQs({ noteId, count, difficulty, topic, subject: note?.subject }).then(qs => {
        const strictlySubjectQuestions = (qs || []).filter(q =>
          !note?.subject || q.subject?.toLowerCase() === note.subject.toLowerCase()
        );
        setActiveQuizSession(null);
        setActiveQuizQuestions(strictlySubjectQuestions);
      });
    });
  };

  const handleStudyTopic = async (topicTitle) => {
    setLoadingTopicStudy(true);
    try {
      const data = await api.getTopicStudy({ noteId, topic: topicTitle });
      setTopicStudyData(data);
    } catch (err) {
      // Fallback
      handleStartMCQQuiz(5, 'Mixed', topicTitle);
    } finally {
      setLoadingTopicStudy(false);
    }
  };

  const handleExplainSimpler = (conceptTitle) => {
    setActiveMode('chat');
    handleSendMessage(null, `Explain "${conceptTitle}" in simple words with a real-life analogy.`);
  };

  const handleGenerateTopicMCQs = (conceptTitle) => {
    handleStartMCQQuiz(3, 'Medium', conceptTitle);
  };

  if (!note) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
        <div className="spin" style={{ display: 'inline-block', marginBottom: '12px' }}>
          <Sparkles size={28} color="#38bdf8" />
        </div>
        <div style={{ color: '#f8fafc', fontWeight: 700 }}>Loading note workspace...</div>
      </div>
    );
  }

  // Active Quiz Runner
  if (activeQuizQuestions) {
    return (
      <MCQQuiz
        key={`${activeQuizSession?.id || note.id}-${note.subject}-${Date.now()}`}
        quizId={activeQuizSession?.id}
        quizSession={activeQuizSession}
        questions={activeQuizQuestions}
        note={note}
        subject={note.subject}
        topic={activeQuizSession?.topic || note.topic}
        onExit={() => {
          setActiveQuizQuestions(null);
          setActiveQuizSession(null);
        }}
        onPracticeWeakTopics={(weakTopics) => {
          handleStartMCQQuiz(5, 'Mixed', weakTopics[0]);
        }}
        onShowToast={onShowToast}
        onAskAI={(q) => {
          setActiveQuizQuestions(null);
          setActiveQuizSession(null);
          setActiveMode('chat');
          handleSendMessage(null, q);
        }}
      />
    );
  }

  // Filtered extracted text for reader
  const rawText = note.extractedText || note.description || '';
  const displayFilteredText = readerSearch
    ? rawText.split('\n').filter(l => l.toLowerCase().includes(readerSearch.toLowerCase())).join('\n')
    : rawText;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Breadcrumb & Engine Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onBack}
            id="back-to-library-btn"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-primary">{note.subject}</span>
              <span className="badge badge-cyan">{note.semester}</span>
              {note.unit && <span className="badge badge-neutral">{note.unit}</span>}
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0 0' }}>
              {note.title}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* AI Engine Status Badge */}
          {engineStatus?.isOffline ? (
            <div style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '0.78rem',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600
            }}>
              <span>⚡ Basic offline extraction active</span>
            </div>
          ) : (
            <div style={{
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '0.78rem',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600
            }}>
              <Sparkles size={13} />
              <span>{engineStatus?.provider || 'AI Reasoning Active'}</span>
            </div>
          )}

          <a
            className="btn btn-secondary btn-sm"
            href={`/api/notes/${note.id}/file?token=${encodeURIComponent(authService.getToken() || '')}`}
            download={`${(note.originalFilename || note.title || 'study_document').replace(/[^a-zA-Z0-9._-]/g, '_')}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Download study document"
            id="download-study-document-btn"
          >
            <Download size={14} /> Download Document
          </a>
        </div>
      </div>

      {/* 5 LEARNING MODES SELECTOR TOOLBAR (Requirement 16) */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        position: 'sticky',
        top: '12px',
        zIndex: 20,
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { key: 'learn', label: '📖 Learn', desc: 'Structured summary & guide' },
            { key: 'flashcards', label: '🧠 Flashcards', desc: 'Interactive active-recall cards' },
            { key: 'practice', label: '🎯 Practice', desc: 'Topics map & custom quizzes' },
            { key: 'mock', label: '📝 Mock Test', desc: 'Timed 10-Q exam' },
            { key: 'revision', label: '⚡ Quick Revision', desc: 'High-yield definitions & recap' },
            { key: 'chat', label: '💬 Ask AI', desc: 'Grounded document tutor' }
          ].map(mode => {
            const isCurr = activeMode === mode.key;
            return (
              <button
                key={mode.key}
                onClick={() => setActiveMode(mode.key)}
                style={{
                  background: isCurr ? 'linear-gradient(135deg, #38bdf8, #6366f1)' : 'transparent',
                  border: isCurr ? 'none' : '1px solid transparent',
                  color: isCurr ? '#ffffff' : '#94a3b8',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => handleStartMCQQuiz(10, 'Mixed')}
          className="btn btn-primary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Sparkles size={14} /> Start Full Quiz
        </button>
      </div>

      {/* Split Document Workspace (Requirement 20) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 1fr) minmax(380px, 1.4fr)',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* LEFT COLUMN: Document Information & Extracted Text Reader */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
              Document Reader & Study Materials
            </h3>
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '0.78rem',
              color: '#38bdf8',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              <FileText size={14} color="#38bdf8" style={{ display: 'inline', marginRight: '6px' }} />
              {note.title} • StudyBuddy Verified Study Material
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            fontSize: '0.8rem',
            background: 'rgba(255, 255, 255, 0.02)',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div><span style={{ color: '#64748b' }}>Format:</span> <strong style={{ color: '#e2e8f0' }}>{note.fileType}</strong></div>
            <div><span style={{ color: '#64748b' }}>Size:</span> <strong style={{ color: '#e2e8f0' }}>{note.fileSize}</strong></div>
            <div><span style={{ color: '#64748b' }}>Pages:</span> <strong style={{ color: '#e2e8f0' }}>{note.numPages || 1} pages</strong></div>
            <div><span style={{ color: '#64748b' }}>Uploaded:</span> <strong style={{ color: '#e2e8f0' }}>{new Date(note.createdAt).toLocaleDateString()}</strong></div>
          </div>

          {note.isScanned && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '0.8rem',
              color: '#fbbf24',
              display: 'flex',
              gap: '8px'
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>Scanned / Image-based PDF: OCR required for full text analysis.</span>
            </div>
          )}

          {/* Reader Search Filter */}
          <div style={{ position: 'relative' }}>
            <Search size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search extracted text..."
              value={readerSearch}
              onChange={e => setReaderSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
                fontSize: '0.825rem'
              }}
            />
          </div>

          {/* Extracted Text Content Reader */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                Extracted Educational Text
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {displayFilteredText.length} characters
              </div>
            </div>
            <div style={{
              background: 'rgba(2, 6, 23, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '16px',
              height: '460px',
              overflowY: 'auto',
              fontSize: '0.875rem',
              color: '#cbd5e1',
              lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit'
            }}>
              {displayFilteredText || 'No text found matching search.'}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI Study Assistant (Switchable by Active Mode) */}
        <div className="card" style={{ padding: '24px' }}>
          {loadingAI ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <div className="spin" style={{ display: 'inline-block', marginBottom: '14px' }}>
                <Sparkles size={32} color="#38bdf8" />
              </div>
              <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '1.05rem' }}>AI Structuring Document...</div>
              <div style={{ fontSize: '0.825rem', marginTop: '6px' }}>Cleaning boilerplate, building study guide, generating questions.</div>
            </div>
          ) : (
            <>
              {/* MODE 1: LEARN (Structured Interactive Summary) */}
              {activeMode === 'learn' && aiPack?.summary && (
                <InteractiveSummary
                  summary={aiPack.summary}
                  comparisons={aiPack.comparisons}
                  onExplainSimpler={handleExplainSimpler}
                  onGenerateTopicMCQs={handleGenerateTopicMCQs}
                  onOpenFlashcards={() => setActiveMode('flashcards')}
                />
              )}

              {/* MODE 2: FLASHCARDS (Active Recall Cards) */}
              {activeMode === 'flashcards' && (
                <InteractiveFlashcards
                  currentNoteId={noteId}
                  noteId={noteId}
                  subject={note?.subject || ''}
                  unit={note?.unit || ''}
                  title={note?.title || ''}
                  flashcards={aiPack?.flashcards || []}
                  currentUser={authService.getUser()}
                  loading={loadingAI || loadingFlashcards}
                  onRegenerate={handleRegenerateFlashcards}
                  onShowToast={onShowToast}
                />
              )}

              {/* MODE 3: PRACTICE (Topics Map & Topic-Focused Quizzes) */}
              {activeMode === 'practice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                        Visual Topic Study Map
                      </h3>
                      <p style={{ fontSize: '0.825rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                        Select any unit or topic to launch a focused study session.
                      </p>
                    </div>

                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleStartMCQQuiz(10, 'Mixed')}
                    >
                      <Sparkles size={14} /> Full 10-Question Quiz
                    </button>
                  </div>

                  <TopicStudyMap
                    units={aiPack?.units || []}
                    topics={aiPack?.topics || []}
                    onStudyTopic={handleStudyTopic}
                  />
                </div>
              )}

              {/* MODE 4: MOCK TEST (Timed Exam Mode) */}
              {activeMode === 'mock' && (
                <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={32} color="#6366f1" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px 0' }}>
                      Timed Mock Examination
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: '#94a3b8', maxWidth: '440px', margin: '0 auto' }}>
                      Test your exam readiness under timed conditions. 10 authentic concept questions generated from your study material.
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '12px 20px',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    color: '#cbd5e1'
                  }}>
                    <div>⏱ <strong>10 Minutes</strong></div>
                    <div>📝 <strong>10 Questions</strong></div>
                    <div>🎯 <strong>Passing: 70%</strong></div>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ padding: '12px 28px', fontSize: '0.95rem' }}
                    onClick={() => handleStartMCQQuiz(10, 'Mixed')}
                  >
                    Start Timed Mock Exam
                  </button>
                </div>
              )}

              {/* MODE 5: QUICK REVISION */}
              {activeMode === 'revision' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(99, 102, 241, 0.1))',
                    border: '1.5px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '14px',
                    padding: '20px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Zap size={18} color="#38bdf8" />
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                        30-Second Final Recap
                      </span>
                    </div>
                    <p style={{ fontSize: '0.925rem', color: '#f8fafc', lineHeight: 1.6, margin: 0 }}>
                      {aiPack?.summary?.quickRevision || aiPack?.summary?.overview}
                    </p>
                  </div>

                  {/* High-Yield Definitions */}
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>
                      Essential Definitions for Recall
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                      {aiPack?.summary?.definitions?.slice(0, 6).map((def, i) => (
                        <div key={i} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '14px' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#38bdf8', marginBottom: '4px' }}>{def.term}</div>
                          <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5 }}>{def.definition}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* High-Yield Exam Points */}
                  {aiPack?.summary?.examFocus?.length > 0 && (
                    <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '18px' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.925rem', color: '#fbbf24', marginBottom: '10px' }}>
                        ⭐ Semester Exam Focus Points
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {aiPack.summary.examFocus.map((pt, i) => (
                          <div key={i} style={{ fontSize: '0.85rem', color: '#f8fafc', display: 'flex', gap: '8px' }}>
                            <span>•</span>
                            <span>{pt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 6: ASK AI TUTOR CHAT INTERFACE */}
              {activeMode === 'chat' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '520px' }}>
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    paddingRight: '6px',
                    marginBottom: '16px'
                  }}>
                    {chatMessages.map((msg, i) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: isUser ? 'flex-end' : 'flex-start'
                          }}
                        >
                          <div style={{
                            maxWidth: '85%',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            background: isUser ? 'linear-gradient(135deg, #38bdf8, #6366f1)' : 'rgba(255, 255, 255, 0.04)',
                            color: '#ffffff',
                            fontSize: '0.875rem',
                            lineHeight: 1.6,
                            whiteSpace: 'pre-line',
                            border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.08)'
                          }}>
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}
                    {chatLoading && (
                      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          color: '#94a3b8',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <div className="spin"><Sparkles size={14} color="#38bdf8" /></div>
                          <span>Analyzing document notes...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Prompt Pills */}
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px' }}>
                    {[
                      'Explain in simple words',
                      'Give me an example',
                      'Ask me one difficult question',
                      'What is IaaS vs PaaS?'
                    ].map((pill, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(null, pill)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#94a3b8',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '999px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {pill}
                      </button>
                    ))}
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Ask any question about this document..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      disabled={chatLoading}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#f8fafc',
                        fontSize: '0.875rem'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || chatLoading}
                      className="btn btn-primary"
                      style={{ padding: '0 18px' }}
                    >
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* TOPIC STUDY MODAL (Requirement 18) */}
      {topicStudyData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #090d16, #0f172a)',
            border: '1.5px solid rgba(99, 102, 241, 0.35)',
            borderRadius: '16px',
            maxWidth: '650px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span className="badge badge-primary">Focused Topic Session</span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0 0 0' }}>
                  {topicStudyData.topic}
                </h3>
              </div>
              <button
                onClick={() => setTopicStudyData(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '20px' }}>
              {topicStudyData.summary}
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Generated MCQs</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>{topicStudyData.mcqs?.length || 5}</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Target Flashcards</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#a5b4fc' }}>{topicStudyData.flashcards?.length || 5}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setTopicStudyData(null)}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const qs = topicStudyData.mcqs;
                  setTopicStudyData(null);
                  setActiveQuizQuestions(qs);
                }}
              >
                Start Topic Quiz ({topicStudyData.mcqs?.length || 5} MCQs)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
