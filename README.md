# StudyBuddy — AI Collaborative Study & Exam Prep Platform (v2.0)

StudyBuddy is a modern, student-centric web application designed to help university and college students study smarter, retain complex concepts, practice questions, and prepare systematically for exams using **Amazon S3 cloud storage**, **real PDF text extraction**, and an intelligent **AI pedagogical engine**.

---

## 🌟 What's New in v2.0 (Real Platform Upgrade)

1. **Real Authentication & User Isolation**:
   - Complete authentication flow: `/login`, `/signup`, `/forgot-password`, `/dashboard`.
   - JWT sessions with bcrypt password encryption.
   - Strict multi-tenant isolation: every student has their own notes, dynamic subjects, quiz attempts, mistake logs, and study plans.
2. **Real PDF Text Extraction Engine**:
   - Server-side parsing with `pdf-parse` extracts propositions, definitions, and equations directly from uploaded documents.
   - Detects scanned/image-only PDFs and warns the student that an OCR layer is needed.
3. **Real Document-Grounded AI Generation**:
   - Generates structured summaries, active-recall MCQs, memory mnemonics, flashcards, and exam plans derived 100% from the uploaded document text.
   - Supports Google Gemini API & OpenAI API + contextual semantic extractive fallback (zero predefined or fake questions!).
   - Interactive document Q&A chat ("Ask AI About This Note").
4. **Dynamic Subjects Architecture**:
   - Subjects appear only when created or when a note is uploaded under that subject.
   - No hardcoded arrays as the source of truth.
5. **Interactive AI Processing Experience**:
   - Multi-step animated progress visualization: Uploading to S3 -> Extracting text -> Synthesizing concepts -> Generating questions -> "Your AI Study Pack is Ready!".
6. **Split Document Workspace (Note Details)**:
   - Left pane: Document information, page count, S3 path, extracted text reader.
   - Right pane: AI Study Assistant with tabs for Summary, Topics, MCQs, Flashcards, and Ask AI Chat.
7. **Futuristic Dark Aesthetic**:
   - Midnight black background with ambient electric blue and purple glows, glassmorphism cards, and animated glowing AI Orb centerpiece.
   - Landing page with features, how it works, and "Explore Demo" option.

---

## ☁️ Amazon S3 Storage Structure

StudyBuddy securely organizes study materials by user and subject:
```text
studybuddy-notes-vault/
└── users/
    └── {userId}/
        └── notes/
            └── {subject}/
                └── {noteId}/
                    └── original.pdf
```
- **Zero Client-Side Secret Exposure**: AWS credentials are kept on the server.
- Supports dual mode: live AWS S3 or high-fidelity local S3 sandbox.

---

## 🔐 Environment Variables

Copy `.env.example` to `.env`:

```env
# Application Environment
VITE_APP_NAME=StudyBuddy
VITE_APP_VERSION=2.0.0
PORT=5000
JWT_SECRET=your_jwt_secret_key_change_in_production

# Amazon Web Services (AWS) S3
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=studybuddy-notes-vault
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
STORAGE_MODE=emulated

# AI Engine (Optional - Gemini or OpenAI)
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

---

## 🚀 Running Locally

### 1. Install Dependencies
```powershell
npm install
```

### 2. Start Full-Stack Platform
In one terminal (Backend Express API Server):
```powershell
node server.js
```
*Listens on `http://localhost:5000`.*

In another terminal (Frontend Vite Dev Server with `/api` proxy):
```powershell
npm run dev
```
*Live at `http://localhost:5173`.*

### 3. Run Acceptance Test Script
To verify the full 20-step end-to-end pipeline (Signup -> S3 Upload -> PDF Extraction -> AI Generation -> Quiz -> Mistake Notebook -> Re-login persistence):
```powershell
node test_flow.js
```

### 4. Run Educational Content Quality Pipeline Test
To verify the deep PDF cleaning, genuine conceptual MCQs (0% templates, 0% boilerplate), interactive flashcards, topic maps, and grounded tutor chat on the real Cloud Computing PDF:
```powershell
node test_pipeline.js
```

### 5. Build for Production
```powershell
npm run build
```

---

## 📁 Project Architecture

```text
studyBudy/
├── .env.example              # Environment variables template
├── server.js                 # Express backend: Auth, S3, PDF extraction, AI engine
├── test_flow.js              # Full 20-step automated verification test
├── test_pipeline.js          # Deep educational content quality & document test
├── data/
│   └── db.json               # Server-side persistent storage (user-isolated)
├── server/
│   ├── db.js                 # Multi-tenant database layer
│   ├── pdfService.js         # Real PDF parsing and scanned document detection
│   ├── pdfCleaner.js         # Document cleaning, boilerplate removal, & unit structuring
│   └── aiEngine.js           # Pedagogical AI generator, MCQ validator & Ask AI chat
└── src/
    ├── App.jsx               # Master coordinator & landing/auth/dashboard router
    ├── services/
    │   ├── authService.js    # JWT session and profile management
    │   ├── apiService.js     # Authenticated API client for all backend endpoints
    │   └── aiService.js      # AI client service delegating to backend API
    ├── components/
    │   ├── Header.jsx        # Navigation, S3 status pill, user avatar, logout
    │   ├── AuthModal.jsx     # Login, Signup (academic details), Forgot Password
    │   ├── AIProcessingModal.jsx # Multi-step AI processing animation
    │   ├── UploadModal.jsx   # Drag & drop upload with dynamic subject selection
    │   ├── InteractiveFlashcards.jsx # 3D perspective flip, Space/Arrow keys, progress bar
    │   ├── InteractiveSummary.jsx    # Expandable sections, comparison tables, exam focus
    │   ├── TopicStudyMap.jsx # Hierarchical unit/topic map with [Study Topic] triggers
    │   ├── S3StatusModal.jsx # S3 hierarchy visualizer & test ping
    │   └── Toast.jsx         # Status toast notification manager
    ├── pages/
    │   ├── LandingPage.jsx   # Pre-login futuristic landing page with AI Orb
    │   ├── Dashboard.jsx     # Real user metrics, streak, upcoming exams, clean empty state
    │   ├── NotesLibrary.jsx  # Multi-filter library with dynamic subject tabs
    │   ├── NoteDetailsPage.jsx# 5 Learning Modes: Learn, Flashcards, Practice, Mock, Revision, Chat
    │   ├── AIStudy.jsx       # Real document study hub
    │   ├── MCQQuiz.jsx       # Immediate feedback, Why? explanations, persistent mistakes
    │   ├── ExamPrep.jsx      # Day-by-day exam timeline & adaptive weak topic alerts
    │   ├── MistakeNotebook.jsx# My Mistakes revision center with "Practice Again"
    │   └── MyProgress.jsx    # Real analytics & weekly study activity bar chart
    └── styles/
        └── index.css         # Futuristic dark aesthetic, glowing gradients, glassmorphism
```
