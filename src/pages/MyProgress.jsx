import React, { useState, useEffect } from 'react';
import {
  Flame, Award, Target, BookOpen, Layers, CheckCircle2,
  AlertTriangle, ArrowUpRight, TrendingUp, BarChart2, ShieldCheck,
  Clock, Calendar, Sparkles, RotateCw, Activity
} from 'lucide-react';
import { progressService } from '../services/progressService';

export default function MyProgress({ onNavigateAI }) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProgressData = async () => {
    setLoading(true);
    try {
      const data = await progressService.fetchProgress();
      setProgress(data);
    } catch (err) {
      console.warn('Failed to load progress in MyProgress:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgressData();
    const unsub = progressService.subscribe(p => setProgress(p));
    return () => unsub();
  }, []);

  const studyTime = progress?.studyTime || {
    todayFormatted: '0m',
    thisWeekFormatted: '0m',
    totalFormatted: '0m',
    todaySeconds: 0,
    thisWeekSeconds: 0,
    totalSeconds: 0
  };

  const accuracyGraph = progress?.accuracyGraphData || [];
  const timeline = progress?.timeline || [];
  const topicMasteryList = progress?.topicMasteryList || [];
  const weakTopics = progress?.weakTopics || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '4px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
            <TrendingUp size={14} /> Student Analytics & Mastery
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            My Study Progress
          </h1>
          <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Track authentic retention metrics, active study sessions, topic mastery, and assessment history.
          </p>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={fetchProgressData}
          disabled={loading}
        >
          <RotateCw size={14} className={loading ? 'spin' : ''} /> Refresh Metrics
        </button>
      </div>

      {/* 5 Distinct Real Progress Metrics Model (Requirements #11, #12, #13, #17) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px'
      }}>
        {/* Metric 1: Learning Progress */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Syllabus Attempted</div>
            <BookOpen size={20} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>
            {progress?.learningProgress || 0}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600, marginTop: '2px' }}>
            Syllabus Topics Studied
          </div>
        </div>

        {/* Metric 2: Practice Progress */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Practice Progress</div>
            <CheckCircle2 size={20} color="#6366f1" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>
            {progress?.practiceProgress || 0}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600, marginTop: '2px' }}>
            {progress?.questionsAttempted || 0} Questions Attempted
          </div>
        </div>

        {/* Metric 3: Exam Readiness */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Exam Readiness</div>
            <Target size={20} color="#a855f7" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>
            {progress?.examReadiness !== null && progress?.examReadiness !== undefined ? `${progress.examReadiness}%` : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 600, marginTop: '2px' }}>
            {progress?.examReadiness ? 'Assessment Composite' : 'No exam attempts yet'}
          </div>
        </div>

        {/* Metric 4: Average Score */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Accuracy Rate</div>
            <Award size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>
            {progress?.averageScore !== null && progress?.averageScore !== undefined ? `${progress.averageScore}%` : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, marginTop: '2px' }}>
            {progress?.averageScore ? `${progress.correctCount || 0} Correct &bull; ${progress.wrongCount || 0} Wrong` : 'Complete a quiz'}
          </div>
        </div>

        {/* Metric 5: Real Study Streak */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Study Streak</div>
            <Flame size={20} color="#f97316" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '6px' }}>
            {progress?.studyStreak || 0} {progress?.studyStreak === 1 ? 'Day' : 'Days'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#fb923c', fontWeight: 600, marginTop: '2px' }}>
            Active Learning Streak 🔥
          </div>
        </div>
      </div>

      {/* Real Active Study Time (Requirement #16) */}
      <div className="card" style={{ padding: '24px 28px', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={20} color="#38bdf8" />
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              Active Study Time Logged
            </h3>
          </div>
          <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
            Auto-pauses on inactivity & tab switch
          </span>
        </div>

        {studyTime.totalSeconds > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px 18px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Today</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {studyTime.todayFormatted}
              </div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px 18px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>This Week</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {studyTime.thisWeekFormatted}
              </div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px 18px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Total Time</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                {studyTime.totalFormatted}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', padding: '8px 0' }}>
            No study sessions recorded yet. Start studying a note or taking a practice quiz to record your active focus time.
          </div>
        )}
      </div>

      {/* Performance Graph & Progress Timeline (Requirements #20, #21, #22) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Performance Accuracy Trend Graph (Requirement #21) */}
        <div className="card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Performance Trend Graph
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                X-Axis: Assessment Date &bull; Y-Axis: Accuracy %
              </p>
            </div>
            <span className="badge badge-primary">Actual Scores</span>
          </div>

          {accuracyGraph.length >= 2 ? (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                height: '180px',
                paddingTop: '20px',
                borderBottom: '1.5px solid var(--border-glass)',
                gap: '10px'
              }}>
                {accuracyGraph.map((pt, i) => {
                  const heightPct = Math.max(15, pt.accuracy);
                  const isLatest = i === accuracyGraph.length - 1;

                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{ fontSize: '0.72rem', color: isLatest ? '#38bdf8' : 'var(--text-secondary)', marginBottom: '4px', fontWeight: 700 }}>
                        {pt.accuracy}%
                      </div>
                      <div style={{
                        width: '100%',
                        maxWidth: '32px',
                        height: `${heightPct}%`,
                        background: isLatest
                          ? 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)'
                          : 'linear-gradient(180deg, #6366f1 0%, #4338ca 100%)',
                        borderRadius: '6px 6px 0 0',
                        transition: 'all 0.3s ease'
                      }} />
                    </div>
                  );
                })}
              </div>

              {/* Date Labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                {accuracyGraph.map((pt, i) => (
                  <div key={i} style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    fontWeight: i === accuracyGraph.length - 1 ? 800 : 500,
                    color: i === accuracyGraph.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}>
                    {pt.date.slice(5)}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px 16px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              border: '1px dashed var(--border-glass)'
            }}>
              <Activity size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                Complete more assessments to see your progress trend.
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Takes at least 2 completed quizzes or exams to plot your learning trajectory.
              </div>
            </div>
          )}
        </div>

        {/* Real Progress Timeline (Requirement #20) */}
        <div className="card" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
            Progress Timeline
          </h3>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '0 0 20px' }}>
            Chronological log of meaningful study activity
          </p>

          {timeline.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {timeline.map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-glass)'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: item.type === 'Quiz' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                    color: item.type === 'Quiz' ? '#38bdf8' : '#818cf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {item.type === 'Quiz' ? <CheckCircle2 size={16} /> : <BookOpen size={16} />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.title}</strong>
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                        {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {item.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' }}>
              No study activity recorded yet. Take a quiz or complete flashcards to build your timeline.
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Topic Mastery Model (Requirements #13, #4, #5) */}
      <div className="card" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Dynamic Topic Mastery Breakdown
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Calculated from quiz accuracy, mistake count, and recent performance weighting.
            </p>
          </div>
          <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
            Weak &rarr; Needs Practice &rarr; Improving &rarr; Strong
          </span>
        </div>

        {topicMasteryList.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topicMasteryList.map((tm, i) => {
              const status = tm.status;
              const isWeak = status === 'Weak';
              const isNeedsPractice = status === 'Needs Practice';
              const isImproving = status === 'Improving';
              const isStrong = status === 'Strong';

              const badgeClass = isStrong ? 'badge-success' : isImproving ? 'badge-primary' : isNeedsPractice ? 'badge-warning' : 'badge-danger';

              return (
                <div key={i} style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: isWeak ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--border-glass)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span className={`badge ${badgeClass}`}>{status}</span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{tm.topic}</strong>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Mastery: <strong style={{ color: 'var(--text-primary)' }}>{tm.masteryScore}%</strong> &bull; Attempts: {tm.attemptsCount} &bull; Mistakes: {tm.mistakesCount}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: '100px', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${tm.masteryScore}%`,
                        background: isStrong ? '#10b981' : isImproving ? '#6366f1' : isNeedsPractice ? '#f59e0b' : '#ef4444',
                        borderRadius: '999px'
                      }} />
                    </div>

                    <button
                      className={`btn btn-sm ${isWeak ? 'btn-danger' : 'btn-primary'}`}
                      onClick={() => onNavigateAI(tm.noteId, 'mcq')}
                    >
                      {isWeak ? '🎯 Practice Weak Topic' : 'Practice Topic'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' }}>
            Complete a few quizzes to calculate your individual topic mastery ratings.
          </div>
        )}
      </div>
    </div>
  );
}
