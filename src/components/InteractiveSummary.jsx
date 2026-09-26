import React, { useState } from 'react';
import {
  ChevronDown, ChevronUp, Sparkles, BookOpen, Brain,
  Target, Zap, HelpCircle, CheckCircle2, AlertTriangle, Layers, MessageSquare
} from 'lucide-react';

export default function InteractiveSummary({
  summary,
  comparisons = [],
  onGenerateTopicMCQs,
  onExplainSimpler,
  onOpenFlashcards
}) {
  const [collapsed, setCollapsed] = useState({
    overview: false,
    concepts: false,
    definitions: false,
    coreIdeas: false,
    examples: false,
    comparisons: false,
    prosCons: false,
    examFocus: false,
    quickRecap: false
  });

  const toggleSection = (key) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!summary) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
        <BookOpen size={36} color="#6366f1" style={{ marginBottom: '12px' }} />
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>Summary Loading...</div>
        <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>AI is structuring the educational content from your document.</div>
      </div>
    );
  }

  const comparisonData = (summary.comparisons && summary.comparisons.length > 0)
    ? summary.comparisons
    : comparisons;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. HERO QUICK REVISION CALLOUT */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.7), rgba(15, 23, 42, 0.9))',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '14px',
        padding: '24px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Zap size={18} color="#38bdf8" />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Revision & Core Takeaway
          </span>
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', marginBottom: '12px' }}>
          {summary.title || 'Study Guide & Key Concepts'}
        </h2>
        <p style={{ fontSize: '0.95rem', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
          {summary.quickRevision || summary.overview}
        </p>
      </div>

      {/* 2. WHAT IS THIS TOPIC? */}
      <div className="card" style={{ padding: '20px' }}>
        <div
          onClick={() => toggleSection('overview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={18} color="#6366f1" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              What is this topic?
            </h3>
          </div>
          {collapsed.overview ? <ChevronDown size={18} color="#94a3b8" /> : <ChevronUp size={18} color="#94a3b8" />}
        </div>

        {!collapsed.overview && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <p style={{ fontSize: '0.925rem', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
              {summary.overview}
            </p>
          </div>
        )}
      </div>

      {/* 3. KEY CONCEPTS WITH INTERACTIVE STUDY BUTTONS */}
      {summary.keyConcepts && summary.keyConcepts.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <div
            onClick={() => toggleSection('concepts')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={18} color="#38bdf8" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Key Concepts & Architectural Pillars
              </h3>
            </div>
            {collapsed.concepts ? <ChevronDown size={18} color="#94a3b8" /> : <ChevronUp size={18} color="#94a3b8" />}
          </div>

          {!collapsed.concepts && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              {summary.keyConcepts.map((concept, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: '10px',
                    padding: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#38bdf8' }}>
                      {concept.title}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {onExplainSimpler && (
                        <button
                          onClick={() => onExplainSimpler(concept.title)}
                          style={{
                            background: 'rgba(56, 189, 248, 0.1)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            color: '#38bdf8',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <MessageSquare size={11} /> Explain Simpler
                        </button>
                      )}
                      {onGenerateTopicMCQs && (
                        <button
                          onClick={() => onGenerateTopicMCQs(concept.title)}
                          style={{
                            background: 'rgba(99, 102, 241, 0.1)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            color: '#a5b4fc',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Brain size={11} /> Generate 3 MCQs
                        </button>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.5, marginTop: '8px', marginBottom: 0 }}>
                    {concept.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. IMPORTANT DEFINITIONS GLOSSARY */}
      {summary.definitions && summary.definitions.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <div
            onClick={() => toggleSection('definitions')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookOpen size={18} color="#10b981" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Important Definitions
              </h3>
            </div>
            {collapsed.definitions ? <ChevronDown size={18} color="#94a3b8" /> : <ChevronUp size={18} color="#94a3b8" />}
          </div>

          {!collapsed.definitions && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '12px',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              {summary.definitions.map((def, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(2, 6, 23, 0.6)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '10px',
                    padding: '14px'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#34d399', marginBottom: '6px' }}>
                    {def.term}
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                    {def.definition}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. CORE IDEAS */}
      {summary.coreIdeas && summary.coreIdeas.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <div
            onClick={() => toggleSection('coreIdeas')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Brain size={18} color="#a855f7" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Core Ideas & Mechanics
              </h3>
            </div>
            {collapsed.coreIdeas ? <ChevronDown size={18} color="#94a3b8" /> : <ChevronUp size={18} color="#94a3b8" />}
          </div>

          {!collapsed.coreIdeas && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              {summary.coreIdeas.map((idea, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '14px',
                    borderRadius: '10px'
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#6366f1',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    flexShrink: 0
                  }}>
                    {idea.number || idx + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc', marginBottom: '4px' }}>
                      {idea.heading}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                      {idea.explanation}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. COMPARISONS TABLE (IaaS vs PaaS vs SaaS, Public vs Private) */}
      {comparisonData && comparisonData.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <div
            onClick={() => toggleSection('comparisons')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={18} color="#f59e0b" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Model Comparisons & Architectures
              </h3>
            </div>
            {collapsed.comparisons ? <ChevronDown size={18} color="#94a3b8" /> : <ChevronUp size={18} color="#94a3b8" />}
          </div>

          {!collapsed.comparisons && (
            <div style={{
              overflowX: 'auto',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.85rem',
                textAlign: 'left'
              }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: '#38bdf8' }}>
                    <th style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Concept / Model</th>
                    <th style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Primary Meaning & Scope</th>
                    <th style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>User vs Provider Control</th>
                    <th style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Industry Examples</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#f8fafc' }}>{row.concept}</td>
                      <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>{row.meaning || row.focus}</td>
                      <td style={{ padding: '12px 14px', color: '#94a3b8' }}>{row.control || 'Standard cloud isolation'}</td>
                      <td style={{ padding: '12px 14px', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.examples || 'Industry implementations'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 7. ADVANTAGES & DISADVANTAGES */}
      {(summary.advantages?.length > 0 || summary.disadvantages?.length > 0) && (
        <div className="card" style={{ padding: '20px' }}>
          <div
            onClick={() => toggleSection('prosCons')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={18} color="#10b981" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Advantages & Considerations
              </h3>
            </div>
            {collapsed.prosCons ? <ChevronDown size={18} color="#94a3b8" /> : <ChevronUp size={18} color="#94a3b8" />}
          </div>

          {!collapsed.prosCons && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              {/* Pros */}
              <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#34d399', marginBottom: '10px' }}>
                  ✓ Core Advantages
                </div>
                <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '0.825rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                  {summary.advantages?.map((adv, i) => (
                    <li key={i} style={{ marginBottom: '6px' }}>{adv}</li>
                  ))}
                </ul>
              </div>

              {/* Cons */}
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f87171', marginBottom: '10px' }}>
                  ⚠ Key Challenges & Considerations
                </div>
                <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '0.825rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                  {summary.disadvantages?.map((dis, i) => (
                    <li key={i} style={{ marginBottom: '6px' }}>{dis}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 8. EXAM FOCUS ⭐ */}
      {summary.examFocus && summary.examFocus.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(15, 23, 42, 0.95))',
          border: '1.5px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '14px',
          padding: '22px'
        }}>
          <div
            onClick={() => toggleSection('examFocus')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Target size={20} color="#fbbf24" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24', margin: 0 }}>
                Exam Focus ⭐ (High-Yield Semester Points)
              </h3>
            </div>
            {collapsed.examFocus ? <ChevronDown size={18} color="#fbbf24" /> : <ChevronUp size={18} color="#fbbf24" />}
          </div>

          {!collapsed.examFocus && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginTop: '16px',
              paddingTop: '14px',
              borderTop: '1px solid rgba(245, 158, 11, 0.2)'
            }}>
              {summary.examFocus.map((focus, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.9rem' }}>⭐</span>
                  <span style={{ fontSize: '0.88rem', color: '#f8fafc', lineHeight: 1.5 }}>{focus}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
