import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
console.log('====================================================');
console.log(' NEXUS.TALKS — INSTALL APP & DEMO VERIFICATION');
console.log('====================================================\n');

// 1. Check Landing Page and Hero CTA
const pagePath = path.resolve(projectRoot, 'app/page.tsx');
const pageContent = fs.readFileSync(pagePath, 'utf8');

const hasHeroInstallCta = pageContent.includes('<HeroInstallCta');
const hasSeeDemoBtn = pageContent.includes('See a Demo') && pageContent.includes('href="/demo"');
const hasInstallSection = pageContent.includes('id="install"');
const hasAndroidCard = pageContent.includes('Android Native App');
const hasPwaCard = pageContent.includes('Web Application (PWA)');

console.log(`1. Landing Page checks:`);
console.log(`   - Hero Install CTA mounted: ${hasHeroInstallCta}`);
console.log(`   - See a Demo links to /demo: ${hasSeeDemoBtn}`);
console.log(`   - Dedicated #install section exists: ${hasInstallSection}`);
console.log(`   - Android Native card present: ${hasAndroidCard}`);
console.log(`   - PWA card present: ${hasPwaCard}`);

// 2. Check Interactive Install Dialog & PWA Component
const dialogPath = path.resolve(projectRoot, 'components/landing/install-app-dialog.tsx');
const ctaPath = path.resolve(projectRoot, 'components/landing/hero-install-cta.tsx');
const hasDialogFile = fs.existsSync(dialogPath);
const hasCtaFile = fs.existsSync(ctaPath);
const dialogContent = hasDialogFile ? fs.readFileSync(dialogPath, 'utf8') : '';
const hasBeforeInstallPrompt = dialogContent.includes('beforeinstallprompt');
const hasSwRegister = dialogContent.includes('/sw.js');
const hasPlatformGuides = dialogContent.includes('Safari') && dialogContent.includes('Android');

console.log(`\n2. Interactive Installation Dialog:`);
console.log(`   - InstallAppDialog component exists: ${hasDialogFile}`);
console.log(`   - HeroInstallCta component exists: ${hasCtaFile}`);
console.log(`   - beforeinstallprompt PWA prompt hook: ${hasBeforeInstallPrompt}`);
console.log(`   - Service Worker registration call: ${hasSwRegister}`);
console.log(`   - Platform specific install guides: ${hasPlatformGuides}`);

// 3. Check PWA Manifest, Icons, and Service Worker
const manifestPath = path.resolve(projectRoot, 'app/manifest.ts');
const swPath = path.resolve(projectRoot, 'public/sw.js');
const icon192Path = path.resolve(projectRoot, 'public/icon-192.png');
const icon512Path = path.resolve(projectRoot, 'public/icon-512.png');
const iconSvgPath = path.resolve(projectRoot, 'public/icon.svg');

const hasManifest = fs.existsSync(manifestPath);
const hasSw = fs.existsSync(swPath);
const has192 = fs.existsSync(icon192Path);
const has512 = fs.existsSync(icon512Path);
const hasSvg = fs.existsSync(iconSvgPath);

console.log(`\n3. Web App (PWA) Foundation:`);
console.log(`   - app/manifest.ts exists: ${hasManifest}`);
console.log(`   - public/sw.js exists: ${hasSw}`);
console.log(`   - public/icon-192.png exists: ${has192}`);
console.log(`   - public/icon-512.png exists: ${has512}`);
console.log(`   - public/icon.svg exists: ${hasSvg}`);

// 4. Check Android Configuration
const gradlePropsPath = path.resolve(projectRoot, 'android/gradle.properties');
const gradleProps = fs.existsSync(gradlePropsPath) ? fs.readFileSync(gradlePropsPath, 'utf8') : '';
const hasProductionUrl = gradleProps.includes('SERVER_URL=https://nexus-talks.onrender.com');

console.log(`\n4. Android Native Configuration:`);
console.log(`   - SERVER_URL configured for https://nexus-talks.onrender.com: ${hasProductionUrl}`);

const allPassed =
  hasHeroInstallCta &&
  hasSeeDemoBtn &&
  hasInstallSection &&
  hasAndroidCard &&
  hasPwaCard &&
  hasDialogFile &&
  hasCtaFile &&
  hasBeforeInstallPrompt &&
  hasSwRegister &&
  hasPlatformGuides &&
  hasManifest &&
  hasSw &&
  has192 &&
  has512 &&
  hasSvg &&
  hasProductionUrl;

if (allPassed) {
  console.log('\n====================================================');
  console.log(' [PASS] All Installation & CTA requirements verified!');
  console.log('====================================================');
  process.exit(0);
} else {
  console.error('\n[FAIL] Missing verification criteria');
  process.exit(1);
}
