import fs from 'fs';
import path from 'path';

const projectRoot = 'C:\\Users\\raist\\Downloads\\nexus mess\\aasif-messenger';

const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'avatar-assets',
]);

function isExcluded(filePath) {
  const parts = filePath.split(path.sep);
  return parts.some((part) => EXCLUDE_DIRS.has(part));
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(projectRoot, fullPath);

    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push({ fullPath, relPath, name: entry.name });
    }
  }

  return arrayOfFiles;
}

function analyzeFile(filePath, ext) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const totalLines = lines.length;
  let blankLines = 0;
  let commentLines = 0;
  let inBlockComment = false;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      blankLines++;
      continue;
    }

    if (['.ts', '.tsx', '.js', '.mjs', '.css'].includes(ext)) {
      if (inBlockComment) {
        commentLines++;
        if (trimmed.includes('*/')) {
          inBlockComment = false;
        }
        continue;
      }
      if (trimmed.startsWith('/*')) {
        commentLines++;
        if (!trimmed.includes('*/') || trimmed.endsWith('*/') && trimmed.indexOf('*/') === trimmed.length - 2) {
          if (!trimmed.includes('*/')) inBlockComment = true;
        }
        continue;
      }
      if (trimmed.startsWith('//')) {
        commentLines++;
        continue;
      }
    } else if (ext === '.sql') {
      if (inBlockComment) {
        commentLines++;
        if (trimmed.includes('*/')) {
          inBlockComment = false;
        }
        continue;
      }
      if (trimmed.startsWith('/*')) {
        commentLines++;
        if (!trimmed.includes('*/')) inBlockComment = true;
        continue;
      }
      if (trimmed.startsWith('--')) {
        commentLines++;
        continue;
      }
    }
  }

  const codeLines = totalLines - blankLines - commentLines;
  return { totalLines, blankLines, commentLines, codeLines, sizeBytes: fs.statSync(filePath).size };
}

const allFiles = getAllFiles(projectRoot);

const extStats = {};
const categoryStats = {
  'App Routes & Layouts (app/)': { count: 0, total: 0, code: 0, comments: 0, blank: 0 },
  'Components (components/)': { count: 0, total: 0, code: 0, comments: 0, blank: 0 },
  'Library & Core Logic (lib/)': { count: 0, total: 0, code: 0, comments: 0, blank: 0 },
  'Type Definitions (types/)': { count: 0, total: 0, code: 0, comments: 0, blank: 0 },
  'Database Migrations (supabase/)': { count: 0, total: 0, code: 0, comments: 0, blank: 0 },
  'Scripts & Test Runners (scripts/)': { count: 0, total: 0, code: 0, comments: 0, blank: 0 },
  'Public & Static Assets (public/)': { count: 0, total: 0, code: 0, comments: 0, blank: 0 },
  'Documentation (*.md, docs/)': { count: 0, total: 0, code: 0, comments: 0, blank: 0 },
  'Root Config & Tooling': { count: 0, total: 0, code: 0, comments: 0, blank: 0 },
};

const fileListWithLines = [];

for (const file of allFiles) {
  const ext = path.extname(file.name).toLowerCase() || '[no_ext]';
  const isImageOrBinary = ['.png', '.jpg', '.jpeg', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.tsbuildinfo'].includes(ext);

  let stats = { totalLines: 0, blankLines: 0, commentLines: 0, codeLines: 0, sizeBytes: fs.statSync(file.fullPath).size };

  if (!isImageOrBinary) {
    try {
      stats = analyzeFile(file.fullPath, ext);
      fileListWithLines.push({ relPath: file.relPath, ...stats, ext });
    } catch (e) {
      // binary or encoding error
    }
  }

  if (!extStats[ext]) {
    extStats[ext] = { count: 0, total: 0, code: 0, comments: 0, blank: 0, bytes: 0, isBinary: isImageOrBinary };
  }
  extStats[ext].count++;
  extStats[ext].total += stats.totalLines;
  extStats[ext].code += stats.codeLines;
  extStats[ext].comments += stats.commentLines;
  extStats[ext].blank += stats.blankLines;
  extStats[ext].bytes += stats.sizeBytes;

  // Determine category
  const rel = file.relPath.replace(/\\/g, '/');
  let cat = 'Root Config & Tooling';
  if (rel.startsWith('app/')) cat = 'App Routes & Layouts (app/)';
  else if (rel.startsWith('components/')) cat = 'Components (components/)';
  else if (rel.startsWith('lib/')) cat = 'Library & Core Logic (lib/)';
  else if (rel.startsWith('types/')) cat = 'Type Definitions (types/)';
  else if (rel.startsWith('supabase/')) cat = 'Database Migrations (supabase/)';
  else if (rel.startsWith('scripts/')) cat = 'Scripts & Test Runners (scripts/)';
  else if (rel.startsWith('public/')) cat = 'Public & Static Assets (public/)';
  else if (rel.startsWith('docs/') || rel.endsWith('.md')) cat = 'Documentation (*.md, docs/)';

  categoryStats[cat].count++;
  categoryStats[cat].total += stats.totalLines;
  categoryStats[cat].code += stats.codeLines;
  categoryStats[cat].comments += stats.commentLines;
  categoryStats[cat].blank += stats.blankLines;
}

// Sort largest files
fileListWithLines.sort((a, b) => b.totalLines - a.totalLines);

console.log('=== SUMMARY OF REPOSITORY CODE STATISTICS ===');
console.log(`Total Tracked Project Files (excluding node_modules, .next, avatar-assets): ${allFiles.length}`);

console.log('\n--- BREAKDOWN BY EXTENSION ---');
console.table(
  Object.entries(extStats)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([ext, s]) => ({
      Extension: ext,
      Files: s.count,
      'Total Lines': s.total,
      'Code Lines': s.code,
      Comments: s.comments,
      Blank: s.blank,
      'Size (KB)': Math.round(s.bytes / 1024),
    }))
);

console.log('\n--- BREAKDOWN BY ARCHITECTURAL CATEGORY ---');
console.table(
  Object.entries(categoryStats).map(([cat, s]) => ({
    Category: cat,
    Files: s.count,
    'Total Lines': s.total,
    'Code Lines': s.code,
    Comments: s.comments,
    Blank: s.blank,
  }))
);

console.log('\n--- TOP 20 LARGEST SOURCE FILES ---');
console.table(
  fileListWithLines.slice(0, 20).map((f) => ({
    File: f.relPath,
    Lines: f.totalLines,
    Code: f.codeLines,
    Comments: f.commentLines,
    Blank: f.blankLines,
  }))
);
