// ============================================================================
// StudyBuddy Real PDF Text Extraction Engine (server/pdfService.js)
// Extracts real text, counts pages, detects scanned/image-only PDFs,
// and sanitizes text for AI pedagogical analysis.
// ============================================================================

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');

export async function extractTextFromPDF(buffer) {
  if (!buffer || buffer.length === 0) {
    throw new Error('PDF file is empty (0 bytes). Please upload a valid document.');
  }

  let rawText = '';
  let numPages = 1;
  let info = {};

  try {
    // If pdfParseModule exports PDFParse class:
    if (pdfParseModule.PDFParse) {
      const parser = new pdfParseModule.PDFParse({ data: buffer });
      try {
        if (typeof parser.load === 'function') {
          await parser.load();
        }
        if (typeof parser.getText === 'function') {
          const textRes = await parser.getText();
          rawText = typeof textRes === 'string' ? textRes : (textRes?.text || '');
        }
        if (typeof parser.getInfo === 'function') {
          info = await parser.getInfo() || {};
        }
        numPages = info.pages || parser.options?.total || 1;
      } finally {
        if (typeof parser.destroy === 'function') {
          await parser.destroy();
        }
      }
    } else if (typeof pdfParseModule === 'function') {
      // Legacy pdf-parse (dataBuffer) signature
      const data = await pdfParseModule(buffer);
      rawText = data.text || '';
      numPages = data.numpages || 1;
      info = data.info || {};
    } else {
      throw new Error('PDF parser engine initialization error.');
    }
  } catch (err) {
    // Check if error is due to corrupted PDF or password
    if (err.name === 'PasswordException' || err.message?.includes('password')) {
      throw new Error('The uploaded PDF is password-protected. Please remove password protection and try again.');
    }
    if (err.name === 'InvalidPDFException' || err.message?.includes('Invalid PDF structure')) {
      throw new Error('Corrupted or invalid PDF format. Please ensure the file is a standard PDF.');
    }
    // General fallback
    throw new Error(`Unable to read PDF file: ${err.message || 'Corrupted document'}`);
  }

  // Clean and sanitize extracted text
  const cleanText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, ' ') // Strip unprintable non-ASCII control bytes
    .replace(/ +/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  // Scanned / Image-only PDF detection (Requirement Part 4)
  // If cleanText has fewer than 40 characters or less than 5 words, it is likely scanned without an OCR layer
  const wordCount = cleanText.split(/\s+/).filter(w => w.length > 1).length;
  if (cleanText.length < 40 || wordCount < 8) {
    return {
      success: true,
      text: '',
      numPages,
      wordCount: 0,
      isScanned: true,
      warningMessage: 'This PDF appears to be scanned/image-based with no embedded text layer. OCR is required to analyze it.'
    };
  }

  return {
    success: true,
    text: cleanText,
    numPages,
    wordCount,
    isScanned: false,
    info
  };
}
