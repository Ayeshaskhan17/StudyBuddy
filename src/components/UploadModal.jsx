import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Shield, HardDrive, Plus, Sparkles } from 'lucide-react';
import { api } from '../services/apiService';
import { progressService } from '../services/progressService';
import { authService } from '../services/authService';

export default function UploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  onShowToast
}) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [isAddingNewSubject, setIsAddingNewSubject] = useState(false);
  const [existingSubjects, setExistingSubjects] = useState([]);
  const [semester, setSemester] = useState('Semester 3');
  const [unit, setUnit] = useState('Unit 1');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      api.getSubjects().then(subs => {
        setExistingSubjects(subs || []);
        if (subs && subs.length > 0) {
          if (!subject) setSubject(subs[0]);
        } else {
          setIsAddingNewSubject(true);
        }
      }).catch(() => {
        setIsAddingNewSubject(true);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (file) => {
    setErrorMessage('');
    if (!file) return;

    console.log('[FILE INPUT CHANGE]', {
      selectedFileName: file.name,
      selectedFileType: file.type || 'unknown',
      selectedFileSize: file.size
    });

    const ext = file.name ? file.name.split('.').pop()?.toLowerCase() : '';
    const mime = (file.type || '').toLowerCase();
    const isPdf = ext === 'pdf' || mime.includes('pdf');
    const isDoc = ['docx', 'pptx', 'txt'].includes(ext) || mime.includes('text') || mime.includes('document') || mime.includes('presentation');
    const isImage = ['jpg', 'jpeg', 'png'].includes(ext) || mime.startsWith('image/');

    if (!isPdf && !isDoc && !isImage) {
      setErrorMessage(`Unsupported format (.${ext || file.type || 'unknown'}). Supported formats: PDF, DOCX, PPTX, JPG, PNG, TXT.`);
      setSelectedFile(null);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Max limit is 50 MB.`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    if (!title) {
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setTitle(nameWithoutExt.replace(/[-_]/g, ' '));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!authService.isAuthenticated()) {
      setErrorMessage('Your session has expired. Please sign in again.');
      return;
    }

    const targetSubject = isAddingNewSubject ? customSubject.trim() : subject.trim();
    if (!targetSubject) {
      setErrorMessage('Please specify an academic subject.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Please provide a title for your notes.');
      return;
    }
    if (!selectedFile) {
      setErrorMessage('Please select a PDF document to upload.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(25);

      // Progress animation
      const progInt = setInterval(() => {
        setUploadProgress(p => (p < 85 ? p + 15 : p));
      }, 200);

      const res = await api.uploadNote({
        file: selectedFile,
        title: title.trim(),
        subject: targetSubject,
        semester,
        unit: unit.trim(),
        topic: topic.trim() || title.trim(),
        description: description.trim()
      });

      clearInterval(progInt);
      setUploadProgress(100);

      // Immediately refresh the progress cache so Dashboard shows updated notes count & recent notes
      try {
        await progressService.fetchProgress();
      } catch (pErr) {
        console.warn('Progress refresh error:', pErr);
      }

      onUploadSuccess(res.note, res.extractedText, res.isScanned, res.warningMessage);
      setIsUploading(false);
      onClose();
    } catch (err) {
      setIsUploading(false);
      setErrorMessage(err.message || 'Unable to process this document.');
      onShowToast({
        type: 'error',
        title: 'Upload Failed',
        message: err.message || 'Unable to process this document.'
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UploadCloud size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff' }}>Upload Study Material</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                Turn your notes into an interactive AI study plan
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} disabled={isUploading}>
            <X size={18} color="#94a3b8" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {errorMessage && (
              <div style={{
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#fb7185',
                fontSize: '0.85rem'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Note Title */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Note Title *</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Thermodynamics — First Law of Thermodynamics"
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={isUploading}
                required
                id="upload-note-title"
              />
            </div>

            {/* Dynamic Subject Selection */}
            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Academic Subject *</label>
                {existingSubjects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewSubject(!isAddingNewSubject)}
                    style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                  >
                    {isAddingNewSubject ? 'Select from existing' : '+ Add new subject'}
                  </button>
                )}
              </div>

              {isAddingNewSubject || existingSubjects.length === 0 ? (
                <input
                  className="form-input"
                  type="text"
                  placeholder="Enter subject name (e.g. Mechanical Engineering, Computer Science)"
                  value={customSubject}
                  onChange={e => setCustomSubject(e.target.value)}
                  disabled={isUploading}
                  required
                  id="upload-custom-subject"
                />
              ) : (
                <select
                  className="form-select"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  disabled={isUploading}
                  id="upload-select-subject"
                >
                  {existingSubjects.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Semester & Unit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Semester</label>
                <select
                  className="form-select"
                  value={semester}
                  onChange={e => setSemester(e.target.value)}
                  disabled={isUploading}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                    <option key={s} value={`Semester ${s}`}>Semester {s}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Unit / Chapter</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Unit 1"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  disabled={isUploading}
                />
              </div>
            </div>

            {/* Topic */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Topic / Focus Area</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Boundary Work & SFEE"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                disabled={isUploading}
              />
            </div>

            {/* File Dropzone */}
            <label
              htmlFor="file-upload-input"
              className={`upload-dropzone ${isDragOver ? 'drag-active' : ''}`}
              style={{
                display: 'block',
                position: 'relative',
                cursor: isUploading ? 'not-allowed' : 'pointer'
              }}
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={e => { e.preventDefault(); setIsDragOver(false); }}
              onDrop={e => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
              }}
            >
              <input
                ref={fileInputRef}
                id="file-upload-input"
                type="file"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  zIndex: 5
                }}
                accept=".pdf,application/pdf,.docx,.pptx,.jpg,.jpeg,.png,.txt,text/plain"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
                disabled={isUploading}
              />

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', pointerEvents: 'none' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: selectedFile ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.12)',
                  color: selectedFile ? '#10b981' : '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {selectedFile ? <FileText size={26} /> : <UploadCloud size={26} />}
                </div>

                {selectedFile ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>
                      {selectedFile.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '2px', fontWeight: 600 }}>
                      ✓ {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Selected for AI Extraction
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.95rem' }}>
                      Click to browse or drag and drop your study PDF here
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                      Supported formats: PDF, DOCX, PPTX, TXT (Max 50MB)
                    </div>
                  </div>
                )}
              </div>
            </label>

            {/* Smart Study Preparation Indicator */}
            <div style={{
              background: 'rgba(2, 6, 23, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.78rem',
              color: '#94a3b8'
            }}>
              <Sparkles size={15} color="#38bdf8" style={{ flexShrink: 0 }} />
              <div>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>StudyBuddy Engine: </span>
                <span style={{ color: '#38bdf8' }}>
                  Extracting concepts, summaries, flashcards, MCQs & exam readiness
                </span>
              </div>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>
                  <span>Uploading study material & extracting concepts...</span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>{uploadProgress}%</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isUploading || !selectedFile}
              id="submit-upload-note-btn"
            >
              {isUploading ? `Processing (${uploadProgress}%)...` : 'Upload & Process with AI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
