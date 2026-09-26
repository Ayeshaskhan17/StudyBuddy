// scripts/clean_and_regenerate_flashcards.js
// Cleans all invalid/cross-pollinated Cloud Computing flashcards from the database
// and regenerates authentic, noteId-grounded flashcards for every note including SQL/DBMS.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateFlashcards } from '../server/aiEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'data', 'db.json');

async function runCleanup() {
  console.log('--- STARTING DATABASE FLASHCARD CLEANUP & REGENERATION ---');

  if (!fs.existsSync(dbPath)) {
    console.error('db.json not found at:', dbPath);
    return;
  }

  const raw = fs.readFileSync(dbPath, 'utf8');
  const db = JSON.parse(raw);

  // 1. Create a backup
  fs.writeFileSync(dbPath + '.bak', raw, 'utf8');
  console.log('✓ Created database backup at db.json.bak');

  let cleanedCount = 0;
  let regeneratedCount = 0;

  for (const ai of db.aiContent || []) {
    const note = (db.notes || []).find(n => n.id === ai.noteId);
    if (!note) continue;

    const isCloudNote = /cloud/i.test(note.subject) || /cloud/i.test(note.title);
    const hasCloudFlashcards = (ai.flashcards || []).some(
      fc => /cloud computing|iaas|paas|saas|hypervisor/i.test(fc.front || fc.question || fc.topic || '')
    );

    // If it is NOT a Cloud Computing note, but has Cloud Computing flashcards, or missing noteId:
    if (!isCloudNote && hasCloudFlashcards) {
      console.log(`\nFixing corrupted note: [${note.id}] "${note.title}" (${note.subject})`);
      console.log(`  Deleting incorrect Cloud Computing flashcards...`);
      cleanedCount++;

      // Generate authentic cards derived 100% from the note's own text
      const freshCards = await generateFlashcards(
        note.extractedText || note.description,
        note.title,
        note.subject,
        note.topic,
        note.id,
        note.userId
      );

      ai.flashcards = freshCards.map((fc, idx) => ({
        ...fc,
        id: `fc_${note.id}_${idx + 1}_${Date.now().toString(36)}`,
        userId: note.userId,
        noteId: note.id,
        subject: note.subject,
        topic: fc.topic || note.topic || note.title,
        question: fc.front || fc.question || '',
        answer: fc.back || fc.answer || '',
        front: fc.front || fc.question || '',
        back: fc.back || fc.answer || '',
        type: fc.type || 'definition'
      }));

      regeneratedCount++;
      console.log(`  ✓ Generated ${ai.flashcards.length} authentic cards for "${note.title}" (${note.subject})`);
    } else {
      // Ensure all existing flashcards have noteId, userId, subject stamped properly
      ai.flashcards = (ai.flashcards || []).map((fc, idx) => ({
        ...fc,
        id: fc.id || `fc_${note.id}_${idx + 1}_${Date.now().toString(36)}`,
        userId: note.userId,
        noteId: note.id,
        subject: fc.subject || note.subject,
        topic: fc.topic || note.topic || note.title,
        question: fc.front || fc.question || '',
        answer: fc.back || fc.answer || '',
        front: fc.front || fc.question || '',
        back: fc.back || fc.answer || '',
        type: fc.type || 'concept'
      }));
    }
  }

  // Explicitly check SQL Note
  const sqlNote = (db.notes || []).find(n => n.id === 'note_muhb2sdl_k6u3');
  if (sqlNote) {
    console.log('\n--- VERIFYING SQL NOTE (note_muhb2sdl_k6u3) ---');
    const sqlAI = (db.aiContent || []).find(a => a.noteId === sqlNote.id);
    if (sqlAI) {
      console.log(`SQL Note AI Flashcards Count: ${sqlAI.flashcards?.length}`);
      sqlAI.flashcards.forEach((fc, i) => {
        console.log(`  ${i + 1}. [${fc.noteId}] (${fc.subject}) Front: "${fc.front}"`);
        if (/cloud computing|iaas|paas/i.test(fc.front + ' ' + fc.topic)) {
          throw new Error('CRITICAL: SQL note still contains Cloud Computing cards!');
        }
      });
      console.log('✓ SQL Flashcards 100% verified free of Cloud Computing content!');
    }
  }

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log(`\n======================================================`);
  console.log(`✓ Migration Complete! Cleaned: ${cleanedCount}, Regenerated: ${regeneratedCount}`);
  console.log(`======================================================`);
}

runCleanup().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
