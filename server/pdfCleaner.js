// ============================================================================
// StudyBuddy Intelligent Document Cleaning & Structuring Pipeline (server/pdfCleaner.js)
// Strips institutional boilerplate, cover pages, repeated headers/footers,
// course codes, and page numbers, while extracting true educational units,
// topics, definitions, comparisons, and core concepts.
// ============================================================================

/**
 * Common institutional boilerplate regexes (College names, accreditations, addresses)
 */
const INSTITUTIONAL_PATTERNS = [
  // College names & Autonomous institution markers
  /(?:MALLA\s+REDDY|COLLEGE\s+OF\s+ENGINEERING|ENGINEERING\s*&\s*TECHNOLOGY|AUTONOMOUS\s+INSTITUTION|AUTONOMOUS\s+COLLEGE|UNIVERSITY\s+COLLEGE)/gi,
  // Accreditation, affiliations, ISO, UGC
  /(?:ACCREDITED\s+BY|AFFILIATED\s+TO\s+JNTU|UGC\s+ACT\s+1956|APPROVED\s+BY\s+AICTE|NBA\s*&\s*NAAC|ISO\s*9001[:\d]*\s*CERTIFIED|GOVT\.\s*OF\s*INDIA|GRADE\s*[-–]\s*A)/gi,
  // Campus addresses, locations, pin codes
  /(?:MAISAMMAGUDA|DHULAPALLY|HAKIMPET|SECUNDERABAD|HYDERABAD|TELANGANA\s*STATE|PIN\s*[-:]?\s*5\d{5}|INDIA)/gi,
  // Academic course headings and codes
  /(?:DIGITAL\s+NOTES\s+ON|LECTURE\s+NOTES\s+ON|CLASS\s+NOTES|COURSE\s+MATERIAL|SYLLABUS\s+COPY)/gi,
  /(?:B\.\s*TECH\s*(?:IV|III|II|I)\s*YEAR|IV\s*Year\s*B\.Tech|M\.\s*TECH|B\.E\.|B\.SC|\bSEM\s*[-–:]?\s*(?:I|II|III|IV|V|VI|VII|VIII|\d)|\(R18[A-Z0-9]*\))/gi,
  // Print & scanner artifacts, IP addresses, exam candidate markers
  /(?:CEGP\d+|\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b|\bstatic-\d+\b|\b\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}\b)/gi,
  /(?:SEAT\s*No\.?\s*[:\s]*|Total\s*No\.?\s*of\s*Pages|Instructions\s*to\s*the\s*candidates|Figures\s*to\s*the\s*right\s*side|Max\.\s*Marks|Time\s*:\s*\d+\s*Hours?)/gi
];

/**
 * Clean raw text from an academic PDF
 */
