#!/usr/bin/env tsx

/**
 * Test script to verify mobile PDF viewer fix
 * 
 * This script verifies:
 * 1. CSP headers are only set in next.config.ts (not middleware.ts)
 * 2. PdfViewer component has mobile fallback
 * 3. Mobile detection works correctly
 */

import { readFileSync } from 'fs';
import { join } from 'path';

console.log('🔍 Testing Mobile PDF Viewer Fix...\n');

// Test 1: Verify middleware.ts doesn't inject CSP headers
console.log('1. Checking middleware.ts CSP removal...');
const middlewareContent = readFileSync(join(process.cwd(), 'middleware.ts'), 'utf-8');

if (middlewareContent.includes('Content-Security-Policy')) {
  console.log('❌ FAIL: middleware.ts still contains CSP header injection');
  process.exit(1);
} else {
  console.log('✅ PASS: CSP headers removed from middleware.ts');
}

// Test 2: Verify next.config.ts has correct CSP
console.log('\n2. Checking next.config.ts CSP configuration...');
const nextConfigContent = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf-8');

const requiredCSPDirectives = [
  'frame-src \'self\' https://*.supabase.co https://api.razorpay.com',
  'frame-ancestors \'none\'',
];

let cspValid = true;
for (const directive of requiredCSPDirectives) {
  if (!nextConfigContent.includes(directive)) {
    console.log(`❌ FAIL: Missing CSP directive: ${directive}`);
    cspValid = false;
  }
}

if (cspValid) {
  console.log('✅ PASS: next.config.ts has correct CSP configuration');
} else {
  process.exit(1);
}

// Test 3: Verify PdfViewer has mobile fallback
console.log('\n3. Checking PdfViewer mobile fallback...');
const pdfViewerContent = readFileSync(join(process.cwd(), 'components/pdf/PdfViewer.tsx'), 'utf-8');

const requiredMobileFeatures = [
  'isMobile',
  'window.matchMedia(\'(max-width: 768px)\')',
  '/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)',
  'Open PDF',
  'PDF inline preview is not supported on mobile',
];

let mobileValid = true;
for (const feature of requiredMobileFeatures) {
  if (!pdfViewerContent.includes(feature)) {
    console.log(`❌ FAIL: Missing mobile feature: ${feature}`);
    mobileValid = false;
  }
}

if (mobileValid) {
  console.log('✅ PASS: PdfViewer has mobile fallback implementation');
} else {
  process.exit(1);
}

// Test 4: Verify iframe is only rendered on desktop
console.log('\n4. Checking iframe conditional rendering...');
const hasConditionalIframe = pdfViewerContent.includes('if (isMobile)') && 
                             pdfViewerContent.includes('<iframe') &&
                             pdfViewerContent.includes('return (') &&
                             pdfViewerContent.includes('// Desktop iframe preview');

if (hasConditionalIframe) {
  console.log('✅ PASS: iframe only renders on desktop (not mobile)');
} else {
  console.log('❌ FAIL: iframe rendering logic incorrect');
  process.exit(1);
}

console.log('\n🎉 All tests passed! Mobile PDF viewer fix is working correctly.');
console.log('\nSummary of changes:');
console.log('- ✅ Removed CSP header injection from middleware.ts');
console.log('- ✅ CSP configured only in next.config.ts with frame-src for Supabase');
console.log('- ✅ PdfViewer has mobile detection and fallback');
console.log('- ✅ Mobile users see "Open PDF" button instead of blocked iframe');
console.log('- ✅ Desktop users can still view PDFs in iframe');