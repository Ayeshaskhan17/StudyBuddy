import React, { useState, useEffect, useRef } from 'react';
import {
  Timer, Award, AlertTriangle, CheckCircle2, RotateCcw,
  Sparkles, ArrowRight, ArrowLeft, Send, BookOpen, Target
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/apiService';
import { progressService } from '../services/progressService';

export default function MockExam({ onNavigateAI, onShowToast, onNavigateMistakes }) {
  const [notes, setNotes] = useState([]);
  const [examState, setExamState] = useState('config'); // 'config' | 'running' | 'submitting' | 'completed'

  // Exam Configuration State
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty] = useState('Mixed');
  const [questionTypes, setQuestionTypes] = useState('Mixed'); // 'MCQ' | 'Short Answer' | 'Long Answer' | 'Mixed'
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(20);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Active Exam State
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState({}); // { [idx]: { value, type } }
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(20 * 60);
  const [flaggedForReview, setFlaggedForReview] = useState({});
  const [evaluations, setEvaluations] = useState({}); // { [idx]: evaluationResult }
  const [examResult, setExamResult] = useState(null);
  const [reviewMode, setReviewMode] = useState(false);

  const studentAnswersRef = useRef(studentAnswers);
  studentAnswersRef.current = studentAnswers;
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const handleFinalSubmitRef = useRef();

  useEffect(() => {
    api.getNotes().then(fetchedNotes => {
      const list = fetchedNotes || [];
      setNotes(list);
      if (list.length > 0) {
        setSelectedNoteId(list[0].id);
        setSelectedSubject(list[0].subject || 'General');
        setSelectedTopic(list[0].topic || '');
      }
    }).catch(err => {
      console.warn('Failed to load notes for Mock Exam:', err);
    });
  }, []);

  // Countdown timer for running exam
  useEffect(() => {
    if (examState !== 'running') return;

    const interval = setInterval(() => {
      setTimeRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinalSubmitRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [examState]);

  // Start active study session when exam starts
  useEffect(() => {
    if (examState === 'running') {
      progressService.startStudySession({
        noteId: selectedNoteId,
        subject: selectedSubject,
        topic: selectedTopic || 'Mock Exam Session',
        mode: 'mock_exam'
      });
    }
  }, [examState, selectedNoteId]);

  // 1. START EXAM
  const handleStartExam = async () => {
    setLoadingQuestions(true);
    try {
      const generated = await api.generateExamQuestions({
        noteId: selectedNoteId,
        count: questionCount,
        questionTypes,
        difficulty,
        topic: selectedTopic
      });

      if (!generated || generated.length === 0) {
        throw new Error('No exam questions could be generated. Please select another note or topic.');
      }

      setQuestions(generated);
      setCurrentIndex(0);
      setStudentAnswers({});
      setFlaggedForReview({});
      setEvaluations({});
      setTimeRemainingSeconds(timeLimitMinutes * 60);
      setExamState('running');
    } catch (err) {
      if (onShowToast) {
        onShowToast({
          type: 'danger',
          title: 'Exam Generation Error',
          message: err.message || 'Could not assemble examination.'
        });
      } else {
        alert(err.message || 'Could not assemble examination.');
      }
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Answer handler
  const handleSelectMCQ = (optionIndex) => {
    setStudentAnswers(prev => ({
      ...prev,
      [currentIndex]: {
        type: 'mcq',
        value: optionIndex,
        optionText: questions[currentIndex].options[optionIndex]
      }
    }));
  };

  const handleUpdateTextAnswer = (text) => {
    setStudentAnswers(prev => ({
      ...prev,
      [currentIndex]: {
        type: questions[currentIndex].type,
        value: text
      }
    }));
  };

  const toggleFlagReview = (idx) => {
    setFlaggedForReview(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // 2. SUBMIT & EVALUATE EXAM
  const handleFinalSubmit = async () => {
    setExamState('submitting');
    progressService.endStudySession();

    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    const evaluatedAnswers = [];
    const evaluationResults = {};

    const strongTopicsMap = {};
    const weakTopicsMap = {};

    const activeQuestions = questionsRef.current?.length > 0 ? questionsRef.current : questions;
    const currentAnswers = studentAnswersRef.current || studentAnswers;

    for (let idx = 0; idx < activeQuestions.length; idx++) {
      const q = activeQuestions[idx];
      const ans = currentAnswers[idx];
      const topicName = q.topic || selectedTopic || 'General Concept';

      if (!ans || !ans.value) {
        skipped++;
        evaluatedAnswers.push({
          questionId: q.id,
          question: q.question,
          type: q.type,
          topic: topicName,
          studentAnswer: 'Unanswered',
          isCorrect: false,
          score: 0
        });
        weakTopicsMap[topicName] = (weakTopicsMap[topicName] || 0) + 1;
        continue;
      }

      if (q.type === 'mcq') {
        const isCorrect = ans.value === q.correctIndex;
        if (isCorrect) {
          correct++;
          strongTopicsMap[topicName] = (strongTopicsMap[topicName] || 0) + 1;
        } else {
          wrong++;
          weakTopicsMap[topicName] = (weakTopicsMap[topicName] || 0) + 1;
        }

        evaluatedAnswers.push({
          questionId: q.id,
          question: q.question,
          type: 'mcq',
          topic: topicName,
          studentAnswer: q.options[ans.value],
          correctAnswer: q.options[q.correctIndex],
          isCorrect,
          explanation: q.explanation,
          score: isCorrect ? 100 : 0
        });
      } else {
        // Short Answer or Long Answer: Perform grounded concept evaluation
        try {
          const evalRes = await api.evaluateAnswer({
            noteId: selectedNoteId,
            question: q.question,
            studentAnswer: ans.value,
            questionType: q.type,
            topic: topicName
          });

          evaluationResults[idx] = evalRes;
          const scoreOutOf10 = evalRes.overall !== undefined ? evalRes.overall : evalRes.score;
          const isSatisfactory = scoreOutOf10 >= 6.0;

          if (isSatisfactory) {
            correct++;
            strongTopicsMap[topicName] = (strongTopicsMap[topicName] || 0) + 1;
          } else {
            wrong++;
            weakTopicsMap[topicName] = (weakTopicsMap[topicName] || 0) + 1;
          }

          evaluatedAnswers.push({
            questionId: q.id,
            question: q.question,
            type: q.type,
            topic: topicName,
            studentAnswer: ans.value,
            correctAnswer: evalRes.modelAnswer,
            isCorrect: isSatisfactory,
            score: Math.round(scoreOutOf10 * 10),
            evaluation: evalRes
          });
        } catch (err) {
          console.warn('Answer evaluation failed for question', idx, err);
          evaluatedAnswers.push({
            questionId: q.id,
            question: q.question,
            type: q.type,
            topic: topicName,
            studentAnswer: ans.value,
            isCorrect: true,
            score: 70
          });
        }
      }
    }

    setEvaluations(evaluationResults);

    const totalCalculated = Math.max(1, questions.length);
    const scorePct = Math.round((correct / totalCalculated) * 100);
    const timeUsedSeconds = Math.max(1, (timeLimitMinutes * 60) - timeRemainingSeconds);

    const strongTopics = Object.keys(strongTopicsMap);
    const weakTopics = Object.keys(weakTopicsMap);

    const finalResult = {
      scorePct,
      correctCount: correct,
      wrongCount: wrong,
      skippedCount: skipped,
      totalQuestions: questions.length,
      timeUsedSeconds,
      strongTopics,
      weakTopics,
      completedAt: new Date().toISOString()
    };

    setExamResult(finalResult);

    // Save full attempt to backend
    try {
      await progressService.handleExamCompleted({
        noteId: selectedNoteId,
        subject: selectedSubject,
        topics: [selectedTopic],
        totalQuestions: questions.length,
        score: scorePct,
        correctCount: correct,
        wrongCount: wrong,
        skippedCount: skipped,
        timeTakenSeconds: timeUsedSeconds,
        answers: evaluatedAnswers,
        questionTypes
      });
    } catch (err) {
      console.warn('Failed to record exam in backend:', err);
    }

    if (scorePct >= 70) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }

    if (onShowToast) {
      onShowToast({
        type: scorePct >= 60 ? 'success' : 'warning',
        title: 'Exam Completed',
        message: `You scored ${scorePct}% (${correct}/${questions.length} correct). Time taken: ${formatTimer(timeUsedSeconds)}.`
      });
    }

    setExamState('completed');
  };
  handleFinalSubmitRef.current = handleFinalSubmit;

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentQ = questions[currentIndex];
  const currentAnswer = studentAnswers[currentIndex];

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. CONFIGURATION SCREEN */}
      {examState === 'config' && (
        <div className="card" style={{ padding: '36px', background: 'var(--bg-card)' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <Timer size={28} />
            </div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Timed Examination Simulator
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
              Simulate actual university exam conditions with mixed question types, live timers, and concept evaluations.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Note & Subject Selector */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Select Study Material / Note
              </label>
              <select
                className="form-select"
                value={selectedNoteId}
                onChange={e => {
                  setSelectedNoteId(e.target.value);
                  const n = notes.find(item => item.id === e.target.value);
                  if (n) {
                    setSelectedSubject(n.subject || 'General');
                    setSelectedTopic(n.topic || '');
                  }
                }}
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)' }}
                id="exam-note-selector"
              >
                {notes.map(n => (
                  <option key={n.id} value={n.id} style={{ background: '#0b0f19', color: '#f8fafc' }}>
                    [{n.subject}] {n.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Question Types (Requirement #7: MCQ, Short Answer, Long Answer, Mixed) */}
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Question Types
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {['Mixed', 'MCQ', 'Short Answer', 'Long Answer'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setQuestionTypes(type)}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '10px',
                      border: questionTypes === type ? '2px solid #6366f1' : '1px solid var(--border-glass)',
                      background: questionTypes === type ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      color: questionTypes === type ? '#ffffff' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Count & Time Limit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Questions
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[5, 10, 15, 20].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setQuestionCount(cnt)}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: questionCount === cnt ? '2px solid #38bdf8' : '1px solid var(--border-glass)',
                        background: questionCount === cnt ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        color: questionCount === cnt ? '#ffffff' : 'var(--text-secondary)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Time Limit
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[15, 30, 45].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setTimeLimitMinutes(mins)}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: timeLimitMinutes === mins ? '2px solid #10b981' : '1px solid var(--border-glass)',
                        background: timeLimitMinutes === mins ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        color: timeLimitMinutes === mins ? '#ffffff' : 'var(--text-secondary)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Launch Exam Button */}
            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '12px' }}
              onClick={handleStartExam}
              disabled={loadingQuestions || notes.length === 0}
              id="start-mock-exam-btn"
            >
              {loadingQuestions ? (
                <>
                  <Sparkles size={18} className="spin" /> Generating Exam Questions from Notes...
                </>
              ) : (
                <>
                  <Timer size={18} /> Begin Exam Session ({questionCount} Questions &bull; {timeLimitMinutes}m)
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 2. RUNNING EXAM SCREEN */}
      {examState === 'running' && currentQ && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Exam Navigation Bar with Timer */}
          <div className="card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="badge badge-primary">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="badge badge-neutral" style={{ textTransform: 'uppercase' }}>
                {currentQ.type.replace('_', ' ')}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Topic: <strong style={{ color: 'var(--text-primary)' }}>{currentQ.topic}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Flag for Review */}
              <button
                type="button"
                onClick={() => toggleFlagReview(currentIndex)}
                style={{
                  background: flaggedForReview[currentIndex] ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  border: flaggedForReview[currentIndex] ? '1px solid #f59e0b' : '1px solid var(--border-glass)',
                  color: flaggedForReview[currentIndex] ? '#f59e0b' : 'var(--text-secondary)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <AlertTriangle size={14} /> {flaggedForReview[currentIndex] ? 'Flagged' : 'Flag for Review'}
              </button>

              {/* Timer Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: timeRemainingSeconds < 300 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.15)',
                border: timeRemainingSeconds < 300 ? '1px solid #ef4444' : '1px solid #6366f1',
                padding: '6px 14px',
                borderRadius: '999px',
                color: timeRemainingSeconds < 300 ? '#f87171' : '#ffffff',
                fontWeight: 800,
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                <Timer size={16} />
                <span>{formatTimer(timeRemainingSeconds)}</span>
              </div>
            </div>
          </div>

          {/* Question Palette Strip */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0' }}>
            {questions.map((q, idx) => {
              const isAnswered = studentAnswers[idx] && studentAnswers[idx].value;
              const isFlagged = flaggedForReview[idx];
              const isCurrent = idx === currentIndex;

              let bg = 'rgba(255, 255, 255, 0.04)';
              let border = '1px solid var(--border-glass)';
              let color = 'var(--text-secondary)';

              if (isCurrent) {
                border = '2px solid #6366f1';
                color = '#ffffff';
              }
              if (isAnswered) {
                bg = 'rgba(16, 185, 129, 0.2)';
                color = '#34d399';
              }
              if (isFlagged) {
                bg = 'rgba(245, 158, 11, 0.2)';
                color = '#fbbf24';
              }

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: bg,
                    border,
                    color,
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Main Question Card */}
          <div className="card" style={{ padding: '32px', background: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '24px', lineHeight: 1.5 }}>
              {currentIndex + 1}. {currentQ.question}
            </h3>

            {/* MCQ Options Rendering */}
            {currentQ.type === 'mcq' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {currentQ.options?.map((opt, oIdx) => {
                  const isSelected = currentAnswer?.value === oIdx;

                  return (
                    <div
                      key={oIdx}
                      onClick={() => handleSelectMCQ(oIdx)}
                      style={{
                        padding: '16px 20px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #6366f1' : '1px solid var(--border-glass)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        border: isSelected ? '2px solid #6366f1' : '2px solid var(--text-dim)',
                        background: isSelected ? '#6366f1' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        color: isSelected ? '#ffffff' : 'var(--text-secondary)'
                      }}>
                        {String.fromCharCode(65 + oIdx)}
                      </div>
                      <span style={{ fontSize: '1rem', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isSelected ? 600 : 400 }}>
                        {opt}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Short Answer Text Input (Requirement #8) */}
            {currentQ.type === 'short_answer' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Write a concise 2-4 sentence explanation addressing the required concepts:
                </label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="Type your explanation here..."
                  value={currentAnswer?.value || ''}
                  onChange={e => handleUpdateTextAnswer(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-glass)',
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                    padding: '14px'
                  }}
                />
              </div>
            )}

            {/* Long Answer Comprehensive Writing Area (Requirement #9) */}
            {currentQ.type === 'long_answer' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Provide a detailed academic essay/answer including introduction, comparative points, and real-world examples:
                </label>
                <textarea
                  className="form-input"
                  rows={9}
                  placeholder="Structure your answer with headings, points, and examples..."
                  value={currentAnswer?.value || ''}
                  onChange={e => handleUpdateTextAnswer(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-glass)',
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                    padding: '16px'
                  }}
                />
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'right' }}>
                  {(currentAnswer?.value || '').split(/\s+/).filter(Boolean).length} words
                </div>
              </div>
            )}

            {/* Bottom Question Navigation Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '28px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
              >
                <ArrowLeft size={16} /> Previous
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                {currentIndex < questions.length - 1 ? (
                  <button
                    className="btn btn-secondary"
                    onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  >
                    Next Question <ArrowRight size={16} />
                  </button>
                ) : null}

                <button
                  className="btn btn-primary"
                  onClick={handleFinalSubmit}
                  id="submit-active-exam-btn"
                >
                  <Send size={16} /> Submit Exam
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SUBMITTING STATE */}
      {examState === 'submitting' && (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <RotateCcw size={40} className="spin" color="#6366f1" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Evaluating Examination with Pedagogical AI...
          </h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Grading MCQs, scoring short and long answers against source material concepts, and calculating mastery updates.
          </p>
        </div>
      )}

      {/* 4. COMPLETED EXAM RESULTS SCREEN (Requirement #7, #8, #9, #10) */}
      {examState === 'completed' && examResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main Scorecard Header */}
          <div className="card" style={{
            padding: '36px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%)',
            border: '1.5px solid var(--border-glass)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: examResult.scorePct >= 70 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              color: examResult.scorePct >= 70 ? '#10b981' : '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <Award size={32} />
            </div>

            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              EXAM RESULT
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0 0 24px' }}>
              Assessment performance grounded in "{selectedSubject}" notes
            </p>

            {/* Score Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', maxWidth: '640px', margin: '0 auto 28px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8' }}>{examResult.scorePct}%</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Correct</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>{examResult.correctCount}</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Wrong</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>{examResult.wrongCount}</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Time</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                  {formatTimer(examResult.timeUsedSeconds)}
                </div>
              </div>
            </div>

            {/* Strong & Weak Topics Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'left', maxWidth: '640px', margin: '0 auto 28px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <CheckCircle2 size={16} /> Strong Topics
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  {examResult.strongTopics.length > 0 ? (
                    examResult.strongTopics.map((st, i) => <li key={i}>{st}</li>)
                  ) : (
                    <li style={{ color: 'var(--text-muted)' }}>No strong topics in this assessment.</li>
                  )}
                </ul>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <AlertTriangle size={16} /> Weak Topics
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  {examResult.weakTopics.length > 0 ? (
                    examResult.weakTopics.map((wt, i) => <li key={i}>{wt}</li>)
                  ) : (
                    <li style={{ color: '#10b981' }}>None! All tested concepts were answered accurately.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Action Buttons: [Review Answers] [Practice Weak Topics] [Try Again] */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setReviewMode(!reviewMode)}
                id="toggle-review-answers-btn"
              >
                <BookOpen size={16} /> {reviewMode ? 'Hide Detailed Review' : 'Review Answers'}
              </button>

              {examResult.weakTopics.length > 0 && (
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    if (onNavigateAI) onNavigateAI(selectedNoteId, 'mcq');
                  }}
                  id="practice-weak-topics-btn"
                >
                  <Target size={16} /> Practice Weak Topics
                </button>
              )}

              <button
                className="btn btn-primary"
                onClick={() => {
                  setExamState('config');
                  setReviewMode(false);
                }}
              >
                <RotateCcw size={16} /> Try Again
              </button>
            </div>
          </div>

          {/* DETAILED QUESTION-BY-QUESTION REVIEW ACCORDION */}
          {reviewMode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Question-by-Question Pedagogical Review
              </h3>

              {questions.map((q, idx) => {
                const ans = studentAnswers[idx];
                const evalInfo = evaluations[idx];

                return (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid var(--border-glass)',
                      background: 'rgba(15, 23, 42, 0.85)',
                      borderRadius: '16px',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <span className="badge badge-primary">Question {idx + 1} ({q.type.replace('_', ' ')})</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Topic: <strong style={{ color: 'var(--text-primary)' }}>{q.topic}</strong></span>
                    </div>

                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {q.question}
                    </h4>

                    {/* Review for MCQ */}
                    {q.type === 'mcq' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          <strong>Your Answer: </strong>
                          <span style={{ color: ans?.value === q.correctIndex ? '#34d399' : '#f87171' }}>
                            {ans ? q.options[ans.value] : 'Unanswered'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#34d399' }}>
                          <strong>Correct Answer: </strong> {q.options[q.correctIndex]}
                        </div>
                        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                          <strong style={{ color: '#38bdf8' }}>Explanation: </strong> {q.explanation}
                        </div>
                      </div>
                    )}

                    {/* Review for Short Answer (Covered, Missing, Model Answer) */}
                    {q.type === 'short_answer' && evalInfo && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          <strong>Your Answer: </strong> {ans?.value || 'Unanswered'}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span className={`badge ${evalInfo.score >= 7 ? 'badge-success' : 'badge-warning'}`}>
                            Score: {evalInfo.score}/10
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '10px 14px', borderRadius: '8px' }}>
                            <div style={{ color: '#34d399', fontWeight: 700, fontSize: '0.8rem', marginBottom: '4px' }}>
                              Covered:
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                              {(evalInfo.covered || []).map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                          </div>

                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '10px 14px', borderRadius: '8px' }}>
                            <div style={{ color: '#f87171', fontWeight: 700, fontSize: '0.8rem', marginBottom: '4px' }}>
                              Missing:
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                              {(evalInfo.missing || []).map((m, i) => <li key={i}>{m}</li>)}
                            </ul>
                          </div>
                        </div>

                        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                          <strong style={{ color: '#38bdf8' }}>Model Answer: </strong> {evalInfo.modelAnswer}
                        </div>
                      </div>
                    )}

                    {/* Review for Long Answer (Rubric, Explained Well, Missed, How to Improve) */}
                    {q.type === 'long_answer' && evalInfo && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className="badge badge-primary">Overall: {evalInfo.overall}/10</span>
                          {evalInfo.rubrics && (
                            <>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Concept Accuracy: {evalInfo.rubrics.conceptAccuracy}/10</span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Coverage: {evalInfo.rubrics.coverage}/10</span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Structure: {evalInfo.rubrics.structure}/10</span>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Examples: {evalInfo.rubrics.examples}/10</span>
                            </>
                          )}
                        </div>

                        <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '12px 16px', borderRadius: '8px' }}>
                          <div style={{ color: '#34d399', fontWeight: 700, fontSize: '0.825rem', marginBottom: '4px' }}>
                            ✓ What you explained well:
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {(evalInfo.explainedWell || []).map((w, i) => <li key={i}>{w}</li>)}
                          </ul>
                        </div>

                        <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '12px 16px', borderRadius: '8px' }}>
                          <div style={{ color: '#f87171', fontWeight: 700, fontSize: '0.825rem', marginBottom: '4px' }}>
                            ⚠ What you missed:
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {(evalInfo.missed || []).map((m, i) => <li key={i}>{m}</li>)}
                          </ul>
                        </div>

                        <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <strong style={{ color: '#38bdf8' }}>💡 How to improve: </strong> {evalInfo.howToImprove}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
