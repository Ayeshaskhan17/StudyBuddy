import React, { useState } from 'react';
import {
  Lock, Mail, User, BookOpen, Eye, EyeOff, AlertCircle,
  CheckCircle2, ArrowRight, X, GraduationCap, Sparkles
} from 'lucide-react';
import { authService } from '../services/authService';

export default function AuthModal({
  isOpen,
  initialMode = 'login', // 'login' | 'signup' | 'forgot'
  onClose,
  onSuccess,
  onShowToast
}) {
  const [mode, setMode] = useState(initialMode); // 'login', 'signup', 'forgot'
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [college, setCollege] = useState('');
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('Semester 3');

  // Keep mode in sync with initialMode whenever modal opens, and clear passwords
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode || 'login');
      setErrorMessage('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanName) throw new Error('Full name is required.');
        if (!cleanEmail) throw new Error('Email is required.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');

        const user = await authService.signup({
          name: cleanName,
          email: cleanEmail,
          password,
          college: college.trim(),
          branch: branch.trim(),
          semester
        });

        onShowToast({
          type: 'success',
          title: `Welcome, ${user.name}!`,
          message: 'Your personal StudyBuddy account is ready.'
        });
        onSuccess(user);
      } else if (mode === 'login') {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail || !password) throw new Error('Please enter your email and password.');

        const user = await authService.login({ email: cleanEmail, password });
        onShowToast({
          type: 'success',
          title: `Welcome back, ${user.name}!`,
          message: 'Signed in successfully.'
        });
        onSuccess(user);
      } else if (mode === 'forgot') {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail) throw new Error('Please enter your registered email address.');
        await authService.forgotPassword(cleanEmail);
        onShowToast({
          type: 'info',
          title: 'Reset Link Dispatched',
          message: `If an account exists for ${cleanEmail}, instructions have been sent.`
        });
        setMode('login');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '520px', padding: 0, overflow: 'hidden' }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '24px 28px 18px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <GraduationCap size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff' }}>
                {mode === 'signup' ? 'Create Student Account' : mode === 'login' ? 'Sign In to StudyBuddy' : 'Reset Password'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                {mode === 'signup' ? 'Access your personalized AI study workspace & tutor' : 'Resume your study sessions and exam preparation'}
              </p>
            </div>
          </div>

          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} color="#94a3b8" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px' }}>
          {errorMessage && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#fb7185',
              fontSize: '0.85rem',
              marginBottom: '18px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SIGNUP FIELDS */}
          {mode === 'signup' && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '38px' }}
                    placeholder="e.g. Alex Rivera"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">College / University</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Stanford University"
                    value={college}
                    onChange={e => setCollege(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Branch / Major</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Mechanical Eng"
                    value={branch}
                    onChange={e => setBranch(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Current Semester</label>
                <select
                  className="form-select"
                  value={semester}
                  onChange={e => setSemester(e.target.value)}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                    <option key={s} value={`Semester ${s}`}>Semester {s}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* EMAIL */}
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                id="auth-email-input"
                name="email"
                type="email"
                className="form-input"
                style={{ paddingLeft: '38px' }}
                placeholder="student@university.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                required
              />
            </div>
          </div>

          {/* PASSWORD */}
          {mode !== 'forgot' && (
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Password *</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setErrorMessage(''); setMode('forgot'); }}
                    style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="auth-password-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: '38px', paddingRight: '40px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* CONFIRM PASSWORD (SIGNUP) */}
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="auth-confirm-password-input"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                />
              </div>
            </div>
          )}

          {/* Remember Me */}
          {mode === 'login' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <input
                type="checkbox"
                id="auth-remember-me"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#6366f1', cursor: 'pointer' }}
              />
              <label htmlFor="auth-remember-me" style={{ fontSize: '0.85rem', color: '#94a3b8', cursor: 'pointer' }}>
                Remember me on this browser
              </label>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: '6px' }}
            disabled={loading}
            id="auth-submit-btn"
          >
            {loading ? 'Authenticating...' : mode === 'signup' ? 'Create Account' : mode === 'login' ? 'Sign In' : 'Send Reset Link'}
          </button>

          {/* SWITCH BETWEEN LOGIN / SIGNUP */}
          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.875rem', color: '#94a3b8' }}>
            {mode === 'login' ? (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setErrorMessage(''); setMode('signup'); }}
                  style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  id="switch-to-signup-btn"
                >
                  Create Account
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setErrorMessage(''); setMode('login'); }}
                  style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  id="switch-to-login-btn"
                >
                  Sign In
                </button>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
