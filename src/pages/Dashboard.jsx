import React, { useState, useEffect } from 'react';
import {
  Flame, CheckCircle, BookOpen, Target, Sparkles, UploadCloud,
  ListChecks, Calendar, ArrowRight, Clock, Award, FileText, ChevronRight,
  Layers, RefreshCw, AlertTriangle, Lightbulb, TrendingUp, CheckCircle2
} from 'lucide-react';
import { api } from '../services/apiService';
import { progressService } from '../services/progressService';
import { getInitials, getFirstName } from '../lib/userUtils';

export default function Dashboard({
  user,
  onNavigate,
  onOpenUpload,
  onSelectNote,
  onStartStudying,
  onShowToast
}) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdownString, setCountdownString] = useState('');

  useEffect(() => {
    loadDashboardData();
    const unsub = progressService.subscribe(p => {
      if (p) setProgress(p);
    });
    return () => unsub();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await progressService.fetchProgress();
      setProgress(data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  // Live countdown timer for active exam
  useEffect(() => {
    if (!progress?.activeExam?.examDate) return;

    const updateTimer = () => {
      const now = new Date();
      const target = new Date(progress.activeExam.examDate);
      const diffMs = target - now;

      if (diffMs <= 0) {
        setCountdownString('Exam completed');
        return;
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      setCountdownString(`Exam in ${days} days, ${hours}h`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [progress?.activeExam]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const firstName = getFirstName(user?.name) || 'Student';
    if (hour < 12) return `Good Morning, ${firstName} 👋`;
    if (hour < 18) return `Good Afternoon, ${firstName} 👋`;
    return `Good Evening, ${firstName} 👋`;
  };

  if (loading && !progress) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-secondary)' }}>
        <div className="spin" style={{ display: 'inline-block', marginBottom: '12px' }}>
          <Sparkles size={32} color="#38bdf8" />
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 600 }}>Loading your personalized study dashboard...</div>
      </div>
    );
  }

  const hasNotes = progress?.totalNotes > 0;
  const recentNotes = progress?.recentNotes || [];
  const recommendation = progress?.recommendedNextStep;
  const weakTopics = progress?.weakTopics || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Hero Welcome Banner */}
      <div style={{
        position: 'relative',
        borderRadius: '20px',
        padding: '22px 28px',
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.9) 0%, rgba(49, 46, 129, 0.75) 50%, rgba(67, 56, 202, 0.6) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        overflow: 'hidden'
      }}>
        <div style={{ zIndex: 1, maxWidth: '580px' }}>
          {/* Student Profile Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)',
            padding: '3px 12px 3px 6px',
            borderRadius: '999px',
            marginBottom: '10px',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            <div className="student-avatar-img" style={{
              width: '24px',
              height: '24px',
              fontSize: '0.725rem',
              borderRadius: '50%'
            }}>
              {getInitials(user?.name)}
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ffffff' }}>
              {user?.name || 'Student'}
            </span>
            <span style={{ fontSize: '0.725rem', color: '#38bdf8' }}>
              • {user?.semester || 'Semester 1'}
            </span>
          </div>

          <h1 style={{ color: 'var(--text-primary)', fontSize: '2rem', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.025em' }}>
            {getGreeting()}
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.975rem', margin: '0 0 16px', fontWeight: 500 }}>
            Ready to study smarter today?
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={onStartStudying}
              id="dashboard-start-studying-btn"
            >
              <Sparkles size={16} /> Start Studying
            </button>

            <button
              className="btn btn-secondary"
              onClick={onOpenUpload}
              id="dashboard-upload-notes-btn"
            >
              <UploadCloud size={16} /> + Upload Notes
            </button>
          </div>
        </div>

        {/* Real Streak Counter Card */}
        <div style={{
          zIndex: 1,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-glass)',
          borderRadius: '16px',
          padding: '18px 24px',
          minWidth: '190px',
          textAlign: 'center',
          boxShadow: '0 6px 25px rgba(0, 0, 0, 0.45)'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: 'rgba(249, 115, 22, 0.15)',
            marginBottom: '8px'
          }}>
            <Flame size={24} color="#f97316" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {progress?.studyStreak || 0} {progress?.studyStreak === 1 ? 'Day' : 'Days'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Active Study Streak 🔥
          </div>
        </div>
      </div>

      {/* DYNAMIC RECOMMENDATION BAR (Requirement #27) */}
      {recommendation && (
        <div style={{
          background: 'rgba(99, 102, 241, 0.12)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          borderRadius: '14px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.25)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Lightbulb size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.725rem', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Recommended Next Step
              </div>
              <div style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                {recommendation.text}
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (recommendation.action === 'upload') onOpenUpload();
              else if (recommendation.action === 'quiz' || recommendation.action === 'weak-practice') {
                onNavigate('ai-study');
              } else if (recommendation.action === 'exam' || recommendation.action === 'mock-exam') {
                onNavigate('mock-exam');
              } else {
                onStartStudying();
              }
            }}
          >
            {recommendation.buttonText} <ArrowRight size={14} />
          </button>
        </div>
      )}


      {/* Real Study Progress Metrics Card & Active Exam */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* Real Study Progress Card (Calculated strictly from real records) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={20} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Authentic Progress</h3>
              </div>
              <span className="badge badge-cyan">Real Assessment Data</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Notes</div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {progress?.totalNotes || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '4px', fontWeight: 600 }}>
                  Personal Study Vault
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Questions Attempted</div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {progress?.questionsAttempted || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#818cf8', marginTop: '4px', fontWeight: 600 }}>
                  Assessment Drills
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Accuracy Rate</div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {progress?.averageScore !== null && progress?.averageScore !== undefined ? `${progress.averageScore}%` : '—'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px', fontWeight: 600 }}>
                  {progress?.questionsAttempted > 0 ? 'Calculated Accuracy' : 'No quizzes yet'}
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '16px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Subjects</div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {progress?.totalSubjects || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#c084fc', marginTop: '4px', fontWeight: 600 }}>
                  Dynamic Subjects
                </div>
              </div>
            </div>
          </div>

          <button
            className="btn btn-outline-primary"
            style={{ marginTop: '20px', width: '100%' }}
            onClick={() => onNavigate('progress')}
          >
            View Full Study Analytics <ArrowRight size={16} />
          </button>
        </div>

        {/* Exam Readiness & Upcoming Exam Card (Requirement #22) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} color="#a855f7" />
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Exam Readiness</h3>
              </div>
              <span className={`badge ${progress?.examReadiness ? 'badge-success' : 'badge-neutral'}`}>
                {progress?.examReadiness ? `${progress.examReadiness}% Ready` : 'Unassessed'}
              </span>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-glass)',
              borderRadius: '16px',
              padding: '20px'
            }}>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {progress?.examReadiness !== null && progress?.examReadiness !== undefined ? `${progress.examReadiness}% Readiness` : 'No Exam Attempts Yet'}
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
                {progress?.examReadinessExplanation || 'Take practice quizzes or a timed exam to evaluate your syllabus readiness.'}
              </div>

              {progress?.activeExam && (
                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px', marginTop: '12px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 700 }}>
                    Target: {progress.activeExam.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {countdownString || 'Schedule Active'}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ marginTop: '20px', width: '100%' }}
            onClick={() => onNavigate('mock-exam')}
          >
            Start Timed Mock Exam <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* DYNAMIC WEAK TOPICS SECTION (Requirement #4, #18, Part 11) */}
      <div className="card" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} color="#f87171" />
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              Targeted Remediation: Weak Topics
            </h3>
          </div>
          {weakTopics.length > 0 && <span className="badge badge-danger">Needs Practice</span>}
        </div>

        {weakTopics.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
            {weakTopics.slice(0, 3).map((wt, i) => (
              <div key={i} style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{wt.topic}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {wt.reason}
                  </div>
                </div>

                <button
                  className="btn btn-sm btn-danger"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => onNavigate('ai-study')}
                >
                  <Target size={14} /> 🎯 Practice Weak Topic
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Complete a quiz to identify weak topics.
          </p>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Quick Actions
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div className="card card-interactive" onClick={onOpenUpload} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UploadCloud size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Upload Notes</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Add new study material</div>
            </div>
          </div>

          <div className="card card-interactive" onClick={() => onNavigate('ai-study')} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ListChecks size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Generate MCQs</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Practice from notes</div>
            </div>
          </div>

          <div className="card card-interactive" onClick={() => onNavigate('notes')} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Notes Library</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Browse your notes library</div>
            </div>
          </div>

          <div className="card card-interactive" onClick={() => onNavigate('mock-exam')} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Exam Mode</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Timed mock test</div>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Learning Section (Real Notes) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>Continue Learning</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Your uploaded notes and study materials
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('notes')}>
            Browse Library
          </button>
        </div>

        {hasNotes ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
            {recentNotes.map(note => (
              <div
                key={note.id}
                className="card card-interactive"
                onClick={() => onSelectNote(note.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span className="badge badge-primary">{note.subject}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{note.fileType || 'PDF'} &bull; Ready to Study</span>
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  {note.title}
                </h4>
                <div style={{ fontSize: '0.8rem', color: '#38bdf8', marginBottom: '12px' }}>
                  Topic: <strong>{note.topic}</strong>
                </div>
                <p style={{
                  fontSize: '0.825rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  marginBottom: '16px'
                }}>
                  {note.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {note.numPages ? `${note.numPages} pages` : 'Document'}
                  </div>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectNote(note.id);
                    }}
                  >
                    Open Workspace <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Clean Real Empty State (Part 11) */
          <div className="empty-state-card">
            <div className="empty-state-icon">
              <BookOpen size={32} />
            </div>
            <div className="empty-state-title" style={{ color: 'var(--text-primary)' }}>No study materials yet.</div>
            <div className="empty-state-desc" style={{ color: 'var(--text-secondary)' }}>
              Upload your study materials and let StudyBuddy turn them into interactive summaries, practice questions, and flashcards.
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button className="btn btn-primary" onClick={onOpenUpload} id="empty-state-upload-notes-btn">
                <UploadCloud size={16} /> Upload Study Material
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
