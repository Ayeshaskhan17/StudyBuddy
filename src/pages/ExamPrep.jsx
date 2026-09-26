import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, CheckCircle2, Circle, AlertTriangle,
  Plus, Sparkles, BookOpen, ListChecks, ChevronRight, X,
  ArrowRight, ShieldCheck, Target, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/apiService';
import { progressService } from '../services/progressService';

export default function ExamPrep({ onNavigateAI, onShowToast }) {
  const [plans, setPlans] = useState([]);
  const [notes, setNotes] = useState([]);
  const [progress, setProgress] = useState(null);
  const [topicPriorities, setTopicPriorities] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // New Plan Form State
  const [formName, setFormName] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formHours, setFormHours] = useState(2);
  const [selectedNoteIds, setSelectedNoteIds] = useState([]);

  // Fetch initial plans, notes, and progress
  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedPlans, fetchedNotes, fetchedProgress] = await Promise.all([
        api.getExamPlans(),
        api.getNotes(),
        progressService.fetchProgress()
      ]);
      setPlans(fetchedPlans || []);
      setNotes(fetchedNotes || []);
      setProgress(fetchedProgress || null);

      if (fetchedNotes && fetchedNotes.length > 0) {
        setFormSubject(fetchedNotes[0].subject || '');
        setSelectedNoteIds([fetchedNotes[0].id]);
        const priorities = await api.getTopicPriorities(fetchedNotes[0].id);
        setTopicPriorities(priorities || []);
      }
    } catch (err) {
      console.warn('Failed to load exam prep data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = progressService.subscribe(p => setProgress(p));
    return () => unsub();
  }, []);

  const exam = plans[0] || null;

  // Countdown timer string
  const [countdownString, setCountdownString] = useState('');
  const [isPassed, setIsPassed] = useState(false);

  useEffect(() => {
    if (!exam || !exam.examDate) return;

    const updateTicker = () => {
      const target = new Date(exam.examDate).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setCountdownString('Exam Day!');
        setIsPassed(true);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setCountdownString(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      setIsPassed(false);
    };

    updateTicker();
    const interval = setInterval(updateTicker, 1000);
    return () => clearInterval(interval);
  }, [exam]);

  // Toggle Day Completion
  const handleToggleDay = async (dayNumber) => {
    if (!exam) return;
    const updatedDays = exam.scheduleDays.map(d =>
      d.dayNumber === dayNumber ? { ...d, completed: !d.completed } : d
    );
    const completedCount = updatedDays.filter(d => d.completed).length;
    const progressPct = Math.round((completedCount / (updatedDays.length || 1)) * 100);

    // Trigger celebration if 100%
    if (progressPct === 100) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }

    try {
      await api.toggleExamDay(exam.id, { scheduleDays: updatedDays, progress: progressPct });
      setPlans(prev => prev.map(p => p.id === exam.id ? { ...p, scheduleDays: updatedDays, progress: progressPct } : p));
      if (onShowToast) {
        onShowToast({
          type: 'success',
          title: 'Schedule Updated',
          message: `Day ${dayNumber} marked as ${updatedDays.find(d => d.dayNumber === dayNumber).completed ? 'completed' : 'pending'}. Overall prep: ${progressPct}%.`
        });
      }
    } catch (err) {
      console.warn('Failed to update schedule day:', err);
    }
  };

  // Create new exam plan
  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!formName || !formDate || !formSubject) return;

    const daysCount = Math.max(3, Math.min(14, Math.ceil((new Date(formDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))));
    const scheduleDays = [];

    for (let i = 1; i <= Math.min(daysCount, 7); i++) {
      scheduleDays.push({
        dayNumber: i,
        title: `DAY ${i}: ${topicPriorities[i - 1]?.topic || `Core Syllabus Module ${i}`}`,
        allocatedTime: `${formHours} hours`,
        taskDescription: `Review foundational concepts, study high-yield formulas, and practice 10 MCQs.`,
        completed: false
      });
    }

    const newPlan = {
      name: formName,
      subject: formSubject,
      examDate: new Date(formDate).toISOString(),
      studyHoursPerDay: formHours,
      progress: 0,
      selectedNoteIds,
      scheduleDays
    };

    try {
      const created = await api.createExamPlan(newPlan);
      setPlans([created, ...plans]);
      setShowCreateModal(false);
      if (onShowToast) {
        onShowToast({
          type: 'success',
          title: 'Exam Plan Created',
          message: `Generated personalized ${daysCount}-day revision timeline for "${formName}".`
        });
      }
    } catch (err) {
      alert(err.message || 'Failed to create plan.');
    }
  };

  const weakTopics = progress?.weakTopics || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '4px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
            <Calendar size={14} /> Exam Readiness & Remediation Mode
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {exam ? exam.name : 'Personalized Exam Preparation Plan'}
          </h1>
          <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Adaptive syllabus revision schedule with live countdown and performance-driven remediation
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
          id="create-new-exam-plan-btn"
        >
          <Plus size={18} /> New Exam Plan
        </button>
      </div>

      {exam ? (
        <>
          {/* Active Exam Overview Card with Live Countdown & Progress */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, #090e1f 0%, #151d3b 60%, #1e2952 100%)',
            border: '1.5px solid rgba(99, 102, 241, 0.35)',
            color: '#ffffff',
            padding: '32px 36px',
            borderRadius: '24px',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '24px'
            }}>
              <div>
                <span style={{
                  background: 'rgba(99, 102, 241, 0.25)',
                  color: '#818cf8',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}>
                  {exam.subject}
                </span>

                <h2 style={{ color: 'var(--text-primary)', fontSize: '2rem', fontWeight: 800, margin: '12px 0 6px', letterSpacing: '-0.02em' }}>
                  {exam.name}
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} color="#38bdf8" /> Daily Target: <strong style={{ color: 'var(--text-primary)' }}>{exam.studyHoursPerDay} hrs/day</strong>
                  </div>
                  <div>&bull;</div>
                  <div>
                    Exam Date: <strong style={{ color: 'var(--text-primary)' }}>{new Date(exam.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                  </div>
                </div>
              </div>

              {/* Countdown Ticker Box */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(16px)',
                border: '1px solid var(--border-glass)',
                borderRadius: '18px',
                padding: '16px 24px',
                textAlign: 'center',
                minWidth: '220px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
              }}>
                <div style={{ fontSize: '0.78rem', color: '#818cf8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Live Countdown
                </div>
                <div style={{
                  fontSize: isPassed ? '1.4rem' : '1.75rem',
                  fontWeight: 800,
                  color: isPassed ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontFamily: 'JetBrains Mono, monospace',
                  marginTop: '4px'
                }}>
                  {countdownString}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {isPassed ? 'Exam period concluded' : 'Time Remaining'}
                </div>
              </div>
            </div>

            {/* Preparation Completion Progress Bar */}
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <span>Overall Exam Preparation Completion</span>
                <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{exam.progress || 0}%</span>
              </div>
              <div style={{ height: '10px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${exam.progress || 0}%`,
                  background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                  borderRadius: '999px',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>
          </div>

          {/* DYNAMIC WEAK TOPIC REMEDIATION (Requirements #4, #5, #6) */}
          {weakTopics.length > 0 && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1.5px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f87171', margin: 0 }}>
                    Dynamic Weak Topics Detected
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Calculated from your genuine assessment accuracy and recorded mistakes. Target these topics for immediate grade improvement.
                  </div>
                </div>
              </div>

              {weakTopics.slice(0, 3).map((wt, idx) => (
                <div key={idx} style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span className="badge badge-danger">
                        🔴 Weak Topic &bull; {wt.accuracy !== undefined ? `${wt.accuracy}% Accuracy` : `${wt.mistakesCount} mistakes`}
                      </span>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                        "{wt.topic}"
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      {wt.reason}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => onNavigateAI(exam?.selectedNoteIds?.[0], 'summary')}
                    >
                      <BookOpen size={14} /> Review Notes
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => onNavigateAI(exam?.selectedNoteIds?.[0], 'mcq')}
                      id={`practice-weak-topic-${idx}-btn`}
                    >
                      <Target size={14} /> 🎯 Practice Weak Topic
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* DAY-BY-DAY TIMELINE / SCHEDULE */}
          <div className="card" style={{ padding: '32px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Personalized Day-by-Day Preparation Timeline
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Check off each day's study tasks as you complete them to dynamically update your exam readiness.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {exam.scheduleDays?.map(day => (
                <div
                  key={day.dayNumber}
                  style={{
                    border: day.completed ? '1.5px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-glass)',
                    background: day.completed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.7)',
                    borderRadius: '14px',
                    padding: '18px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleDay(day.dayNumber)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: day.completed ? '#10b981' : '#cbd5e1'
                      }}
                      id={`day-checkbox-${day.dayNumber}`}
                      aria-label={`Toggle Day ${day.dayNumber} completion`}
                    >
                      {day.completed ? (
                        <CheckCircle2 size={26} color="#10b981" />
                      ) : (
                        <Circle size={26} color="#94a3b8" />
                      )}
                    </button>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span className={`badge ${day.completed ? 'badge-success' : 'badge-neutral'}`}>
                          {day.completed ? 'Completed' : 'Upcoming'}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          Target: {day.allocatedTime}
                        </span>
                      </div>
                      <h4 style={{
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        color: day.completed ? '#34d399' : 'var(--text-primary)',
                        textDecoration: day.completed ? 'line-through' : 'none',
                        margin: '2px 0'
                      }}>
                        {day.title}
                      </h4>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {day.taskDescription}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => onNavigateAI(exam?.selectedNoteIds?.[0], 'summary')}
                    >
                      Study Notes
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => onNavigateAI(exam?.selectedNoteIds?.[0], 'mcq')}
                    >
                      Practice Drills
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Empty state: No active exam plan */
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <Calendar size={48} color="#818cf8" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            No Exam Preparation Plan Active
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 24px' }}>
            Set your target exam date and StudyBuddy will automatically analyze your notes to build a customized, day-by-day revision schedule with adaptive weak topic remediation.
          </p>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={18} /> Create Your First Exam Plan
          </button>
        </div>
      )}

      {/* CREATE NEW EXAM PLAN MODAL */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                Create Personalized Exam Plan
              </h3>
              <button
                className="btn-icon"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePlan}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Plan / Exam Name */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Exam Name *</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="e.g. Cloud Computing Midterm"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    required
                  />
                </div>

                {/* Subject & Hours per Day */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Subject *</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="e.g. Computer Science"
                      value={formSubject}
                      onChange={e => setFormSubject(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Target Study Hours/Day</label>
                    <input
                      className="form-input"
                      type="number"
                      min="1"
                      max="10"
                      value={formHours}
                      onChange={e => setFormHours(Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Exam Date */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Exam Date *</label>
                  <input
                    className="form-input"
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    required
                  />
                </div>

                {/* Notes Multi-Select */}
                <div>
                  <label className="form-label">Select Notes / Units to Include in Plan:</label>
                  <div style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    background: 'rgba(0, 0, 0, 0.2)'
                  }}>
                    {notes.map(note => {
                      const isChecked = selectedNoteIds.includes(note.id);
                      return (
                        <label
                          key={note.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            background: isChecked ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedNoteIds(prev =>
                                isChecked ? prev.filter(id => id !== note.id) : [...prev, note.id]
                              );
                            }}
                          />
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{note.title}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>({note.subject})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  id="submit-create-exam-plan-btn"
                >
                  <Sparkles size={16} /> Create My Exam Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
