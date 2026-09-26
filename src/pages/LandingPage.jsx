import React from 'react';
import {
  Sparkles, BookOpen, UploadCloud, ListChecks, Brain,
  Calendar, Award, ArrowRight, ShieldCheck, CheckCircle2, ChevronRight, Zap
} from 'lucide-react';

export default function LandingPage({ onOpenLogin, onOpenSignup }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Landing Navigation Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(5, 8, 20, 0.75)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{
          maxWidth: '1300px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)'
            }}>
              <BookOpen size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em' }}>
                Study<span style={{ color: '#38bdf8' }}>Buddy</span>
              </div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                AI Study Intelligence
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={onOpenLogin}
              id="landing-login-btn"
            >
              Sign In
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={onOpenSignup}
              id="landing-signup-btn"
            >
              Get Started Free <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Cinematic Hero Section */}
      <section style={{
        maxWidth: '1300px',
        margin: '0 auto',
        padding: '70px 24px 80px',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '40px'
      }}>
        {/* Left Hero Text */}
        <div style={{ flex: '1 1 540px', maxWidth: '640px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            padding: '6px 14px',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#38bdf8',
            marginBottom: '20px'
          }}>
            <Sparkles size={14} /> Next-Gen AI Academic Platform
          </div>

          <h1 style={{
            fontSize: '3.4rem',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '20px'
          }}>
            Turn Your Notes Into Your <span style={{
              background: 'linear-gradient(135deg, #38bdf8 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>Personal AI Tutor.</span>
          </h1>

          <p style={{
            fontSize: '1.2rem',
            color: '#94a3b8',
            lineHeight: 1.6,
            marginBottom: '32px'
          }}>
            Upload your study materials and let StudyBuddy turn them into interactive summaries, practice questions, flashcards, and personalized exam preparation.
          </p>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={onOpenSignup}
              id="hero-start-studying-btn"
            >
              <Sparkles size={18} /> Start Studying Free
            </button>
            <button
              className="btn btn-secondary btn-lg"
              onClick={onOpenLogin}
              id="hero-login-cta-btn"
            >
              Sign In to Your Account <ArrowRight size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '36px', color: '#64748b', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} color="#10b981" /> Real PDF text extraction
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} color="#10b981" /> Smart concept retention
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} color="#10b981" /> Zero hallucinations
            </div>
          </div>
        </div>

        {/* Right Hero Centerpiece: Glowing AI Orb */}
        <div style={{ flex: '1 1 420px', display: 'flex', justifyContent: 'center' }}>
          <div className="ai-orb-container">
            <div className="ai-orb-ring-2"></div>
            <div className="ai-orb-ring-1"></div>
            <div className="ai-orb-core"></div>

            {/* Floating Knowledge Chips */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '-20px',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '999px',
              padding: '8px 16px',
              color: '#f8fafc',
              fontSize: '0.8rem',
              fontWeight: 700,
              boxShadow: '0 8px 25px rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <UploadCloud size={14} color="#38bdf8" /> Real PDF Understanding
            </div>

            <div style={{
              position: 'absolute',
              bottom: '30px',
              right: '-10px',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '999px',
              padding: '8px 16px',
              color: '#f8fafc',
              fontSize: '0.8rem',
              fontWeight: 700,
              boxShadow: '0 8px 25px rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <ListChecks size={14} color="#a855f7" /> Grounded MCQs & Quiz
            </div>

            <div style={{
              position: 'absolute',
              bottom: '100px',
              left: '-30px',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '999px',
              padding: '8px 16px',
              color: '#f8fafc',
              fontSize: '0.8rem',
              fontWeight: 700,
              boxShadow: '0 8px 25px rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Brain size={14} color="#10b981" /> Memory Mnemonics
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step Interactive Pipeline */}
      <section style={{
        maxWidth: '1300px',
        margin: '0 auto',
        padding: '20px 24px 80px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
            How StudyBuddy Works
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1rem', marginTop: '6px' }}>
            From raw lecture slide to exam readiness in seconds
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8', marginBottom: '10px' }}>STEP 01</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
              Upload Your Study Notes
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Upload any PDF, document, or lecture notes. Files are securely organized and archived under your private student account.
            </p>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#818cf8', marginBottom: '10px' }}>STEP 02</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
              Real Text Extraction
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Our server-side PDF parser extracts every proposition, formula, and theorem. Scanned documents without text layers are automatically flagged.
            </p>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#c084fc', marginBottom: '10px' }}>STEP 03</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
              AI Study Pack Generation
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.5 }}>
              AI generates structured summaries, active-recall MCQs, definitions, memory mnemonics, and flashcards derived 100% from your document.
            </p>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#34d399', marginBottom: '10px' }}>STEP 04</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
              Adaptive Exam Mastery
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Take interactive quizzes, review mistakes in your personal notebook, and follow dynamic day-by-day exam countdown timelines.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '24px',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.85rem'
      }}>
        StudyBuddy AI &bull; Your Personalized AI Study Assistant
      </footer>
    </div>
  );
}
