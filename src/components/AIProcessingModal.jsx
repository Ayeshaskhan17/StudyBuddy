import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, UploadCloud, FileText, Brain, ListChecks,
  Layers, CheckCircle2, ArrowRight, X, AlertTriangle, RefreshCw
} from 'lucide-react';
import { api } from '../services/apiService';
import { progressService } from '../services/progressService';

export default function AIProcessingModal({
  isOpen,
  note,
  onClose,
  onViewStudyHub,
  warningMessage
}) {
  const [step, setStep] = useState(0);
  const [aiPackData, setAiPackData] = useState(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [processingError, setProcessingError] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const steps = [
    { label: 'Ingesting study document & validating structure...', icon: UploadCloud, color: '#38bdf8' },
    { label: 'Extracting key topics, theorems & definitions...', icon: FileText, color: '#6366f1' },
    { label: 'Generating synthesized study summary...', icon: Sparkles, color: '#ec4899' },
    { label: 'Formulating active-recall practice MCQs...', icon: Brain, color: '#a855f7' },
    { label: 'Constructing spaced-repetition flashcards...', icon: ListChecks, color: '#10b981' }
  ];

  useEffect(() => {
    if (!isOpen || !note?.id) {
      setStep(0);
      setIsReady(false);
      setAiPackData(null);
      setProcessingError(null);
      return;
    }

    let isMounted = true;
    setIsProcessingAI(true);
    setProcessingError(null);
    setStep(0);

    // Step progression timer
    const stepInterval = setInterval(() => {
      setStep(prev => {
        if (prev < steps.length - 1) return prev + 1;
        return prev;
      });
    }, 600);

    // Real backend AI processing
    api.processNoteAI(note.id)
      .then(async (aiPack) => {
        if (!isMounted) return;
        clearInterval(stepInterval);
        setStep(steps.length);
        setAiPackData(aiPack);
        setIsProcessingAI(false);
        setIsReady(true);
        // Ensure progress cache is freshly calculated for dashboard & notes library
        try {
          await progressService.fetchProgress();
        } catch (err) {
          console.warn('[AIProcessingModal] Progress refresh error:', err);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        clearInterval(stepInterval);
        setIsProcessingAI(false);
        setProcessingError(err.message || 'AI generation encountered an issue.');
      });

    return () => {
      isMounted = false;
      clearInterval(stepInterval);
    };
  }, [isOpen, note?.id]);

  if (!isOpen) return null;

  const progressPercent = isReady ? 100 : Math.min(95, Math.round(((step + 1) / (steps.length + 1)) * 100));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', padding: '32px 36px', textAlign: 'center', position: 'relative' }}>
        {/* Close Button */}
        <button
          className="btn-icon"
          onClick={onClose}
          style={{ position: 'absolute', top: '18px', right: '18px' }}
          title="Close modal"
        >
          <X size={18} color="#94a3b8" />
        </button>

        {processingError ? (
          /* ERROR STATE */
          <div>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '2px solid #ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertTriangle size={32} color="#ef4444" />
            </div>

            <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              Document Processing Notice
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '20px' }}>
              Your note has been saved to your Study Vault.
            </p>

            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '12px 16px',
              color: '#f87171',
              fontSize: '0.85rem',
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              {processingError}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={onClose}>
                Back to Dashboard
              </button>
              <button className="btn btn-primary" onClick={onViewStudyHub}>
                Open Workspace <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : !isReady ? (
          /* PROCESSING STATE */
          <div>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.1) 100%)',
              border: '2px solid rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              boxShadow: '0 0 25px rgba(56, 189, 248, 0.3)'
            }}>
              <Sparkles size={30} color="#38bdf8" className="spin" />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              Synthesizing Study Material
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '20px' }}>
              Analyzing "{note?.title || 'Uploaded Document'}"
            </p>

            {/* Progress Bar */}
            <div className="progress-bar-track" style={{ height: '8px', marginBottom: '20px' }}>
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>

            {/* Steps Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
              {steps.map((s, idx) => {
                const Icon = s.icon;
                const isCurrent = step === idx;
                const isDone = step > idx;

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: isCurrent ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                      border: isCurrent ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid transparent'
                    }}
                  >
                    <div style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: isDone ? '#10b981' : isCurrent ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: isDone ? '#ffffff' : isCurrent ? '#38bdf8' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isDone ? <CheckCircle2 size={15} /> : <Icon size={13} className={isCurrent ? 'spin' : ''} />}
                    </div>

                    <div style={{
                      fontSize: '0.825rem',
                      fontWeight: isCurrent ? 700 : 500,
                      color: isDone ? '#e2e8f0' : isCurrent ? '#38bdf8' : '#64748b'
                    }}>
                      {s.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* SUCCESS STATE */
          <div>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid #10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.35)'
            }}>
              <CheckCircle2 size={36} color="#10b981" />
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              Your AI Study Pack is Ready! 🎓
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '20px' }}>
              StudyBuddy synthesized "{note?.title}" into structured revision materials.
            </p>

            {warningMessage && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '18px',
                fontSize: '0.8rem',
                color: '#fbbf24',
                textAlign: 'left',
                display: 'flex',
                gap: '8px'
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{warningMessage}</span>
              </div>
            )}

            {/* Generated Components Summary Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.825rem' }}>✓ Concept Breakdown</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {aiPackData?.topics?.length || 1} topics extracted
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontWeight: 700, color: '#10b981', fontSize: '0.825rem' }}>✓ Active-Recall MCQs</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {aiPackData?.mcqs?.length || 10} practice questions
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontWeight: 700, color: '#a855f7', fontSize: '0.825rem' }}>✓ Revision Flashcards</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {aiPackData?.flashcards?.length || 8} study cards
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: '0.825rem' }}>✓ Memory Mnemonics</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {aiPackData?.mnemonics?.length || 3} memory hooks
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={onClose}
                style={{ flex: 1 }}
              >
                Dashboard
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1.5 }}
                onClick={onViewStudyHub}
                id="open-ai-study-pack-btn"
              >
                Open Workspace <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
