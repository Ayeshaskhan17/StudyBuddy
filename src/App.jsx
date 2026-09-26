import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Toast from './components/Toast';
import GlobalSearchModal from './components/GlobalSearchModal';
import UploadModal from './components/UploadModal';
import AuthModal from './components/AuthModal';
import AIProcessingModal from './components/AIProcessingModal';

import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import NotesLibrary from './pages/NotesLibrary';
import AIStudy from './pages/AIStudy';
import MockExam from './pages/MockExam';
import ExamPrep from './pages/ExamPrep';
import MyProgress from './pages/MyProgress';
import MistakeNotebook from './pages/MistakeNotebook';
import NoteDetailsPage from './pages/NoteDetailsPage';

import { authService } from './services/authService';
import { api } from './services/apiService';
import { progressService } from './services/progressService';

export default function App() {
  const [currentUser, setCurrentUser] = useState(authService.getUser());
  const [activeTab, setActiveTab] = useState('home');
  const [toasts, setToasts] = useState([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // AI Processing Animation Modal state
  const [processingModalData, setProcessingModalData] = useState(null);

  // Active Note Workspace state
  const [activeWorkspaceNoteId, setActiveWorkspaceNoteId] = useState(null);
  const [workspaceInitialMode, setWorkspaceInitialMode] = useState('learn');

  useEffect(() => {
    // Check session on load
    if (authService.isAuthenticated()) {
      authService.fetchMe().then(user => {
        if (user) setCurrentUser(user);
        else setCurrentUser(null);
      }).catch(() => {});
    }
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (currentUser) setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser]);

  // Toast notification helper
  const showToast = ({ type = 'info', title, message, duration = 4000 }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  };

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Upload Note Flow -> triggers AI Processing Modal
  const handleUploadSuccess = (note, extractedText, isScanned, warningMessage) => {
    setProcessingModalData({
      note,
      extractedText,
      isScanned,
      warningMessage
    });
  };

  const handleOpenStudyPack = () => {
    if (processingModalData?.note?.id) {
      const noteId = processingModalData.note.id;
      setProcessingModalData(null);
      setActiveWorkspaceNoteId(noteId);
      setActiveTab('note-workspace');
    } else {
      setProcessingModalData(null);
      setActiveTab('notes');
    }
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setActiveTab('home');
    showToast({ type: 'info', title: 'Signed Out', message: 'You have been logged out.' });
  };

  // If not logged in, display Landing Page
  if (!currentUser) {
    return (
      <div className="app-layout">
        <LandingPage
          onOpenLogin={() => { setAuthMode('login'); setIsAuthModalOpen(true); }}
          onOpenSignup={() => { setAuthMode('signup'); setIsAuthModalOpen(true); }}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          initialMode={authMode}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={(user) => {
            setCurrentUser(user);
            setIsAuthModalOpen(false);
            setActiveTab('home');
          }}
          onShowToast={showToast}
        />

        <Toast toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // Logged-in Student Platform
  return (
    <div className="app-layout">
      {/* Modern Header Navigation */}
      <Header
        user={currentUser}
        activeTab={activeTab === 'note-workspace' ? 'notes' : activeTab}
        onNavigate={(tab) => {
          setActiveWorkspaceNoteId(null);
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenSearch={() => setIsSearchOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Pages Content */}
      <main className="main-content">
        {activeTab === 'home' && (
          <Dashboard
            user={currentUser}
            onNavigate={(tab) => {
              setActiveWorkspaceNoteId(null);
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenUpload={() => setIsUploadOpen(true)}
            onSelectNote={(noteId) => {
              setActiveWorkspaceNoteId(noteId);
              setWorkspaceInitialMode('learn');
              setActiveTab('note-workspace');
            }}
            onStartStudying={() => setActiveTab('notes')}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'notes' && (
          <NotesLibrary
            onSelectNote={(noteId) => {
              setActiveWorkspaceNoteId(noteId);
              setWorkspaceInitialMode('learn');
              setActiveTab('note-workspace');
            }}
            onOpenUpload={() => setIsUploadOpen(true)}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'note-workspace' && activeWorkspaceNoteId && (
          <NoteDetailsPage
            noteId={activeWorkspaceNoteId}
            initialMode={workspaceInitialMode}
            onBack={() => {
              setActiveWorkspaceNoteId(null);
              setWorkspaceInitialMode('learn');
              setActiveTab('notes');
            }}
            onShowToast={showToast}
            onNavigateMistakes={() => setActiveTab('mistakes')}
          />
        )}

        {activeTab === 'ai-study' && (
          <AIStudy
            onShowToast={showToast}
            onNavigateNotes={() => setActiveTab('notes')}
          />
        )}

        {activeTab === 'mock-exam' && (
          <MockExam
            onNavigateAI={(noteId) => {
              if (noteId) {
                setActiveWorkspaceNoteId(noteId);
                setWorkspaceInitialMode('practice');
                setActiveTab('note-workspace');
              } else {
                setActiveTab('notes');
              }
            }}
            onShowToast={showToast}
            onNavigateMistakes={() => setActiveTab('mistakes')}
          />
        )}

        {activeTab === 'exam-prep' && (
          <ExamPrep
            onNavigateAI={(noteId, subTab) => {
              if (noteId) {
                setActiveWorkspaceNoteId(noteId);
                // Requirement 18: Study Notes -> 'learn', Practice Drills -> 'practice'
                setWorkspaceInitialMode(subTab === 'mcq' ? 'practice' : 'learn');
                setActiveTab('note-workspace');
              } else {
                setActiveTab('notes');
              }
            }}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'progress' && (
          <MyProgress
            onNavigateAI={() => setActiveTab('notes')}
          />
        )}

        {activeTab === 'mistakes' && (
          <MistakeNotebook
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        onShowToast={showToast}
      />

      {/* Interactive AI Multi-Step Processing Animation Modal (Part 15) */}
      <AIProcessingModal
        isOpen={Boolean(processingModalData)}
        note={processingModalData?.note}
        warningMessage={processingModalData?.warningMessage}
        onClose={() => setProcessingModalData(null)}
        onViewStudyHub={handleOpenStudyPack}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectNote={(note) => {
          setActiveWorkspaceNoteId(note.id);
          setActiveTab('note-workspace');
        }}
        onNavigateAI={() => setActiveTab('notes')}
      />

      {/* Global Toast System */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
