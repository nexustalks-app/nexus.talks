import fs from 'fs';
import path from 'path';

const pagePath = path.resolve(process.cwd(), 'app/page.tsx');
const pageContent = fs.readFileSync(pagePath, 'utf8');

console.log('--- VERIFYING LANDING CTA IMPLEMENTATION ---');

// 1. Check Install App button
const hasInstallBtn = pageContent.includes('Install App');
const hasInstallHref = pageContent.includes('href="#install"');
const hasDownloadIcon = pageContent.includes('<Download');
console.log(`1. Install App button exists: ${hasInstallBtn}`);
console.log(`   Points to #install: ${hasInstallHref}`);
console.log(`   Has Download icon: ${hasDownloadIcon}`);

// 2. Check See a Demo button
const hasDemoBtn = pageContent.includes('See a Demo');
const hasDemoHref = pageContent.includes('href="/demo"');
const hasPlayIcon = pageContent.includes('<Play');
console.log(`2. See a Demo button exists: ${hasDemoBtn}`);
console.log(`   Points to /demo: ${hasDemoHref}`);
console.log(`   Has Play icon: ${hasPlayIcon}`);

// 3. Check Dedicated Installation Section
const hasInstallSection = pageContent.includes('id="install"');
const hasAndroidCard = pageContent.includes('Android Native App');
const hasPwaCard = pageContent.includes('Web Application (PWA)');
console.log(`3. Dedicated #install section exists: ${hasInstallSection}`);
console.log(`   Has Android client card: ${hasAndroidCard}`);
console.log(`   Has PWA card: ${hasPwaCard}`);

// 4. Check layout smooth scroll
const layoutPath = path.resolve(process.cwd(), 'app/layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');
const hasSmoothScroll = layoutContent.includes('scroll-smooth');
console.log(`4. Smooth scroll on html tag: ${hasSmoothScroll}`);

if (hasInstallBtn && hasInstallHref && hasDemoBtn && hasDemoHref && hasInstallSection && hasAndroidCard && hasPwaCard && hasSmoothScroll) {
  console.log('\n[PASS] All Landing Page CTA and Installation requirements verified successfully!');
  process.exit(0);
} else {
  console.error('\n[FAIL] Missing verification criteria');
  process.exit(1);
}
