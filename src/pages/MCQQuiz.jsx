import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, XCircle, AlertTriangle, ArrowRight, RotateCcw,
  Sparkles, Award, BookmarkPlus, ChevronRight, HelpCircle, Flame,
  Timer, Flag, MessageSquare, ChevronLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/apiService';

export default function MCQQuiz({
  questions = [],
  note,
  quizId,
  quizSession,
  subject,
  topic,
  onExit,
  onPracticeWeakTopics,
  onShowToast,
  onAskAI
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [index]: selectedOptionIndex }
  const [revealedQuestions, setRevealedQuestions] = useState({}); // { [index]: true }
  const [flagged, setFlagged] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hard Subject Validation: Filter out any question not belonging to the selected subject
  const activeSubject = (subject || quizSession?.subject || note?.subject || '').trim();
  const activeTopic = topic || quizSession?.topic || note?.topic || '';

  const validatedQuestions = React.useMemo(() => {
    if (!activeSubject) return questions;
    const lowerSub = activeSubject.toLowerCase();
    const result = (questions || []).filter(q => {
      const qSub = (q.subject || '').trim().toLowerCase();
      // Must match subject
      const matches = !qSub || qSub === lowerSub;
      if (!matches) {
        console.warn(`[MCQQuiz] REJECTED mismatched question: expected "${activeSubject}", got "${q.subject}"`, q.question);
      }
      return matches;
    });
    return result;
  }, [questions, activeSubject]);

  // Timer
  useEffect(() => {
    if (isSubmitted) return;
    const interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isSubmitted]);

  if (!validatedQuestions || validatedQuestions.length === 0) {
    return (
      <div className="card empty-state-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <HelpCircle size={36} color="#6366f1" style={{ marginBottom: '12px' }} />
        <div className="empty-state-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
          No Questions Available for {activeSubject || 'this Subject'}
        </div>
        <div className="empty-state-desc" style={{ color: '#94a3b8', margin: '8px 0 20px 0' }}>
          Select or upload notes for {activeSubject || 'your subject'} to generate isolated practice questions.
        </div>
        <button className="btn btn-primary" onClick={onExit}>Return to AI Study</button>
      </div>
    );
  }

  const currentQ = validatedQuestions[currentIndex] || validatedQuestions[0];
  const total = validatedQuestions.length;
  const isLast = currentIndex === total - 1;
  const selectedOpt = selectedAnswers[currentIndex];
  const isRevealed = revealedQuestions[currentIndex];
  const isCorrect = selectedOpt !== undefined && selectedOpt === currentQ.correctIndex;

  const handleSelectOption = (optIndex) => {
    if (isSubmitted || isRevealed) return;
    setSelectedAnswers(prev => ({ ...prev, [currentIndex]: optIndex }));
    setRevealedQuestions(prev => ({ ...prev, [currentIndex]: true }));
  };

  const handleNext = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    setIsSubmitted(true);

    let correct = 0;
    const topicMistakes = {};

    validatedQuestions.forEach((q, idx) => {
      const chosen = selectedAnswers[idx];
      if (chosen === q.correctIndex) {
        correct++;
      } else {
        const top = q.topic || 'General';
        topicMistakes[top] = (topicMistakes[top] || 0) + 1;
      }
    });

    const scorePct = Math.round((correct / total) * 100);

    // Fire celebratory confetti if high score
    if (scorePct >= 70) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }

    // Submit results to real backend API to store attempts and mistakes persistently
    try {
      await api.submitQuiz({
        quizId: quizId || quizSession?.id,
        noteId: note?.id || quizSession?.noteId,
        subject: activeSubject || note?.subject || 'Engineering & Science',
        topic: currentQ.topic || activeTopic || 'General Topic',
        totalQuestions: total,
        correctCount: correct,
        wrongCount: total - correct,
        timeTakenSeconds: timerSeconds,
        answers: validatedQuestions.map((q, idx) => ({
          question: q.question,
          topic: q.topic || activeTopic || 'General',
          studentAnswer: selectedAnswers[idx] !== undefined ? q.options[selectedAnswers[idx]] : 'Unanswered',
          correctAnswer: q.options[q.correctIndex] || q.correctAnswer,
          isCorrect: selectedAnswers[idx] === q.correctIndex,
          explanation: q.explanation || 'Review the study notes to master this concept.'
        }))
      });
    } catch (err) {
      console.warn('Could not persist quiz attempt to backend:', err.message);
    } finally {
      setIsSubmitting(false);
    }

    if (onShowToast) {
      onShowToast({
        type: scorePct >= 70 ? 'success' : 'warning',
        title: 'Quiz Completed!',
        message: `You scored ${correct}/${total} (${scorePct}%). Mistakes saved to your Notebook.`
      });
    }
  };

  const toggleFlag = () => {
    setFlagged(prev => ({ ...prev, [currentIndex]: !prev[currentIndex] }));
    if (onShowToast) {
      onShowToast({
        type: 'info',
        title: flagged[currentIndex] ? 'Question Unflagged' : 'Question Flagged',
        message: 'Marked for later review.'
      });
    }
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Score stats for submission review screen
  let correctCount = 0;
  let incorrectCount = 0;
  const weakTopicsMap = {};

  validatedQuestions.forEach((q, idx) => {
    const chosen = selectedAnswers[idx];
    if (chosen === q.correctIndex) {
      correctCount++;
    } else {
      incorrectCount++;
      const topicName = q.topic || 'General Topic';
      weakTopicsMap[topicName] = (weakTopicsMap[topicName] || 0) + 1;
    }
  });

  const scorePercentage = Math.round((correctCount / total) * 100);
  const weakTopicsList = Object.keys(weakTopicsMap);

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <button
            onClick={onExit}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38bdf8',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: 0,
              marginBottom: '4px'
            }}
          >
            <ChevronLeft size={16} /> Back to Note Workspace
          </button>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
            {note?.topic || 'Interactive Practice Quiz'}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '6px 12px',
            borderRadius: '999px',
            fontSize: '0.85rem',
            color: '#f8fafc',
            fontWeight: 600
          }}>
            <Timer size={15} color="#38bdf8" />
            <span>{formatTimer(timerSeconds)}</span>
          </div>

          <span className="badge badge-primary" style={{ fontWeight: 700, letterSpacing: '0.02em' }}>
            📚 {activeSubject || 'StudyBuddy AI'}
          </span>
          {activeTopic && (
            <span className="badge badge-secondary" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              🎯 {activeTopic}
            </span>
          )}
        </div>
      </div>

      {!isSubmitted ? (
        /* ACTIVE QUIZ QUESTION RUNNER */
        <div className="card" style={{ padding: '32px' }}>
          {/* Progress Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '0.925rem', fontWeight: 700, color: '#38bdf8' }}>
              Question {currentIndex + 1} of {total}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="badge badge-neutral">{currentQ.difficulty || 'Medium'}</span>
              <span className="badge badge-secondary">{currentQ.topic}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{
            width: '100%',
            height: '6px',
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: '999px',
            overflow: 'hidden',
            marginBottom: '28px'
          }}>
            <div style={{
              width: `${((currentIndex + 1) / total) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #38bdf8, #6366f1)',
              transition: 'width 0.3s ease'
            }} />
          </div>

          {/* Question Text */}
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#f8fafc',
            lineHeight: 1.5,
            marginBottom: '24px'
          }}>
            {currentQ.question}
          </h3>

          {/* Options List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {currentQ.options.map((option, optIdx) => {
              const isSelected = selectedOpt === optIdx;
              const isCorrectOpt = optIdx === currentQ.correctIndex;
              const optionLabel = String.fromCharCode(65 + optIdx); // A, B, C, D

              let border = '1px solid rgba(255, 255, 255, 0.08)';
              let bg = 'rgba(255, 255, 255, 0.02)';
              let textColor = '#cbd5e1';

              if (isRevealed) {
                if (isCorrectOpt) {
                  border = '1.5px solid #10b981';
                  bg = 'rgba(16, 185, 129, 0.15)';
                  textColor = '#34d399';
                } else if (isSelected && !isCorrectOpt) {
                  border = '1.5px solid #ef4444';
                  bg = 'rgba(239, 68, 68, 0.15)';
                  textColor = '#f87171';
                }
              } else if (isSelected) {
                border = '1.5px solid #38bdf8';
                bg = 'rgba(56, 189, 248, 0.1)';
                textColor = '#f8fafc';
              }

              return (
                <div
                  key={optIdx}
                  onClick={() => handleSelectOption(optIdx)}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border,
                    background: bg,
                    cursor: isRevealed ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isRevealed
                      ? (isCorrectOpt ? '#10b981' : isSelected ? '#ef4444' : 'rgba(255, 255, 255, 0.05)')
                      : (isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.05)'),
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    flexShrink: 0
                  }}>
                    {isRevealed && isCorrectOpt ? '✓' : isRevealed && isSelected ? '✗' : optionLabel}
                  </div>
                  <div style={{
                    fontSize: '0.95rem',
                    color: textColor,
                    fontWeight: isSelected || isCorrectOpt ? 600 : 400,
                    lineHeight: 1.4
                  }}>
                    {option}
                  </div>
                </div>
              );
            })}
          </div>

          {/* IMMEDIATE PEDAGOGICAL FEEDBACK PANEL */}
          {isRevealed && (
            <div style={{
              background: isCorrect ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1.5px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                {isCorrect ? (
                  <>
                    <CheckCircle2 size={20} color="#10b981" />
                    <span style={{ fontWeight: 800, color: '#34d399', fontSize: '1rem' }}>
                      ✓ Correct Answer!
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle size={20} color="#ef4444" />
                    <span style={{ fontWeight: 800, color: '#f87171', fontSize: '1rem' }}>
                      ✗ Incorrect Answer
                    </span>
                  </>
                )}
              </div>

              {/* Correct Answer Callout if wrong */}
              {!isCorrect && (
                <div style={{ fontSize: '0.88rem', color: '#10b981', fontWeight: 700, marginBottom: '8px' }}>
                  Correct Choice: {String.fromCharCode(65 + currentQ.correctIndex)}. {currentQ.options[currentQ.correctIndex]}
                </div>
              )}

              {/* Why explanation */}
              <div style={{ fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '12px' }}>
                <strong style={{ color: '#f8fafc' }}>Why? </strong>
                {currentQ.explanation}
              </div>

              {/* Supporting Document Concept */}
              {currentQ.sourceConcept && (
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', background: 'rgba(0, 0, 0, 0.3)', padding: '6px 10px', borderRadius: '6px' }}>
                  📚 <strong>From the document:</strong> {currentQ.sourceConcept}
                </div>
              )}

              {/* Action Buttons under feedback */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                {onAskAI && (
                  <button
                    onClick={() => onAskAI(`Explain this question and concept in detail: "${currentQ.question}". Correct answer is: "${currentQ.options[currentQ.correctIndex]}".`)}
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <MessageSquare size={13} /> Ask AI About This
                  </button>
                )}
                <button
                  onClick={toggleFlag}
                  style={{
                    background: flagged[currentIndex] ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: flagged[currentIndex] ? '#fbbf24' : '#94a3b8',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Flag size={13} /> {flagged[currentIndex] ? 'Flagged' : 'Flag Question'}
                </button>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            paddingTop: '20px'
          }}>
            <button
              className="btn btn-secondary"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              Previous
            </button>

            {/* Pagination indicators */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '0 8px' }}>
              {questions.map((_, i) => {
                const isAnswered = selectedAnswers[i] !== undefined;
                const isCurr = i === currentIndex;
                const isRight = isAnswered && selectedAnswers[i] === questions[i].correctIndex;

                let bg = 'rgba(255, 255, 255, 0.08)';
                if (isAnswered) bg = isRight ? '#10b981' : '#ef4444';
                if (isCurr && !isAnswered) bg = '#38bdf8';

                return (
                  <div
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: bg,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: isCurr ? '2px solid #ffffff' : 'none'
                    }}
                  >
                    {i + 1}
                  </div>
                );
              })}
            </div>

            {isLast ? (
              <button
                className="btn btn-primary"
                onClick={handleFinish}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Finish & View Score'}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleNext}
              >
                Next Question <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* QUIZ RESULTS REVIEW SCREEN */
        <div className="card" style={{ padding: '36px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              display: 'inline-flex',
              padding: '16px',
              borderRadius: '50%',
              background: scorePercentage >= 70 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              marginBottom: '16px'
            }}>
              {scorePercentage >= 70 ? (
                <Award size={48} color="#10b981" />
              ) : (
                <AlertTriangle size={48} color="#ef4444" />
              )}
            </div>

            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 8px 0' }}>
              {scorePercentage >= 70 ? 'Excellent Performance!' : 'Needs Conceptual Revision'}
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
              You answered <strong>{correctCount}</strong> out of <strong>{total}</strong> questions correctly ({scorePercentage}%).
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginBottom: '32px'
          }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Score</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8' }}>{scorePercentage}%</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Correct Answers</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{correctCount}</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Wrong Answers</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{incorrectCount}</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Time Taken</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a5b4fc' }}>{formatTimer(timerSeconds)}</div>
            </div>
          </div>

          {/* Weak Topics Section & Practice Weak Topics */}
          {weakTopicsList.length > 0 && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '32px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fbbf24', margin: '0 0 4px 0' }}>
                    Identified Weak Topics: {weakTopicsList.join(', ')}
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0 }}>
                    Incorrect questions have been automatically logged to your <strong>Mistake Notebook</strong>.
                  </p>
                </div>

                {onPracticeWeakTopics && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onPracticeWeakTopics(weakTopicsList)}
                  >
                    <Sparkles size={14} /> Practice Weak Topics
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
            <button className="btn btn-secondary" onClick={onExit}>
              Return to Workspace
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setSelectedAnswers({});
                setRevealedQuestions({});
                setCurrentIndex(0);
                setIsSubmitted(false);
                setTimerSeconds(0);
              }}
            >
              <RotateCcw size={14} /> Retake Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
