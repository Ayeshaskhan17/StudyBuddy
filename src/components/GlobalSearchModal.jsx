import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, BookOpen, Sparkles, Tag, ArrowRight, X } from 'lucide-react';
import { api } from '../services/apiService';

export default function GlobalSearchModal({ isOpen, onClose, onSelectNote, onNavigateAI }) {
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      api.getNotes().then(res => setNotes(res || [])).catch(() => setNotes([]));
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmed = query.trim().toLowerCase();

  const filteredNotes = trimmed
    ? notes.filter(n =>
        n.title.toLowerCase().includes(trimmed) ||
        n.subject.toLowerCase().includes(trimmed) ||
        n.topic.toLowerCase().includes(trimmed) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(trimmed)))
      )
    : notes.slice(0, 4);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '620px',
          borderRadius: '16px',
          background: '#0b1120',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85)'
        }}
      >
        {/* Search Input Bar */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Search size={20} color="#818cf8" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search notes, subjects, topics, or study resources..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '1.05rem',
              fontFamily: 'inherit',
              background: 'transparent',
              color: 'var(--text-primary)'
            }}
            id="global-search-input-field"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={16} />
            </button>
          )}
          <kbd style={{
            fontSize: '0.72rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid var(--border-glass)',
            padding: '2px 6px',
            borderRadius: '4px',
            color: 'var(--text-secondary)'
          }}>
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '12px 16px' }}>
          {filteredNotes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '6px 8px'
              }}>
                {trimmed ? `Search Results (${filteredNotes.length})` : 'Popular & Recent Notes'}
              </div>

              {filteredNotes.map(note => (
                <div
                  key={note.id}
                  onClick={() => {
                    onSelectNote(note);
                    onClose();
                  }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: '#a5b4fc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <FileText size={18} />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: '0.92rem',
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {note.title}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                        <span>{note.subject}</span>
                        <span>&bull;</span>
                        <span>{note.topic}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span className="badge badge-primary">{note.fileType}</span>
                    <ArrowRight size={14} color="var(--text-muted)" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                No study notes found for "{query}"
              </div>
              <div style={{ fontSize: '0.825rem', marginTop: '6px', color: 'var(--text-muted)' }}>
                Try searching for Cloud Computing, Service Models, or upload your own notes to study.
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div style={{
          padding: '10px 18px',
          borderTop: '1px solid var(--border-glass)',
          background: 'rgba(0, 0, 0, 0.35)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          <span>Press <strong>ESC</strong> to close</span>
          <span>Tip: Filter by subject or semester in the Notes Library</span>
        </div>
      </div>
    </div>
  );
}
