import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-live="polite">
      {toasts.map(toast => {
        const getIcon = () => {
          switch (toast.type) {
            case 'success':
              return <CheckCircle2 size={20} color="#10b981" />;
            case 'error':
              return <AlertCircle size={20} color="#ef4444" />;
            case 'warning':
              return <AlertTriangle size={20} color="#f59e0b" />;
            default:
              return <Info size={20} color="#6366f1" />;
          }
        };

        return (
          <div key={toast.id} className={`toast-item ${toast.type || 'info'}`}>
            <div style={{ flexShrink: 0 }}>{getIcon()}</div>
            <div style={{ flex: 1 }}>
              {toast.title && (
                <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '2px', color: 'var(--text-primary)' }}>
                  {toast.title}
                </div>
              )}
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {toast.message}
              </div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
