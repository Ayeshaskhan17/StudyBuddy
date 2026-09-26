import React, { useState, useEffect } from 'react';
import {
  Sparkles, BookOpen, Layers, Lightbulb, ListChecks,
  Bookmark, Download, Check, ChevronDown, ChevronUp,
  RotateCw, HelpCircle, FileText, CheckCircle2, ArrowRight,
  TrendingUp, AlertTriangle, Clock, Target, Info
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { api } from '../services/apiService';
import { progressService } from '../services/progressService';

export default function AIStudy({ initialNoteId, onNavigateMCQ, onSelectNote, onShowToast }) {
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(initialNoteId || '');
  const [activeTab, setActiveTab] = useState('topics'); // default to high-yield topics
  const [expandedPriority, setExpandedPriority] = useState({});

  // Summary State
  const [summaryData, setSummaryData] = useState(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    quick: true,
    concepts: true,
    definitions: true,
    formulas: true,
    exam: true
  });
  const [savedSummary, setSavedSummary] = useState(false);

  // Mnemonics State
  const [mnemonicsData, setMnemonicsData] = useState(null);
  const [isGeneratingMnemonics, setIsGeneratingMnemonics] = useState(false);
  const [savedMnemonics, setSavedMnemonics] = useState({});

  // Flashcards State
  const [flashcardsData, setFlashcardsData] = useState(null);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [flippedCards, setFlippedCards] = useState({});

  // Important Topics & Questions State
  const [importantTopics, setImportantTopics] = useState(null);
  const [shortQuestions, setShortQuestions] = useState(null);
  const [longQuestions, setLongQuestions] = useState(null);
  const [loadingTool, setLoadingTool] = useState(false);

  // Active study session timer
  useEffect(() => {
    progressService.startStudySession({
      noteId: selectedNoteId,
      topic: 'AI Study Workspace',
      mode: 'study'
    });
    return () => {
      progressService.endStudySession();
    };
  }, [selectedNoteId]);

  useEffect(() => {
    api.getNotes().then(fetchedNotes => {
      const list = fetchedNotes || [];
      setNotes(list);
      if (!selectedNoteId && list.length > 0) {
        setSelectedNoteId(initialNoteId || list[0].id);
      }
    }).catch(err => {
      console.warn('Failed to load notes for AI Study:', err);
    });
  }, [selectedNoteId, initialNoteId]);

  const currentNote = notes.find(n => n.id === selectedNoteId) || notes[0];

  // Auto-generate content when tab or selected note changes
  useEffect(() => {
    if (!currentNote) return;

    if (activeTab === 'summary') {
      loadSummary(currentNote);
    } else if (activeTab === 'mnemonics') {
      loadMnemonics(currentNote);
    } else if (activeTab === 'flashcards') {
      loadFlashcards(currentNote);
    } else if (activeTab === 'topics') {
      loadImportantTopics(currentNote);
    } else if (activeTab === 'short-q') {
      loadShortQuestions(currentNote);
    } else if (activeTab === 'long-q') {
      loadLongQuestions(currentNote);
    }
  }, [activeTab, selectedNoteId]);

  const loadSummary = async (note) => {
    setIsGeneratingSummary(true);
    const data = await aiService.generateSummary(note);
    setSummaryData(data);
    setIsGeneratingSummary(false);
  };

  const loadMnemonics = async (note) => {
    setIsGeneratingMnemonics(true);
    const data = await aiService.generateMnemonics(note);
    setMnemonicsData(data);
    setIsGeneratingMnemonics(false);
  };

  const loadFlashcards = async (note) => {
    setIsGeneratingFlashcards(true);
    const data = await aiService.generateFlashcards(note);
    setFlashcardsData(data);
    setIsGeneratingFlashcards(false);
  };

  const loadImportantTopics = async (note) => {
    setLoadingTool(true);
    const data = await aiService.generateImportantTopics(note);
    setImportantTopics(data);
    setLoadingTool(false);
  };

  const loadShortQuestions = async (note) => {
    setLoadingTool(true);
    const data = await aiService.generateQuestions(note, 'short');
    setShortQuestions(data);
    setLoadingTool(false);
  };

  const loadLongQuestions = async (note) => {
    setLoadingTool(true);
    const data = await aiService.generateQuestions(note, 'long');
    setLongQuestions(data);
    setLoadingTool(false);
  };

  // Section toggle for summary
  const toggleSection = (sec) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const togglePriorityExpander = (idx) => {
    setExpandedPriority(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSaveSummary = () => {
    setSavedSummary(true);
    if (onShowToast) {
      onShowToast({
        type: 'success',
        title: 'Summary Bookmarked',
        message: `Saved "${currentNote?.title}" summary into your Revision Hub.`
      });
    }
  };

  const handleDownloadSummary = () => {
    if (!summaryData) return;
    const content = `STUDYBUDDY AI SUMMARY: ${currentNote?.title}\nSubject: ${currentNote?.subject}\nTopic: ${currentNote?.topic}\n\n1. OVERVIEW\n${summaryData.quickSummary}\n\n2. KEY CONCEPTS\n${summaryData.keyConcepts?.map(k => `• ${k.title}: ${k.description}`).join('\n')}\n\n3. EXAM FOCUS AREAS\n${summaryData.examFocusAreas?.map(f => `★ ${f}`).join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentNote?.title || 'StudyBuddy'}_Summary.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // MCQ Configuration State for Tab 3
  const [mcqCount, setMcqCount] = useState(5);
  const [mcqDifficulty, setMcqDifficulty] = useState('Mixed');
  const [selectedPracticeTopic, setSelectedPracticeTopic] = useState('');

  const handleStartMCQ = (overrideTopic = '') => {
    if (onNavigateMCQ) {
      onNavigateMCQ({
        noteId: selectedNoteId,
        count: mcqCount,
        difficulty: mcqDifficulty,
        topic: overrideTopic || selectedPracticeTopic || currentNote?.topic || ''
      });
    }
  };

  const tools = [
    { id: 'topics', title: 'Exam Priorities', desc: 'Calculated study priorities & dynamic question types', icon: Target, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    { id: 'summary', title: 'Structured Summary', desc: 'Key ideas, definitions & examiner tips', icon: BookOpen, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
    { id: 'mcq', title: 'Practice Drills', desc: 'Concept MCQs with instant feedback & document quotes', icon: ListChecks, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    { id: 'flashcards', title: 'Active Recall', desc: 'Question-to-answer memory retention cards', icon: Layers, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
    { id: 'mnemonics', title: 'Mnemonics Hub', desc: 'Memory hooks for complex lists & hierarchies', icon: Lightbulb, color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' },
    { id: 'short-q', title: 'Short Answer Prep', desc: '2-3 marks questions with concept rubrics', icon: FileText, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
    { id: 'long-q', title: 'Long Essay Prep', desc: '10 marks step-by-step evaluation blueprints', icon: HelpCircle, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '4px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
          <Sparkles size={14} /> Pedagogical AI Study Suite
        </div>
        <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          StudyBuddy AI Workspace
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          Real document-grounded summaries, adaptive priorities, and intelligent assessments
        </p>
      </div>

      {/* Note Selector Bar */}
      <div className="card" style={{ padding: '18px 24px', background: 'var(--bg-card)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              Active Study Material:
            </span>
            <select
              className="form-select"
              value={selectedNoteId}
              onChange={e => setSelectedNoteId(e.target.value)}
              style={{ minWidth: '280px', fontWeight: 600, background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)' }}
              id="ai-note-selector"
            >
              {notes.map(note => (
                <option key={note.id} value={note.id} style={{ background: '#0b0f19', color: '#f8fafc' }}>
                  [{note.subject}] {note.title}
                </option>
              ))}
            </select>
          </div>

          {currentNote && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span className="badge badge-primary">{currentNote.subject}</span>
              <span className="badge badge-neutral">{currentNote.fileType || 'PDF'}</span>
              <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>Topic: <strong style={{ color: 'var(--text-primary)' }}>{currentNote.topic}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Modern Tool Selection Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px'
      }}>
        {tools.map(tool => {
          const Icon = tool.icon;
          const isActive = activeTab === tool.id;

          return (
            <div
              key={tool.id}
              onClick={() => setActiveTab(tool.id)}
              style={{
                background: isActive ? 'rgba(99, 102, 241, 0.16)' : 'var(--bg-card)',
                border: isActive ? '1.5px solid #6366f1' : '1px solid var(--border-glass)',
                borderRadius: '16px',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 0 20px rgba(99, 102, 241, 0.25)' : 'none'
              }}
              id={`ai-tool-tab-${tool.id}`}
            >
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: tool.bg,
                color: tool.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon size={20} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: '0.925rem', color: isActive ? '#f8fafc' : 'var(--text-primary)' }}>
                  {tool.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tool.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* TOOL WORKSPACE VIEW BASED ON ACTIVE TAB */}
      <div style={{ marginTop: '8px' }}>
        {/* TAB 4: IMPORTANT TOPICS (OVERHAULED PER REQUIREMENTS #2, #3, #23, #24, #25, #26) */}
        {activeTab === 'topics' && (
          <div className="card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                  Calculated Exam Priorities & Topic Breakdown
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', margin: 0 }}>
                  Calculated from actual study material coverage, user quiz performance, and logged mistakes.
                </p>
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => loadImportantTopics(currentNote)}
                disabled={loadingTool}
              >
                <RotateCw size={14} className={loadingTool ? 'spin' : ''} /> Recalculate Priorities
              </button>
            </div>

            {loadingTool ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#6366f1' }}>
                <RotateCw size={32} className="spin" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Calculating exam priorities from document structure and performance metrics...</div>
              </div>
            ) : importantTopics && importantTopics.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {importantTopics.map((top, idx) => {
                  const isCritical = top.priority === 'Critical';
                  const isHigh = top.priority === 'High';
                  const isMedium = top.priority === 'Medium';
                  const isExpanded = Boolean(expandedPriority[idx]);

                  const badgeClass = isCritical ? 'badge-danger' : isHigh ? 'badge-warning' : isMedium ? 'badge-primary' : 'badge-success';
                  const borderColor = isCritical ? 'rgba(239, 68, 68, 0.4)' : isHigh ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-glass)';

                  return (
                    <div
                      key={idx}
                      style={{
                        border: `1.5px solid ${borderColor}`,
                        background: 'rgba(15, 23, 42, 0.85)',
                        borderRadius: '16px',
                        padding: '22px 26px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        transition: 'all 0.2s ease',
                        boxShadow: isCritical ? '0 4px 20px rgba(239, 68, 68, 0.12)' : 'none'
                      }}
                    >
                      {/* Top Header Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span className={`badge ${badgeClass}`} style={{ fontSize: '0.825rem', padding: '4px 12px', fontWeight: 800 }}>
                            {top.priority} Priority
                          </span>
                          <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            Weightage: <strong style={{ color: 'var(--text-primary)' }}>{top.weightage}</strong>
                          </span>
                          <span style={{
                            fontSize: '0.725rem',
                            color: '#94a3b8',
                            background: 'rgba(255, 255, 255, 0.06)',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            border: '1px solid rgba(255, 255, 255, 0.08)'
                          }}>
                            {top.estimationSource}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Clock size={15} color="#94a3b8" />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Estimated Time:</span>
                          <strong style={{ color: '#38bdf8', fontSize: '0.9rem' }}>{top.estimatedStudyHours}</strong>
                        </div>
                      </div>

                      {/* Topic Name */}
                      <div>
                        <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                          {top.topic}
                        </h4>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: '#94a3b8' }}>Relevant Question Types:</span>
                          <span style={{ color: '#cbd5e1' }}>
                            {Array.isArray(top.typicalQuestionTypes) ? top.typicalQuestionTypes.join(', ') : top.typicalQuestionTypes}
                          </span>
                        </div>
                      </div>

                      {/* Transparent Reason Summary */}
                      <div style={{
                        background: isCritical ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                        border: isCritical ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        fontSize: '0.875rem',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px'
                      }}>
                        <Info size={18} color={isCritical ? '#f87171' : '#38bdf8'} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong>Reason: </strong>
                          <span style={{ color: 'var(--text-secondary)' }}>{top.reason}</span>
                        </div>
                      </div>

                      {/* Action Buttons & "Why is this priority?" Expander Toggle */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '14px' }}>
                        <button
                          onClick={() => togglePriorityExpander(idx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#38bdf8',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 0'
                          }}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          {isExpanded ? 'Hide Priority Details' : 'Why is this important?'}
                        </button>

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                              setActiveTab('summary');
                              if (onSelectNote) onSelectNote(currentNote?.id, 'learn');
                            }}
                          >
                            <BookOpen size={14} /> Study Topic
                          </button>
                          <button
                            className={`btn btn-sm ${isCritical ? 'btn-danger' : 'btn-primary'}`}
                            onClick={() => handleStartMCQ(top.topic)}
                            id={`practice-priority-topic-${idx}`}
                          >
                            <Target size={14} /> Practice Topic
                          </button>
                        </div>
                      </div>

                      {/* Expandable "Why This is Priority" Details (Requirement #26) */}
                      {isExpanded && (
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '12px',
                          padding: '18px 22px',
                          marginTop: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Mastery</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                {top.mastery !== null ? `${top.mastery}%` : 'Unassessed'}
                              </div>
                            </div>
                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quiz Accuracy</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
                                {top.accuracy !== null ? `${top.accuracy}%` : 'No attempts'}
                              </div>
                            </div>
                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recorded Mistakes</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: top.mistakeCount > 0 ? '#f87171' : '#10b981' }}>
                                {top.mistakeCount || 0}
                              </div>
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                              Recommended Remediation Steps:
                            </div>
                            <ol style={{ paddingLeft: '20px', margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                              {top.recommendedActions?.map((act, i) => (
                                <li key={i}>{act}</li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                <Target size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Not enough data yet.</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Upload study notes to extract structured topics and calculate your syllabus priorities.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: SUMMARY */}
        {activeTab === 'summary' && (
          <div className="card" style={{ padding: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              borderBottom: '1px solid var(--border-glass)',
              paddingBottom: '20px',
              marginBottom: '24px'
            }}>
              <div>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                  Structured Academic Summary: {currentNote?.title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Subject: <strong style={{ color: 'var(--text-primary)' }}>{currentNote?.subject}</strong> &bull; Topic: <strong style={{ color: 'var(--text-primary)' }}>{currentNote?.topic}</strong>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleSaveSummary}
                  id="save-summary-btn"
                >
                  <Bookmark size={15} color={savedSummary ? '#10b981' : '#6366f1'} />
                  {savedSummary ? 'Saved in Revision' : 'Save Summary'}
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleDownloadSummary}
                  id="download-summary-btn"
                >
                  <Download size={15} /> Download Summary
                </button>
              </div>
            </div>

            {isGeneratingSummary ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6366f1' }}>
                <RotateCw size={28} className="spin" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Analyzing uploaded study note with StudyBuddy AI...</div>
              </div>
            ) : summaryData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 1. Quick Summary Section */}
                <div style={{ border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'hidden' }}>
                  <div
                    onClick={() => toggleSection('quick')}
                    style={{
                      padding: '14px 18px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.975rem', color: 'var(--text-primary)' }}>
                      1. Quick Overview
                    </span>
                    {expandedSections.quick ? <ChevronUp size={18} color="var(--text-secondary)" /> : <ChevronDown size={18} color="var(--text-secondary)" />}
                  </div>
                  {expandedSections.quick && (
                    <div style={{ padding: '18px', fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {summaryData.quickSummary}
                    </div>
                  )}
                </div>

                {/* 2. Key Concepts */}
                <div style={{ border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'hidden' }}>
                  <div
                    onClick={() => toggleSection('concepts')}
                    style={{
                      padding: '14px 18px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.975rem', color: 'var(--text-primary)' }}>
                      2. High-Yield Key Concepts
                    </span>
                    {expandedSections.concepts ? <ChevronUp size={18} color="var(--text-secondary)" /> : <ChevronDown size={18} color="var(--text-secondary)" />}
                  </div>
                  {expandedSections.concepts && (
                    <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {summaryData.keyConcepts?.map((kc, i) => (
                        <div key={i} style={{ borderLeft: '3px solid #6366f1', paddingLeft: '12px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{kc.title}</div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{kc.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Definitions */}
                <div style={{ border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'hidden' }}>
                  <div
                    onClick={() => toggleSection('definitions')}
                    style={{
                      padding: '14px 18px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '0.975rem', color: 'var(--text-primary)' }}>
                      3. Technical Definitions
                    </span>
                    {expandedSections.definitions ? <ChevronUp size={18} color="var(--text-secondary)" /> : <ChevronDown size={18} color="var(--text-secondary)" />}
                  </div>
                  {expandedSections.definitions && (
                    <div style={{ padding: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                      {summaryData.definitions?.map((def, i) => (
                        <div key={i} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: '8px' }}>
                          <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.9rem' }}>{def.term}: </span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{def.definition}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 2: MCQ GENERATOR CONFIG */}
        {activeTab === 'mcq' && (
          <div className="card" style={{ padding: '36px', maxWidth: '720px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <ListChecks size={28} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                Practice Multiple Choice Questions (MCQs)
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', margin: 0 }}>
                Generate customized practice questions with instant feedback and source document quotes from "{currentNote?.title}"
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Question Count Selection */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Number of Questions
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  {[5, 10, 15, 20].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setMcqCount(cnt)}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: mcqCount === cnt ? '2px solid #10b981' : '1px solid var(--border-glass)',
                        background: mcqCount === cnt ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card)',
                        color: mcqCount === cnt ? '#10b981' : 'var(--text-primary)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {cnt} Questions
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Selection */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Difficulty Level
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  {['Easy', 'Medium', 'Hard', 'Mixed'].map(diff => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setMcqDifficulty(diff)}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: mcqDifficulty === diff ? '2px solid #6366f1' : '1px solid var(--border-glass)',
                        background: mcqDifficulty === diff ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)',
                        color: mcqDifficulty === diff ? '#6366f1' : 'var(--text-primary)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '12px' }}
                onClick={() => handleStartMCQ()}
                id="start-generated-quiz-btn"
              >
                <ListChecks size={18} /> Launch MCQ Practice Session
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: SHORT QUESTIONS */}
        {activeTab === 'short-q' && (
          <div className="card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Short Questions & Conceptual Rubrics
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Concept-based model answers and scoring criteria grounded in your notes
            </p>

            {shortQuestions ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {shortQuestions.map(sq => (
                  <div key={sq.id} style={{ border: '1px solid var(--border-glass)', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', padding: '18px 22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="badge badge-primary">{sq.maxScore || sq.marks || 10} Marks</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{sq.topic || 'Core Concept'}</span>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: '10px' }}>
                      {sq.question}
                    </div>
                    <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-glass)', padding: '14px 18px', borderRadius: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <strong style={{ color: '#38bdf8' }}>Model Answer: </strong> {sq.modelAnswer || 'Provide a direct definition followed by 2-3 key characteristics mentioned in the notes.'}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 6: LONG QUESTIONS */}
        {activeTab === 'long-q' && (
          <div className="card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Comprehensive Long Questions & Essay Blueprints
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Step-by-step marking rubrics, conceptual coverage, and derivation blueprints
            </p>

            {longQuestions ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {longQuestions.map(lq => (
                  <div key={lq.id} style={{ border: '1px solid var(--border-glass)', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '14px', padding: '22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="badge badge-secondary">{lq.maxScore || lq.marks || 20} Marks Essay</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{lq.topic}</span>
                    </div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
                      {lq.question}
                    </h4>

                    <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-glass)', padding: '16px 20px', borderRadius: '10px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#818cf8', marginBottom: '8px' }}>
                        Required Scoring Criteria & Expected Key Concepts:
                      </div>
                      <ul style={{ paddingLeft: '20px', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {(lq.expectedConcepts || lq.keyPoints || []).map((pt, i) => (
                          <li key={i} style={{ marginBottom: '4px' }}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 7: SMART FLASHCARDS */}
        {activeTab === 'flashcards' && (
          <div className="card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Active Recall Flashcards
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Click any card to flip and verify your understanding of core concepts
            </p>

            {flashcardsData ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
                {flashcardsData.map((fc, i) => {
                  const isFlipped = Boolean(flippedCards[i]);

                  return (
                    <div
                      key={i}
                      onClick={() => setFlippedCards(prev => ({ ...prev, [i]: !prev[i] }))}
                      style={{
                        minHeight: '180px',
                        background: isFlipped ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                        border: isFlipped ? '1.5px solid #6366f1' : '1px solid var(--border-glass)',
                        borderRadius: '16px',
                        padding: '24px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div>
                        <span className="badge badge-neutral" style={{ marginBottom: '10px' }}>
                          {isFlipped ? 'ANSWER / CONCEPT' : 'PROMPT'}
                        </span>
                        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                          {isFlipped ? fc.back : fc.front}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '12px' }}>
                        Click to flip ↷
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 8: MNEMONICS */}
        {activeTab === 'mnemonics' && (
          <div className="card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Mnemonics & Memory Retention Hooks
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Catchy memory hooks designed to help you recall complex hierarchies and lists during exam conditions
            </p>

            {mnemonicsData ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
                {mnemonicsData.map((m, i) => (
                  <div key={i} style={{ border: '1px solid var(--border-glass)', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '14px', padding: '20px' }}>
                    <span className="badge badge-warning" style={{ marginBottom: '8px' }}>{m.topic}</span>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b', margin: '4px 0 8px' }}>
                      "{m.mnemonic}"
                    </h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 10px' }}>
                      {m.explanation}
                    </p>
                    {m.hook && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Tip: {m.hook}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
