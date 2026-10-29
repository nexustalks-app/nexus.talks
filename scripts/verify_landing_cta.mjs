import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
console.log('====================================================');
console.log(' NEXUS.TALKS — ANDROID APK & PWA PIPELINE AUDIT');
console.log('====================================================\n');

// 1. Landing Page checks
const pagePath = path.resolve(projectRoot, 'app/page.tsx');
const pageContent = fs.readFileSync(pagePath, 'utf8');

const hasHeroInstallCta = pageContent.includes('<HeroInstallCta');
const hasSeeDemoBtn = pageContent.includes('See a Demo') && pageContent.includes('href="/demo"');
const hasInstallSection = pageContent.includes('id="install"');
const hasDirectApkDownload = pageContent.includes('nexus-talks-v1.0.1.apk');

console.log(`1. Landing Page checks:`);
console.log(`   - Hero Install CTA mounted: ${hasHeroInstallCta}`);
console.log(`   - See a Demo links to /demo: ${hasSeeDemoBtn}`);
console.log(`   - Dedicated #install section exists: ${hasInstallSection}`);
console.log(`   - Direct APK download link in install section: ${hasDirectApkDownload}`);

// 2. Hero Component checks
const ctaPath = path.resolve(projectRoot, 'components/landing/hero-install-cta.tsx');
const ctaContent = fs.existsSync(ctaPath) ? fs.readFileSync(ctaPath, 'utf8') : '';
const expectedUrl = 'https://github.com/nexustalks-app/nexus.talks/releases/download/v1.0.1/nexus-talks-v1.0.1.apk';
const hasCorrectReleaseUrl = ctaContent.includes(expectedUrl);
const hasDownloadLabel = ctaContent.includes('Download Android App (.apk)');
const hasPwaLabel = ctaContent.includes('Install Web App');

console.log(`\n2. Hero CTA Component checks:`);
console.log(`   - Verified APK Download URL configured: ${hasCorrectReleaseUrl}`);
console.log(`   - "Download Android App (.apk)" action present: ${hasDownloadLabel}`);
console.log(`   - "Install Web App" action present: ${hasPwaLabel}`);

// 3. PWA Manifest & Service Worker checks
const manifestPath = path.resolve(projectRoot, 'app/manifest.ts');
const swPath = path.resolve(projectRoot, 'public/sw.js');
const icon192Path = path.resolve(projectRoot, 'public/icon-192.png');
const icon512Path = path.resolve(projectRoot, 'public/icon-512.png');

const hasManifest = fs.existsSync(manifestPath);
const hasSw = fs.existsSync(swPath);
const hasIcons = fs.existsSync(icon192Path) && fs.existsSync(icon512Path);

console.log(`\n3. Web App (PWA) Foundation:`);
console.log(`   - app/manifest.ts exists: ${hasManifest}`);
console.log(`   - public/sw.js exists: ${hasSw}`);
console.log(`   - PWA launcher icons (192 & 512) exist: ${hasIcons}`);

// 4. Android Configuration
const gradlePropsPath = path.resolve(projectRoot, 'android/gradle.properties');
const gradleProps = fs.existsSync(gradlePropsPath) ? fs.readFileSync(gradlePropsPath, 'utf8') : '';
const hasProductionUrl = gradleProps.includes('SERVER_URL=https://nexus-talks.onrender.com');

console.log(`\n4. Android Native Configuration:`);
console.log(`   - SERVER_URL points to https://nexus-talks.onrender.com: ${hasProductionUrl}`);

// 5. Verify published release asset via public HTTP request
console.log(`\n5. Probing Public GitHub Release Asset:`);
try {
  const res = await fetch(expectedUrl, { method: 'HEAD', redirect: 'manual' });
  const isRedirectToS3 = res.status === 302;
  const location = res.headers.get('location') || '';
  const isS3Location = location.includes('release-assets') || location.includes('github-production-release-asset');
  console.log(`   - HTTP Status: ${res.status} (Expected 302 Found)`);
  console.log(`   - Redirects to public asset storage: ${isS3Location}`);

  if (!isRedirectToS3 || !isS3Location) {
    throw new Error(`Release asset verification failed: HTTP ${res.status}`);
  }
} catch (e) {
  console.error(`   [ERROR] Could not verify release asset: ${e.message}`);
  process.exit(1);
}

const allPassed =
  hasHeroInstallCta &&
  hasSeeDemoBtn &&
  hasInstallSection &&
  hasDirectApkDownload &&
  hasCorrectReleaseUrl &&
  hasDownloadLabel &&
  hasPwaLabel &&
  hasManifest &&
  hasSw &&
  hasIcons &&
  hasProductionUrl;

if (allPassed) {
  console.log('\n====================================================');
  console.log(' [PASS] All Android APK & PWA requirements verified!');
  console.log('====================================================');
  process.exitCode = 0;
} else {
  console.error('\n[FAIL] Missing verification criteria');
  process.exitCode = 1;
}
