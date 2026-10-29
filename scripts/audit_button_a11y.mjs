import fs from 'fs';
import path from 'path';

function walk(dir) {
  let files = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else if (e.name.endsWith('.tsx')) files.push(full);
  });
  return files;
}

const files = walk('components');
const issues = [];

files.forEach((f) => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, i) => {
    if (line.includes('<button') && !line.includes('aria-label') && !line.includes('title')) {
      // Check next 5 lines for aria-label or title
      const context = lines.slice(i, i + 6).join(' ');
      if (!context.includes('aria-label') && !context.includes('title') && !context.includes('children')) {
        // If it only contains an icon (<... className="h-..." />) without text
        if (context.includes('className="h-') || context.includes('className="w-')) {
          issues.push({ file: f, line: i + 1, snippet: line.trim() });
        }
      }
    }
  });
});

console.log('Potentially unlabelled icon buttons found:', issues.length);
issues.forEach((iss) => console.log(`  ${iss.file}:${iss.line} -> ${iss.snippet}`));
