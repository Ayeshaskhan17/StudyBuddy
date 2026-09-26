import React, { useState } from 'react';
import {
  FileText, Download, Sparkles, BookOpen, Brain, ListChecks, HelpCircle,
  Calendar, User, Tag, HardDrive, Eye, X, Check, Share2
} from 'lucide-react';
import { s3Service } from '../services/s3Service';
import { dataStore } from '../services/dataStore';

export default function NoteDetailsModal({
  note,
  isOpen,
  onClose,
  onNavigateAI,
  onShowToast
}) {
  const [downloading, setDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(false);

  if (!isOpen || !note) return null;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const res = await s3Service.getDownloadUrl(note.s3Key, `${note.title}.${note.fileType.toLowerCase()}`);
      dataStore.incrementNoteDownloads(note.id);

      // Create a downloadable mock text file or link
      const blob = new Blob([note.content || `StudyBuddy Study Material: ${note.title}\nSubject: ${note.subject}`], {
        type: 'text/plain;charset=utf-8'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${note.title.replace(/[^a-z0-9]/gi, '_')}.${note.fileType.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloading(false);
      onShowToast({
        type: 'success',
        title: 'Download Started',
        message: `Retrieved "${note.title}" successfully.`
      });
    } catch (err) {
      setDownloading(false);
      onShowToast({
        type: 'error',
        title: 'Download Failed',
        message: err.message || 'Unable to download note.'
      });
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    onShowToast({
      type: 'info',
      title: 'Link Copied',
      message: 'Note link copied to clipboard. Share with your study group!'
    });
  };

  const handleAction = (tabKey) => {
    dataStore.incrementNoteStudies(note.id);
    onClose();
    onNavigateAI(note.id, tabKey);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '780px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #eef2ff 0%, #ede9fe 100%)',
              color: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.85rem'
            }}>
              {note.fileType}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-primary">{note.subject}</span>
                <span className="badge badge-neutral">{note.semester}</span>
              </div>
              <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                {note.title}
              </h3>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Metadata Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            padding: '14px 18px'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Tag size={12} /> Topic
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                {note.topic}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={12} /> Uploaded By
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                {note.uploadedBy}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} /> Upload Date
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                {note.uploadDate}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FileText size={12} /> File Size
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                {note.fileSize} ({note.fileType})
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Description</h4>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {note.description}
            </p>
          </div>

          {/* Verified Material Badge */}
          <div style={{
            background: 'rgba(56, 189, 248, 0.08)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid rgba(56, 189, 248, 0.2)'
          }}>
            <Sparkles size={14} color="#38bdf8" />
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Status:</span>
            <span style={{ color: '#38bdf8' }}>
              Study Material Active & Verified for AI Practice
            </span>
          </div>

          {/* Document Content Preview Toggle */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>Study Material Preview</h4>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setViewingDocument(!viewingDocument)}
                id="toggle-preview-btn"
              >
                <Eye size={14} />
                {viewingDocument ? 'Hide Preview' : 'Read / View Document'}
              </button>
            </div>

            {viewingDocument && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid var(--border-glass)',
                borderRadius: '10px',
                padding: '16px',
                maxHeight: '220px',
                overflowY: 'auto',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6
              }}>
                {note.content}
              </div>
            )}
          </div>

          {/* AI Generator Action Buttons */}
          <div>
            <h4 style={{ fontSize: '0.925rem', marginBottom: '10px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} color="#6366f1" />
              Generate Study Material with AI
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleAction('summary')}
                id="action-gen-summary"
                style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
              >
                <BookOpen size={16} color="#6366f1" />
                <span>Generate Summary</span>
              </button>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleAction('mcq')}
                id="action-gen-mcqs"
                style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
              >
                <ListChecks size={16} color="#10b981" />
                <span>Generate MCQs</span>
              </button>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleAction('mnemonics')}
                id="action-gen-mnemonics"
                style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
              >
                <Brain size={16} color="#f59e0b" />
                <span>Generate Mnemonics</span>
              </button>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleAction('questions')}
                id="action-gen-questions"
                style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
              >
                <HelpCircle size={16} color="#06b6d4" />
                <span>Practice Questions</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleShare}
              title="Share note link"
            >
              {copiedLink ? <Check size={14} color="#10b981" /> : <Share2 size={14} />}
              {copiedLink ? 'Copied!' : 'Share'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleDownload}
              disabled={downloading}
              id="download-note-btn"
            >
              <Download size={14} />
              {downloading ? 'Downloading...' : 'Download Note'}
            </button>
          </div>

          {/* Primary CTA: Study with this note */}
          <button
            className="btn btn-primary"
            onClick={() => handleAction('summary')}
            id="primary-study-with-note-btn"
          >
            <Sparkles size={16} />
            Study with this note
          </button>
        </div>
      </div>
    </div>
  );
}
