import React, { useState, useEffect } from 'react';
import {
  RotateCcw, ChevronLeft, ChevronRight, CheckCircle2,
  AlertCircle, Sparkles, Layers, BookOpen, Shuffle
} from 'lucide-react';
import { api } from '../services/apiService';

export default function InteractiveFlashcards({
  flashcards = [],
  currentNoteId,
  noteId,
  subject = '',
  unit = '',
  title = '',
  currentUser,
  loading = false,
  onRegenerate,
  onShowToast
}) {
  const effectiveNoteId = currentNoteId || noteId || '';

  // Mandatory Requirement 12: Validate source before rendering
  const validCards = (flashcards || []).filter(fc => {
    if (!fc || typeof fc !== 'object') return false;

    // Strict noteId validation:
    if (effectiveNoteId && fc.noteId && fc.noteId !== effectiveNoteId) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[FLASHCARD SOURCE MISMATCH]', {
          currentNoteId: effectiveNoteId,
          cardNoteId: fc.noteId,
          cardSubject: fc.subject,
          currentSubject: subject
        });
      }
      return false;
    }

    // Strict userId validation:
    if (currentUser?.id && fc.userId && fc.userId !== currentUser.id) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[FLASHCARD SOURCE MISMATCH]', {
          currentUserId: currentUser.id,
          cardUserId: fc.userId,
          cardNoteId: fc.noteId
        });
      }
      return false;
    }

    return true;
  });

  const [cards, setCards] = useState(validCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardStatus, setCardStatus] = useState({}); // { [id]: 'known' | 'review' }

  // Mandatory Requirement 5 & 6: Clear and reload state when noteId or flashcards change
  useEffect(() => {
    setIsFlipped(false);
    setCurrentIndex(0);
    setCardStatus({});
    setCards(validCards);

    if (effectiveNoteId) {
      api.getFlashcardProgress(effectiveNoteId).then(progress => {
        if (progress?.cardMap) {
          setCardStatus(progress.cardMap);
        } else if (progress && typeof progress === 'object') {
          setCardStatus(progress);
        }
      }).catch(() => {});
    }
  }, [effectiveNoteId, flashcards]);

  // Keyboard shortcut listener (Space = Flip, ArrowLeft = Prev, ArrowRight = Next)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, cards.length]);

  // Mandatory Requirement 5: Loading State
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '3px solid rgba(99, 102, 241, 0.2)',
          borderTopColor: '#6366f1',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
          Loading flashcards for {subject || title || 'study material'}...
        </div>
        <div style={{ fontSize: '0.85rem', marginTop: '6px' }}>Fetching note-isolated active-recall study cards.</div>
      </div>
    );
  }

  // Mandatory Requirement 9: No fallback to previous or generic content
  if (!cards || cards.length === 0) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Requirement 13: Display Current Source */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 18px',
          background: 'rgba(30, 41, 59, 0.6)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={16} color="#6366f1" /> Flashcards
            </span>
            <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
              Source: {title || 'study note'}
            </span>
            <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
              Subject: {subject || 'General'}
            </span>
            {unit && (
              <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                Unit: {unit}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Grounded in this uploaded document
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <Layers size={38} color="#6366f1" style={{ marginBottom: '14px', display: 'block', margin: '0 auto 14px' }} />
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
            Flashcards could not be generated for this study material.
          </div>
          <div style={{ fontSize: '0.875rem', marginTop: '8px', maxWidth: '440px', margin: '8px auto 20px', color: '#94a3b8' }}>
            Ensure your document has extractable text or click below to trigger fresh AI active-recall extraction.
          </div>
          {onRegenerate && (
            <button
              className="btn btn-primary"
              onClick={onRegenerate}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', fontWeight: 700 }}
            >
              <RotateCcw size={16} /> Retry Generation
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex] || cards[0];
  const total = cards.length;

  const knownCount = Object.values(cardStatus).filter(s => s === 'known').length;
  const reviewCount = Object.values(cardStatus).filter(s => s === 'review').length;
  const progressPct = Math.round(((knownCount + reviewCount) / total) * 100);

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < total - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const markKnown = (e) => {
    e?.stopPropagation();
    const cardId = currentCard.id || `card-${currentIndex}`;
    setCardStatus(prev => ({ ...prev, [cardId]: 'known' }));
    api.recordFlashcardReview({
      cardId,
      status: 'known',
      noteId: currentCard.noteId || effectiveNoteId
    }).catch(() => {});
    if (onShowToast) {
      onShowToast({ type: 'success', title: 'Marked as Known', message: 'Card recorded to mastery.' });
    }
    handleNext();
  };

  const markReview = (e) => {
    e?.stopPropagation();
    const cardId = currentCard.id || `card-${currentIndex}`;
    setCardStatus(prev => ({ ...prev, [cardId]: 'review' }));
    api.recordFlashcardReview({
      cardId,
      status: 'review',
      noteId: currentCard.noteId || effectiveNoteId
    }).catch(() => {});
    if (onShowToast) {
      onShowToast({ type: 'info', title: 'Needs Review', message: 'Added to your revision queue.' });
    }
    handleNext();
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    const shuffled = [...cards].sort(() => 0.5 - Math.random());
    setCards(shuffled);
    setCurrentIndex(0);
    if (onShowToast) {
      onShowToast({ type: 'info', title: 'Cards Shuffled', message: 'Ready for active recall practice.' });
    }
  };

  const handleReset = () => {
    setIsFlipped(false);
    setCurrentIndex(0);
    setCardStatus({});
  };

  const cardType = currentCard.type || 'concept';
  const typeColors = {
    definition: '#38bdf8',
    concept: '#a855f7',
    comparison: '#10b981',
    process: '#f59e0b',
    example: '#ec4899',
    formula: '#6366f1'
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Mandatory Requirement 13: Display Current Source */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '12px 18px',
        background: 'rgba(30, 41, 59, 0.6)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={16} color="#6366f1" /> Flashcards
          </span>
          <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
            Source: {title || 'study note'}
          </span>
          <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
            Subject: {subject || 'General'}
          </span>
          {unit && (
            <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
              Unit: {unit}
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <CheckCircle2 size={14} /> Generated from this uploaded study material
        </div>
      </div>
      {/* Top Controls & Metrics */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
            Card {currentIndex + 1} of {total}
          </span>
          <span style={{
            fontSize: '0.72rem',
            padding: '3px 8px',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: typeColors[cardType] || '#38bdf8',
            fontWeight: 700,
            textTransform: 'uppercase'
          }}>
            {cardType}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.8rem' }}>
          <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Known: {knownCount}</span>
          <span style={{ color: '#f59e0b', fontWeight: 600 }}>× Review: {reviewCount}</span>
          <button
            onClick={handleShuffle}
            title="Shuffle Deck"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Shuffle size={14} /> Shuffle
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: '6px',
        background: 'rgba(255, 255, 255, 0.06)',
        borderRadius: '999px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${progressPct}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #38bdf8, #6366f1)',
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Flip Card Container */}
      <div
        onClick={() => setIsFlipped(prev => !prev)}
        style={{
          perspective: '1200px',
          cursor: 'pointer',
          minHeight: '280px',
          userSelect: 'none'
        }}
      >
        <div style={{
          position: 'relative',
          width: '100%',
          minHeight: '280px',
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}>
          {/* FRONT FACE */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 27, 75, 0.85))',
            border: '1.5px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '16px',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                {currentCard.topic || 'Concept Prompt'}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700 }}>
                [Click or Space to Flip]
              </span>
            </div>

            <div style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#f8fafc',
              lineHeight: 1.5,
              textAlign: 'center',
              padding: '20px 0'
            }}>
              {currentCard.front}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.75rem',
              color: '#64748b'
            }}>
              <span>💡 Think of the answer before flipping</span>
              <span>🔄 Flip Card</span>
            </div>
          </div>

          {/* BACK FACE */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(20, 83, 45, 0.3))',
            border: '1.5px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '16px',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(16, 185, 129, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>
                ✓ Key Explanation / Answer
              </span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {currentCard.topic}
              </span>
            </div>

            <div style={{
              fontSize: '1.05rem',
              fontWeight: 500,
              color: '#f8fafc',
              lineHeight: 1.6,
              whiteSpace: 'pre-line',
              textAlign: 'center',
              padding: '16px 0'
            }}>
              {currentCard.back}
            </div>

            {/* Answer Rating Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              paddingTop: '8px'
            }}>
              <button
                onClick={markKnown}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: '1px solid #10b981',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle2 size={16} /> I Knew This
              </button>
              <button
                onClick={markReview}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: '1px solid #f59e0b',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#fbbf24',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <AlertCircle size={16} /> Need Review
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '8px'
      }}>
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="btn btn-secondary btn-sm"
          style={{ opacity: currentIndex === 0 ? 0.4 : 1 }}
        >
          <ChevronLeft size={16} /> Previous
        </button>

        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
          Tip: Press <kbd style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1' }}>Space</kbd> to flip, <kbd style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1' }}>&larr;</kbd> <kbd style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1' }}>&rarr;</kbd> to navigate
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === total - 1}
          className="btn btn-secondary btn-sm"
          style={{ opacity: currentIndex === total - 1 ? 0.4 : 1 }}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
