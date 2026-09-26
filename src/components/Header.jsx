import React, { useState, useEffect } from 'react';
import {
  BookOpen, Home, Layers, Sparkles, Award, Calendar, BarChart3,
  Search, Menu, X, AlertCircle, LogOut, User as UserIcon, Settings
} from 'lucide-react';
import { api } from '../services/apiService';
import { getInitials } from '../lib/userUtils';

export default function Header({
  user,
  activeTab,
  onNavigate,
  onOpenSearch,
  onLogout
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mistakesCount, setMistakesCount] = useState(0);

  useEffect(() => {
    if (user) {
      api.getMistakes().then(m => {
        setMistakesCount(m.filter(item => item.status === 'needs-revision').length);
      }).catch(() => {});
    }
  }, [user, activeTab]);

  const navItems = [
    { key: 'home', label: 'Home', icon: Home },
    { key: 'notes', label: 'Notes', icon: Layers },
    { key: 'ai-study', label: 'AI Study', icon: Sparkles },
    { key: 'mock-exam', label: 'Mock Exam', icon: Award },
    { key: 'exam-prep', label: 'Study Plan', icon: Calendar },
    { key: 'progress', label: 'My Progress', icon: BarChart3 },
    { key: 'mistakes', label: 'Mistakes', icon: AlertCircle, badge: mistakesCount }
  ];

  const handleNavClick = (key) => {
    onNavigate(key);
    setMobileMenuOpen(false);
  };

  const initials = getInitials(user?.name);

  return (
    <header className="header-container">
      <div className="header-inner">
        {/* Brand Section */}
        <div className="brand-section" onClick={() => handleNavClick('home')}>
          <div className="brand-logo-icon">
            <BookOpen size={22} />
          </div>
          <div className="brand-name-group">
            <div className="brand-name">
              Study<span>Buddy</span>
            </div>
            <div className="brand-badge">AI Study & Exam Prep</div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Main Navigation">
          <ul className="nav-links">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <li key={item.key}>
                  <button
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.key)}
                    id={`nav-link-${item.key}`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                    {item.badge > 0 && (
                      <span style={{
                        background: '#f43f5e',
                        color: '#ffffff',
                        fontSize: '0.675rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '999px',
                        marginLeft: '2px'
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Right Actions */}
        <div className="header-actions">
          {/* Search Trigger */}
          <button
            className="search-trigger-btn"
            onClick={onOpenSearch}
            id="header-search-trigger"
          >
            <Search size={15} />
            <span>Search notes...</span>
            <span className="search-shortcut-key">Ctrl+K</span>
          </button>

          {/* Student Profile & Logout Dropdown */}
          <div style={{ position: 'relative' }}>
            <div
              className="student-profile-pill"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              title="Student Profile"
              id="student-profile-btn"
            >
              <div className="student-avatar-img">{initials}</div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', lineHeight: 1.2 }}>
                  {user?.name || 'Student'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#38bdf8' }}>
                  {user?.semester || 'Semester 1'}
                </div>
              </div>
            </div>

            {profileDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '260px',
                background: '#0b1120',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 15px 35px rgba(0,0,0,0.85)',
                zIndex: 200
              }}>
                {/* Header with avatar, real name & email */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingBottom: '14px',
                  marginBottom: '10px'
                }}>
                  <div className="student-avatar-img" style={{
                    width: '42px',
                    height: '42px',
                    fontSize: '1rem',
                    borderRadius: '50%',
                    flexShrink: 0
                  }}>
                    {initials}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.925rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user?.name || 'Student'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user?.email}
                    </div>
                    {user?.college && (
                      <div style={{ fontSize: '0.7rem', color: '#38bdf8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.college}
                      </div>
                    )}
                  </div>
                </div>

                {/* Navigation Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                  <button
                    className="nav-link"
                    style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px', fontSize: '0.85rem' }}
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onNavigate('progress');
                    }}
                    id="profile-dropdown-progress-btn"
                  >
                    <UserIcon size={14} /> Profile & Progress
                  </button>

                  <button
                    className="nav-link"
                    style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px', fontSize: '0.85rem' }}
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onNavigate('notes');
                    }}
                    id="profile-dropdown-notes-btn"
                  >
                    <Layers size={14} /> Study Library
                  </button>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '8px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', justifyContent: 'flex-start', color: '#fb7185', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onLogout();
                    }}
                    id="header-logout-btn"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="btn-icon mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} color="#ffffff" /> : <Menu size={20} color="#ffffff" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div style={{
          background: '#0b1120',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.key)}
                style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px' }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setMobileMenuOpen(false);
              onLogout();
            }}
            style={{ marginTop: '8px', color: '#fb7185' }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      )}
    </header>
  );
}
