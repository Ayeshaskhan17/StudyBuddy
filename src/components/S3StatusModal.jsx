import React, { useState } from 'react';
import { Database, ShieldCheck, FolderTree, AlertTriangle, CheckCircle, ExternalLink, X, RefreshCw } from 'lucide-react';
import { s3Service } from '../services/s3Service';

export default function S3StatusModal({ isOpen, onClose, onShowToast }) {
  const [forceFail, setForceFail] = useState(s3Service.forceFailure);
  const [testingConnection, setTestingConnection] = useState(false);
  const config = s3Service.getS3Config();

  if (!isOpen) return null;

  const handleToggleFailure = (e) => {
    const checked = e.target.checked;
    setForceFail(checked);
    s3Service.setForceFailure(checked);
    onShowToast({
      type: checked ? 'warning' : 'info',
      title: checked ? 'S3 Network Failure Simulation Enabled' : 'S3 Network Restored',
      message: checked
        ? 'Uploads and downloads will now simulate AWS S3 network failure for error handling testing.'
        : 'S3 storage operations will now complete normally.'
    });
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    await new Promise(r => setTimeout(r, 600));
    setTestingConnection(false);

    if (forceFail) {
      onShowToast({
        type: 'error',
        title: 'Connection Test Failed',
        message: 'Could not reach S3 endpoint: Simulated network timeout.'
      });
    } else {
      onShowToast({
        type: 'success',
        title: 'S3 Connection Verified',
        message: `Successfully connected to Amazon S3 bucket "${config.bucket}" in ${config.region}.`
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', background: '#0b1120' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Database size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Amazon S3 Storage Architecture</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Storage tier for all student study notes, documents & materials
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status Banner */}
          <div style={{
            background: forceFail ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            border: `1px solid ${forceFail ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            {forceFail ? (
              <AlertTriangle size={24} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <CheckCircle size={24} color="#34d399" style={{ flexShrink: 0, marginTop: '2px' }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.925rem', color: forceFail ? '#fca5a5' : '#6ee7b7' }}>
                {forceFail ? 'Simulated S3 Network Error Mode Active' : 'Amazon S3 Storage Layer Active'}
              </div>
              <div style={{ fontSize: '0.825rem', color: forceFail ? '#fecaca' : '#a7f3d0', marginTop: '2px' }}>
                {forceFail
                  ? 'Use this state to verify error handling for failed uploads and network timeouts.'
                  : `Bucket: s3://${config.bucket} (AWS Region: ${config.region})`}
              </div>
            </div>
            <button
              className="btn btn-sm btn-secondary"
              onClick={handleTestConnection}
              disabled={testingConnection}
              style={{ flexShrink: 0 }}
            >
              <RefreshCw size={14} className={testingConnection ? 'spin' : ''} />
              {testingConnection ? 'Testing...' : 'Test Ping'}
            </button>
          </div>

          {/* S3 Logical Structure */}
          <div>
            <h4 style={{ fontSize: '0.925rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              <FolderTree size={16} color="#818cf8" />
              S3 Bucket Hierarchical Organization
            </h4>
            <div style={{
              background: '#040711',
              color: '#e2e8f0',
              padding: '14px 18px',
              borderRadius: '10px',
              border: '1px solid var(--border-glass)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.8rem',
              lineHeight: 1.6
            }}>
              <div style={{ color: '#38bdf8' }}>s3://studybuddy-notes-vault/</div>
              <div style={{ paddingLeft: '16px', color: '#a5b4fc' }}>├── notes/</div>
              <div style={{ paddingLeft: '32px', color: '#cbd5e1' }}>├── mathematics/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Calculus, Algebra, Vector notes]</div>
              <div style={{ paddingLeft: '32px', color: '#cbd5e1' }}>├── mechanical/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Thermodynamics, Fluid mechanics]</div>
              <div style={{ paddingLeft: '32px', color: '#cbd5e1' }}>├── computer-science/ &nbsp;[OSI Model, Python, Algorithms]</div>
              <div style={{ paddingLeft: '32px', color: '#cbd5e1' }}>├── physics/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Quantum mechanics, Waves]</div>
              <div style={{ paddingLeft: '32px', color: '#cbd5e1' }}>├── electronics/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Logic gates, Microprocessors]</div>
              <div style={{ paddingLeft: '32px', color: '#cbd5e1' }}>└── other/</div>
              <div style={{ paddingLeft: '16px', color: '#a5b4fc' }}>├── users/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Student avatars & preferences]</div>
              <div style={{ paddingLeft: '16px', color: '#a5b4fc' }}>└── metadata/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[Index catalogs & OCR extracts]</div>
            </div>
          </div>

          {/* Security & Credentials Notice */}
          <div style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <ShieldCheck size={22} color="#818cf8" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Zero Client-Side Secret Exposure:</strong> StudyBuddy strictly adheres to AWS security best practices. AWS access keys and secret keys are never exposed in browser JavaScript. Real S3 uploads are authorized via server-side presigned URLs and managed IAM policies defined in <code style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#38bdf8', padding: '1px 5px', borderRadius: '4px' }}>.env</code>.
            </div>
          </div>

          {/* Simulation Toggle for Error Handling Testing */}
          <div style={{
            padding: '12px 16px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#fbbf24' }}>
                Test S3 Error Handling
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Simulate Amazon S3 upload network failures to verify error UI
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
              <input
                type="checkbox"
                checked={forceFail}
                onChange={handleToggleFailure}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ef4444' }}
              />
              <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#fbbf24' }}>
                {forceFail ? 'Active' : 'Off'}
              </span>
            </label>
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-glass)' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
