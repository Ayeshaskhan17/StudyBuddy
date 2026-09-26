import React from 'react';
import {
  Layers, BookOpen, Brain, Sparkles, ChevronRight,
  ArrowRight, CheckCircle2, Clock, Award
} from 'lucide-react';

export default function TopicStudyMap({
  units = [],
  topics = [],
  onStudyTopic
}) {
  if (!units || units.length === 0) {
    // If no units, create units from topics list
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {topics.map((t, idx) => (
          <div
            key={idx}
            className="card"
            style={{
              padding: '18px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              transition: 'border-color 0.2s ease'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="badge badge-primary">{t.priority || 'High'}</span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Weightage: {t.weightage || '25%'}</span>
                {t.unit && <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{t.unit}</span>}
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                {t.topic}
              </h4>
            </div>

            <button
              onClick={() => onStudyTopic(t.topic)}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={14} /> Study Topic
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {units.map((unit, uIdx) => (
        <div
          key={uIdx}
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '24px'
          }}
        >
          {/* Unit Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            paddingBottom: '14px'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Unit {unit.unitNumber}
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: '2px 0 0 0' }}>
                {unit.title}
              </h3>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {unit.topics?.length || 0} core topics
            </div>
          </div>

          {/* Topics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {unit.topics?.map((topic, tIdx) => {
              // Genuine student mastery score from progress records, default 0% if unpracticed
              const mastery = typeof topic.masteryScore === 'number' 
                ? topic.masteryScore 
                : typeof topic.mastery === 'number' 
                  ? topic.mastery 
                  : 0;

              return (
                <div
                  key={tIdx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'}
                >
                  <div>
                    <div style={{ fontSize: '0.925rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                      {topic.title}
                    </div>

                    {/* Progress Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#94a3b8' }}>
                      <div style={{ flex: 1, height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${mastery}%`, height: '100%', background: mastery >= 80 ? '#10b981' : mastery >= 50 ? '#38bdf8' : mastery > 0 ? '#f59e0b' : 'transparent' }} />
                      </div>
                      <span>{mastery > 0 ? `${mastery}%` : 'Not practiced'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
                    <button
                      onClick={() => onStudyTopic(topic.title)}
                      style={{
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.35)',
                        color: '#a5b4fc',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Sparkles size={13} /> Study Topic <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