export function cleanDocumentText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText;

  // 1. Remove page number markers (-- 1 of 85 --, Page 3 of 10, P.T.O., etc.)
  text = text.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '');
  text = text.replace(/\bPage\s*(?:No\.?)?\s*[-–:]?\s*\d+\b/gi, '');
  text = text.replace(/\bP\.T\.O\.?\b/gi, '');
  text = text.replace(/^\s*\d+\s*$/gm, '');

  // 2. Fix broken hyphenated line wraps (e.g. "vir-\ntualization" -> "virtualization")
  text = text.replace(/([a-zA-Z]+)-\s*\n\s*([a-zA-Z]+)/g, '$1$2');

  // 3. Find where the true educational material begins
  // Academic notes often have 1-5 pages of cover sheet, syllabus, textbooks list, and index table
  const introIdx = text.search(/Introduction\s+to\s+[A-Za-z\s]+:|What\s+is\s+(?:the\s+)?[A-Za-z\s]+:|Definition\s+of\s+[A-Za-z\s]+:/i);
  if (introIdx > 500) {
    // Check if there is an immediately preceding UNIT I heading within 500 chars
    const preText = text.slice(Math.max(0, introIdx - 500), introIdx);
    const unitMatch = preText.match(/(?:^|\n)(UNIT\s*[-–:]?\s*[IVX0-9]+[\s\S]*)$/i);
    const realStart = unitMatch ? (introIdx - preText.length + unitMatch.index) : introIdx;
    text = text.slice(realStart);
  } else {
    // Fallback: check standard markers
    const educationalStartMarkers = [
      /\bIntroduction\s+to\s+[A-Za-z\s]+:/i,
      /\bWhat\s+is\s+(?:the\s+)?[A-Za-z\s]+:/i,
      /\bDefinition\s+of\s+[A-Za-z\s]+:/i,
      /\bUNIT\s*[-–:]?\s*I\b/i,
      /\bCHAPTER\s*[-–:]?\s*1\b/i
    ];
    let earliest = -1;
    for (const marker of educationalStartMarkers) {
      const match = text.match(marker);
      if (match && match.index !== undefined && match.index > 300) {
        if (earliest === -1 || match.index < earliest) earliest = match.index;
      }
    }
    if (earliest > 0) text = text.slice(earliest);
  }

  // 4. Clean line by line: remove boilerplate lines & uninformative fragments
  const lines = text.split('\n');
  const cleanedLines = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      cleanedLines.push('');
      continue;
    }

    // Skip short standalone numbers or symbols
    if (/^[\d.\-_#*|~`+=<>]{1,4}$/.test(trimmed)) continue;

    // Check if line matches any institutional boilerplate
    let isBoilerplate = false;
    for (const pattern of INSTITUTIONAL_PATTERNS) {
      if (pattern.test(trimmed)) {
        isBoilerplate = true;
        break;
      }
    }

    if (!isBoilerplate) {
      cleanedLines.push(trimmed);
    }
  }

  // 5. Rejoin and normalize paragraph spacing
  let cleaned = cleanedLines.join('\n');
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n');

  return cleaned.trim();
}

/**
 * Extract structured hierarchy (Units, Topics, and Definitions) from cleaned text
 */
