import fs from 'fs';
import path from 'path';

const projectRoot = 'C:\\Users\\raist\\Downloads\\nexus mess\\aasif-messenger';
const EXCLUDE_DIRS = new Set(['node_modules', '.next', '.git', 'avatar-assets']);

function getAllFiles(dirPath, arrayOfFiles = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.ts', '.tsx', '.js', '.mjs', '.sql'].includes(ext)) {
        arrayOfFiles.push(fullPath);
      }
    }
  }
  return arrayOfFiles;
}

const files = getAllFiles(projectRoot);

const findings = {
  todos: [],
  fixmes: [],
  tsIgnores: [],
  asAnys: [],
  consoleLogs: [],
  emptyCatches: [],
};

for (const f of files) {
  const rel = path.relative(projectRoot, f).replace(/\\/g, '/');
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    if (/\bTODO\b/i.test(trimmed)) {
      findings.todos.push({ file: rel, lineNum, text: trimmed });
    }
    if (/\bFIXME\b/i.test(trimmed)) {
      findings.fixmes.push({ file: rel, lineNum, text: trimmed });
    }
    if (/@ts-ignore|@ts-expect-error/.test(trimmed)) {
      findings.tsIgnores.push({ file: rel, lineNum, text: trimmed });
    }
    if (/\bas\s+any\b/.test(trimmed) && !rel.startsWith('scripts/')) {
      findings.asAnys.push({ file: rel, lineNum, text: trimmed });
    }
    if (/\bconsole\.(log|warn|debug)\(/.test(trimmed) && !rel.startsWith('scripts/')) {
      findings.consoleLogs.push({ file: rel, lineNum, text: trimmed });
    }
    if (/catch\s*\([^)]*\)\s*\{\s*(\/\*.*\*\/)?\s*\}/.test(trimmed)) {
      findings.emptyCatches.push({ file: rel, lineNum, text: trimmed });
    }
  });
}

console.log('=== CODE HYGIENE SCAN RESULTS ===');
console.log(`TODOs found: ${findings.todos.length}`);
findings.todos.forEach(t => console.log(`  [TODO] ${t.file}:${t.lineNum} -> ${t.text}`));

console.log(`\nFIXMEs found: ${findings.fixmes.length}`);
findings.fixmes.forEach(t => console.log(`  [FIXME] ${t.file}:${t.lineNum} -> ${t.text}`));

console.log(`\n@ts-ignore / @ts-expect-error found: ${findings.tsIgnores.length}`);
findings.tsIgnores.forEach(t => console.log(`  [TS-IGNORE] ${t.file}:${t.lineNum} -> ${t.text}`));

console.log(`\n'as any' casts found (app/components/lib): ${findings.asAnys.length}`);
findings.asAnys.slice(0, 15).forEach(t => console.log(`  [AS-ANY] ${t.file}:${t.lineNum} -> ${t.text}`));
if (findings.asAnys.length > 15) console.log(`  ... and ${findings.asAnys.length - 15} more.`);

console.log(`\nconsole.log in production code: ${findings.consoleLogs.length}`);
findings.consoleLogs.slice(0, 15).forEach(t => console.log(`  [LOG] ${t.file}:${t.lineNum} -> ${t.text}`));

console.log(`\nEmpty catches: ${findings.emptyCatches.length}`);
findings.emptyCatches.forEach(t => console.log(`  [EMPTY-CATCH] ${t.file}:${t.lineNum} -> ${t.text}`));
