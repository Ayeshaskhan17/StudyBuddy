import React, { useState, useEffect } from 'react';
import {
  Search, UploadCloud, Filter, Layers, Download, Sparkles, BookOpen,
  Calendar, User, FileText, ArrowUpDown, Trash2, Eye, HardDrive, RefreshCw
} from 'lucide-react';
import { api } from '../services/apiService';

export default function NotesLibrary({
  onSelectNote,
  onOpenUpload,
  onShowToast
}) {
  const [notes, setNotes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedFileType, setSelectedFileType] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const [fetchedNotes, fetchedSubjects] = await Promise.all([
        api.getNotes(),
        api.getSubjects()
      ]);
      setNotes(fetchedNotes);
      setSubjects(fetchedSubjects);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      onShowToast({ type: 'error', title: 'Error', message: 'Failed to load notes.' });
    }
  };

  const handleDelete = async (e, noteId, title) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete "${title}"?`)) return;

    try {
      await api.deleteNote(noteId);
      onShowToast({ type: 'info', title: 'Deleted', message: `"${title}" removed from your notes library.` });
      await loadNotes();
    } catch (err) {
      onShowToast({ type: 'error', title: 'Delete Failed', message: err.message });
    }
  };

  // Filter notes
  const filteredNotes = notes.filter(n => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = n.title.toLowerCase().includes(q) ||
        n.subject.toLowerCase().includes(q) ||
        n.topic.toLowerCase().includes(q) ||
        (n.extractedText && n.extractedText.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (selectedSubject !== 'All' && n.subject !== selectedSubject) {
      return false;
    }

    if (selectedFileType !== 'All' && n.fileType !== selectedFileType) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return 0;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header & CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
            Notes Library
          </h1>
          <p style={{ fontSize: '0.925rem', color: '#94a3b8', margin: '4px 0 0' }}>
            Browse and study your uploaded notes, textbooks, and study materials
          </p>
        </div>

        <button
          className="btn btn-primary btn-lg"
          onClick={onOpenUpload}
          id="notes-page-upload-cta-btn"
        >
          <UploadCloud size={20} /> + Upload Notes
        </button>
      </div>

      {/* Dynamic Subject Filters Carousel (Only user's active subjects) */}
      {subjects.length > 0 && (
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
            Filter by Subject
          </div>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
            {['All', ...subjects].map(sub => {
              const isSelected = selectedSubject === sub;
              const count = sub === 'All' ? notes.length : notes.filter(n => n.subject === sub).length;

              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  style={{
                    background: isSelected ? 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)' : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? '#ffffff' : '#94a3b8',
                    border: isSelected ? '1px solid transparent' : '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span>{sub}</span>
                  <span style={{
                    background: isSelected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                    padding: '1px 6px',
                    borderRadius: '999px',
                    fontSize: '0.72rem'
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px' }}
              placeholder="Search in note titles or extracted text..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              id="notes-library-search-input"
            />
          </div>

          <div>
            <select
              className="form-select"
              value={selectedFileType}
              onChange={e => setSelectedFileType(e.target.value)}
            >
              <option value="All">All Formats</option>
              <option value="PDF">PDF Documents</option>
              <option value="DOCX">DOCX Files</option>
              <option value="TXT">Text Notes</option>
            </select>
          </div>

          <div>
            <select
              className="form-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="newest">Sort by: Newest First</option>
              <option value="title">Sort by: Note Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <Sparkles size={24} className="spin" style={{ margin: '0 auto 8px' }} />
          <div>Retrieving your study notes...</div>
        </div>
      ) : filteredNotes.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredNotes.map(note => (
            <div
              key={note.id}
              className="card card-interactive"
              onClick={() => onSelectNote(note.id)}
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '22px' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span className="badge badge-primary">{note.subject}</span>
                    <span className="badge badge-neutral">{note.fileType}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{note.fileSize}</span>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px', lineHeight: 1.35 }}>
                  {note.title}
                </h3>

                <div style={{ fontSize: '0.8rem', color: '#38bdf8', marginBottom: '8px' }}>
                  Topic: <strong>{note.topic}</strong>
                </div>

                <p style={{
                  fontSize: '0.825rem',
                  color: '#94a3b8',
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  marginBottom: '14px'
                }}>
                  {note.description || note.extractedText?.slice(0, 120)}
                </p>

                <div style={{
                  background: 'rgba(2, 6, 23, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '0.7rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#38bdf8',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: '16px'
                }}>
                  Ready for AI Study Hub • Interactive Practice
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px', display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectNote(note.id);
                  }}
                >
                  <Sparkles size={14} /> Open Workspace
                </button>
                <button
                  className="btn btn-secondary btn-sm btn-icon"
                  onClick={(e) => handleDelete(e, note.id, note.title)}
                  title="Delete Note"
                  style={{ color: '#fb7185' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <Layers size={32} />
          </div>
          <div className="empty-state-title">Your study library is empty.</div>
          <div className="empty-state-desc">
            Upload your first set of notes or PDFs to start studying with AI.
          </div>
          <button className="btn btn-primary btn-lg" onClick={onOpenUpload} style={{ marginTop: '8px' }}>
            <UploadCloud size={18} /> Upload Notes
          </button>
        </div>
      )}
    </div>
  );
}