export function extractStructuredDocument(cleanedText, fallbackTitle = 'Study Document') {
  if (!cleanedText) {
    return {
      title: fallbackTitle,
      units: [],
      extractedDefinitions: [],
      comparisons: [],
      cleanedEducationalText: ''
    };
  }

  // 1. Identify Units (UNIT I, UNIT II, etc. or CHAPTER 1, etc.)
  const unitRegex = /(?:^|\n)(?:UNIT|Unit|CHAPTER|Chapter)\s*[-–:]?\s*([IVX0-9]+)\b[:\s]*(.*?)(?=(?:\n(?:UNIT|Unit|CHAPTER|Chapter)\s*[-–:]?\s*[IVX0-9]+)|$)/gis;
  const units = [];
  let unitMatch;

  while ((unitMatch = unitRegex.exec(cleanedText)) !== null) {
    const unitNumber = unitMatch[1].trim();
    const rawUnitContent = unitMatch[2].trim();
    
    // Extract topic headings inside this unit
    const topicHeadingRegex = /(?:^|\n)([A-Z][A-Za-z0-9\s,&()/-]{3,50}:|[A-Z\s]{4,40})(?=\n)/g;
    const topics = [];
    const topicMatches = [...rawUnitContent.matchAll(topicHeadingRegex)];

    if (topicMatches.length > 0) {
      for (let i = 0; i < topicMatches.length; i++) {
        const title = topicMatches[i][1].replace(/:$/, '').trim();
        const start = topicMatches[i].index + topicMatches[i][0].length;
        const end = (i < topicMatches.length - 1) ? topicMatches[i + 1].index : rawUnitContent.length;
        const content = rawUnitContent.slice(start, end).trim();

        if (
          title.length > 3 &&
          !/^(PAGE|USER|THE|AND|FIGURE|TABLE|SECTION|UNIT|NOTE|CASE STUDIES|TEXTBOOKS)/i.test(title)
        ) {
          topics.push({
            title,
            content: content.slice(0, 1500)
          });
        }
      }
    }

    if (topics.length === 0) {
      // Fallback: split unit by double newlines into major sections
      const paragraphs = rawUnitContent.split(/\n\s*\n/).filter(p => p.length > 50);
      topics.push({
        title: `Unit ${unitNumber} Core Concepts`,
        content: paragraphs.slice(0, 3).join('\n\n')
      });
    }

    // Title determination
    let unitTitle = topics[0]?.title || `Unit ${unitNumber}`;
    if (/Fundamentals|Overview|Introduction/i.test(unitTitle)) {
      unitTitle = `${unitTitle}`;
    }

    units.push({
      unitNumber,
      title: unitTitle,
      topics: topics.slice(0, 6)
    });
  }

  // If no "UNIT" pattern was found, create synthetic units by major topics
  if (units.length === 0) {
    const majorHeadings = [...cleanedText.matchAll(/(?:^|\n)([A-Z][A-Za-z0-9\s,&()/-]{4,45}:|[A-Z\s]{5,40})(?=\n)/g)]
      .map(m => m[1].replace(/:$/, '').trim())
      .filter(h => h.length > 4 && !/^(PAGE|USER|THE|AND|FIGURE|TABLE|SECTION)/i.test(h));

    const uniqueHeadings = Array.from(new Set(majorHeadings)).slice(0, 5);
    if (uniqueHeadings.length > 0) {
      units.push({
        unitNumber: '1',
        title: 'Core Topics & Principles',
        topics: uniqueHeadings.map(h => ({
          title: h,
          content: cleanedText.slice(0, 1200)
        }))
      });
    } else {
      units.push({
        unitNumber: '1',
        title: fallbackTitle,
        topics: [{ title: 'Overview', content: cleanedText.slice(0, 1500) }]
      });
    }
  }

  // 2. Extract Genuine Definitions Dynamically From Document Text
  const extractedDefinitions = [];

  // Pattern A: "Term: definition..."
  const customDefRegex = /(?:^|\n)([A-Z][A-Za-z0-9\s()/-]{3,35})\s*:\s*([^.\n]{25,250}\.)/g;
  let customMatch;
  while ((customMatch = customDefRegex.exec(cleanedText)) !== null && extractedDefinitions.length < 12) {
    const term = customMatch[1].trim();
    const definition = customMatch[2].replace(/\n+/g, ' ').trim();
    if (
      !/^(Page|Unit|Figure|Table|Case|Note|Textbooks|Outcomes|Index|Objectives|Instructions|Question)/i.test(term) &&
      !extractedDefinitions.some(d => d.term.toLowerCase() === term.toLowerCase())
    ) {
      extractedDefinitions.push({ term, definition });
    }
  }

  // Pattern B: "[Term] is defined as [definition]..."
  const isDefinedRegex = /(?:^|\n|\. )([A-Z][A-Za-z0-9\s-]{2,40})\s+(?:is defined as|is known as|refers to|represents)\s+([^.\n]{20,250}\.)/g;
  let isDefMatch;
  while ((isDefMatch = isDefinedRegex.exec(cleanedText)) !== null && extractedDefinitions.length < 15) {
    const term = isDefMatch[1].trim();
    const definition = isDefMatch[2].replace(/\n+/g, ' ').trim();
    if (
      !/^(This|It|There|Which|That|These|Those)/i.test(term) &&
      !extractedDefinitions.some(d => d.term.toLowerCase() === term.toLowerCase())
    ) {
      extractedDefinitions.push({ term, definition: `${term} ${isDefMatch[0].includes('is defined as') ? 'is defined as' : 'refers to'} ${definition}` });
    }
  }

  // 3. Extract Genuine Comparisons From Document Text
  const comparisons = [];
  const vsRegex = /(?:difference between|comparison between|distinguish between)\s+([A-Za-z0-9\s,-]+?)\s+(?:and|versus|vs\.?)\s+([A-Za-z0-9\s,-]+?)(?:\.|\n|:)/gi;
  let vsMatch;
  while ((vsMatch = vsRegex.exec(cleanedText)) !== null && comparisons.length < 4) {
    const conceptA = vsMatch[1].trim();
    const conceptB = vsMatch[2].trim();
    if (conceptA.length > 2 && conceptB.length > 2 && conceptA.length < 40 && conceptB.length < 40) {
      comparisons.push({
        concept: `${conceptA} vs ${conceptB}`,
        meaning: `Comparative distinction identified in course curriculum between ${conceptA} and ${conceptB}.`,
        examples: `Refer to lecture definitions for ${conceptA} and ${conceptB}`,
        control: 'Conceptual Comparison'
      });
    }
  }

  return {
    title: fallbackTitle,
    units,
    extractedDefinitions: extractedDefinitions.slice(0, 10),
    comparisons,
    cleanedEducationalText: cleanedText
  };
}
