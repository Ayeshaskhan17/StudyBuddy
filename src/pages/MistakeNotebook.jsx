import React, { useState, useEffect } from 'react';
import {
  AlertCircle, CheckCircle2, RotateCcw, Trash2, Check,
  BookOpen, Sparkles, Filter, CheckCheck, RefreshCw
} from 'lucide-react';
import { api } from '../services/apiService';

export default function MistakeNotebook({ onShowToast }) {
  const [mistakes, setMistakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [practiceModalMistake, setPracticeModalMistake] = useState(null);
  const [selectedPracticeOption, setSelectedPracticeOption] = useState(null);
  const [practiceSubmitted, setPracticeSubmitted] = useState(false);

  useEffect(() => {
    loadMistakes();
  }, []);

  const loadMistakes = async () => {
    try {
      setLoading(true);
      const items = await api.getMistakes();
      setMistakes(items);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      onShowToast({ type: 'error', title: 'Error', message: 'Failed to load mistakes.' });
    }
  };

  const handleRemove = async (id, topic) => {
    try {
      await api.removeMistake(id);
      setMistakes(prev => prev.filter(m => m.id !== id));
      onShowToast({
        type: 'info',
        title: 'Removed',
        message: `Removed question on "${topic}" from your notebook.`
      });
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const handleMarkMastered = async (id, topic) => {
    try {
      await api.updateMistakeStatus(id, 'mastered');
      setMistakes(prev => prev.map(m => m.id === id ? { ...m, status: 'mastered' } : m));
      onShowToast({
        type: 'success',
        title: 'Concept Mastered! 🎓',
        message: `Marked "${topic}" as mastered.`
      });
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const handleOpenPractice = (item) => {
    setPracticeModalMistake(item);
    setSelectedPracticeOption(null);
    setPracticeSubmitted(false);
  };

  const handleCheckPractice = () => {
    setPracticeSubmitted(true);
    if (selectedPracticeOption === practiceModalMistake.correctAnswer) {
      handleMarkMastered(practiceModalMistake.id, practiceModalMistake.topic);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', padding: '4px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
          <AlertCircle size={14} /> Revision & Mistake Notebook
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
          My Mistakes Notebook
        </h1>
        <p style={{ fontSize: '0.925rem', color: '#94a3b8', margin: '4px 0 0' }}>
          Questions missed during your practice quizzes are stored here to guarantee 100% exam retention
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
          <div>Retrieving your mistake logs...</div>
        </div>
      ) : mistakes.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {mistakes.map(item => {
            const isMastered = item.status === 'mastered';

            return (
              <div
                key={item.id}
                className="card"
                style={{
                  borderLeft: isMastered ? '4px solid #10b981' : '4px solid #f43f5e',
                  padding: '24px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${isMastered ? 'badge-success' : 'badge-danger'}`}>
                      {isMastered ? 'Mastered ✓' : 'Needs Revision'}
                    </span>
                    <span className="badge badge-primary">{item.subject}</span>
                    <span style={{ fontSize: '0.8rem', color: '#38bdf8' }}>Topic: <strong>{item.topic}</strong></span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleOpenPractice(item)}
                    >
                      <RotateCcw size={14} /> Practice Again
                    </button>
                    {!isMastered && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleMarkMastered(item.id, item.topic)}
                      >
                        <Check size={14} /> Mark Mastered
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-secondary btn-icon"
                      onClick={() => handleRemove(item.id, item.topic)}
                      style={{ color: '#fb7185' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '14px' }}>
                  {item.question}
                </h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '12px',
                  marginBottom: '14px'
                }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Correct Answer
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff' }}>
                      {item.correctAnswer}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.25)', borderRadius: '10px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fb7185', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Your Recorded Answer
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff' }}>
                      {item.studentAnswer}
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', padding: '12px 16px', fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  <strong style={{ color: '#38bdf8' }}>Explanation: </strong>
                  {item.explanation}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state-card">
          <div className="empty-state-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <CheckCheck size={32} />
          </div>
          <div className="empty-state-title">Great job! No mistakes saved yet.</div>
          <div className="empty-state-desc">
            When you take a practice quiz and answer an MCQ incorrectly, it will automatically be stored here for targeted revision.
          </div>
        </div>
      )}

      {/* Practice Again Modal */}
      {practiceModalMistake && (
        <div className="modal-overlay" onClick={() => setPracticeModalMistake(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff' }}>
                Re-attempt Concept: {practiceModalMistake.topic}
              </h3>
            </div>
            <div className="modal-body">
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', color: '#ffffff' }}>
                {practiceModalMistake.question}
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {[practiceModalMistake.correctAnswer, practiceModalMistake.studentAnswer, 'None of the above'].map((opt, i) => (
                  <div
                    key={i}
                    onClick={() => !practiceSubmitted && setSelectedPracticeOption(opt)}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: selectedPracticeOption === opt ? '2px solid #38bdf8' : '1px solid var(--border-glass)',
                      background: selectedPracticeOption === opt ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontWeight: selectedPracticeOption === opt ? 600 : 500
                    }}
                  >
                    {opt}
                  </div>
                ))}
              </div>

              {practiceSubmitted && (
                <div style={{
                  padding: '14px',
                  borderRadius: '8px',
                  background: selectedPracticeOption === practiceModalMistake.correctAnswer ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                  border: `1px solid ${selectedPracticeOption === practiceModalMistake.correctAnswer ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                  color: selectedPracticeOption === practiceModalMistake.correctAnswer ? '#34d399' : '#fb7185',
                  fontSize: '0.9rem'
                }}>
                  {selectedPracticeOption === practiceModalMistake.correctAnswer
                    ? '🎉 Correct! Concept successfully mastered and updated.'
                    : `⚠️ Not quite right. Correct answer is: ${practiceModalMistake.correctAnswer}`}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPracticeModalMistake(null)}>Close</button>
              {!practiceSubmitted && (
                <button
                  className="btn btn-primary"
                  onClick={handleCheckPractice}
                  disabled={!selectedPracticeOption}
                >
                  Verify Answer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
